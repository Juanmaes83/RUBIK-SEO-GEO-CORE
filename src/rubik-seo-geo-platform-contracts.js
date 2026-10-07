/* Rubik SEO/GEO — CORE-9 Platform Layer: reviewable contracts and mocks only (D-25).
   Pure, dependency-free contracts that a future server-side platform must satisfy:
   tenant/project scoping, roles and permissions, append-only audit chain, secret
   references (never values), spend policy feeding CORE-7 budgets, consent records,
   connector catalogue, signed-provenance port (restores CORE-7 trust after
   serialization), repository ports with an in-memory MOCK, and job specifications.
   Nothing here connects, stores client data, holds secrets, schedules or deploys: the
   platform itself will be built only in an authorized destination project. The hash used
   for the audit chain and the mock signer are NOT cryptographic; production must use
   server-side SHA-256/HMAC or KMS signatures (see docs/core-9/PLATFORM-SPEC.md). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RubikSEOGeoPlatformContracts=api;})(globalThis,function(){
'use strict';
const text=x=>typeof x==='string'?x.trim():'';
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const isoOrNull=v=>{if(v==null||v==='')return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
function fnv(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
const ID=/^[a-z0-9][a-z0-9-]{1,62}$/;
const deny=(reason,extra={})=>freeze({allowed:false,reason,...extra});
const refuse=(code,extra={})=>freeze({ok:false,error:{code,...extra}});

/* ── Scoping: every record belongs to one tenant and one project ─────────── */
function scope(input){
  const tenantId=text(input?.tenantId),projectId=text(input?.projectId);
  if(!ID.test(tenantId)||!ID.test(projectId))return refuse('INVALID_SCOPE');
  return freeze({ok:true,scope:{tenantId,projectId,key:tenantId+'/'+projectId}});
}
const sameScope=(a,b)=>!!a&&!!b&&a.tenantId===b.tenantId&&a.projectId===b.projectId;

/* ── Roles and permissions ───────────────────────────────────────────────── */
const ROLES=Object.freeze(['owner','account-manager','analyst','client-approver','viewer','system','ai']);
const ACTIONS=Object.freeze(['read','draft','propose-action','review-action','approve-external-action','execute-approved-action','approve-fact','confirm-cost','manage-connectors','manage-secret-refs','manage-members','export-data','delete-data']);
const MATRIX=freeze({
  owner:['read','draft','propose-action','review-action','approve-external-action','approve-fact','confirm-cost','manage-connectors','manage-secret-refs','manage-members','export-data','delete-data'],
  'account-manager':['read','draft','propose-action','review-action','approve-external-action','confirm-cost'],
  analyst:['read','draft','propose-action'],
  'client-approver':['read','approve-fact','approve-external-action'],
  viewer:['read'],
  system:['read','execute-approved-action'],
  ai:['draft','propose-action']
});
/* Roles allowed to approve an external action, derived from MATRIX (not a hand-kept list). */
const APPROVER_ROLES=Object.freeze(ROLES.filter(r=>MATRIX[r].includes('approve-external-action')));
/* authorize({actor, action, scope, approval}): the actor must be a member of the scope with
   a role that allows the action. The system executes only with a standing human approval
   for that exact action: the approval needs an approver identity, a role that MATRIX allows
   to approve external actions, a valid date and the same scope. AI never approves,
   executes, confirms cost or touches secrets.
   Boundary: this pure module receives actor, roles and approvals that the server has
   ALREADY authenticated and loaded. It is not authentication and not a security boundary
   by itself; the platform must enforce identity, sessions and storage-level isolation. */
function authorize({actor,action,scope:target,approval}={}){
  if(!ACTIONS.includes(action))return deny('UNKNOWN_ACTION');
  if(!actor||!ROLES.includes(actor.role))return deny('UNKNOWN_ROLE');
  if(!target?.tenantId)return deny('SCOPE_REQUIRED');
  const member=arr(actor.memberships).some(m=>sameScope(m,target))||(actor.role==='system'&&arr(actor.memberships).some(m=>m.tenantId===target.tenantId&&m.projectId==='*'));
  if(!member)return deny('NOT_A_MEMBER_OF_SCOPE');
  if(!MATRIX[actor.role].includes(action))return deny('ROLE_NOT_ALLOWED',{role:actor.role});
  if(action==='execute-approved-action'){
    if(!approval||typeof approval!=='object')return deny('HUMAN_APPROVAL_REQUIRED');
    if(!text(approval.by))return deny('APPROVER_IDENTITY_REQUIRED');
    if(!APPROVER_ROLES.includes(approval.role))return deny('APPROVER_ROLE_NOT_ALLOWED',{role:ROLES.includes(approval.role)?approval.role:null});
    if(!isoOrNull(approval.at))return deny('APPROVAL_DATE_INVALID');
    if(!sameScope(approval.scope,target))return deny('APPROVAL_SCOPE_MISMATCH');
  }
  return freeze({allowed:true,reason:null});
}

/* ── Secret references: names only, never values ─────────────────────────── */
const SECRET_REF=/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;
const VALUE_KEYS=/^(value|secret|token|password|apikey|api_key|key|credential|credentials|privatekey|private_key|clientsecret|client_secret)$/i;
/* secretRef(input): a pointer (tenant/provider/name) resolved only by the server-side
   secret store. Any field that looks like a value is refused. */
function secretRef(input){
  const v=input&&typeof input==='object'?input:{};
  for(const k of Object.keys(v))if(VALUE_KEYS.test(k))return refuse('SECRET_VALUE_NOT_ALLOWED',{field:k});
  const ref=text(v.ref);if(!SECRET_REF.test(ref))return refuse('INVALID_SECRET_REF');
  const [tenantId,provider]=ref.split('/');
  return freeze({ok:true,secretRef:{ref,tenantId,provider,rotationDays:Number.isInteger(v.rotationDays)&&v.rotationDays>0?v.rotationDays:null,resolvedBy:'server-side-secret-store'}});
}

/* ── Audit: append-only, hash-chained events ─────────────────────────────── */
const AUDIT_DETAIL_KEY=/^[a-zA-Z][a-zA-Z0-9]{0,40}$/;
/* auditEvent(previous, input, {providers, hasher}): the details must be flat primitives;
   strings are redacted through CORE-7 (providers.redact) and secret-looking keys refused.
   `hasher` is injected; the default FNV is only for tests and documentation. */
function auditEvent(previous,input,{providers,hasher=fnv}={}){
  if(providers==null||typeof providers.redact!=='function')throw new TypeError('providers module must be injected');
  const v=input&&typeof input==='object'?input:{};
  const at=isoOrNull(v.at);if(!at)return refuse('MISSING_DATE');
  if(!ROLES.includes(v.actor?.role))return refuse('UNKNOWN_ROLE');
  const sc=scope(v.scope);if(!sc.ok)return sc;
  if(previous&&previous.at>at)return refuse('EVENT_BEFORE_PREVIOUS');
  if(previous&&!sameScope(previous.scope,sc.scope))return refuse('CHAIN_SCOPE_MISMATCH');
  const details={};
  for(const [k,x] of Object.entries(v.details||{})){
    if(!AUDIT_DETAIL_KEY.test(k)||VALUE_KEYS.test(k))return refuse('INVALID_DETAIL_KEY',{key:k});
    if(x!==null&&typeof x==='object')return refuse('DETAILS_MUST_BE_FLAT',{key:k});
    details[k]=typeof x==='string'?providers.redact(x):x;
  }
  const body={seq:previous?previous.seq+1:1,at,actor:{role:v.actor.role,id:text(v.actor.id)||null},action:text(v.action),scope:clone(sc.scope),target:text(v.target)||null,outcome:['allowed','denied','error'].includes(v.outcome)?v.outcome:'allowed',details,prevHash:previous?previous.hash:null};
  return freeze({ok:true,event:{...body,hash:hasher(stable(body))}});
}
/* verifyAuditChain(events, {hasher}): sequence, links and hashes. */
function verifyAuditChain(events,{hasher=fnv}={}){
  const list=arr(events);
  for(let i=0;i<list.length;i++){
    const {hash,...body}=list[i];
    if(body.seq!==i+1)return freeze({valid:false,brokenAt:i,reason:'SEQUENCE'});
    if(body.prevHash!==(i?list[i-1].hash:null))return freeze({valid:false,brokenAt:i,reason:'LINK'});
    if(hasher(stable(body))!==hash)return freeze({valid:false,brokenAt:i,reason:'HASH'});
  }
  return freeze({valid:true,length:list.length});
}

/* ── Spend policy → CORE-7 budget ────────────────────────────────────────── */
/* spendPolicy(input): per tenant, provider and period (YYYY-MM) limits in the caller's own
   units (tariffs are unknown to the Core). */
function spendPolicy(input){
  const v=input&&typeof input==='object'?input:{};
  if(!ID.test(text(v.tenantId))||!text(v.provider))return refuse('INVALID_POLICY_SCOPE');
  const n=k=>Number.isFinite(v[k])&&v[k]>=0?v[k]:null;
  if(n('monthlyUnits')==null||n('monthlyRequests')==null)return refuse('FINITE_LIMITS_REQUIRED');
  return freeze({ok:true,policy:{tenantId:text(v.tenantId),provider:text(v.provider),monthlyUnits:v.monthlyUnits,monthlyRequests:v.monthlyRequests,confirmAboveUnits:n('confirmAboveUnits')??0}});
}
/* Spend entries (PR #14 review): units are finite and >= 0 (decimals allowed, they are the
   caller's own units; 0 is a free or cached call); requests are integers >= 1 (each entry
   is at least one request). Anything else is refused by recordSpend, and a ledger that
   still contains an invalid entry fails closed (zero budget), so no entry can ever
   increase the remaining allowance. */
const validSpend=e=>!!e&&ID.test(text(e.tenantId))&&!!text(e.provider)&&/^\d{4}-\d{2}$/.test(text(e.period))&&typeof e.units==='number'&&Number.isFinite(e.units)&&e.units>=0&&Number.isInteger(e.requests)&&e.requests>=1&&!!isoOrNull(e.at);
const usedIn=(ledger,policy,period)=>arr(ledger).filter(e=>e&&e.tenantId===policy.tenantId&&e.provider===policy.provider&&e.period===period).reduce((a,e)=>({units:a.units+e.units,requests:a.requests+e.requests}),{units:0,requests:0});
/* toProviderBudget(ledger, policy, period): the remaining allowance as a finite CORE-7
   budget ({maxUnits, maxRequests}); the platform persists the ledger. */
function toProviderBudget(ledger,policy,period){
  if(!/^\d{4}-\d{2}$/.test(text(period)))throw new Error('period must be YYYY-MM');
  const invalid=arr(ledger).filter(e=>!validSpend(e)).length;
  if(invalid)return freeze({maxUnits:0,maxRequests:0,usedUnits:0,requests:0,invalidLedgerEntries:invalid});
  const u=usedIn(ledger,policy,period);
  return freeze({maxUnits:Math.max(0,policy.monthlyUnits-u.units),maxRequests:Math.max(0,policy.monthlyRequests-u.requests),usedUnits:0,requests:0});
}
/* spendCheck(ledger, policy, {period, units}): allowed, needs a human cost confirmation
   (confirm-cost permission) or exceeds the policy. */
function spendCheck(ledger,policy,{period,units}={}){
  const b=toProviderBudget(ledger,policy,period),want=Number(units);
  if(b.invalidLedgerEntries)return deny('INVALID_LEDGER',{invalidLedgerEntries:b.invalidLedgerEntries});
  if(typeof units!=='number'||!Number.isFinite(want)||want<0)return deny('INVALID_UNITS');
  if(want>b.maxUnits||b.maxRequests<1)return deny('SPEND_POLICY_EXCEEDED',{remaining:b});
  return freeze({allowed:true,needsConfirmation:want>policy.confirmAboveUnits,remaining:b});
}
/* recordSpend(ledger, entry): appends a real consumption. An entry above the policy is
   still recorded (it happened); the remaining budget then stays at 0. */
function recordSpend(ledger,entry){
  const e={tenantId:text(entry?.tenantId),provider:text(entry?.provider),period:text(entry?.period),units:entry?.units,requests:entry?.requests??1,at:isoOrNull(entry?.at)};
  if(!validSpend(e))throw new Error('invalid spend entry');
  return freeze([...arr(ledger).map(clone),e]);
}

/* ── Consent ─────────────────────────────────────────────────────────────── */
const CONSENT_PURPOSES=Object.freeze(['ai-processing','data-import','provider-connection','outreach-on-behalf','review-requests','content-publication']);
const presentDate=x=>x!=null&&!(typeof x==='string'&&!x.trim());
/* consentRecord(input): expiresAt/revokedAt are optional, but when present they must be
   valid dates (PR #14 review): a malformed value is refused instead of becoming null, which
   would make the consent look indefinite. An expiry at or before the grant is refused. */
function consentRecord(input){
  const v=input&&typeof input==='object'?input:{};
  if(!CONSENT_PURPOSES.includes(v.purpose))return refuse('UNKNOWN_PURPOSE');
  const sc=scope(v.scope);if(!sc.ok)return sc;
  for(const k of ['grantedAt','expiresAt','revokedAt'])if(presentDate(v[k])&&!isoOrNull(v[k]))return refuse('INVALID_DATE',{field:k});
  const grantedAt=isoOrNull(v.grantedAt);if(!text(v.grantedBy)||!grantedAt)return refuse('GRANT_REQUIRED');
  const expiresAt=isoOrNull(v.expiresAt),revokedAt=isoOrNull(v.revokedAt);
  if(expiresAt&&expiresAt<=grantedAt)return refuse('EXPIRES_BEFORE_GRANT');
  return freeze({ok:true,consent:{purpose:v.purpose,scope:clone(sc.scope),grantedBy:text(v.grantedBy),grantedAt,expiresAt,revokedAt}});
}
function hasConsent(records,{purpose,scope:target,at}={}){
  const now=isoOrNull(at);if(!now)throw new Error('hasConsent requires an explicit date (at)');
  // Only well-formed records count: a record with an unparseable date never authorizes.
  const ok=c=>c&&isoOrNull(c.grantedAt)===c.grantedAt&&(c.expiresAt==null||isoOrNull(c.expiresAt)===c.expiresAt)&&(c.revokedAt==null||isoOrNull(c.revokedAt)===c.revokedAt);
  return arr(records).some(c=>ok(c)&&c.purpose===purpose&&sameScope(c.scope,target)&&c.grantedAt<=now&&(!c.expiresAt||c.expiresAt>now)&&(!c.revokedAt||c.revokedAt>now));
}

/* ── Connector catalogue (design; none implemented here) ─────────────────── */
const CONNECTORS=freeze([
  {id:'search-console',providerOps:['search-console.searchAnalytics','search-console.urlInspection'],auth:'oauth-server-side',dataClass:'client-analytics',consent:'provider-connection',status:'NOT_IMPLEMENTED'},
  {id:'bing-webmaster',providerOps:['bing-webmaster.urlInfo'],auth:'api-key-server-side',dataClass:'client-analytics',consent:'provider-connection',status:'NOT_IMPLEMENTED',openQuestions:['Confirmar en documentación accesible qué expone AI Performance antes de modelarlo.']},
  {id:'indexnow',providerOps:['indexnow.submit'],auth:'key-file-server-side',dataClass:'public-urls',consent:'content-publication',status:'NOT_IMPLEMENTED'},
  {id:'dataforseo',providerOps:['dataforseo.keywords','dataforseo.serp','dataforseo.backlinks'],auth:'basic-server-side',dataClass:'third-party-estimates',consent:'data-import',status:'NOT_IMPLEMENTED',paid:true},
  {id:'openseo-mcp',providerOps:['openseo.whoami','openseo.siteAudit','openseo.auditStatus','openseo.auditIssues','openseo.auditPages'],auth:'mcp-server-side',dataClass:'crawl-results',consent:'provider-connection',status:'NOT_IMPLEMENTED',openQuestions:['Forma real de whoami','Valores reales de get_audit_status.status','Forma de get_audit_pages']},
  {id:'ga4-referrals',providerOps:[],auth:'oauth-server-side',dataClass:'client-analytics',consent:'provider-connection',status:'NOT_DESIGNED',openQuestions:['Añadir operación al catálogo de CORE-7 con decisión propia']},
  {id:'ai-model',providerOps:['ai-assist.offpageAnalysis'],auth:'api-key-server-side',dataClass:'minimised-evidence',consent:'ai-processing',status:'NOT_IMPLEMENTED',paid:true,openQuestions:['Proveedor y modelo','Retención de datos del proveedor','Coste por unidad']}
]);

/* ── Signed provenance: portable CORE-7 trust across serialization ───────── */
/* signProvenance(result, {providers, signer, keyId}): only a result the injected CORE-7
   module issued can be signed. The payload covers every envelope field that changes the
   meaning of the data (PR #14 review): provider, operation, release, target, status,
   connection, cached, partial coverage, error codes, cost, provenance and a digest of the
   data rows.
   verifyProvenance(signed, {signer, data, envelope}): data is REQUIRED (without the
   retrieved rows nothing is verified); the rows must match the signed digest; an optional
   rehydrated envelope must match the signed fields. On success it returns the envelope
   rebuilt from the signed payload plus the verified rows, so status or coverage cannot be
   swapped after storage.
   Mocks: `fnv()` (default digest) and the injected test signer are NOT cryptographic.
   Production injects a SHA-256 digest and a server-side KMS/HMAC signer keyed
   identified by keyId (rotation); the signer receives {keyId} so a keyring can pick the key.
   Integration (D-28): offpage.measurement() accepts a rebuilt result only when this module is
   injected as `platform` and isVerifiedProvenance() recognises the exact object returned by
   verifyProvenance(); a plain or serialized copy stays UNTRUSTED_ENVELOPE. */
const SIGNED_FIELDS=Object.freeze(['provider','operation','release','target','status','connection','cached']);
/* Digest and canonical form (D-28). The default {alg:'fnv1a32-mock'} is the historical
   non-cryptographic mock and is kept only for tests and documentation. Production injects
   {alg:'sha256', hash} computed on the server. The algorithm is part of the signed payload
   (dataHashAlg) and verification refuses a payload whose algorithm differs from the one the
   verifier expects (DIGEST_ALG_MISMATCH), so a stored mock digest can never be accepted by a
   production verifier (no downgrade). canonicalJson() is the canonical form that is hashed
   and signed: object keys sorted by UTF-16 code units and ECMAScript JSON serialization of
   strings and numbers, which matches RFC 8785 (JCS) for JSON data with finite numbers; it
   refuses non-finite numbers and values JSON cannot represent instead of silently
   coercing them. */
const MOCK_DIGEST=Object.freeze({alg:'fnv1a32-mock',hash:fnv});
const DIGEST_ALG=/^[a-z0-9][a-z0-9-]{1,31}$/;
function canonicalJson(v){
  if(v===null)return 'null';
  if(typeof v==='number'){if(!Number.isFinite(v))throw new TypeError('canonicalJson: non-finite number');return JSON.stringify(v);}
  if(typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(x=>x===undefined?'null':canonicalJson(x)).join(',')+']';
  if(typeof v==='object'){if(typeof v.toJSON==='function')return canonicalJson(v.toJSON());return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(v[k])).join(',')+'}';}
  throw new TypeError('canonicalJson: unsupported type '+typeof v);
}
const digestOf=d=>{
  if(d==null)return MOCK_DIGEST;
  if(typeof d?.hash!=='function'||!DIGEST_ALG.test(text(d?.alg)))throw new TypeError('digest must be {alg, hash(text)}');
  return d;
};
const signedPayload=(r,d)=>({...Object.fromEntries(SIGNED_FIELDS.map(k=>[k,r?.[k]??null])),
  partial:clone(r?.partial??null),errorCodes:arr(r?.errors).map(e=>text(e?.code)).filter(Boolean),
  cost:clone(r?.cost??null),provenance:clone(r?.provenance??null),dataHashAlg:d.alg,dataHash:d.hash(canonicalJson(clone(r?.data??null)))});
function signProvenance(result,{providers,signer,keyId,digest}={}){
  if(typeof providers?.isTrustedResult!=='function')throw new TypeError('providers module must be injected');
  if(typeof signer?.sign!=='function')throw new TypeError('signer must be injected');
  const d=digestOf(digest);
  if(!providers.isTrustedResult(result))return refuse('NOT_AN_ISSUED_RESULT');
  const payload=signedPayload(result,d);
  return freeze({ok:true,signed:{payload,keyId:text(keyId)||null,signature:signer.sign(canonicalJson(payload),{keyId:text(keyId)||null})}});
}
/* Results rebuilt by a successful verifyProvenance() are registered here, like CORE-7 does
   with issued results: offpage.measurement() accepts them only when this module is injected
   and says it rebuilt that exact object (isVerifiedProvenance). A copy, a look-alike or a
   hand-built object is never accepted. */
const VERIFIED=new WeakSet();
const isVerifiedProvenance=r=>!!r&&typeof r==='object'&&VERIFIED.has(r);
function verifyProvenance(signed,{signer,data,envelope,digest}={}){
  if(typeof signer?.verify!=='function')throw new TypeError('signer must be injected');
  const d=digestOf(digest);
  const no=reason=>freeze({trust:'UNTRUSTED',verified:false,reason});
  if(!signed?.payload||!signed.signature)return no('NOT_SIGNED');
  let canonical;try{canonical=canonicalJson(signed.payload);}catch{return no('NOT_SIGNED');}
  if(signer.verify(canonical,signed.signature,{keyId:signed.keyId??null})!==true)return no('BAD_SIGNATURE');
  if(signed.payload.dataHashAlg!==d.alg)return no('DIGEST_ALG_MISMATCH');
  if(data===undefined)return no('DATA_REQUIRED');
  let dataHash;try{dataHash=d.hash(canonicalJson(clone(data)));}catch{return no('DATA_CHANGED');}
  if(dataHash!==signed.payload.dataHash)return no('DATA_CHANGED');
  if(envelope!==undefined){let e;try{e=canonicalJson(signedPayload({...envelope,data},d));}catch{return no('ENVELOPE_CHANGED');}if(e!==canonical)return no('ENVELOPE_CHANGED');}
  const p=signed.payload;
  const result=freeze({...Object.fromEntries(SIGNED_FIELDS.map(k=>[k,p[k]])),partial:clone(p.partial),cost:clone(p.cost),provenance:clone(p.provenance),data:clone(data),errors:arr(p.errorCodes).map(code=>({code}))});
  VERIFIED.add(result);
  return freeze({trust:'SIGNED_PROVENANCE',reason:null,verified:p.connection==='VERIFIED'&&p.provenance?.method==='api',keyId:signed.keyId??null,dataHashAlg:p.dataHashAlg,result});
}

/* ── Repository ports and an in-memory MOCK (tests only) ─────────────────── */
const REPOSITORY_PORTS=freeze({
  factBook:{methods:['get','put'],appendOnly:false,holds:'información aprobada del cliente (CORE-8.1)'},
  periodLedger:{methods:['get','append'],appendOnly:true,holds:'historial de periodos (CORE-8.1)'},
  snapshots:{methods:['get','put','list'],appendOnly:false,holds:'snapshots off-page (CORE-8)'},
  actions:{methods:['get','put','list'],appendOnly:false,holds:'acciones con historial inmutable (CORE-8)'},
  drafts:{methods:['get','put','list'],appendOnly:false,holds:'borradores no publicables (CORE-8.1)'},
  audit:{methods:['append','list'],appendOnly:true,holds:'cadena de auditoría'},
  spend:{methods:['append','list'],appendOnly:true,holds:'consumo por proveedor y periodo'},
  consent:{methods:['put','list'],appendOnly:false,holds:'consentimientos'}
});
/* createMemoryRepository(): MOCK for contract tests. Every call is scoped; one tenant can
   never read another's records; append-only ports refuse overwrites. Data lives only in
   the process memory of the test. */
function createMemoryRepository(){
  const store=new Map();
  const k=(port,sc,id)=>[port,sc.key,id].join('|');
  const check=(port,sc)=>{if(!REPOSITORY_PORTS[port])throw new Error('UNKNOWN_PORT');const s=scope(sc);if(!s.ok)throw new Error('INVALID_SCOPE');return s.scope;};
  return Object.freeze({
    kind:'mock',
    put(port,sc,id,value){const s=check(port,sc);if(REPOSITORY_PORTS[port].appendOnly)throw new Error('APPEND_ONLY_PORT');store.set(k(port,s,id),clone(value));},
    append(port,sc,value){const s=check(port,sc);if(!REPOSITORY_PORTS[port].appendOnly)throw new Error('NOT_APPEND_ONLY');const list=store.get(k(port,s,'_log'))||[];store.set(k(port,s,'_log'),[...list,clone(value)]);return list.length+1;},
    get(port,sc,id){const s=check(port,sc);const v=store.get(k(port,s,id));return v===undefined?null:clone(v);},
    list(port,sc){const s=check(port,sc);if(REPOSITORY_PORTS[port].appendOnly)return clone(store.get(k(port,s,'_log'))||[]);return [...store.entries()].filter(([key])=>key.startsWith(port+'|'+s.key+'|')).map(([,v])=>clone(v));}
  });
}

/* ── Job specifications (nothing is scheduled here) ──────────────────────── */
const JOB_TYPES=Object.freeze(['geo-measurement','provider-sync','link-verification','period-close-reminder','report-draft']);
/* jobSpec(input): what the platform scheduler would run. Jobs may only observe, measure or
   draft; anything that sends, publishes or pays is not schedulable (it needs a human
   approval per action). Paid jobs need a spend policy reference. */
function jobSpec(input){
  const v=input&&typeof input==='object'?input:{};
  if(['send','publish','outreach','review-request','paid-placement'].includes(v.type))return refuse('EXTERNAL_EFFECT_NOT_SCHEDULABLE');
  if(!JOB_TYPES.includes(v.type))return refuse('UNKNOWN_JOB_TYPE');
  if(!['manual','weekly','monthly'].includes(v.cadence))return refuse('UNKNOWN_CADENCE');
  const sc=scope(v.scope);if(!sc.ok)return sc;
  const paid=v.paid===true;
  if(paid&&!text(v.spendPolicyRef))return refuse('SPEND_POLICY_REQUIRED');
  if(v.type==='geo-measurement'&&v.method==='scrape')return refuse('METHOD_NOT_ALLOWED');
  return freeze({ok:true,job:{type:v.type,cadence:v.cadence,scope:clone(sc.scope),paid,spendPolicyRef:text(v.spendPolicyRef)||null,consent:v.type==='geo-measurement'||v.type==='report-draft'?'ai-processing':'provider-connection',runs:false}});
}

return Object.freeze({ROLES,ACTIONS,MATRIX,APPROVER_ROLES,CONSENT_PURPOSES,CONNECTORS,REPOSITORY_PORTS,JOB_TYPES,
  scope,authorize,secretRef,auditEvent,verifyAuditChain,spendPolicy,toProviderBudget,spendCheck,recordSpend,
  consentRecord,hasConsent,canonicalJson,signProvenance,verifyProvenance,isVerifiedProvenance,createMemoryRepository,jobSpec});
});

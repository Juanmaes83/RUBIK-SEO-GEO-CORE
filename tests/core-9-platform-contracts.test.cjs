'use strict';
/* CORE-9 (D-25): platform contracts and mocks only. Deterministic; no network, secrets,
   storage outside test memory, scheduling or deploy. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const platform=require('../src/rubik-seo-geo-platform-contracts.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');

const clock=()=>new Date('2026-09-26T10:00:00Z');
const A={tenantId:'agency-a',projectId:'casa-norte'},B={tenantId:'agency-b',projectId:'other'};
const member=(role,...scopes)=>({role,id:role+'-1',memberships:scopes.length?scopes:[A]});
/* MOCK signer for tests only: not a secret, not cryptographic. */
const mockSigner={sign:p=>'mock-'+p.length+'-'+[...p].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7),verify(p,s){return this.sign(p)===s;}};

test('scopes are explicit and one tenant never reaches another',()=>{
  assert.equal(platform.scope({tenantId:'Agency A',projectId:'x'}).error.code,'INVALID_SCOPE');
  const repo=platform.createMemoryRepository();
  repo.put('snapshots',A,'s1',{v:1});
  assert.deepEqual(repo.get('snapshots',A,'s1'),{v:1});
  assert.equal(repo.get('snapshots',B,'s1'),null);
  assert.deepEqual(repo.list('snapshots',B),[]);
  assert.equal(repo.append('audit',A,{e:1}),1);
  assert.throws(()=>repo.put('audit',A,'x',{}),/APPEND_ONLY_PORT/);
  assert.throws(()=>repo.put('nope',A,'x',{}),/UNKNOWN_PORT/);
  assert.equal(repo.kind,'mock');
});

test('permissions: AI only drafts/proposes; system executes only with a human approval in the same scope',()=>{
  const ok=(actor,action,extra={})=>platform.authorize({actor,action,scope:A,...extra});
  assert.equal(ok(member('ai'),'draft').allowed,true);
  for(const a of ['approve-external-action','execute-approved-action','confirm-cost','manage-secret-refs'])assert.equal(ok(member('ai'),a).reason,'ROLE_NOT_ALLOWED',a);
  assert.equal(ok(member('analyst'),'approve-external-action').reason,'ROLE_NOT_ALLOWED');
  assert.equal(ok(member('account-manager'),'approve-external-action').allowed,true);
  assert.equal(ok(member('account-manager',B),'read').reason,'NOT_A_MEMBER_OF_SCOPE');
  const sys=member('system');
  assert.equal(ok(sys,'execute-approved-action').reason,'HUMAN_APPROVAL_REQUIRED');
  assert.equal(ok(sys,'execute-approved-action',{approval:{by:'ai-1',role:'ai',at:'2026-09-26',scope:A}}).reason,'HUMAN_APPROVAL_REQUIRED');
  assert.equal(ok(sys,'execute-approved-action',{approval:{by:'am-1',role:'account-manager',at:'2026-09-26',scope:B}}).reason,'APPROVAL_SCOPE_MISMATCH');
  assert.equal(ok(sys,'execute-approved-action',{approval:{by:'am-1',role:'account-manager',at:'2026-09-26',scope:A}}).allowed,true);
  assert.equal(ok(sys,'approve-external-action').reason,'ROLE_NOT_ALLOWED');
  assert.equal(ok({role:'root',memberships:[A]},'read').reason,'UNKNOWN_ROLE');
});

test('secret references carry names only; any value-like field is refused',()=>{
  assert.equal(platform.secretRef({ref:'agency-a/dataforseo/api'}).secretRef.resolvedBy,'server-side-secret-store');
  for(const k of ['value','token','apiKey','client_secret','password'])assert.equal(platform.secretRef({ref:'agency-a/x/y',[k]:'abc'}).error.code,'SECRET_VALUE_NOT_ALLOWED',k);
  assert.equal(platform.secretRef({ref:'sk_live_123'}).error.code,'INVALID_SECRET_REF');
});

test('audit events are redacted, flat and hash-chained; tampering is detected',()=>{
  const e1=platform.auditEvent(null,{at:'2026-09-26T10:00:00Z',actor:{role:'account-manager',id:'am-1'},action:'approve-external-action',scope:A,target:'act-1',details:{note:'ok token=abc123secret',units:1}},{providers}).event;
  assert.doesNotMatch(JSON.stringify(e1),/abc123secret/);
  const e2=platform.auditEvent(e1,{at:'2026-09-26T11:00:00Z',actor:{role:'system'},action:'execute-approved-action',scope:A,target:'act-1'},{providers}).event;
  assert.deepEqual(platform.verifyAuditChain([e1,e2]),{valid:true,length:2});
  assert.equal(platform.verifyAuditChain([e1,{...e2,target:'act-2'}]).reason,'HASH');
  assert.equal(platform.verifyAuditChain([e2]).reason,'SEQUENCE');
  assert.equal(platform.auditEvent(e2,{at:'2026-09-26T09:00:00Z',actor:{role:'system'},action:'x',scope:A},{providers}).error.code,'EVENT_BEFORE_PREVIOUS');
  assert.equal(platform.auditEvent(e2,{at:'2026-09-27',actor:{role:'system'},action:'x',scope:B},{providers}).error.code,'CHAIN_SCOPE_MISMATCH');
  assert.equal(platform.auditEvent(null,{at:'2026-09-26',actor:{role:'system'},action:'x',scope:A,details:{password:'x'}},{providers}).error.code,'INVALID_DETAIL_KEY');
  assert.equal(platform.auditEvent(null,{at:'2026-09-26',actor:{role:'system'},action:'x',scope:A,details:{nested:{a:1}}},{providers}).error.code,'DETAILS_MUST_BE_FLAT');
});

test('spend policy becomes a finite CORE-7 budget and blocks overspend',async()=>{
  const policy=platform.spendPolicy({tenantId:'agency-a',provider:'dataforseo',monthlyUnits:2,monthlyRequests:2,confirmAboveUnits:0}).policy;
  assert.equal(platform.spendPolicy({tenantId:'agency-a',provider:'x',monthlyUnits:Infinity,monthlyRequests:1}).error.code,'FINITE_LIMITS_REQUIRED');
  let ledger=[];
  const check=platform.spendCheck(ledger,policy,{period:'2026-09',units:1});
  assert.deepEqual([check.allowed,check.needsConfirmation],[true,true]);
  const transport={kind:'mock',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})};
  const run=()=>providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport,clock,budget:platform.toProviderBudget(ledger,policy,'2026-09'),confirmCost:true});
  const r1=await run();assert.equal(r1.status,'OK');
  ledger=platform.recordSpend(ledger,{tenantId:'agency-a',provider:'dataforseo',period:'2026-09',units:r1.cost.units,at:'2026-09-26T10:00:00Z'});
  ledger=platform.recordSpend(ledger,{tenantId:'agency-a',provider:'dataforseo',period:'2026-09',units:1,at:'2026-09-26T10:05:00Z'});
  assert.equal((await run()).status,'BUDGET_EXCEEDED');
  assert.equal(platform.spendCheck(ledger,policy,{period:'2026-09',units:1}).reason,'SPEND_POLICY_EXCEEDED');
  assert.equal(platform.spendCheck(ledger,policy,{period:'2026-10',units:1}).allowed,true,'a new period starts a new allowance');
});

test('consent is purpose- and scope-bound, time-limited and revocable',()=>{
  const c=platform.consentRecord({purpose:'ai-processing',scope:A,grantedBy:'cliente',grantedAt:'2026-09-01',expiresAt:'2026-12-31'}).consent;
  const r=platform.consentRecord({purpose:'outreach-on-behalf',scope:A,grantedBy:'cliente',grantedAt:'2026-09-01',revokedAt:'2026-09-20'}).consent;
  assert.equal(platform.hasConsent([c,r],{purpose:'ai-processing',scope:A,at:'2026-09-26'}),true);
  assert.equal(platform.hasConsent([c,r],{purpose:'ai-processing',scope:B,at:'2026-09-26'}),false);
  assert.equal(platform.hasConsent([c,r],{purpose:'ai-processing',scope:A,at:'2027-01-02'}),false);
  assert.equal(platform.hasConsent([c,r],{purpose:'outreach-on-behalf',scope:A,at:'2026-09-26'}),false);
  assert.equal(platform.consentRecord({purpose:'sell-data',scope:A,grantedBy:'x',grantedAt:'2026-09-01'}).error.code,'UNKNOWN_PURPOSE');
});

test('signed provenance restores CORE-7 trust after serialization; forged or altered payloads stay untrusted',async()=>{
  const live=await providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport:{kind:'live',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true});
  const s=platform.signProvenance(live,{providers,signer:mockSigner,keyId:'mock-key'}).signed;
  const stored=JSON.parse(JSON.stringify({signed:s,data:live.data}));
  assert.equal(offpage.measurement(JSON.parse(JSON.stringify(live)),{providers}).verified,false,'without the signature, serialization loses trust (CORE-8)');
  assert.deepEqual(platform.verifyProvenance(stored.signed,{signer:mockSigner,data:stored.data}),{trust:'SIGNED_PROVENANCE',verified:true});
  assert.equal(platform.verifyProvenance(stored.signed,{signer:mockSigner,data:[]}).reason,'DATA_CHANGED');
  assert.equal(platform.verifyProvenance({...stored.signed,payload:{...stored.signed.payload,connection:'VERIFIED',provider:'x'}},{signer:mockSigner}).reason,'BAD_SIGNATURE');
  assert.equal(platform.signProvenance(JSON.parse(JSON.stringify(live)),{providers,signer:mockSigner}).error.code,'NOT_AN_ISSUED_RESULT');
  assert.throws(()=>platform.signProvenance(live,{providers}),/signer must be injected/);
});

test('jobs may only observe, measure or draft; external effects are never schedulable',()=>{
  const j=platform.jobSpec({type:'geo-measurement',cadence:'monthly',scope:A});
  assert.deepEqual([j.job.runs,j.job.consent],[false,'ai-processing']);
  for(const type of ['send','publish','outreach','review-request','paid-placement'])assert.equal(platform.jobSpec({type,cadence:'monthly',scope:A}).error.code,'EXTERNAL_EFFECT_NOT_SCHEDULABLE',type);
  assert.equal(platform.jobSpec({type:'provider-sync',cadence:'weekly',scope:A,paid:true}).error.code,'SPEND_POLICY_REQUIRED');
  assert.equal(platform.jobSpec({type:'geo-measurement',cadence:'monthly',scope:A,method:'scrape'}).error.code,'METHOD_NOT_ALLOWED');
});

test('connector catalogue maps onto CORE-7 operations and declares open questions; nothing is implemented',()=>{
  const cat=providers.catalog();
  for(const c of platform.CONNECTORS){
    assert.ok(['NOT_IMPLEMENTED','NOT_DESIGNED'].includes(c.status),c.id);
    assert.ok(platform.CONSENT_PURPOSES.includes(c.consent),c.id);
    for(const op of c.providerOps){const [p,o]=op.split('.');assert.ok(cat[p]?.operations?.[o],op);}
  }
  const src=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-platform-contracts.js'),'utf8');
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|require\(|process\.env|Date\.now|new Date\(\)|https?:\/\//);
  assert.ok(Object.isFrozen(platform));
});

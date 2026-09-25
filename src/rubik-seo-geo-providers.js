/* Rubik SEO/GEO — CORE-7 provider integration contracts (D-21).
   Neutral, dependency-free layer between a host/platform transport and the existing
   Release C (intelligence) and Release E (authority) contracts. It never calls a network,
   holds no secrets and persists nothing: transport, clock, cache and budget are injected.
   Real connectors are activated in CORE-9; the OpenSEO/MCP bridge belongs to CORE-7.1. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RubikSEOGeoProviders=api;})(globalThis,function(){
'use strict';
const text=x=>typeof x==='string'?x.trim():'';
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};

/* Result states. Honest by construction: absence of data is never OK or zero. */
const RESULT_STATUSES=Object.freeze(['OK','PARTIAL','EMPTY','NOT_CONFIGURED','NOT_CONNECTED','NOT_MEASURED','COST_CONFIRMATION_REQUIRED','BUDGET_REQUIRED','BUDGET_EXCEEDED','RATE_LIMITED','ERROR','STALE']);
const COST_MODELS=Object.freeze(['free','quota','paid']);

/* Declarative catalogue. `units` is the budget cost of one request, expressed in the
   caller's own units (the Core does not know tariffs: estimatedUsd is always null). */
const CATALOG=freeze({
  'search-console':{label:'Google Search Console',sourceType:'SEARCH_CONSOLE',auth:'oauth-server-side',operations:{
    searchAnalytics:{release:'C',costModel:'quota',units:1,target:'intelligence.searchConsole'},
    urlInspection:{release:'E',costModel:'quota',units:1,target:'authority.indexation'}}},
  'bing-webmaster':{label:'Bing Webmaster Tools',sourceType:'BING_WEBMASTER',auth:'api-key-server-side',operations:{
    urlInfo:{release:'E',costModel:'quota',units:1,target:'authority.indexation'}}},
  'indexnow':{label:'IndexNow',sourceType:'INDEXNOW',auth:'key-file-server-side',operations:{
    submit:{release:'E',costModel:'free',units:1,target:'authority.submission'}}},
  'dataforseo':{label:'DataForSEO',sourceType:'MANUAL',auth:'basic-server-side',operations:{
    keywords:{release:'C',costModel:'paid',units:1,target:'intelligence.keywords'},
    serp:{release:'C',costModel:'paid',units:1,target:'intelligence.serps'},
    backlinks:{release:'C',costModel:'paid',units:1,target:'intelligence.backlinks'}}},
  'manual-import':{label:'Importación manual',sourceType:'MANUAL',auth:'none',operations:{
    presence:{release:'E',costModel:'free',units:0,target:'authority.presence'},
    citation:{release:'E',costModel:'free',units:0,target:'authority.citation'}}},
  'openseo':{label:'OpenSEO',sourceType:'CRAWLER',auth:'mcp-server-side',deferred:'CORE-7.1',operations:{
    siteAudit:{release:'C',costModel:'free',units:1,target:'intelligence.crawl'}}}
});

function describe(provider,operation){
  const p=CATALOG[provider],op=p?.operations?.[operation];
  if(!op)return null;
  return {provider,operation,label:p.label,sourceType:p.sourceType,auth:p.auth,deferred:p.deferred||null,...op};
}
function catalog(){return clone(CATALOG);}

/* Secrets never travel through the Core: they live in the host/platform transport.
   Keys are compared after removing separators and case (x-api-key -> xapikey). */
const SECRET_KEY_NAMES=['key','apikey','token','secret','password','passwd','passphrase','authorization','auth','cookie','setcookie','credential','credentials','privatekey','signature','sig'];
const SECRET_KEY_SUFFIX=/(apikey|token|secret|password|passwd|credential|credentials|privatekey|authorization)$/;
const normalizeKey=k=>String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
const isSecretKey=k=>{const n=normalizeKey(k);return SECRET_KEY_NAMES.includes(n)||SECRET_KEY_SUFFIX.test(n);};
/* Credentials embedded in string values: URL user-info, sensitive query/fragment params,
   Bearer/Basic/Token schemes and key=value / "key":"value" pairs. */
const SECRET_PARAM='(?:key|api[-_]?key|x[-_]?api[-_]?key|token|access[-_]?token|refresh[-_]?token|id[-_]?token|client[-_]?secret|secret|password|passwd|pwd|sig|signature|auth|authorization|code)';
const RE_USERINFO=/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/?#@]+@/gi;
const RE_PARAM=new RegExp('([?&#;]'+SECRET_PARAM+'=)[^&#\\s"\']+','gi');
const RE_SCHEME=/\b(bearer|basic|token)(\s+)[A-Za-z0-9._~+/=-]{4,}/gi;
const RE_PAIR=/\b(client[-_]?secret|refresh[-_]?token|access[-_]?token|id[-_]?token|x-api-key|api[-_]?key|password|passwd|secret|authorization|cookie)(["']?\s*[:=]\s*["']?)(?!\[redacted\])[^\s"',&;}]+/gi;
function redactText(value){
  return String(value??'').replace(RE_USERINFO,'$1[redacted]@').replace(RE_PARAM,'$1[redacted]').replace(RE_SCHEME,'$1$2[redacted]').replace(RE_PAIR,'$1$2[redacted]');
}
const redact=message=>redactText(message).slice(0,200);
const hasSecretValue=v=>typeof v==='string'&&redactText(v)!==v;
/* Full traversal (no depth limit; cycle-safe). Returns the offending key name or a
   placeholder for a secret-looking value; never the value itself. */
function findSecret(value){
  const seen=new Set(),stack=[value];
  while(stack.length){
    const v=stack.pop();
    if(hasSecretValue(v))return '(value)';
    if(!v||typeof v!=='object'||seen.has(v))continue;
    seen.add(v);
    for(const [k,child] of Object.entries(v)){if(isSecretKey(k))return k;stack.push(child);}
  }
  return '';
}
/* Keys only (for provider rows: a row carrying a secret field is rejected; secret-looking
   values inside accepted rows are redacted instead). */
function findSecretKey(value){
  const seen=new Set(),stack=[value];
  while(stack.length){
    const v=stack.pop();
    if(!v||typeof v!=='object'||seen.has(v))continue;
    seen.add(v);
    for(const [k,child] of Object.entries(v)){if(isSecretKey(k))return k;stack.push(child);}
  }
  return '';
}
/* Deep copy with every string passed through redactText (for provider data). */
function redactDeep(value){
  if(typeof value==='string')return redactText(value);
  if(Array.isArray(value))return value.map(redactDeep);
  if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=redactDeep(v);return out;}
  return value;
}

/* Stable key for de-duplication (object keys sorted). */
function stableKey(value){
  if(Array.isArray(value))return '['+value.map(stableKey).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableKey(value[k])).join(',')+'}';
  return JSON.stringify(value===undefined?null:value);
}

/* A missing or invalid limit stays Infinity here, but costed (quota/paid) operations
   refuse to run without finite maxUnits AND maxRequests (BUDGET_REQUIRED). */
function normalizeBudget(budget){
  const b=budget&&typeof budget==='object'?budget:{};
  const num=(v,f)=>v!==null&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):f;
  return {maxUnits:num(b.maxUnits,Infinity),usedUnits:num(b.usedUnits,0),maxRequests:num(b.maxRequests,Infinity),requests:num(b.requests,0)};
}
const finiteBudget=b=>Number.isFinite(b.maxUnits)&&Number.isFinite(b.maxRequests);
const publicBudget=b=>({maxUnits:Number.isFinite(b.maxUnits)?b.maxUnits:null,usedUnits:b.usedUnits,maxRequests:Number.isFinite(b.maxRequests)?b.maxRequests:null,requests:b.requests});

function iso(clock){const v=typeof clock==='function'?clock():new Date();const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))throw new TypeError('clock must return a valid date');return d.toISOString();}

/* Evidence is whitelisted: raw responses (headers, bodies) are never copied. */
function evidenceOf(raw,rowCount){
  const e={rowCount};
  if(Number.isFinite(Number(raw?.httpStatus)))e.httpStatus=Number(raw.httpStatus);
  for(const k of ['requestId','externalId','sourceUrl','providerVersion']){const v=text(raw?.[k]);if(v)e[k]=redact(v);}
  if(Number.isFinite(Number(raw?.expected)))e.expected=Number(raw.expected);
  if(raw?.truncated===true)e.truncated=true;
  return e;
}

function envelope(base,extra){return freeze({provider:base.provider,operation:base.operation,release:base.release||null,target:base.target||null,status:'ERROR',data:[],partial:null,errors:[],cost:{units:0,estimatedUsd:null,charged:false},budget:publicBudget(base.budget),cached:false,connection:'NOT_VERIFIED',provenance:null,...extra});}

/**
 * runProviderRequest({provider, operation, input, transport, clock, budget, cache, confirmCost, maxRows})
 * - transport: {kind:'mock'|'live', request(operation,input) => Promise<raw>} injected by the host/platform.
 *   raw: {httpStatus?, rows?, expected?, truncated?, errors?[], requestId?, externalId?, sourceUrl?, retryAfter?, charged?}
 * - Never uses globalThis.fetch, never stores anything, never marks a mock as verified.
 */
async function runProviderRequest(request={}){
  const {provider,operation,input={},transport,clock,cache,confirmCost=false}=request,maxRows=Number.isInteger(request.maxRows)&&request.maxRows>=0?request.maxRows:Infinity;
  const d=describe(provider,operation),budget=normalizeBudget(request.budget);
  const base={provider:text(provider),operation:text(operation),release:d?.release,target:d?.target,budget};
  if(!d)return envelope(base,{status:'ERROR',errors:[{code:'UNKNOWN_OPERATION',message:'Unknown provider/operation',retryable:false}]});
  if(d.deferred)return envelope(base,{status:'NOT_CONFIGURED',errors:[{code:'BRIDGE_PENDING',message:`Provider requires the ${d.deferred} bridge`,retryable:false}]});
  const secret=findSecret(input);
  if(secret)return envelope(base,{status:'ERROR',errors:[{code:'SECRET_IN_INPUT',message:redact(`Secrets must stay in the server-side transport (${secret==='(value)'?'credential-like value':'field "'+secret+'"'})`),retryable:false}]});
  try{JSON.stringify(input);}catch{return envelope(base,{status:'ERROR',errors:[{code:'INVALID_INPUT',message:'Input must be JSON-serializable (no cycles)',retryable:false}]});}
  if(transport==null)return envelope(base,{status:'NOT_CONNECTED',errors:[{code:'NO_TRANSPORT',message:'No transport injected; provider is not connected',retryable:false}]});
  if(typeof transport.request!=='function')throw new TypeError('transport.request must be a function');
  if(cache!=null&&(typeof cache.get!=='function'||typeof cache.set!=='function'))throw new TypeError('cache must provide get() and set()');
  const requestedAt=iso(clock),key=provider+'|'+operation+'|'+stableKey(input);
  if(cache&&cache.get(key)){const hit=cache.get(key);return freeze({...clone(hit),cached:true,cost:{units:0,estimatedUsd:null,charged:false},budget:publicBudget(budget)});}
  if(d.costModel==='paid'&&confirmCost!==true)return envelope(base,{status:'COST_CONFIRMATION_REQUIRED',errors:[{code:'COST_CONFIRMATION_REQUIRED',message:'Paid operation requires explicit confirmation',retryable:false}]});
  if(d.costModel!=='free'&&!finiteBudget(budget))return envelope(base,{status:'BUDGET_REQUIRED',errors:[{code:'BUDGET_REQUIRED',message:`A finite budget (maxUnits and maxRequests) is required for ${d.costModel} operations`,retryable:false}]});
  if(budget.requests+1>budget.maxRequests||budget.usedUnits+d.units>budget.maxUnits)return envelope(base,{status:'BUDGET_EXCEEDED',errors:[{code:'BUDGET_EXCEEDED',message:'Request would exceed the injected budget',retryable:false}]});
  const spent={...budget,requests:budget.requests+1,usedUnits:budget.usedUnits+d.units},cost={units:d.units,estimatedUsd:null,charged:d.costModel==='paid'};
  const kind=transport.kind==='live'?'live':'mock';
  let raw;
  try{raw=await transport.request(operation,clone(input));}
  catch(error){
    const timeout=error?.name==='AbortError'||error?.code==='ETIMEDOUT';
    return envelope({...base,budget:spent},{status:'ERROR',cost,errors:[{code:timeout?'TIMEOUT':'TRANSPORT_ERROR',message:redact(error?.message||error),retryable:true}]});
  }
  const capturedAt=iso(clock),http=Number(raw?.httpStatus);
  const provenance={provider:base.provider,sourceType:d.sourceType,operation:base.operation,requestedAt,capturedAt,method:kind==='live'?'api':'mock',evidence:evidenceOf(raw,0)};
  if(http===401)return envelope({...base,budget:spent},{status:'NOT_CONNECTED',cost,provenance:freeze(provenance),errors:[{code:'AUTH',message:'Authorization rejected by provider',retryable:false}]});
  if(http===429){const retry=Number(raw?.retryAfter);return envelope({...base,budget:spent},{status:'RATE_LIMITED',cost,provenance:freeze(provenance),errors:[{code:'RATE_LIMITED',message:'Provider rate limit reached',retryable:true,retryAfterSeconds:Number.isFinite(retry)&&retry>=0?retry:null}]});}
  if(Number.isFinite(http)&&http>=400)return envelope({...base,budget:spent},{status:'ERROR',cost,provenance:freeze(provenance),errors:[{code:http===403?'FORBIDDEN':'HTTP_'+http,message:redact(raw?.message||'Provider error'),retryable:http>=500}]});
  if(raw?.rows===undefined||raw?.rows===null)return envelope({...base,budget:spent},{status:'NOT_MEASURED',cost,provenance:freeze(provenance),errors:[]});
  const rows=arr(raw.rows),accepted=rows.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!findSecretKey(r)),rejected=rows.length-accepted.length,valid=accepted.slice(0,maxRows),capped=accepted.length-valid.length;
  const itemErrors=arr(raw.errors).map(e=>({code:text(e?.code)||'ITEM_ERROR',message:redact(e?.message),retryable:e?.retryable===true}));
  const expected=Number(raw.expected),missing=Number.isFinite(expected)&&expected>valid.length?expected-valid.length:0;
  provenance.evidence=evidenceOf(raw,valid.length);
  const isPartial=raw.truncated===true||rejected>0||itemErrors.length>0||missing>0||capped>0;
  const partial=isPartial?{received:valid.length,expected:Number.isFinite(expected)?expected:null,rejected,capped,truncated:raw.truncated===true||capped>0,reason:rejected?'invalid-rows':capped?'max-rows':raw.truncated===true?'truncated':missing?'missing-rows':'item-errors'}:null;
  const status=valid.length===0&&!isPartial?'EMPTY':isPartial?'PARTIAL':'OK';
  const result=envelope({...base,budget:spent},{status,data:redactDeep(valid),partial,errors:itemErrors,cost,provenance:freeze(provenance),connection:kind==='live'&&(status==='OK'||status==='PARTIAL'||status==='EMPTY')?'VERIFIED':'NOT_VERIFIED'});
  if(cache&&(status==='OK'||status==='PARTIAL'||status==='EMPTY'))cache.set(key,result);
  return result;
}

/* A result older than maxAgeMs becomes STALE; data and provenance are kept for review. */
function markStale(result,{maxAgeMs,clock}={}){
  if(!result||!result.provenance?.capturedAt||!Number.isFinite(Number(maxAgeMs)))return result;
  const age=Date.parse(iso(clock))-Date.parse(result.provenance.capturedAt);
  return age>Number(maxAgeMs)&&['OK','PARTIAL','EMPTY'].includes(result.status)?freeze({...clone(result),status:'STALE',staleSince:result.provenance.capturedAt}):result;
}

const usable=r=>r&&['OK','PARTIAL','EMPTY','STALE'].includes(r.status);
const measured=r=>r?.provenance?.method==='api'&&['OK','PARTIAL'].includes(r.status)?'MEASURED':'UNKNOWN';
const releaseEProvenance=(r,row)=>({provider:r.provider,sourceType:r.provenance.sourceType,sourceUrl:text(row?.sourceUrl)||text(r.provenance.evidence?.sourceUrl),capturedAt:r.provenance.capturedAt,externalId:text(row?.externalId)||text(r.provenance.evidence?.requestId),method:r.provenance.method,status:measured(r)});

/* Neutral backlink schema for Release C `intelligence.backlinks` (and CORE-8 input). The
   Core has no reusable backlink normalizer, so this one is deliberately small:
   {sourceUrl, targetUrl, sourceDomain, anchor|null, rel ('follow'|'nofollow'|'ugc'|
   'sponsored'|null), firstSeen|null, lastSeen|null, lost|null, sourceRank|null,
   measuredAt, provider}. Accepted input aliases: sourceUrl|source_url|url_from,
   targetUrl|target_url|url_to, anchor|anchor_text, rel|dofollow, firstSeen|first_seen,
   lastSeen|last_seen, lost|is_lost, sourceRank|domain_from_rank|rank. Missing values stay
   null (never 0 or invented). Rows without http(s) source and target URLs are rejected. */
const httpUrl=v=>{try{const u=new URL(text(v));return /^https?:$/.test(u.protocol)?redactText(u.href):'';}catch{return '';}};
const isoOrNull=v=>{if(v==null||v==='')return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const numOrNull=v=>v==null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const boolOrNull=(...vs)=>{for(const v of vs)if(typeof v==='boolean')return v;return null;};
function relOf(r){
  const tokens=text(r.rel).toLowerCase().split(/[\s,]+/).filter(Boolean);
  for(const t of ['sponsored','ugc','nofollow'])if(tokens.includes(t))return t;
  if(tokens.includes('follow')||tokens.includes('dofollow'))return 'follow';
  return typeof r.dofollow==='boolean'?(r.dofollow?'follow':'nofollow'):null;
}
function normalizeBacklinks(rows,{measuredAt=null,provider=''}={}){
  const out=[];let rejected=0;
  for(const r of arr(rows)){
    if(!r||typeof r!=='object'){rejected++;continue;}
    const sourceUrl=httpUrl(r.sourceUrl??r.source_url??r.url_from),targetUrl=httpUrl(r.targetUrl??r.target_url??r.url_to);
    if(!sourceUrl||!targetUrl){rejected++;continue;}
    const anchor=text(r.anchor??r.anchor_text);
    out.push({sourceUrl,targetUrl,sourceDomain:new URL(sourceUrl).hostname,anchor:anchor?redactText(anchor):null,rel:relOf(r),firstSeen:isoOrNull(r.firstSeen??r.first_seen),lastSeen:isoOrNull(r.lastSeen??r.last_seen),lost:boolOrNull(r.lost,r.is_lost),sourceRank:numOrNull(r.sourceRank??r.domain_from_rank??r.rank),measuredAt,provider:text(provider)});
  }
  return {rows:out,rejected};
}

/* Map a result into the existing Release C contracts. `intelligence` is injected (no import). */
function toReleaseC(result,{intelligence}={}){
  if(intelligence==null||typeof intelligence.SearchConsoleAdapter!=='function'||typeof intelligence.DataForSEOAdapter!=='function')throw new TypeError('intelligence module must be injected');
  if(!usable(result)||result.release!=='C')return {status:result?.status||'ERROR',rows:[],provenance:result?.provenance||null,partial:result?.partial||null};
  const rows=result.data;
  let mapped;
  if(result.provider==='search-console')mapped=new intelligence.SearchConsoleAdapter({}).normalize(rows);
  else if(result.operation==='keywords')mapped=new intelligence.DataForSEOAdapter({}).normalizeKeywords(rows.map(r=>({...r,measuredAt:result.provenance.capturedAt})));
  else if(result.operation==='serp')mapped=new intelligence.DataForSEOAdapter({}).normalizeSerps(rows.map(r=>({...r,measuredAt:result.provenance.capturedAt})));
  else if(result.operation==='backlinks'){
    const normalized=normalizeBacklinks(rows,{measuredAt:result.provenance.capturedAt,provider:result.provider});
    const partial=normalized.rejected?{...(result.partial||{}),received:normalized.rows.length,rejectedByNormalizer:normalized.rejected,reason:result.partial?.reason||'invalid-rows'}:clone(result.partial);
    return {status:normalized.rejected?'PARTIAL':result.status,rows:normalized.rows.map(r=>({...r,provenance:clone(result.provenance)})),provenance:clone(result.provenance),partial};
  }
  else mapped=clone(rows);
  return {status:result.status,rows:mapped.map(r=>({...r,provenance:clone(result.provenance)})),provenance:clone(result.provenance),partial:clone(result.partial)};
}

/* Map a result into the existing Release E contracts. `releaseE` (and, for presence and
   citations, the active adapter descriptor, D-13) are injected. */
function toReleaseE(result,{releaseE,adapter}={}){
  if(releaseE==null||typeof releaseE.normalizeIndexationRecord!=='function'||typeof releaseE.indexNowResult!=='function')throw new TypeError('releaseE module must be injected');
  if(!usable(result)&&result?.target!=='authority.submission')return {status:result?.status||'ERROR',records:[],provenance:result?.provenance||null,partial:result?.partial||null};
  if(result.release!=='E')return {status:result.status,records:[],provenance:result.provenance,partial:result.partial};
  let records;
  if(result.target==='authority.submission'){
    const http=result.provenance?.evidence?.httpStatus;
    records=[{...releaseE.indexNowResult(http,{}),checkedAt:result.provenance?.capturedAt||null,provenance:result.provenance?releaseEProvenance(result,{}):null}];
  }else if(result.target==='authority.indexation'){
    records=result.data.map(row=>releaseE.normalizeIndexationRecord({url:row.url,status:row.status,provider:result.provider,checkedAt:result.provenance.capturedAt,lastCrawledAt:row.lastCrawledAt,provenance:releaseEProvenance(result,row)}));
  }else if(result.target==='authority.presence'){
    records=result.data.map(row=>releaseE.normalizePresenceRecord({...row,provenance:releaseEProvenance(result,row)},{adapter}));
  }else if(result.target==='authority.citation'){
    records=result.data.map(row=>releaseE.normalizeCitationObservation({...row,provenance:releaseEProvenance(result,row)},{adapter}));
  }else records=[];
  return {status:result.status,records,provenance:clone(result.provenance),partial:clone(result.partial)};
}

return Object.freeze({RESULT_STATUSES,COST_MODELS,catalog,describe,runProviderRequest,markStale,toReleaseC,toReleaseE,normalizeBacklinks,stableKey,redact});
});

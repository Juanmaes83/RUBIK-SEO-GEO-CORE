'use strict';
/* CORE-7 (D-21): neutral provider contracts for Release C and Release E. Deterministic:
   injected clock and mock transports only; no network, secrets or persistence. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const providers=require('../src/rubik-seo-geo-providers.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');
const releaseE=require('../src/rubik-seo-geo-release-e.js');
const core=require('../src/rubik-seo-geo-core.js');

const clock=()=>new Date('2026-09-25T10:00:00Z');
function mock(response,{kind='mock'}={}){
  const calls=[];
  return {calls,transport:{kind,request:async(operation,input)=>{calls.push({operation,input});if(response instanceof Error)throw response;return typeof response==='function'?response(operation,input):response;}}};
}
/* Costed operations need a finite budget (D-21); tests pass one unless a case omits it on purpose. */
const BUDGET=Object.freeze({maxUnits:100,maxRequests:100});
const run=(extra)=>providers.runProviderRequest({clock,...('budget' in extra?{}:{budget:BUDGET}),...extra});

// ── Catalogue ─────────────────────────────────────────────────────────────────

test('catalogue is declarative: release, cost model and source type per operation; no endpoints or secrets',()=>{
  const cat=providers.catalog();
  assert.deepEqual(Object.keys(cat).sort(),['bing-webmaster','dataforseo','indexnow','manual-import','openseo','search-console']);
  for(const [id,p] of Object.entries(cat)){
    assert.doesNotMatch(JSON.stringify(p),/https?:|apiKey|token|password|secret/i,id);
    for(const [op,d] of Object.entries(p.operations)){
      assert.ok(['C','E'].includes(d.release),id+'.'+op);
      assert.ok(providers.COST_MODELS.includes(d.costModel),id+'.'+op);
      assert.ok(Number.isFinite(d.units)&&d.units>=0,id+'.'+op);
    }
  }
  cat['search-console'].label='mutated';
  assert.equal(providers.catalog()['search-console'].label,'Google Search Console','catalog() returns a copy');
  assert.equal(providers.describe('openseo','siteAudit').requires,'mcp','CORE-7.1 (D-22): OpenSEO runs only through an injected MCP client');
  assert.equal(providers.describe('nope','x'),null);
});

test('module is dependency-free and never touches globalThis.fetch',async()=>{
  const code=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-providers.js'),'utf8');
  assert.doesNotMatch(code,/require\(|fetch\(|localStorage|indexedDB|process\.env/);
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('network must not be used');};
  try{
    const {transport}=mock({httpStatus:200,rows:[{query:'q'}]});
    assert.equal((await run({provider:'search-console',operation:'searchAnalytics',transport})).status,'OK');
    assert.equal((await run({provider:'search-console',operation:'searchAnalytics'})).status,'NOT_CONNECTED');
  }finally{globalThis.fetch=original;}
});

// ── Honest states and explicit dependencies ───────────────────────────────────

test('no transport is NOT_CONNECTED; unknown operation is ERROR; OpenSEO waits for the CORE-7.1 bridge',async()=>{
  const none=await run({provider:'bing-webmaster',operation:'urlInfo',input:{url:'https://x.example/'}});
  assert.equal(none.status,'NOT_CONNECTED');
  assert.equal(none.connection,'NOT_VERIFIED');
  assert.deepEqual(none.data,[]);
  assert.equal(none.provenance,null);
  const unknown=await run({provider:'search-console',operation:'deleteEverything',transport:mock({}).transport});
  assert.equal(unknown.errors[0].code,'UNKNOWN_OPERATION');
  const {transport,calls}=mock({rows:[{id:'x'}]});
  const openseo=await run({provider:'openseo',operation:'siteAudit',transport});
  assert.equal(openseo.status,'NOT_CONFIGURED');
  assert.equal(openseo.errors[0].code,'BRIDGE_PENDING');
  assert.equal(calls.length,0,'the bridge is not implemented here');
});

test('invalid injected dependencies are wiring errors',async()=>{
  await assert.rejects(run({provider:'indexnow',operation:'submit',transport:{}}),TypeError);
  await assert.rejects(run({provider:'indexnow',operation:'submit',transport:mock({}).transport,cache:{}}),TypeError);
  await assert.rejects(run({provider:'indexnow',operation:'submit',transport:mock({}).transport,clock:()=>'not a date'}),TypeError);
});

test('OK result carries provenance: source, dates and whitelisted evidence; mocks are never verified',async()=>{
  const {transport,calls}=mock({httpStatus:200,requestId:'req-1',sourceUrl:'https://api.example/x?token=SECRET',headers:{authorization:'Bearer SECRET'},rows:[{query:'abogado alicante',page:'/servicios/',clicks:3,impressions:40}]});
  const r=await run({provider:'search-console',operation:'searchAnalytics',input:{property:'sc-domain:x.example',dateRange:'28d'},transport});
  assert.equal(r.status,'OK');
  assert.deepEqual(calls,[{operation:'searchAnalytics',input:{property:'sc-domain:x.example',dateRange:'28d'}}]);
  assert.deepEqual(r.provenance,{provider:'search-console',sourceType:'SEARCH_CONSOLE',operation:'searchAnalytics',requestedAt:'2026-09-25T10:00:00.000Z',capturedAt:'2026-09-25T10:00:00.000Z',method:'mock',evidence:{rowCount:1,httpStatus:200,requestId:'req-1',sourceUrl:'https://api.example/x?token=[redacted]'}});
  assert.equal(r.connection,'NOT_VERIFIED','a mock never verifies a connection');
  assert.doesNotMatch(JSON.stringify(r),/SECRET|authorization/i);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.data[0]));
  const live=await run({provider:'search-console',operation:'searchAnalytics',transport:mock({httpStatus:200,rows:[]},{kind:'live'}).transport});
  assert.equal(live.connection,'VERIFIED');
  assert.equal(live.provenance.method,'api');
});

test('EMPTY (measured, no rows) is distinct from NOT_MEASURED (no data returned)',async()=>{
  const empty=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({httpStatus:200,rows:[]}).transport});
  assert.equal(empty.status,'EMPTY');
  const notMeasured=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({httpStatus:200}).transport});
  assert.equal(notMeasured.status,'NOT_MEASURED');
  assert.deepEqual(notMeasured.data,[]);
});

test('partial data: truncated, missing, invalid rows, item errors and maxRows are PARTIAL, never zero-filled',async()=>{
  const cases=[
    [{rows:[{q:1}],truncated:true},'truncated'],
    [{rows:[{q:1}],expected:3},'missing-rows'],
    [{rows:[{q:1},null,'bad',{q:2,token:'x'}]},'invalid-rows'],
    [{rows:[{q:1}],errors:[{code:'ROW_FAILED',message:'row 2 failed ?key=abc'}]},'item-errors']
  ];
  for(const [raw,reason] of cases){
    const r=await run({provider:'search-console',operation:'searchAnalytics',transport:mock(raw).transport});
    assert.equal(r.status,'PARTIAL',reason);
    assert.equal(r.partial.reason,reason);
    assert.equal(r.data.length,1,reason);
    assert.doesNotMatch(JSON.stringify(r),/"token"|abc/);
  }
  const capped=await run({provider:'search-console',operation:'searchAnalytics',maxRows:2,transport:mock({rows:[{a:1},{a:2},{a:3}]}).transport});
  assert.deepEqual([capped.status,capped.partial.reason,capped.partial.capped,capped.data.length],['PARTIAL','max-rows',1,2]);
  const keywords=toC(await run({provider:'dataforseo',operation:'keywords',confirmCost:true,transport:mock({rows:[{query:'q'}]}).transport}));
  assert.equal(keywords.rows[0].volume,null,'missing metrics stay null');
  assert.equal(keywords.rows[0].difficulty,null);
});

test('errors are honest, bounded and redacted',async()=>{
  const auth=await run({provider:'search-console',operation:'urlInspection',transport:mock({httpStatus:401}).transport});
  assert.deepEqual([auth.status,auth.errors[0].code,auth.errors[0].retryable],['NOT_CONNECTED','AUTH',false]);
  const forbidden=await run({provider:'search-console',operation:'urlInspection',transport:mock({httpStatus:403}).transport});
  assert.deepEqual([forbidden.status,forbidden.errors[0].code],['ERROR','FORBIDDEN']);
  const server=await run({provider:'search-console',operation:'urlInspection',transport:mock({httpStatus:503,message:'down'}).transport});
  assert.deepEqual([server.status,server.errors[0].code,server.errors[0].retryable],['ERROR','HTTP_503',true]);
  const limited=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({httpStatus:429,retryAfter:'120'}).transport});
  assert.deepEqual([limited.status,limited.errors[0].retryAfterSeconds,limited.errors[0].retryable],['RATE_LIMITED',120,true]);
  const thrown=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock(new Error('failed https://user:pass@api.example/?api_key=XYZ Bearer abc.def '+'x'.repeat(400))).transport});
  assert.equal(thrown.errors[0].code,'TRANSPORT_ERROR');
  assert.ok(thrown.errors[0].message.length<=200);
  assert.doesNotMatch(thrown.errors[0].message,/pass@|XYZ|abc\.def/);
  const abort=Object.assign(new Error('aborted'),{name:'AbortError'});
  assert.equal((await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock(abort).transport})).errors[0].code,'TIMEOUT');
});

test('secrets in the request input are refused before any call',async()=>{
  for(const input of [{apiKey:'x'},{nested:{access_token:'y'}},{Authorization:'Bearer z'}]){
    const {transport,calls}=mock({rows:[]});
    const r=await run({provider:'search-console',operation:'searchAnalytics',input,transport});
    assert.equal(r.errors[0].code,'SECRET_IN_INPUT');
    assert.equal(calls.length,0);
  }
});

// ── Usage and cost limits ─────────────────────────────────────────────────────

test('paid operations need explicit confirmation and respect the injected budget without mutating it',async()=>{
  const {transport,calls}=mock({httpStatus:200,rows:[{query:'q',volume:10}]});
  const unconfirmed=await run({provider:'dataforseo',operation:'keywords',transport});
  assert.equal(unconfirmed.status,'COST_CONFIRMATION_REQUIRED');
  assert.equal(calls.length,0);
  const budget=Object.freeze({maxUnits:1,usedUnits:1,maxRequests:10});
  const over=await run({provider:'dataforseo',operation:'keywords',confirmCost:true,budget,transport});
  assert.equal(over.status,'BUDGET_EXCEEDED');
  assert.equal(calls.length,0);
  const ok=await run({provider:'dataforseo',operation:'keywords',confirmCost:true,budget:{maxUnits:5,usedUnits:1,maxRequests:10,requests:2},transport});
  assert.equal(ok.status,'OK');
  assert.deepEqual(ok.cost,{units:1,estimatedUsd:null,charged:true},'no invented price');
  assert.deepEqual(ok.budget,{maxUnits:5,usedUnits:2,maxRequests:10,requests:3});
  const reqCap=await run({provider:'search-console',operation:'searchAnalytics',budget:{maxUnits:10,maxRequests:0},transport});
  assert.equal(reqCap.status,'BUDGET_EXCEEDED');
});

test('an injected cache de-duplicates identical requests at no cost; different inputs call again',async()=>{
  const {transport,calls}=mock({httpStatus:200,rows:[{query:'q'}]});
  const cache=new Map();
  const req={provider:'dataforseo',operation:'serp',confirmCost:true,input:{query:'q',location:{country:'ES',lang:'es'}},transport,cache};
  const first=await run(req);
  const second=await run({...req,input:{location:{lang:'es',country:'ES'},query:'q'}});
  assert.equal(calls.length,1,'key is order-independent');
  assert.equal(second.cached,true);
  assert.deepEqual(second.cost,{units:0,estimatedUsd:null,charged:false});
  assert.deepEqual(second.data,first.data);
  await run({...req,input:{query:'other'}});
  assert.equal(calls.length,2);
  const failing=mock({httpStatus:500});
  await run({provider:'search-console',operation:'searchAnalytics',transport:failing.transport,cache});
  await run({provider:'search-console',operation:'searchAnalytics',transport:failing.transport,cache});
  assert.equal(failing.calls.length,2,'errors are not cached');
});

test('STALE after maxAgeMs keeps data and provenance',async()=>{
  const r=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({rows:[{url:'https://x/'}]}).transport});
  const later=()=>new Date('2026-09-27T10:00:00Z');
  const stale=providers.markStale(r,{maxAgeMs:24*3600e3,clock:later});
  assert.equal(stale.status,'STALE');
  assert.equal(stale.staleSince,'2026-09-25T10:00:00.000Z');
  assert.deepEqual(stale.data,r.data);
  assert.equal(providers.markStale(r,{maxAgeMs:7*24*3600e3,clock:later}).status,'OK');
});

test('identical inputs and clock produce identical results',async()=>{
  const make=()=>run({provider:'search-console',operation:'searchAnalytics',input:{q:1},transport:mock({httpStatus:200,requestId:'r',rows:[{query:'a'}]}).transport});
  assert.deepEqual(await make(),await make());
});

// ── Mapping into existing Release C / Release E contracts ─────────────────────

function toC(result){return providers.toReleaseC(result,{intelligence});}

test('toReleaseC reuses the existing Intelligence normalizers and keeps provenance',async()=>{
  const sc=toC(await run({provider:'search-console',operation:'searchAnalytics',transport:mock({rows:[{query:'q',page:'/',clicks:'3',impressions:'40'}]}).transport}));
  assert.equal(sc.status,'OK');
  // SearchConsoleAdapter.normalize() stamps fetchedAt with now(); compare without it to stay deterministic.
  const withoutFetchedAt=rows=>rows.map(({fetchedAt,...r})=>r);
  assert.deepEqual(withoutFetchedAt(new intelligence.SearchConsoleAdapter({}).normalize([{query:'q',page:'/',clicks:'3',impressions:'40'}]).map(r=>({...r,provenance:sc.provenance}))),withoutFetchedAt(sc.rows));
  assert.ok(sc.rows.every(r=>typeof r.fetchedAt==='string'));
  const serp=toC(await run({provider:'dataforseo',operation:'serp',confirmCost:true,transport:mock({rows:[{query:'q',position:2,domain:'x.example'}]}).transport}));
  assert.equal(serp.rows[0].measuredAt,'2026-09-25T10:00:00.000Z','measuredAt is the capture date, not now()');
  assert.equal(serp.rows[0].provenance.sourceType,'MANUAL');
  assert.throws(()=>providers.toReleaseC(serp,{}),TypeError);
  const notConnected=toC(await run({provider:'search-console',operation:'searchAnalytics'}));
  assert.deepEqual([notConnected.status,notConnected.rows],['NOT_CONNECTED',[]]);
});

test('toReleaseE indexation records keep provider status and provenance; mocks stay UNKNOWN',async()=>{
  const rows=[{url:'https://x.example/',status:'INDEXED',lastCrawledAt:'2026-09-20T00:00:00Z'},{url:'https://x.example/a/',status:'EXCLUDED'}];
  const mockE=providers.toReleaseE(await run({provider:'search-console',operation:'urlInspection',transport:mock({rows}).transport}),{releaseE});
  assert.deepEqual(mockE.records.map(r=>[r.url,r.status,r.provider,r.checkedAt]),[['https://x.example/','INDEXED','search-console','2026-09-25T10:00:00.000Z'],['https://x.example/a/','EXCLUDED','search-console','2026-09-25T10:00:00.000Z']]);
  assert.deepEqual([mockE.records[0].provenance.sourceType,mockE.records[0].provenance.method,mockE.records[0].provenance.status],['SEARCH_CONSOLE','mock','UNKNOWN']);
  const liveE=providers.toReleaseE(await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({rows:[{url:'https://x/',status:'CRAWLED'}]},{kind:'live'}).transport}),{releaseE});
  assert.deepEqual([liveE.records[0].provenance.method,liveE.records[0].provenance.status],['api','MEASURED']);
  assert.throws(()=>providers.toReleaseE(liveE,{}),TypeError);
});

test('IndexNow submission maps to a submission state, never to INDEXED',async()=>{
  const expectations={200:'PENDING',202:'PENDING',403:'BLOCKED',429:'STALE',500:'ERROR'};
  for(const [http,state] of Object.entries(expectations)){
    const mapped=providers.toReleaseE(await run({provider:'indexnow',operation:'submit',input:{urls:['https://x/']},transport:mock({httpStatus:Number(http)}).transport}),{releaseE});
    assert.equal(mapped.records[0].status,state,http);
    assert.notEqual(mapped.records[0].status,'INDEXED');
  }
  const disconnected=providers.toReleaseE(await run({provider:'indexnow',operation:'submit'}),{releaseE});
  assert.deepEqual([disconnected.records[0].status,disconnected.records[0].provenance],['UNKNOWN',null]);
});

test('manual presence and citation imports are vertical-neutral via the injected adapter descriptor',async()=>{
  for(const adapterId of ['real-estate','hospitality','restaurant']){
    const state={seo:{...core.defaults(),adapterId}},adapter=core.adapter(state);
    const presence=providers.toReleaseE(await run({provider:'manual-import',operation:'presence',transport:mock({rows:[{id:'p1',provider:'Directorio',profileUrl:'https://dir.example/p',status:'DISCOVERED',sourceUrl:'https://dir.example/p'}]}).transport}),{releaseE,adapter});
    assert.deepEqual([presence.records[0].vertical,presence.records[0].entityType,presence.records[0].provenance.sourceType],[adapterId,adapter.schemaType,'MANUAL']);
    const citation=providers.toReleaseE(await run({provider:'manual-import',operation:'citation',transport:mock({rows:[{id:'c1',query:'q',provider:'AI',mentioned:false,cited:false}]}).transport}),{releaseE,adapter});
    assert.deepEqual([citation.records[0].vertical,citation.records[0].status,citation.records[0].cited],[adapterId,'UNKNOWN',false]);
  }
});

test('Release C results do not map into Release E and vice versa',async()=>{
  const c=await run({provider:'search-console',operation:'searchAnalytics',transport:mock({rows:[{query:'q'}]}).transport});
  assert.deepEqual(providers.toReleaseE(c,{releaseE}).records,[]);
  const e=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({rows:[{url:'https://x/'}]}).transport});
  assert.deepEqual(toC(e).rows,[]);
});


// ── Review follow-up (D-21 hardening) ─────────────────────────────────────────

const SECRET_VALUES=['pa55word','CS-client-secret-1','RT-refresh-1','XK-api-key-1','hunter2','abc.def.ghi','dXNlcjpwYXNz','AT-access-1','deep-secret-9'];
const noSecrets=(value,label)=>{const json=JSON.stringify(value);for(const s of SECRET_VALUES)assert.ok(!json.includes(s),`${label}: leaked ${s}`);};
function nest(depth,leaf){let v=leaf;for(let i=0;i<depth;i++)v={level:v};return v;}

test('secret keys are found at any depth (beyond six levels), in arrays and with common spellings',async()=>{
  const cases=[nest(10,{password:'deep-secret-9'}),nest(7,[{ok:1},{client_secret:'CS-client-secret-1'}]),{a:[[[[[[[[{refresh_token:'RT-refresh-1'}]]]]]]]]},{headers:{'x-api-key':'XK-api-key-1'}},{Passwd:'hunter2'},{auth:{accessToken:'AT-access-1'}}];
  for(const input of cases){
    const {transport,calls}=mock({rows:[]});
    const r=await run({provider:'search-console',operation:'searchAnalytics',input,transport});
    assert.equal(r.errors[0].code,'SECRET_IN_INPUT',JSON.stringify(input).slice(0,60));
    assert.equal(calls.length,0);
    noSecrets(r,'secret input');
  }
});

test('credential-like values in the input are refused without echoing them; cycles are safe',async()=>{
  for(const input of [{url:'https://x.example/?access_token=AT-access-1'},{note:'Bearer abc.def.ghi'},{target:'https://user:pa55word@x.example/'}]){
    const {transport,calls}=mock({rows:[]});
    const r=await run({provider:'search-console',operation:'searchAnalytics',input,transport});
    assert.equal(r.errors[0].code,'SECRET_IN_INPUT');
    assert.match(r.errors[0].message,/credential-like value/);
    assert.equal(calls.length,0);
    noSecrets(r,'secret value');
  }
  const cyclic={q:'ok'};cyclic.self=cyclic;
  const {transport,calls}=mock({httpStatus:202});
  const cyc=await run({provider:'indexnow',operation:'submit',input:{urls:['https://x/'],meta:cyclic},transport});
  assert.deepEqual([cyc.status,cyc.errors[0].code],['ERROR','INVALID_INPUT'],'the secret scan terminates on cycles; the non-serializable payload is refused');
  assert.equal(calls.length,0);
  const secretInCycle={a:{}};secretInCycle.a.back=secretInCycle;secretInCycle.a.password='hunter2';
  assert.equal((await run({provider:'indexnow',operation:'submit',input:secretInCycle,transport})).errors[0].code,'SECRET_IN_INPUT');
});

test('redaction covers URLs, params, schemes and key/value pairs, and stays within 200 chars',()=>{
  const cases={
    'https://user:pa55word@api.example/x':/https:\/\/\[redacted\]@api\.example/,
    'GET /v1?client_secret=CS-client-secret-1&refresh_token=RT-refresh-1&page=2':/client_secret=\[redacted\]&refresh_token=\[redacted\]&page=2/,
    'x-api-key: XK-api-key-1':/x-api-key: \[redacted\]/,
    '{"password":"hunter2","q":"ok"}':/"password":"\[redacted\]","q":"ok"/,
    'Authorization: Bearer abc.def.ghi':/\[redacted\]/,
    'Basic dXNlcjpwYXNz':/Basic \[redacted\]/,
    'retry ?access_token=AT-access-1':/access_token=\[redacted\]/
  };
  for(const [input,expected] of Object.entries(cases)){const out=providers.redact(input);assert.match(out,expected,input);noSecrets(out,input);}
  assert.equal(providers.redact('password=hunter2 '+'x'.repeat(500)).length,200);
  assert.equal(providers.redact('plain message about tokens and keys'),'plain message about tokens and keys');
});

test('provider errors, evidence and data never carry secrets',async()=>{
  const thrown=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock(new Error('POST https://user:pa55word@api.example/?client_secret=CS-client-secret-1 x-api-key: XK-api-key-1 Bearer abc.def.ghi')).transport});
  noSecrets(thrown,'thrown');
  const http=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({httpStatus:400,message:'bad refresh_token=RT-refresh-1'}).transport});
  noSecrets(http,'4xx');
  const r=await run({provider:'search-console',operation:'searchAnalytics',transport:mock({
    httpStatus:200,requestId:'req?token=AT-access-1',sourceUrl:'https://api.example/q?api_key=XK-api-key-1',
    errors:[{code:'ROW',message:'row failed password=hunter2'}],
    rows:[{query:'q',page:'https://x.example/p?access_token=AT-access-1'},nest(9,{client_secret:'CS-client-secret-1'}),{query:'deep',meta:nest(8,{note:'Basic dXNlcjpwYXNz'})}]
  }).transport});
  assert.equal(r.status,'PARTIAL');
  assert.equal(r.partial.rejected,1,'the row with a deep secret key is rejected');
  assert.equal(r.data[0].page,'https://x.example/p?access_token=[redacted]');
  noSecrets(r,'data/evidence/errors');
  noSecrets(toC(r),'mapped');
});

test('costed operations without a finite budget return BUDGET_REQUIRED before any call',async()=>{
  const invalid=[undefined,null,{},{maxUnits:5},{maxRequests:5},{maxUnits:-1,maxRequests:5},{maxUnits:'abc',maxRequests:5},{maxUnits:true,maxRequests:5},{maxUnits:null,maxRequests:5}];
  for(const budget of invalid){
    for(const [provider,operation,extra] of [['search-console','searchAnalytics',{}],['bing-webmaster','urlInfo',{}],['dataforseo','backlinks',{confirmCost:true}]]){
      const {transport,calls}=mock({httpStatus:200,rows:[{query:'q'}]});
      const r=await run({provider,operation,budget,transport,...extra});
      assert.equal(r.status,'BUDGET_REQUIRED',`${provider} ${JSON.stringify(budget)}`);
      assert.equal(calls.length,0);
      assert.equal(r.cost.estimatedUsd,null);
    }
  }
  const unconfirmed=await run({provider:'dataforseo',operation:'serp',budget:undefined,transport:mock({rows:[]}).transport});
  assert.equal(unconfirmed.status,'COST_CONFIRMATION_REQUIRED','paid confirmation is still checked first');
});

test('finite budgets: enough runs once and counts; exceeded units or requests block the call',async()=>{
  const {transport,calls}=mock({httpStatus:200,rows:[{query:'q'}]});
  const ok=await run({provider:'search-console',operation:'searchAnalytics',budget:{maxUnits:2,maxRequests:2,usedUnits:1,requests:1},transport});
  assert.deepEqual([ok.status,ok.budget],['OK',{maxUnits:2,usedUnits:2,maxRequests:2,requests:2}]);
  assert.deepEqual(ok.cost,{units:1,estimatedUsd:null,charged:false});
  for(const budget of [{maxUnits:2,usedUnits:2,maxRequests:9},{maxUnits:9,maxRequests:2,requests:2}]){
    const r=await run({provider:'dataforseo',operation:'keywords',confirmCost:true,budget,transport});
    assert.equal(r.status,'BUDGET_EXCEEDED');
  }
  assert.equal(calls.length,1,'blocked cases never reach the transport');
});

test('free operations do not require a budget',async()=>{
  const submit=await run({provider:'indexnow',operation:'submit',budget:undefined,input:{urls:['https://x/']},transport:mock({httpStatus:202}).transport});
  assert.equal(submit.status,'NOT_MEASURED');
  const presence=await run({provider:'manual-import',operation:'presence',budget:undefined,transport:mock({rows:[{id:'p'}]}).transport});
  assert.equal(presence.status,'OK');
});

test('backlinks: explicit neutral normalization with aliases, rel, dates and provenance',async()=>{
  const r=await run({provider:'dataforseo',operation:'backlinks',confirmCost:true,transport:mock({httpStatus:200,requestId:'bl-1',rows:[
    {url_from:'https://blog.example/post?utm=1',url_to:'https://site.example/',anchor:'Casa Norte',dofollow:true,first_seen:'2026-01-02T10:00:00Z',last_seen:'2026-09-01T00:00:00Z',is_lost:false,domain_from_rank:412},
    {sourceUrl:'https://dir.example/listing',targetUrl:'https://site.example/servicios/',rel:'nofollow ugc'}
  ]}).transport});
  const c=toC(r);
  assert.equal(c.status,'OK');
  assert.deepEqual(c.rows.map(({provenance,...row})=>row),[
    {sourceUrl:'https://blog.example/post?utm=1',targetUrl:'https://site.example/',sourceDomain:'blog.example',anchor:'Casa Norte',rel:'follow',firstSeen:'2026-01-02T10:00:00.000Z',lastSeen:'2026-09-01T00:00:00.000Z',lost:false,sourceRank:412,measuredAt:'2026-09-25T10:00:00.000Z',provider:'dataforseo'},
    {sourceUrl:'https://dir.example/listing',targetUrl:'https://site.example/servicios/',sourceDomain:'dir.example',anchor:null,rel:'ugc',firstSeen:null,lastSeen:null,lost:null,sourceRank:null,measuredAt:'2026-09-25T10:00:00.000Z',provider:'dataforseo'}
  ]);
  assert.equal(c.rows[0].provenance.evidence.requestId,'bl-1');
  assert.equal(c.rows[0].provenance.sourceType,'MANUAL');
});

test('backlinks: missing or invalid data is never zero-filled; invalid rows make the mapping PARTIAL',async()=>{
  const r=await run({provider:'dataforseo',operation:'backlinks',confirmCost:true,transport:mock({httpStatus:200,rows:[
    {url_from:'https://ok.example/a',url_to:'https://site.example/',domain_from_rank:'',first_seen:'not a date',dofollow:'yes',rank:true},
    {url_from:'javascript:alert(1)',url_to:'https://site.example/'},
    {url_from:'https://ok.example/b'},
    {sourceUrl:'https://ok.example/c?token=AT-access-1',targetUrl:'https://site.example/?x-api-key=XK-api-key-1'}
  ]}).transport});
  const c=toC(r);
  assert.equal(c.status,'PARTIAL');
  assert.deepEqual([c.partial.received,c.partial.rejectedByNormalizer,c.partial.reason],[2,2,'invalid-rows']);
  const first=c.rows[0];
  assert.deepEqual([first.sourceRank,first.firstSeen,first.rel,first.lost,first.anchor],[null,null,null,null,null]);
  assert.equal(c.rows[1].sourceUrl,'https://ok.example/c?token=[redacted]');
  noSecrets(c,'backlinks');
  const empty=toC(await run({provider:'dataforseo',operation:'backlinks',confirmCost:true,transport:mock({httpStatus:200,rows:[]}).transport}));
  assert.deepEqual([empty.status,empty.rows],['EMPTY',[]]);
  assert.deepEqual(providers.normalizeBacklinks(undefined),{rows:[],rejected:0});
});

// ── Review follow-up: generic `token` / `key` pairs ──────────────────────────

const GENERIC_PAIRS=['{"token":"valor-secreto-1"}','"key":"valor-secreto-2"','token=valor-secreto-3','TOKEN=valor-secreto-4','Key: valor-secreto-5',"{'KEY' : 'valor-secreto-6'}",'ToKeN = valor-secreto-7','"Token":"valor-secreto-8"'];
const GENERIC_VALUES=GENERIC_PAIRS.map(s=>/valor-secreto-\d/.exec(s)[0]);
const noGeneric=(value,label)=>{const json=JSON.stringify(value);for(const s of GENERIC_VALUES)assert.ok(!json.includes(s),`${label}: leaked ${s}`);};

test('generic token/key pairs are redacted in JSON, key=value and any letter case',()=>{
  for(const input of GENERIC_PAIRS){
    const out=providers.redact(input);
    assert.match(out,/\[redacted\]/,input);
    noGeneric(out,input);
  }
  assert.equal(providers.redact('{"token":"valor-secreto-1","q":"ok"}'),'{"token":"[redacted]","q":"ok"}');
  assert.equal(providers.redact('token=valor-secreto-3&page=2'),'token=[redacted]&page=2');
  assert.equal(providers.redact('key=abc '+'x'.repeat(500)).length,200,'200-char cap kept');
});

test('prose that only mentions "token" or "key" is not redacted, nor are similar keys',()=>{
  for(const prose of ['the token expired, refresh the key','keyword=seo alicante','tokens=5','monkey=banana','sort_key=title','basic plan for SEO','bearer of good news']){
    assert.equal(providers.redact(prose),prose,prose);
  }
  // Earlier redactions still hold.
  assert.equal(providers.redact('Bearer abc.def.ghi'),'Bearer [redacted]');
  assert.equal(providers.redact('Basic dXNlcjpwYXNz'),'Basic [redacted]');
  assert.equal(providers.redact('Token tok_1234567'),'Token [redacted]');
  assert.equal(providers.redact('api_key=AK1&x=1'),'api_key=[redacted]&x=1');
});

test('generic token/key values in the input are refused before calling the transport',async()=>{
  for(const pair of GENERIC_PAIRS){
    const {transport,calls}=mock({rows:[]});
    const r=await run({provider:'search-console',operation:'searchAnalytics',input:{note:pair},transport});
    assert.equal(r.errors[0].code,'SECRET_IN_INPUT',pair);
    assert.equal(calls.length,0,pair);
    noGeneric(r,pair);
  }
  const {transport,calls}=mock({rows:[]});
  const prose=await run({provider:'search-console',operation:'searchAnalytics',input:{note:'the token expired, refresh the key',query:'keyword research'},transport});
  assert.equal(prose.status,'EMPTY','plain prose is accepted');
  assert.equal(calls.length,1);
});

test('generic token/key values never appear in errors, evidence or output data',async()=>{
  const thrown=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock(new Error('failed {"token":"valor-secreto-1"} key=valor-secreto-2')).transport});
  noGeneric(thrown,'thrown');
  const http=await run({provider:'bing-webmaster',operation:'urlInfo',transport:mock({httpStatus:400,message:'TOKEN=valor-secreto-4'}).transport});
  noGeneric(http,'4xx');
  const r=await run({provider:'search-console',operation:'searchAnalytics',transport:mock({
    httpStatus:200,requestId:'Key: valor-secreto-5',providerVersion:'token=valor-secreto-3',
    errors:[{code:'ROW',message:'"key":"valor-secreto-2"'}],
    rows:[{query:'q',note:'ToKeN = valor-secreto-7',nested:{deep:"{'KEY' : 'valor-secreto-6'}"}}]
  }).transport});
  assert.equal(r.status,'PARTIAL');
  assert.equal(r.data[0].query,'q');
  noGeneric(r,'data/evidence/errors');
  noGeneric(toC(r),'mapped');
  const bl=toC(await run({provider:'dataforseo',operation:'backlinks',confirmCost:true,transport:mock({rows:[{url_from:'https://a.example/',url_to:'https://b.example/',anchor:'"Token":"valor-secreto-8"'}]}).transport}));
  noGeneric(bl,'backlinks');
});

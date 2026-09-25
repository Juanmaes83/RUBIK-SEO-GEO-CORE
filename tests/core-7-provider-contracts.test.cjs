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
const run=(extra)=>providers.runProviderRequest({clock,...extra});

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
  assert.equal(providers.describe('openseo','siteAudit').deferred,'CORE-7.1');
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
  const budget=Object.freeze({maxUnits:1,usedUnits:1});
  const over=await run({provider:'dataforseo',operation:'keywords',confirmCost:true,budget,transport});
  assert.equal(over.status,'BUDGET_EXCEEDED');
  assert.equal(calls.length,0);
  const ok=await run({provider:'dataforseo',operation:'keywords',confirmCost:true,budget:{maxUnits:5,usedUnits:1,maxRequests:10,requests:2},transport});
  assert.equal(ok.status,'OK');
  assert.deepEqual(ok.cost,{units:1,estimatedUsd:null,charged:true},'no invented price');
  assert.deepEqual(ok.budget,{maxUnits:5,usedUnits:2,maxRequests:10,requests:3});
  const reqCap=await run({provider:'search-console',operation:'searchAnalytics',budget:{maxRequests:0},transport});
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
  assert.deepEqual(new intelligence.SearchConsoleAdapter({}).normalize([{query:'q',page:'/',clicks:'3',impressions:'40'}]).map(r=>({...r,provenance:sc.provenance})),sc.rows);
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

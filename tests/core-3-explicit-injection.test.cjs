'use strict';
/* CORE-3 (D-13, D-14, D-15): explicit dependency injection, no implicit restaurant vertical,
   honest OpenSEO health check and Page Registry path validation. All provider traffic
   is mocked locally: no network, no credentials, no paid calls. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const releaseB=require('../src/rubik-seo-geo-release-b.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');
const releaseE=require('../src/rubik-seo-geo-release-e.js');
const materializer=require('../src/rubik-seo-geo-materialize.cjs');

const SRC=path.join(__dirname,'..','src');
const BS=String.fromCharCode(92);
const NON_RESTAURANT=['real-estate','professional-service','fitness-wellness','hospitality','retail','generic-local-business'];

function hostState(adapterId,{baseUrl='https://host.example.test/'}={}){
  const c={brand:{name:'Casa Norte'},hero:{body:'Servicio local verificable.'},business:{address:{city:'Alicante'}},media:{hero:{type:'image',url:'https://cdn.example.test/hero.webp'}},seo:core.defaults()};
  c.seo.adapterId=adapterId;c.seo.business.category='Categoría confirmada';c.seo.site.baseUrl=baseUrl;
  c.seo=core.reconcile(c);
  return c;
}
function fullPage(id,pagePath){
  return {id,path:pagePath,pageType:'generic',status:'published',indexable:true,title:'Página '+id,description:'Descripción única de '+id+'.',h1:'Página '+id,primaryQuery:'consulta '+id,content:'Contenido factual suficiente para '+id+'.',internalLinks:['/'],socialImageRef:'hero'};
}

// ── 1. Release C: intelligence.pages(config,{releaseB}) ────────────────────────

test('intelligence source no longer reads Release B from a global',()=>{
  const code=fs.readFileSync(path.join(SRC,'rubik-seo-geo-intelligence.js'),'utf8');
  assert.doesNotMatch(code,/RubikSEOGeoReleaseB/);
});

test('pages() uses the injected Release B and returns published, indexable, canonical pages',()=>{
  for(const adapterId of ['real-estate','restaurant']){
    const c=hostState(adapterId);
    releaseB.createPage(c,fullPage('servicios','/servicios/'));
    const out=intelligence.pages(c,{releaseB});
    assert.deepEqual(out.map(p=>p.path).sort(),['/','/servicios/'],adapterId);
    assert.ok(out.every(p=>p.status==='published'&&p.indexable&&p.canonical));
  }
});

test('pages() without the dependency is a deterministic, fresh empty list',()=>{
  const c=hostState('retail');
  const a=intelligence.pages(c),b=intelligence.pages(c,{}),d=intelligence.pages(c,{releaseB:null});
  assert.deepEqual([a,b,d],[[],[],[]]);
  a.push('mutated');
  assert.deepEqual(intelligence.pages(c),[],'no state shared between calls');
});

test('pages() ignores a Release B registered on globalThis (no global fallback)',()=>{
  const previous=globalThis.RubikSEOGeoReleaseB;
  globalThis.RubikSEOGeoReleaseB={registry:()=>[{id:'leak',status:'published',indexable:true,canonical:'https://leak.example/'}]};
  try{
    assert.deepEqual(intelligence.pages(hostState('hospitality')),[]);
    assert.deepEqual(intelligence.entityGraph(hostState('hospitality')).pages,[]);
  }finally{
    if(previous===undefined)delete globalThis.RubikSEOGeoReleaseB;else globalThis.RubikSEOGeoReleaseB=previous;
  }
});

test('pages() calls do not contaminate each other across injected environments',()=>{
  const envA={registry:()=>[{id:'a',status:'published',indexable:true,canonical:'https://a.example/'}]};
  const envB={registry:()=>[{id:'b',status:'published',indexable:true,canonical:'https://b.example/'},{id:'draft',status:'draft',indexable:false,canonical:''}]};
  const c=hostState('professional-service');
  assert.deepEqual(intelligence.pages(c,{releaseB:envA}).map(p=>p.id),['a']);
  assert.deepEqual(intelligence.pages(c,{releaseB:envB}).map(p=>p.id),['b']);
  assert.deepEqual(intelligence.pages(c).map(p=>p.id),[]);
  assert.deepEqual(intelligence.pages(c,{releaseB:envA}).map(p=>p.id),['a']);
});

test('pages() rejects an injected value without registry() as a wiring error',()=>{
  assert.throws(()=>intelligence.pages(hostState('retail'),{releaseB:{}}),TypeError);
});

test('entityGraph() forwards the injected Release B',()=>{
  const c=hostState('fitness-wellness');
  assert.deepEqual(intelligence.entityGraph(c,{releaseB}).pages.map(p=>p.path),['/']);
  assert.deepEqual(intelligence.entityGraph(c).pages,[]);
});

// ── 2. Release E: vertical derived from the active adapter ─────────────────────

test('release-e keeps zero module dependencies and no restaurant literal',()=>{
  const code=fs.readFileSync(path.join(SRC,'rubik-seo-geo-release-e.js'),'utf8');
  assert.doesNotMatch(code,/require\(/,'no circular dependency on core/adapters');
  assert.doesNotMatch(code,/'restaurant'/);
});

for(const adapterId of [...NON_RESTAURANT,'restaurant']){
  test(`release-e presence and citations derive vertical/entityType from the ${adapterId} adapter`,()=>{
    const adapter=core.adapter(hostState(adapterId));
    assert.equal(adapter.id,adapterId);
    let s=releaseE.defaults();
    s=releaseE.record(s,'presence',{provider:'Directorio sectorial',profileUrl:'https://dir.example.test/p',status:'DISCOVERED',provenance:{provider:'Directorio sectorial',sourceType:'DIRECTORY',sourceUrl:'https://dir.example.test/p',status:'MEASURED'}},{adapter});
    s=releaseE.record(s,'citation',{query:'consulta objetivo',provider:'AI Search',mentioned:false,cited:false},{adapter});
    const [presence]=s.presence.records,[citation]=s.citations.observations;
    for(const item of [presence,citation]){assert.equal(item.vertical,adapterId);assert.equal(item.entityType,adapter.schemaType);}
    assert.equal(presence.provenance.sourceType,'DIRECTORY');
    assert.equal(presence.provenance.status,'MEASURED');
    assert.equal(citation.status,'UNKNOWN','no mention or citation is invented');
    assert.equal(citation.cited,false);
    assert.equal(citation.provenance.status,'UNKNOWN');
  });
}

test('release-e without adapter context records UNKNOWN, never restaurant',()=>{
  const p=releaseE.normalizePresenceRecord({provider:'Perfil'});
  const c=releaseE.normalizeCitationObservation({query:'q'});
  for(const item of [p,c]){assert.equal(item.vertical,'UNKNOWN');assert.equal(item.entityType,'UNKNOWN');}
});

test('release-e keeps an explicit vertical and rejects one that contradicts the active adapter',()=>{
  assert.equal(releaseE.normalizePresenceRecord({vertical:'hospitality'}).vertical,'hospitality');
  const adapter=core.adapter(hostState('real-estate'));
  assert.equal(releaseE.normalizePresenceRecord({vertical:'real-estate'},{adapter}).vertical,'real-estate');
  assert.throws(()=>releaseE.normalizePresenceRecord({vertical:'restaurant'},{adapter}),/does not match active adapter/);
  assert.throws(()=>releaseE.record(releaseE.defaults(),'citation',{vertical:'retail'},{adapter}),/does not match active adapter/);
  assert.throws(()=>releaseE.normalizeCitationObservation({},{adapter:{id:'x'}}),TypeError);
});

// ── 3. OpenSEO connectivity through GET /api/health (D-09, D-14) ───────────────

function mockFetch(routes){
  const calls=[];
  const impl=async(url,opts={})=>{
    calls.push({url,method:opts.method,headers:opts.headers||{}});
    const route=routes[url];
    if(!route)return {ok:false,status:404,json:async()=>{throw new Error('not json');}};
    if(route instanceof Error)throw route;
    return {ok:route.status>=200&&route.status<300,status:route.status,json:async()=>{if(route.json===undefined)throw new SyntaxError('Unexpected token <');return route.json;}};
  };
  return {impl,calls};
}
const E='https://openseo.test';

test('OpenSEO healthy instance is NOT_CONNECTED (reachable, authorization not verified), never CONNECTED',async()=>{
  for(const json of [{status:'ok',checks:{dataforseo:{status:'ok'}}},{status:'ok'}]){
    const {impl,calls}=mockFetch({[E+'/api/health']:{status:200,json}});
    const r=await new intelligence.OpenSEOAdapter({endpoint:E,fetchImpl:impl}).connectivity();
    assert.equal(r.status,'NOT_CONNECTED');
    assert.equal(r.health,'ok');
    assert.equal(r.reachable,true);
    assert.equal(r.authorization,'NOT_VERIFIED');
    assert.deepEqual(calls.map(c=>[c.url,c.method]),[[E+'/api/health','GET']],'only the health endpoint is requested');
    assert.equal(calls[0].headers.authorization,undefined,'no credentials are sent');
  }
});

test('OpenSEO root answering 200 no longer counts: health 404 is ERROR',async()=>{
  const {impl,calls}=mockFetch({[E]:{status:200,json:{}},[E+'/']:{status:200,json:{}}});
  const r=await new intelligence.OpenSEOAdapter({endpoint:E,fetchImpl:impl}).connectivity();
  assert.equal(r.status,'ERROR');
  assert.equal(r.httpStatus,404);
  assert.ok(calls.every(c=>c.url.endsWith('/api/health')));
});

test('OpenSEO health "issues" is ERROR with failing check names only',async()=>{
  const {impl}=mockFetch({[E+'/api/health']:{status:200,json:{status:'issues',checks:{dataforseo:{status:'error',message:'SECRET-DETAIL'},database:{status:'ok'},googleOAuth:{status:'error'}}}}});
  const r=await new intelligence.OpenSEOAdapter({endpoint:E,fetchImpl:impl}).connectivity();
  assert.equal(r.status,'ERROR');
  assert.equal(r.health,'issues');
  assert.deepEqual(r.failingChecks,['dataforseo','googleOAuth']);
  assert.doesNotMatch(JSON.stringify(r),/SECRET-DETAIL/);
});

test('OpenSEO health non-JSON, unexpected payload, HTTP error and network error are ERROR',async()=>{
  const cases=[
    [{status:200},/did not return JSON/],
    [{status:200,json:{status:'maybe'}},/Unexpected OpenSEO health payload/],
    [{status:503,json:{status:'ok'}},/health check failed/],
    [new Error('offline'),/offline/]
  ];
  for(const [route,message] of cases){
    const {impl}=mockFetch({[E+'/api/health']:route});
    const r=await new intelligence.OpenSEOAdapter({endpoint:E,fetchImpl:impl}).connectivity();
    assert.equal(r.status,'ERROR');
    assert.match(r.error,message);
  }
});

test('OpenSEO health URL keeps an endpoint base path; invalid endpoints never reach the network',async()=>{
  const base='https://tools.example.test/openseo';
  const {impl,calls}=mockFetch({[base+'/api/health']:{status:200,json:{status:'ok'}}});
  assert.equal((await new intelligence.OpenSEOAdapter({endpoint:base+'/',fetchImpl:impl}).connectivity()).status,'NOT_CONNECTED');
  assert.deepEqual(calls.map(c=>c.url),[base+'/api/health']);
  const none=mockFetch({});
  assert.equal((await new intelligence.OpenSEOAdapter({fetchImpl:none.impl}).connectivity()).status,'NOT_CONFIGURED');
  assert.equal((await new intelligence.OpenSEOAdapter({endpoint:'https://u:p@openseo.test',fetchImpl:none.impl}).connectivity()).status,'ERROR');
  assert.equal(none.calls.length,0);
});

// ── 4. Page Registry path validation (D-15) ───────────────────────────────────

const UNSAFE=['/../x/','/a/../../x/','/./x/','/%2e%2e/x/','/%2E%2e/x/','/a%2fb/','/a%5cb/','/a'+BS+'b/','/C:/x/','/x\u0000/','/%E0%A4%A/'];
const SAFE=['/..foo/','/.../','/a..b/','/sobre-lúmina/','/carta/'];

test('createPage rejects unsafe paths without mutating the Project State',()=>{
  const c=hostState('real-estate');
  const before=JSON.stringify(c.seo.pages);
  for(const bad of UNSAFE)assert.throws(()=>releaseB.createPage(c,fullPage('x',bad)),/unsafe page path/,JSON.stringify(bad));
  assert.equal(JSON.stringify(c.seo.pages),before);
});

test('createPage keeps valid dot-leading and accented paths publishable (non-Restaurant adapter)',t=>{
  const c=hostState('professional-service');
  SAFE.forEach((p,i)=>releaseB.createPage(c,fullPage('p'+i,p)));
  for(const [i,p] of SAFE.entries()){
    const page=releaseB.page(c,'p'+i);
    assert.equal(page.path,p);
    assert.ok(!page.contract.blockers.includes('unsafe-path'),p);
    assert.equal(releaseB.canPublish(c,page),true,p+': '+page.contract.blockers.join(','));
  }
  const outputDir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-core3-'));
  t.after(()=>fs.rmSync(outputDir,{recursive:true,force:true}));
  const result=materializer.materializeSite({state:c,template:'<!doctype html><html lang="es"><head><title data-rubik-seo="title">x</title></head><body><main><h1>Casa Norte</h1></main></body></html>',outputDir,environment:'production',baseUrl:'https://host.example.test/'});
  for(const p of SAFE)assert.ok(result.manifest.routes.includes(p),p);
});

test('migratePath rejects an unsafe target and leaves path and redirects untouched',()=>{
  const c=hostState('retail');
  releaseB.createPage(c,fullPage('tienda','/tienda/'));
  for(const bad of ['/../tienda/','/a/%2e%2e/b/'])assert.throws(()=>releaseB.migratePath(c,'tienda',bad),/unsafe page path/);
  assert.equal(c.seo.pages.tienda.path,'/tienda/');
  assert.deepEqual(c.seo.redirects||[],[]);
  releaseB.migratePath(c,'tienda','/..tienda/','2026-09-25T00:00:00.000Z');
  assert.equal(c.seo.pages.tienda.path,'/..tienda/');
  assert.deepEqual(c.seo.redirects.map(r=>[r.from,r.to,r.status]),[['/tienda/','/..tienda/',308]]);
});

test('a stored unsafe path is a contract blocker reported by audit, not silently rewritten',()=>{
  const c=hostState('hospitality');
  c.seo.pages.evil=fullPage('evil','/a/../../evil/');
  const page=releaseB.page(c,'evil');
  assert.equal(page.path,'/a/../../evil/');
  assert.ok(page.contract.blockers.includes('unsafe-path'));
  assert.equal(releaseB.canPublish(c,page),false);
  const issue=releaseB.audit(c).find(x=>x.id==='page.evil.contract.unsafe-path');
  assert.equal(issue?.severity,'BLOCKER');
  assert.match(issue.message,/Ruta insegura/);
  assert.ok(!releaseB.sitemapEntries(c).some(u=>u.includes('evil')));
});

test('unsafePathReason matches the materializer guard for every case',()=>{
  const root=path.join(os.tmpdir(),'rubik-core3-root');
  for(const bad of UNSAFE){
    assert.ok(releaseB.unsafePathReason(bad),JSON.stringify(bad));
    assert.throws(()=>materializer.routeFile(root,bad),/Unsafe route path rejected/,JSON.stringify(bad));
  }
  for(const good of SAFE){
    assert.equal(releaseB.unsafePathReason(good),'',good);
    assert.doesNotThrow(()=>materializer.routeFile(root,good),good);
  }
});

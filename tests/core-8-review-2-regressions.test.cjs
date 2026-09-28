'use strict';
/* CORE-8, second review of PR #12 (D-23): GEO comparability propagated from compareGeo()
   to compareSnapshots(), closePeriod() and monthlyReport(); CORE-7 results bound to the
   operation a dimension or GEO observation needs. Each test fails against 4e64f48. */
const test=require('node:test');
const assert=require('node:assert/strict');

const offpage=require('../src/rubik-seo-geo-offpage.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const core=require('../src/rubik-seo-geo-core.js');

const clock=()=>new Date('2026-09-28T10:00:00Z');
const config={seo:{adapterId:'real-estate'},brand:{name:'Casa Norte'},business:{address:{street:'Gran Vía 1',city:'Bilbao'}}};
const P=offpage.profile({domain:'casanorte.example',markets:[{locale:'es-ES'}]},{core,config}).profile;
const AUG={id:'2026-08',start:'2026-08-01',end:'2026-08-31T23:59:59Z'},SEP={id:'2026-09',start:'2026-09-01',end:'2026-09-30T23:59:59Z'};
const QS=offpage.querySet({id:'qs',version:'1',queries:[{id:'es1',text:'inmobiliaria Bilbao',locale:'es-ES',market:'ES'},{id:'en1',text:'estate agent Bilbao',locale:'en-GB',market:'GB'}]});
const runs=(month,queryId,mentioned,extra={})=>Array.from({length:20},(_,i)=>{const r=offpage.geoRun({querySetId:'qs',querySetVersion:'1',queryId,engine:'e1',model:'m1',method:'mock',runAt:`2026-${month}-${String(i+1).padStart(2,'0')}`,answerText:mentioned?'Casa Norte':'Otra agencia',...extra},{querySet:QS,profile:P});assert.equal(r.ok,true,r.error);return r.run;});
const snap=(period,runList)=>offpage.snapshot({profile:P,period,geo:{summary:offpage.summarizeGeo(runList,{querySet:QS})}},{providers});
const report=cmp=>offpage.monthlyReport({profile:P,period:'2026-09',comparison:cmp,closure:offpage.closePeriod({period:'2026-09',at:'2026-10-01',comparison:cmp})});

// ── 1. GEO comparability propagated ─────────────────────────────────────────

test('a model, surface or method change makes the GEO dimension NOT_COMPARABLE up to the report',()=>{
  const prev=snap(AUG,runs('08','es1',false));
  for(const [extra,reason] of [[{model:'m2'},'MODEL_CHANGED'],[{surface:'consumer-ui'},'SURFACE_CHANGED'],[{method:'manual'},'METHOD_CHANGED']]){
    const cmp=offpage.compareSnapshots(prev,snap(SEP,runs('09','es1',true,extra)));
    const g=cmp.dimensions.geo;
    assert.deepEqual([g.comparable,g.comparability,g.reason,g.comparableGroups],[false,'NONE',reason,0],reason);
    assert.deepEqual(cmp.seriesBreaks,[{dimension:'geo',comparability:'NONE',reason}]);
    assert.equal(cmp.relevantChanges.includes('geo'),false,'no UP/DOWN across a break');
    assert.equal(cmp.noRelevantChanges,null,'a break is never "no relevant changes"');
    const r=report(cmp);
    assert.equal(r.report.evolution.aiVisibility.status,'NOT_COMPARABLE');
    assert.equal(r.report.evolution.aiVisibility.reason,reason);
    assert.equal(r.report.evolution.aiVisibility.groups[0].reason,reason);
    assert.notEqual(r.report.observedChanges.statement,'No hubo cambios relevantes en las dimensiones comparables.');
    assert.deepEqual(r.report.observedChanges.seriesBreaks,[{dimension:'geo',comparability:'NONE',reason}]);
    assert.ok(cmp.limits.some(l=>l.includes('geo: no comparable ('+reason+')')));
  }
});

test('with several groups, a partial break is PARTIALLY_COMPARABLE and keeps each group reason',()=>{
  const prev=snap(AUG,[...runs('08','es1',false),...runs('08','en1',false)]);
  const noise=offpage.compareSnapshots(prev,snap(SEP,[...runs('09','es1',false),...runs('09','en1',false,{model:'m2'})]));
  const g=noise.dimensions.geo;
  assert.deepEqual([g.comparable,g.comparability,g.reason,g.comparableGroups],[false,'PARTIAL','SOME_GROUPS_NOT_COMPARABLE',1]);
  assert.deepEqual(g.nonComparableGroups,[{engine:'e1',surface:'api',locale:'en-GB',market:'GB',reason:'MODEL_CHANGED'}]);
  assert.equal(noise.noRelevantChanges,null,'one broken group is enough to make "no changes" unknown');
  const r=report(noise);
  assert.equal(r.report.evolution.aiVisibility.status,'PARTIALLY_COMPARABLE');
  assert.deepEqual(r.report.evolution.aiVisibility.groups.map(x=>[x.locale,x.change,x.reason??null]),[['en-GB','NOT_COMPARABLE','MODEL_CHANGED'],['es-ES','WITHIN_NOISE',null]]);
  assert.ok(noise.limits.some(l=>l.includes('comparable solo en parte')));
  // A real change inside the comparable group is still reported.
  const up=offpage.compareSnapshots(prev,snap(SEP,[...runs('09','es1',true),...runs('09','en1',false,{model:'m2'})]));
  assert.deepEqual([up.dimensions.geo.comparability,up.relevantChanges,up.noRelevantChanges],['PARTIAL',['geo'],false]);
});

test('a fully comparable GEO dimension within noise still allows "no relevant changes"',()=>{
  const cmp=offpage.compareSnapshots(snap(AUG,runs('08','es1',false)),snap(SEP,runs('09','es1',false)));
  assert.deepEqual([cmp.dimensions.geo.comparable,cmp.dimensions.geo.comparability,cmp.seriesBreaks,cmp.noRelevantChanges],[true,'FULL',[],true]);
  assert.equal(report(cmp).report.evolution.aiVisibility.status,'COMPARABLE');
  assert.equal(offpage.closePeriod({period:'2026-09',at:'2026-10-01',comparison:cmp}).statement,'No hubo cambios relevantes en las dimensiones comparables.');
});

test('a provider change on another dimension is also a series break for "no relevant changes"',()=>{
  const bl=provider=>({status:'OK',provider,capturedAt:'2026-09-30',coverage:'COMPLETE_FOR_SOURCE',rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]});
  const a=offpage.snapshot({profile:P,period:AUG,backlinks:bl('p1'),geo:{summary:offpage.summarizeGeo(runs('08','es1',false),{querySet:QS})}},{providers});
  const b=offpage.snapshot({profile:P,period:SEP,backlinks:bl('p2'),geo:{summary:offpage.summarizeGeo(runs('09','es1',false),{querySet:QS})}},{providers});
  const cmp=offpage.compareSnapshots(a,b);
  assert.deepEqual(cmp.seriesBreaks,[{dimension:'backlinks',comparability:'NONE',reason:'PROVIDER_CHANGED'}]);
  assert.equal(cmp.noRelevantChanges,null);
});

// ── 2. CORE-7 results bound to the right operation ──────────────────────────

const live=(operation,rows)=>providers.runProviderRequest({provider:'dataforseo',operation,input:{target:'casanorte.example'},transport:{kind:'live',request:async()=>({rows})},clock,budget:{maxUnits:5,maxRequests:5},confirmCost:true});
const LINK=[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}];

test('measurement accepts a trusted CORE-7 result only for the dimension its operation serves',async()=>{
  const backlinks=await live('backlinks',LINK),serp=await live('serp',[{keyword:'x',url:'https://a.example/1',rank:1}]);
  assert.deepEqual(['verified','trust'].map(k=>offpage.measurement(backlinks,{providers,dimension:'backlinks'})[k]),[true,'CORE7_RESULT']);
  const wrong=offpage.measurement(serp,{providers,dimension:'backlinks'});
  assert.deepEqual([wrong.status,wrong.reason,wrong.trust,wrong.verified,wrong.rows],['NOT_MEASURED','OPERATION_MISMATCH','CORE7_RESULT_WRONG_OPERATION',false,[]]);
  const asMentions=offpage.measurement(backlinks,{providers,dimension:'mentions'});
  assert.deepEqual([asMentions.status,asMentions.reason],['NOT_MEASURED','OPERATION_MISMATCH'],'mentions have no CORE-7 operation yet');
  const s=offpage.snapshot({profile:P,period:SEP,backlinks:serp,mentions:backlinks},{providers});
  assert.deepEqual([s.dimensions.backlinks.status,s.dimensions.backlinks.reason,s.dimensions.backlinks.metrics.backlinks.value],['NOT_MEASURED','OPERATION_MISMATCH',null]);
  assert.equal(s.dimensions.mentions.metrics.mentions.value,null,'SERP or backlinks rows are never counted as mentions');
  assert.equal(offpage.measurement(backlinks,{providers}).verified,false,'no dimension: operation cannot be matched');
  const declared=offpage.measurement({status:'OK',provider:'manual',capturedAt:'2026-09-20',rows:[]},{providers,dimension:'mentions'});
  assert.deepEqual([declared.status,declared.trust,declared.verified],['OK','DECLARED',false],'declared/imported data is still accepted, unverified');
  assert.throws(()=>offpage.measurement(backlinks,{providers,dimension:'ranking'}),/unknown measurement dimension/);
  assert.deepEqual(offpage.DIMENSION_TARGETS.backlinks,['intelligence.backlinks']);
});

test('geoRun is never verified by an unrelated, copied or forged CORE-7 result; declared runs stay allowed and unverified',async()=>{
  const base={querySetId:'qs',querySetVersion:'1',queryId:'es1',engine:'e1',model:'m1',method:'api',runAt:'2026-09-10',answerText:'Casa Norte',citations:[]};
  const g=pr=>offpage.geoRun({...base,providerResult:pr},{querySet:QS,profile:P,providers}).run;
  const serp=await live('serp',[{queryId:'es1',engine:'e1',model:'m1',answerText:'Casa Norte',citations:[]}]);
  assert.deepEqual([g(serp).verified,g(serp).verification.reason,g(serp).trust],[false,'OPERATION_NOT_GEO_OBSERVATION','CORE7_RESULT_WRONG_OPERATION']);
  assert.equal(g(JSON.parse(JSON.stringify(serp))).verification.reason,'UNTRUSTED_RESULT');
  assert.equal(g({provider:'x',operation:'y',connection:'VERIFIED',provenance:{method:'api'},data:[]}).verification.reason,'UNTRUSTED_RESULT');
  const declared=offpage.geoRun(base,{querySet:QS,profile:P,providers}).run;
  assert.deepEqual([declared.verified,declared.verification],[false,{status:'DECLARED',reason:'NO_PROVIDER_RESULT'}]);
  assert.ok(offpage.summarizeGeo([declared],{querySet:QS}).groups[0].flags.includes('UNVERIFIED_OBSERVATIONS'));
  assert.deepEqual(offpage.GEO_OBSERVATION_OPERATIONS,[],'CORE-7 has no GEO observation operation: none is invented');
  assert.ok(Object.isFrozen(offpage.GEO_OBSERVATION_OPERATIONS));
});

test('bindsGeoObservation requires the provider row to be the source of the observed answer and citations',()=>{
  const row={queryId:'es1',engine:'e1',surface:'api',model:'m1',answerText:'Casa Norte y Rival',citations:[{url:'https://casanorte.example/p',position:1}]};
  assert.equal(offpage.bindsGeoObservation(row,{...row}),true);
  for(const change of [{answerText:'Otra respuesta'},{citations:[{url:'https://other.example/',position:1}]},{citations:[]},{model:'m2'},{engine:'e2'},{queryId:'en1'},{surface:'consumer-ui'}])
    assert.equal(offpage.bindsGeoObservation(row,{...row,...change}),false,JSON.stringify(change));
  assert.equal(offpage.bindsGeoObservation(null,row),false);
});

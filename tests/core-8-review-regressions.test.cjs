'use strict';
/* CORE-8 review (D-23, AUTONOMOUS-CONTINUATION stage 1): regressions for the six audit
   findings on PR #12. Each test fails against the audited HEAD 42d213d and passes with the
   correction. Deterministic: explicit dates, injected modules, mock transports only. */
const test=require('node:test');
const assert=require('node:assert/strict');

const offpage=require('../src/rubik-seo-geo-offpage.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const core=require('../src/rubik-seo-geo-core.js');

const clock=()=>new Date('2026-09-25T10:00:00Z');
const config={seo:{adapterId:'real-estate'},brand:{name:'Casa Norte'},business:{address:{street:'Gran Vía 1',city:'Bilbao'}}};
const P=offpage.profile({domain:'casanorte.example',markets:[{locale:'es-ES'}]},{core,config}).profile;
const SEP={id:'2026-09',start:'2026-09-01',end:'2026-09-30T23:59:59Z'};
const liveBacklinks=kind=>providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},
  transport:{kind,request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})},clock,budget:{maxUnits:5,maxRequests:5},confirmCost:true});

// ── 1. Trusted provenance ───────────────────────────────────────────────────

test('R1: a forged or copied envelope with method api and connection VERIFIED is never verified',async()=>{
  const forged={status:'OK',provider:'dataforseo',provenance:{method:'api',capturedAt:'2026-09-20'},connection:'VERIFIED',data:[]};
  const m=offpage.measurement(forged,{providers});
  assert.deepEqual([m.verified,m.trust,m.method],[false,'UNTRUSTED_ENVELOPE','import']);
  const real=await liveBacklinks('live');
  assert.equal(providers.isTrustedResult(real),true);
  assert.equal(offpage.measurement(real,{providers}).verified,true,'a real live CORE-7 result stays verified');
  assert.equal(offpage.measurement(real).verified,false,'without the injected providers boundary nothing is verified');
  const copy=JSON.parse(JSON.stringify(real));
  assert.equal(providers.isTrustedResult(copy),false);
  assert.equal(offpage.measurement(copy,{providers}).verified,false,'trust does not survive serialization');
  assert.equal(offpage.measurement({...real},{providers}).verified,false,'a spread copy is not the issued object');
  const mock=await liveBacklinks('mock');
  assert.equal(offpage.measurement(mock,{providers}).verified,false,'a trusted mock result is not live');
  const s=offpage.snapshot({profile:P,period:SEP,backlinks:{...forged,data:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]}},{providers});
  assert.equal(s.dimensions.backlinks.verified,false);
  assert.equal(s.dimensions.backlinks.trust,'UNTRUSTED_ENVELOPE');
});

test('R1: an externally cached copy of a verified result comes back NOT_VERIFIED',async()=>{
  const real=await liveBacklinks('live');
  const store=new Map();
  const cache={get:k=>store.get(k),set:(k,v)=>store.set(k,JSON.parse(JSON.stringify(v)))};
  const req={provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport:{kind:'live',request:async()=>({rows:[]})},clock,budget:{maxUnits:5,maxRequests:5},confirmCost:true,cache};
  store.set('dataforseo|backlinks|'+providers.stableKey({target:'casanorte.example'}),JSON.parse(JSON.stringify(real)));
  const hit=await providers.runProviderRequest(req);
  assert.equal(hit.cached,true);
  assert.equal(hit.connection,'NOT_VERIFIED');
  const inMemory=new Map(),memCache={get:k=>inMemory.get(k),set:(k,v)=>inMemory.set(k,v)};
  await providers.runProviderRequest({...req,cache:memCache,transport:{kind:'live',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})}});
  assert.equal((await providers.runProviderRequest({...req,cache:memCache})).connection,'VERIFIED','the issued object kept in memory stays trusted');
});

test('R1: geoRun is verified only with a trusted live CORE-7 result, never from declared fields',async()=>{
  const qs=offpage.querySet({id:'qs',version:'1',queries:[{id:'q1',text:'inmobiliaria Bilbao',locale:'es-ES',market:'ES'}]});
  const base={querySetId:'qs',querySetVersion:'1',queryId:'q1',engine:'e',method:'api',runAt:'2026-09-10',answerText:'Casa Norte'};
  const declared=offpage.geoRun({...base,connection:'VERIFIED'},{querySet:qs,profile:P,providers}).run;
  assert.deepEqual([declared.verified,declared.trust],[false,'DECLARED']);
  const fake={provenance:{method:'api'},connection:'VERIFIED'};
  assert.equal(offpage.geoRun({...base,providerResult:fake},{querySet:qs,profile:P,providers}).run.verified,false);
  const real=await liveBacklinks('live');
  assert.equal(offpage.geoRun({...base,providerResult:real},{querySet:qs,profile:P,providers}).run.verified,true);
  assert.equal(offpage.geoRun({...base,method:'manual',providerResult:real},{querySet:qs,profile:P,providers}).run.verified,false);
});

// ── 2. GEO coverage per exact locale + market ────────────────────────────────

const QS=offpage.querySet({id:'qs-multi',version:'1',queries:[
  {id:'q1',text:'inmobiliaria Bilbao',locale:'es-ES',market:'ES'},
  {id:'q2',text:'comprar piso Bilbao',locale:'es-ES',market:'ES'},
  {id:'q3',text:'estate agent Bilbao',locale:'en-GB',market:'GB'},
  {id:'q4',text:'inmobiliaria Bilbao desde México',locale:'es-ES',market:'MX'}
]});
const run=(queryId,i,extra={})=>{const r=offpage.geoRun({querySetId:'qs-multi',querySetVersion:'1',queryId,engine:'e',model:'m1',method:'mock',runAt:`2026-09-${String(i+1).padStart(2,'0')}`,answerText:'Casa Norte y otras',citations:[],...extra},{querySet:QS,profile:P});assert.equal(r.ok,true,r.error);return r.run;};

test('R2: coverage and repetitions are computed per exact locale+market; ERROR/NO_ANSWER are not usable answers',()=>{
  const runs=[run('q1',0),run('q1',1),run('q1',2),run('q2',0),run('q2',1),run('q2',2),
    run('q3',0),run('q3',1,{status:'ERROR'}),run('q3',2,{status:'ERROR'}),run('q3',3,{answerShown:false,answerText:''})];
  const s=offpage.summarizeGeo(runs,{querySet:QS});
  const es=s.groups.find(g=>g.locale==='es-ES'&&g.market==='ES'),en=s.groups.find(g=>g.locale==='en-GB');
  assert.deepEqual([es.queriesInGroup,es.queriesAnswered,es.queryCoverage,es.minUsableAnswersPerQuery],[2,2,1,3],'q3 (en-GB) and q4 (es-MX) are not part of the es-ES|ES group');
  assert.ok(!es.flags.includes('INCOMPLETE_QUERY_COVERAGE'));
  assert.ok(!es.flags.includes('FEW_RUNS_PER_QUERY'));
  assert.deepEqual([en.runs,en.validRuns,en.answered,en.minUsableAnswersPerQuery],[4,2,1,1]);
  assert.ok(en.flags.includes('FEW_RUNS_PER_QUERY'),'errors and no-answer runs do not inflate usable repetitions');
  assert.equal(s.groups.some(g=>g.market==='MX'),false,'no runs for es-MX: no group is invented');
  const mx=offpage.summarizeGeo([...runs,run('q4',0)],{querySet:QS}).groups.find(g=>g.market==='MX');
  assert.deepEqual([mx.queriesInGroup,mx.queryCoverage],[1,1]);
});

test('R2: a run declaring another locale or market than its query is rejected',()=>{
  const g=extra=>offpage.geoRun({querySetId:'qs-multi',querySetVersion:'1',queryId:'q1',engine:'e',method:'mock',runAt:'2026-09-10',answerText:'x',...extra},{querySet:QS,profile:P});
  assert.equal(g({locale:'en-GB'}).error,'LOCALE_MARKET_MISMATCH');
  assert.equal(g({market:'MX'}).error,'LOCALE_MARKET_MISMATCH');
  assert.equal(g({locale:'es-ES',market:'es'}).ok,true);
});

// ── 3. Model / surface / method changes break the series ─────────────────────

test('R3: model, surface or method changes are NOT_COMPARABLE, never UP/DOWN',()=>{
  const series=(mentioned,extra={},start=0)=>Array.from({length:20},(_,i)=>run(i%2?'q2':'q1',start+Math.floor(i/2),{answerText:mentioned?'Casa Norte':'Otra agencia',...extra}));
  const prev=offpage.summarizeGeo(series(false),{querySet:QS});
  const same=offpage.summarizeGeo(series(true,{},10),{querySet:QS});
  assert.equal(offpage.compareGeo(prev,same).groups[0].change,'UP','same model, surface and method: a real change is reported');
  const model=offpage.compareGeo(prev,offpage.summarizeGeo(series(true,{model:'m2'},10),{querySet:QS})).groups[0];
  assert.deepEqual([model.change,model.reason],['NOT_COMPARABLE','MODEL_CHANGED']);
  const surface=offpage.compareGeo(prev,offpage.summarizeGeo(series(true,{surface:'consumer-ui'},10),{querySet:QS})).groups[0];
  assert.deepEqual([surface.change,surface.reason,surface.surface],['NOT_COMPARABLE','SURFACE_CHANGED','consumer-ui']);
  const method=offpage.compareGeo(prev,offpage.summarizeGeo(series(true,{method:'manual'},10),{querySet:QS})).groups[0];
  assert.deepEqual([method.change,method.reason],['NOT_COMPARABLE','METHOD_CHANGED']);
  const mixed=offpage.summarizeGeo([...series(true,{},10),run('q1',25,{model:'m2'})],{querySet:QS});
  assert.ok(mixed.groups[0].flags.includes('MODEL_CHANGED_WITHIN_WINDOW'));
  assert.equal(offpage.compareGeo(prev,mixed).groups[0].reason,'MODEL_CHANGED_WITHIN_WINDOW');
  const api=offpage.summarizeGeo([...series(false),...series(true,{surface:'consumer-ui'},10)],{querySet:QS});
  assert.equal(api.groups.length,2,'API and consumer UI are never merged into one group');
  const snapA={id:'a',period:{id:'a',start:'2026-08-01',end:'2026-08-31'},dimensions:{geo:{status:'MEASURED',summary:prev}}};
  const snapB={id:'b',period:{id:'b',start:'2026-09-01',end:'2026-09-30'},dimensions:{geo:{status:'MEASURED',summary:offpage.summarizeGeo(series(true,{model:'m2'},10),{querySet:QS})}}};
  assert.equal(offpage.compareSnapshots(snapA,snapB).relevantChanges.includes('geo'),false);
});

// ── 4. Temporal evolution is not a contradiction ────────────────────────────

const AUG={id:'rd-aug',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:11,text:'11 dominios de referencia',period:'2026-08',capturedAt:'2026-08-31',provider:'dataforseo',method:'import'};
const SEPT={id:'rd-sep',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:14,text:'14 dominios de referencia',period:'2026-09',capturedAt:'2026-09-30',provider:'dataforseo',method:'import'};
const OTHER={id:'rd-other',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:9,text:'9 dominios de referencia',period:'2026-09',capturedAt:'2026-09-30',provider:'otro',method:'import'};

test('R4: values that evolve between periods or differ by provider are divergences, not conflicts',()=>{
  assert.deepEqual(offpage.findConflicts([AUG,SEPT]),[]);
  const c=offpage.compareEvidence([AUG,SEPT,OTHER]);
  assert.deepEqual(c.conflicts,[]);
  assert.deepEqual(c.divergences.map(d=>[d.evidenceIds,d.differs]),[[['rd-aug','rd-other','rd-sep'],['period','provider']]]);
  const r=offpage.validateAiOutput({items:[
    {kind:'FACT',claim:'14 dominios de referencia en septiembre',evidenceRefs:['rd-sep'],confidence:'medium',limits:'Muestra del proveedor'},
    {kind:'INFERENCE',claim:'Los dominios de referencia pasan de 11 a 14',evidenceRefs:['rd-aug','rd-sep'],confidence:'medium',limits:'Mismo proveedor y método'},
    {kind:'FACT',claim:'Hay 11 y 14 dominios de referencia',evidenceRefs:['rd-aug','rd-sep'],confidence:'high',limits:'x'}
  ]},{task:'detect-changes',evidence:[AUG,SEPT,OTHER]});
  assert.deepEqual(r.rejected.map(x=>x.code),['NON_COMPARABLE_EVIDENCE_FOR_FACT']);
  assert.equal(r.candidates.length,2,'a temporal trend is not blocked as contradictory');
  assert.ok(r.candidates[1].reviewFlags.includes('EVIDENCE_DIFFERS_BY_PERIOD'));
});

test('R4: differing values inside the same comparable context (or undated) are still conflicts',()=>{
  const dup={...SEPT,id:'rd-sep-2',value:12,text:'12 dominios de referencia'};
  assert.deepEqual(offpage.findConflicts([SEPT,dup]).map(c=>[c.context,c.evidenceIds]),[['2026-09|dataforseo|import',['rd-sep','rd-sep-2']]]);
  const u1={id:'u1',subject:'s',field:'f',value:1},u2={id:'u2',subject:'s',field:'f',value:2};
  assert.equal(offpage.findConflicts([u1,u2]).length,1,'undated values cannot be shown to be different measurements');
  const r=offpage.validateAiOutput({items:[{kind:'FACT',claim:'Dato 1',evidenceRefs:['u1'],confidence:'low',limits:'x'}]},{task:'summarize-evidence',evidence:[{id:'u1',text:'Dato 1'}]});
  assert.deepEqual(r.rejected.map(x=>x.code),['UNDATED_EVIDENCE_FOR_FACT']);
});

// ── 5. Full minimisation of every evidence field sent to the model ──────────

test('R5: e-mail, phone and secrets are removed from every evidence field before reaching the transport',async()=>{
  const sensitive=['ana@mail.example','ana%40mail.example','+34 600 111 222','600111222','sk_live_ABCDEFGH12345678','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefgh','Bearer QWERTYUIOPASDFGHJKLZXCVBNM123456','tok=supersecretvalue'];
  const evidence=[
    {id:'ana@mail.example',text:'id con correo'},
    {id:'ok-1',kind:'mention ana@mail.example',subject:'Cliente +34 600 111 222',field:'phone 600111222',provider:'sk_live_ABCDEFGH12345678',period:'2026-09 ana@mail.example',
      value:'Bearer QWERTYUIOPASDFGHJKLZXCVBNM123456',text:'Contacto ana@mail.example; token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefgh',url:'https://press.example/u/ana%40mail.example?tok=supersecretvalue',capturedAt:'2026-09-10'},
    {id:'ok-2',text:'Mención sin enlace',url:'https://press.example/n?session=abc#x',capturedAt:'2026-09-10'}
  ];
  let sent=null;
  const transport={kind:'mock',request:async(op,input)=>{sent=JSON.stringify(input);return {rows:[{output:{items:[{kind:'INFERENCE',claim:'Mención sin enlace',evidenceRefs:['ok-2'],confidence:'low',limits:'manual'}]}}]};}};
  const r=await offpage.runAiTask({task:'summarize-evidence',evidence,transport,clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true},{providers});
  assert.ok(sent,'the minimised request reached the mock');
  for(const s of sensitive)assert.equal(sent.includes(s),false,s);
  assert.doesNotMatch(sent,/ana@|ana%40|600 ?111|supersecret|QWERTY|ABCDEFGH/);
  assert.deepEqual(r.evidenceRejected,[{index:0,reason:'UNSAFE_OR_MISSING_ID'}]);
  const items=JSON.parse(sent).evidence;
  assert.deepEqual(items.map(e=>e.id),['ok-1','ok-2']);
  assert.equal(items[0].url,null,'a URL whose path carries personal data is dropped');
  assert.equal(items[1].url,'https://press.example/n','query and fragment removed');
  assert.equal(r.status,'STRUCTURALLY_VALID');
});

test('R5: a final guard refuses the whole request if personal data survives (a phone stored as a number)',async()=>{
  let called=false;
  const r=await offpage.runAiTask({task:'summarize-evidence',evidence:[{id:'n1',field:'contact',value:34600111222,capturedAt:'2026-09-10'}],
    transport:{kind:'mock',request:async()=>{called=true;return {rows:[]};}},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true},{providers});
  assert.equal(called,false,'nothing reaches the transport');
  assert.deepEqual([r.status,r.errors[0].code],['NOT_AVAILABLE','PERSONAL_DATA_IN_REQUEST']);
});

test('R5: evidenceItem minimises metadata fields individually',()=>{
  const e=offpage.evidenceItem({id:'m1',subject:'ana@mail.example',field:'x',provider:'Bearer abcdefghijklmnopqrstuvwxyz0123456789',kind:'k',period:'p'});
  assert.doesNotMatch(JSON.stringify(e),/ana@mail|abcdefghijklmnopqrstuvwxyz/);
  assert.equal(offpage.evidenceItem({id:'x y z'}),null,'ids must be plain identifiers');
  assert.equal(offpage.evidenceItem({id:'sk_live_ABCDEFGH12345678'}),null,'secret-like ids are dropped');
});

// ── 6. Structural validation is not semantic verification ───────────────────

test('R6: a claim citing real evidence that does not follow from it stays a pending, non-canonical candidate',()=>{
  const ev=[{id:'e1',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:14,text:'14 dominios de referencia en septiembre',capturedAt:'2026-09-30',provider:'dataforseo',method:'import'}];
  const r=offpage.validateAiOutput({items:[{kind:'FACT',claim:'La campaña de prensa aumentó las ventas un 14',evidenceRefs:['e1'],confidence:'high',limits:'importación'}]},{task:'summarize-evidence',evidence:ev});
  assert.notEqual(r.status,'VALID');
  assert.equal(r.status,'STRUCTURALLY_VALID');
  assert.equal(r.semanticVerification,'NOT_PERFORMED');
  assert.equal(r.accepted,undefined,'no "accepted" list that could read as verified facts');
  const c=r.candidates[0];
  assert.deepEqual([c.status,c.claimedKind,c.verification,c.semanticReview],['CANDIDATE','FACT','STRUCTURAL_ONLY','PENDING_HUMAN']);
  assert.ok(c.reviewFlags.includes('LOW_LEXICAL_OVERLAP'),'the reviewer is warned that the claim barely matches its evidence');
  assert.equal(r.canonical,false);assert.equal(r.requiresHumanReview,true);
  assert.match(r.note,/no demuestra/);
  const good=offpage.validateAiOutput({items:[{kind:'FACT',claim:'14 dominios de referencia en septiembre',evidenceRefs:['e1'],confidence:'medium',limits:'importación'}]},{task:'summarize-evidence',evidence:ev});
  assert.deepEqual(good.candidates[0].reviewFlags,[]);
  assert.equal(good.candidates[0].semanticReview,'PENDING_HUMAN','even a well-matched claim needs human review');
});

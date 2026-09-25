'use strict';
/* CORE-8 (D-23): off-page & authority service contracts. Deterministic: explicit dates,
   injected modules and mock transports only; no network, secrets, spend or persistence. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const offpage=require('../src/rubik-seo-geo-offpage.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const releaseE=require('../src/rubik-seo-geo-release-e.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');
const core=require('../src/rubik-seo-geo-core.js');

const clock=()=>new Date('2026-09-25T10:00:00Z');
const H={role:'human',id:'account-manager'};
const SYS={role:'system',id:'scheduler'};
const AI={role:'ai',id:'assistant'};

const realEstate={seo:{adapterId:'real-estate'},brand:{name:'Casa Norte'},business:{phone:'+34 944 000 111',address:{street:'Gran Vía 1',city:'Bilbao'}},services:[{id:'s1',name:'Compra asistida'}]};
const restaurant={seo:{business:{}},brand:{name:'Taberna Sol'},modules:{location:{address:{street:'Calle Mayor 5',city:'Madrid'}}},dishes:[]};
const professional={seo:{adapterId:'professional-service'},business:{name:'Lex Asesores'},services:[{id:'a',name:'Asesoría fiscal'}]};

function makeProfile(config=realEstate,extra={}){
  return offpage.profile({
    domain:'https://www.casanorte.example/',entity:{variants:['Casa Norte Inmobiliaria']},
    markets:[{locale:'es-ES',country:'es'},{locale:'en_GB',country:'gb'}],
    competitors:[{name:'Rival',domain:'rival.example',confirmedBy:'host',confirmedAt:'2026-09-01'},{name:'Maybe',domain:'maybe.example'}],
    sources:[{id:'bl',provider:'dataforseo',dimension:'backlinks',method:'api'},{id:'mn',provider:'manual',dimension:'mentions',method:'manual'}],
    ...extra
  },{core,config});
}
const P=makeProfile().profile;
const period=(id,start,end)=>({id,start,end});
const AUG=period('2026-08','2026-08-01','2026-08-31T23:59:59Z');
const SEP=period('2026-09','2026-09-01','2026-09-30T23:59:59Z');
const OCT=period('2026-10','2026-10-01','2026-10-31T23:59:59Z');
const bl=(rows,{status='OK',provider='dataforseo',capturedAt='2026-08-31T10:00:00Z',coverage='COMPLETE_FOR_SOURCE',method='import'}={})=>({status,provider,capturedAt,coverage,method,rows});
const link=(from,to='https://casanorte.example/',extra={})=>({url_from:from,url_to:to,anchor:'Casa Norte',dofollow:true,...extra});

// ── A. Profile and baseline ──────────────────────────────────────────────────

test('profile resolves entity from the active adapter, keeps unconfirmed competitors as candidates and never marks sources connected',()=>{
  const {profile:p,issues}=makeProfile();
  assert.equal(p.entity.name,'Casa Norte');
  assert.deepEqual(p.entity.variants,['Casa Norte','Casa Norte Inmobiliaria']);
  assert.equal(p.domain,'casanorte.example');
  assert.deepEqual(p.vertical,{id:'real-estate',schemaType:'RealEstateAgent'});
  assert.deepEqual(p.markets,[{locale:'es-ES',country:'ES'},{locale:'en-GB',country:'GB'}]);
  assert.deepEqual(p.competitors.map(c=>c.domain),['rival.example']);
  assert.deepEqual(p.candidateCompetitors.map(c=>c.domain),['maybe.example']);
  assert.ok(issues.includes('COMPETITORS_PENDING_HOST_CONFIRMATION'));
  assert.ok(p.sources.every(s=>s.connection==='NOT_VERIFIED'),'a declared source is never connected');
  assert.ok(Object.isFrozen(p));
});

test('profile works across verticals and reports missing data instead of inventing it',()=>{
  for(const [config,id] of [[restaurant,'restaurant'],[professional,'professional-service'],[realEstate,'real-estate']]){
    const {profile:p}=offpage.profile({domain:'x.example',markets:[{locale:'es'}]},{core,config});
    assert.equal(p.vertical.id,id);
    assert.ok(p.entity.name);
  }
  const empty=offpage.profile({});
  assert.deepEqual([...empty.issues].sort(),['DOMAIN_MISSING','ENTITY_NAME_MISSING','MARKET_MISSING']);
  assert.equal(empty.profile.vertical,null);
});

// ── B. Snapshots, missing and partial data ──────────────────────────────────

test('snapshot reuses normalizeBacklinks, counts only measured data and keeps nulls when a source did not measure',()=>{
  const s=offpage.snapshot({profile:P,period:AUG,
    backlinks:bl([link('https://news.example/a'),link('https://blog.example/b',undefined,{rel:'sponsored'}),{url_from:'nota-url',url_to:'x'}]),
    mentions:{status:'NOT_MEASURED',provider:'manual'},
    referrals:{status:'NOT_CONNECTED',provider:'ga4'}
  },{providers,releaseE});
  const b=s.dimensions.backlinks;
  assert.equal(b.rows.length,2);
  assert.deepEqual(b.rows[0],providers.normalizeBacklinks([link('https://news.example/a')],{measuredAt:'2026-08-31T10:00:00.000Z',provider:'dataforseo'}).rows[0],'same normaliser as CORE-7');
  assert.equal(b.rejectedRows,1);
  assert.equal(b.status,'PARTIAL','rejected rows make the measurement partial');
  assert.equal(b.metrics.backlinks.value,2);
  assert.equal(b.metrics.referringDomains.value,2);
  assert.equal(b.verified,false,'imported data is never verified');
  for(const d of ['mentions','referrals']){
    for(const m of Object.values(s.dimensions[d].metrics)){assert.equal(m.value,null,d);assert.equal(m.status,'NOT_MEASURED');assert.equal(m.evidenceRef,null);}
  }
  assert.ok(s.limits.some(l=>/no demuestra ausencia/.test(l)));
  assert.deepEqual(s.evidence.map(e=>e.id),['snap-'+P.id+'-2026-08:backlinks']);
});

test('snapshot accepts a CORE-7 envelope; only a live verified envelope is marked verified',async()=>{
  const transport=kind=>({kind,request:async()=>({rows:[link('https://news.example/a')]})});
  const run=kind=>providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport:transport(kind),clock,budget:{maxUnits:5,maxRequests:5},confirmCost:true});
  const mock=offpage.snapshot({profile:P,period:SEP,backlinks:await run('mock')},{providers});
  assert.equal(mock.dimensions.backlinks.verified,false);
  assert.equal(mock.dimensions.backlinks.method,'mock');
  const live=offpage.snapshot({profile:P,period:SEP,backlinks:await run('live')},{providers});
  assert.equal(live.dimensions.backlinks.verified,true);
  const refused=await providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{},transport:transport('live'),clock});
  const s=offpage.snapshot({profile:P,period:SEP,backlinks:refused},{providers});
  assert.equal(s.dimensions.backlinks.status,'COST_CONFIRMATION_REQUIRED');
  assert.equal(s.dimensions.backlinks.metrics.backlinks.value,null,'no zero for an unmeasured source');
  const manualApi=offpage.measurement({status:'OK',provider:'x',method:'api',capturedAt:'2026-09-01',rows:[]});
  assert.equal(manualApi.verified,false,'a declared "api" method without an envelope is not verified');
  assert.equal(manualApi.method,'manual');
});

test('mentions: linked/unlinked, minimised excerpt and deterministic entity match',()=>{
  const s=offpage.snapshot({profile:P,period:SEP,mentions:{status:'OK',provider:'manual',capturedAt:'2026-09-20',rows:[
    {sourceUrl:'https://press.example/n?utm=1&token=abc',observedAt:'2026-09-10',excerpt:'Casa Norte abre oficina; contacto ana@mail.example o +34 600 111 222',linkUrl:'https://www.casanorte.example/oficina'},
    {sourceUrl:'https://forum.example/t',observedAt:'2026-09-12',excerpt:'Recomiendo casa norte inmobiliaria',linked:false},
    {sourceUrl:'https://blog.example/p',observedAt:'2026-09-13',excerpt:'Otra agencia distinta'},
    {sourceUrl:'no-url',observedAt:'2026-09-13'},
    {sourceUrl:'https://x.example/',excerpt:'sin fecha'}
  ]}},{providers,releaseE});
  const m=s.dimensions.mentions;
  assert.equal(m.records.length,3);assert.equal(m.rejectedRows,2);assert.equal(m.status,'PARTIAL');
  const [a,b,c]=m.records;
  assert.equal(a.linked,true);assert.equal(a.sourceUrl,'https://press.example/n','query string dropped');
  assert.doesNotMatch(JSON.stringify(m),/ana@mail|600 111 222|token=abc/);
  assert.equal(a.entityMatch,'NAME_VARIANT');assert.equal(b.entityMatch,'NAME_VARIANT');assert.equal(c.entityMatch,'NOT_FOUND');
  assert.equal(b.linked,false);assert.equal(c.linked,null,'unknown link status is not assumed');
  assert.deepEqual([m.metrics.linked.value,m.metrics.unlinked.value,m.metrics.linkStatusUnknown.value],[1,1,1]);
  assert.equal(a.sentiment,'NOT_MEASURED','Release E record is reused');
});

test('local citation consistency compares against the adapter source and never copies the canonical phone',()=>{
  const r=offpage.citationConsistency([
    {provider:'maps',name:'Casa Norte',address:'Gran Via 1, 48001 Bilbao',phone:'944 000 111'},
    {provider:'dir',name:'Casa Norte SL',address:'Gran Vía 1 Bilbao',phone:'944000999'},
    {provider:'dir2',name:'Casa Norte'}
  ],{core,config:realEstate});
  assert.deepEqual(r.listings.map(l=>l.status),['CONSISTENT','INCONSISTENT','INCOMPLETE']);
  assert.doesNotMatch(JSON.stringify(r),/944/);
  const na=offpage.citationConsistency([{name:'Lex'}],{core,config:professional});
  assert.equal(na.status,'NOT_APPLICABLE','no local NAP in the source: not applicable, not a failure');
});

// ── Successive periods and comparisons ───────────────────────────────────────

test('successive periods: new links, provider-confirmed lost links and "not seen" links are kept apart',()=>{
  const aug=offpage.snapshot({profile:P,period:AUG,backlinks:bl([link('https://a.example/1'),link('https://b.example/2'),link('https://c.example/3')])},{providers});
  const sep=offpage.snapshot({profile:P,period:SEP,backlinks:bl([link('https://a.example/1'),link('https://b.example/2',undefined,{is_lost:true}),link('https://d.example/4')],{capturedAt:'2026-09-30T10:00:00Z'})},{providers});
  const c=offpage.compareSnapshots(aug,sep);
  const d=c.dimensions.backlinks;
  assert.equal(d.comparable,true);
  assert.deepEqual(d.newLinks.map(x=>x.sourceUrl),['https://d.example/4']);
  assert.deepEqual(d.lostLinks.map(x=>[x.sourceUrl,x.basis]),[['https://b.example/2','PROVIDER_LOST_FLAG']]);
  assert.deepEqual(d.notSeen.map(x=>x.sourceUrl),['https://c.example/3'],'absence is not declared as lost');
  assert.deepEqual(d.deltas.backlinks,{previous:3,current:2,delta:-1});
  assert.deepEqual(d.newReferringDomains,['d.example']);
  assert.equal(c.noRelevantChanges,false);
});

test('no relevant changes is stated only when data is comparable; otherwise it stays unknown',()=>{
  const rows=[link('https://a.example/1')];
  const aug=offpage.snapshot({profile:P,period:AUG,backlinks:bl(rows)},{providers});
  const sep=offpage.snapshot({profile:P,period:SEP,backlinks:bl(rows,{capturedAt:'2026-09-30'})},{providers});
  const same=offpage.compareSnapshots(aug,sep);
  assert.equal(same.noRelevantChanges,true);
  const closure=offpage.closePeriod({period:'2026-09',at:'2026-10-01',comparison:same,actions:[]});
  assert.equal(closure.statement,'No hubo cambios relevantes en las dimensiones comparables.');
  const other=offpage.snapshot({profile:P,period:SEP,backlinks:bl(rows,{provider:'otro'})},{providers});
  const changed=offpage.compareSnapshots(aug,other);
  assert.deepEqual(changed.dimensions.backlinks,{comparable:false,reason:'PROVIDER_CHANGED'});
  assert.equal(changed.noRelevantChanges,null,'provider change: not comparable, never "no changes"');
  const missing=offpage.compareSnapshots(aug,offpage.snapshot({profile:P,period:SEP,backlinks:{status:'ERROR',provider:'dataforseo'}},{providers}));
  assert.equal(missing.dimensions.backlinks.reason,'NOT_MEASURED_CURRENT');
  assert.equal(offpage.closePeriod({period:'2026-09',at:'2026-10-01',comparison:missing}).statement,'No hay datos comparables suficientes para afirmar si hubo cambios.');
  assert.equal(offpage.compareSnapshots(sep,aug).dimensions.backlinks.reason,'SAME_OR_EARLIER_PERIOD');
});

test('partial coverage is flagged in comparisons and limits',()=>{
  const aug=offpage.snapshot({profile:P,period:AUG,backlinks:bl([link('https://a.example/1')])},{providers});
  const sep=offpage.snapshot({profile:P,period:SEP,backlinks:bl([link('https://a.example/1')],{coverage:'PARTIAL',status:'PARTIAL'})},{providers});
  const c=offpage.compareSnapshots(aug,sep);
  assert.equal(c.dimensions.backlinks.partial,true);
  assert.ok(sep.limits.some(l=>/cobertura parcial/.test(l)));
});

// ── GEO off-page ────────────────────────────────────────────────────────────

const QS=offpage.querySet({id:'qs-bilbao',version:'1',controls:['Inmobiliaria Zafiro Imaginaria'],queries:[
  {id:'q1',text:'mejor inmobiliaria en Bilbao',locale:'es-ES',market:'es',intent:'commercial',origin:'search-console'},
  {id:'q2',text:'agencia para comprar piso Bilbao',locale:'es-ES',market:'es',intent:'commercial',origin:'people-also-ask'}
]});
function runs(pattern,{engine='engine-a',model='m1',month='09'}={}){
  const out=[];
  pattern.forEach((q,qi)=>q.forEach((mentioned,i)=>{
    const r=offpage.geoRun({querySetId:'qs-bilbao',querySetVersion:'1',queryId:'q'+(qi+1),engine,model,method:'mock',runAt:`2026-${month}-${String(i+1).padStart(2,'0')}T10:00:00Z`,runIndex:i,
      answerText:mentioned?'Opciones: Casa Norte y Rival.':'Opciones: Rival y otras.',citations:mentioned?[{url:'https://casanorte.example/p?x=1',position:2},{url:'https://rival.example/',position:1}]:[{url:'https://rival.example/',position:1}]},{querySet:QS,profile:P});
    assert.equal(r.ok,true);out.push(r.run);
  }));
  return out;
}

test('query sets are versioned and hashed; runs outside the set, without date or by scraping are rejected',()=>{
  assert.equal(QS.hash,offpage.querySet({id:'qs-bilbao',version:'1',controls:['Inmobiliaria Zafiro Imaginaria'],queries:QS.queries}).hash);
  assert.notEqual(QS.hash,offpage.querySet({id:'qs-bilbao',version:'2',queries:QS.queries}).hash);
  const base={querySetId:'qs-bilbao',querySetVersion:'1',queryId:'q1',engine:'e',method:'manual',runAt:'2026-09-10'};
  const g=x=>offpage.geoRun({...base,...x},{querySet:QS,profile:P});
  assert.equal(g({method:'scrape'}).error,'METHOD_NOT_ALLOWED');
  assert.equal(g({querySetVersion:'2'}).error,'QUERY_SET_VERSION_MISMATCH');
  assert.equal(g({queryId:'q9'}).error,'UNKNOWN_QUERY');
  assert.equal(g({runAt:''}).error,'MISSING_DATE');
  assert.equal(g({engine:''}).error,'MISSING_ENGINE');
  const noAnswer=g({answerShown:false}).run;
  assert.equal(noAnswer.outcome,'NO_ANSWER');
  const declared=g({mentioned:true}).run;
  assert.equal(declared.detection,'DECLARED');assert.equal(declared.verified,false,'manual observation is never verified');
  assert.equal(declared.cited,null,'citations not captured: unknown, not zero');
  assert.deepEqual(offpage.querySet({id:'x',version:'1',queries:[{id:'a',text:'t',locale:'es',origin:'llm-generated'},{id:'a',text:'t',locale:'es'}]}).issues,['DUPLICATE_QUERY_ID','ONLY_LLM_GENERATED_QUERIES']);
});

test('GEO summary reports distribution, range and variability with honest confidence',()=>{
  const s=offpage.summarizeGeo([...runs([[true,false,true],[false,false,false]]),
    offpage.geoRun({querySetId:'qs-bilbao',querySetVersion:'1',queryId:'q1',engine:'engine-a',method:'mock',runAt:'2026-09-15',answerShown:false},{querySet:QS,profile:P}).run,
    offpage.geoRun({querySetId:'qs-bilbao',querySetVersion:'1',queryId:'q2',engine:'engine-a',method:'mock',runAt:'2026-09-15',status:'ERROR'},{querySet:QS,profile:P}).run],{querySet:QS});
  assert.equal(s.status,'MEASURED');
  const g=s.groups[0];
  assert.deepEqual([g.runs,g.answered,g.noAnswer,g.errors],[8,6,1,1]);
  assert.equal(g.mentionRate.k,2);assert.equal(g.mentionRate.n,6,'no-answer and error runs are not counted as zeros');
  assert.ok(g.mentionRate.ci95.low<g.mentionRate.value&&g.mentionRate.value<g.mentionRate.ci95.high);
  assert.deepEqual(g.perQueryRange,{min:0,max:0.6667});
  assert.deepEqual(g.variability,{inconsistentQueries:1,of:2});
  assert.deepEqual(g.ownCitationPositions,{min:2,max:2,median:2});
  assert.equal(g.confidence,'low','fewer than 10 answered runs');
  assert.equal(g.topCitedDomains[0].domain,'rival.example');
  assert.ok(s.limits.some(l=>/no es tráfico/.test(l)));
  const empty=offpage.summarizeGeo([],{querySet:QS});
  assert.equal(empty.status,'NOT_MEASURED');assert.deepEqual(empty.groups,[]);
});

test('GEO variability: overlapping intervals are within noise; changes need non-overlapping intervals and the same query set',()=>{
  const prev=offpage.summarizeGeo(runs([[true,false,true,false],[false,true,false,false]]),{querySet:QS});
  // 3/8 -> 4/8: the rate moves but the 95% intervals overlap, so no change is claimed.
  const noisy=offpage.summarizeGeo(runs([[true,true,false,false],[true,true,false,false]],{month:'10'}),{querySet:QS});
  const g=offpage.compareGeo(prev,noisy).groups[0];
  assert.deepEqual([g.previous,g.current,g.change],[0.375,0.5,'WITHIN_NOISE']);
  const many=v=>Array.from({length:20},()=>v);
  const low=offpage.summarizeGeo(runs([many(false),many(false)]),{querySet:QS});
  const high=offpage.summarizeGeo(runs([many(true),many(true)],{month:'10'}),{querySet:QS});
  assert.equal(offpage.compareGeo(low,high).groups[0].change,'UP');
  const qs2=offpage.querySet({id:'qs-bilbao',version:'2',queries:QS.queries});
  const other=offpage.summarizeGeo([],{querySet:qs2});
  assert.equal(offpage.compareGeo(prev,other).comparable,false);
  const modelChange=offpage.summarizeGeo(runs([[true,false],[false,true]],{model:'m2',month:'10'}),{querySet:QS});
  assert.deepEqual([offpage.compareGeo(prev,modelChange).groups[0].change,offpage.compareGeo(prev,modelChange).groups[0].reason],['NOT_COMPARABLE','MODEL_CHANGED']);
});

test('GEO own citations use exact host match, control brands flag hallucinated mentions, excerpts are minimised',()=>{
  const r=offpage.geoRun({querySetId:'qs-bilbao',querySetVersion:'1',queryId:'q1',engine:'e',method:'mock',runAt:'2026-09-10',
    answerText:'Prueba Inmobiliaria Zafiro Imaginaria (tel. 600 123 456). casanorte.example.fake no es la web.',
    citations:[{url:'https://casanorte.example.fake/'},{url:'https://blog.casanorte.example/x',position:3},{url:'javascript:alert(1)'}]},{querySet:QS,profile:P}).run;
  assert.deepEqual(r.citations.map(c=>[c.domain,c.own]),[['casanorte.example.fake',false],['blog.casanorte.example',true]]);
  assert.equal(r.mentioned,false,'a domain-like substring is not a brand mention');
  assert.deepEqual(r.controlsMentioned,['Inmobiliaria Zafiro Imaginaria']);
  assert.doesNotMatch(r.answerExcerpt,/600 123 456/);
  const s=offpage.summarizeGeo([r],{querySet:QS});
  assert.ok(s.groups[0].flags.includes('HALLUCINATED_CONTROL_MENTIONS'));
});

test('AI crawler access reuses crawlerAudit/parseRobots with an explicit date and documented meanings only',()=>{
  const a=offpage.aiCrawlerAccess({robotsText:'User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /'},{intelligence,at:'2026-09-25T10:00:00Z'});
  assert.equal(a.crawlers['OAI-SearchBot'].allowed,false);
  assert.equal(a.crawlers.GPTBot.allowed,false);
  assert.equal(a.crawlers.PerplexityBot.allowed,true);
  assert.equal(a.crawlers['Google-Extended'].allowed,true);
  assert.ok(Object.values(a.crawlers).every(c=>c.checkedAt==='2026-09-25T10:00:00.000Z'));
  assert.equal(a.warnings.length,1);
  assert.match(a.crawlers.GPTBot.note,/entrenamiento/);
  assert.throws(()=>offpage.aiCrawlerAccess({},{intelligence}),/explicit date/);
});

test('referral traffic stays a separate dimension from GEO observations',()=>{
  const s=offpage.snapshot({profile:P,period:SEP,referrals:{status:'OK',provider:'ga4',capturedAt:'2026-09-30',rows:[{source:'chatgpt.com',sessions:12},{source:'perplexity.ai',sessions:3},{source:'google',sessions:900},{source:'bing',sessions:''}]}},{providers});
  assert.equal(s.dimensions.referrals.metrics.aiReferralSessions.value,15);
  assert.equal(s.dimensions.referrals.metrics.chatgptSessions.value,12);
  assert.equal(s.dimensions.referrals.rows.length,3,'rows without a numeric value are dropped, not zeroed');
  assert.equal(s.dimensions.geo,undefined);
});

// ── C. Opportunities ────────────────────────────────────────────────────────

test('opportunities: transparent heuristic, non-link actions, prohibited tactics and quotas refused',()=>{
  const ids=['snap-x:mentions'];
  const o=offpage.opportunity({id:'o1',type:'unlinked-mention',goal:'Pedir enlace en la mención de prensa',evidenceRefs:['snap-x:mentions'],relevance:'high',effort:'low',risk:'low',confidence:'medium',observedAt:'2026-09-10'},{evidenceIds:ids}).opportunity;
  assert.equal(o.score,3*3+2*2-1-2);
  assert.equal(o.scoreLabel,'HEURISTIC');
  assert.match(o.priorityReason,/no es una señal de Google/);
  assert.deepEqual(o.weights,offpage.DEFAULT_WEIGHTS);
  const nonLink=offpage.opportunity({id:'o2',type:'crawler-access',evidenceRefs:['snap-x:mentions'],relevance:'medium',effort:'low',risk:'low',confidence:'high'},{evidenceIds:ids}).opportunity;
  assert.equal(nonLink.nonLink,true);
  for(const type of ['link-purchase','link-exchange','private-blog-network','automated-links','mass-submission','fake-review','review-incentive','artificial-mention'])
    assert.equal(offpage.opportunity({id:'x',type}).error.code,'PROHIBITED_TACTIC',type);
  assert.equal(offpage.opportunity({id:'x',type:'digital-pr',paid:true}).error.code,'PAID_LINK_WITHOUT_QUALIFICATION');
  assert.equal(offpage.opportunity({id:'x',type:'digital-pr',paid:true,linkRel:'sponsored'}).ok,true);
  assert.equal(offpage.opportunity({id:'x',type:'digital-pr',linkQuota:10}).error.code,'QUOTAS_NOT_ALLOWED');
  assert.equal(offpage.opportunity({id:'x',type:'digital-pr',contactQuota:50}).error.code,'QUOTAS_NOT_ALLOWED');
});

test('opportunities without resolvable evidence are kept as NEEDS_EVIDENCE with low confidence; ordering is deterministic',()=>{
  const weak=offpage.opportunity({id:'b',type:'digital-pr',evidenceRefs:['made-up'],relevance:'high',effort:'low',risk:'low',confidence:'high'},{evidenceIds:['snap-x:backlinks']}).opportunity;
  assert.deepEqual([weak.state,weak.evidenceStatus,weak.confidence],['NEEDS_EVIDENCE','INSUFFICIENT','low']);
  assert.deepEqual(weak.unknownEvidenceRefs,['made-up']);
  const unscored=offpage.opportunity({id:'c',type:'community'}).opportunity;
  assert.equal(unscored.score,null);
  const strong=offpage.opportunity({id:'a',type:'digital-pr',evidenceRefs:['snap-x:backlinks'],relevance:'high',effort:'low',risk:'low',confidence:'high'},{evidenceIds:['snap-x:backlinks']}).opportunity;
  const p=offpage.prioritize([unscored,weak,strong]);
  assert.deepEqual(p.items.map(x=>x.id),['a','b','c']);
  assert.match(p.note,/Sin cuotas/);
});

// ── D. Actions, human approval and carry-over ───────────────────────────────

function newAction(extra={}){return offpage.action({id:'act-1',kind:'send-email',goal:'Solicitar enlace en la mención',opportunityId:'o1',campaignId:'camp-1',period:'2026-09',createdAt:'2026-09-02',origin:'ai-suggestion',...extra}).action;}
const step=(a,to,opts)=>{const r=offpage.transition(a,to,opts);assert.equal(r.ok,true,JSON.stringify(r.error));return r.action;};

test('external actions need explicit human approval; AI can only propose and never transitions',()=>{
  let a=newAction();
  assert.equal(a.external,true);assert.equal(a.state,'PROPOSED');assert.equal(a.history[0].actor.role,'ai');
  assert.equal(offpage.transition(a,'REVIEWED',{at:'2026-09-03',actor:AI}).error.code,'AI_CANNOT_TRANSITION');
  assert.equal(offpage.transition(a,'REVIEWED',{at:'2026-09-03',actor:SYS}).error.code,'HUMAN_REQUIRED');
  assert.equal(offpage.transition(a,'IN_PROGRESS',{at:'2026-09-03',actor:H}).error.code,'TRANSITION_NOT_ALLOWED');
  a=step(a,'REVIEWED',{at:'2026-09-03',actor:H});
  assert.equal(offpage.transition(a,'APPROVED',{at:'2026-09-04',actor:SYS,approval:{scope:'x'}}).error.code,'HUMAN_REQUIRED');
  assert.equal(offpage.transition(a,'APPROVED',{at:'2026-09-04',actor:H}).error.code,'APPROVAL_SCOPE_REQUIRED');
  a=step(a,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'Un correo a la redacción con el borrador d-1'}});
  assert.equal(a.approval.by,'account-manager');
  const tampered={...a,approval:null};
  assert.equal(offpage.transition(tampered,'IN_PROGRESS',{at:'2026-09-05',actor:SYS}).error.code,'HUMAN_APPROVAL_REQUIRED');
  a=step(a,'IN_PROGRESS',{at:'2026-09-05',actor:SYS});
  a=step(a,'AWAITING_RESPONSE',{at:'2026-09-06',actor:SYS});
  assert.equal(offpage.transition(a,'EXECUTED',{at:'2026-09-20',actor:SYS}).error.code,'EXECUTION_EVIDENCE_REQUIRED');
  a=step(a,'EXECUTED',{at:'2026-09-20',actor:SYS,evidence:{url:'https://press.example/n',at:'2026-09-19'}});
  a=step(a,'VERIFICATION_PENDING',{at:'2026-09-21',actor:SYS});
  assert.equal(offpage.transition(a,'COMPLETED',{at:'2026-09-22',actor:SYS,evidence:{}}).error.code,'HUMAN_REQUIRED');
  assert.equal(offpage.transition(a,'COMPLETED',{at:'2026-09-22',actor:H,evidence:{method:'manual-check'}}).error.code,'VERIFIED_RESULT_REQUIRED');
  a=step(a,'COMPLETED',{at:'2026-09-22',actor:H,evidence:{verifiedAt:'2026-09-22',method:'manual-check',result:'Enlace presente',rel:'follow',url:'https://press.example/n'}});
  assert.equal(a.state,'COMPLETED');
  assert.deepEqual(a.history.map(h=>h.to),['PROPOSED','REVIEWED','APPROVED','IN_PROGRESS','AWAITING_RESPONSE','EXECUTED','VERIFICATION_PENDING','COMPLETED']);
  assert.ok(Object.isFrozen(a));
});

test('decisions are reversible and auditable: revoking approval and reopening require a reason and keep history',()=>{
  let a=newAction();
  a=step(a,'REVIEWED',{at:'2026-09-03',actor:H});
  a=step(a,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'correo'}});
  assert.equal(offpage.transition(a,'REVIEWED',{at:'2026-09-05',actor:H}).error.code,'REASON_REQUIRED');
  a=step(a,'REVIEWED',{at:'2026-09-05',actor:H,reason:'El cliente pide revisar el tono'});
  assert.equal(a.approval,null,'approval revoked');
  a=step(a,'REJECTED',{at:'2026-09-06',actor:H,reason:'Fuera de foco este mes'});
  a=step(a,'PROPOSED',{at:'2026-10-02',actor:H,reason:'Se reabre en octubre'});
  assert.equal(a.history.length,6);
  assert.equal(offpage.transition(a,'REVIEWED',{at:'2026-09-01',actor:H}).error.code,'DATE_BEFORE_LAST_TRANSITION');
});

test('prohibited, mass and unqualified paid actions are refused at creation',()=>{
  assert.equal(offpage.action({id:'x',kind:'fake-review',goal:'g',createdAt:'2026-09-01'}).error.code,'PROHIBITED_TACTIC');
  assert.equal(offpage.action({id:'x',kind:'send-email',goal:'g',createdAt:'2026-09-01',recipients:200}).error.code,'MASS_ACTION_NOT_ALLOWED');
  assert.equal(offpage.action({id:'x',kind:'send-email',goal:'g',createdAt:'2026-09-01',bulk:true}).error.code,'MASS_ACTION_NOT_ALLOWED');
  assert.equal(offpage.action({id:'x',kind:'paid-placement',goal:'g',createdAt:'2026-09-01'}).error.code,'PAID_LINK_WITHOUT_QUALIFICATION');
  assert.equal(offpage.action({id:'x',kind:'paid-placement',goal:'g',createdAt:'2026-09-01',linkRel:'sponsored'}).ok,true);
  assert.equal(offpage.action({id:'x',kind:'teleport',goal:'g',createdAt:'2026-09-01'}).error.code,'UNKNOWN_KIND');
  assert.equal(offpage.action({id:'x',kind:'analysis',goal:'g'}).error.code,'MISSING_DATE');
  const internal=offpage.action({id:'y',kind:'monitoring',goal:'Seguir menciones',createdAt:'2026-09-01'}).action;
  assert.equal(internal.external,false);
});

test('campaign spans periods; carry-over requires reason and next step; pending human decisions are surfaced',()=>{
  const camp=offpage.campaign({id:'camp-1',goal:'Recursos citables sobre compra en Bilbao',startPeriod:'2026-08'}).campaign;
  let done=newAction({id:'a-done'});
  done=step(done,'REVIEWED',{at:'2026-09-03',actor:H});done=step(done,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'correo'}});
  done=step(done,'IN_PROGRESS',{at:'2026-09-05',actor:SYS});done=step(done,'EXECUTED',{at:'2026-09-10',actor:SYS,evidence:{ref:'draft-sent-log-1',at:'2026-09-10'}});
  let waiting=newAction({id:'a-wait'});
  waiting=step(waiting,'REVIEWED',{at:'2026-09-03',actor:H});waiting=step(waiting,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'correo'}});
  waiting=step(waiting,'IN_PROGRESS',{at:'2026-09-05',actor:SYS});waiting=step(waiting,'AWAITING_RESPONSE',{at:'2026-09-06',actor:SYS});
  const proposed=newAction({id:'a-prop'});
  const extra=offpage.action({id:'a-extra',kind:'analysis',goal:'Revisar menciones',createdAt:'2026-09-02',period:'2026-09',campaignId:'camp-1'}).action;
  const acts=[done,waiting,proposed,extra];
  const closure=offpage.closePeriod({period:'2026-09',at:'2026-10-01',plannedActionIds:['a-done','a-wait','a-prop','ghost'],actions:acts,
    carry:{'a-wait':{reason:'Sin respuesta de la redacción',nextStep:'Un único recordatorio aprobado',blocker:'Esperando a la redacción'}},
    learnings:[{statement:'Las menciones en prensa local generan respuesta',kind:'OBSERVATION'},{statement:'El enlace subió la visibilidad en IA',kind:'OBSERVATION',evidenceRefs:['e1'],causal:true},{statement:'Nota con evidencia',kind:'OBSERVATION',evidenceRefs:['e2'],confidence:'medium'}]});
  assert.deepEqual([closure.plannedVsDone.planned,closure.plannedVsDone.done,closure.plannedVsDone.notDone],[4,1,3]);
  assert.equal(closure.plannedVsDone.rows.find(r=>r.actionId==='ghost').state,'UNKNOWN_ACTION');
  // EXECUTED stays open (verification pending) and is carried over like any open action.
  assert.deepEqual(closure.carryOver.map(c=>c.actionId).sort(),['a-done','a-extra','a-prop','a-wait']);
  const wait=closure.carryOver.find(c=>c.actionId==='a-wait');
  assert.equal(wait.reason,'Sin respuesta de la redacción');assert.equal(wait.nextStep,'Un único recordatorio aprobado');
  assert.ok(closure.issues.some(i=>i.code==='CARRY_OVER_REASON_MISSING'&&i.actionId==='a-prop'));
  assert.equal(closure.carryOver.find(c=>c.actionId==='a-prop').awaitingHumanDecision,true);
  assert.deepEqual(closure.blocked.map(b=>b.actionId),['a-wait']);
  assert.deepEqual(closure.learnings.map(l=>l.kind),['HYPOTHESIS','HYPOTHESIS','OBSERVATION']);
  assert.ok(closure.issues.some(i=>i.code==='OBSERVATION_WITHOUT_EVIDENCE'));
  assert.ok(closure.issues.some(i=>i.code==='CAUSALITY_NOT_ESTABLISHED'));
  const prog=offpage.campaignProgress(camp,acts);
  assert.equal(prog.actions,4);assert.equal(prog.byState.EXECUTED,1);
  assert.equal(prog.chain.find(c=>c.actionId==='a-done').executionEvidence,'draft-sent-log-1');
  assert.equal(offpage.campaign({id:'c'}).ok,false);
});

// ── E. Report ───────────────────────────────────────────────────────────────

test('monthly report: executed actions with evidence, no attribution without evidence, no promises',()=>{
  const aug=offpage.snapshot({profile:P,period:AUG,backlinks:bl([link('https://a.example/1')])},{providers});
  const sep=offpage.snapshot({profile:P,period:SEP,backlinks:bl([link('https://a.example/1'),link('https://n.example/2')],{capturedAt:'2026-09-30'})},{providers});
  const cmp=offpage.compareSnapshots(aug,sep);
  let a=newAction();
  a=step(a,'REVIEWED',{at:'2026-09-03',actor:H});a=step(a,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'correo'}});
  a=step(a,'IN_PROGRESS',{at:'2026-09-05',actor:SYS});a=step(a,'EXECUTED',{at:'2026-09-10',actor:SYS,evidence:{url:'https://n.example/2',at:'2026-09-10'}});
  const closure=offpage.closePeriod({period:'2026-09',at:'2026-10-01',actions:[a],comparison:cmp});
  const {report,issues}=offpage.monthlyReport({profile:P,period:'2026-09',comparison:cmp,closure,actions:[a,newAction({id:'p2'})],
    businessOutcome:{summary:'Más contactos'},nextFocus:{focus:'Recurso citable',reason:'Menciones sin enlace detectadas',evidenceRefs:[sep.evidence[0].id]},evidenceIds:sep.evidence.map(e=>e.id)});
  assert.deepEqual(issues,[]);
  assert.deepEqual(report.observedChanges.newLinks.map(l=>l.sourceUrl),['https://n.example/2']);
  assert.equal(report.executedActions[0].evidence,'https://n.example/2');
  assert.equal(report.executedActions[0].verified,false);
  assert.equal(report.proposedActions[0].needsHumanDecision,true);
  assert.equal(report.businessResult.status,'NOT_ATTRIBUTABLE');
  assert.equal(report.evolution.mentions.status,'NOT_MEASURED');
  assert.match(report.disclaimer,/no promete/);
  const bad=offpage.validateReport({...report,nextFocus:{focus:'Garantizamos el primer puesto en Google',reason:null,evidenceRefs:['nope']},executedActions:[{actionId:'z',evidence:null}],businessResult:{summary:'x',attribution:{method:'m',evidenceRefs:[]}}},{evidenceIds:[]});
  assert.deepEqual(bad.map(i=>i.code).sort(),['BUSINESS_RESULT_NOT_ATTRIBUTED','EXECUTED_WITHOUT_EVIDENCE','NEXT_FOCUS_WITHOUT_REASON','PROMISE_NOT_ALLOWED','UNKNOWN_EVIDENCE_REF']);
});

test('report with no comparable data does not claim "no changes"',()=>{
  const {report}=offpage.monthlyReport({period:'2026-10'});
  assert.equal(report.observedChanges.noRelevantChanges,null);
  assert.equal(report.evolution.backlinks.status,'NOT_MEASURED');
});

// ── AI assistance ───────────────────────────────────────────────────────────

const EVIDENCE=[
  {id:'e1',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:14,text:'14 dominios de referencia en septiembre',capturedAt:'2026-09-30',provider:'dataforseo',method:'import'},
  {id:'e2',kind:'mention',text:'Mención sin enlace en https://press.example/n',url:'https://press.example/n',capturedAt:'2026-09-10'},
  {id:'e3',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:11,text:'11 dominios según otra fuente',capturedAt:'2026-09-30',provider:'otro'}
];

test('AI output validation: facts need known evidence; invented numbers, URLs, promises and personal data are rejected',()=>{
  const out={items:[
    {kind:'INFERENCE',claim:'La mención de https://press.example/n no enlaza; conviene pedir el enlace',evidenceRefs:['e2'],confidence:'medium',limits:'Una sola fuente manual'},
    {kind:'HYPOTHESIS',claim:'Un recurso citable podría atraer menciones',evidenceRefs:[],confidence:'high',limits:'Sin evidencia todavía'},
    {kind:'FACT',claim:'Hay 30 dominios de referencia',evidenceRefs:['e2'],confidence:'high',limits:'x'},
    {kind:'FACT',claim:'Hay un enlace en https://invented.example/p',evidenceRefs:['e2'],confidence:'high',limits:'x'},
    {kind:'FACT',claim:'Sin fuente',evidenceRefs:[],confidence:'high',limits:'x'},
    {kind:'FACT',claim:'Dato',evidenceRefs:['e9'],confidence:'high',limits:'x'},
    {kind:'INFERENCE',claim:'Garantizamos el primer puesto en ChatGPT',evidenceRefs:['e2'],confidence:'high',limits:'x'},
    {kind:'INFERENCE',claim:'Escribir a ana@mail.example',evidenceRefs:['e2'],confidence:'low',limits:'x'},
    {kind:'FACT',claim:'Sin confianza',evidenceRefs:['e2'],limits:'x'},
    {kind:'FACT',claim:'Sin límites',evidenceRefs:['e2'],confidence:'low'},
    {kind:'OPINION',claim:'x',confidence:'low',limits:'x'},
    'texto suelto'
  ]};
  const r=offpage.validateAiOutput(out,{task:'detect-opportunities',evidence:EVIDENCE});
  assert.equal(r.status,'PARTIAL');
  assert.equal(r.canonical,false);assert.equal(r.requiresHumanReview,true);
  assert.equal(r.candidates.length,2);
  assert.equal(r.candidates[1].evidenceStatus,'INSUFFICIENT');assert.equal(r.candidates[1].confidence,'low','hypothesis without evidence is capped');
  assert.deepEqual(r.rejected.map(x=>x.code),['UNSUPPORTED_NUMBER','UNSUPPORTED_URL','UNSUPPORTED_CLAIM','UNKNOWN_EVIDENCE_REF','PROMISE_NOT_ALLOWED','PERSONAL_DATA_OR_SECRET','MISSING_CONFIDENCE','MISSING_LIMITS','INVALID_KIND','NOT_AN_OBJECT']);
  assert.doesNotMatch(JSON.stringify(r.candidates),/\b30\b|invented\.example/,'no invented number or link survives');
});

// Same subject, field, capture day, provider and method as e1, different value: a real contradiction.
const E5={id:'e5',kind:'backlinks',subject:'casanorte.example',field:'referringDomains',value:12,text:'12 dominios de referencia',capturedAt:'2026-09-30',provider:'dataforseo',method:'import'};

test('AI output: supported numbers pass; contradictory evidence cannot be stated as fact',()=>{
  const ok=offpage.validateAiOutput({items:[{kind:'FACT',claim:'14 dominios de referencia según la importación',evidenceRefs:['e1'],confidence:'medium',limits:'Muestra del proveedor'}]},{task:'summarize-evidence',evidence:[EVIDENCE[0]]});
  assert.equal(ok.status,'STRUCTURALLY_VALID');
  const conflicts=offpage.findConflicts([...EVIDENCE,E5]);
  assert.deepEqual(conflicts,[{group:'casanorte.example|referringDomains',context:'2026-09-30|dataforseo|import',evidenceIds:['e1','e5']}]);
  const r=offpage.validateAiOutput({items:[
    {kind:'FACT',claim:'14 dominios de referencia',evidenceRefs:['e1'],confidence:'high',limits:'x'},
    {kind:'INFERENCE',claim:'La misma fuente da 14 y 12 dominios',evidenceRefs:['e1','e5'],confidence:'low',limits:'Dos lecturas del mismo proveedor'}
  ]},{task:'detect-changes',evidence:[...EVIDENCE,E5]});
  assert.deepEqual(r.rejected.map(x=>x.code),['CONTRADICTORY_EVIDENCE']);
  assert.equal(r.candidates[0].claimedKind,'INFERENCE');
});

test('AI output tolerates malformed, unstructured and empty responses',()=>{
  const v=o=>offpage.validateAiOutput(o,{task:'summarize-evidence',evidence:EVIDENCE});
  assert.equal(v('Aquí tienes un resumen en prosa sin estructura').status,'INVALID_OUTPUT');
  assert.equal(v('{"items": [').status,'INVALID_OUTPUT');
  assert.equal(v(null).status,'INVALID_OUTPUT');
  assert.equal(v([1,2]).status,'INVALID_OUTPUT');
  assert.equal(v({summary:'x'}).error,'ITEMS_ARRAY_REQUIRED');
  assert.equal(v({items:[]}).status,'EMPTY');
  assert.equal(v({items:[{kind:'FACT',claim:'Dato',evidenceRefs:[],confidence:'high',limits:'x'}]}).status,'REJECTED');
  const fenced=v('```json\n{"items":[{"kind":"FACT","claim":"Mención sin enlace","evidenceRefs":["e2"],"confidence":"low","limits":"manual"}]}\n```');
  assert.equal(fenced.status,'STRUCTURALLY_VALID');
  assert.throws(()=>offpage.validateAiOutput({items:[]},{task:'send-emails'}),/Unknown AI task/);
});

test('AI drafts are never sendable and always need human approval',()=>{
  const r=offpage.validateAiOutput({items:[
    {kind:'DRAFT',claim:'Hola, vimos la mención en https://press.example/n; ¿podríais enlazarla?',evidenceRefs:['e2'],confidence:'medium',limits:'Borrador'},
    {kind:'FACT',claim:'x',evidenceRefs:['e2'],confidence:'low',limits:'x'},
    {kind:'DRAFT',claim:'Os aseguramos el primer puesto en Google',evidenceRefs:[],confidence:'low',limits:'x'}
  ]},{task:'draft-outreach',evidence:EVIDENCE});
  assert.deepEqual(r.rejected.map(x=>x.code),['INVALID_KIND','PROMISE_NOT_ALLOWED']);
  assert.equal(r.candidates[0].requiresHumanApproval,true);assert.equal(r.candidates[0].sendable,false);
});

test('runAiTask reuses CORE-7 budget, cost confirmation, secret refusal and provenance; mocks are never verified',async()=>{
  const reply=output=>({kind:'mock',request:async(op,input)=>{assert.equal(op,'offpageAnalysis');assert.equal(input.task,'summarize-evidence');assert.doesNotMatch(JSON.stringify(input),/ana@mail|600 111 222/);return {rows:[{output}]};}});
  // e3 is left out: it comes from another provider, so a FACT citing e1 and e3 together would not be comparable.
  const ev=[EVIDENCE[0],EVIDENCE[1],{id:'e4',text:'Contacto ana@mail.example tel +34 600 111 222'}];
  const base={task:'summarize-evidence',evidence:ev,clock,budget:{maxUnits:2,maxRequests:2}};
  const noConfirm=await offpage.runAiTask({...base,transport:reply({items:[]})},{providers});
  assert.equal(noConfirm.providerStatus,'COST_CONFIRMATION_REQUIRED');assert.equal(noConfirm.status,'NOT_AVAILABLE');
  const noBudget=await offpage.runAiTask({...base,budget:undefined,confirmCost:true,transport:reply({items:[]})},{providers});
  assert.equal(noBudget.providerStatus,'BUDGET_REQUIRED');
  const noTransport=await offpage.runAiTask({...base,confirmCost:true},{providers});
  assert.equal(noTransport.providerStatus,'NOT_CONNECTED');
  const r=await offpage.runAiTask({...base,confirmCost:true,transport:reply({items:[{kind:'FACT',claim:'14 dominios de referencia',evidenceRefs:['e1'],confidence:'medium',limits:'importación'}]})},{providers});
  assert.equal(r.status,'STRUCTURALLY_VALID');assert.equal(r.provenance.method,'mock');assert.equal(r.budget.requests,1);
  const secret=await offpage.runAiTask({...base,confirmCost:true,evidence:[{id:'s',text:'x',value:'Bearer abcdefghijklmnopqrstuvwxyz123456'}],transport:reply({items:[]})},{providers});
  assert.ok(['NOT_AVAILABLE','EMPTY'].includes(secret.status));
  const broken=await offpage.runAiTask({...base,confirmCost:true,transport:{kind:'mock',request:async()=>{throw new Error('model timeout token=abc123');}}},{providers});
  assert.equal(broken.providerStatus,'ERROR');assert.doesNotMatch(JSON.stringify(broken),/abc123/);
  const prose=await offpage.runAiTask({...base,confirmCost:true,transport:reply('texto libre')},{providers});
  assert.equal(prose.status,'INVALID_OUTPUT');
  assert.equal(providers.toReleaseC({...r,release:'O',status:'OK',data:[]},{intelligence}).rows.length,0,'release O never maps into Release C');
});

// ── Module hygiene ──────────────────────────────────────────────────────────

test('module has no network, clock, storage or restaurant coupling',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-offpage.js'),'utf8');
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|require\(|Date\.now|new Date\(\)/);
  assert.doesNotMatch(src,/restaurant|dishes/i);
  assert.ok(Object.isFrozen(offpage));
  for(const k of ['profile','snapshot','compareSnapshots','querySet','geoRun','summarizeGeo','compareGeo','aiCrawlerAccess','opportunity','prioritize','action','transition','campaign','campaignProgress','closePeriod','monthlyReport','validateReport','validateAiOutput','runAiTask'])assert.equal(typeof offpage[k],'function',k);
  assert.deepEqual(Object.values(offpage.ACTION_STATE_LABELS),['propuesta','revisada','aprobada','en curso','esperando respuesta','publicada/ejecutada','verificación pendiente','completada','rechazada','cancelada']);
});

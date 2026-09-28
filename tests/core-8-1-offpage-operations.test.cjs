'use strict';
/* CORE-8.1 (D-24, OFFPAGE-SERVICE §6.3): continuous off-page operations. Deterministic:
   explicit dates, injected modules, mocks only; nothing is published, sent or stored. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ops=require('../src/rubik-seo-geo-offpage-ops.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const core=require('../src/rubik-seo-geo-core.js');

const AT='2026-09-25T10:00:00Z';
const H={role:'human',id:'account-manager'};
const VERTICALS={
  restaurant:{config:{seo:{business:{}},brand:{name:'Taberna Sol'},modules:{location:{address:{street:'Calle Mayor 5',city:'Madrid'}}},dishes:[{id:'d1',name:'Cocido madrileño'}]},domain:'tabernasol.example'},
  'real-estate':{config:{seo:{adapterId:'real-estate'},brand:{name:'Casa Norte'},business:{address:{street:'Gran Vía 1',city:'Bilbao'}},services:[{id:'s1',name:'Compra asistida'}]},domain:'casanorte.example'},
  'professional-service':{config:{seo:{adapterId:'professional-service'},business:{name:'Lex Asesores',address:{city:'Valencia'}},services:[{id:'a1',name:'Asesoría fiscal'}]},domain:'lexasesores.example'}
};
/* Facts are built from the active adapter's source (vertical-neutral) plus host-approved data. */
function bookFor(vertical,extra=[]){
  const {config}=VERTICALS[vertical],src=core.source(config),adapter=core.adapter(config);
  assert.equal(adapter.id,vertical);
  const offering=src.offerings[0];
  return ops.factBook([
    {id:'f-name',category:'company',statement:`${src.name} ofrece ${offering.name} en ${src.city}`,source:'Project State del host',approvedBy:'cliente',approvedAt:'2026-09-01'},
    {id:'f-years',category:'company',statement:'Fundada hace 12 años',subject:src.name,field:'years',value:12,source:'Registro mercantil aportado por el cliente',approvedBy:'cliente',approvedAt:'2026-09-01'},
    {id:'f-faq',category:'faq',statement:`Pregunta frecuente: ¿cómo funciona ${offering.name}? Se explica en una primera reunión.`,source:'FAQ aprobada',approvedBy:'cliente',approvedAt:'2026-09-02'},
    ...extra
  ],{offpage,at:AT});
}

// ── 1. Approved information ─────────────────────────────────────────────────

test('facts are usable only when approved, sourced, current and not in conflict',()=>{
  const book=ops.factBook([
    {id:'ok',category:'data',statement:'120 operaciones cerradas en 2025',subject:'casanorte',field:'deals-2025',value:120,period:'2025',source:'CRM exportado',methodology:'Recuento de escrituras',approvedBy:'cliente',approvedAt:'2026-09-01'},
    {id:'pending',category:'data',statement:'Tasa de éxito del 90',source:'Estimación interna'},
    {id:'future',category:'faq',statement:'x',source:'y',approvedBy:'c',approvedAt:'2026-12-01'},
    {id:'expired',category:'policy',statement:'Promoción de verano',source:'Web',approvedBy:'c',approvedAt:'2026-06-01',validUntil:'2026-08-31'},
    {id:'c1',category:'data',statement:'118 operaciones cerradas en 2025',subject:'casanorte',field:'deals-2025',value:118,period:'2025',source:'Otro informe',approvedBy:'cliente',approvedAt:'2026-09-01'},
    {id:'nosource',category:'faq',statement:'x'},
    {id:'bad id!',category:'faq',statement:'x',source:'y'},
    {id:'cat',category:'rumour',statement:'x',source:'y'},
    {id:'pii',category:'experience',statement:'Llamar a Ana al 600 111 222 o ana@mail.example',source:'Entrevista',approvedBy:'c',approvedAt:'2026-09-01'}
  ],{offpage,at:AT});
  const st=Object.fromEntries(book.facts.map(f=>[f.id,f.status]));
  assert.deepEqual(st,{ok:'CONFLICT',pending:'PENDING_APPROVAL',future:'PENDING_APPROVAL',expired:'EXPIRED',c1:'CONFLICT',pii:'APPROVED'});
  assert.deepEqual(book.rejected.map(r=>r.code),['MISSING_SOURCE','INVALID_ID','UNKNOWN_CATEGORY']);
  assert.deepEqual(book.usable,['pii']);
  assert.doesNotMatch(JSON.stringify(book),/600 111 222|ana@mail/);
  assert.throws(()=>ops.approvedFact({},{offpage}),/explicit date/);
  assert.throws(()=>ops.factBook([],{at:AT}),/offpage module must be injected/);
});

// ── 2. Continuity between periods ───────────────────────────────────────────

function act(id,extra={}){return offpage.action({id,kind:'send-email',goal:'Pedir enlace en mención',createdAt:'2026-08-02',period:'2026-08',campaignId:'camp',...extra}).action;}
const step=(a,to,o)=>{const r=offpage.transition(a,to,o);assert.equal(r.ok,true,JSON.stringify(r.error));return r.action;};

test('the ledger carries campaigns and open actions across periods, keeps history append-only and never forces new actions',()=>{
  const camp=offpage.campaign({id:'camp',goal:'Recursos citables',startPeriod:'2026-08'}).campaign;
  let a=act('a1');a=step(a,'REVIEWED',{at:'2026-08-03',actor:H});a=step(a,'APPROVED',{at:'2026-08-04',actor:H,approval:{scope:'un correo'}});
  a=step(a,'IN_PROGRESS',{at:'2026-08-05',actor:{role:'system'}});a=step(a,'AWAITING_RESPONSE',{at:'2026-08-06',actor:{role:'system'}});
  const b=act('a2');
  const aug=offpage.closePeriod({period:'2026-08',at:'2026-09-01',plannedActionIds:['a1','a2'],actions:[a,b],
    carry:{a1:{reason:'Sin respuesta',nextStep:'Un recordatorio aprobado'}},learnings:[{statement:'La prensa local responde más rápido',kind:'HYPOTHESIS',toMeasure:'Tiempo de respuesta por tipo de medio'}]});
  const l1=ops.periodLedger(null,{closure:aug,campaigns:[camp],actions:[a,b]},{offpage});
  assert.equal(l1.history.length,1);
  assert.equal(l1.newActionsRequired,false);
  const types=l1.agenda.map(x=>x.type);
  assert.deepEqual(types,['follow-up','follow-up','measure','campaign-continues']);
  assert.equal(l1.agenda.find(x=>x.actionId==='a2').needsDefinition,true,'an open action without reason/next step is flagged');
  assert.ok(l1.issues.some(i=>i.code==='CARRY_OVER_REASON_MISSING'));
  // September: nothing new, only follow-up; the campaign continues and history grows.
  const sep=offpage.closePeriod({period:'2026-09',at:'2026-10-01',plannedActionIds:['a1'],actions:[a,b],carry:{a1:{reason:'Sigue sin respuesta',nextStep:'Cerrar si no responde'},a2:{reason:'Pendiente de revisión',nextStep:'Revisión humana'}}});
  const l2=ops.periodLedger(l1,{closure:sep,campaigns:[camp],actions:[a,b]},{offpage});
  assert.deepEqual(l2.history.map(h=>h.period),['2026-08','2026-09']);
  assert.equal(l1.history.length,1,'the previous ledger is not mutated');
  assert.equal(l2.history[0].carryOver[0].reason,'Sin respuesta','history keeps what was recorded then');
  assert.equal(ops.periodLedger(l2,{closure:sep},{offpage}).error.code,'PERIOD_ALREADY_CLOSED');
  assert.equal(ops.periodLedger(l2,{closure:{...aug,period:'2026-07'}},{offpage}).error.code,'PERIOD_OUT_OF_ORDER');
  assert.throws(()=>ops.periodLedger(null,{},{offpage}),/closure/);
});

// ── 3. Repeated GEO measurements ────────────────────────────────────────────

const P=offpage.profile({domain:'casanorte.example',markets:[{locale:'es-ES'}]},{core,config:VERTICALS['real-estate'].config}).profile;
const QS=offpage.querySet({id:'qs',version:'1',queries:[{id:'q1',text:'inmobiliaria Bilbao',locale:'es-ES',market:'ES'},{id:'q2',text:'estate agent Bilbao',locale:'en-GB',market:'GB'}]});

test('the GEO plan enumerates runs per target without executing anything and refuses scraping',()=>{
  const r=ops.geoMeasurementPlan(QS,{targets:[{engine:'e1',surface:'api',model:'m1',method:'mock'},{engine:'e2',surface:'consumer-ui',method:'manual'}],runsPerQuery:3});
  assert.equal(r.plan.executes,false);
  assert.deepEqual(r.plan.totals,{runs:12,queries:2,targets:2});
  assert.deepEqual(r.plan.warnings,['MODEL_NOT_DECLARED']);
  assert.ok(r.plan.rows.every(x=>x.locale&&x.market&&!('runAt' in x)));
  assert.equal(ops.geoMeasurementPlan(QS,{targets:[{engine:'e',method:'scrape'}]}).error.code,'METHOD_NOT_ALLOWED');
  assert.equal(ops.geoMeasurementPlan(QS,{targets:[]}).error.code,'NO_TARGETS');
  assert.deepEqual(ops.geoMeasurementPlan(QS,{targets:[{engine:'e',method:'mock',model:'m'}],runsPerQuery:1}).plan.warnings,['FEW_RUNS_PER_QUERY']);
});

test('the GEO series compares consecutive periods and does not chain trends across breaks',()=>{
  const runs=(month,mentioned,model='m1')=>Array.from({length:20},(_,i)=>offpage.geoRun({querySetId:'qs',querySetVersion:'1',queryId:'q1',engine:'e1',model,method:'mock',runAt:`2026-${month}-${String(i+1).padStart(2,'0')}`,answerText:mentioned?'Casa Norte':'Otra'},{querySet:QS,profile:P}).run);
  const s=m=>offpage.summarizeGeo(m,{querySet:QS});
  const series=ops.geoSeries([{period:'2026-09',summary:s(runs('09',true))},{period:'2026-07',summary:s(runs('07',false))},{period:'2026-08',summary:s(runs('08',false,'m2'))}],{offpage});
  assert.deepEqual(series.periods,['2026-07','2026-08','2026-09']);
  const pts=series.series[0].points;
  assert.deepEqual(pts.map(p=>[p.period,p.change,p.reason]),[['2026-07','BASELINE',null],['2026-08','NOT_COMPARABLE','MODEL_CHANGED'],['2026-09','NOT_COMPARABLE','MODEL_CHANGED']]);
  assert.deepEqual(series.series[0].comparableSegments,[['2026-07'],['2026-08'],['2026-09']]);
});

// ── 4. Articles, guides and channel adaptations (three verticals) ───────────

test('drafts in three verticals cite only approved facts; unknowns are declared and nothing is publishable',()=>{
  for(const vertical of Object.keys(VERTICALS)){
    const book=bookFor(vertical,[{id:'f-pending',category:'data',statement:'Satisfacción del 98',source:'Encuesta sin aprobar'}]);
    const brief=ops.contentBrief({id:'b-'+vertical,kind:'article',topic:'Guía de servicio',factIds:['f-name','f-years','f-faq','f-pending','f-missing']},{book,offpage}).brief;
    assert.deepEqual(brief.factIds,['f-name','f-years','f-faq'],vertical);
    assert.deepEqual(brief.unusable.map(u=>u.status),['PENDING_APPROVAL','UNKNOWN_FACT']);
    const src=core.source(VERTICALS[vertical].config);
    const d=ops.validateDraft({id:'d-'+vertical,blocks:[
      {kind:'HEADING',text:`Cómo trabaja ${src.name}`},
      {kind:'FACT',text:`${src.name} ofrece ${src.offerings[0].name} en ${src.city}`,factRefs:['f-name']},
      {kind:'FACT',text:'Fundada hace 12 años',factRefs:['f-years']},
      {kind:'FACT',text:'Satisfacción del 98',factRefs:['f-pending']},
      {kind:'FACT',text:'Más de 500 clientes',factRefs:['f-years']},
      {kind:'INFERENCE',text:'La experiencia acumulada puede dar confianza',factRefs:['f-years']},
      {kind:'HYPOTHESIS',text:'Una guía paso a paso podría resolver dudas frecuentes'},
      {text:'Somos los mejores de la ciudad'},
      {kind:'CTA',text:'Garantizamos el primer puesto en Google'},
      {kind:'FACT',text:'Somos referencia en el sector'}
    ]},{brief,book,offpage});
    assert.deepEqual(d.blocks.map(b=>b.status),['CANDIDATE','CANDIDATE','CANDIDATE','REJECTED','REJECTED','CANDIDATE','CANDIDATE','UNKNOWN','REJECTED','REJECTED'],vertical);
    assert.deepEqual(d.blocks[9].codes,['UNSUPPORTED_CLAIM'],'a FACT block without references is refused');
    assert.ok(d.blocks[3].codes.includes('FACT_NOT_USABLE:PENDING_APPROVAL'));
    assert.ok(d.blocks[4].codes.includes('UNSUPPORTED_NUMBER'),'500 is not in the approved fact');
    assert.ok(d.blocks[8].codes.includes('PROMISE_NOT_ALLOWED'));
    assert.equal(d.blocks[5].label,'INFERENCIA');assert.equal(d.blocks[6].label,'HIPÓTESIS');
    assert.deepEqual([d.status,d.publishable,d.sendable,d.requiresHumanApproval,d.semanticReview],['DRAFT_WITH_ISSUES',false,false,true,'PENDING_HUMAN']);
    assert.deepEqual(d.usedFactIds,['f-name','f-years']);
  }
});

test('a channel adaptation may only reuse facts from its parent draft',()=>{
  const book=bookFor('real-estate');
  const brief=ops.contentBrief({id:'b1',kind:'article',factIds:['f-name','f-years','f-faq']},{book,offpage}).brief;
  const parent=ops.validateDraft({id:'d1',blocks:[{kind:'FACT',text:'Fundada hace 12 años',factRefs:['f-years']}]},{brief,book,offpage});
  assert.equal(parent.status,'DRAFT_READY_FOR_REVIEW');
  const ab=ops.contentBrief({id:'b2',kind:'channel-adaptation',channel:'newsletter',parentDraftId:'d1',factIds:['f-years','f-faq']},{book,offpage}).brief;
  const ok=ops.validateDraft({id:'d2',blocks:[{kind:'FACT',text:'12 años de experiencia: fundada hace 12 años',factRefs:['f-years']}]},{brief:ab,book,parent,offpage});
  assert.equal(ok.status,'DRAFT_READY_FOR_REVIEW');
  const bad=ops.validateDraft({id:'d3',blocks:[{kind:'FACT',text:'Pregunta frecuente resuelta en una primera reunión',factRefs:['f-faq']}]},{brief:ab,book,parent,offpage});
  assert.deepEqual(bad.blocks[0].codes,['NEW_FACT_IN_ADAPTATION'],'f-faq is in the adaptation brief but the parent never used it');
  assert.equal(bad.status,'DRAFT_WITH_ISSUES');
  assert.equal(ops.validateDraft({blocks:[]},{brief:ab,book,parent:{...parent,draftId:'other'},offpage}).error.code,'PARENT_DRAFT_MISMATCH');
  assert.equal(ops.contentBrief({id:'b3',kind:'channel-adaptation',channel:'social'},{book,offpage}).error.code,'PARENT_DRAFT_REQUIRED');
  const none=ops.contentBrief({id:'b4',kind:'guide',factIds:['nope']},{book,offpage}).brief;
  assert.deepEqual([none.status,none.reason],['BLOCKED','NO_USABLE_FACTS']);
});

// ── 5. Studies, cases and infographics ──────────────────────────────────────

test('studies and case studies require real, approved, permitted data; causal claims stay hypotheses',()=>{
  const data=(id,extra={})=>({id,category:'data',statement:`Dato ${id}`,subject:'s',field:id,value:1,period:'2025',methodology:'Recuento anual',source:'CRM',permissions:{publish:true},approvedBy:'c',approvedAt:'2026-09-01',...extra});
  const book=ops.factBook([data('d1'),data('d2'),data('d3'),data('d4',{methodology:null}),data('d5',{permissions:{publish:false}}),
    {id:'case',category:'case-result',statement:'Venta en 30 días',period:'2025-Q4',methodology:'Fecha de firma',source:'Expediente',permissions:{publish:true,attribution:false},approvedBy:'c',approvedAt:'2026-09-01'},
    data('d6',{approvedBy:null})],{offpage,at:AT});
  const ready=ops.studyProposal({id:'s1',kind:'study',factIds:['d1','d2','d3'],claims:[{text:'Las operaciones aumentaron gracias a la nueva web'},{text:'Tres periodos medidos',kind:'FACT'}]},{book,offpage});
  assert.equal(ready.status,'READY_FOR_DRAFT');
  assert.deepEqual(ready.claims.map(c=>[c.kind,c.flags]),[['HYPOTHESIS',['CAUSALITY_NOT_ESTABLISHED']],['FACT',[]]]);
  assert.equal(ready.publishable,false);
  const few=ops.studyProposal({id:'s2',kind:'study',factIds:['d1','d4','d5','d6','ghost']},{book,offpage});
  assert.equal(few.status,'BLOCKED');
  for(const r of ['FACT_INCOMPLETE:d4:methodology','PUBLISH_PERMISSION_MISSING:d5','FACT_NOT_USABLE:d6:PENDING_APPROVAL','UNKNOWN_FACT:ghost'])assert.ok(few.reasons.includes(r),r);
  const cs=ops.studyProposal({id:'s3',kind:'case-study',factIds:['case']},{book,offpage});
  assert.deepEqual([cs.status,cs.reasons],['BLOCKED',['ATTRIBUTION_PERMISSION_MISSING:case']]);
  assert.ok(ops.studyProposal({id:'s4',kind:'infographic',factIds:[]},{book,offpage}).reasons.includes('NO_DATA'));
  assert.deepEqual(ops.studyProposal({id:'s5',kind:'study',factIds:['d1','d2']},{book,offpage}).reasons,['INSUFFICIENT_DATA_POINTS']);
  assert.equal(ops.studyProposal({id:'s6',kind:'infographic',factIds:['d1','d2']},{book,offpage}).status,'READY_FOR_DRAFT','an infographic may use fewer data points');
});

// ── 6. PR, journalists and individual outreach ──────────────────────────────

test('outreach is individual, sourced and personalised; the external action is only a proposal needing approval',()=>{
  const book=bookFor('real-estate');
  const base={id:'o1',recipient:{outlet:'Diario Local',url:'https://diario.example/',contactPath:{type:'published-editorial-address',sourceUrl:'https://diario.example/contacto',address:'redaccion@diario.example'}},
    personalization:{reason:'Publicaron una guía de barrios de Bilbao',evidenceUrl:'https://diario.example/guia-barrios'},
    blocks:[{kind:'FACT',text:'Casa Norte ofrece Compra asistida en Bilbao',factRefs:['f-name']}],goal:'Proponer un dato para la guía'};
  const r=ops.outreachDraft(base,{book,offpage,at:AT});
  assert.equal(r.ok,true);
  assert.doesNotMatch(JSON.stringify(r),/redaccion@diario/,'the address is not stored');
  assert.deepEqual(r.draft.flags,['CONTACT_ADDRESS_NOT_STORED']);
  assert.deepEqual([r.draft.proposedAction.state,r.draft.proposedAction.external,r.draft.proposedAction.origin],['PROPOSED',true,'ai-suggestion']);
  assert.equal(offpage.transition(r.draft.proposedAction,'REVIEWED',{at:AT,actor:{role:'ai'}}).error.code,'AI_CANNOT_TRANSITION');
  assert.equal(r.draft.sendable,false);
  assert.equal(ops.outreachDraft({...base,recipients:[base.recipient,base.recipient]},{book,offpage,at:AT}).error.code,'SINGLE_RECIPIENT_REQUIRED');
  assert.equal(ops.outreachDraft({...base,recipient:{...base.recipient,contactPath:{type:'published-editorial-address'}}},{book,offpage,at:AT}).error.code,'CONTACT_SOURCE_REQUIRED');
  assert.equal(ops.outreachDraft({...base,recipient:{...base.recipient,contactPath:{type:'scraped-list',sourceUrl:'https://x.example/'}}},{book,offpage,at:AT}).error.code,'UNKNOWN_CONTACT_PATH');
  assert.equal(ops.outreachDraft({...base,personalization:{reason:'x'}},{book,offpage,at:AT}).error.code,'PERSONALIZATION_REQUIRED');
  const drafts=['o1','o2','o3'].map(id=>ops.outreachDraft({...base,id},{book,offpage,at:AT}).draft);
  assert.deepEqual(ops.outreachBatchCheck(drafts),{status:'TEMPLATED_MASS',groups:[['o1','o2','o3']]});
  assert.equal(ops.outreachBatchCheck(drafts.slice(0,2)).status,'INDIVIDUAL');
});

test('PR ideas and journalist responses need evidence, a public request source and attributable quotes',()=>{
  const book=bookFor('professional-service',[
    {id:'quote',category:'experience',statement:'Revisar la documentación antes de junio evita recargos',source:'Entrevista con la socia',permissions:{attribution:true},approvedBy:'socia',approvedAt:'2026-09-01'},
    {id:'quote-noattr',category:'experience',statement:'Opinión interna',source:'Nota',approvedBy:'c',approvedAt:'2026-09-01'}]);
  const idea=ops.prIdea({id:'p1',targetType:'media',angle:'Calendario fiscal para autónomos en Valencia',factIds:['f-name']},{book,offpage});
  assert.equal(idea.idea.status,'CANDIDATE');
  assert.equal(ops.prIdea({id:'p2',targetType:'media',angle:'Tema sin datos'},{book,offpage}).idea.status,'NEEDS_EVIDENCE');
  assert.equal(ops.prIdea({id:'p3',targetType:'media',angle:'x',contactQuota:50},{book,offpage}).error.code,'QUOTAS_OR_BULK_NOT_ALLOWED');
  const req={outlet:'Revista Pyme',query:'Consejos fiscales',sourceUrl:'https://revista.example/solicitudes/42',deadline:'2026-09-30'};
  const ok=ops.journalistResponse({id:'j1',request:req,blocks:[{kind:'QUOTE',text:'Revisar la documentación antes de junio evita recargos',factRefs:['quote']}]},{book,offpage,at:AT});
  assert.equal(ok.response.status,'DRAFT_READY_FOR_REVIEW');
  assert.equal(ok.response.proposedAction.state,'PROPOSED');
  const noAttr=ops.journalistResponse({id:'j2',request:req,blocks:[{kind:'QUOTE',text:'Opinión interna',factRefs:['quote-noattr']}]},{book,offpage,at:AT});
  assert.ok(noAttr.response.blocks[0].codes.includes('QUOTE_WITHOUT_ATTRIBUTION_PERMISSION'));
  assert.equal(ops.journalistResponse({id:'j3',request:{...req,sourceUrl:''},blocks:[]},{book,offpage,at:AT}).error.code,'MISSING_REQUEST_SOURCE');
  assert.equal(ops.journalistResponse({id:'j4',request:{...req,deadline:'2026-09-01'},blocks:[]},{book,offpage,at:AT}).error.code,'REQUEST_EXPIRED');
});

// ── 7. Reviews ──────────────────────────────────────────────────────────────

test('review responses are neutral: no change requests, incentives or reviewer personal data',()=>{
  const review={platform:'maps',rating:2,text:'La visita del 12 de mayo fue lenta. Firmado: María López, maria@mail.example',authorName:'María López'};
  const ok=ops.reviewResponseDraft({id:'r1',review,response:{text:'Gracias por contarnos su experiencia del 12 de mayo. Lo revisamos con el equipo para mejorar los tiempos.'}},{offpage,at:AT});
  assert.equal(ok.draft.status,'DRAFT_READY_FOR_REVIEW');
  assert.doesNotMatch(JSON.stringify(ok),/maria@mail|María López/);
  assert.deepEqual([ok.draft.proposedAction.kind,ok.draft.proposedAction.state,ok.draft.sendable],['publish-content','PROPOSED',false]);
  const bad=ops.reviewResponseDraft({id:'r2',review,response:{text:'María López, le ofrecemos un descuento si elimina su reseña.'}},{offpage,at:AT});
  assert.deepEqual([...bad.draft.codes].sort(),['ASKS_TO_CHANGE_REVIEW','INCENTIVE_OFFERED','REVIEWER_NAME_IN_RESPONSE']);
  assert.ok(ops.reviewResponseDraft({id:'r3',review,response:{text:'Atendemos 300 clientes al mes'}},{offpage,at:AT}).draft.codes.includes('UNSUPPORTED_NUMBER'));
});

test('review requests go to every eligible customer, without incentives or gating',()=>{
  const ok=ops.reviewRequestDraft({id:'q1',audience:'all-eligible-customers',channel:'email',text:'Nos ayudaría conocer su opinión sobre el servicio, sea cual sea.'},{offpage,at:AT});
  assert.equal(ok.draft.status,'DRAFT_READY_FOR_REVIEW');
  assert.equal(ok.draft.proposedAction.kind,'external-decision');
  const gated=ops.reviewRequestDraft({id:'q2',audience:'happy-customers',segment:{minNps:9},incentive:{type:'discount'},text:'Si está satisfecho, déjenos 5 estrellas y le haremos un descuento.'},{offpage,at:AT});
  assert.deepEqual([...gated.draft.codes].sort(),['INCENTIVE_OFFERED','REVIEW_GATING','REVIEW_GATING_LANGUAGE','UNSUPPORTED_NUMBER'],'"5 estrellas" is also an unsupported claim');
  assert.equal(gated.draft.audience,null);
  const subset=ops.reviewRequestDraft({id:'q3',audience:'recent-buyers',text:'Nos ayudaría conocer su opinión.'},{offpage,at:AT});
  assert.deepEqual(subset.draft.codes,['REVIEW_GATING'],'any audience other than every eligible customer is gating');
});

// ── 8. Periodic report ──────────────────────────────────────────────────────

test('the operations report separates observed, executed, not verified and next, with sources or UNKNOWN',()=>{
  let a=act('x1',{period:'2026-09'});a=step(a,'REVIEWED',{at:'2026-09-03',actor:H});a=step(a,'APPROVED',{at:'2026-09-04',actor:H,approval:{scope:'correo'}});
  a=step(a,'IN_PROGRESS',{at:'2026-09-05',actor:{role:'system'}});a=step(a,'EXECUTED',{at:'2026-09-10',actor:{role:'system'},evidence:{url:'https://diario.example/n',at:'2026-09-10'}});
  const closure=offpage.closePeriod({period:'2026-09',at:'2026-10-01',actions:[a],carry:{x1:{reason:'Pendiente de verificar',nextStep:'Comprobar enlace'}}});
  const ledger=ops.periodLedger(null,{closure,actions:[a]},{offpage});
  const r=ops.operationsReport({period:'2026-09',closure,ledger,actions:[a],
    sources:[{id:'src-gsc',provider:'search-console',method:'import',capturedAt:'2026-09-30'}],
    observations:[{statement:'Nueva mención en prensa local',evidenceRefs:['src-gsc']},{statement:'Posible aumento de notoriedad'},{statement:'Dato sin fuente',evidenceRefs:['ghost']}],
    next:[{step:'Verificar el enlace publicado',reason:'Acción ejecutada sin resultado verificado',evidenceRefs:['src-gsc']},{step:'Sin motivo'}]},{offpage});
  assert.deepEqual(r.report.observed.map(o=>o.status),['CITED','UNKNOWN','UNKNOWN']);
  assert.equal(r.report.executedActions[0].evidence,'https://diario.example/n');
  assert.equal(r.report.notVerified[0].actionId,'x1');
  assert.ok(r.report.next.some(n=>n.fromAgenda==='verify'));
  assert.deepEqual(r.report.sources.map(s=>s.id),['src-gsc']);
  assert.ok(r.issues.some(i=>i.code==='NEXT_STEP_WITHOUT_REASON'));
  assert.ok(r.issues.some(i=>i.code==='UNKNOWN_EVIDENCE_REF'));
  assert.match(r.report.disclaimer,/no promete/);
  assert.equal(r.publishable,false);
  const promise=ops.operationsReport({observations:[{statement:'Garantizamos el primer puesto en Google',evidenceRefs:['s']}],sources:[{id:'s'}]},{offpage});
  assert.ok(promise.issues.some(i=>i.code==='PROMISE_NOT_ALLOWED'));
});

// ── Hygiene ─────────────────────────────────────────────────────────────────

test('module has no network, clock, storage, model call or vertical coupling',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-offpage-ops.js'),'utf8');
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|require\(|Date\.now|new Date\(\)|runProviderRequest/);
  assert.doesNotMatch(src,/restaurant|dishes|real-estate/i);
  assert.ok(Object.isFrozen(ops));
  assert.equal(typeof providers.isTrustedResult,'function');
});

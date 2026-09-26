/* Rubik SEO/GEO — CORE-8.1 continuous off-page operations (D-24, OFFPAGE-SERVICE §6).
   Core-only contracts on top of CORE-8 (`offpage`, injected per call): approved client
   information, continuity between periods, repeated GEO measurement plans and series,
   evidence-based content drafts and channel adaptations, studies/cases/infographics with
   real data only, PR ideas, journalist responses and individual outreach drafts, neutral
   review responses and requests, and a periodic operations report.
   Everything is a reviewable draft or proposal: nothing is published, sent or stored, no
   model or provider is called and no clock is read. Every external action is proposed
   through offpage.action and needs explicit human approval. Structural validation is not
   semantic verification: a person checks claim–evidence correspondence before use. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RubikSEOGeoOffpageOps=api;})(globalThis,function(){
'use strict';
const text=x=>typeof x==='string'?x.trim():'';
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const isoOrNull=v=>{if(v==null||v==='')return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const uniq=xs=>[...new Set(xs)];
const fold=v=>text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
function hash(v){let h=2166136261;for(const c of stable(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const httpsUrl=v=>{try{const u=new URL(text(v));return u.protocol==='https:'&&!u.username&&!u.password?u.origin+u.pathname:'';}catch{return '';}};
const REQUIRED=['minimize','evidenceItem','compareEvidence','claimIssues','action','campaignProgress','compareGeo','monthlyReport','validateReport','querySet'];
function need(offpage,fns=REQUIRED){
  if(offpage==null)throw new TypeError('offpage module must be injected');
  for(const f of fns)if(typeof offpage[f]!=='function')throw new TypeError(`offpage.${f} must be a function`);
  return offpage;
}
const refuse=(code,extra={})=>freeze({ok:false,error:{code,...extra}});

/* ── 1. Approved client information ──────────────────────────────────────── */
const FACT_CATEGORIES=Object.freeze(['company','service','product','faq','data','experience','case-result','policy']);
/* approvedFact(input, {offpage, at}): one piece of client information. It is usable only
   when approved (approvedBy + approvedAt not after `at`), sourced and not expired. */
function approvedFact(input,{offpage,at}={}){
  need(offpage,['minimize']);
  const now=isoOrNull(at);if(!now)throw new Error('approvedFact requires an explicit date (at)');
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  if(!FACT_CATEGORIES.includes(v.category))return refuse('UNKNOWN_CATEGORY');
  const statement=offpage.minimize(v.statement,600);if(!statement)return refuse('MISSING_STATEMENT');
  const source=offpage.minimize(v.source,200);if(!source)return refuse('MISSING_SOURCE');
  const approvedBy=text(v.approvedBy),approvedAt=isoOrNull(v.approvedAt),validUntil=isoOrNull(v.validUntil);
  const status=!approvedBy||!approvedAt||approvedAt>now?'PENDING_APPROVAL':validUntil&&validUntil<now?'EXPIRED':'APPROVED';
  return freeze({ok:true,fact:{id,category:v.category,statement,source,sourceUrl:httpsUrl(v.sourceUrl)||null,
    subject:offpage.minimize(v.subject,120)||null,field:offpage.minimize(v.field,60)||null,
    value:typeof v.value==='number'||typeof v.value==='boolean'?v.value:(v.value==null?null:offpage.minimize(String(v.value),200)),
    period:offpage.minimize(v.period,40)||null,methodology:offpage.minimize(v.methodology,400)||null,
    permissions:{publish:v.permissions?.publish===true,attribution:v.permissions?.attribution===true},
    approvedBy:approvedBy||null,approvedAt,validUntil,status}});
}
const factEvidence=f=>({id:f.id,kind:'approved-fact',subject:f.subject,field:f.field,value:f.value,text:f.statement,url:f.sourceUrl,period:f.period,capturedAt:f.approvedAt,provider:'client',method:'manual'});
/* factBook(inputs, {offpage, at}): validated facts, what was refused, which are usable,
   and conflicts (approved facts that disagree inside one comparable context, which then
   stop being usable). */
function factBook(inputs,{offpage,at}={}){
  need(offpage,['minimize','compareEvidence']);
  const facts=[],rejected=[],seen=new Set();
  arr(inputs).forEach((x,index)=>{const r=approvedFact(x,{offpage,at});if(!r.ok)rejected.push({index,code:r.error.code});else if(seen.has(r.fact.id))rejected.push({index,code:'DUPLICATE_ID'});else{seen.add(r.fact.id);facts.push(clone(r.fact));}});
  const approved=facts.filter(f=>f.status==='APPROVED');
  const {conflicts,divergences}=offpage.compareEvidence(approved.map(factEvidence));
  const conflicted=new Set(conflicts.flatMap(c=>c.evidenceIds));
  for(const f of facts)if(conflicted.has(f.id))f.status='CONFLICT';
  return freeze({at:isoOrNull(at),facts,rejected,conflicts,divergences,usable:facts.filter(f=>f.status==='APPROVED').map(f=>f.id)});
}
const factOf=(book,id)=>arr(book?.facts).find(f=>f.id===id)||null;
const usableFact=(book,id)=>arr(book?.usable).includes(id);

/* Shared block validation for drafts: FACT/INFERENCE/QUOTE blocks cite usable facts and
   pass offpage.claimIssues against them; HYPOTHESIS may have no references; unlabelled
   text is UNKNOWN (needs evidence), never silently accepted. */
const BLOCK_KINDS=Object.freeze(['FACT','INFERENCE','HYPOTHESIS','QUOTE','HEADING','CTA']);
function validateBlocks(blocks,{book,offpage,allowedFactIds=null,scopeCode='FACT_OUTSIDE_SCOPE',quoteNeedsAttribution=true}){
  const out=[],used=new Set();
  arr(blocks).forEach((b,index)=>{
    const kind=BLOCK_KINDS.includes(b?.kind)?b.kind:'UNKNOWN',body=text(b?.text),refs=uniq(arr(b?.factRefs).map(text).filter(Boolean)),codes=[];
    if(!body){out.push({index,kind,status:'REJECTED',codes:['EMPTY_BLOCK'],factRefs:refs});return;}
    for(const r of refs){if(!factOf(book,r))codes.push('UNKNOWN_FACT');else if(!usableFact(book,r))codes.push('FACT_NOT_USABLE:'+factOf(book,r).status);if(allowedFactIds&&!allowedFactIds.includes(r))codes.push(scopeCode);}
    if(['FACT','INFERENCE','QUOTE'].includes(kind)&&!refs.length)codes.push('UNSUPPORTED_CLAIM');
    if(kind==='QUOTE'&&quoteNeedsAttribution)for(const r of refs){const f=factOf(book,r);if(f&&(f.category!=='experience'||!f.permissions.attribution))codes.push('QUOTE_WITHOUT_ATTRIBUTION_PERMISSION');}
    const cited=refs.filter(r=>usableFact(book,r)).map(r=>factEvidence(factOf(book,r)));
    const scope=['HEADING','CTA','UNKNOWN','HYPOTHESIS'].includes(kind)&&!refs.length?arr(allowedFactIds||book?.usable).filter(r=>usableFact(book,r)).map(r=>factEvidence(factOf(book,r))):cited;
    codes.push(...offpage.claimIssues(body,scope));
    const status=codes.length?'REJECTED':kind==='UNKNOWN'?'UNKNOWN':'CANDIDATE';
    if(status!=='REJECTED')refs.forEach(r=>used.add(r));
    out.push({index,kind,text:offpage.minimize(body,2000),factRefs:refs,status,codes:uniq(codes),
      ...(kind==='HYPOTHESIS'?{label:'HIPÓTESIS'}:{}),...(kind==='INFERENCE'?{label:'INFERENCIA'}:{}),...(status==='UNKNOWN'?{note:'Sin etiqueta ni evidencia: se declara desconocido hasta aportar respaldo.'}:{})});
  });
  return {blocks:out,usedFactIds:[...used].sort()};
}
const DRAFT_FLAGS=Object.freeze({publishable:false,sendable:false,requiresHumanApproval:true,semanticReview:'PENDING_HUMAN',verification:'STRUCTURAL_ONLY'});
const draftStatus=blocks=>!blocks.length?'INVALID':blocks.some(b=>b.status==='REJECTED')?'DRAFT_WITH_ISSUES':blocks.some(b=>b.status==='UNKNOWN')?'DRAFT_WITH_UNKNOWNS':'DRAFT_READY_FOR_REVIEW';

/* ── 2. Continuity between periods ───────────────────────────────────────── */
/* periodLedger(previous, {closure, campaigns, actions, geoSummary}, {offpage}): appends one
   closed period (from offpage.closePeriod) to an append-only history and derives the next
   period's agenda: follow-ups for carried actions, verifications, hypotheses to measure and
   GEO re-measurement. New actions are never required. */
function periodLedger(previous,{closure,campaigns=[],actions=[],geoSummary=null}={},{offpage}={}){
  need(offpage,['campaignProgress']);
  if(!closure||!text(closure.period)||!isoOrNull(closure.closedAt))throw new Error('periodLedger requires a closure from offpage.closePeriod');
  const history=arr(previous?.history).map(clone),issues=[];
  if(history.some(h=>h.period===closure.period))return refuse('PERIOD_ALREADY_CLOSED',{period:closure.period});
  if(history.length&&history[history.length-1].closedAt>closure.closedAt)return refuse('PERIOD_OUT_OF_ORDER',{period:closure.period});
  const progress=arr(campaigns).map(c=>offpage.campaignProgress(c,actions));
  const entry={period:closure.period,closedAt:closure.closedAt,plannedVsDone:clone(closure.plannedVsDone),carryOver:clone(closure.carryOver),blocked:clone(closure.blocked),
    learnings:clone(closure.learnings),noRelevantChanges:closure.noRelevantChanges??null,statement:closure.statement||null,
    campaigns:progress.map(p=>({campaignId:p.campaignId,goal:p.goal,actions:p.actions,open:p.open,byState:clone(p.byState)})),
    geo:geoSummary&&geoSummary.status==='MEASURED'?{querySetHash:geoSummary.querySet.hash,window:clone(geoSummary.window),groups:geoSummary.groups.map(g=>({engine:g.engine,surface:g.surface,locale:g.locale,market:g.market,models:clone(g.models),mentionRate:clone(g.mentionRate),confidence:g.confidence}))}:null};
  for(const i of arr(closure.issues))issues.push(clone(i));
  const agenda=[];
  for(const c of entry.carryOver){agenda.push({type:'follow-up',actionId:c.actionId,state:c.state,nextStep:c.nextStep,reason:c.reason,needsDefinition:!c.nextStep||!c.reason,awaitingHumanDecision:c.awaitingHumanDecision});}
  for(const a of arr(actions))if(['EXECUTED','VERIFICATION_PENDING'].includes(a.state))agenda.push({type:'verify',actionId:a.id,state:a.state,evidence:a.executionEvidence?.ref||null});
  for(const l of entry.learnings)if(l.kind==='HYPOTHESIS')agenda.push({type:'measure',learningId:l.id,toMeasure:l.toMeasure||null,needsDefinition:!l.toMeasure});
  if(entry.geo)agenda.push({type:'re-measure',querySetHash:entry.geo.querySetHash,note:'Repetir el mismo conjunto versionado con el mismo motor, superficie, modelo y método para mantener la serie comparable.'});
  for(const p of entry.campaigns)if(p.open>0)agenda.push({type:'campaign-continues',campaignId:p.campaignId,open:p.open});
  history.push(entry);
  return freeze({history,current:entry,agenda,newActionsRequired:false,
    note:'Seguimiento, verificación, medición y aprendizaje son trabajo válido; no se exige crear acciones nuevas en cada periodo.',issues});
}

/* ── 3. Repeated GEO measurements ────────────────────────────────────────── */
const PLAN_METHODS=Object.freeze(['manual','import','mock','api']);
/* geoMeasurementPlan(querySet, {targets, runsPerQuery}): the runs to perform (nothing is
   executed). Each target is one engine × surface × model × method; scraping is refused. */
function geoMeasurementPlan(qs,{targets,runsPerQuery=3}={}){
  if(!qs?.hash||!Array.isArray(qs.queries))throw new TypeError('a versioned querySet (offpage.querySet) is required');
  if(!Number.isInteger(runsPerQuery)||runsPerQuery<1||runsPerQuery>50)return refuse('INVALID_RUNS_PER_QUERY');
  const ts=[],warnings=[];
  for(const t of arr(targets)){
    if(!PLAN_METHODS.includes(t?.method))return refuse('METHOD_NOT_ALLOWED',{method:t?.method??null});
    if(!text(t?.engine))return refuse('MISSING_ENGINE');
    ts.push({engine:text(t.engine),surface:t.surface==='consumer-ui'?'consumer-ui':'api',model:text(t.model)||null,method:t.method});
  }
  if(!ts.length)return refuse('NO_TARGETS');
  if(runsPerQuery<3)warnings.push('FEW_RUNS_PER_QUERY');
  if(ts.some(t=>!t.model))warnings.push('MODEL_NOT_DECLARED');
  const rows=[];
  for(const t of ts)for(const q of qs.queries)for(let i=0;i<runsPerQuery;i++)rows.push({querySetId:qs.id,querySetVersion:qs.version,queryId:q.id,locale:q.locale,market:q.market,...t,runIndex:i});
  return freeze({ok:true,plan:{planId:'plan-'+hash([qs.hash,ts,runsPerQuery]),querySetHash:qs.hash,targets:ts,runsPerQuery,rows,totals:{runs:rows.length,queries:qs.queries.length,targets:ts.length},warnings,executes:false,
    note:'El plan no ejecuta nada. Las ejecuciones se registran después con offpage.geoRun; sin scraping.'}});
}
/* geoSeries(entries, {offpage}): longitudinal view of offpage.summarizeGeo summaries.
   Each period is compared with the previous one via offpage.compareGeo; breaks stay
   visible and no trend is chained across a break. */
function geoSeries(entries,{offpage}={}){
  need(offpage,['compareGeo']);
  const list=arr(entries).filter(e=>text(e?.period)&&e.summary).slice().sort((a,b)=>a.period<b.period?-1:1);
  const groups=new Map(),key=g=>[g.engine,g.surface,g.locale,g.market].join('|');
  list.forEach((e,i)=>{
    const cmp=i?offpage.compareGeo(list[i-1].summary,e.summary):null;
    for(const g of arr(e.summary.groups)){
      const c=cmp?(cmp.groups.find(x=>key(x)===key(g))||{change:'NOT_COMPARABLE',reason:cmp.reason||'NO_PREVIOUS_GROUP'}):{change:'BASELINE',reason:null};
      if(!groups.has(key(g)))groups.set(key(g),{engine:g.engine,surface:g.surface,locale:g.locale,market:g.market,points:[]});
      groups.get(key(g)).points.push({period:e.period,value:g.mentionRate.value,ci95:clone(g.mentionRate.ci95),n:g.mentionRate.n,models:clone(g.models),change:c.change,reason:c.reason||null});
    }
  });
  const series=[...groups.values()].map(s=>({...s,breaks:s.points.filter(p=>p.change==='NOT_COMPARABLE').map(p=>({period:p.period,reason:p.reason})),
    comparableSegments:s.points.reduce((segs,p)=>{if(p.change==='NOT_COMPARABLE'||!segs.length)segs.push([p.period]);else segs[segs.length-1].push(p.period);return segs;},[])}));
  return freeze({periods:list.map(e=>e.period),series,limits:['Serie observacional; no es tráfico ni resultado de negocio.','No se encadenan tendencias a través de rupturas de serie.']});
}

/* ── 4. Articles, guides and channel adaptations ─────────────────────────── */
const CONTENT_KINDS=Object.freeze(['article','guide','channel-adaptation']);
const CHANNELS=Object.freeze(['web','social','newsletter','business-profile','other']);
/* contentBrief(input, {book, offpage}): what a draft may use: only usable approved facts. */
function contentBrief(input,{book,offpage}={}){
  need(offpage,['minimize']);
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  if(!CONTENT_KINDS.includes(v.kind))return refuse('UNKNOWN_KIND');
  const channel=CHANNELS.includes(v.channel)?v.channel:(v.kind==='channel-adaptation'?null:'web');
  if(!channel)return refuse('UNKNOWN_CHANNEL');
  if(v.kind==='channel-adaptation'&&!text(v.parentDraftId))return refuse('PARENT_DRAFT_REQUIRED');
  const asked=uniq(arr(v.factIds).map(text).filter(Boolean)),factIds=asked.filter(f=>usableFact(book,f)),unusable=asked.filter(f=>!usableFact(book,f)).map(f=>({id:f,status:factOf(book,f)?.status||'UNKNOWN_FACT'}));
  return freeze({ok:true,brief:{id,kind:v.kind,channel,topic:offpage.minimize(v.topic,200)||null,audience:offpage.minimize(v.audience,200)||null,parentDraftId:text(v.parentDraftId)||null,
    factIds,unusable,status:factIds.length?'READY':'BLOCKED',reason:factIds.length?null:'NO_USABLE_FACTS'}});
}
/* validateDraft(draft, {brief, book, parent, offpage}): block-level validation. A channel
   adaptation may only reuse facts its parent draft already used. */
function validateDraft(draft,{brief,book,parent=null,offpage}={}){
  need(offpage,['claimIssues','minimize']);
  if(!brief||!brief.id)throw new TypeError('a brief from contentBrief is required');
  const d=draft&&typeof draft==='object'?draft:{};
  let allowed=brief.factIds;
  if(brief.kind==='channel-adaptation'){
    if(!parent||parent.draftId!==brief.parentDraftId)return refuse('PARENT_DRAFT_MISMATCH');
    allowed=brief.factIds.filter(f=>parent.usedFactIds.includes(f));
  }
  const {blocks}=validateBlocks(d.blocks,{book,offpage,allowedFactIds:allowed,scopeCode:brief.kind==='channel-adaptation'?'NEW_FACT_IN_ADAPTATION':'FACT_OUTSIDE_SCOPE'});
  return freeze({draftId:text(d.id)||'draft-'+hash([brief.id,blocks.map(b=>b.text)]),briefId:brief.id,kind:brief.kind,channel:brief.channel,parentDraftId:brief.parentDraftId,
    status:draftStatus(blocks),blocks,usedFactIds:blocks.filter(b=>b.status!=='REJECTED').flatMap(b=>b.factRefs).filter((x,i,a)=>a.indexOf(x)===i).sort(),...DRAFT_FLAGS});
}

/* ── 5. Studies, case studies and infographics ───────────────────────────── */
const STUDY_KINDS=Object.freeze(['study','case-study','infographic']);
const LEVEL_KINDS=Object.freeze(['FACT','INFERENCE','HYPOTHESIS']);
const CAUSAL=/(gracias a|debido a|caus[aoó]|provoc|por culpa de|se tradujo en|because of|caused|led to|resulted in|thanks to|drove)/i;
/* studyProposal(input, {book}): real data only. Every data fact must be approved, with
   period, methodology, source and publication permission; case studies also need
   attribution permission; studies need at least 3 data points. Causal claims are always
   hypotheses. */
function studyProposal(input,{book,offpage}={}){
  need(offpage,['minimize']);
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  if(!STUDY_KINDS.includes(v.kind))return refuse('UNKNOWN_KIND');
  const reasons=[],ids=uniq(arr(v.factIds).map(text).filter(Boolean)),data=[];
  for(const fid of ids){
    const f=factOf(book,fid);
    if(!f){reasons.push('UNKNOWN_FACT:'+fid);continue;}
    if(!usableFact(book,fid)){reasons.push('FACT_NOT_USABLE:'+fid+':'+f.status);continue;}
    if(!['data','case-result'].includes(f.category)){reasons.push('NOT_A_DATA_FACT:'+fid);continue;}
    for(const k of ['period','methodology','source'])if(!f[k])reasons.push('FACT_INCOMPLETE:'+fid+':'+k);
    if(!f.permissions.publish)reasons.push('PUBLISH_PERMISSION_MISSING:'+fid);
    if(v.kind==='case-study'&&!f.permissions.attribution)reasons.push('ATTRIBUTION_PERMISSION_MISSING:'+fid);
    data.push(fid);
  }
  if(!data.length)reasons.push('NO_DATA');
  if(v.kind==='study'&&data.length<3)reasons.push('INSUFFICIENT_DATA_POINTS');
  const claims=arr(v.claims).map(c=>{const t=offpage.minimize(c?.text,400),causal=c?.causal===true||CAUSAL.test(fold(t));return {text:t,kind:causal?'HYPOTHESIS':(LEVEL_KINDS.includes(c?.kind)?c.kind:'INFERENCE'),flags:causal?['CAUSALITY_NOT_ESTABLISHED']:[]};}).filter(c=>c.text);
  return freeze({id,kind:v.kind,title:offpage.minimize(v.title,200)||null,status:reasons.length?'BLOCKED':'READY_FOR_DRAFT',reasons:uniq(reasons),dataFactIds:data,claims,
    methodologyRequired:true,...DRAFT_FLAGS});
}

/* ── 6. PR ideas, journalist responses and individual outreach ───────────── */
const PR_TARGETS=Object.freeze(['media','site','collaboration','journalist-request','community']);
function prIdea(input,{book,offpage}={}){
  need(offpage,['minimize','claimIssues']);
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  if(!PR_TARGETS.includes(v.targetType))return refuse('UNKNOWN_TARGET_TYPE');
  if(v.bulk===true||v.linkQuota!=null||v.contactQuota!=null)return refuse('QUOTAS_OR_BULK_NOT_ALLOWED');
  const factIds=uniq(arr(v.factIds).map(text)).filter(f=>usableFact(book,f));
  const angle=offpage.minimize(v.angle,300);if(!angle)return refuse('MISSING_ANGLE');
  const issues=offpage.claimIssues(angle,factIds.map(f=>factEvidence(factOf(book,f))));
  return freeze({ok:true,idea:{id,targetType:v.targetType,angle,rationale:offpage.minimize(v.rationale,400)||null,factIds,
    evidenceStatus:factIds.length?'CITED':'INSUFFICIENT',status:issues.length?'REJECTED':factIds.length?'CANDIDATE':'NEEDS_EVIDENCE',issues,...DRAFT_FLAGS}});
}
/* journalistResponse(input, {book, offpage, at}): answer to a published journalist request
   (public source URL, deadline). Expert quotes need an approved 'experience' fact with
   attribution permission. */
function journalistResponse(input,{book,offpage,at}={}){
  need(offpage,['minimize','claimIssues','action']);
  const now=isoOrNull(at);if(!now)throw new Error('journalistResponse requires an explicit date (at)');
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  const req=v.request||{},sourceUrl=httpsUrl(req.sourceUrl),deadline=isoOrNull(req.deadline);
  if(!sourceUrl)return refuse('MISSING_REQUEST_SOURCE');
  if(!deadline)return refuse('MISSING_DEADLINE');
  if(deadline<now)return refuse('REQUEST_EXPIRED');
  const {blocks,usedFactIds}=validateBlocks(v.blocks,{book,offpage});
  const proposal=offpage.action({id:'act-'+id,kind:'send-message',goal:'Responder a la solicitud periodística de '+(offpage.minimize(req.outlet,80)||'un medio'),createdAt:now,origin:'ai-suggestion',draftRef:id,period:text(v.period)||null});
  return freeze({ok:true,response:{id,request:{outlet:offpage.minimize(req.outlet,120)||null,query:offpage.minimize(req.query,400)||null,sourceUrl,deadline},
    status:draftStatus(blocks),blocks,usedFactIds,proposedAction:proposal.ok?proposal.action:null,...DRAFT_FLAGS}});
}
const CONTACT_TYPES=Object.freeze(['contact-form','published-editorial-address','social-profile']);
/* outreachDraft(input, {book, offpage, at}): one recipient, a public contact path with its
   source URL (the address itself is not stored), personalization backed by evidence, and
   an external action proposal that needs human approval. */
function outreachDraft(input,{book,offpage,at}={}){
  need(offpage,['minimize','claimIssues','action']);
  const now=isoOrNull(at);if(!now)throw new Error('outreachDraft requires an explicit date (at)');
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  if(Array.isArray(v.recipients)&&v.recipients.length!==1||v.bulk===true)return refuse('SINGLE_RECIPIENT_REQUIRED');
  const r=v.recipient||arr(v.recipients)[0];
  if(!r||!text(r.outlet))return refuse('SINGLE_RECIPIENT_REQUIRED');
  const cp=r.contactPath||{};
  if(!CONTACT_TYPES.includes(cp.type))return refuse('UNKNOWN_CONTACT_PATH');
  const contactSource=httpsUrl(cp.sourceUrl);if(!contactSource)return refuse('CONTACT_SOURCE_REQUIRED');
  const reason=offpage.minimize(v.personalization?.reason,300),evidenceUrl=httpsUrl(v.personalization?.evidenceUrl);
  if(!reason||!evidenceUrl)return refuse('PERSONALIZATION_REQUIRED');
  const flags=[];if(cp.address!=null||r.email!=null||cp.email!=null)flags.push('CONTACT_ADDRESS_NOT_STORED');
  const {blocks,usedFactIds}=validateBlocks(v.blocks,{book,offpage});
  const proposal=offpage.action({id:'act-'+id,kind:cp.type==='contact-form'||cp.type==='social-profile'?'send-message':'send-email',goal:offpage.minimize(v.goal,300)||'Contacto individual con '+offpage.minimize(r.outlet,80),
    opportunityId:text(v.opportunityId)||null,campaignId:text(v.campaignId)||null,createdAt:now,origin:'ai-suggestion',draftRef:id,period:text(v.period)||null});
  return freeze({ok:true,draft:{id,recipient:{outlet:offpage.minimize(r.outlet,120),url:httpsUrl(r.url)||null,contactPath:{type:cp.type,sourceUrl:contactSource}},
    personalization:{reason,evidenceUrl},status:draftStatus(blocks),blocks,usedFactIds,bodyHash:hash(blocks.map(b=>fold(b.text||''))),flags,proposedAction:proposal.ok?proposal.action:null,...DRAFT_FLAGS}});
}
/* outreachBatchCheck(drafts, {maxIdentical}): the same body sent to several recipients is
   templated mass outreach, not individual contact. */
function outreachBatchCheck(drafts,{maxIdentical=2}={}){
  const byHash=new Map();
  for(const d of arr(drafts))if(d?.bodyHash){if(!byHash.has(d.bodyHash))byHash.set(d.bodyHash,[]);byHash.get(d.bodyHash).push(d.id);}
  const groups=[...byHash.values()].filter(ids=>ids.length>maxIdentical);
  return freeze({status:groups.length?'TEMPLATED_MASS':'INDIVIDUAL',groups:groups.map(ids=>ids.slice().sort())});
}

/* ── 7. Reviews ──────────────────────────────────────────────────────────── */
const INCENTIVE=/(descuento|regalo|cupon|sorteo|premio|compensaci|a cambio de|invitaci[o]n gratis|gratis si|gift card|discount|coupon|voucher|in exchange|reward|free .{0,20} for (a|your) review)/i;
const GATING=/(si (esta|estas|quedo|quedaste|ha quedado|has quedado) (satisfech|content)|solo si|5 estrellas|cinco estrellas|if you('| a)re (happy|satisfied)|if you enjoyed|only if|5[- ]star)/i;
const CHANGE_REQUEST=/((cambi|elimin|retir|modific|borr|actualic)\w* (la|su|tu) (resena|opinion|valoracion))|(update|remove|change|delete|edit) your review/i;
/* reviewResponseDraft(input, {offpage}): neutral reply draft. The reviewer's name and
   contact data are never stored; asking to change or remove a review, or offering
   anything in exchange, is refused. */
function reviewResponseDraft(input,{offpage,at}={}){
  need(offpage,['minimize','claimIssues','action']);
  const now=isoOrNull(at);if(!now)throw new Error('reviewResponseDraft requires an explicit date (at)');
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  const body=text(v.response?.text);if(!body)return refuse('EMPTY_RESPONSE');
  const f=fold(body),codes=[];
  if(CHANGE_REQUEST.test(f))codes.push('ASKS_TO_CHANGE_REVIEW');
  if(INCENTIVE.test(f))codes.push('INCENTIVE_OFFERED');
  const author=text(v.review?.authorName);if(author&&author.length>2&&fold(body).includes(fold(author)))codes.push('REVIEWER_NAME_IN_RESPONSE');
  // Numbers may only repeat what the review itself says (e.g. a date); nothing else is asserted.
  codes.push(...offpage.claimIssues(body,[{id:'review',text:text(v.review?.text)}]));
  const rating=Number(v.review?.rating);
  // The reviewer's name never leaves the host: removed from the stored excerpt too.
  let excerpt=offpage.minimize(v.review?.text,280)||null;
  if(excerpt&&author)excerpt=excerpt.split(author).join('[autor]');
  const proposal=offpage.action({id:'act-'+id,kind:'publish-content',goal:'Publicar respuesta a una reseña',createdAt:now,origin:'ai-suggestion',draftRef:id,period:text(v.period)||null});
  return freeze({ok:true,draft:{id,review:{platform:offpage.minimize(v.review?.platform,60)||null,rating:Number.isFinite(rating)?rating:null,url:httpsUrl(v.review?.url)||null,excerpt},
    text:offpage.minimize(body,1500),codes:uniq(codes),status:codes.length?'REJECTED':'DRAFT_READY_FOR_REVIEW',proposedAction:proposal.ok?proposal.action:null,...DRAFT_FLAGS}});
}
/* reviewRequestDraft(input, {offpage}): a neutral request template for every eligible
   customer. Segmenting by satisfaction, incentives and gating language are refused. The
   host sends it, after approval, through its own channel. */
function reviewRequestDraft(input,{offpage,at}={}){
  need(offpage,['minimize','claimIssues','action']);
  const now=isoOrNull(at);if(!now)throw new Error('reviewRequestDraft requires an explicit date (at)');
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id);if(!SAFE_ID.test(id))return refuse('INVALID_ID');
  const body=text(v.text);if(!body)return refuse('EMPTY_REQUEST');
  const codes=[];
  if(v.audience!=='all-eligible-customers')codes.push('REVIEW_GATING');
  if(v.segment!=null)codes.push('REVIEW_GATING');
  if(v.incentive!=null)codes.push('INCENTIVE_OFFERED');
  const f=fold(body);
  if(GATING.test(f))codes.push('REVIEW_GATING_LANGUAGE');
  if(INCENTIVE.test(f))codes.push('INCENTIVE_OFFERED');
  codes.push(...offpage.claimIssues(body,[]));
  const proposal=offpage.action({id:'act-'+id,kind:'external-decision',goal:'Aprobar la plantilla neutral de solicitud de opinión',createdAt:now,origin:'ai-suggestion',draftRef:id,period:text(v.period)||null});
  return freeze({ok:true,draft:{id,channel:offpage.minimize(v.channel,40)||null,audience:v.audience==='all-eligible-customers'?'all-eligible-customers':null,text:offpage.minimize(body,1000),
    codes:uniq(codes),status:codes.length?'REJECTED':'DRAFT_READY_FOR_REVIEW',proposedAction:proposal.ok?proposal.action:null,...DRAFT_FLAGS}});
}

/* ── 8. Periodic operations report ───────────────────────────────────────── */
/* operationsReport(input, {offpage}): observed / executed / not verified / next, with
   sources. Each statement carries evidence references or is marked UNKNOWN. It extends
   offpage.monthlyReport and is checked with offpage.validateReport. */
function operationsReport(input={},{offpage}={}){
  need(offpage,['monthlyReport','validateReport','minimize']);
  const v=input&&typeof input==='object'?input:{};
  const sources=arr(v.sources).map(s=>({id:text(s?.id),provider:text(s?.provider)||null,method:text(s?.method)||'manual',capturedAt:isoOrNull(s?.capturedAt)})).filter(s=>SAFE_ID.test(s.id));
  const evidenceIds=uniq([...sources.map(s=>s.id),...arr(v.evidenceIds).map(text)]);
  const base=offpage.monthlyReport({profile:v.profile,period:v.period,comparison:v.comparison,closure:v.closure,actions:v.actions,businessOutcome:v.businessOutcome,nextFocus:v.nextFocus,evidenceIds});
  const statement=(x,label)=>{const refs=uniq(arr(x?.evidenceRefs).map(text).filter(Boolean)),known=refs.filter(r=>evidenceIds.includes(r));return {statement:offpage.minimize(x?.statement??x?.step,400),evidenceRefs:known,unknownRefs:refs.filter(r=>!known.includes(r)),status:known.length?'CITED':'UNKNOWN',...(label?{reason:offpage.minimize(x?.reason,300)||null}:{})};};
  const acts=arr(v.actions);
  const report={...clone(base.report),
    observed:arr(v.observations).map(o=>statement(o)).filter(o=>o.statement),
    notVerified:[...acts.filter(a=>['EXECUTED','VERIFICATION_PENDING'].includes(a.state)&&!a.result).map(a=>({actionId:a.id,statement:'Ejecutada sin resultado verificado todavía',status:'NOT_VERIFIED'})),
      ...arr(v.notVerified).map(o=>({...statement(o),status:'NOT_VERIFIED'}))],
    next:[...arr(v.ledger?.agenda).map(a=>({fromAgenda:a.type,ref:a.actionId||a.learningId||a.campaignId||a.querySetHash||null,statement:a.nextStep||a.toMeasure||a.note||null,needsDefinition:!!a.needsDefinition})),
      ...arr(v.next).map(o=>statement(o,true))],
    sources,
    periodHistory:arr(v.ledger?.history).map(h=>({period:h.period,closedAt:h.closedAt,noRelevantChanges:h.noRelevantChanges}))};
  const issues=[...offpage.validateReport(report,{evidenceIds})];
  for(const n of report.next)if('reason' in n&&!n.reason)issues.push({code:'NEXT_STEP_WITHOUT_REASON',statement:n.statement});
  for(const o of [...report.observed,...report.next])if(o.unknownRefs?.length)issues.push({code:'UNKNOWN_EVIDENCE_REF',refs:o.unknownRefs});
  return freeze({report,issues,...DRAFT_FLAGS});
}

return Object.freeze({
  FACT_CATEGORIES,BLOCK_KINDS,CONTENT_KINDS,CHANNELS,STUDY_KINDS,PR_TARGETS,CONTACT_TYPES,
  approvedFact,factBook,periodLedger,geoMeasurementPlan,geoSeries,contentBrief,validateDraft,studyProposal,
  prIdea,journalistResponse,outreachDraft,outreachBatchCheck,reviewResponseDraft,reviewRequestDraft,operationsReport
});
});

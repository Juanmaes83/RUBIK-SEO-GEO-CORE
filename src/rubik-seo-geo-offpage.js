/* Rubik SEO/GEO — CORE-8 off-page & authority service contracts (D-23).
   Pure, dependency-free contracts for a recurring (typically monthly) off-page service:
   profile and baseline, snapshots with per-source coverage, comparisons, mentions, local
   citation consistency, GEO observations over versioned query sets, opportunities with a
   transparent heuristic, campaign/action lifecycle with human approval, period close and
   client report, plus structured validation of AI suggestions.
   It never calls a network, holds no secrets, persists nothing and never reads a clock:
   dates come from the caller. Release C/E, CORE-7 providers and the active adapter are
   injected per call (D-13). Real connectors, models, scheduling and history are CORE-9. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RubikSEOGeoOffpage=api;})(globalThis,function(){
'use strict';
const text=x=>typeof x==='string'?x.trim():'';
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const isoOrNull=v=>{if(v==null||v==='')return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const uniq=xs=>[...new Set(xs)];
const fold=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const alnum=v=>fold(v).replace(/[^a-z0-9]/g,'');
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
function hash(v){let h=2166136261;for(const c of stable(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
const hostOf=v=>{try{const u=new URL(text(v));return /^https?:$/.test(u.protocol)?u.hostname.toLowerCase():'';}catch{return '';}};
const bareHost=h=>text(h).toLowerCase().replace(/^www\./,'');
/* Exact host or subdomain match; never a substring or a brand name in text. */
const hostMatches=(host,domain)=>{const h=bareHost(host),d=bareHost(domain);return !!h&&!!d&&(h===d||h.endsWith('.'+d));};
/* Deterministic name detection: whole-word match of a name variant, ignoring case and
   accents. Never fuzzy, never inferred. */
const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const namesIn=(value,names)=>{const t=fold(value);return !!t&&arr(names).some(n=>{const f=fold(n);return !!f&&new RegExp('(^|[^a-z0-9])'+escapeRe(f)+'($|[^a-z0-9])').test(t);});};
/* URL without credentials, query or fragment (tokens often travel there). */
const cleanUrl=v=>{try{const u=new URL(text(v));if(!/^https?:$/.test(u.protocol))return '';return u.origin+u.pathname;}catch{return '';}};

/* Personal-data minimisation for excerpts and AI evidence: e-mails (also URL-encoded),
   phone numbers, URL user-info/query strings, key=value credentials and bare token-like
   strings (vendor key prefixes, JWTs, 32+ character opaque strings) are removed. */
function minimize(value,max=280){
  return text(value)
    .replace(/[^\s@<>()"']+@[^\s@<>()"']+\.[a-z]{2,}/gi,'[email]')
    .replace(/https?:\/\/[^\s<>"')]+/gi,m=>cleanUrl(m.replace(/[.,;:!?]+$/,''))||'[url]')
    .replace(/\b(api[-_]?key|access[-_]?token|token|secret|password|passwd|pwd|auth|authorization|bearer)\b\s*[:=]?\s*[^\s,;]+/gi,'$1=[redacted]')
    .replace(/\b(?:sk|pk|rk|ghp|gho|xox[abp])[-_][A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b[A-Za-z0-9+/_-]{32,}={0,2}/g,'[redacted]')
    .replace(/[^\s/]*%40[^\s/]*/gi,'[email]')
    .replace(/(?:\+\d[\d\s().-]{7,}\d)|(?:\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b)|(?:\b\d{9,15}\b)/g,'[phone]')
    .slice(0,max);
}

/* ── Vocabulary ──────────────────────────────────────────────────────────── */
const USABLE=Object.freeze(['OK','PARTIAL','EMPTY']);
/* Same vocabulary as CORE-7 RESULT_STATUSES (kept literal: no module import). */
const MEASUREMENT_STATUSES=Object.freeze(['OK','PARTIAL','EMPTY','NOT_CONFIGURED','NOT_CONNECTED','NOT_MEASURED','COST_CONFIRMATION_REQUIRED','BUDGET_REQUIRED','BUDGET_EXCEEDED','RATE_LIMITED','ERROR','STALE']);
const SOURCE_METHODS=Object.freeze(['manual','import','mock','api']);
const LEVELS=Object.freeze({low:1,medium:2,high:3});
const DIMENSIONS=Object.freeze(['backlinks','mentions','localCitations','geo','referrals']);
const SAMPLE_LIMIT='La ausencia en una muestra de un proveedor o motor no demuestra ausencia real.';

/* ── A. Service profile and baseline ─────────────────────────────────────── */
/* profile(input, {core, config}): entity, name variants, domain, markets, priority assets,
   host-confirmed competitors and declared sources. Competitors without host confirmation
   stay candidates and are never used for comparisons. A declared source is never
   CONNECTED: verification only comes from a live provider result (CORE-7). */
function profile(input={},{core,config}={}){
  const v=input&&typeof input==='object'?input:{},issues=[];
  let adapter=null,source=null;
  if(core!=null){
    if(typeof core.adapter!=='function'||typeof core.source!=='function')throw new TypeError('core.adapter and core.source must be functions');
    const a=core.adapter(config||{});adapter={id:a.id,schemaType:a.schemaType};source=core.source(config||{})||{};
  }
  const name=text(v.entity?.name)||text(source?.name);
  const variants=uniq([name,...arr(v.entity?.variants).map(text)].filter(Boolean));
  const domain=bareHost(hostOf(v.domain)||text(v.domain).replace(/\/.*$/,''));
  const norm=typeof core?.normalizeLocale==='function'?core.normalizeLocale:(x=>/^[a-z]{2,3}(-[A-Z]{2})?$/.test(text(x))?text(x):'');
  const markets=arr(v.markets).map(m=>({locale:norm(m?.locale),country:text(m?.country).toUpperCase()})).filter(m=>m.locale);
  const competitors=[],candidateCompetitors=[];
  for(const c of arr(v.competitors)){
    const row={name:text(c?.name),domain:bareHost(hostOf(c?.domain)||text(c?.domain)),confirmedAt:isoOrNull(c?.confirmedAt)};
    if(!row.domain&&!row.name)continue;
    (c?.confirmedBy==='host'&&row.confirmedAt?competitors:candidateCompetitors).push(row);
  }
  const sources=arr(v.sources).map(s=>({id:text(s?.id),provider:text(s?.provider),dimension:DIMENSIONS.includes(s?.dimension)?s.dimension:null,method:SOURCE_METHODS.includes(s?.method)?s.method:'manual',connection:'NOT_VERIFIED',limits:arr(s?.limits).map(x=>minimize(x,200)).filter(Boolean)})).filter(s=>s.id&&s.provider);
  if(!name)issues.push('ENTITY_NAME_MISSING');
  if(!domain)issues.push('DOMAIN_MISSING');
  if(!markets.length)issues.push('MARKET_MISSING');
  if(candidateCompetitors.length)issues.push('COMPETITORS_PENDING_HOST_CONFIRMATION');
  return freeze({profile:{id:text(v.id)||hash([name,domain]),vertical:adapter,entity:{name,variants},domain,markets,priorityAssets:arr(v.priorityAssets).map(cleanUrl).filter(Boolean),competitors,candidateCompetitors,sources},issues});
}

/* ── B. Observation: measurements and snapshots ──────────────────────────── */
/* One dimension measurement. Accepts a CORE-7 result envelope (status, provider,
   provenance, data, connection) or a manual/import declaration {status, provider, method,
   capturedAt, coverage, rows}. Without a usable status there are no rows and no counts
   (never zero).
   Trust (CORE-8 review): an object is a CORE-7 result only if the injected providers
   module says it issued it (providers.isTrustedResult). A look-alike object, a serialized
   copy or any declaration is never verified, whatever its method/connection fields say;
   an untrusted envelope is treated as an import. VERIFIED also needs a live ('api')
   provenance and connection:'VERIFIED' on the trusted result. */
function measurement(input,{providers}={}){
  const v=input&&typeof input==='object'?input:{};
  const shaped=!!(v.provenance&&typeof v.provenance==='object'&&'connection' in v);
  const trusted=shaped&&typeof providers?.isTrustedResult==='function'&&providers.isTrustedResult(input)===true;
  const envelope=shaped;
  const status=MEASUREMENT_STATUSES.includes(v.status)?v.status:'NOT_MEASURED';
  const capturedAt=isoOrNull(envelope?v.provenance.capturedAt:v.capturedAt);
  const usable=USABLE.includes(status)&&!!capturedAt;
  const coverage=envelope?(v.partial?'PARTIAL':usable?'COMPLETE_FOR_SOURCE':'NONE'):(['COMPLETE_FOR_SOURCE','PARTIAL'].includes(v.coverage)?v.coverage:usable?'UNKNOWN':'NONE');
  return {
    status:usable?(coverage==='PARTIAL'&&status==='OK'?'PARTIAL':status):(USABLE.includes(status)?'NOT_MEASURED':status),
    provider:text(v.provider),
    method:trusted?(v.provenance.method==='api'?'api':'mock'):envelope?'import':(SOURCE_METHODS.includes(v.method)&&v.method!=='api'?v.method:'manual'),
    trust:trusted?'CORE7_RESULT':envelope?'UNTRUSTED_ENVELOPE':'DECLARED',
    verified:trusted&&v.provenance.method==='api'&&v.connection==='VERIFIED',
    capturedAt,coverage,
    rows:usable?arr(envelope?v.data:v.rows):[]
  };
}
const metric=(value,m,ref)=>({value:m.usable?value:null,status:m.usable?'MEASURED':'NOT_MEASURED',provider:m.provider||null,capturedAt:m.capturedAt,evidenceRef:m.usable?ref:null});

/* mention(input, {releaseE, profile}): Release E mention record + linked/unlinked,
   minimised excerpt and a deterministic entity match on the profile's name variants. */
function mention(input,{releaseE,profile:p}={}){
  if(releaseE==null||typeof releaseE.normalizeMentionRecord!=='function')throw new TypeError('releaseE module must be injected');
  const v=input&&typeof input==='object'?input:{},observedAt=isoOrNull(v.observedAt);
  if(!observedAt||!hostOf(v.sourceUrl))return {ok:false,error:!observedAt?'MISSING_DATE':'INVALID_SOURCE_URL'};
  const base=releaseE.normalizeMentionRecord({...v,sourceUrl:cleanUrl(v.sourceUrl),observedAt,provenance:{...(v.provenance||{}),provider:text(v.provider),capturedAt:observedAt,sourceUrl:cleanUrl(v.sourceUrl)}});
  const excerpt=minimize(v.excerpt);
  const linkTarget=hostOf(v.linkUrl);
  const linked=typeof v.linked==='boolean'?v.linked:linkTarget?hostMatches(linkTarget,p?.domain):null;
  const variants=arr(p?.entity?.variants);
  const entityMatch=!excerpt||!variants.length?'UNKNOWN':namesIn(excerpt,variants)?'NAME_VARIANT':'NOT_FOUND';
  return {ok:true,record:{...base,id:text(v.id)||'mention-'+hash([base.sourceUrl,observedAt]),linked,linkTarget:linkTarget?cleanUrl(v.linkUrl):null,excerpt:excerpt||null,entityMatch}};
}

/* citationConsistency(listings, {core, config}): name/address/phone consistency of local
   listings against the active adapter's source(config). Only statuses are returned (the
   canonical phone or address are not copied). Without local data: NOT_APPLICABLE. */
function citationConsistency(listings,{core,config}={}){
  if(core==null||typeof core.source!=='function')throw new TypeError('core.source must be injected');
  const s=core.source(config||{})||{},street=text(s.address?.streetAddress),city=text(s.address?.addressLocality||s.city),phone=String(s.phone||'').replace(/\D/g,'').slice(-9);
  if(!street&&!phone)return {status:'NOT_APPLICABLE',reason:'NO_LOCAL_NAP_IN_SOURCE',listings:[]};
  const cmp=(a,b)=>!b?'NOT_IN_SOURCE':!a?'MISSING':a===b?'MATCH':'MISMATCH';
  const rows=arr(listings).map(l=>{
    const addr=alnum(l?.address);
    const fields={
      name:cmp(alnum(l?.name),alnum(s.name)),
      address:!street?'NOT_IN_SOURCE':!addr?'MISSING':addr.includes(alnum(street))&&(!city||addr.includes(alnum(city)))?'MATCH':'MISMATCH',
      phone:cmp(String(l?.phone||'').replace(/\D/g,'').slice(-9),phone)
    };
    const vals=Object.values(fields);
    return {provider:text(l?.provider),url:cleanUrl(l?.url),observedAt:isoOrNull(l?.observedAt),method:SOURCE_METHODS.includes(l?.method)&&l.method!=='api'?l.method:'manual',fields,status:vals.includes('MISMATCH')?'INCONSISTENT':vals.includes('MISSING')?'INCOMPLETE':'CONSISTENT'};
  });
  return {status:rows.length?'MEASURED':'NOT_MEASURED',listings:rows};
}

/* snapshot(input, deps): one observation period. Per dimension the measurement status,
   coverage and limits are kept; counts are null when a source did not measure. */
function snapshot(input={},{providers,releaseE,core,config}={}){
  const v=input&&typeof input==='object'?input:{},p=v.profile||{};
  const period={id:text(v.period?.id),start:isoOrNull(v.period?.start),end:isoOrNull(v.period?.end)};
  if(!period.id||!period.start||!period.end||period.end<period.start)throw new Error('snapshot period requires id, start and end (end >= start)');
  const id='snap-'+text(p.id)+'-'+period.id,evidence=[],limits=[SAMPLE_LIMIT],out={id,profileId:text(p.id),period,dimensions:{}};
  const register=(dim,m,extra={})=>{m.usable=USABLE.includes(m.status)&&!!m.capturedAt;const ref=id+':'+dim;if(m.usable)evidence.push({id:ref,dimension:dim,provider:m.provider,method:m.method,verified:m.verified,trust:m.trust,trust:m.trust,capturedAt:m.capturedAt,coverage:m.coverage,...extra});return ref;};
  // Backlinks: CORE-7 normalizeBacklinks is the only row normaliser.
  if(v.backlinks){
    if(providers==null||typeof providers.normalizeBacklinks!=='function')throw new TypeError('providers module must be injected for backlinks');
    const m=measurement(v.backlinks,{providers}),n=providers.normalizeBacklinks(m.rows,{measuredAt:m.capturedAt,provider:m.provider});
    if(n.rejected&&m.coverage!=='NONE'){m.coverage='PARTIAL';if(m.status==='OK')m.status='PARTIAL';}
    const ref=register('backlinks',m,{rejectedRows:n.rejected}),live=n.rows.filter(r=>r.lost!==true);
    out.dimensions.backlinks={status:m.status,provider:m.provider,method:m.method,verified:m.verified,trust:m.trust,capturedAt:m.capturedAt,coverage:m.coverage,rejectedRows:n.rejected,rows:n.rows,
      metrics:{backlinks:metric(live.length,m,ref),referringDomains:metric(uniq(live.map(r=>r.sourceDomain)).length,m,ref),targets:metric(uniq(live.map(r=>r.targetUrl)).length,m,ref),reportedLost:metric(n.rows.length-live.length,m,ref)}};
  }
  if(v.mentions){
    const m=measurement(v.mentions,{providers}),records=[],rejected=[];
    for(const row of m.rows){const r=mention({...row,provider:row?.provider||m.provider},{releaseE,profile:p});r.ok?records.push(r.record):rejected.push(r.error);}
    if(rejected.length&&m.coverage!=='NONE'){m.coverage='PARTIAL';if(m.status==='OK')m.status='PARTIAL';}
    const ref=register('mentions',m,{rejectedRows:rejected.length});
    out.dimensions.mentions={status:m.status,provider:m.provider,method:m.method,verified:m.verified,trust:m.trust,capturedAt:m.capturedAt,coverage:m.coverage,rejectedRows:rejected.length,records,
      metrics:{mentions:metric(records.length,m,ref),linked:metric(records.filter(r=>r.linked===true).length,m,ref),unlinked:metric(records.filter(r=>r.linked===false).length,m,ref),linkStatusUnknown:metric(records.filter(r=>r.linked===null).length,m,ref)}};
  }
  if(v.localCitations){
    const m=measurement(v.localCitations,{providers}),c=m.status==='NOT_MEASURED'&&!m.rows.length?{status:'NOT_MEASURED',listings:[]}:citationConsistency(m.rows,{core,config});
    const applicable=c.status!=='NOT_APPLICABLE';if(!applicable)m.status='NOT_MEASURED';
    const ref=register('localCitations',m);
    out.dimensions.localCitations={status:applicable?m.status:'NOT_APPLICABLE',provider:m.provider,method:m.method,capturedAt:m.capturedAt,coverage:m.coverage,listings:c.listings,
      metrics:{listings:metric(c.listings.length,m,ref),consistent:metric(c.listings.filter(l=>l.status==='CONSISTENT').length,m,ref),inconsistent:metric(c.listings.filter(l=>l.status==='INCONSISTENT').length,m,ref)}};
  }
  if(v.geo){
    const summary=v.geo.summary||null;
    const ok=summary&&summary.status==='MEASURED';
    if(ok)evidence.push({id:id+':geo',dimension:'geo',querySetHash:summary.querySet.hash,capturedAt:summary.window?.to||null,method:summary.methods.join('+')});
    out.dimensions.geo={status:ok?'MEASURED':'NOT_MEASURED',summary:summary?clone(summary):null,evidenceRef:ok?id+':geo':null};
  }
  // Referral traffic is its own dimension: never merged into GEO observations or outcomes.
  if(v.referrals){
    const m=measurement(v.referrals,{providers}),rows=m.rows.map(r=>({source:fold(r?.source),medium:fold(r?.medium),sessions:Number.isFinite(Number(r?.sessions))&&r?.sessions!==''&&r?.sessions!=null?Number(r.sessions):null,landingPage:cleanUrl(r?.landingPage)||null})).filter(r=>r.source&&r.sessions!=null);
    const ref=register('referrals',m),ai=rows.filter(r=>/(^|\.)chatgpt\.com$|perplexity\.ai$|copilot\.microsoft\.com$|gemini\.google\.com$/.test(r.source));
    out.dimensions.referrals={status:m.status,provider:m.provider,method:m.method,capturedAt:m.capturedAt,coverage:m.coverage,rows,
      metrics:{aiReferralSessions:metric(ai.reduce((a,r)=>a+r.sessions,0),m,ref),chatgptSessions:metric(ai.filter(r=>/chatgpt\.com$/.test(r.source)).reduce((a,r)=>a+r.sessions,0),m,ref)},
      note:'ChatGPT añade utm_source=chatgpt.com a sus enlaces de referencia (FAQ de OpenAI). Es tráfico observado, no visibilidad ni resultado de negocio.'};
  }
  for(const d of Object.keys(out.dimensions)){const x=out.dimensions[d];if(x.coverage==='PARTIAL')limits.push(`${d}: cobertura parcial del proveedor.`);if(x.status&&!USABLE.includes(x.status)&&x.status!=='MEASURED')limits.push(`${d}: ${x.status}.`);}
  out.evidence=evidence;out.limits=limits;
  return freeze(out);
}

/* compareSnapshots(previous, current): per-dimension comparison only when both periods
   measured the dimension with the same provider and the current period is later. Links not
   seen again are "notSeen" (verify before calling them lost); only a provider's explicit
   lost flag counts as lost. Without any comparable dimension, "no relevant changes" is null
   (unknown), never true. */
function compareSnapshots(prev,curr){
  if(!prev?.period||!curr?.period)throw new TypeError('two snapshots are required');
  const out={previous:prev.id,current:curr.id,dimensions:{},relevantChanges:[]};
  const later=curr.period.start>=prev.period.end;
  for(const d of DIMENSIONS){
    const a=prev.dimensions?.[d],b=curr.dimensions?.[d];
    const measured=x=>x&&(USABLE.includes(x.status)||x.status==='MEASURED');
    let reason=null;
    if(!measured(a))reason='NOT_MEASURED_PREVIOUS';else if(!measured(b))reason='NOT_MEASURED_CURRENT';
    else if(!later)reason='SAME_OR_EARLIER_PERIOD';
    else if(d!=='geo'&&a.provider!==b.provider)reason='PROVIDER_CHANGED';
    else if(d==='geo'&&a.summary.querySet.hash!==b.summary.querySet.hash)reason='QUERY_SET_CHANGED';
    if(reason){out.dimensions[d]={comparable:false,reason};continue;}
    const res={comparable:true,partial:a.coverage==='PARTIAL'||b.coverage==='PARTIAL',deltas:{}};
    for(const [k,m] of Object.entries(b.metrics||{})){const pv=a.metrics?.[k]?.value,cv=m.value;res.deltas[k]=pv==null||cv==null?null:{previous:pv,current:cv,delta:cv-pv};}
    if(d==='backlinks'){
      const key=r=>r.sourceUrl+'|'+r.targetUrl,pa=new Map(a.rows.filter(r=>r.lost!==true).map(r=>[key(r),r])),cb=new Map(b.rows.map(r=>[key(r),r]));
      res.newLinks=[...cb.values()].filter(r=>r.lost!==true&&!pa.has(key(r))).map(r=>({sourceUrl:r.sourceUrl,targetUrl:r.targetUrl,rel:r.rel}));
      res.lostLinks=[...pa.values()].filter(r=>cb.get(key(r))?.lost===true).map(r=>({sourceUrl:r.sourceUrl,targetUrl:r.targetUrl,basis:'PROVIDER_LOST_FLAG'}));
      res.notSeen=[...pa.values()].filter(r=>!cb.has(key(r))).map(r=>({sourceUrl:r.sourceUrl,targetUrl:r.targetUrl,note:'No aparece en la muestra actual; verificar antes de darlo por perdido.'}));
      const da=new Set(a.rows.filter(r=>r.lost!==true).map(r=>r.sourceDomain)),db=new Set(b.rows.filter(r=>r.lost!==true).map(r=>r.sourceDomain));
      res.newReferringDomains=[...db].filter(x=>!da.has(x)).sort();res.referringDomainsNotSeen=[...da].filter(x=>!db.has(x)).sort();
      if(res.newLinks.length||res.lostLinks.length||res.notSeen.length)out.relevantChanges.push('backlinks');
    }else if(d==='geo'){
      res.geo=compareGeo(a.summary,b.summary);
      if(res.geo.groups.some(g=>g.change==='UP'||g.change==='DOWN'))out.relevantChanges.push('geo');
    }else if(Object.values(res.deltas).some(x=>x&&x.delta!==0))out.relevantChanges.push(d);
    out.dimensions[d]=res;
  }
  const comparable=Object.values(out.dimensions).filter(x=>x.comparable);
  out.noRelevantChanges=comparable.length?out.relevantChanges.length===0:null;
  out.limits=[SAMPLE_LIMIT,...Object.entries(out.dimensions).filter(([,x])=>!x.comparable).map(([d,x])=>`${d}: no comparable (${x.reason}).`)];
  return freeze(out);
}

/* ── B. GEO off-page observations (observational, not an official technique) ─ */
/* querySet({id, version, queries, controls}): versioned, hashed query set. Controls are
   fictitious brand names used to detect hallucinated mentions. */
function querySet(input={}){
  const v=input&&typeof input==='object'?input:{},issues=[];
  const id=text(v.id),version=text(v.version);
  if(!id||!version)throw new Error('querySet requires id and version');
  const seen=new Set(),queries=[];
  for(const q of arr(v.queries)){
    const row={id:text(q?.id),text:minimize(q?.text,300),locale:text(q?.locale),market:text(q?.market).toUpperCase(),intent:text(q?.intent)||'unspecified',branded:q?.branded===true,origin:['search-console','people-also-ask','host','manual','llm-generated'].includes(q?.origin)?q.origin:'manual'};
    if(!row.id||!row.text||!row.locale){issues.push('INVALID_QUERY');continue;}
    if(seen.has(row.id)){issues.push('DUPLICATE_QUERY_ID');continue;}
    seen.add(row.id);queries.push(row);
  }
  if(!queries.length)throw new Error('querySet requires at least one valid query');
  if(queries.every(q=>q.origin==='llm-generated'))issues.push('ONLY_LLM_GENERATED_QUERIES');
  const controls=uniq(arr(v.controls).map(text).filter(Boolean));
  return freeze({id,version,hash:hash({id,version,queries,controls}),queries,controls,issues});
}

const GEO_METHODS=Object.freeze(['manual','import','mock','api']);
/* geoRun(input, {querySet, profile, providers}): one run of one query on one engine.
   Scraping or any undeclared method is rejected (no scraping against terms of service).
   No answer shown is its own outcome (NO_ANSWER), never a zero.
   - Locale and market are those of the query: a run declaring another locale/market is
     rejected (LOCALE_MARKET_MISMATCH), so groups are exact intersections.
   - A run is verified only when it carries a CORE-7 result the injected providers module
     issued (providerResult), live ('api') and connection:'VERIFIED'. Declared
     method/connection fields never make a run verified. */
function geoRun(input,{querySet:qs,profile:p,providers}={}){
  if(!qs?.hash)throw new TypeError('querySet must be injected');
  const v=input&&typeof input==='object'?input:{},reject=code=>({ok:false,error:code});
  if(!GEO_METHODS.includes(v.method))return reject('METHOD_NOT_ALLOWED');
  if(text(v.querySetId)!==qs.id||text(v.querySetVersion)!==qs.version)return reject('QUERY_SET_VERSION_MISMATCH');
  const q=qs.queries.find(x=>x.id===text(v.queryId));
  if(!q)return reject('UNKNOWN_QUERY');
  if((text(v.locale)&&text(v.locale)!==q.locale)||(text(v.market)&&text(v.market).toUpperCase()!==q.market))return reject('LOCALE_MARKET_MISMATCH');
  const runAt=isoOrNull(v.runAt);
  if(!runAt)return reject('MISSING_DATE');
  if(!text(v.engine))return reject('MISSING_ENGINE');
  const pr=v.providerResult,trusted=!!pr&&typeof providers?.isTrustedResult==='function'&&providers.isTrustedResult(pr)===true;
  const base={querySetHash:qs.hash,queryId:q.id,engine:text(v.engine),surface:v.surface==='consumer-ui'?'consumer-ui':'api',model:text(v.model)||null,
    locale:q.locale,market:q.market,runAt,runIndex:Number.isInteger(v.runIndex)?v.runIndex:null,method:v.method,
    trust:trusted?'CORE7_RESULT':'DECLARED',verified:trusted&&v.method==='api'&&pr.provenance?.method==='api'&&pr.connection==='VERIFIED'};
  if(v.status==='ERROR')return {ok:true,run:{...base,outcome:'ERROR',mentioned:null,detection:'NONE',controlsMentioned:[],citations:[],citationsCaptured:false,cited:null,answerExcerpt:null}};
  const answerShown=v.answerShown===false?false:v.answerShown===true||!!text(v.answerText)?true:null;
  const answer=fold(v.answerText),found=names=>namesIn(answer,names);
  let mentioned=null,detection='NONE';
  if(answerShown===false)mentioned=false;
  else if(answer){mentioned=found(arr(p?.entity?.variants));detection='TEXT_MATCH';}
  else if(typeof v.mentioned==='boolean'){mentioned=v.mentioned;detection='DECLARED';}
  const citations=arr(v.citations).map(c=>{const url=cleanUrl(c?.url),host=hostOf(url);if(!host)return null;const pos=Number(c?.position);return {url,domain:bareHost(host),position:Number.isInteger(pos)&&pos>=1?pos:null,own:hostMatches(host,p?.domain),competitor:arr(p?.competitors).some(k=>hostMatches(host,k.domain))};}).filter(Boolean);
  const citationsCaptured=answerShown===false||Array.isArray(v.citations);
  return {ok:true,run:{...base,
    outcome:answerShown===false?'NO_ANSWER':answerShown?'ANSWER':'UNKNOWN',
    mentioned,detection,controlsMentioned:answer?qs.controls.filter(c=>found([c])):[],
    citations,citationsCaptured,cited:citationsCaptured?citations.some(c=>c.own):null,
    answerExcerpt:v.answerText?minimize(v.answerText,300):null
  }};
}

/* Wilson score interval (95%) for a proportion: deterministic; runs of the same query are
   correlated, so the interval is optimistic and reported as such. */
function wilson(k,n){if(!n)return null;const z=1.96,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return {low:Math.max(0,+(c-h).toFixed(4)),high:Math.min(1,+(c+h).toFixed(4))};}
const rate=(k,n)=>n?{value:+(k/n).toFixed(4),k,n,ci95:wilson(k,n)}:{value:null,k:0,n:0,ci95:null};
const GEO_GROUP_KEYS=Object.freeze(['engine','surface','locale','market']);
const groupKey=r=>GEO_GROUP_KEYS.map(k=>r[k]||'').join('|');

/* summarizeGeo(runs, {querySet, minRunsPerQuery}): distribution, range and variability per
   engine × surface × locale × market. Coverage and repetitions are computed only over the
   queries of that exact locale+market; ERROR and NO_ANSWER runs never count as usable
   answers. Observational metrics only (not referral traffic, not business outcome). */
function summarizeGeo(runs,{querySet:qs,minRunsPerQuery=3}={}){
  if(!qs?.hash)throw new TypeError('querySet must be injected');
  const valid=arr(runs).filter(r=>r&&r.querySetHash===qs.hash);
  const base={querySet:{id:qs.id,version:qs.version,hash:qs.hash},groupBy:[...GEO_GROUP_KEYS],limits:[SAMPLE_LIMIT,'Métrica observacional: no es tráfico de referencia ni resultado de negocio.','Las ejecuciones de una misma consulta están correlacionadas; el intervalo es orientativo.','Una API y una interfaz de consumo no son observaciones equivalentes; se agrupan por separado.']};
  if(!valid.length)return freeze({...base,status:'NOT_MEASURED',groups:[],methods:[],window:null});
  const groups=new Map();
  for(const r of valid){const k=groupKey(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  const out=[];
  for(const [k,rs] of [...groups.entries()].sort(([a],[b])=>a<b?-1:1)){
    const [engine,surface,locale,market]=k.split('|');
    const answered=rs.filter(r=>r.outcome==='ANSWER'),errors=rs.filter(r=>r.outcome==='ERROR').length,noAnswer=rs.filter(r=>r.outcome==='NO_ANSWER').length;
    const known=answered.filter(r=>r.mentioned!==null),citedKnown=answered.filter(r=>r.cited!==null);
    const inGroup=qs.queries.filter(q=>q.locale===locale&&q.market===market);
    const perQuery=inGroup.map(q=>{const qr=answered.filter(r=>r.queryId===q.id);const qk=qr.filter(r=>r.mentioned!==null);const m=qk.filter(r=>r.mentioned).length;return {queryId:q.id,runs:rs.filter(r=>r.queryId===q.id).length,answered:qr.length,mentioned:m,mentionRate:qk.length?+(m/qk.length).toFixed(4):null,consistent:qk.length<2?null:(m===0||m===qk.length)};});
    const rates=perQuery.map(q=>q.mentionRate).filter(x=>x!=null);
    const positions=answered.flatMap(r=>r.citations.filter(c=>c.own&&c.position!=null).map(c=>c.position)).sort((a,b)=>a-b);
    const queriesAnswered=perQuery.filter(q=>q.answered>0).length;
    const minUsable=perQuery.length?Math.min(...perQuery.map(q=>q.answered)):0;
    const coverage=inGroup.length?+(queriesAnswered/inGroup.length).toFixed(4):0;
    const controls=answered.reduce((a,r)=>a+r.controlsMentioned.length,0);
    const models=uniq(rs.map(r=>r.model).filter(Boolean)).sort(),methods=uniq(rs.map(r=>r.method)).sort();
    const cons=perQuery.filter(q=>q.consistent!==null);
    const flags=[];
    if(minUsable<minRunsPerQuery)flags.push('FEW_RUNS_PER_QUERY');
    if(coverage<1)flags.push('INCOMPLETE_QUERY_COVERAGE');
    if(controls)flags.push('HALLUCINATED_CONTROL_MENTIONS');
    if(models.length>1)flags.push('MODEL_CHANGED_WITHIN_WINDOW');
    if(!models.length)flags.push('MODEL_NOT_EXPOSED');
    if(methods.length>1)flags.push('MIXED_METHODS');
    if(rs.some(r=>!r.verified))flags.push('UNVERIFIED_OBSERVATIONS');
    out.push({engine,surface,locale,market,models,methods,runs:rs.length,validRuns:rs.length-errors,answered:answered.length,noAnswer,errors,
      queriesInGroup:inGroup.length,queriesAnswered,queryCoverage:coverage,minUsableAnswersPerQuery:minUsable,
      mentionRate:rate(known.filter(r=>r.mentioned).length,known.length),ownCitationRate:rate(citedKnown.filter(r=>r.cited).length,citedKnown.length),
      perQueryRange:rates.length?{min:Math.min(...rates),max:Math.max(...rates)}:null,
      variability:cons.length?{inconsistentQueries:cons.filter(q=>!q.consistent).length,of:cons.length}:null,
      ownCitationPositions:positions.length?{min:positions[0],max:positions[positions.length-1],median:positions[Math.floor((positions.length-1)/2)]}:null,
      topCitedDomains:Object.entries(answered.flatMap(r=>uniq(r.citations.map(c=>c.domain))).reduce((a,d)=>(a[d]=(a[d]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).slice(0,10).map(([domain,runs])=>({domain,runs})),
      perQuery,confidence:flags.some(f=>['FEW_RUNS_PER_QUERY','INCOMPLETE_QUERY_COVERAGE','HALLUCINATED_CONTROL_MENTIONS','MODEL_CHANGED_WITHIN_WINDOW','MIXED_METHODS'].includes(f))||answered.length<10?'low':'medium',flags});
  }
  const times=valid.map(r=>r.runAt).sort();
  return freeze({...base,status:'MEASURED',methods:uniq(valid.map(r=>r.method)).sort(),window:{from:times[0],to:times[times.length-1]},groups:out});
}

/* compareGeo(previous, current): groups are matched on engine × surface × locale × market.
   A series is NOT_COMPARABLE (with reason) when the query set, surface, model (or a model
   change inside a window) or observation method differ; only then the 95% intervals are
   compared: UP/DOWN when they do not overlap, WITHIN_NOISE otherwise. */
function compareGeo(a,b){
  if(!a||!b||a.status!=='MEASURED'||b.status!=='MEASURED')return {comparable:false,reason:'NOT_MEASURED',groups:[]};
  if(a.querySet.hash!==b.querySet.hash)return {comparable:false,reason:'QUERY_SET_CHANGED',groups:[]};
  const groups=b.groups.map(g=>{
    const id={engine:g.engine,surface:g.surface,locale:g.locale,market:g.market};
    const nc=reason=>({...id,change:'NOT_COMPARABLE',reason,previous:null,current:g.mentionRate.value});
    const p=a.groups.find(x=>groupKey(x)===groupKey(g));
    if(!p)return nc(a.groups.some(x=>x.engine===g.engine&&x.locale===g.locale&&x.market===g.market)?'SURFACE_CHANGED':'NO_PREVIOUS_GROUP');
    if(p.models.length>1||g.models.length>1)return nc('MODEL_CHANGED_WITHIN_WINDOW');
    if(stable(p.models)!==stable(g.models))return nc('MODEL_CHANGED');
    if(stable(p.methods)!==stable(g.methods))return nc('METHOD_CHANGED');
    const x=p.mentionRate.ci95,y=g.mentionRate.ci95;
    if(!x||!y)return nc('NO_USABLE_ANSWERS');
    return {...id,previous:p.mentionRate.value,current:g.mentionRate.value,change:y.low>x.high?'UP':y.high<x.low?'DOWN':'WITHIN_NOISE',modelExposed:g.models.length>0};
  });
  return {comparable:groups.some(g=>g.change!=='NOT_COMPARABLE'),groups};
}

/* aiCrawlerAccess({robotsText, metaRobots, httpStatus}, {intelligence, at}): access check
   for AI search/training crawlers, reusing Release C crawlerAudit/parseRobots. Meaning
   notes follow the official docs; no undocumented ranking factor is inferred. */
const CRAWLER_NOTES=Object.freeze({
  'OAI-SearchBot':'Controla la inclusión en ChatGPT search (FAQ de OpenAI para editores).',
  'GPTBot':'Solo entrenamiento de modelos de OpenAI; no afecta a ChatGPT search.',
  'Google-Extended':'Entrenamiento y grounding de Gemini; no afecta a Google Search.',
  'PerplexityBot':'Rastreo para resultados de Perplexity; respeta robots.txt (Perplexity-User generalmente no).'
});
function aiCrawlerAccess(input={},{intelligence,at}={}){
  if(intelligence==null||typeof intelligence.crawlerAudit!=='function'||typeof intelligence.parseRobots!=='function')throw new TypeError('intelligence module must be injected');
  const checkedAt=isoOrNull(at);if(!checkedAt)throw new Error('aiCrawlerAccess requires an explicit date (at)');
  const audit=intelligence.crawlerAudit(input),out={};
  for(const c of ['OAI-SearchBot','GPTBot','Google-Extended'])out[c]={crawler:c,allowed:audit[c].allowed,status:audit[c].status,matchedUserAgent:audit[c].evidence.matchedUserAgent,checkedAt,note:CRAWLER_NOTES[c]};
  const groups=intelligence.parseRobots(input.robotsText),specific=groups.filter(g=>g.agents.includes('perplexitybot')),chosen=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const blocked=chosen.flatMap(g=>g.disallow).some(x=>x==='/'||x==='/*')&&!chosen.flatMap(g=>g.allow).includes('/');
  out.PerplexityBot={crawler:'PerplexityBot',allowed:!blocked,status:Number(input.httpStatus)>=400?'ERROR':blocked?'BLOCKED':'ALLOWED',matchedUserAgent:specific.length?'perplexitybot':'*',checkedAt,note:CRAWLER_NOTES.PerplexityBot};
  const warnings=[];if(!out['OAI-SearchBot'].allowed)warnings.push('OAI-SearchBot bloqueado: la página puede seguir mostrándose solo como enlace y título; para excluirla hace falta noindex con el rastreador permitido.');
  return freeze({checkedAt,crawlers:out,warnings,source:'robots.txt/meta robots/HTTP (declarado por el host)'});
}

/* ── C. Opportunities and plan ───────────────────────────────────────────── */
const OPPORTUNITY_TYPES=Object.freeze(['unlinked-mention','lost-link-recovery','broken-link-reclaim','resource-inclusion','digital-pr','original-research','citable-resource','partner','community','local-citation-fix','profile-consistency','ai-visibility-gap','crawler-access','content-improvement','monitor-only']);
const NON_LINK_TYPES=Object.freeze(['local-citation-fix','profile-consistency','ai-visibility-gap','crawler-access','content-improvement','monitor-only','original-research','community']);
/* Tactics against Google/Bing spam policies or platform rules: never modelled as work. */
const PROHIBITED_TACTICS=Object.freeze(['link-purchase','link-exchange','private-blog-network','automated-links','mass-submission','fake-review','review-incentive','review-gating','artificial-mention','ugc-seeding','scaled-content','site-reputation-abuse','expired-domain-abuse','hidden-links','sponsored-without-rel']);
const DEFAULT_WEIGHTS=Object.freeze({relevance:3,confidence:2,effort:1,risk:2});
const lvl=x=>LEVELS[x]||null;

/* opportunity(input, {evidenceIds, weights}): validated opportunity with a transparent
   heuristic score (never an official Google signal). Prohibited tactics, unqualified paid
   links and link/contact quotas are refused. Without resolvable evidence the opportunity is
   kept as NEEDS_EVIDENCE with low confidence. */
function opportunity(input,{evidenceIds,weights=DEFAULT_WEIGHTS}={}){
  const v=input&&typeof input==='object'?input:{},refuse=code=>freeze({ok:false,error:{code,type:text(v.type)||null}});
  if(PROHIBITED_TACTICS.includes(v.type)||PROHIBITED_TACTICS.includes(v.tactic))return refuse('PROHIBITED_TACTIC');
  if(v.paid===true&&!['sponsored','nofollow'].includes(text(v.linkRel)))return refuse('PAID_LINK_WITHOUT_QUALIFICATION');
  if(v.linkQuota!=null||v.contactQuota!=null)return refuse('QUOTAS_NOT_ALLOWED');
  if(!OPPORTUNITY_TYPES.includes(v.type))return refuse('UNKNOWN_TYPE');
  const id=text(v.id);if(!id)return refuse('MISSING_ID');
  const known=Array.isArray(evidenceIds)?new Set(evidenceIds):null;
  const refs=uniq(arr(v.evidenceRefs).map(text).filter(Boolean)),validRefs=known?refs.filter(r=>known.has(r)):refs,unknownRefs=refs.filter(r=>!validRefs.includes(r));
  const supported=validRefs.length>0;
  const factors={relevance:lvl(v.relevance),effort:lvl(v.effort),risk:lvl(v.risk),confidence:supported?lvl(v.confidence):1};
  const scored=Object.values(factors).every(Boolean);
  const w={...DEFAULT_WEIGHTS,...weights};
  const score=scored?w.relevance*factors.relevance+w.confidence*factors.confidence-w.effort*factors.effort-w.risk*factors.risk:null;
  const names=['low','medium','high'],word={relevance:'relevancia',effort:'esfuerzo',risk:'riesgo',confidence:'confianza'};
  const reason=scored?Object.entries(factors).map(([k,x])=>`${word[k]} ${names[x-1]}`).join(', ')+(supported?'':' (sin evidencia suficiente)')+'. Heurística interna, no es una señal de Google.':'Sin puntuar: faltan factores (relevancia, esfuerzo, riesgo o confianza).';
  return freeze({ok:true,opportunity:{
    id,type:v.type,nonLink:NON_LINK_TYPES.includes(v.type),problem:minimize(v.problem,400)||null,goal:minimize(v.goal,400)||null,
    source:text(v.source)||null,observedAt:isoOrNull(v.observedAt),targetAsset:cleanUrl(v.targetAsset)||null,
    evidenceRefs:validRefs,unknownEvidenceRefs:unknownRefs,evidenceStatus:supported?'SUPPORTED':'INSUFFICIENT',
    state:supported?'CANDIDATE':'NEEDS_EVIDENCE',
    relevance:v.relevance||null,effort:v.effort||null,risk:v.risk||null,confidence:supported?(v.confidence||null):'low',
    flags:uniq([...(v.competitor===true?['competitor-site']:[]),...(v.ugc===true?['ugc-not-for-outreach']:[]),...(v.paid===true?['paid-placement-qualified']:[])]),
    score,scoreLabel:'HEURISTIC',weights:w,priorityReason:reason
  }});
}
/* prioritize(opportunities): deterministic order (score desc, unscored last, id asc). */
function prioritize(list,{weights=DEFAULT_WEIGHTS}={}){
  const items=arr(list).filter(o=>o&&o.id).slice().sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||(a.id<b.id?-1:1));
  return freeze({items:clone(items),weights:{...DEFAULT_WEIGHTS,...weights},label:'HEURISTIC',note:'Priorización transparente e interna; no es un factor ni una señal oficial de Google. Sin cuotas de enlaces ni de contactos.'});
}

/* ── D. Campaigns, actions and longitudinal tracking ─────────────────────── */
const ACTION_STATES=Object.freeze(['PROPOSED','REVIEWED','APPROVED','IN_PROGRESS','AWAITING_RESPONSE','EXECUTED','VERIFICATION_PENDING','COMPLETED','REJECTED','CANCELLED']);
const ACTION_STATE_LABELS=Object.freeze({PROPOSED:'propuesta',REVIEWED:'revisada',APPROVED:'aprobada',IN_PROGRESS:'en curso',AWAITING_RESPONSE:'esperando respuesta',EXECUTED:'publicada/ejecutada',VERIFICATION_PENDING:'verificación pendiente',COMPLETED:'completada',REJECTED:'rechazada',CANCELLED:'cancelada'});
const TRANSITIONS=freeze({
  PROPOSED:['REVIEWED','REJECTED','CANCELLED'],
  REVIEWED:['APPROVED','REJECTED','CANCELLED','PROPOSED'],
  APPROVED:['IN_PROGRESS','CANCELLED','REVIEWED'],
  IN_PROGRESS:['AWAITING_RESPONSE','EXECUTED','CANCELLED'],
  AWAITING_RESPONSE:['IN_PROGRESS','EXECUTED','CANCELLED'],
  EXECUTED:['VERIFICATION_PENDING','COMPLETED'],
  VERIFICATION_PENDING:['COMPLETED','IN_PROGRESS'],
  COMPLETED:[],
  REJECTED:['PROPOSED'],
  CANCELLED:['PROPOSED']
});
const OPEN_STATES=Object.freeze(['PROPOSED','REVIEWED','APPROVED','IN_PROGRESS','AWAITING_RESPONSE','EXECUTED','VERIFICATION_PENDING']);
const DONE_STATES=Object.freeze(['EXECUTED','VERIFICATION_PENDING','COMPLETED']);
/* Acting on behalf of the client outside the Core always needs explicit human approval. */
const EXTERNAL_KINDS=Object.freeze(['send-email','send-message','publish-content','edit-external-profile','paid-placement','business-change','reputation-change','directory-submission','external-decision']);
const INTERNAL_KINDS=Object.freeze(['analysis','draft','internal-review','monitoring','measurement','content-proposal','verification']);
const HUMAN_ONLY=Object.freeze(['REVIEWED','APPROVED','REJECTED','COMPLETED','CANCELLED']);
const REASON_REQUIRED=Object.freeze(['REJECTED','CANCELLED']);

/* action(input): a proposed action linked to a goal and, when it exists, an opportunity
   and a campaign. AI may only propose (origin 'ai-suggestion'). */
function action(input){
  const v=input&&typeof input==='object'?input:{},refuse=code=>freeze({ok:false,error:{code}});
  if(PROHIBITED_TACTICS.includes(v.kind)||PROHIBITED_TACTICS.includes(v.tactic))return refuse('PROHIBITED_TACTIC');
  const kind=text(v.kind);if(!EXTERNAL_KINDS.includes(kind)&&!INTERNAL_KINDS.includes(kind))return refuse('UNKNOWN_KIND');
  if(kind==='paid-placement'&&!['sponsored','nofollow'].includes(text(v.linkRel)))return refuse('PAID_LINK_WITHOUT_QUALIFICATION');
  if(v.bulk===true||Number(v.recipients)>1)return refuse('MASS_ACTION_NOT_ALLOWED');
  const id=text(v.id),goal=minimize(v.goal,400),createdAt=isoOrNull(v.createdAt);
  if(!id)return refuse('MISSING_ID');if(!goal)return refuse('MISSING_GOAL');if(!createdAt)return refuse('MISSING_DATE');
  return freeze({ok:true,action:{id,kind,external:EXTERNAL_KINDS.includes(kind),goal,opportunityId:text(v.opportunityId)||null,campaignId:text(v.campaignId)||null,period:text(v.period)||null,
    origin:v.origin==='ai-suggestion'?'ai-suggestion':'human',draftRef:text(v.draftRef)||null,linkRel:text(v.linkRel)||null,
    state:'PROPOSED',approval:null,executionEvidence:null,result:null,createdAt,history:[{from:null,to:'PROPOSED',at:createdAt,actor:{role:v.origin==='ai-suggestion'?'ai':'human',id:text(v.createdBy)||null},reason:null}]}});
}

/* transition(action, to, {at, actor:{role:'human'|'system', id}, reason, approval,
   evidence}): immutable, auditable state change. AI never transitions. Review, approval,
   rejection, cancellation and completion are human. External actions need a standing
   human approval to start, execution evidence to be EXECUTED and verified result evidence
   to be COMPLETED. Revoking an approval or reopening needs a reason; history is kept. */
function transition(current,to,{at,actor,reason,approval,evidence}={}){
  const fail=code=>freeze({ok:false,error:{code,from:current?.state||null,to},action:current||null});
  if(!current||!ACTION_STATES.includes(current.state))return fail('INVALID_ACTION');
  if(!ACTION_STATES.includes(to))return fail('UNKNOWN_STATE');
  if(!TRANSITIONS[current.state].includes(to))return fail('TRANSITION_NOT_ALLOWED');
  const when=isoOrNull(at),role=actor?.role;
  if(!when)return fail('MISSING_DATE');
  if(when<current.history[current.history.length-1].at)return fail('DATE_BEFORE_LAST_TRANSITION');
  if(role==='ai')return fail('AI_CANNOT_TRANSITION');
  if(role!=='human'&&role!=='system')return fail('UNKNOWN_ACTOR');
  if(HUMAN_ONLY.includes(to)&&role!=='human')return fail('HUMAN_REQUIRED');
  const why=minimize(reason,300);
  const reopening=to==='PROPOSED',revoking=current.state==='APPROVED'&&to==='REVIEWED';
  if((REASON_REQUIRED.includes(to)||reopening||revoking)&&!why)return fail('REASON_REQUIRED');
  const next=clone(current);
  if(to==='APPROVED'){
    const scope=minimize(approval?.scope,300);
    if(!scope)return fail('APPROVAL_SCOPE_REQUIRED');
    next.approval={by:text(actor.id)||null,at:when,scope};
  }
  if(revoking||reopening)next.approval=null;
  if(current.external&&['IN_PROGRESS','AWAITING_RESPONSE','EXECUTED'].includes(to)&&!next.approval)return fail('HUMAN_APPROVAL_REQUIRED');
  if(to==='EXECUTED'){
    const ref=cleanUrl(evidence?.url)||text(evidence?.ref);
    if(!ref||!isoOrNull(evidence?.at))return fail('EXECUTION_EVIDENCE_REQUIRED');
    next.executionEvidence={ref,at:isoOrNull(evidence.at),note:minimize(evidence.note,300)||null};
  }
  if(to==='COMPLETED'){
    const verifiedAt=isoOrNull(evidence?.verifiedAt),method=text(evidence?.method),res=minimize(evidence?.result,400);
    if(!next.executionEvidence)return fail('EXECUTION_EVIDENCE_REQUIRED');
    if(!verifiedAt||!method||!res)return fail('VERIFIED_RESULT_REQUIRED');
    next.result={summary:res,verifiedAt,method,ref:cleanUrl(evidence.url)||text(evidence.ref)||null,rel:text(evidence.rel)||null};
  }
  if(current.state==='VERIFICATION_PENDING'&&to==='IN_PROGRESS'&&!why)return fail('REASON_REQUIRED');
  next.state=to;
  next.history.push({from:current.state,to,at:when,actor:{role,id:text(actor.id)||null},reason:why||null});
  return freeze({ok:true,action:next});
}

/* campaign(input) and campaignProgress(campaign, actions): a campaign may span periods;
   progress keeps the chain goal → action → execution evidence → verified result. */
function campaign(input){
  const v=input&&typeof input==='object'?input:{};
  const id=text(v.id),goal=minimize(v.goal,400),startPeriod=text(v.startPeriod);
  if(!id||!goal||!startPeriod)return freeze({ok:false,error:{code:'CAMPAIGN_REQUIRES_ID_GOAL_START'}});
  return freeze({ok:true,campaign:{id,goal,startPeriod,endPeriod:text(v.endPeriod)||null,opportunityIds:uniq(arr(v.opportunityIds).map(text).filter(Boolean)),successCriteria:minimize(v.successCriteria,400)||null}});
}
function campaignProgress(c,actions){
  const own=arr(actions).filter(a=>a&&a.campaignId===c?.id);
  const byState=Object.fromEntries(ACTION_STATES.map(s=>[s,own.filter(a=>a.state===s).length]));
  return freeze({campaignId:c?.id||null,goal:c?.goal||null,actions:own.length,byState,open:own.filter(a=>OPEN_STATES.includes(a.state)).length,
    chain:own.map(a=>({actionId:a.id,goal:a.goal,opportunityId:a.opportunityId,state:a.state,executionEvidence:a.executionEvidence?.ref||null,result:a.result?.summary||null}))});
}

/* closePeriod({period, plannedActionIds, actions, comparison, carry, learnings, at}):
   planned vs done, blockers, carry-over of every open action with reason and next step, and
   learnings as observations (with evidence) or hypotheses. Causality is never asserted. */
function closePeriod(input={}){
  const v=input&&typeof input==='object'?input:{},issues=[];
  const period=text(v.period),at=isoOrNull(v.at);
  if(!period||!at)throw new Error('closePeriod requires period and at');
  const acts=arr(v.actions),planned=uniq(arr(v.plannedActionIds).map(text)),carry=v.carry&&typeof v.carry==='object'?v.carry:{};
  const byId=new Map(acts.map(a=>[a.id,a]));
  const plannedRows=planned.map(id=>{const a=byId.get(id);return {actionId:id,state:a?a.state:'UNKNOWN_ACTION',label:a?ACTION_STATE_LABELS[a.state]:null};});
  const done=plannedRows.filter(r=>DONE_STATES.includes(r.state)).length;
  const unplannedDone=acts.filter(a=>!planned.includes(a.id)&&DONE_STATES.includes(a.state)&&a.period===period).map(a=>a.id);
  const carryOver=acts.filter(a=>OPEN_STATES.includes(a.state)).map(a=>{
    const c=carry[a.id]||{},reason=minimize(c.reason,300)||null,nextStep=minimize(c.nextStep,300)||null,blocker=minimize(c.blocker,300)||null;
    if(!reason||!nextStep)issues.push({code:'CARRY_OVER_REASON_MISSING',actionId:a.id});
    return {actionId:a.id,state:a.state,label:ACTION_STATE_LABELS[a.state],reason,nextStep,blocker,awaitingHumanDecision:['PROPOSED','REVIEWED'].includes(a.state)||(a.external&&!a.approval&&a.state!=='EXECUTED')};
  });
  const learnings=arr(v.learnings).map((l,i)=>{
    const refs=uniq(arr(l?.evidenceRefs).map(text).filter(Boolean));
    let kind=l?.kind==='OBSERVATION'?'OBSERVATION':'HYPOTHESIS';
    if(kind==='OBSERVATION'&&!refs.length){kind='HYPOTHESIS';issues.push({code:'OBSERVATION_WITHOUT_EVIDENCE',learning:i});}
    if(l?.causal===true){kind='HYPOTHESIS';issues.push({code:'CAUSALITY_NOT_ESTABLISHED',learning:i});}
    return {id:text(l?.id)||`learning-${period}-${i+1}`,statement:minimize(l?.statement,400),kind,evidenceRefs:refs,confidence:LEVELS[l?.confidence]?l.confidence:'low',toMeasure:kind==='HYPOTHESIS'?(minimize(l?.toMeasure,300)||null):null};
  }).filter(l=>l.statement);
  const cmp=v.comparison||null;
  return freeze({period,closedAt:at,
    plannedVsDone:{planned:planned.length,done,notDone:planned.length-done,rows:plannedRows,unplannedDone},
    blocked:carryOver.filter(c=>c.blocker||c.state==='AWAITING_RESPONSE').map(c=>({actionId:c.actionId,state:c.state,blocker:c.blocker||'Esperando respuesta externa'})),
    carryOver,learnings,
    noRelevantChanges:cmp?cmp.noRelevantChanges:null,
    statement:cmp&&cmp.noRelevantChanges===true?'No hubo cambios relevantes en las dimensiones comparables.':cmp&&cmp.noRelevantChanges===null?'No hay datos comparables suficientes para afirmar si hubo cambios.':null,
    issues});
}

/* ── E. Client report ────────────────────────────────────────────────────── */
/* Promises of rankings, sales, backlinks or AI citations are never allowed in report text,
   AI drafts or outreach. */
const PROMISE_PATTERNS=Object.freeze([/garantiz/i,/\bguarantee/i,/asegur\w*\s+(el\s+|la\s+|un\s+|una\s+)?(primer|top|posici|ranking|enlace|backlink|cita|venta)/i,/(primer|1\.?º|#\s?1|top\s?1)\s*(puesto|lugar|posici|resultado|en\s+google|en\s+chatgpt)/i,/\bnumber\s+one\b|\b#1\s+(on|in)\b/i,/\b\d+\s*(backlinks|enlaces)\s+(garantizad|asegurad|guaranteed)/i]);
const hasPromise=s=>PROMISE_PATTERNS.some(re=>re.test(fold(s)));

/* monthlyReport(input): structured report assembled only from validated contracts.
   Business result appears only with an explicit attribution and evidence. */
function monthlyReport(input={}){
  const v=input&&typeof input==='object'?input:{},cmp=v.comparison||null,closure=v.closure||null,acts=arr(v.actions);
  const evo=d=>{const x=cmp?.dimensions?.[d];if(!x)return {status:'NOT_MEASURED',deltas:null};if(!x.comparable)return {status:/^NOT_MEASURED/.test(x.reason)?'NOT_MEASURED':'NOT_COMPARABLE',reason:x.reason,deltas:null};return {status:x.partial?'PARTIAL':'COMPARABLE',deltas:clone(x.deltas)};};
  const outcome=v.businessOutcome;
  const attributable=outcome&&text(outcome.attribution?.method)&&arr(outcome.attribution?.evidenceRefs).length>0;
  const focus=v.nextFocus||{};
  const report={
    profileId:text(v.profile?.id)||null,period:text(v.period)||null,
    observedChanges:cmp?{relevant:clone(cmp.relevantChanges),noRelevantChanges:cmp.noRelevantChanges,statement:closure?.statement||null,newLinks:clone(cmp.dimensions?.backlinks?.newLinks||[]),lostLinks:clone(cmp.dimensions?.backlinks?.lostLinks||[]),notSeen:clone(cmp.dimensions?.backlinks?.notSeen||[])}:{relevant:[],noRelevantChanges:null,statement:'Sin comparación disponible.'},
    executedActions:acts.filter(a=>DONE_STATES.includes(a.state)).map(a=>({actionId:a.id,goal:a.goal,state:ACTION_STATE_LABELS[a.state],evidence:a.executionEvidence?.ref||null,result:a.result?.summary||null,verified:!!a.result})),
    proposedActions:acts.filter(a=>['PROPOSED','REVIEWED'].includes(a.state)).map(a=>({actionId:a.id,goal:a.goal,state:ACTION_STATE_LABELS[a.state],needsHumanDecision:true})),
    pendingActions:acts.filter(a=>['APPROVED','IN_PROGRESS','AWAITING_RESPONSE'].includes(a.state)).map(a=>({actionId:a.id,goal:a.goal,state:ACTION_STATE_LABELS[a.state]})),
    blockedActions:clone(closure?.blocked||[]),
    evolution:{backlinks:evo('backlinks'),mentions:evo('mentions'),localCitations:evo('localCitations'),aiVisibility:cmp?.dimensions?.geo?.comparable?{status:'COMPARABLE',groups:clone(cmp.dimensions.geo.geo.groups)}:evo('geo'),referrals:evo('referrals')},
    businessResult:attributable?{summary:minimize(outcome.summary,400),attribution:{method:text(outcome.attribution.method),evidenceRefs:arr(outcome.attribution.evidenceRefs).map(text)}}:{status:'NOT_ATTRIBUTABLE',note:'No se atribuye resultado de negocio sin un método de atribución y evidencia.'},
    nextFocus:{focus:minimize(focus.focus,300)||null,reason:minimize(focus.reason,400)||null,evidenceRefs:arr(focus.evidenceRefs).map(text).filter(Boolean)},
    learnings:clone(closure?.learnings||[]),
    limits:uniq([...(cmp?.limits||[SAMPLE_LIMIT]),'Las métricas de autoridad de terceros son estimaciones del proveedor.','La visibilidad en IA es observacional y variable; no es tráfico ni resultado de negocio.']),
    disclaimer:'Este informe no promete posiciones, ventas, enlaces ni citas en motores de IA.'
  };
  return freeze({report,issues:validateReport(report,{evidenceIds:v.evidenceIds})});
}

/* validateReport(report, {evidenceIds}): no promise, no executed action without evidence,
   no business result without attribution, no next focus without a reason, and every
   evidence reference resolvable when the evidence registry is given. */
function validateReport(report,{evidenceIds}={}){
  const issues=[],known=Array.isArray(evidenceIds)?new Set(evidenceIds):null;
  const walk=(x,path)=>{if(typeof x==='string'){if(path!=='disclaimer'&&hasPromise(x))issues.push({code:'PROMISE_NOT_ALLOWED',path});}else if(x&&typeof x==='object')for(const [k,y] of Object.entries(x))walk(y,path?path+'.'+k:k);};
  walk(report,'');
  for(const a of arr(report?.executedActions))if(!a.evidence)issues.push({code:'EXECUTED_WITHOUT_EVIDENCE',actionId:a.actionId});
  if(report?.businessResult&&report.businessResult.status!=='NOT_ATTRIBUTABLE'&&!arr(report.businessResult.attribution?.evidenceRefs).length)issues.push({code:'BUSINESS_RESULT_NOT_ATTRIBUTED'});
  if(report?.nextFocus?.focus&&!report.nextFocus.reason)issues.push({code:'NEXT_FOCUS_WITHOUT_REASON'});
  if(known)for(const r of [...arr(report?.nextFocus?.evidenceRefs),...arr(report?.businessResult?.attribution?.evidenceRefs),...arr(report?.learnings).flatMap(l=>arr(l.evidenceRefs))])if(!known.has(r))issues.push({code:'UNKNOWN_EVIDENCE_REF',ref:r});
  return issues;
}

/* ── AI assistance: Core contracts only (models, prompts and credentials: CORE-9) ─ */
const AI_TASKS=Object.freeze(['classify-evidence','summarize-evidence','detect-opportunities','detect-changes','cluster','prioritize-explain','draft-outreach','draft-pr-brief','draft-report','compare-geo-answers','extract-learnings']);
const DRAFT_TASKS=Object.freeze(['draft-outreach','draft-pr-brief','draft-report']);
const CLAIM_KINDS=Object.freeze(['FACT','INFERENCE','HYPOTHESIS']);
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const NUM=/\d+(?:[.,]\d+)*/g,URLS=/https?:\/\/[^\s<>"')\]]+/gi;
const TOKEN_LIKE=/\b(?:sk|pk|rk|ghp|gho|xox[abp])[-_][A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b[A-Za-z0-9+/_-]{32,}={0,2}/;
const hasPersonalData=s=>{const t=String(s??'');return /[^\s@<>()"']+@[^\s@<>()"']+\.[a-z]{2,}/i.test(t)||/%40/i.test(t)||/(?:\+\d[\d\s().-]{7,}\d)|(?:\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b)|(?:\b\d{9,15}\b)/.test(t)||/\b(api[-_]?key|access[-_]?token|password|passwd|bearer)\b\s*[:=]?\s*\S+/i.test(t)||/https?:\/\/[^\s/]*@/i.test(t)||TOKEN_LIKE.test(t);};
/* Metadata fields are minimised like free text; if anything sensitive survives, the whole
   field is replaced. */
const safeMeta=(v,max=120)=>{const m=minimize(v,max);return m&&hasPersonalData(m)?'[redacted]':(m||null);};

/* evidenceItem(input): minimal, minimised evidence unit for AI and reports. Every field is
   checked: an id that is not a plain identifier (or carries personal data or secrets) drops
   the item, because ids are echoed back as references; kind/subject/field/provider/period
   are minimised; URLs lose credentials, query and fragment and are dropped if their path
   still carries personal data. */
function evidenceItem(v){
  const id=text(v?.id);
  if(!SAFE_ID.test(id)||hasPersonalData(id))return null;
  const url=cleanUrl(v.url);
  return {id,kind:safeMeta(v.kind,40)||'observation',subject:safeMeta(v.subject),field:safeMeta(v.field,60),
    value:typeof v.value==='number'||typeof v.value==='boolean'?v.value:(v.value==null?null:safeMeta(String(v.value),200)),
    text:minimize(v.text,500)||null,url:url&&!hasPersonalData(url)?url:null,
    period:safeMeta(v.period,40),capturedAt:isoOrNull(v.capturedAt),provider:safeMeta(v.provider,60),method:SOURCE_METHODS.includes(v.method)?v.method:'manual'};
}
/* prepareEvidence(list): items plus the indexes/reasons of those left out (no content). */
function prepareEvidence(list){
  const items=[],rejected=[],seen=new Set();
  arr(list).forEach((v,index)=>{const e=evidenceItem(v);if(!e)rejected.push({index,reason:'UNSAFE_OR_MISSING_ID'});else if(seen.has(e.id))rejected.push({index,reason:'DUPLICATE_ID'});else{seen.add(e.id);items.push(e);}});
  return {items,rejected};
}

/* Comparability of evidence (CORE-8 review). Two values for the same subject+field are a
   CONFLICT only inside the same measurement context: same period (or capture day), same
   provider and same method. Different periods are evolution, different providers or
   methods are different coverage: those are DIVERGENCES, reported but not contradictory.
   Items without period or capture date share the 'unscoped' context, so differing
   undated values are treated as conflicts (nothing shows they are distinct measurements). */
const contextOf=e=>({period:e.period||(e.capturedAt?e.capturedAt.slice(0,10):'unscoped'),provider:e.provider||'unknown',method:e.method});
const ctxKey=c=>[c.period,c.provider,c.method].join('|');
function compareEvidence(evidence){
  const groups=new Map();
  for(const e of arr(evidence).map(x=>x&&x.id&&'method' in x?x:evidenceItem(x)).filter(Boolean)){if(!e.subject||!e.field)continue;const k=e.subject+'|'+e.field;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
  const conflicts=[],divergences=[];
  for(const [group,es] of groups){
    const byCtx=new Map();
    for(const e of es){const k=ctxKey(contextOf(e));if(!byCtx.has(k))byCtx.set(k,[]);byCtx.get(k).push(e);}
    for(const [ctx,list] of byCtx)if(new Set(list.map(e=>stable(e.value))).size>1)conflicts.push({group,context:ctx,evidenceIds:list.map(e=>e.id).sort()});
    if(byCtx.size>1&&new Set(es.map(e=>stable(e.value))).size>1){
      const ctxs=es.map(contextOf),differs=['period','provider','method'].filter(d=>new Set(ctxs.map(c=>c[d])).size>1);
      divergences.push({group,evidenceIds:es.map(e=>e.id).sort(),differs,note:'Valores de contextos distintos (periodo, proveedor o método): evolución o cobertura diferente, no contradicción.'});
    }
  }
  return {conflicts,divergences};
}
/* findConflicts(evidence): only real contradictions (same comparable context). */
function findConflicts(evidence){return compareEvidence(evidence).conflicts;}

/* aiRequest(task, evidence): the structured request handed to an injected model adapter.
   Evidence is whitelisted and minimised field by field; the rules travel with the request. */
function aiRequest(task,evidence){
  if(!AI_TASKS.includes(task))throw new Error('Unknown AI task');
  const {items,rejected}=prepareEvidence(evidence);
  return freeze({schemaVersion:2,task,evidence:items,evidenceExcluded:rejected.length,comparability:compareEvidence(items),
    output:{items:[{kind:DRAFT_TASKS.includes(task)?'DRAFT':'FACT|INFERENCE|HYPOTHESIS',claim:'string',evidenceRefs:['evidence id'],confidence:'low|medium|high',limits:'string'}]},
    rules:['Usa solo la evidencia aportada; si no basta, dilo (HYPOTHESIS sin referencias).','Separa hechos, inferencias e hipótesis.','Un FACT solo cita evidencia fechada y comparable (mismo periodo, proveedor y método).','No inventes cifras, URLs, enlaces, menciones, citas ni resultados.','Incluye confianza y límites de cobertura.','No prometas posiciones, ventas, enlaces ni citas en IA.','No incluyas datos personales ni secretos.','Los borradores requieren aprobación humana y no se envían.']});
}

/* Numbers outside URLs, normalised (thousand separators, decimal comma, leading zeros). */
const numbersIn=s=>(String(s).replace(URLS,' ').match(NUM)||[]).map(n=>String(Number(n.replace(/[.,](?=\d{3}\b)/g,'').replace(',','.'))));
const STOP=new Set('para como sobre entre desde hasta este esta estos estas pero porque cuando donde tiene tienen segun según with that this from have been their there which would could should about more most than also into over under'.split(' '));
const contentWords=s=>uniq((fold(s).replace(URLS,' ').match(/[a-z]{4,}/g)||[]).filter(w=>!STOP.has(w)));

/* validateAiOutput(output, {task, evidence}): STRUCTURAL validation only. It parses tolerant
   input (object, JSON string, fenced JSON) and keeps as candidates the items whose kind,
   references, numbers, URLs, confidence and limits pass the structural rules, without
   promises or personal data. It cannot prove that a claim follows from its evidence
   (entailment): every candidate stays non-canonical with semanticReview:'PENDING_HUMAN',
   and a person must check the claim–evidence correspondence before using it. A FACT must
   cite dated evidence from one comparable context; lexical overlap is only a review hint. */
function validateAiOutput(output,{task,evidence}={}){
  if(!AI_TASKS.includes(task))throw new Error('Unknown AI task');
  const base={task,canonical:false,requiresHumanReview:true,semanticVerification:'NOT_PERFORMED',
    note:'Validación estructural: no demuestra que las afirmaciones se desprendan de la evidencia. Una persona valida la correspondencia antes de usar el contenido.',candidates:[],rejected:[]};
  let data=output;
  if(typeof data==='string'){const m=/```(?:json)?\s*([\s\S]*?)```/i.exec(data);try{data=JSON.parse(m?m[1]:data);}catch{return freeze({...base,status:'INVALID_OUTPUT',error:'UNPARSEABLE'});}}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.items))return freeze({...base,status:'INVALID_OUTPUT',error:'ITEMS_ARRAY_REQUIRED'});
  if(!data.items.length)return freeze({...base,status:'EMPTY'});
  const items=prepareEvidence(evidence).items,byId=new Map(items.map(e=>[e.id,e]));
  const {conflicts,divergences}=compareEvidence(items);
  const conflicted=new Set(conflicts.flatMap(c=>c.evidenceIds));
  const draft=DRAFT_TASKS.includes(task);
  data.items.forEach((it,index)=>{
    const reject=code=>base.rejected.push({index,code});
    if(!it||typeof it!=='object'||Array.isArray(it))return reject('NOT_AN_OBJECT');
    const kind=text(it.kind),claim=text(it.claim??it.text);
    if(draft?kind!=='DRAFT':!CLAIM_KINDS.includes(kind))return reject('INVALID_KIND');
    if(!claim)return reject('EMPTY_CLAIM');
    if(!LEVELS[it.confidence])return reject('MISSING_CONFIDENCE');
    if(!text(it.limits))return reject('MISSING_LIMITS');
    const refs=uniq(arr(it.evidenceRefs).map(text).filter(Boolean));
    if(refs.some(r=>!byId.has(r)))return reject('UNKNOWN_EVIDENCE_REF');
    if((kind==='FACT'||kind==='INFERENCE')&&!refs.length)return reject('UNSUPPORTED_CLAIM');
    const cited=refs.map(r=>byId.get(r));
    if(kind==='FACT'){
      if(refs.some(r=>conflicted.has(r)))return reject('CONTRADICTORY_EVIDENCE');
      if(cited.some(e=>!e.period&&!e.capturedAt))return reject('UNDATED_EVIDENCE_FOR_FACT');
      if(new Set(cited.filter(e=>e.subject&&e.field).map(e=>e.subject+'|'+e.field+'|'+ctxKey(contextOf(e)))).size>new Set(cited.filter(e=>e.subject&&e.field).map(e=>e.subject+'|'+e.field)).size)return reject('NON_COMPARABLE_EVIDENCE_FOR_FACT');
    }
    if(hasPromise(claim))return reject('PROMISE_NOT_ALLOWED');
    if(hasPersonalData(claim))return reject('PERSONAL_DATA_OR_SECRET');
    // Numbers must come from the cited evidence's text or value (not from dates or ids).
    const corpus=cited.map(e=>[e.text,e.value].filter(x=>x!=null).join(' ')).join(' ');
    const allowed=new Set(numbersIn(corpus));
    if(numbersIn(claim).some(n=>!allowed.has(n)))return reject('UNSUPPORTED_NUMBER');
    const urls=cited.map(e=>e.url).filter(Boolean).concat((corpus.match(URLS)||[]).map(u=>cleanUrl(u.replace(/[.,;:!?]+$/,''))));
    if((claim.match(URLS)||[]).some(u=>!urls.includes(cleanUrl(u.replace(/[.,;:!?]+$/,'')))))return reject('UNSUPPORTED_URL');
    const flags=[];
    const words=contentWords(claim),pool=new Set(contentWords(cited.map(e=>[e.text,e.subject,e.field,e.value].filter(x=>x!=null).join(' ')).join(' ')));
    if(refs.length&&words.length&&words.filter(w=>pool.has(w)).length/words.length<0.5)flags.push('LOW_LEXICAL_OVERLAP');
    for(const d of divergences)if(d.evidenceIds.filter(x=>refs.includes(x)).length>1)for(const k of d.differs)flags.push('EVIDENCE_DIFFERS_BY_'+k.toUpperCase());
    if(!refs.length)flags.push('HYPOTHESIS_WITHOUT_EVIDENCE');
    base.candidates.push({status:'CANDIDATE',claimedKind:kind,claim,evidenceRefs:refs,evidenceStatus:refs.length?'CITED':'INSUFFICIENT',
      confidence:refs.length?it.confidence:'low',limits:minimize(it.limits,300),verification:'STRUCTURAL_ONLY',semanticReview:'PENDING_HUMAN',reviewFlags:uniq(flags),
      ...(draft?{requiresHumanApproval:true,sendable:false}:{})});
  });
  const status=!base.candidates.length?'REJECTED':base.rejected.length?'PARTIAL':'STRUCTURALLY_VALID';
  return freeze({...base,status});
}

/* claimIssues(claim, citedEvidence): the structural checks of validateAiOutput for one
   piece of text, reused by CORE-8.1 drafts: no promise, no personal data or secret, and
   every number and URL present in the cited evidence. An empty list is not a semantic
   verification. */
function claimIssues(claim,cited){
  const c=text(claim),items=arr(cited).map(x=>x&&x.id&&'method' in x?x:evidenceItem(x)).filter(Boolean),issues=[];
  if(hasPromise(c))issues.push('PROMISE_NOT_ALLOWED');
  if(hasPersonalData(c))issues.push('PERSONAL_DATA_OR_SECRET');
  const corpus=items.map(e=>[e.text,e.value].filter(x=>x!=null).join(' ')).join(' ');
  const allowed=new Set(numbersIn(corpus));
  if(numbersIn(c).some(n=>!allowed.has(n)))issues.push('UNSUPPORTED_NUMBER');
  const urls=items.map(e=>e.url).filter(Boolean).concat((corpus.match(URLS)||[]).map(u=>cleanUrl(u.replace(/[.,;:!?]+$/,''))));
  if((c.match(URLS)||[]).some(u=>!urls.includes(cleanUrl(u.replace(/[.,;:!?]+$/,'')))))issues.push('UNSUPPORTED_URL');
  return issues;
}

/* runAiTask({task, evidence, transport, clock, budget, confirmCost}, {providers}):
   routes the request through CORE-7 runProviderRequest (provider 'ai-assist'), so
   secrets in the input are refused, paid use needs confirmation and a finite budget,
   provenance is recorded and output is redacted. Before that, the whole minimised request
   is checked once more: if any personal data or secret survives, nothing is sent
   (PERSONAL_DATA_IN_REQUEST). The model adapter is the injected transport
   ({kind, request(operation, input) => {rows:[{output}]}}); none in the Core. */
async function runAiTask(request={},{providers}={}){
  if(providers==null||typeof providers.runProviderRequest!=='function')throw new TypeError('providers module must be injected');
  const {task,evidence,transport,clock,budget,confirmCost}=request;
  const input=aiRequest(task,evidence),excluded=prepareEvidence(evidence).rejected;
  const empty={task,canonical:false,requiresHumanReview:true,semanticVerification:'NOT_PERFORMED',candidates:[],rejected:[],evidenceRejected:excluded};
  if(hasPersonalData(JSON.stringify(input.evidence)))return freeze({...empty,status:'NOT_AVAILABLE',providerStatus:null,errors:[{code:'PERSONAL_DATA_IN_REQUEST',retryable:false}],provenance:null});
  const result=await providers.runProviderRequest({provider:'ai-assist',operation:'offpageAnalysis',input:clone(input),transport,clock,budget,confirmCost,maxRows:1});
  if(!USABLE.includes(result.status)||!result.data.length)return freeze({...empty,status:result.status==='EMPTY'?'EMPTY':'NOT_AVAILABLE',providerStatus:result.status,errors:clone(result.errors),provenance:clone(result.provenance||null)});
  const validation=validateAiOutput(result.data[0].output,{task,evidence:input.evidence});
  return freeze({...clone(validation),evidenceRejected:excluded,providerStatus:result.status,provenance:clone(result.provenance),cost:clone(result.cost),budget:clone(result.budget)});
}

return Object.freeze({
  USABLE,SOURCE_METHODS,DIMENSIONS,OPPORTUNITY_TYPES,NON_LINK_TYPES,PROHIBITED_TACTICS,DEFAULT_WEIGHTS,
  ACTION_STATES,ACTION_STATE_LABELS,TRANSITIONS,EXTERNAL_KINDS,INTERNAL_KINDS,AI_TASKS,DRAFT_TASKS,
  profile,measurement,mention,citationConsistency,snapshot,compareSnapshots,
  querySet,geoRun,summarizeGeo,compareGeo,aiCrawlerAccess,
  opportunity,prioritize,action,transition,campaign,campaignProgress,closePeriod,
  monthlyReport,validateReport,evidenceItem,prepareEvidence,compareEvidence,findConflicts,aiRequest,validateAiOutput,claimIssues,runAiTask,minimize
});
});

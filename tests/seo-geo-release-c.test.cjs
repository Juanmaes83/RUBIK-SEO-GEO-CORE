const {test}=require('node:test');
const assert=require('node:assert/strict');
const c=require('../src/rubik-seo-geo-intelligence.js');

const config={brand:{name:'Lúmina'},modules:{location:{address:{city:'Alicante'}}},dishes:[{id:'d1',name:'Gamba roja',enabled:true}],seo:{site:{baseUrl:'https://lumina.example/'}}};

const providerFetch=async(url,opts)=>{
  if(opts?.method==='POST')return {ok:true,status:202,json:async()=>({jobId:'j1'})};
  return {ok:true,status:200,json:async()=>({issues:[{id:'i',pageId:'home',url:'https://lumina.example/',category:'broken_links',message:'links',evidence:{count:2}}],pagesScanned:1}),text:async()=>''};
};

test('provider states never fabricate metrics',()=>{
  const d=c.defaults();
  assert.equal(d.integrations.searchConsole.status,'NOT_CONNECTED');
  assert.equal(d.integrations.dataForSEO.status,'NOT_MEASURED');
  assert.equal(d.geo.aiSearchAudit.status,'NOT_MEASURED');
  assert.equal(new c.DataForSEOAdapter().status(),'NOT_MEASURED');
});

test('provider endpoints reject credentials and insecure URLs',async()=>{
  assert.equal(c.providerEndpoint('http://openseo.test'),'');
  assert.equal(c.providerEndpoint('https://user:secret@openseo.test'),'');
  assert.equal(c.providerEndpoint('https://openseo.test/?token=secret'),'');
  assert.equal(c.providerEndpoint('https://openseo.test/#secret'),'');
  assert.equal(c.providerEndpoint('https://openseo.test/'), 'https://openseo.test');
  const invalid=new c.OpenSEOAdapter({endpoint:'https://user:secret@openseo.test',fetchImpl:providerFetch});
  const state=await invalid.connectivity();
  assert.equal(state.status,'ERROR');
  assert.match(state.error,/without credentials/i);
});

test('mergeState fills defaults without overwriting persisted Release C state',()=>{
  const merged=c.mergeState({seo:{integrations:{openseo:{status:'READY',endpoint:'https://saved.example'}},intelligence:{snapshots:[{snapshotId:'persisted'}]}}});
  assert.equal(merged.seo.integrations.openseo.status,'READY');
  assert.equal(merged.seo.integrations.openseo.endpoint,'https://saved.example');
  assert.equal(merged.seo.intelligence.snapshots[0].snapshotId,'persisted');
  assert.equal(merged.seo.integrations.searchConsole.status,'NOT_CONNECTED');
});

test('OpenSEO uses provider POST contract, polling result and normalization',async()=>{
  const a=new c.OpenSEOAdapter({endpoint:'https://openseo.test',fetchImpl:providerFetch,pollInterval:0});
  assert.equal((await a.connectivity()).status,'CONNECTED');
  const r=await a.crawl({baseUrl:'https://lumina.example/',pages:[{id:'home',canonical:'https://lumina.example/'}]});
  assert.equal(r.status,'READY');
  const n=a.normalize(r.result,config,'s1');
  assert.equal(n.issues[0].pageId,'home');
  assert.equal(n.issues[0].snapshotId,'s1');
});

test('OpenSEO polls pending jobs until completed',async()=>{
  let polls=0;
  const fetchImpl=async(url,opts)=>{
    if(opts?.method==='POST')return {ok:true,status:202,json:async()=>({jobId:'job-2',status:'pending'})};
    polls++;
    return {ok:true,status:200,json:async()=>polls<3?{status:'pending'}:{status:'completed',issues:[],pagesScanned:4}};
  };
  const a=new c.OpenSEOAdapter({endpoint:'https://openseo.test',fetchImpl,pollInterval:0,maxPolls:5});
  const r=await a.crawl({baseUrl:'https://lumina.example/',pages:[]});
  assert.equal(r.status,'READY');
  assert.equal(r.attempts,3);
  assert.equal(r.result.pagesScanned,4);
});

test('OpenSEO polling timeout is ERROR and never fake READY',async()=>{
  const fetchImpl=async(url,opts)=>opts?.method==='POST'
    ?{ok:true,status:202,json:async()=>({jobId:'stuck'})}
    :{ok:true,status:200,json:async()=>({status:'pending'})};
  const a=new c.OpenSEOAdapter({endpoint:'https://openseo.test',fetchImpl,pollInterval:0,maxPolls:2});
  const r=await a.crawl({baseUrl:'https://lumina.example/',pages:[]});
  assert.equal(r.status,'ERROR');
  assert.match(r.error,/polling timeout/i);
});

test('OpenSEO missing and unreachable are honest',async()=>{
  assert.equal((await new c.OpenSEOAdapter().connectivity()).status,'NOT_CONFIGURED');
  assert.equal((await new c.OpenSEOAdapter({endpoint:'https://offline.test',fetchImpl:async()=>{throw new Error('offline')}}).connectivity()).status,'ERROR');
});

test('snapshots diff new resolved improved and regressed and never compare providers',()=>{
  const old=c.makeSnapshot('openseo',{issues:[{url:'/a',category:'broken_links',message:'x',evidence:{count:10}},{url:'/b',category:'http_4xx',message:'x',evidence:{count:0}}]},'https://x/');
  const cur=c.makeSnapshot('openseo',{issues:[{url:'/a',category:'broken_links',message:'x',evidence:{count:2}},{url:'/b',category:'http_4xx',message:'x',evidence:{count:2}},{url:'/c',category:'title',message:'new',evidence:{}}]},'https://x/');
  assert.equal(Object.isFrozen(cur),true);
  const d=c.diff(old,cur);
  assert.equal(d.find(x=>x.url==='/a').change,'IMPROVED');
  assert.equal(d.find(x=>x.url==='/b').change,'REGRESSED');
  assert.equal(d.find(x=>x.url==='/c').change,'NEW');
  assert.ok(c.diff(cur,old).some(x=>x.change==='RESOLVED'));
  assert.deepEqual(c.diff(old,c.makeSnapshot('searchConsole',{issues:[]},'https://x/')),[]);
});

test('Search Console connects syncs periods and opportunities',async()=>{
  const a=new c.SearchConsoleAdapter({property:'sc-domain:lumina',dateRange:'28d',client:{connectivity:async()=>({status:'CONNECTED'}),fetchQueries:async()=>[{query:'restaurante Alicante',page:'https://lumina.example/',impressions:2000,ctr:.01,averagePosition:5}],fetchPages:async()=>[{query:'restaurante Alicante',page:'https://lumina.example/carta/',clicks:null}]}});
  assert.equal((await a.connectivity()).status,'CONNECTED');
  const s=await a.sync();
  assert.equal(s.status,'READY');
  assert.equal(s.rows[1].clicks,null);
  assert.ok(a.opportunities(s.rows).some(x=>x.type==='POSSIBLE_CANNIBALIZATION'));
});

test('DataForSEO normalizes keyword SERP competitor nulls and cache',async()=>{
  let calls=0;
  const a=new c.DataForSEOAdapter({enabled:true,client:async()=>{calls++;return {volume:12,cost:.1}}});
  const x=await a.manualRefresh('keyword',{q:'gamba'});
  await a.manualRefresh('keyword',{q:'gamba'});
  assert.equal(calls,1);
  assert.equal(x.cost,.1);
  assert.equal(a.normalizeKeywords([{query:'x'}])[0].volume,null);
  assert.equal(a.normalizeSerps([{query:'x',domain:'a',url:'u'}])[0].position,null);
  assert.equal(a.normalizeCompetitors([{domain:'a'}])[0].visibilitySignals,null);
});

test('crawler rules are user-agent specific and canonical aware',()=>{
  let r=c.crawlerAudit({robotsText:'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /',canonical:'https://x/',expectedCanonical:'https://x/'});
  assert.equal(r.Googlebot.allowed,false);
  assert.equal(r.GPTBot.allowed,true);
  assert.equal(r.GPTBot.evidence.canonicalStatus,'MATCH');
  r=c.crawlerAudit({robotsText:'User-agent: OAI-SearchBot\nDisallow: /',metaRobots:'noindex',canonical:'https://bad/',expectedCanonical:'https://x/'});
  assert.equal(r['OAI-SearchBot'].status,'NOINDEX');
  assert.equal(r['OAI-SearchBot'].evidence.canonicalStatus,'MISMATCH');
});

test('GEO is heuristic and publication/AI states are measured honestly',()=>{
  const g=c.geoReadiness(config);
  assert.equal(g.citation.label,'HEURISTIC');
  assert.equal(g.technical.publicHtml,'NOT_MEASURED');
  assert.equal(g.technical.structuredData,'NOT_MEASURED');
  assert.equal(g.aiSearch.status,'NOT_MEASURED');
});

test('insights require evidence and deduplicate lifecycle states',()=>{
  assert.throws(()=>c.insight({type:'X'}),/evidence required/);
  let list=[];
  list=c.upsertInsight(list,{id:'i',type:'CTR_OPPORTUNITY',source:'gsc',evidence:{impressions:100},status:'REVIEWED'});
  list=c.upsertInsight(list,{id:'i2',type:'CTR_OPPORTUNITY',source:'gsc',evidence:{impressions:100}});
  assert.equal(list.length,1);
  assert.equal(list[0].status,'REVIEWED');
});

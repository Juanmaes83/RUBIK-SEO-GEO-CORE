'use strict';
/* CORE-7.1 (D-22): OpenSEO/MCP bridge contract, validated with mocks shaped after
   docs/integrations/OPENSEO.md. No network, no credentials, no real MCP SDK. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const providers=require('../src/rubik-seo-geo-providers.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');

const clock=()=>new Date('2026-09-25T12:00:00Z');
const AUDIT='audit-123';
const VOCAB=Object.freeze({pending:['queued','running'],completed:['completed'],failed:['failed']});
/* Example host/CORE-9 verifier for the undocumented whoami shape (tests only). */
const VERIFY=sc=>typeof sc?.user?.id==='string'&&sc.user.id.trim().length>0;
const DOCUMENTED_TOOLS=['whoami','run_site_audit','get_audit_status','get_audit_issues','get_audit_pages'];

/* MCP client mock: {kind, callTool(name,args)} returning {structuredContent, content, isError}. */
function mcpMock(handlers,{kind='mock'}={}){
  const calls=[];
  return {calls,mcp:{kind,callTool:async(name,args)=>{
    calls.push({name,args});
    const h=handlers[name];
    if(h===undefined)throw new Error('unexpected tool '+name);
    if(h instanceof Error)throw h;
    return typeof h==='function'?h(args):h;
  }}};
}
const sc=(structuredContent,extra={})=>({structuredContent,content:[{type:'text',text:'Agent-facing text with oseo_SECRETKEY123 and Bearer abc.def.ghi'}],...extra});
const run=(operation,input,extra={})=>providers.runProviderRequest({provider:'openseo',operation,input,clock,statusVocabulary:VOCAB,...extra});
const NO_LEAK=['oseo_SECRETKEY123','abc.def.ghi','Agent-facing text','raw-body-XYZ','user@example.test'];
const noLeak=(value,label)=>{const json=JSON.stringify(value);for(const s of NO_LEAK)assert.ok(!json.includes(s),`${label}: leaked ${s}`);};

// ── Catalogue, dependencies and non-goals ────────────────────────────────────

test('catalogue maps only the documented OpenSEO tools and requires an injected MCP client',()=>{
  const ops=providers.catalog().openseo.operations;
  assert.deepEqual(Object.values(ops).map(o=>o.tool).sort(),[...DOCUMENTED_TOOLS].sort());
  for(const [op,d] of Object.entries(ops)){assert.equal(d.costModel,'free',op);assert.equal(providers.describe('openseo',op).requires,'mcp');}
});

test('without the injected MCP client OpenSEO stays NOT_CONFIGURED / BRIDGE_PENDING and nothing is called',async()=>{
  const transportCalls=[];
  for(const op of ['whoami','siteAudit','auditStatus','auditIssues','auditPages']){
    const r=await run(op,{projectId:'p',auditId:AUDIT,url:'https://site.example/',trigger:'manual'},{transport:{kind:'live',request:async()=>{transportCalls.push(op);return {rows:[]};}}});
    assert.deepEqual([r.status,r.errors[0].code,r.connection],['NOT_CONFIGURED','BRIDGE_PENDING','NOT_VERIFIED'],op);
  }
  assert.deepEqual(transportCalls,[],'a generic transport is never used for OpenSEO');
  await assert.rejects(run('whoami',{},{mcp:{}}),TypeError);
});

test('module has no MCP SDK, fetch, credentials or storage; runs never touch globalThis.fetch',async()=>{
  const code=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-providers.js'),'utf8');
  assert.doesNotMatch(code,/require\(|@modelcontextprotocol|fetch\(|localStorage|indexedDB|process\.env|oseo_/);
  const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('network must not be used');};
  try{
    const {mcp}=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
    assert.equal((await run('whoami',{},{mcp,whoamiAuthenticated:VERIFY})).status,'OK');
  }finally{globalThis.fetch=original;}
});

// ── Connectivity: health + whoami ────────────────────────────────────────────

const HEALTH_OK={status:'NOT_CONNECTED',health:'ok',reachable:true,authorization:'NOT_VERIFIED'};

test('healthy instance without MCP authorization stays NOT_CONNECTED / NOT_VERIFIED',async()=>{
  assert.deepEqual(await providers.openseoConnectivity({health:HEALTH_OK,clock}),{status:'NOT_CONNECTED',health:'ok',authorization:'NOT_VERIFIED'});
  assert.deepEqual((await providers.openseoConnectivity({clock})).status,'NOT_CONFIGURED');
  const issues=await providers.openseoConnectivity({health:{status:'ERROR',health:'issues',failingChecks:['dataforseo'],error:'OpenSEO reports configuration issues'},clock});
  assert.deepEqual([issues.status,issues.authorization,issues.failingChecks],['ERROR','NOT_VERIFIED',['dataforseo']]);
  const {mcp,calls}=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
  await providers.openseoConnectivity({health:{status:'ERROR',health:'issues'},mcp,clock});
  assert.equal(calls.length,0,'whoami is not attempted when the health check fails');
});

test('health from the real D-14 adapter (mocked fetch) feeds the bridge; D-14 output is unchanged',async()=>{
  const adapter=new intelligence.OpenSEOAdapter({endpoint:'https://openseo.test',fetchImpl:async()=>({ok:true,status:200,json:async()=>({status:'ok'})})});
  const health=await adapter.connectivity();
  assert.deepEqual([health.status,health.authorization],['NOT_CONNECTED','NOT_VERIFIED'],'D-14 contract unchanged');
  const {mcp}=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
  assert.equal((await providers.openseoConnectivity({health:()=>adapter.connectivity(),mcp,clock,whoamiAuthenticated:VERIFY})).status,'CONNECTED');
});

test('whoami valid through a live client → CONNECTED/VERIFIED; a mock client never verifies',async()=>{
  const live=mcpMock({whoami:sc({user:{id:'u1',email:'user@example.test'}})},{kind:'live'});
  const connected=await providers.openseoConnectivity({health:HEALTH_OK,mcp:live.mcp,clock,whoamiAuthenticated:VERIFY});
  assert.deepEqual(connected,{status:'CONNECTED',health:'ok',authorization:'VERIFIED',checkedAt:'2026-09-25T12:00:00.000Z'});
  assert.deepEqual(live.calls,[{name:'whoami',args:{}}]);
  noLeak(connected,'whoami identity is not copied');
  const direct=await run('whoami',{},{mcp:live.mcp,whoamiAuthenticated:VERIFY});
  assert.deepEqual([direct.status,direct.data,direct.connection],['OK',[],'VERIFIED'],'whoami returns no identity or text content');
  noLeak(direct,'whoami envelope');
  const mock=mcpMock({whoami:sc({user:{id:'u1'}})});
  const notVerified=await providers.openseoConnectivity({health:HEALTH_OK,mcp:mock.mcp,clock,whoamiAuthenticated:VERIFY});
  assert.deepEqual([notVerified.status,notVerified.authorization,notVerified.reason],['NOT_CONNECTED','NOT_VERIFIED','MOCK_CLIENT']);
});

test('whoami invalid: 401 rejected, tool error, empty or missing structuredContent',async()=>{
  const cases=[
    [Object.assign(new Error('401 Unauthorized raw-body-XYZ'),{status:401}),'NOT_CONNECTED','REJECTED'],
    [sc({},{isError:true}),'ERROR','NOT_VERIFIED'],
    [sc({}),'ERROR','NOT_VERIFIED'],
    [{content:[{type:'text',text:'Agent-facing text'}]},'ERROR','NOT_VERIFIED']
  ];
  for(const [response,status,authorization] of cases){
    const {mcp}=mcpMock({whoami:response},{kind:'live'});
    const r=await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock});
    assert.deepEqual([r.status,r.authorization],[status,authorization]);
    noLeak(r,'whoami failure');
  }
});

// ── Starting an audit ────────────────────────────────────────────────────────

test('run_site_audit: auditId becomes the Core job; Lighthouse is always false; documented args only',async()=>{
  const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:AUDIT})});
  const r=await run('siteAudit',{projectId:'proj-1',url:'https://site.example/',maxPages:120,trigger:'manual'},{mcp});
  assert.equal(r.status,'OK');
  assert.deepEqual(calls,[{name:'run_site_audit',args:{projectId:'proj-1',url:'https://site.example/',maxPages:120,runLighthouse:false}}]);
  assert.deepEqual(r.data,[{jobId:AUDIT,auditId:AUDIT,provider:'openseo',state:'SYNCING',startedAt:'2026-09-25T12:00:00.000Z',url:'https://site.example/',maxPages:120,runLighthouse:false}]);
  assert.deepEqual([r.provenance.evidence.tool,r.provenance.evidence.auditId,r.provenance.method],['run_site_audit',AUDIT,'mock']);
  assert.equal(r.connection,'NOT_VERIFIED');
  noLeak(r,'siteAudit');
  const defaults=mcpMock({run_site_audit:sc({auditId:AUDIT})});
  await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger:'manual'},{mcp:defaults.mcp});
  assert.equal(defaults.calls[0].args.maxPages,50,'documented default');
});

test('Lighthouse cannot be enabled and audits need an explicit manual trigger',async()=>{
  for(const input of [{runLighthouse:true},{runLighthouse:'true'},{runLighthouse:1}]){
    const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:AUDIT})});
    const r=await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger:'manual',...input},{mcp});
    assert.deepEqual([r.status,r.errors[0].code,calls.length],['ERROR','LIGHTHOUSE_NOT_ALLOWED',0]);
  }
  for(const trigger of [undefined,'render','import','schedule','auto']){
    const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:AUDIT})});
    const r=await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger},{mcp});
    assert.deepEqual([r.errors[0].code,calls.length],['MANUAL_TRIGGER_REQUIRED',0],String(trigger));
  }
});

test('run_site_audit input validation: https url, maxPages 10–10000, projectId',async()=>{
  for(const input of [{url:'http://site.example/'},{url:'https://user:pw@site.example/'},{maxPages:9},{maxPages:10001},{maxPages:50.5},{projectId:''}]){
    const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:AUDIT})});
    const r=await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger:'manual',...input},{mcp});
    assert.equal(r.status,'ERROR',JSON.stringify(input));
    assert.equal(calls.length,0);
  }
});

test('refusals without auditId: capacity reached, already running, or unspecified',async()=>{
  const cases=[[{code:'AUDIT_CAPACITY_REACHED'},'AUDIT_CAPACITY_REACHED',false],[{code:'AUDIT_ALREADY_RUNNING'},'AUDIT_ALREADY_RUNNING',true],[{meta:{project:'p'}},'AUDIT_REFUSED',false],[{code:'SOMETHING_UNDOCUMENTED'},'AUDIT_REFUSED',false]];
  for(const [content,code,retryable] of cases){
    const {mcp}=mcpMock({run_site_audit:sc(content)});
    const r=await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger:'manual'},{mcp});
    assert.deepEqual([r.status,r.errors[0].code,r.errors[0].retryable,r.data],['ERROR',code,retryable,[]]);
    noLeak(r,code);
  }
});

test('an audit already in flight is reused instead of starting another',async()=>{
  const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:'other'})});
  const r=await run('siteAudit',{projectId:'p',url:'https://site.example/',trigger:'manual'},{mcp,activeJob:{jobId:AUDIT,auditId:AUDIT,state:'SYNCING'}});
  assert.deepEqual([r.status,r.data[0].jobId,r.data[0].reused,calls.length],['OK',AUDIT,true,0]);
});

// ── Polling ──────────────────────────────────────────────────────────────────

test('get_audit_status: pending, completed and failed via the injected vocabulary',async()=>{
  const expectations=[['running','SYNCING','OK'],['queued','SYNCING','OK'],['completed','COMPLETED','OK'],['failed','FAILED','ERROR']];
  for(const [status,state,envelopeStatus] of expectations){
    const {mcp,calls}=mcpMock({get_audit_status:sc({status,phase:'crawl',pagesCrawled:12,pagesTotal:40})});
    const r=await run('auditStatus',{projectId:'p',auditId:AUDIT},{mcp});
    assert.deepEqual(calls,[{name:'get_audit_status',args:{projectId:'p',auditId:AUDIT}}]);
    assert.deepEqual([r.status,r.data[0].state,r.data[0].providerStatus,r.data[0].pagesCrawled,r.data[0].pagesTotal],[envelopeStatus,state,status,12,40]);
    if(state==='FAILED')assert.equal(r.errors[0].code,'AUDIT_FAILED');
  }
});

test('an undocumented or unconfigured status never becomes READY or COMPLETED',async()=>{
  const {mcp}=mcpMock({get_audit_status:sc({status:'finished-maybe'})});
  const r=await run('auditStatus',{projectId:'p',auditId:AUDIT},{mcp});
  assert.deepEqual([r.status,r.data[0].state,r.errors[0].code],['PARTIAL','UNCLASSIFIED','UNCLASSIFIED_STATUS']);
  const noVocab=await providers.runProviderRequest({provider:'openseo',operation:'auditStatus',input:{projectId:'p',auditId:AUDIT},clock,mcp:mcpMock({get_audit_status:sc({status:'completed'})}).mcp});
  assert.equal(noVocab.data[0].state,'UNCLASSIFIED','without statusVocabulary nothing is classified');
  const missing=await run('auditStatus',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_status:sc({phase:'crawl'})}).mcp});
  assert.deepEqual([missing.status,missing.errors[0].code],['ERROR','INVALID_RESPONSE']);
  assert.equal(missing.data.length,0);
});

// ── Issues and pages ─────────────────────────────────────────────────────────

const REGISTRY=[{id:'home',canonical:'https://site.example/'},{id:'servicios',canonical:'https://site.example/servicios/'}];

test('get_audit_issues: severity mapping, evidence, blocked/rate-limited pages and canonical correlation',async()=>{
  const {mcp,calls}=mcpMock({get_audit_issues:sc({summary:[{a:1},{b:2}],issues:[
    {issueType:'blocked-page',severity:'critical',url:'https://site.example/servicios/#top',title:'Agent-facing text'},
    {issueType:'rate-limited-page',severity:'warning',url:'https://site.example/blog/post/'},
    {issueType:'missing-title',severity:'info',url:'https://site.example/'},
    {issueType:'crawl-rate-limited',severity:'warning'}
  ]})});
  const r=await run('auditIssues',{projectId:'p',auditId:AUDIT,severity:'warning',issueType:'blocked-page',limit:50},{mcp,registry:REGISTRY});
  assert.deepEqual(calls[0],{name:'get_audit_issues',args:{projectId:'p',auditId:AUDIT,severity:'warning',issueType:'blocked-page',limit:50}});
  assert.equal(r.status,'OK');
  assert.deepEqual(r.data.map(i=>[i.category,i.severity,i.pageId,i.inRegistry]),[['blocked-page','ERROR','servicios',true],['rate-limited-page','WARNING','',false],['missing-title','OPPORTUNITY','home',true],['crawl-rate-limited','WARNING','',false]]);
  assert.deepEqual(r.data[0].evidence,{auditId:AUDIT,issueType:'blocked-page',providerSeverity:'critical',url:'https://site.example/servicios/#top',crawlAccess:'BLOCKED'});
  assert.equal(r.data[1].evidence.crawlAccess,'RATE_LIMITED');
  assert.deepEqual([r.data[0].source,r.data[0].status,r.data[0].detectedAt,r.data[0].message],['openseo','OPEN','2026-09-25T12:00:00.000Z','blocked-page']);
  assert.equal(r.provenance.evidence.summaryCount,2,'summary is counted, not copied');
  noLeak(r,'issues');
  // Compatible with the existing Intelligence snapshot/diff/triage contracts.
  const snap=intelligence.makeSnapshot('openseo',{issues:r.data,pagesScanned:4},'https://site.example/');
  assert.equal(snap.issues.length,4);
  assert.equal(intelligence.diff(null,snap).length,4);
  assert.ok(['HIGH','MEDIUM','LOW','BLOCKER'].includes(intelligence.triage(r.data[0]).triage));
});

test('get_audit_issues: partial and malformed responses, documented limit enforced',async()=>{
  const {mcp}=mcpMock({get_audit_issues:sc({issues:[{issueType:'broken-link',severity:'warning',url:'https://site.example/a'},{issueType:'Bad Type',severity:'warning'},{issueType:'x',severity:'fatal'},{issueType:'y',severity:'info',url:'javascript:alert(1)'},null]})});
  const r=await run('auditIssues',{projectId:'p',auditId:AUDIT},{mcp});
  assert.deepEqual([r.status,r.data.length,r.partial.rejected,r.partial.reason],['PARTIAL',1,4,'invalid-rows']);
  const atLimit=await run('auditIssues',{projectId:'p',auditId:AUDIT,limit:2},{mcp:mcpMock({get_audit_issues:sc({issues:[{issueType:'a',severity:'info'},{issueType:'b',severity:'info'}]})}).mcp});
  assert.deepEqual([atLimit.status,atLimit.partial.reason],['PARTIAL','limit-reached'],'a full page may hide more issues');
  for(const bad of [sc({issues:'nope'}),sc({summary:[]}),{content:[]},sc(['array'])]){
    const x=await run('auditIssues',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_issues:bad}).mcp});
    assert.equal(x.status,'ERROR');
  }
  for(const input of [{limit:1001},{limit:0},{severity:'fatal'},{severity:'toString'},{issueType:'Not Kebab'},{auditId:''}]){
    const {mcp:m,calls}=mcpMock({get_audit_issues:sc({issues:[]})});
    const x=await run('auditIssues',{projectId:'p',auditId:AUDIT,...input},{mcp:m});
    assert.deepEqual([x.status,calls.length],['ERROR',0],JSON.stringify(input));
  }
  const empty=await run('auditIssues',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_issues:sc({issues:[]})}).mcp});
  assert.equal(empty.status,'EMPTY');
});

test('get_audit_pages: canonical correlation beyond the Page Registry, totals and partial data',async()=>{
  const {mcp,calls}=mcpMock({get_audit_pages:sc({total:5,pages:[{url:'https://site.example/',statusCode:200,html:'raw-body-XYZ'},{url:'https://site.example/servicios/'},{url:'https://site.example/not-in-registry/'},{url:'ftp://site.example/x'}]})});
  const r=await run('auditPages',{projectId:'p',auditId:AUDIT},{mcp,registry:REGISTRY});
  assert.deepEqual(calls[0],{name:'get_audit_pages',args:{projectId:'p',auditId:AUDIT}});
  assert.deepEqual(r.data,[{url:'https://site.example/',pageId:'home',inRegistry:true},{url:'https://site.example/servicios/',pageId:'servicios',inRegistry:true},{url:'https://site.example/not-in-registry/',pageId:'',inRegistry:false}]);
  assert.deepEqual([r.status,r.partial.rejected,r.partial.expected],['PARTIAL',1,5]);
  noLeak(r,'pages');
  const capped=await run('auditPages',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_pages:sc({pages:[{url:'https://a.example/'},{url:'https://b.example/'},{url:'https://c.example/'}]})}).mcp,maxRows:2});
  assert.deepEqual([capped.status,capped.partial.reason,capped.data.length],['PARTIAL','max-rows',2]);
});

// ── Transport and MCP failures ───────────────────────────────────────────────

test('401/403/429 with Retry-After, usage exceeded, timeout and MCP errors are controlled',async()=>{
  const cases=[
    [Object.assign(new Error('401 raw-body-XYZ'),{status:401}),'NOT_CONNECTED','AUTH',false,undefined],
    [Object.assign(new Error('403'),{status:403}),'ERROR','FORBIDDEN',false,undefined],
    [Object.assign(new Error('Too many'),{status:429,retryAfter:'30'}),'RATE_LIMITED','RATE_LIMITED',true,30],
    [Object.assign(new Error('limited'),{code:'RATE_LIMITED',retryAfter:5}),'RATE_LIMITED','RATE_LIMITED',true,5],
    [Object.assign(new Error('usage'),{code:'USAGE_EXCEEDED',retryAfter:60}),'ERROR','USAGE_EXCEEDED',false,60],
    [Object.assign(new Error('aborted'),{name:'AbortError'}),'ERROR','TIMEOUT',true,undefined],
    [Object.assign(new Error('Invalid params x-api-key: oseo_SECRETKEY123'),{code:-32602}),'ERROR','MCP_ERROR',false,undefined],
    [new Error('socket hang up Bearer abc.def.ghi '+'x'.repeat(400)),'ERROR','TRANSPORT_ERROR',true,undefined]
  ];
  for(const [error,status,code,retryable,retryAfter] of cases){
    const {mcp}=mcpMock({get_audit_status:error});
    const r=await run('auditStatus',{projectId:'p',auditId:AUDIT},{mcp});
    assert.deepEqual([r.status,r.errors[0].code,r.errors[0].retryable],[status,code,retryable],code);
    if(retryAfter!==undefined)assert.equal(r.errors[0].retryAfterSeconds,retryAfter,code);
    assert.ok(r.errors[0].message.length<=200);
    assert.equal(r.provenance.evidence.tool,'get_audit_status');
    noLeak(r,code);
  }
});

test('tool errors (isError) never copy text content; documented codes are surfaced',async()=>{
  const plain=await run('auditStatus',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_status:sc({detail:'raw-body-XYZ'},{isError:true})}).mcp});
  assert.deepEqual([plain.status,plain.errors[0].code],['ERROR','TOOL_ERROR']);
  noLeak(plain,'isError');
  const limited=await run('auditIssues',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_issues:sc({code:'RATE_LIMITED'},{isError:true})}).mcp});
  assert.deepEqual([limited.status,limited.errors[0].code],['RATE_LIMITED','RATE_LIMITED']);
});

test('secrets in bridge input are refused before calling the MCP client; mocks never verify',async()=>{
  for(const input of [{projectId:'p',url:'https://site.example/',trigger:'manual',apiKey:'oseo_SECRETKEY123'},{projectId:'p',auditId:AUDIT,headers:{authorization:'Bearer abc.def.ghi'}},{projectId:'token=oseo_SECRETKEY123',auditId:AUDIT}]){
    const {mcp,calls}=mcpMock({run_site_audit:sc({auditId:AUDIT}),get_audit_status:sc({status:'running'})});
    const r=await run(input.url?'siteAudit':'auditStatus',input,{mcp});
    assert.deepEqual([r.errors[0].code,calls.length],['SECRET_IN_INPUT',0]);
    noLeak(r,'secret input');
  }
  for(const op of ['whoami','auditStatus']){
    const {mcp}=mcpMock({whoami:sc({user:{id:'u'}}),get_audit_status:sc({status:'running'})});
    assert.equal((await run(op,{projectId:'p',auditId:AUDIT},{mcp})).connection,'NOT_VERIFIED',op);
  }
});

test('bridge results are deterministic and the legacy crawl() is untouched',async()=>{
  const make=()=>run('auditIssues',{projectId:'p',auditId:AUDIT},{mcp:mcpMock({get_audit_issues:sc({issues:[{issueType:'a',severity:'info',url:'https://site.example/'}]})}).mcp,registry:REGISTRY});
  assert.deepEqual(await make(),await make());
  assert.equal(typeof intelligence.OpenSEOAdapter.prototype.crawl,'function');
});

// ── Review follow-up: whoami must positively confirm authorization (D-22) ─────

test('whoami without an injected verifier never authenticates, even with a live client',async()=>{
  const {mcp}=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
  const r=await run('whoami',{},{mcp});
  assert.deepEqual([r.status,r.errors[0].code,r.connection,r.data],['NOT_CONNECTED','WHOAMI_UNVERIFIED','NOT_VERIFIED',[]]);
  const c=await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock});
  assert.deepEqual([c.status,c.authorization,c.reason],['NOT_CONNECTED','NOT_VERIFIED','WHOAMI_UNVERIFIED']);
});

test('non-empty but unauthenticated whoami responses are never CONNECTED',async()=>{
  const payloads=[
    {authenticated:false},
    {authenticated:false,user:{id:'u1'}},
    {authorized:false,user:{id:'u1'}},
    {error:'unauthorized'},
    {error:{code:'UNAUTHORIZED'},user:{id:'u1'}},
    {errors:[{message:'Unauthorized'}],user:{id:'u1'}},
    {user:{}},
    {user:null},
    {user:{id:''}},
    {user:{id:'   '}},
    {user:{id:42}},
    {user:'u1'},
    {status:'ok'}
  ];
  for(const payload of payloads){
    const {mcp}=mcpMock({whoami:sc(payload)},{kind:'live'});
    const r=await run('whoami',{},{mcp,whoamiAuthenticated:VERIFY});
    assert.equal(r.status,'NOT_CONNECTED',JSON.stringify(payload));
    assert.equal(r.errors[0].code,'WHOAMI_NOT_AUTHENTICATED',JSON.stringify(payload));
    assert.equal(r.connection,'NOT_VERIFIED');
    const c=await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock,whoamiAuthenticated:VERIFY});
    assert.notEqual(c.status,'CONNECTED',JSON.stringify(payload));
    assert.deepEqual([c.status,c.authorization],['NOT_CONNECTED','REJECTED'],JSON.stringify(payload));
  }
});

test('explicit negatives win over a permissive verifier; only a literal true verifies',async()=>{
  const permissive=()=>true;
  for(const payload of [{authenticated:false},{error:'unauthorized'},{errors:['x']},{authorized:false}]){
    const {mcp}=mcpMock({whoami:sc(payload)},{kind:'live'});
    assert.equal((await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock,whoamiAuthenticated:permissive})).status,'NOT_CONNECTED',JSON.stringify(payload));
  }
  for(const verdict of [1,'true',{},'yes']){
    const {mcp}=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
    assert.equal((await run('whoami',{},{mcp,whoamiAuthenticated:()=>verdict})).status,'NOT_CONNECTED',String(verdict));
  }
  const throwing=mcpMock({whoami:sc({user:{id:'u1'}})},{kind:'live'});
  const t=await run('whoami',{},{mcp:throwing.mcp,whoamiAuthenticated:()=>{throw new Error('verifier crashed user@example.test');}});
  assert.deepEqual([t.status,t.errors[0].code],['NOT_CONNECTED','WHOAMI_NOT_AUTHENTICATED']);
  noLeak(t,'verifier exception');
});

test('empty or missing whoami structuredContent is never CONNECTED',async()=>{
  for(const response of [sc({}),{content:[{type:'text',text:'Agent-facing text'}]},{structuredContent:null},{structuredContent:[]}]){
    const {mcp}=mcpMock({whoami:response},{kind:'live'});
    const c=await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock,whoamiAuthenticated:()=>true});
    assert.notEqual(c.status,'CONNECTED');
    assert.equal(c.authorization,'NOT_VERIFIED');
  }
});

test('the verifier sees a frozen copy; identity never reaches the result, evidence or errors',async()=>{
  let seen;
  const payload={user:{id:'u1',email:'user@example.test',name:'Private Name'}};
  const {mcp}=mcpMock({whoami:sc(payload)},{kind:'live'});
  const r=await run('whoami',{},{mcp,whoamiAuthenticated:x=>{seen=x;return VERIFY(x);}});
  assert.equal(r.status,'OK');
  assert.ok(Object.isFrozen(seen)&&Object.isFrozen(seen.user));
  assert.equal(payload.user.email,'user@example.test','the caller payload is not mutated');
  assert.doesNotMatch(JSON.stringify(r),/user@example\.test|Private Name|u1/);
  const c=await providers.openseoConnectivity({health:HEALTH_OK,mcp,clock,whoamiAuthenticated:VERIFY});
  assert.doesNotMatch(JSON.stringify(c),/user@example\.test|Private Name|u1/);
  // Health alone and mock clients still never verify, whatever the verifier says.
  assert.equal((await providers.openseoConnectivity({health:HEALTH_OK,clock,whoamiAuthenticated:()=>true})).status,'NOT_CONNECTED');
  const mock=mcpMock({whoami:sc(payload)});
  assert.equal((await providers.openseoConnectivity({health:HEALTH_OK,mcp:mock.mcp,clock,whoamiAuthenticated:()=>true})).reason,'MOCK_CLIENT');
});

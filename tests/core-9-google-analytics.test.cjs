'use strict';
/* CORE-9: Google Analytics 4 reports through an injected transport (platform decision of
   09/10/2026: read through OpenSEO's credit-free GA4 tools). Read only, quota cost model,
   property id as evidence, request context recorded, and no change for Search Console. */
const test=require('node:test');
const assert=require('node:assert/strict');
const providers=require('../src/rubik-seo-geo-providers.js');

const clock=()=>new Date('2026-10-09T10:00:00Z');
const BUDGET=Object.freeze({maxUnits:10,maxRequests:10});
const ROWS=[{hostName:'cliente.example',landingPage:'/',sessions:10,activeUsers:8,engagedSessions:7,engagementRate:0.7,keyEvents:1,sessionKeyEventRate:0.1,transactions:0,purchaseRevenue:0}];
const transport=(raw={rows:ROWS,sourceUrl:'properties/123'},kind='live')=>({kind,request:async()=>raw});
const run=(input,raw,kind,operation='report')=>providers.runProviderRequest({provider:'google-analytics',operation,input,transport:transport(raw,kind),clock,budget:BUDGET});
const input={report:'organic_landing_pages',propertyId:'properties/123',startDate:'2026-09-01',endDate:'2026-09-28',limit:100,offset:0};

test('GA4 is a read-only quota provider with two operations',()=>{
  const c=providers.catalog()['google-analytics'];
  assert.deepEqual(Object.keys(c.operations),['report','searchOpportunities']);
  for(const op of Object.values(c.operations))assert.equal(op.costModel,'quota');
  assert.equal(providers.describe('google-analytics','report').sourceType,'ANALYTICS');
  assert.equal(providers.describe('google-analytics','runReport'),null);
});

test('a live report is trusted, keeps the property as evidence and records the request context',async()=>{
  const r=await run(input);
  assert.equal(r.status,'OK');
  assert.equal(r.connection,'VERIFIED');
  assert.ok(providers.isTrustedResult(r));
  assert.equal(r.provenance.sourceType,'ANALYTICS');
  assert.equal(r.provenance.evidence.sourceUrl,'properties/123');
  assert.deepEqual(r.provenance.requestContext,{startDate:'2026-09-01',endDate:'2026-09-28',report:'organic_landing_pages',limit:100,offset:0,propertyId:'properties/123'});
  assert.deepEqual(r.data,ROWS);
});

test('a GA4 landing report does not trust empty or semantically invalid rows',async()=>{
  const malformed=[{}, {landingPage:'/',sessions:-1,activeUsers:'8',keyEvents:true}];
  const r=await run(input,{rows:malformed,sourceUrl:'properties/123'});
  assert.equal(r.status,'ERROR');
  assert.equal(r.connection,'NOT_VERIFIED');
  assert.deepEqual(r.data,[]);
});

test('only the implemented GA4 report can be issued as trusted',async()=>{
  const unsupported=await run({...input,report:'key_events'});
  assert.equal(unsupported.status,'NOT_CONFIGURED');
  assert.equal(unsupported.connection,'NOT_VERIFIED');
  const invalid=await run({...input,limit:0,channel:'all'});
  assert.equal(invalid.status,'ERROR');
  assert.equal(invalid.errors[0].code,'INVALID_GA4_INPUT');
});

test('landing-page normalization permits only typed, bounded known fields',async()=>{
  const extra=await run(input,{rows:[{...ROWS[0],privateNote:'not exported'}],sourceUrl:'properties/123'});
  assert.equal(extra.status,'OK');
  assert.deepEqual(extra.data,ROWS);
  for(const field of ['sessions','activeUsers','engagedSessions','transactions']){
    for(const value of [-1,'8',true,1.5]){
      const row={...ROWS[0],[field]:value};
      const r=await run(input,{rows:[row],sourceUrl:'properties/123'});
      assert.equal(r.status,'ERROR',`${field}=${String(value)}`);
      assert.deepEqual(r.data,[]);
    }
  }
  for(const field of ['engagementRate','sessionKeyEventRate']){
    for(const value of [-0.01,1.01,'0.5',true]){
      assert.equal((await run(input,{rows:[{...ROWS[0],[field]:value}],sourceUrl:'properties/123'})).status,'ERROR');
    }
  }
  for(const row of [{...ROWS[0],keyEvents:true},{...ROWS[0],keyEvents:-1},{...ROWS[0],engagedSessions:11},{...ROWS[0],landingPage:''},{...ROWS[0],purchaseRevenue:'5'}]){
    assert.equal((await run(input,{rows:[row],sourceUrl:'properties/123'})).status,'ERROR');
  }
  const refunded=await run(input,{rows:[{...ROWS[0],purchaseRevenue:-3.5}],sourceUrl:'properties/123'});
  assert.equal(refunded.status,'OK');
  assert.equal(refunded.data[0].purchaseRevenue,-3.5);
});

test('restricted metric nulls remain partial, never a complete zero',async()=>{
  const raw={rows:[{...ROWS[0],purchaseRevenue:null}],sourceUrl:'properties/123',restrictedMetrics:['purchaseRevenue']};
  const r=await run(input,raw);
  assert.equal(r.status,'PARTIAL');
  assert.equal(r.data[0].purchaseRevenue,null);
  assert.equal((await run(input,{rows:raw.rows,sourceUrl:'properties/123'})).status,'ERROR');
  assert.equal((await run(input,{...raw,restrictedMetrics:['unknown']})).status,'ERROR');
});

test('more pages is PARTIAL, no rows is EMPTY, a mock is never verified',async()=>{
  assert.equal((await run(input,{rows:ROWS,truncated:true,sourceUrl:'properties/123'})).status,'PARTIAL');
  assert.equal((await run(input,{rows:[],sourceUrl:'properties/123'})).status,'EMPTY');
  assert.equal((await run(input,undefined,'mock')).connection,'NOT_VERIFIED');
});

test('authorization, quota and forbidden map to the shared states',async()=>{
  assert.equal((await run(input,{httpStatus:401})).status,'NOT_CONNECTED');
  const limited=await run(input,{httpStatus:429,retryAfter:60});
  assert.equal(limited.status,'RATE_LIMITED');
  assert.equal(limited.errors[0].retryAfterSeconds,60);
  assert.equal((await run(input,{httpStatus:403})).errors[0].code,'FORBIDDEN');
  assert.equal((await run(input,{httpStatus:403})).data.length,0);
});

test('search opportunities need their own normalizer before they can be trusted',async()=>{
  const r=await run({propertyId:'properties/123',siteUrl:'sc-domain:example.com',limit:50},{rows:[{page:'https://example.com/',score:72}],sourceUrl:'properties/123'},'live','searchOpportunities');
  assert.equal(r.status,'NOT_CONFIGURED');
  assert.equal(r.connection,'NOT_VERIFIED');
});

test('Search Console provenance is unchanged by the new context fields',async()=>{
  const r=await providers.runProviderRequest({provider:'search-console',operation:'searchAnalytics',input:{siteUrl:'sc-domain:example.com',startDate:'2026-09-01',rowLimit:10},transport:transport({rows:[{keys:['q'],clicks:1,impressions:1,ctr:1,position:1}]}),clock,budget:BUDGET});
  assert.deepEqual(r.provenance.requestContext,{startDate:'2026-09-01',rowLimit:10,siteUrl:'sc-domain:example.com'});
});

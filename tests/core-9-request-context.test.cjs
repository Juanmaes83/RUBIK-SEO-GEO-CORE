'use strict';
/* CORE-9: provenance records the request context (dates, dimensions, property) taken from
   the host's input through a whitelist. Results without context keep their earlier shape. */
const test=require('node:test');
const assert=require('node:assert/strict');
const providers=require('../src/rubik-seo-geo-providers.js');

const clock=()=>new Date('2026-10-09T10:00:00Z');
const BUDGET=Object.freeze({maxUnits:10,maxRequests:10});
const transport=(raw={httpStatus:200,rows:[{keys:['q'],clicks:1,impressions:2,ctr:0.5,position:3}]})=>({kind:'mock',request:async()=>raw});
const run=(input,raw)=>providers.runProviderRequest({provider:'search-console',operation:'searchAnalytics',input,transport:transport(raw),clock,budget:BUDGET});

test('search analytics provenance carries dates, dimensions, type and property',async()=>{
  const r=await run({siteUrl:'sc-domain:example.com',startDate:'2026-09-01',endDate:'2026-09-30',dimensions:['query','page'],searchType:'web',dataState:'final',rowLimit:1000});
  assert.deepEqual(r.provenance.requestContext,{startDate:'2026-09-01',endDate:'2026-09-30',dimensions:['query','page'],searchType:'web',dataState:'final',rowLimit:1000,siteUrl:'sc-domain:example.com'});
  assert.ok(Object.isFrozen(r.provenance.requestContext));
});

test('unknown, malformed or oversized fields never reach provenance',async()=>{
  const r=await run({startDate:'2026-13-45',endDate:'yesterday',dimensions:['query','x; drop'],searchType:'web\nX',rowLimit:-1,startRow:1.5,note:'free text',filters:[{a:1}]});
  assert.equal(r.provenance.requestContext,undefined);
  const many=await run({dimensions:Array(9).fill('query')});
  assert.equal(many.provenance.requestContext,undefined);
});

test('calendar dates and pagination offsets must be exact',async()=>{
  const r=await run({startDate:'2024-02-29',endDate:'2025-02-29',startRow:Number.MAX_SAFE_INTEGER+1});
  assert.deepEqual(r.provenance.requestContext,{startDate:'2024-02-29'});
  const normalized=await run({startDate:'2026-02-30'});
  assert.equal(normalized.provenance.requestContext,undefined);
});

test('Search Console type is captured under searchType',async()=>{
  const r=await run({type:'googleNews',siteUrl:'sc-domain:example.com'});
  assert.deepEqual(r.provenance.requestContext,{searchType:'googleNews',siteUrl:'sc-domain:example.com'});
});

test('a result without context keeps the earlier provenance shape (backward compatible)',async()=>{
  const r=await run({});
  assert.deepEqual(Object.keys(r.provenance).sort(),['capturedAt','evidence','method','operation','provider','requestedAt','sourceType']);
});

test('context is recorded on refusals too, so a failed read says what was asked',async()=>{
  const r=await run({startDate:'2026-09-01',endDate:'2026-09-30'},{httpStatus:403});
  assert.equal(r.status,'ERROR');
  assert.deepEqual(r.provenance.requestContext,{startDate:'2026-09-01',endDate:'2026-09-30'});
});

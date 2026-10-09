'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes,createHash,createHmac}=require('node:crypto');
const providers=require('../src/rubik-seo-geo-providers.js');
const platform=require('../src/rubik-seo-geo-platform-contracts.js');

const input={report:'organic_landing_pages',propertyId:'properties/123',startDate:'2026-09-01',endDate:'2026-09-28',limit:10,offset:0};
const sourceContext={connectionId:'11111111-1111-4111-8111-111111111111',propertyBindingId:'22222222-2222-4222-8222-222222222222',
  providerProjectId:'client-project',grantedAt:'2026-10-09T10:00:00.000Z'};
const scope={tenantId:'33333333-3333-4333-8333-333333333333',projectId:'44444444-4444-4444-8444-444444444444'};
const key=randomBytes(32);
const signer={sign:t=>createHmac('sha256',key).update(t).digest('hex'),verify(t,s){return this.sign(t)===s;}};
const digest={alg:'sha256',hash:t=>createHash('sha256').update(t).digest('hex')};
const raw={rows:[{hostName:'example.com',landingPage:'/',sessions:1,activeUsers:1,engagedSessions:1,engagementRate:1,
  keyEvents:0,sessionKeyEventRate:0,transactions:0,purchaseRevenue:0}],sourceUrl:'properties/123'};
const run=(extra={})=>providers.runProviderRequest({provider:'google-analytics',operation:'report',input,
  transport:{kind:'live',request:async()=>raw},budget:{maxUnits:1,maxRequests:1},clock:()=>new Date('2026-10-09T11:00:00Z'),...extra});

test('server source identity is recorded in signed provenance and tampering fails',async()=>{
  const result=await run({sourceContext});
  assert.equal(result.status,'OK');
  assert.deepEqual(result.provenance.sourceContext,sourceContext);
  const signed=platform.signProvenance(result,{providers,signer,digest,scope}).signed;
  const stored=JSON.parse(JSON.stringify(signed));
  assert.deepEqual(stored.payload.provenance.sourceContext,sourceContext);
  assert.equal(platform.verifyProvenance(stored,{signer,digest,data:result.data,scope}).verified,true);
  stored.payload.provenance.sourceContext.connectionId='55555555-5555-4555-8555-555555555555';
  assert.equal(platform.verifyProvenance(stored,{signer,digest,data:result.data,scope}).reason,'BAD_SIGNATURE');
});

test('invalid source identity fails before any transport call and never enters input',async()=>{
  let calls=0;
  const transport={kind:'live',request:async(_operation,requestInput)=>{calls++;assert.equal(requestInput.sourceContext,undefined);return raw;}};
  for(const source of [{...sourceContext,connectionId:'bad'}, {...sourceContext,secret:'no'},
    {...sourceContext,grantedAt:'tomorrow'}, {...sourceContext,providerProjectId:'other/path'}]){
    const result=await run({sourceContext:source,transport});
    assert.equal(result.errors[0].code,'INVALID_SOURCE_CONTEXT');
  }
  assert.equal(calls,0);
  assert.equal((await run({sourceContext,transport})).status,'OK');
  assert.equal(calls,1);
});

test('cache cannot reuse a result across two source bindings; legacy omission remains compatible',async()=>{
  const map=new Map();let calls=0;
  const cache={get:key=>map.get(key),set:(key,value)=>map.set(key,value)};
  const transport={kind:'live',request:async()=>{calls++;return raw;}};
  const first=await run({sourceContext,cache,transport});
  const next={...sourceContext,propertyBindingId:'55555555-5555-4555-8555-555555555555'};
  const second=await run({sourceContext:next,cache,transport});
  assert.equal(calls,2);
  assert.equal(first.provenance.sourceContext.propertyBindingId,sourceContext.propertyBindingId);
  assert.equal(second.provenance.sourceContext.propertyBindingId,next.propertyBindingId);
  const old=await run();
  assert.equal(old.provenance.sourceContext,undefined);
});

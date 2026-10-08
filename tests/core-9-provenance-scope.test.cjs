'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes,createHash,createHmac}=require('node:crypto');
const platform=require('../src/rubik-seo-geo-platform-contracts.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');
const A={tenantId:'11111111-1111-4111-8111-111111111111',projectId:'22222222-2222-4222-8222-222222222222'};
const digest={alg:'sha256',hash:t=>createHash('sha256').update(t).digest('hex')};
// Test-generated process-local HMAC key: no live transport, credentials or persisted secrets.
const key=randomBytes(32);
const signer={sign:t=>createHmac('sha256',key).update(t).digest('hex'),verify(t,s){return this.sign(t)===s;}};
async function issued(){return providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'fixture.example'},transport:{kind:'live',request:async()=>({rows:[{url_from:'https://ref.fixture.example/',url_to:'https://fixture.example/'}]})},budget:{maxUnits:1,maxRequests:1},confirmCost:true,clock:()=>new Date('2026-10-09T00:00:00Z')});}
const verify=(signed,r,scope=A,extra={})=>platform.verifyProvenance(signed,{signer,digest,data:r.data,scope,...extra});

test('scope survives serialization and verification requires the expected project',async()=>{
  const r=await issued();const signed=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  const stored=JSON.parse(JSON.stringify(signed));
  assert.equal(stored.payload.scopeVersion,1);assert.deepEqual(stored.payload.scope,A);
  const v=verify(stored,r);assert.equal(v.verified,true);assert.deepEqual(v.scope,A);
  assert.equal(platform.isVerifiedProvenance(v.result),true);
  assert.equal(offpage.measurement(v.result,{providers,platform,dimension:"backlinks"}).verified,true);
  assert.equal(platform.verifyProvenance(stored,{signer,digest,data:r.data}).reason,'SCOPE_EXPECTATION_REQUIRED');
});

test('a valid signature cannot be replayed under a different project or tenant',async()=>{
  const r=await issued();const signed=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  for(const scope of [{...A,projectId:'other-project'},{...A,tenantId:'other-tenant'}]){
    const v=verify(signed,r,scope);assert.equal(v.reason,'SCOPE_MISMATCH');assert.equal(v.verified,false);assert.equal(v.result,undefined);
  }
});

test('changing the stored scope or its version breaks the signature',async()=>{
  const r=await issued();const signed=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  for(const patch of [{scope:{...A,projectId:'other-project'}},{scopeVersion:2},{scope:undefined}]){
    assert.equal(verify({...signed,payload:{...signed.payload,...patch}},r).reason,'BAD_SIGNATURE');
  }
});

test('legacy signatures stay compatible only outside project-bound verification',async()=>{
  const r=await issued();const signed=platform.signProvenance(r,{providers,signer,digest}).signed;
  assert.equal(signed.payload.scope,undefined);
  assert.equal(platform.verifyProvenance(signed,{signer,digest,data:r.data}).verified,true);
  assert.equal(verify(signed,r).reason,'SCOPE_REQUIRED');
});

test('invalid requested scopes are refused before signing or restoring trust',async()=>{
  const r=await issued();const bad={tenantId:'Bad Scope',projectId:'x'};
  assert.equal(platform.signProvenance(r,{providers,signer,digest,scope:bad}).error.code,'INVALID_SCOPE');
  const signed=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  assert.equal(verify(signed,r,bad).reason,'INVALID_SCOPE');
});

test('even signed malformed scope versions are not accepted',async()=>{
  const r=await issued();const s=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  for(const [patch,reason] of [[{scopeVersion:2},'SCOPE_VERSION_UNSUPPORTED'],[{scope:{tenantId:'Bad',projectId:'x'}},'INVALID_SIGNED_SCOPE']]){
    const payload={...s.payload,...patch};const signed={...s,payload,signature:signer.sign(platform.canonicalJson(payload))};
    assert.equal(verify(signed,r).reason,reason);
  }
});

test('scope does not bypass original data, envelope or issuer validation',async()=>{
  const r=await issued();const signed=platform.signProvenance(r,{providers,signer,digest,scope:A}).signed;
  assert.equal(verify(signed,r,A,{data:[]}).reason,'DATA_CHANGED');
  assert.equal(verify(signed,r,A,{envelope:r}).verified,true);
  assert.equal(verify(signed,r,A,{envelope:{...r,status:'ERROR'}}).reason,'ENVELOPE_CHANGED');
  assert.equal(platform.signProvenance(JSON.parse(JSON.stringify(r)),{providers,signer,digest,scope:A}).error.code,'NOT_AN_ISSUED_RESULT');
});

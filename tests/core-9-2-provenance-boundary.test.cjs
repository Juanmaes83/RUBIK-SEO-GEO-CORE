'use strict';
/* CORE-9.2 (D-28): injectable production digest for signed provenance, no downgrade to the
   mock digest, RFC 8785-compatible canonical form, signer keyId hint and the explicit
   boundary through which offpage.measurement() accepts a result rebuilt from signed
   provenance. Node's crypto is used only inside the test to stand in for the platform. */
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

const platform=require('../src/rubik-seo-geo-platform-contracts.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');

const clock=()=>new Date('2026-10-07T10:00:00Z');
const sha256={alg:'sha256',hash:t=>crypto.createHash('sha256').update(t,'utf8').digest('hex')};
const keyring={'k-2026-10':'test-only-key-a','k-2026-11':'test-only-key-b'};
const hmac=(k,t)=>crypto.createHmac('sha256',keyring[k]).update(t,'utf8').digest('hex');
const signer={
  sign:(t,{keyId}={})=>{if(!keyring[keyId])throw new Error('unknown key');return hmac(keyId,t);},
  verify:(t,s,{keyId}={})=>!!keyring[keyId]&&typeof s==='string'&&s.length===64&&crypto.timingSafeEqual(Buffer.from(hmac(keyId,t),'hex'),Buffer.from(s,'hex'))
};

async function liveBacklinks(rows=[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]){
  return providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},
    transport:{kind:'live',request:async()=>({rows})},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true});
}
const store=(r,keyId='k-2026-10')=>JSON.parse(JSON.stringify({signed:platform.signProvenance(r,{providers,signer,keyId,digest:sha256}).signed,data:r.data}));

test('canonicalJson matches RFC 8785 ordering and number/string serialization and refuses non-JSON values',()=>{
  assert.equal(platform.canonicalJson({b:1,a:[true,null,'x'],c:{z:1e21,y:0.1,x:-0}}),'{"a":[true,null,"x"],"b":1,"c":{"x":0,"y":0.1,"z":1e+21}}');
  // RFC 8785 §3.2.3: keys sorted by UTF-16 code units.
  assert.equal(platform.canonicalJson({'\u20ac':1,'\r':2,'\ufb33':3,'1':4,'\ud83d\ude00':5,'\u0080':6,'\u00f6':7}),
    '{"\\r":2,"1":4,"\u0080":6,"\u00f6":7,"\u20ac":1,"\ud83d\ude00":5,"\ufb33":3}');
  assert.equal(platform.canonicalJson({a:undefined,b:1}),'{"b":1}','undefined members are omitted, not nulled');
  for(const bad of [NaN,Infinity,{a:-Infinity},()=>1,Symbol('s'),10n])assert.throws(()=>platform.canonicalJson(bad),TypeError);
});

test('production digest: the payload records sha256 and the signer receives the keyId',async()=>{
  const r=await liveBacklinks(),seen=[];
  const s=platform.signProvenance(r,{providers,signer:{sign:(t,o)=>{seen.push(o.keyId);return signer.sign(t,o);}},keyId:'k-2026-10',digest:sha256}).signed;
  assert.deepEqual([s.payload.dataHashAlg,s.payload.dataHash.length,s.keyId,seen],['sha256',64,'k-2026-10',['k-2026-10']]);
  assert.equal(s.payload.dataHash,sha256.hash(platform.canonicalJson(r.data)));
  const ok=platform.verifyProvenance(s,{signer,data:JSON.parse(JSON.stringify(r.data)),digest:sha256});
  assert.deepEqual([ok.trust,ok.verified,ok.keyId,ok.dataHashAlg],['SIGNED_PROVENANCE',true,'k-2026-10','sha256']);
});

test('no downgrade: a mock-digest payload is refused by a sha256 verifier and vice versa',async()=>{
  const r=await liveBacklinks();
  const mock=platform.signProvenance(r,{providers,signer,keyId:'k-2026-10'}).signed;
  assert.equal(mock.payload.dataHashAlg,'fnv1a32-mock');
  assert.equal(platform.verifyProvenance(mock,{signer,data:r.data,digest:sha256}).reason,'DIGEST_ALG_MISMATCH');
  const prod=store(r);
  assert.equal(platform.verifyProvenance(prod.signed,{signer,data:prod.data}).reason,'DIGEST_ALG_MISMATCH');
  const relabelled={...prod.signed,payload:{...prod.signed.payload,dataHashAlg:'fnv1a32-mock'}};
  assert.equal(platform.verifyProvenance(relabelled,{signer,data:prod.data}).reason,'BAD_SIGNATURE','the algorithm is signed');
  assert.throws(()=>platform.signProvenance(r,{providers,signer,keyId:'k-2026-10',digest:{alg:'sha256'}}),/digest must be/);
  assert.throws(()=>platform.verifyProvenance(prod.signed,{signer,data:prod.data,digest:{alg:'SHA 256',hash:sha256.hash}}),/digest must be/);
});

test('rotation: an old key still verifies, an unknown or swapped keyId does not',async()=>{
  const r=await liveBacklinks(),old=store(r,'k-2026-10'),cur=store(r,'k-2026-11');
  assert.equal(platform.verifyProvenance(old.signed,{signer,data:old.data,digest:sha256}).trust,'SIGNED_PROVENANCE');
  assert.equal(platform.verifyProvenance(cur.signed,{signer,data:cur.data,digest:sha256}).keyId,'k-2026-11');
  assert.equal(platform.verifyProvenance({...old.signed,keyId:'k-2026-11'},{signer,data:old.data,digest:sha256}).reason,'BAD_SIGNATURE');
  assert.equal(platform.verifyProvenance({...old.signed,keyId:'retired'},{signer,data:old.data,digest:sha256}).reason,'BAD_SIGNATURE');
  assert.equal(platform.verifyProvenance(old.signed,{signer,data:[...old.data,{url_from:'https://x.example/'}],digest:sha256}).reason,'DATA_CHANGED');
});

test('offpage boundary: a result rebuilt by verifyProvenance is accepted only with the platform module injected',async()=>{
  const r=await liveBacklinks(),s=store(r);
  const v=platform.verifyProvenance(s.signed,{signer,data:s.data,digest:sha256});
  const without=offpage.measurement(v.result,{providers,dimension:'backlinks'});
  assert.deepEqual([without.trust,without.verified],['UNTRUSTED_ENVELOPE',false],'unchanged without platform');
  const m=offpage.measurement(v.result,{providers,dimension:'backlinks',platform});
  assert.deepEqual([m.trust,m.verified,m.method,m.rows.length],['SIGNED_PROVENANCE',true,'api',1]);
  const copy=JSON.parse(JSON.stringify(v.result));
  assert.deepEqual([offpage.measurement(copy,{providers,dimension:'backlinks',platform}).trust],['UNTRUSTED_ENVELOPE'],'a copy is never trusted');
  const wrong=offpage.measurement(v.result,{providers,dimension:'localCitations',platform});
  assert.deepEqual([wrong.status,wrong.reason,wrong.trust,wrong.rows.length],['NOT_MEASURED','OPERATION_MISMATCH','SIGNED_PROVENANCE_WRONG_OPERATION',0]);
  assert.throws(()=>{v.result.connection='VERIFIED';v.result.data.push({});},TypeError,'the rebuilt result is frozen');
  const failed=platform.verifyProvenance(s.signed,{signer,data:[],digest:sha256});
  assert.equal(failed.result,undefined,'a failed verification rebuilds nothing');
});

test('offpage boundary: a mock (non-api) signed result is accepted as signed but never verified',async()=>{
  const r=await providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},
    transport:{kind:'mock',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true});
  const s=store(r),v=platform.verifyProvenance(s.signed,{signer,data:s.data,digest:sha256});
  const m=offpage.measurement(v.result,{providers,dimension:'backlinks',platform});
  assert.deepEqual([v.verified,m.trust,m.verified,m.method],[false,'SIGNED_PROVENANCE',false,'mock']);
});

test('snapshot forwards the platform module to every dimension',async()=>{
  const r=await liveBacklinks(),s=store(r),v=platform.verifyProvenance(s.signed,{signer,data:s.data,digest:sha256});
  const snap=offpage.snapshot({profile:{id:'casa-norte'},period:{id:'2026-10',start:'2026-10-01',end:'2026-10-31'},backlinks:v.result},{providers,platform});
  assert.deepEqual([snap.dimensions.backlinks.trust,snap.dimensions.backlinks.verified],['SIGNED_PROVENANCE',true]);
});

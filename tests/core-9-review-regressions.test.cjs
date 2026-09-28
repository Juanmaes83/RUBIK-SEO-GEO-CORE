'use strict';
/* CORE-9 preparation, review of PR #14 (D-25): spend entries, approver roles, consent dates
   and serialized provenance. Mocks only (not cryptographic); fail against 82ec81b. */
const test=require('node:test');
const assert=require('node:assert/strict');

const platform=require('../src/rubik-seo-geo-platform-contracts.js');
const providers=require('../src/rubik-seo-geo-providers.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');

const clock=()=>new Date('2026-09-28T10:00:00Z');
const A={tenantId:'agency-a',projectId:'casa-norte'},B={tenantId:'agency-b',projectId:'other'};
const mockSigner={sign:p=>'mock-'+p.length+'-'+[...p].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7),verify(p,s){return this.sign(p)===s;}};
const entry=(extra={})=>({tenantId:'agency-a',provider:'dataforseo',period:'2026-09',units:1,requests:1,at:'2026-09-28T10:00:00Z',...extra});

// ── 5. Spend ────────────────────────────────────────────────────────────────

test('recordSpend refuses negative or invalid units/requests; zero and decimal units are valid',()=>{
  for(const bad of [{units:-1},{units:-0.5},{units:NaN},{units:Infinity},{units:'1'},{units:null},{requests:0},{requests:-1},{requests:1.5},{requests:'2'},{at:'ayer'}])
    assert.throws(()=>platform.recordSpend([],entry(bad)),/invalid spend entry/,JSON.stringify(bad));
  assert.equal(platform.recordSpend([],entry({units:0})).length,1,'a free or cached call records 0 units');
  assert.equal(platform.recordSpend([],entry({units:0.25,requests:3}))[0].units,0.25);
});

test('no ledger entry can increase the remaining budget; an invalid ledger fails closed',async()=>{
  const policy=platform.spendPolicy({tenantId:'agency-a',provider:'dataforseo',monthlyUnits:2,monthlyRequests:2}).policy;
  assert.deepEqual(platform.toProviderBudget([],policy,'2026-09'),{maxUnits:2,maxRequests:2,usedUnits:0,requests:0});
  const forged=[entry({units:-10,requests:-10})];
  const b=platform.toProviderBudget(forged,policy,'2026-09');
  assert.deepEqual([b.maxUnits,b.maxRequests,b.invalidLedgerEntries],[0,0,1],'a negative entry never adds allowance');
  assert.equal(platform.spendCheck(forged,policy,{period:'2026-09',units:1}).reason,'INVALID_LEDGER');
  const transport={kind:'mock',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]})};
  const run=ledger=>providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport,clock,budget:platform.toProviderBudget(ledger,policy,'2026-09'),confirmCost:true});
  assert.equal((await run(forged)).status,'BUDGET_EXCEEDED','CORE-7 enforces the zero budget');
  // Exactly at the limit: allowed once, then exhausted; an over-limit record is kept and the budget stays 0.
  assert.equal((await run([entry({units:1})])).status,'OK');
  const full=platform.recordSpend([entry({units:1})],entry({units:1}));
  assert.equal(platform.spendCheck(full,policy,{period:'2026-09',units:0}).reason,'SPEND_POLICY_EXCEEDED','no requests left');
  const over=platform.recordSpend(full,entry({units:5}));
  assert.deepEqual([platform.toProviderBudget(over,policy,'2026-09').maxUnits,over.length],[0,3]);
  assert.equal(platform.spendCheck([],policy,{period:'2026-09',units:'1'}).reason,'INVALID_UNITS');
});

// ── 6. Approver role ────────────────────────────────────────────────────────

test('execute-approved-action needs an approver identity, a role allowed to approve, a valid date and the same scope',()=>{
  const sys={role:'system',id:'runner',memberships:[A]};
  const run=approval=>platform.authorize({actor:sys,action:'execute-approved-action',scope:A,approval});
  const ok={by:'am-1',role:'account-manager',at:'2026-09-28T09:00:00Z',scope:A};
  assert.deepEqual(platform.APPROVER_ROLES,['owner','account-manager','client-approver'],'derived from MATRIX');
  for(const role of platform.APPROVER_ROLES)assert.equal(run({...ok,role}).allowed,true,role);
  for(const role of ['viewer','analyst','ai','system'])assert.equal(run({...ok,role}).reason,'APPROVER_ROLE_NOT_ALLOWED',role);
  assert.deepEqual([run({...ok,role:'root'}).reason,run({...ok,role:'root'}).role],['APPROVER_ROLE_NOT_ALLOWED',null]);
  assert.equal(run({...ok,role:undefined}).reason,'APPROVER_ROLE_NOT_ALLOWED');
  assert.equal(run({...ok,by:''}).reason,'APPROVER_IDENTITY_REQUIRED');
  assert.equal(run({...ok,by:undefined}).reason,'APPROVER_IDENTITY_REQUIRED');
  assert.equal(run({...ok,at:'mañana'}).reason,'APPROVAL_DATE_INVALID');
  assert.equal(run({...ok,scope:B}).reason,'APPROVAL_SCOPE_MISMATCH');
  assert.equal(run(null).reason,'HUMAN_APPROVAL_REQUIRED');
});

// ── 7. Consent dates ────────────────────────────────────────────────────────

test('malformed consent dates are refused and never authorize; valid, expired, revoked and absent behave',()=>{
  const base={purpose:'ai-processing',scope:A,grantedBy:'cliente',grantedAt:'2026-09-01'};
  const rec=x=>platform.consentRecord({...base,...x});
  for(const [k,v] of [['expiresAt','fin de año'],['revokedAt','2026-02-30T99:00'],['grantedAt','hoy'],['expiresAt',{}]])
    assert.deepEqual([rec({[k]:v}).error.code,rec({[k]:v}).error.field],['INVALID_DATE',k],k+'='+JSON.stringify(v));
  assert.equal(rec({expiresAt:'2026-08-01'}).error.code,'EXPIRES_BEFORE_GRANT');
  const at='2026-09-28';
  const has=c=>platform.hasConsent([c],{purpose:'ai-processing',scope:A,at});
  assert.equal(has(rec({}).consent),true,'absent dates: open-ended');
  assert.equal(has(rec({expiresAt:''}).consent),true,'blank is absent');
  assert.equal(has(rec({expiresAt:'2026-12-31'}).consent),true);
  assert.equal(has(rec({expiresAt:'2026-09-20'}).consent),false,'expired');
  assert.equal(has(rec({revokedAt:'2026-09-15'}).consent),false,'revoked');
  // A record built by hand with a malformed date never authorizes.
  assert.equal(has({...rec({}).consent,expiresAt:'nunca'}),false);
  assert.equal(has({...rec({}).consent,revokedAt:'x'}),false);
});

// ── 8. Serialized provenance ────────────────────────────────────────────────

async function signedLive(rows){
  const r=await providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},transport:{kind:'live',request:async()=>({rows,expected:rows.length+1})},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true});
  return {r,stored:JSON.parse(JSON.stringify({signed:platform.signProvenance(r,{providers,signer:mockSigner,keyId:'mock-key'}).signed,data:r.data,envelope:{...r}}))};
}

test('verifyProvenance requires the data, covers status/connection/partial/provenance and rebuilds the envelope from the signature',async()=>{
  const {r,stored}=await signedLive([{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]);
  assert.equal(r.status,'PARTIAL','fixture: partial coverage');
  const v=x=>platform.verifyProvenance(x.signed??stored.signed,{signer:mockSigner,...x});
  const good=v({data:stored.data,envelope:stored.envelope});
  assert.deepEqual([good.trust,good.verified,good.result.status,good.result.partial.reason],['SIGNED_PROVENANCE',true,'PARTIAL','missing-rows']);
  assert.deepEqual([v({}).trust,v({}).verified,v({}).reason],['UNTRUSTED',false,'DATA_REQUIRED'],'no data, no verification');
  assert.equal(v({data:[]}).reason,'DATA_CHANGED');
  for(const [k,val] of [['status','OK'],['connection','NOT_VERIFIED'],['partial',null],['provenance',{...stored.signed.payload.provenance,method:'mock'}],['cached',true],['errorCodes',['ITEM_ERROR']]]){
    const tampered={...stored.signed,payload:{...stored.signed.payload,[k]:val}};
    assert.equal(platform.verifyProvenance(tampered,{signer:mockSigner,data:stored.data}).reason,'BAD_SIGNATURE',k);
  }
  for(const [k,val] of [['status','OK'],['partial',null],['connection','VERIFIED']])
    if(stored.envelope[k]!==val)assert.equal(v({data:stored.data,envelope:{...stored.envelope,[k]:val}}).reason,'ENVELOPE_CHANGED',k);
  assert.equal(v({data:stored.data,envelope:{...stored.envelope,status:'OK',partial:null}}).reason,'ENVELOPE_CHANGED','a rehydrated envelope cannot upgrade its coverage');
  assert.equal(platform.verifyProvenance({...stored.signed,signature:'mock-0-7'},{signer:mockSigner,data:stored.data}).reason,'BAD_SIGNATURE');
  assert.equal(v({signed:{payload:null}}).reason,'NOT_SIGNED');
});

test('item errors are part of the signed meaning: dropping them from a rehydrated envelope is detected',async()=>{
  const r=await providers.runProviderRequest({provider:'dataforseo',operation:'backlinks',input:{target:'casanorte.example'},
    transport:{kind:'live',request:async()=>({rows:[{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}],errors:[{code:'ITEM_ERROR',message:'one row failed'}]})},clock,budget:{maxUnits:1,maxRequests:1},confirmCost:true});
  const s=platform.signProvenance(r,{providers,signer:mockSigner}).signed;
  assert.deepEqual(s.payload.errorCodes,['ITEM_ERROR']);
  const env=JSON.parse(JSON.stringify(r));
  assert.equal(platform.verifyProvenance(s,{signer:mockSigner,data:env.data,envelope:env}).trust,'SIGNED_PROVENANCE');
  assert.equal(platform.verifyProvenance(s,{signer:mockSigner,data:env.data,envelope:{...env,errors:[]}}).reason,'ENVELOPE_CHANGED');
});

test('integration limit: the Core does not accept signed provenance; a rebuilt envelope stays untrusted for offpage',async()=>{
  const {stored}=await signedLive([{url_from:'https://a.example/1',url_to:'https://casanorte.example/'}]);
  const rebuilt=platform.verifyProvenance(stored.signed,{signer:mockSigner,data:stored.data}).result;
  const m=offpage.measurement(rebuilt,{providers,dimension:'backlinks'});
  assert.deepEqual([m.verified,m.trust],[false,'UNTRUSTED_ENVELOPE']);
});

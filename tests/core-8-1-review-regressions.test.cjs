'use strict';
/* CORE-8.1, review of PR #13 (D-24): malformed expiry dates never keep a fact approved, and
   facts without a structured value are compared conservatively (ambiguous → not usable).
   The tests fail against 5f60000. */
const test=require('node:test');
const assert=require('node:assert/strict');

const ops=require('../src/rubik-seo-geo-offpage-ops.js');
const offpage=require('../src/rubik-seo-geo-offpage.js');

const AT='2026-09-28T10:00:00Z';
const fact=(id,extra={})=>({id,category:'policy',statement:'Abrimos los domingos',subject:'taberna-sol',field:'sunday-opening',source:'Cliente',approvedBy:'cliente',approvedAt:'2026-09-01',...extra});
const book=list=>ops.factBook(list,{offpage,at:AT});
const status=b=>Object.fromEntries(b.facts.map(f=>[f.id,f.status]));

// ── 3. validUntil ───────────────────────────────────────────────────────────

test('a malformed validUntil is an explicit error and never usable; valid, expired and absent keep their meaning',()=>{
  const b=book([fact('valid',{validUntil:'2026-12-31'}),fact('expired',{field:'f2',validUntil:'2026-09-01'}),fact('absent',{field:'f3'}),fact('blank',{field:'f4',validUntil:''}),
    fact('bad',{field:'f5',validUntil:'next year'}),fact('bad2',{field:'f6',validUntil:'2026-13-45'}),fact('badApproval',{field:'f7',approvedAt:'ayer'})]);
  assert.deepEqual(status(b),{valid:'APPROVED',expired:'EXPIRED',absent:'APPROVED',blank:'APPROVED'});
  assert.deepEqual(b.rejected.map(r=>r.code),['INVALID_VALID_UNTIL','INVALID_VALID_UNTIL','INVALID_APPROVED_AT']);
  assert.deepEqual(b.usable,['valid','absent','blank']);
  assert.equal(ops.approvedFact(fact('x',{validUntil:{}}),{offpage,at:AT}).error.code,'INVALID_VALID_UNTIL');
});

// ── 4. Facts without a structured value ─────────────────────────────────────

test('two opposite statements with value:null in the same context are AMBIGUOUS and neither is usable',()=>{
  const b=book([fact('open'),fact('closed',{statement:'No abrimos los domingos',approvedAt:'2026-09-02'})]);
  assert.deepEqual(status(b),{open:'AMBIGUOUS',closed:'AMBIGUOUS'},'approval dates do not create separate contexts');
  assert.deepEqual(b.usable,[]);
  assert.deepEqual(b.reviewRequired,[['closed','open']]);
  assert.equal(b.ambiguities[0].reason,'UNSTRUCTURED_STATEMENTS_DIFFER');
  assert.deepEqual(b.conflicts,[],'not labelled a contradiction');
  const brief=ops.contentBrief({id:'b1',kind:'article',factIds:['open','closed']},{book:b,offpage}).brief;
  assert.deepEqual([brief.status,brief.unusable.map(u=>u.status)],['BLOCKED',['AMBIGUOUS','AMBIGUOUS']]);
  // Mere rewording is not understood either: conservative, sent to review.
  const reworded=book([fact('a'),fact('b',{statement:'Los domingos estamos abiertos'})]);
  assert.deepEqual(reworded.usable,[]);
});

test('identical, different-context or different-field statements stay usable',()=>{
  const same=book([fact('a'),fact('b',{statement:'  abrimos LOS domingos. '})]);
  assert.deepEqual(same.usable,['a','b'],'identical after normalising case, accents, punctuation and spacing');
  const periods=book([fact('p25',{period:'2025',statement:'No abrimos los domingos'}),fact('p26',{period:'2026'})]);
  assert.deepEqual(periods.usable,['p25','p26'],'different periods are evolution, not ambiguity');
  const fields=book([fact('x'),fact('y',{field:'saturday-opening',statement:'No abrimos los sábados'})]);
  assert.deepEqual(fields.usable,['x','y']);
  const mixedSame=book([fact('v',{value:true}),fact('t')]);
  assert.deepEqual(mixedSame.usable,['v','t'],'same text, one structured value: consistent');
  const valued=book([fact('n1',{value:1,statement:'1 local'}),fact('n2',{value:2,statement:'2 locales'})]);
  assert.deepEqual([status(valued),valued.conflicts.length],[{n1:'CONFLICT',n2:'CONFLICT'},1],'structured values keep the CORE-8 conflict rule');
});

test('compareEvidence reports ambiguities and a FACT cannot cite ambiguous evidence',()=>{
  const ev=[{id:'e1',subject:'s',field:'f',text:'Abrimos los domingos',period:'2026-09'},{id:'e2',subject:'s',field:'f',text:'No abrimos los domingos',period:'2026-09'}];
  const c=offpage.compareEvidence(ev);
  assert.deepEqual([c.conflicts,c.ambiguities.map(a=>a.evidenceIds)],[[],[['e1','e2']]]);
  const r=offpage.validateAiOutput({items:[
    {kind:'FACT',claim:'Abrimos los domingos',evidenceRefs:['e1'],confidence:'medium',limits:'x'},
    {kind:'INFERENCE',claim:'Las fuentes discrepan sobre la apertura de los domingos',evidenceRefs:['e1','e2'],confidence:'low',limits:'Requiere revisión'}
  ]},{task:'detect-changes',evidence:ev});
  assert.deepEqual(r.rejected.map(x=>x.code),['AMBIGUOUS_EVIDENCE']);
  assert.equal(r.candidates[0].claimedKind,'INFERENCE');
});

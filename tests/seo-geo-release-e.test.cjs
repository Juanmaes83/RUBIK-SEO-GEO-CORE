const {test}=require('node:test');
const assert=require('node:assert/strict');
const e=require('../src/rubik-seo-geo-release-e.js');

test('Release E defaults are disconnected and never claim indexation',()=>{
 const s=e.defaults();
 assert.equal(s.indexation.providers.searchConsole.status,'NOT_CONNECTED');
 assert.equal(s.indexation.providers.indexNow.status,'NOT_CONNECTED');
 assert.equal(s.indexation.providers.crawlers.status,'NOT_MEASURED');
 assert.equal(e.summarize({seo:{authority:s}}).measuredEvidence,0);
});
test('provenance is mandatory, normalized and honest',()=>{
 const p=e.provenance({provider:'Bing',sourceType:'MAP',sourceUrl:'https://example.test/p',capturedAt:'2026-09-21T10:00:00Z',status:'MEASURED'});
 assert.deepEqual(p,{provider:'Bing',sourceType:'MAP',sourceUrl:'https://example.test/p',capturedAt:'2026-09-21T10:00:00.000Z',externalId:'',method:'manual',status:'MEASURED'});
 assert.equal(e.provenance({sourceType:'not-real'}).sourceType,'MANUAL');
});
test('presence, mentions and citations preserve the distinction between evidence types',()=>{
 let s=e.defaults();
 s=e.record(s,'presence',{provider:'Google Business Profile',vertical:'restaurant',profileUrl:'https://maps.example.test/x',entityMatch:'VERIFIED',status:'DISCOVERED',provenance:{provider:'Google Business Profile',sourceType:'MAP',sourceUrl:'https://maps.example.test/x',status:'MEASURED'}});
 s=e.record(s,'mention',{kind:'REVIEW',provider:'Tripadvisor',sourceUrl:'https://example.test/review',title:'Review',provenance:{provider:'Tripadvisor',sourceType:'REVIEW',sourceUrl:'https://example.test/review',status:'MEASURED'}});
 s=e.record(s,'citation',{query:'best restaurant Alicante',provider:'ChatGPT Search',model:'unknown',mentioned:true,cited:true,sourceUrl:'https://restaurant.example',provenance:{provider:'ChatGPT Search',sourceType:'AI_SEARCH',sourceUrl:'https://restaurant.example',status:'MEASURED'}});
 assert.equal(s.presence.records[0].entityMatch,'VERIFIED');
 assert.equal(s.mentions.records[0].kind,'REVIEW');
 assert.equal(s.citations.observations[0].cited,true);
 assert.equal(e.summarize({seo:{authority:s}}).measuredEvidence,3);
});
test('IndexNow HTTP responses are submission states, not indexation claims',()=>{
 assert.equal(e.indexNowResult(200).status,'PENDING');
 assert.equal(e.indexNowResult(202).accepted,true);
 assert.equal(e.indexNowResult(403).status,'BLOCKED');
 assert.equal(e.indexNowResult(429).status,'STALE');
 assert.equal(e.indexNowResult(500).status,'ERROR');
});
test('citation observation never invents a citation or sentiment',()=>{
 const item=e.normalizeCitationObservation({query:'query',provider:'manual',mentioned:false,cited:false});
 assert.equal(item.status,'UNKNOWN');
 assert.equal(item.cited,false);
});

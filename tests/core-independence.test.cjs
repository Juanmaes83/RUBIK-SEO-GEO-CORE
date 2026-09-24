'use strict';
/* Independence gate: the Core runs from this repository alone and any host can
   materialize through it without Restaurant code. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const SRC=path.join(__dirname,'..','src');
const core=require('../src/rubik-seo-geo-core.js');
const materializer=require('../src/rubik-seo-geo-materialize.cjs');

test('Core modules only require sibling Core modules or node: builtins',()=>{
  for(const file of fs.readdirSync(SRC)){
    const code=fs.readFileSync(path.join(SRC,file),'utf8');
    for(const [,spec] of code.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){
      assert.ok(spec.startsWith('node:')||/^\.\/rubik-seo-geo-[a-z-]+\.(js|cjs)$/.test(spec),`${file} requires ${spec}`);
      if(spec.startsWith('./'))assert.ok(fs.existsSync(path.join(SRC,spec)),`${file} requires missing ${spec}`);
    }
  }
});

test('Core modules own no storage and never read host files',()=>{
  for(const file of fs.readdirSync(SRC)){
    const code=fs.readFileSync(path.join(SRC,file),'utf8');
    for(const banned of [/localStorage/,/indexedDB/,/createObjectURL/,/class4-[a-z-]+\.js/,/app-v4\.js/,/studio-real-preview\.js/])assert.doesNotMatch(code,banned,`${file} matches ${banned}`);
  }
});

test('all seven reference vertical adapters are registered',()=>{
  assert.deepEqual(core.adapters().map(a=>a.schemaType).sort(),['Hotel','LocalBusiness','ProfessionalService','RealEstateAgent','Restaurant','SportsActivityLocation','Store']);
});

test('generic host materializes a non-Restaurant site with the identity HOME hook',()=>{
  const template='<!doctype html><html lang="es"><head><meta charset="utf-8"><title data-rubik-seo="title">x</title></head><body><main><h1>Casa Norte</h1><h2>Compra con representación</h2><p>Asesoría de compra independiente.</p></main></body></html>';
  const state={brand:{name:'Casa Norte'},hero:{body:'Asesoría de compra independiente.'},business:{name:'Casa Norte',address:{city:'Alicante',country:'ES'}},seo:core.defaults()};
  state.seo.adapterId='real-estate';state.seo.business.category='Buyer Agent';
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-core-generic-'));
  const result=materializer.materializeSite({state,template,outputDir:dir,environment:'production',baseUrl:'https://casa-norte.example.test/'});
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.equal(result.manifest.adapter.id,'real-estate');
  assert.equal(result.manifest.indexable,true);
  assert.equal(result.manifest.contracts['/'].ok,true,result.manifest.contracts['/'].blockers.join(','));
  assert.equal((html.match(/<title\b/g)||[]).length,1);
  assert.match(html,/"@type":"RealEstateAgent"/);
  assert.match(html,/<link rel="canonical" href="https:\/\/casa-norte\.example\.test\/"/);
  assert.match(fs.readFileSync(path.join(dir,'robots.txt'),'utf8'),/Sitemap: https:\/\/casa-norte\.example\.test\/sitemap\.xml/);
  for(const f of ['404.html','sitemap.xml','seo-geo-routes.json'])assert.ok(fs.existsSync(path.join(dir,f)),f);
});

test('materializer rejects a non-function HOME hook',()=>{
  assert.throws(()=>materializer.materializeSite({state:{},template:'',outputDir:os.tmpdir(),renderHomeBody:'nope'}),/renderHomeBody must be a function/);
});

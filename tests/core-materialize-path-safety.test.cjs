'use strict';
/* Security gate (D-11): Page Registry paths are untrusted input. A route with `..`
   segments must fail the build safely, with no file written outside outputDir and no
   partial output. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const releaseB=require('../src/rubik-seo-geo-release-b.js');
const materializer=require('../src/rubik-seo-geo-materialize.cjs');

const BS=String.fromCharCode(92);
const TEMPLATE='<!doctype html><html lang="es"><head><meta charset="utf-8"><title data-rubik-seo="title">x</title></head><body><main><h1>Casa Norte</h1></main></body></html>';

function stateWithPage(routePath){
  const c={brand:{name:'Casa Norte'},hero:{body:'Asesoría de compra independiente.'},business:{address:{city:'Alicante'}},media:{hero:{type:'image',url:'https://cdn.example.test/hero.webp'}},seo:core.defaults()};
  c.seo.adapterId='real-estate';
  c.seo.pages.evil={id:'evil',path:routePath,pageType:'generic',status:'published',indexable:true,title:'Página evil',description:'Descripción única de evil.',h1:'Página evil',primaryQuery:'consulta evil',content:'Contenido factual suficiente para evil.',internalLinks:['/'],socialImageRef:'hero'};
  return c;
}

function listFiles(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listFiles(path.join(dir,e.name)).map(f=>path.join(e.name,f)):[e.name]);
}

for(const environment of ['production','preview']){
  test(`${environment}: a Page Registry route with .. segments fails safely without writing outside outputDir`,t=>{
    const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-path-safety-'));
    t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
    const outputDir=path.join(sandbox,'a','b','out');
    fs.mkdirSync(outputDir,{recursive:true});
    const state=stateWithPage('/../../escape/');

    // Precondition: the page is otherwise publishable, so only the path guard stops it.
    const reconciled={...state,seo:core.reconcile({...state,seo:{...state.seo,site:{...state.seo.site,baseUrl:'https://casa-norte.example.test/'}}})};
    const page=releaseB.page(reconciled,'evil');
    assert.equal(page.path,'/../../escape/','release-b keeps the .. segments');
    assert.equal(releaseB.canPublish(reconciled,page),true);

    assert.throws(()=>materializer.materializeSite({state,template:TEMPLATE,outputDir,environment,baseUrl:environment==='production'?'https://casa-norte.example.test/':''}),/Unsafe route path rejected/);

    assert.equal(fs.existsSync(path.join(sandbox,'a','escape')),false,'nothing written two levels above outputDir');
    assert.deepEqual(listFiles(outputDir),[],'no partial output inside outputDir');
    assert.deepEqual(listFiles(sandbox),[],'no file anywhere in the sandbox');
  });
}

test('routeFile rejects traversal, encoded dot segments, separators and drive paths',()=>{
  const root=path.join(os.tmpdir(),'rubik-route-root');
  for(const bad of ['/../x/','/a/../../x/','/./x/','/..','/%2e%2e/x/','/%2E%2e/x/','/a/%2e%2E/%2e%2e/x/','/a%2f..%2fx/','/a%5c..%5cx/','/a'+BS+'..'+BS+'x/','/C:/x/','/x\u0000/','/%E0%A4%A/','x/relative/','',null]){
    assert.throws(()=>materializer.routeFile(root,bad),/Unsafe route path rejected/,JSON.stringify(bad));
  }
});

test('routeFile keeps legitimate routes inside outputDir',()=>{
  const root=path.resolve(os.tmpdir(),'rubik-route-root');
  assert.equal(materializer.routeFile(root,'/'),path.join(root,'index.html'));
  for(const good of ['/carta/','/blog/mi-post/','/sobre-lúmina/','/a..b/','/.well-known-ish/']){
    const file=materializer.routeFile(root,good);
    assert.ok(!path.relative(root,file).startsWith('..'),good);
    assert.equal(path.basename(file),'index.html');
  }
});

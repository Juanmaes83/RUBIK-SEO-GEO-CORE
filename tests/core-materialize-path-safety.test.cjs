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
  test(`${environment}: a stored Page Registry route with .. segments is blocked and never written outside outputDir`,t=>{
    const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-path-safety-'));
    t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
    const outputDir=path.join(sandbox,'a','b','out');
    fs.mkdirSync(outputDir,{recursive:true});
    const state=stateWithPage('/../../escape/');

    // CORE-3 (D-15): the Page Registry itself now blocks the stored route (first barrier).
    const reconciled={...state,seo:core.reconcile({...state,seo:{...state.seo,site:{...state.seo.site,baseUrl:'https://casa-norte.example.test/'}}})};
    const page=releaseB.page(reconciled,'evil');
    assert.equal(page.path,'/../../escape/','the stored path is reported as-is, never silently rewritten');
    assert.ok(page.contract.blockers.includes('unsafe-path'),page.contract.blockers.join(','));
    assert.equal(releaseB.canPublish(reconciled,page),false);

    // The build omits the blocked route like any contract-blocked page and writes only inside outputDir.
    const result=materializer.materializeSite({state,template:TEMPLATE,outputDir,environment,baseUrl:environment==='production'?'https://casa-norte.example.test/':''});
    assert.ok(!result.manifest.routes.includes('/../../escape/'));
    assert.equal(fs.existsSync(path.join(sandbox,'a','escape')),false,'nothing written two levels above outputDir');
    assert.deepEqual(listFiles(sandbox).filter(f=>!f.startsWith(path.join('a','b','out'))),[],'no file outside outputDir');
    // Second barrier (materializer, D-11) stays in place for any path that reaches it.
    assert.throws(()=>materializer.routeFile(outputDir,page.path),/Unsafe route path rejected/);
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
    assert.ok(materializer.isInside(root,file),good);
    assert.equal(path.basename(file),'index.html');
  }
});

/* ── D-11 review follow-up ─────────────────────────────────────────────────────
   1. Lexical containment must not reject ordinary names that merely start with '..'.
   2. Containment must also be physical: a link already present inside outputDir must
      not redirect any materializer write outside it. */

const IS_WINDOWS=process.platform==='win32';

/* Directory link: a real symlink where allowed. On Windows without the symlink privilege,
   fall back to a junction, which Node's lstat reports as a symbolic link too. */
function makeDirLink(target,link){
  for(const type of IS_WINDOWS?['dir','junction']:['dir']){
    try{fs.symlinkSync(target,link,type);return type;}catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;}
  }
  return null;
}
function makeFileLink(target,link){
  try{fs.symlinkSync(target,link,'file');return true;}catch(error){if(['EPERM','EACCES','ENOTSUP'].includes(error.code))return false;throw error;}
}
function productionArgs(environment){return {environment,baseUrl:environment==='production'?'https://casa-norte.example.test/':''};}

test('isInside is lexical only for real parent escapes',()=>{
  const root=path.resolve(os.tmpdir(),'rubik-inside-root');
  for(const name of ['..foo','...','a..b','.. x'])assert.equal(materializer.isInside(root,path.join(root,name,'index.html')),true,name);
  assert.equal(materializer.isInside(root,root),false,'outputDir itself is not a file inside it');
  assert.equal(materializer.isInside(root,path.resolve(root,'..')),false);
  assert.equal(materializer.isInside(root,path.join(root,'..','x','index.html')),false);
  assert.equal(materializer.isInside(root,path.join(root,'a','..','..','x')),false);
  assert.equal(materializer.isInside(root,path.parse(root).root),false,'filesystem root');
});

test('routeFile accepts /..foo/, /.../ and /a..b/ and still rejects /../x/ and /a/../../x/',()=>{
  const root=path.resolve(os.tmpdir(),'rubik-route-root');
  assert.equal(materializer.routeFile(root,'/..foo/'),path.join(root,'..foo','index.html'));
  assert.equal(materializer.routeFile(root,'/.../'),path.join(root,'...','index.html'));
  assert.equal(materializer.routeFile(root,'/a..b/'),path.join(root,'a..b','index.html'));
  for(const bad of ['/../x/','/a/../../x/'])assert.throws(()=>materializer.routeFile(root,bad),/Unsafe route path rejected/,bad);
});

for(const environment of ['production','preview']){
  test(`${environment}: pages named /..foo/ and /.../ are materialized inside outputDir`,t=>{
    const outputDir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-dotnames-'));
    t.after(()=>fs.rmSync(outputDir,{recursive:true,force:true}));
    const state=stateWithPage('/..foo/');
    state.seo.pages.dots={...state.seo.pages.evil,id:'dots',path:'/.../',title:'Página dots',description:'Descripción única de dots.',h1:'Página dots',primaryQuery:'consulta dots'};
    const result=materializer.materializeSite({state,template:TEMPLATE,outputDir,...productionArgs(environment)});
    assert.ok(result.manifest.routes.includes('/..foo/'),result.manifest.routes.join(','));
    assert.ok(result.manifest.routes.includes('/.../'),result.manifest.routes.join(','));
    assert.ok(fs.existsSync(path.join(outputDir,'..foo','index.html')));
    assert.ok(fs.existsSync(path.join(outputDir,'...','index.html')));
  });

  test(`${environment}: a directory symlink inside outputDir pointing outside is refused before any write`,t=>{
    const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-dirlink-'));
    t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
    const outputDir=path.join(sandbox,'out'),outside=path.join(sandbox,'outside');
    fs.mkdirSync(outputDir);fs.mkdirSync(outside);
    const kind=makeDirLink(outside,path.join(outputDir,'blog'));
    if(!kind){t.skip('platform does not allow creating a directory symlink or junction');return;}
    assert.equal(fs.lstatSync(path.join(outputDir,'blog')).isSymbolicLink(),true,`${kind} is reported as a link`);
    const state=stateWithPage('/blog/post/');

    assert.throws(()=>materializer.materializeSite({state,template:TEMPLATE,outputDir,...productionArgs(environment)}),/symbolic link inside outputDir/);
    assert.deepEqual(listFiles(outside),[],'nothing written through the link');
    assert.deepEqual(fs.readdirSync(outputDir),['blog'],'no partial output: the check runs before the first write');
  });

  test(`${environment}: a pre-existing file symlink for a fixed output (sitemap.xml) is refused`,t=>{
    const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-filelink-'));
    t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
    const outputDir=path.join(sandbox,'out'),target=path.join(sandbox,'outside.txt');
    fs.mkdirSync(outputDir);fs.writeFileSync(target,'ORIGINAL');
    if(!makeFileLink(target,path.join(outputDir,'sitemap.xml'))){t.skip('platform does not allow creating file symlinks without elevated privileges (EPERM); covered on Linux CI');return;}
    const state=stateWithPage('/ok/');

    assert.throws(()=>materializer.materializeSite({state,template:TEMPLATE,outputDir,...productionArgs(environment)}),/symbolic link inside outputDir/);
    assert.equal(fs.readFileSync(target,'utf8'),'ORIGINAL','link target untouched');
    assert.deepEqual(fs.readdirSync(outputDir),['sitemap.xml'],'no partial output');
  });
}

test('outputDir itself may be a link to a real directory (legitimate use)',t=>{
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-outlink-'));
  t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
  const real=path.join(sandbox,'real'),outputDir=path.join(sandbox,'dist');
  fs.mkdirSync(real);
  if(!makeDirLink(real,outputDir)){t.skip('platform does not allow creating a directory symlink or junction');return;}
  const result=materializer.materializeSite({state:stateWithPage('/ok/'),template:TEMPLATE,outputDir,...productionArgs('production')});
  assert.ok(result.manifest.routes.includes('/ok/'));
  for(const f of ['index.html','ok/index.html','sitemap.xml','robots.txt','404.html','seo-geo-routes.json'])assert.ok(fs.existsSync(path.join(real,...f.split('/'))),f);
});

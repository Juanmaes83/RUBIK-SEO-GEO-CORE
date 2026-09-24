'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const b=require('../src/rubik-seo-geo-release-b.js');
const publisher=require('../src/rubik-seo-geo-publisher.js');
// Core extraction: Restaurant host hook + fixtures replace index.html/class4-config.js (docs/DECISIONS.md D-03).
const materializer=require('../hosts/restaurant/restaurant-host.cjs');

const FIXTURES=path.join(__dirname,'fixtures');
const TEMPLATE=fs.readFileSync(path.join(FIXTURES,'restaurant-home-template.html'),'utf8');
const loadRestaurantState=()=>JSON.parse(fs.readFileSync(path.join(FIXTURES,'restaurant-lumina-state.json'),'utf8'));

function fixture(){
  const c=loadRestaurantState();
  c.seo=core.reconcile(c);
  c.seo.site.baseUrl='https://restaurant.example.test/';
  c.seo.business.category='Restaurante mediterráneo';
  c.seo.business.cuisine=['Mediterránea'];
  c.modules=c.modules||{};
  c.modules.location=c.modules.location||{};
  c.modules.location.enabled=true;
  c.modules.location.address={...(c.modules.location.address||{}),street:'Muelle 8',city:'Alicante',region:'Alicante',country:'ES'};
  c.media=c.media||{};
  c.media.hero={...(c.media.hero||{}),type:'image',url:'https://cdn.example.test/hero.webp',publicUrl:'https://cdn.example.test/hero.webp'};
  c.dishes=[
    {id:'dish-1',name:'Gamba roja',short:'Producto de lonja.',origin:'Santa Pola',ingredients:'Gamba roja',enabled:true,image:'https://cdn.example.test/gamba.webp'},
    {id:'dish-2',name:'Arroz de temporada',short:'Arroz mediterráneo.',origin:'Alicante',ingredients:'Arroz y verduras',enabled:true,image:'https://cdn.example.test/arroz.webp'}
  ];
  c.seo=core.reconcile(c);
  return c;
}

function addPage(c,id,pathValue,{title,description,h1,internalLinks=[],headings=[],socialImageRef='hero',schemaSet=[]}={}){
  return b.createPage(c,{
    id,path:pathValue,pageType:'generic',status:'published',indexable:true,
    title:title||('Página '+id),
    description:description||('Descripción única de '+id+'.'),
    h1:h1||('Página '+id),
    primaryQuery:'intención '+id,
    content:'Contenido factual suficiente para '+id+'.',
    internalLinks,headings,socialImageRef,schemaSet
  });
}

test('Hardening B enforces unique title and description independently',()=>{
  const c=fixture();
  addPage(c,'a','/a/',{title:'Mismo title',description:'Misma description'});
  addPage(c,'b','/b/',{title:'Mismo title',description:'Misma description'});
  const pa=b.page(c,'a'),pb=b.page(c,'b');
  assert.equal(b.canPublish(c,pa),false);
  assert.equal(b.canPublish(c,pb),false);
  assert.ok(pa.contract.blockers.includes('duplicate-title'));
  assert.ok(pa.contract.blockers.includes('duplicate-description'));
  const ids=new Set(b.audit(c).map(x=>x.id));
  assert.ok(ids.has('page.a.contract.duplicate-title'));
  assert.ok(ids.has('page.a.contract.duplicate-description'));
});

test('Hardening B blocks invalid heading hierarchy and extra H1 declarations',()=>{
  const c=fixture();
  addPage(c,'jump','/jump/',{headings:[{level:3,text:'Salto incorrecto'}]});
  let p=b.page(c,'jump');
  assert.ok(p.contract.blockers.includes('invalid-heading-hierarchy'));
  assert.equal(b.canPublish(c,p),false);

  c.seo.pages.jump.headings=[{level:1,text:'Segundo H1'}];
  p=b.page(c,'jump');
  assert.ok(p.contract.blockers.includes('multiple-h1'));
  assert.equal(b.canPublish(c,p),false);
});

test('Hardening B blocks broken internal links, missing referenced social media and unsupported schema',()=>{
  const c=fixture();
  addPage(c,'bad','/bad/',{
    internalLinks:['/no-existe/'],
    socialImageRef:'missing-asset',
    schemaSet:['FAQPage']
  });
  const p=b.page(c,'bad');
  assert.ok(p.contract.blockers.some(x=>x.startsWith('broken-internal-link:')));
  assert.ok(p.contract.blockers.includes('missing-social-image'));
  assert.ok(p.contract.blockers.includes('schema-not-supported-by-content:FAQPage'));
  assert.equal(b.canPublish(c,p),false);
});

test('Hardening B allows factual page with valid canonical, internal link and social image',()=>{
  const c=fixture();
  addPage(c,'about','/about/',{title:'Sobre LÚMINA',description:'Historia y propuesta gastronómica de LÚMINA.',h1:'Sobre LÚMINA',internalLinks:['/'],socialImageRef:'hero'});
  const p=b.page(c,'about');
  assert.equal(p.contract.ok,true,p.contract.blockers.join(','));
  assert.equal(p.canonical,'https://restaurant.example.test/about/');
  assert.equal(b.canPublish(c,p),true);
});

test('Hardening B raw HTML gate checks real materialized HTML, not only Project State',()=>{
  const c=fixture();
  addPage(c,'about','/about/',{title:'Sobre LÚMINA',description:'Historia y propuesta gastronómica de LÚMINA.',h1:'Sobre LÚMINA',socialImageRef:'hero'});
  const p=b.page(c,'about'),html=publisher.renderPage(c,p,'production'),gate=publisher.rawHtmlContract(c,p,html,'production');
  assert.equal(gate.ok,true,gate.blockers.join(','));
  assert.equal(gate.h1Count,1);
  assert.match(html,/rel="canonical" href="https:\/\/restaurant\.example\.test\/about\//);
  assert.match(html,/og:title/);
  assert.match(html,/twitter:card/);
  assert.match(html,/application\/ld\+json/);

  const broken=html.replace('<h1>Sobre LÚMINA</h1>','<h1>Sobre LÚMINA</h1><h1>Duplicado</h1>');
  const failed=publisher.rawHtmlContract(c,p,broken,'production');
  assert.equal(failed.ok,false);
  assert.ok(failed.blockers.includes('multiple-h1'));
});

test('Hardening B schema root is a clean graph without redundant root @type',()=>{
  const c=fixture(),schema=core.schemaGraph(c);
  assert.equal(schema['@type'],undefined);
  assert.deepEqual(schema['@graph'].map(x=>x['@type']),['WebSite','WebPage','Restaurant']);
});

test('Hardening B leaves one baseUrl blocker and marks publisher as deferred dependency',()=>{
  const c=fixture();c.seo.site.baseUrl='';c.seo=core.reconcile(c);
  const checks=core.preview(c).checks;
  assert.equal(checks.filter(x=>x.severity==='BLOCKER'&&/URL HTTPS productiva/.test(x.message)).length,1);
  assert.equal(checks.find(x=>x.id==='publisher')?.severity,'DEFERRED');
});

test('Hardening B production materializer publishes valid routes and omits contract-blocked routes',()=>{
  const c=fixture();
  addPage(c,'ok','/ok/',{title:'Página válida',description:'Descripción válida y diferenciada.',h1:'Página válida',socialImageRef:'hero'});
  addPage(c,'bad','/bad/',{title:'Página rota',description:'Descripción rota pero con enlace inválido.',h1:'Página rota',internalLinks:['/missing/'],socialImageRef:'hero'});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-b-'));
  const result=materializer.materializeSite({state:c,template:TEMPLATE,outputDir:dir,environment:'production',baseUrl:'https://restaurant.example.test/'});
  assert.ok(result.manifest.routes.includes('/ok/'));
  assert.ok(!result.manifest.routes.includes('/bad/'));
  assert.equal(result.manifest.contracts['/ok/'].ok,true);
  assert.ok(fs.existsSync(path.join(dir,'ok','index.html')));
  assert.ok(!fs.existsSync(path.join(dir,'bad','index.html')));
});

/* Host-owned assertions (Studio UI, app-v4.js, studio-real-preview.js, class4-store.js)
   stay in the Restaurantes Premium repository. See docs/DECISIONS.md D-04. */

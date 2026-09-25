'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const core=require('../src/rubik-seo-geo-core.js');
// Core extraction: Restaurant host hook + fixtures replace index.html/class4-config.js (docs/DECISIONS.md D-03).
const materializer=require('../hosts/restaurant/restaurant-host.cjs');

const FIXTURES=path.join(__dirname,'fixtures');
const TEMPLATE=fs.readFileSync(path.join(FIXTURES,'restaurant-home-template.html'),'utf8');
const loadRestaurantState=()=>JSON.parse(fs.readFileSync(path.join(FIXTURES,'restaurant-lumina-state.json'),'utf8'));

function project(){
  const c=loadRestaurantState();
  c.seo=core.reconcile(c);
  c.seo.site.baseUrl='https://restaurant.example.test/';
  c.seo.pages.carta={
    id:'carta',
    path:'/carta/',
    pageType:'menu',
    status:'published',
    indexable:true,
    title:'Carta de LÚMINA',
    description:'Platos de LÚMINA y su procedencia.',
    h1:'Carta de LÚMINA',
    content:'Una selección de platos basada en los productos reales del proyecto.',
    internalLinks:['/']
  };
  c.seo.redirects=[{from:'/menu-antiguo/',to:'/carta/',status:308,createdAt:'2026-09-18T00:00:00.000Z'}];
  return c;
}

function count(source,re){
  return (String(source).match(re)||[]).length;
}

function serverFor(dir,manifest){
  const redirects=new Map((manifest.redirects||[]).map(r=>[r.source,r]));
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(redirects.has(pathname)){
      const r=redirects.get(pathname);
      res.writeHead(r.status,{location:r.destination});
      res.end();
      return;
    }
    const rel=pathname==='/'?'index.html':pathname.replace(/^\/+|\/+$/g,'')+'/index.html';
    let file=path.join(dir,rel);
    if(!fs.existsSync(file)&&pathname.includes('.')) file=path.join(dir,pathname.replace(/^\/+/,''));
    if(!file.startsWith(dir)||!fs.existsSync(file)){
      res.writeHead(404,{'content-type':'text/html; charset=utf-8'});
      res.end(fs.readFileSync(path.join(dir,'404.html'),'utf8'));
      return;
    }
    const ext=path.extname(file);
    const type=ext==='.xml'?'application/xml':ext==='.txt'?'text/plain':ext==='.json'?'application/json':'text/html; charset=utf-8';
    res.writeHead(200,{'content-type':type});
    res.end(fs.readFileSync(file));
  });
  return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({
    server,
    base:'http://127.0.0.1:'+server.address().port
  })));
}

test('Hardening A materializes premium HOME with complete raw HTML before JavaScript',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-a-'));
  const result=materializer.materializeSite({
    state:project(),
    template:TEMPLATE,
    outputDir:dir,
    environment:'production',
    baseUrl:'https://restaurant.example.test/'
  });
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');

  assert.match(html,/<title[^>]*data-rubik-seo="title">[^<]+<\/title>/);
  assert.match(html,/<meta name="description"[^>]+data-rubik-seo="description">/);
  assert.match(html,/<link rel="canonical" href="https:\/\/restaurant\.example\.test\/"[^>]+data-rubik-seo="canonical">/);
  assert.match(html,/<meta name="robots" content="index,follow"/);
  assert.match(html,/<meta property="og:title"/);
  assert.match(html,/<meta name="twitter:card"/);
  assert.match(html,/<script type="application\/ld\+json" data-rubik-seo="schema">/);

  assert.equal(count(html,/<h1\b/gi),1,'premium HOME must keep exactly one H1');
  assert.match(html,/<span id="hero-line1">LÚMINA<\/span>/);
  assert.match(html,/<em id="hero-line2">after dark\.<\/em>/);
  assert.match(html,/Producto mediterráneo, fuego y precisión/);
  assert.match(html,/La cocina entra en escena como un objeto de deseo/);
  assert.match(html,/Before the plate, there is a place\./);
  assert.match(html,/Dinner becomes memory\./);
  assert.match(html,/Precision without noise\./);
  assert.match(html,/Take your seat\./);
  assert.match(html,/Wild Red Prawn/);
  assert.match(html,/class="hero"/);
  assert.match(html,/class="orbit-shell"/);
  assert.equal(result.manifest.indexable,true);
});

test('Hardening A materializes Page Registry routes, sitemap, robots and redirect manifest',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-a-routes-'));
  const result=materializer.materializeSite({
    state:project(),
    template:TEMPLATE,
    outputDir:dir,
    environment:'production',
    baseUrl:'https://restaurant.example.test/'
  });

  assert.ok(fs.existsSync(path.join(dir,'carta','index.html')));
  const carta=fs.readFileSync(path.join(dir,'carta','index.html'),'utf8');
  assert.match(carta,/<h1>Carta de LÚMINA<\/h1>/);
  assert.match(carta,/canonical/);
  assert.match(carta,/index,follow/);

  const sitemap=fs.readFileSync(path.join(dir,'sitemap.xml'),'utf8');
  assert.match(sitemap,/https:\/\/restaurant\.example\.test\//);
  assert.match(sitemap,/https:\/\/restaurant\.example\.test\/carta\//);

  const robots=fs.readFileSync(path.join(dir,'robots.txt'),'utf8');
  assert.match(robots,/Allow: \//);
  assert.match(robots,/Sitemap: https:\/\/restaurant\.example\.test\/sitemap\.xml/);

  assert.deepEqual(result.manifest.redirects.map(r=>[r.source,r.destination,r.status]),[
    ['/menu-antiguo/','/carta/',308]
  ]);
});

test('Hardening A preview fails closed: no canonical, noindex and robots disallow',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-a-preview-'));
  const c=project();
  const result=materializer.materializeSite({
    state:c,
    template:TEMPLATE,
    outputDir:dir,
    environment:'preview'
  });
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(html,/rel="canonical"/);
  assert.match(fs.readFileSync(path.join(dir,'robots.txt'),'utf8'),/Disallow: \//);
  assert.equal(result.manifest.indexable,false);
});

test('Hardening A HTTP proof returns 200, 308 and a real 404 without JavaScript',async(t)=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-a-http-'));
  const result=materializer.materializeSite({
    state:project(),
    template:TEMPLATE,
    outputDir:dir,
    environment:'production',
    baseUrl:'https://restaurant.example.test/'
  });
  const live=await serverFor(dir,result.manifest);
  t.after(()=>live.server.close());

  const home=await fetch(live.base+'/');
  assert.equal(home.status,200);
  const raw=await home.text();
  assert.match(raw,/hero-line1">LÚMINA/);
  assert.match(raw,/data-rubik-seo="schema"/);

  const carta=await fetch(live.base+'/carta/');
  assert.equal(carta.status,200);
  assert.match(await carta.text(),/<h1>Carta de LÚMINA<\/h1>/);

  const moved=await fetch(live.base+'/menu-antiguo/',{redirect:'manual'});
  assert.equal(moved.status,308);
  assert.equal(moved.headers.get('location'),'/carta/');

  const missing=await fetch(live.base+'/esto-no-existe/');
  assert.equal(missing.status,404);
  assert.match(await missing.text(),/<h1>404<\/h1>/);
});

test('Hardening A refuses a production build without a valid HTTPS base URL',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-hardening-a-block-'));
  const c=loadRestaurantState();
  assert.throws(()=>materializer.materializeSite({
    state:c,
    template:TEMPLATE,
    outputDir:dir,
    environment:'production'
  }),/requires a valid HTTPS baseUrl/);
});

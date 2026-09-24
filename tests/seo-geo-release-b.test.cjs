const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/rubik-seo-geo-core.js');
const b=require('../src/rubik-seo-geo-release-b.js');
const pub=require('../src/rubik-seo-geo-publisher.js');

const product=()=>{
  const seo=core.defaults();seo.site.baseUrl='https://casa.example.test/';seo.people=[{id:'author',name:'Ana Ruiz',type:'Person',role:'Editora'}];
  return {
    brand:{name:'Casa Real'},hero:{body:'Cocina mediterránea de producto.'},
    visit:{bookingUrl:'https://book.example.test/table',address:'Calle Mar 1'},
    modules:{location:{address:{street:'Calle Mar 1',city:'Alicante',region:'Comunitat Valenciana',country:'ES'},enabled:true}},
    dishes:[
      {id:'dish-1',name:'Gamba roja',origin:'Santa Pola',short:'Gamba a la brasa.',ingredients:'Gamba roja · cítricos',image:'https://cdn.example.test/gamba.jpg',enabled:true},
      {id:'dish-2',name:'Lubina salvaje',origin:'Calpe',short:'Lubina a la plancha.',ingredients:'Lubina · hinojo',image:'https://cdn.example.test/lubina.jpg',enabled:true}
    ],
    media:{hero:{type:'image',url:'https://cdn.example.test/hero.jpg',width:1920,height:1080}},seo
  };
};
function addMenu(x){return b.createPage(x,{id:'menu',path:'/carta/',pageType:'carta',status:'published',indexable:true,title:'Carta de Casa Real',description:'Platos y producto de Casa Real.',h1:'Nuestra carta',primaryQuery:'carta restaurante Alicante',topics:['carta','producto'],entities:['dish-1'],content:'Carta elaborada con platos reales del restaurante.',internalLinks:[]});}

test('B2 normalizes the real Release A HOME model and rejects duplicate routes',()=>{
  const x=product(),home=b.page(x,'home');
  assert.equal(home.path,'/');assert.equal(home.status,'published');assert.match(home.title,/Casa Real/);assert.equal(b.canPublish(x,home),true);
  addMenu(x);assert.equal(b.canPublish(x,b.page(x,'menu')),true);
  assert.throws(()=>b.createPage(x,{id:'dup',path:'/carta/'}),/duplicate page path/);
});

test('Thin Page Guard uses factual capability by page type instead of metadata alone',()=>{
  const x=product();
  b.createPage(x,{id:'chef',path:'/chef/',pageType:'chef',status:'published',indexable:true,title:'Chef',description:'Equipo de cocina.',h1:'Chef'});
  assert.equal(b.canPublish(x,b.page(x,'chef')),false);assert.ok(b.page(x,'chef').eligibility.reasons.includes('missing-real-chef'));
  x.seo.people.push({id:'chef-real',name:'Lucía Soler',type:'Person',role:'Chef'});assert.equal(b.canPublish(x,b.page(x,'chef')),true);
  b.createPage(x,{id:'reservas',path:'/reservas/',pageType:'reservas',status:'published',indexable:true,title:'Reservas',description:'Reserva tu mesa.',h1:'Reservas'});assert.equal(b.canPublish(x,b.page(x,'reservas')),true);x.visit.bookingUrl='#';assert.equal(b.canPublish(x,b.page(x,'reservas')),false);
  b.createPage(x,{id:'ubicacion',path:'/ubicacion/',pageType:'ubicacion',status:'published',indexable:true,title:'Ubicación',description:'Cómo llegar.',h1:'Dónde estamos'});assert.equal(b.canPublish(x,b.page(x,'ubicacion')),true);x.modules.location.address.city='';assert.equal(b.canPublish(x,b.page(x,'ubicacion')),false);
});

test('route migration creates redirect only for published paths and rewrites stored internal links',()=>{
  const x=product();addMenu(x);x.seo.pages.home.internalLinks=['/carta/'];
  const r=b.migratePath(x,'menu','/menu/','2026-09-14T10:00:00Z');assert.deepEqual(r,{from:'/carta/',to:'/menu/',status:308});assert.equal(x.seo.pages.home.internalLinks[0],'/menu/');assert.equal(x.seo.redirects.length,1);
  b.createPage(x,{id:'draftx',path:'/draft-old/',pageType:'generic',status:'draft',indexable:false,title:'Draft',description:'Draft',h1:'Draft',primaryQuery:'draft',content:'dato'});b.migratePath(x,'draftx','/draft-new/');assert.equal(x.seo.redirects.length,1,'draft route must not create production redirect');
});

test('B3 persists draft/published lifecycle, requires real author/dates/media and creates a Page Registry route',()=>{
  const x=product();addMenu(x);
  let a=b.saveArticle(x,{id:'a',title:'La gamba roja de Santa Pola',slug:'gamba-roja-santa-pola',excerpt:'Origen y técnica de nuestra gamba roja.',status:'draft',authorId:'author',category:'Producto',topics:['carta','producto'],entities:['dish-1'],primaryQuery:'gamba roja Santa Pola',headings:[{level:1,text:'La gamba roja de Santa Pola'},{level:2,text:'Origen'}],body:'Trabajamos la Gamba roja procedente de Santa Pola y explicamos su técnica.',coverMediaRef:'dish-1',internalLinks:['/carta/'],externalSources:[]});
  assert.equal(a.status,'draft');assert.equal(x.seo.blog.articles.length,1);assert.equal(x.seo.pages['blog:a'].status,'draft');
  a=b.saveArticle(x,{...a,status:'published',datePublished:'2026-09-14T10:00:00Z',dateModified:'2026-09-14T10:05:00Z'});assert.equal(a.indexable,true);const p=b.page(x,'blog:a');assert.equal(p.path,'/blog/gamba-roja-santa-pola/');assert.equal(b.canPublish(x,p),true);
  assert.throws(()=>b.saveArticle(x,{id:'b',title:'Duplicado',slug:'gamba-roja-santa-pola',status:'draft'}),/duplicate blog slug/);
  assert.throws(()=>b.saveArticle(x,{id:'bad',title:'Sin autor',slug:'sin-autor',excerpt:'x',status:'published',authorId:'missing',datePublished:'2026-09-14',dateModified:'2026-09-14',headings:[{level:1,text:'x'},{level:2,text:'y'}],body:'Gamba roja',coverMediaRef:'dish-1'}),/article not publishable/);
});

test('semantic Internal Linking uses shared factual signals and broken links are read from stored state',()=>{
  const x=product();addMenu(x);b.saveArticle(x,{id:'a',title:'Gamba roja',slug:'gamba-roja',excerpt:'Producto real.',status:'published',authorId:'author',datePublished:'2026-09-14T10:00:00Z',dateModified:'2026-09-14T10:00:00Z',category:'Producto',topics:['producto'],entities:['dish-1'],headings:[{level:1,text:'Gamba roja'},{level:2,text:'Origen'}],body:'Gamba roja de Santa Pola.',coverMediaRef:'dish-1',internalLinks:['/carta/']});
  const suggestions=b.semanticLinks(x);assert.ok(suggestions.some(s=>s.from==='blog:a'&&s.to==='/carta/'&&s.signals.length));
  x.seo.pages.menu.internalLinks=['/no-existe/'];const broken=b.brokenLinks(x);assert.ok(broken.some(l=>l.source==='menu'&&l.to==='/no-existe/'));
});

test('canonical Publisher materializes production HTML, Article schema, XML sitemap and redirects',()=>{
  const x=product();addMenu(x);b.saveArticle(x,{id:'a',title:'Gamba roja',slug:'gamba-roja',excerpt:'Producto real de Santa Pola.',status:'published',authorId:'author',datePublished:'2026-09-14T10:00:00Z',dateModified:'2026-09-14T10:00:00Z',category:'Producto',topics:['producto'],entities:['dish-1'],headings:[{level:1,text:'Gamba roja'},{level:2,text:'Origen'}],body:'Gamba roja de Santa Pola.',coverMediaRef:'dish-1',internalLinks:['/carta/']});
  const article=b.page(x,'blog:a'),html=pub.renderPage(x,article,'production');assert.match(html,/<h1>Gamba roja<\/h1>/);assert.match(html,/BlogPosting/);assert.match(html,/Restaurant/);assert.match(html,/index,follow/);assert.match(pub.renderPage(x,article,'preview'),/noindex,nofollow/);
  const xml=pub.renderPagesSitemap(x,'production');assert.match(xml,/^<\?xml/);assert.match(xml,/<urlset/);assert.match(xml,/\/carta\//);assert.match(xml,/\/blog\/gamba-roja\//);
  b.migratePath(x,'menu','/menu/');const redirects=pub.renderRedirects(x);assert.deepEqual(redirects[0],{source:'/carta/',destination:'/menu/',permanent:true,status:308});
});

test('Release B audit reports thin pages, broken links, orphan pages and invalid redirects',()=>{
  const x=product();addMenu(x);x.seo.pages.menu.internalLinks=['/missing/'];x.seo.redirects=[{from:'/old/',to:'/missing/',status:302}];b.createPage(x,{id:'thin',path:'/thin/',pageType:'generic',status:'published',indexable:true,title:'Thin',description:'Thin',h1:'Thin'});
  const ids=new Set(b.audit(x).map(i=>i.id));assert.ok([...ids].some(id=>id.includes('page.thin.thin')));assert.ok([...ids].some(id=>id.startsWith('link.menu.')));assert.ok(ids.has('redirect./old/'));
});

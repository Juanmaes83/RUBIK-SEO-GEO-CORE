'use strict';
/* CORE-3.1 (D-17): entityGraph().products no longer reads config.dishes. It uses the
   existing per-adapter source(config).offerings contract through the injected Core. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const releaseB=require('../src/rubik-seo-geo-release-b.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');

const FIXTURES=path.join(__dirname,'fixtures');
const GENERIC=['real-estate','professional-service','fitness-wellness','hospitality','retail','generic-local-business'];

function state(adapterId,extra={}){
  const c={brand:{name:'Casa Norte'},hero:{body:'Servicio local.'},seo:core.defaults(),...extra};
  c.seo.adapterId=adapterId;c.seo.site.baseUrl='https://host.example.test/';
  return c;
}
const project=list=>list.map(o=>({id:o.id,name:o.name,origin:o.origin}));

test('products() and entityGraph() no longer read config.dishes',()=>{
  const code=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-intelligence.js'),'utf8');
  for(const name of ['products','entityGraph']){
    const start=code.indexOf(` function ${name}(`);
    assert.ok(start>=0,name);
    const body=code.slice(start,code.indexOf('\n',start));
    assert.doesNotMatch(body,/dishes/,name);
  }
  // geoReadiness() is covered by tests/core-3-2-neutral-intelligence.test.cjs (D-18).
});

test('Restaurant: products from the LÚMINA fixture match the previous dishes projection',()=>{
  const c=JSON.parse(fs.readFileSync(path.join(FIXTURES,'restaurant-lumina-state.json'),'utf8'));
  c.seo=core.reconcile(c);
  assert.equal(core.adapter(c).id,'restaurant');
  const legacy=c.dishes.filter(d=>d?.enabled!==false).map(d=>({id:d.id,name:d.name,origin:d.origin??''}));
  assert.ok(legacy.length>0,'fixture has enabled dishes');
  assert.deepEqual(intelligence.products(c,{core}),legacy);
  assert.deepEqual(intelligence.entityGraph(c,{core}).products,legacy);
});

test('Restaurant: disabled and private dishes follow the adapter contract; services are not read',()=>{
  const c=state('restaurant',{dishes:[{id:'d1',name:'Gamba roja',origin:'Santa Pola'},{id:'d2',name:'Oculto',enabled:false},{id:'d3',name:{value:'Privado',visibility:'private'},origin:{value:'Denia',visibility:'public'}}],services:[{id:'s1',name:'No aplica'}]});
  assert.deepEqual(intelligence.products(c,{core}),[{id:'d1',name:'Gamba roja',origin:'Santa Pola'},{id:'d3',name:'',origin:'Denia'}]);
});

for(const adapterId of GENERIC){
  test(`${adapterId}: products come from services/products/offerings, never from dishes`,()=>{
    assert.deepEqual(intelligence.products(state(adapterId,{dishes:[{id:'d1',name:'Plato'}]}),{core}),[],'dishes are not part of this adapter contract');
    const services=state(adapterId,{services:[{id:'s1',name:'Asesoría',short:'Descripción'},{id:'s2',title:'Por título'},{id:'s3',name:'Oculto',enabled:false},{id:'s4',name:{value:'Privado',visibility:'private'}}]});
    assert.deepEqual(intelligence.products(services,{core}),[{id:'s1',name:'Asesoría',origin:''},{id:'s2',name:'Por título',origin:''}]);
    assert.deepEqual(intelligence.products(state(adapterId,{products:[{id:'p1',name:'Producto',origin:'Valencia'}]}),{core}),[{id:'p1',name:'Producto',origin:'Valencia'}]);
    assert.deepEqual(intelligence.products(state(adapterId,{offerings:[{id:'o1',name:'Oferta'}]}),{core}),[{id:'o1',name:'Oferta',origin:''}]);
  });
}

test('products mirror source(config).offerings for all seven adapters',()=>{
  for(const a of core.adapters()){
    const c=state(a.id,{dishes:[{id:'d1',name:'Plato',origin:'Alicante'}],services:[{id:'s1',name:'Servicio'}]});
    assert.deepEqual(intelligence.products(c,{core}),project(core.source(c).offerings),a.id);
  }
});

test('observed precedence: the first array present among services/products/offerings wins, even when empty',()=>{
  assert.deepEqual(intelligence.products(state('retail',{products:[{id:'p1',name:'P'}],offerings:[{id:'o1',name:'O'}]}),{core}).map(p=>p.id),['p1']);
  assert.deepEqual(intelligence.products(state('retail',{services:[],products:[{id:'p1',name:'P'}]}),{core}),[]);
});

test('absence of data yields an empty list for every adapter',()=>{
  for(const a of core.adapters())assert.deepEqual(intelligence.products(state(a.id),{core}),[],a.id);
  assert.deepEqual(intelligence.products(undefined,{core}),[]);
});

test('without the injected Core the result is a fresh empty list; globals are ignored',()=>{
  const c=state('restaurant',{dishes:[{id:'d1',name:'Plato'}]});
  const previous=globalThis.RubikSEOGeoCore;
  globalThis.RubikSEOGeoCore=core;
  try{
    const first=intelligence.products(c);
    assert.deepEqual([first,intelligence.products(c,{}),intelligence.products(c,{core:null}),intelligence.entityGraph(c).products],[[],[],[],[]]);
    first.push('mutated');
    assert.deepEqual(intelligence.products(c),[],'no state shared between calls');
  }finally{
    if(previous===undefined)delete globalThis.RubikSEOGeoCore;else globalThis.RubikSEOGeoCore=previous;
  }
});

test('an injected Core without source() is a wiring error',()=>{
  assert.throws(()=>intelligence.products(state('retail'),{core:{}}),TypeError);
  assert.throws(()=>intelligence.entityGraph(state('retail'),{core:{source:'nope'}}),TypeError);
});

test('malformed null entries fail exactly like the adapter contract (no silent repair)',()=>{
  for(const [id,extra] of [['restaurant',{dishes:[null]}],['retail',{services:[null]}]]){
    const c=state(id,extra);
    assert.throws(()=>core.source(c),TypeError);
    assert.throws(()=>intelligence.products(c,{core}),TypeError,id);
  }
});

test('entityGraph keeps both dependencies explicit and independent',()=>{
  const c=state('professional-service',{services:[{id:'s1',name:'Asesoría'}]});
  releaseB.createPage(c,{id:'servicios',path:'/servicios/',pageType:'generic',status:'published',indexable:true,title:'Servicios',description:'Servicios profesionales.',h1:'Servicios',primaryQuery:'servicios',content:'Contenido factual suficiente.',internalLinks:['/']});
  c.seo=core.reconcile(c);
  const both=intelligence.entityGraph(c,{releaseB,core});
  assert.deepEqual(both.products.map(p=>p.id),['s1']);
  assert.ok(both.pages.length>0);
  assert.deepEqual(intelligence.entityGraph(c,{core}).pages,[]);
  assert.deepEqual(intelligence.entityGraph(c,{releaseB}).products,[]);
});

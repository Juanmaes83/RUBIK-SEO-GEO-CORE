'use strict';
/* CORE-3.2 (D-18): geoReadiness() and entityGraph().business/location derive from the
   active adapter's source(config) through the injected Core. No config.dishes, brand.name
   or modules.location reads; no globals; no Restaurant fallback. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const intelligence=require('../src/rubik-seo-geo-intelligence.js');

const SRC=path.join(__dirname,'..','src','rubik-seo-geo-intelligence.js');
const GENERIC=['real-estate','professional-service','fitness-wellness','hospitality','retail','generic-local-business'];
const ALL=['restaurant',...GENERIC];

function state(adapterId,extra={}){
  const c={seo:core.defaults(),...extra};
  c.seo.adapterId=adapterId;
  return c;
}
const hostShape=()=>({brand:{name:'Casa Norte'},modules:{location:{enabled:true,address:{street:'Calle Mayor 1',city:'Alicante',postalCode:'03001',country:'ES'}}}});
const genericShape=()=>({business:{name:'Negocio Genérico',address:{street:'Av. Puerto 2',city:'Valencia',country:'ES'}},services:[{id:'s1',name:'Asesoría'}]});

test('Intelligence code no longer reads dishes, brand.name or modules.location',()=>{
  const code=fs.readFileSync(SRC,'utf8');
  for(const name of ['adapterSource','products','entityGraph','geoReadiness']){
    const start=code.indexOf(` function ${name}(`);
    assert.ok(start>=0,name);
    const body=code.slice(start,code.indexOf('\n',start));
    assert.doesNotMatch(body,/dishes|brand\??\.|modules\??\.|business\??\.|globalThis|restaurant/i,name);
  }
});

for(const adapterId of ALL){
  test(`${adapterId}: entityGraph business/location/products mirror the adapter source`,()=>{
    const c=state(adapterId,{...hostShape(),dishes:[{id:'d1',name:'Plato'}],services:[{id:'s1',name:'Servicio'}]});
    const source=core.source(c),g=intelligence.entityGraph(c,{core});
    assert.equal(g.business,source.name);
    assert.deepEqual(g.location,source.address);
    assert.deepEqual(g.products,source.offerings.map(o=>({id:o.id,name:o.name,origin:o.origin})));
    assert.equal(g.business,'Casa Norte');
    assert.deepEqual(g.location,{streetAddress:'Calle Mayor 1',addressLocality:'Alicante',postalCode:'03001',addressCountry:'ES'});
    assert.deepEqual(g.products.map(p=>p.id),[adapterId==='restaurant'?'d1':'s1']);
  });

  test(`${adapterId}: geoReadiness signals come from the adapter source and stay HEURISTIC`,()=>{
    const c=state(adapterId,{...hostShape(),dishes:[{id:'d1',name:'Plato'}],services:[{id:'s1',name:'Servicio'}]});
    const g=intelligence.geoReadiness(c,{core});
    assert.equal(g.entity.label,'HEURISTIC');
    assert.equal(g.citation.label,'HEURISTIC');
    assert.equal(g.entity.adapterSource,'PROVIDED');
    assert.deepEqual(g.entity.signals,{businessName:true,location:true,people:false,products:true});
    assert.deepEqual(g.entity.gaps,[]);
    assert.deepEqual(g.citation.strengths,['factual business and product signals']);
    assert.equal(g.content.factualSignals,1);
    assert.equal(g.aiSearch.status,'NOT_MEASURED');
    assert.equal(g.technical.structuredData,'NOT_MEASURED');
  });
}

test('generic business.* forms are used by the six generic adapters, not by Restaurant',()=>{
  for(const adapterId of GENERIC){
    const c=state(adapterId,genericShape());
    const g=intelligence.entityGraph(c,{core}),r=intelligence.geoReadiness(c,{core});
    assert.equal(g.business,'Negocio Genérico',adapterId);
    assert.deepEqual(g.location,{streetAddress:'Av. Puerto 2',addressLocality:'Valencia',addressCountry:'ES'},adapterId);
    assert.deepEqual(g.products.map(p=>p.id),['s1'],adapterId);
    assert.deepEqual(r.entity.signals,{businessName:true,location:true,people:false,products:true},adapterId);
  }
  // Restaurant's observed contract reads brand.name / modules.location / dishes only: honest empties, never inferred.
  const c=state('restaurant',genericShape());
  const g=intelligence.entityGraph(c,{core}),r=intelligence.geoReadiness(c,{core});
  assert.deepEqual([g.business,g.location,g.products],['',{},[]]);
  assert.deepEqual(r.entity.signals,{businessName:false,location:false,people:false,products:false});
  assert.deepEqual(r.entity.gaps,['business-name','location']);
  assert.deepEqual(r.citation.weaknesses,['insufficient first-party facts']);
  assert.equal(r.content.factualSignals,0);
});

test('offerings drive the product signal per adapter contract',()=>{
  for(const adapterId of GENERIC){
    assert.equal(intelligence.geoReadiness(state(adapterId,{...hostShape(),dishes:[{id:'d1',name:'Plato'}]}),{core}).entity.signals.products,false,adapterId+' ignores dishes');
    assert.equal(intelligence.geoReadiness(state(adapterId,{...hostShape(),products:[{id:'p1',name:'Producto'}]}),{core}).entity.signals.products,true,adapterId);
  }
  assert.equal(intelligence.geoReadiness(state('restaurant',{...hostShape(),services:[{id:'s1',name:'Servicio'}]}),{core}).entity.signals.products,false,'restaurant ignores services');
});

test('private values are not exposed and a street without city is an honest location gap',()=>{
  const c=state('real-estate',{brand:{name:{value:'Privada',visibility:'private'}},business:{name:'Pública'},visit:{address:'Muelle 8'},modules:{location:{address:{city:{value:'Oculta',visibility:'private'}}}}});
  const g=intelligence.entityGraph(c,{core}),r=intelligence.geoReadiness(c,{core});
  assert.equal(g.business,'Pública');
  assert.deepEqual(g.location,{streetAddress:'Muelle 8'});
  assert.equal(r.entity.signals.location,false);
  assert.deepEqual(r.entity.gaps,['location']);
});

test('incomplete data with Core: empties and gaps, never invented values',()=>{
  for(const adapterId of ALL){
    const g=intelligence.entityGraph(state(adapterId),{core}),r=intelligence.geoReadiness(state(adapterId),{core});
    assert.deepEqual([g.business,g.location,g.products],['',{},[]],adapterId);
    assert.deepEqual(r.entity.signals,{businessName:false,location:false,people:false,products:false},adapterId);
    assert.deepEqual(r.entity.gaps,['business-name','location'],adapterId);
  }
  assert.deepEqual(intelligence.entityGraph(undefined,{core}).location,{});
  assert.equal(intelligence.geoReadiness(undefined,{core}).entity.adapterSource,'PROVIDED');
});

test('without Core: deterministic NOT_PROVIDED, no inferred business/location/products',()=>{
  const c=state('restaurant',{...hostShape(),dishes:[{id:'d1',name:'Plato'}],seo:{...core.defaults(),people:[{id:'a',name:'Ana'}]}});
  for(const deps of [undefined,{},{core:null},{releaseB:null}]){
    const g=intelligence.entityGraph(c,deps),r=intelligence.geoReadiness(c,deps);
    assert.deepEqual([g.business,g.location,g.products,g.pages],['',{},[],[]]);
    assert.deepEqual(g.people,[{id:'a',name:'Ana'}],'people stays in the Core seo namespace');
    assert.equal(r.entity.adapterSource,'NOT_PROVIDED');
    assert.deepEqual(r.entity.signals,{businessName:null,location:null,people:true,products:null});
    assert.deepEqual(r.entity.gaps,[]);
    assert.deepEqual([r.citation.strengths,r.citation.weaknesses],[[],[]]);
    assert.equal(r.content.factualSignals,null);
    assert.equal(r.entity.label,'HEURISTIC');
  }
});

test('an injected Core without source() is a wiring error for entityGraph and geoReadiness',()=>{
  for(const bad of [{},{source:'nope'},{source:null}]){
    assert.throws(()=>intelligence.entityGraph(state('retail'),{core:bad}),TypeError);
    assert.throws(()=>intelligence.geoReadiness(state('retail'),{core:bad}),TypeError);
  }
});

test('contaminated globals are ignored without an injected Core',()=>{
  const keys=['RubikSEOGeoCore','RubikSEOGeoAdapters','RestaurantDefaults'],saved=keys.map(k=>[k,globalThis[k]]);
  globalThis.RubikSEOGeoCore={source:()=>({name:'LEAK',city:'LEAK',address:{addressLocality:'LEAK'},offerings:[{id:'x',name:'LEAK'}]})};
  globalThis.RubikSEOGeoAdapters={resolve:()=>{throw new Error('must not be used');}};
  globalThis.RestaurantDefaults={brand:{name:'LEAK'}};
  try{
    const c=state('hospitality',hostShape());
    assert.doesNotMatch(JSON.stringify(intelligence.entityGraph(c)),/LEAK/);
    assert.doesNotMatch(JSON.stringify(intelligence.geoReadiness(c)),/LEAK/);
  }finally{
    for(const [k,v] of saved){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
  }
});

test('entityGraph resolves the adapter source once and returns an independent location copy',()=>{
  let calls=0;
  const spy={source:config=>{calls++;return core.source(config);}};
  const c=state('professional-service',hostShape());
  const g=intelligence.entityGraph(c,{core:spy});
  assert.equal(calls,1);
  g.location.addressLocality='MUTATED';
  assert.equal(intelligence.entityGraph(c,{core}).location.addressLocality,'Alicante');
});

test('Restaurant LÚMINA fixture: business/location/products from the restaurant adapter',()=>{
  const c=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','restaurant-lumina-state.json'),'utf8'));
  c.seo=core.reconcile(c);
  const source=core.source(c),g=intelligence.entityGraph(c,{core});
  assert.equal(core.adapter(c).id,'restaurant');
  assert.equal(g.business,source.name);
  assert.ok(g.business,'fixture has a public brand name');
  assert.deepEqual(g.location,source.address);
  assert.equal(intelligence.geoReadiness(c,{core}).entity.signals.products,g.products.length>0);
});

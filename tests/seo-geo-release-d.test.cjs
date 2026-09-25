const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/rubik-seo-geo-core.js');
const publisher=require('../src/rubik-seo-geo-publisher.js');

const restaurantFixture=()=>({
  brand:{name:'Mar Abierto'},hero:{body:'Cocina de temporada.'},
  visit:{contact:'hola@example.org',address:'Texto legado',bookingUrl:'#'},
  modules:{location:{enabled:true,address:{street:'Calle Mar 2',city:'Alicante',country:'ES'},phone:'+34 612 345 678'}},
  dishes:[{id:'dish-a',name:'Arroz',origin:'Huerta',ingredients:'Arroz y verduras'}],
  media:{hero:{type:'image',url:'assets/hero.webp'}},seo:core.defaults()
});
const realEstateFixture=()=>{
  const c={brand:{name:'Casa Norte'},hero:{body:'Buyer agent independiente para compradores internacionales.'},business:{name:'Casa Norte'},modules:{location:{enabled:true,address:{city:'Alicante',country:'ES'}}},services:[{id:'buyer-agent',name:'Buyer Agent',description:'Búsqueda y negociación independiente.',enabled:true}],media:{hero:{type:'image',url:'assets/hero.webp'}},seo:core.defaults()};
  c.seo.adapterId='real-estate';c.seo.business.category='Buyer Agent';c.seo.site.baseUrl='https://casa-norte.example.test';return c;
};

test('Release D registers reusable vertical adapters without cloning the Core',()=>{
  const rows=core.adapters(),ids=rows.map(x=>x.id);
  for(const id of ['restaurant','real-estate','professional-service','fitness-wellness','hospitality','retail','generic-local-business'])assert.ok(ids.includes(id),`missing adapter ${id}`);
  assert.ok(rows.length>=7);
});

test('Restaurant remains the default and preserves Release A-C output exactly',()=>{
  const c=restaurantFixture(),p=core.preview(c),entity=core.primaryEntity(c);
  assert.equal(p.adapter.id,'restaurant');
  assert.equal(p.home.seo.title.value,'Mar Abierto | Restaurante en Alicante');
  assert.equal(p.home.seo.description.value,'Mar Abierto es restaurante en Alicante. Cocina de temporada.');
  assert.equal(p.home.seo.h1.value,'Mar Abierto en Alicante');
  assert.deepEqual(p.schema['@graph'].map(x=>x['@type']),['WebSite','WebPage','Restaurant']);
  assert.equal(entity['@type'],'Restaurant');
  assert.equal(p.source.dishes[0].name,'Arroz');
});

test('Real-estate adapter projects the same host state through the shared Core',()=>{
  const c=realEstateFixture(),p=core.preview(c),entity=core.primaryEntity(c);
  assert.equal(p.adapter.id,'real-estate');
  assert.equal(p.adapter.schemaType,'RealEstateAgent');
  assert.equal(entity['@type'],'RealEstateAgent');
  assert.equal(entity.name,'Casa Norte');
  assert.equal(p.source.offerings[0].name,'Buyer Agent');
  assert.equal(p.home.seo.title.value,'Casa Norte | Buyer Agent en Alicante');
  assert.doesNotMatch(JSON.stringify(p.schema),/servesCuisine|aggregateRating|review/);
});

test('CUSTOM fields survive switching adapters and AUTO fields recalculate',()=>{
  const c=restaurantFixture();c.seo=core.reconcile(c,'2026-09-16T10:00:00Z');
  c.seo.pages.home.seo.title={...c.seo.pages.home.seo.title,mode:'custom',value:'Título humano',updatedAt:'manual'};
  c.seo.adapterId='professional-service';c.services=[{id:'strategy',name:'Consultoría estratégica',enabled:true}];
  c.seo=core.reconcile(c,'2026-09-16T10:01:00Z');
  assert.equal(c.seo.pages.home.seo.title.value,'Título humano');
  assert.equal(c.seo.pages.home.seo.title.mode,'custom');
  assert.equal(c.seo.pages.home.seo.title.updatedAt,'manual');
  assert.equal(c.seo.business.schemaType,'ProfessionalService');
  assert.match(c.seo.pages.home.seo.description.value,/servicios profesionales/i);
});

test('Publisher follows the active adapter for HOME and internal page graphs',()=>{
  const c=realEstateFixture();
  const out=publisher.publish(c,'production');
  assert.equal(out.publisher.adapter.id,'real-estate');
  assert.equal(out.publisher.schema['@graph'].find(x=>x['@type']==='RealEstateAgent')?.name,'Casa Norte');
  assert.match(out.publisher.head,/RealEstateAgent/);
  assert.match(out.publisher.head,/index,follow/);
});

test('Adapter layer has no parallel storage or blob persistence',()=>{
  const code=fs.readFileSync(path.join(__dirname,'..','src','rubik-seo-geo-adapters.js'),'utf8');
  for(const banned of ['localStorage','indexedDB','createObjectURL'])assert.doesNotMatch(code,new RegExp(banned));
  assert.doesNotMatch(code,/\bcaches\b/);
});

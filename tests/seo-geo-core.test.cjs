const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/rubik-seo-geo-core.js');
const fixture=()=>({brand:{name:'Mar Abierto'},hero:{body:'Cocina de temporada.'},visit:{contact:'hola@example.org',address:'Texto legado',bookingUrl:'#'},modules:{location:{enabled:true,address:{street:'Calle Mar 2',city:'Alicante',country:'ES'},phone:'+34 612 345 678'}},dishes:[{id:'dish-a',name:'Arroz',origin:'Huerta',ingredients:'Arroz y verduras'}],media:{hero:{type:'image',url:'assets/hero.webp'}},seo:core.defaults()});
test('source changes regenerate AUTO title/meta/H1 without adding phone or dish',()=>{
 const c=fixture();c.seo=core.reconcile(c,'2026-01-01');
 assert.equal(c.seo.pages.home.seo.title.value,'Mar Abierto | Restaurante en Alicante');
 c.modules.location.address.city='Altea';c.brand.name='Mesa Clara';c.seo=core.reconcile(c,'2026-01-02');
 for(const f of Object.values(c.seo.pages.home.seo)){assert.match(f.value,/Mesa Clara/);assert.match(f.value,/Altea/);assert.doesNotMatch(f.value,/Alicante|Mar Abierto|612|Arroz/);assert.equal(f.updatedAt,'2026-01-02');assert.ok(f.derivedFrom.length);}
 assert.deepEqual(core.reconcile(c,'2026-01-03'),c.seo);
});
test('CUSTOM survives source changes and reset recalculates with provenance',()=>{
 const c=fixture();c.seo=core.reconcile(c);
 c.seo.pages.home.seo.title={...c.seo.pages.home.seo.title,mode:'custom',value:'Una mesa junto al mar',updatedAt:'yesterday'};
 c.brand.name='Otro negocio';c.modules.location.address.city='Valencia';c.seo=core.reconcile(c);
 assert.equal(c.seo.pages.home.seo.title.value,'Una mesa junto al mar');assert.equal(c.seo.pages.home.seo.title.updatedAt,'yesterday');
 c.seo.pages.home.seo.title.mode='auto';c.seo=core.reconcile(c);assert.equal(c.seo.pages.home.seo.title.value,'Otro negocio | Restaurante en Valencia');
});
test('schema is parseable Restaurant, public/private gate, confirmation invalidation',()=>{
 const c=fixture();c.seo.site.baseUrl='https://restaurant.example.org';
 c.seo.visibility={address:'public',phone:'public',email:'private'};
 assert.equal(core.preview(c).schema.telephone,undefined);
 c.seo.business.publicDataConfirmed=true;c.seo.business.confirmationSignature=core.signature(c);
 let p=core.preview(c);const restaurant=p.schema['@graph'].find(x=>x['@type']==='Restaurant');assert.equal(restaurant.telephone,c.modules.location.phone);assert.equal(restaurant.address.addressLocality,'Alicante');assert.equal(restaurant.email,undefined);
 assert.equal(restaurant['@id'],'https://restaurant.example.org/#restaurant');assert.equal(restaurant.aggregateRating,undefined);assert.equal(restaurant.review,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(p.schema)),p.schema);
 c.modules.location.address.city='Altea';p=core.preview(c);assert.equal(p.seo.business.publicDataConfirmed,false);assert.equal(p.schema.telephone,undefined);
});
test('private source wrappers and disabled module never leak contact into schema',()=>{
 const c=fixture();c.visit.contact={value:'secret@example.org',visibility:'internal'};c.modules.location.phone={value:'+34666666666',visibility:'private'};
 c.seo.visibility={address:'public',phone:'public',email:'public'};c.modules.location.enabled=false;
 c.seo.business.publicDataConfirmed=true;c.seo.business.confirmationSignature=core.signature(c);
 const s=core.preview(c).schema;assert.doesNotMatch(JSON.stringify(s),/secret|666666/);
});
test('missing city remains missing; no parsing editorial text or fabricated data',()=>{
 const c=fixture();c.modules.location.address={};c.hero.kicker='Madrid Â· Dining';c.seo.business.cuisine=[];
 const p=core.preview(c);assert.equal(p.home.seo.title.value,'Mar Abierto | Restaurante');assert.equal(p.source.city,'');assert.equal(p.schema.servesCuisine,undefined);assert.equal(p.schema.geo,undefined);assert.equal(p.schema.openingHoursSpecification,undefined);
});
test('adapter preserves dish context and media references without HOME keyword stuffing',()=>{
 const p=core.preview(fixture());assert.equal(p.source.dishes[0].origin,'Huerta');assert.equal(p.source.dishes[0].mediaRef,'dish-a');assert.deepEqual(p.source.media,[{ref:'hero',type:'image'}]);assert.doesNotMatch(p.home.seo.title.value,/Arroz/);
});
test('URL candidate validates HTTPS, credentials, fragments and parameters',()=>{
 for(const url of ['javascript:alert(1)','http://example.org','https://a:b@example.org','https://example.org/?preview=1','https://example.org/#visit','https://localhost'])assert.equal(core.baseUrl(url),'');
 assert.equal(core.baseUrl('https://example.org/restaurant'),'https://example.org/restaurant/');
});
test('HOME only, no fake pages, honest unconnected measurements and publisher gate',()=>{
 const p=core.preview(fixture());assert.deepEqual(Object.keys(p.seo.pages),['home']);assert.equal(p.home.path,'/');assert.equal(p.policy.preview,'noindex');assert.equal(p.policy.applied,false);
 assert.equal(p.measurements.dataForSEO,'NOT MEASURED');assert.equal(p.measurements.searchConsole,'NOT CONNECTED');assert.equal(p.measurements.openSEO,'NOT CONNECTED');assert.ok(p.checks.some(c=>c.id==='canonical'&&c.severity==='BLOCKER'));assert.ok(p.checks.some(c=>c.id==='publisher'&&c.severity==='DEFERRED'));
});
test('España-first formula, custom fields and unknown import data survive without mutation',()=>{
 const c=fixture();c.seo.site.defaultLanguage='en';c.seo.future={keep:true};const original=JSON.stringify(c);
 assert.equal(core.preview(c).home.seo.title.value,'Mar Abierto | Restaurante en Alicante');assert.deepEqual(core.reconcile(c).site.supportedLanguages,['es']);assert.equal(JSON.stringify(c),original);assert.deepEqual(core.reconcile(c).future,{keep:true});
});

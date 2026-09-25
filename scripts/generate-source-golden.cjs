/* Regenerates tests/fixtures/golden/source-388e48a-publish.json from a SOURCE checkout of
   Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA (read-only). Usage, from the Core repo root:
     mkdir -p <dir>/src && git -C <source> archive 388e48a | tar -x -C <dir>/src
     node scripts/generate-source-golden.cjs <dir>
   Used once during extraction; the golden must only change with a documented decision. */
const fs=require('fs');const SP=process.argv[2];
const core=require(SP+'/src/rubik-seo-geo-core.js'),pub=require(SP+'/src/rubik-seo-geo-publisher.js');
const scrub=x=>JSON.parse(JSON.stringify(x).replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g,'<ISO>'));
const lumina=()=>{const c=JSON.parse(fs.readFileSync('tests/fixtures/restaurant-lumina-state.json','utf8'));c.seo=core.reconcile(c);c.seo.site.baseUrl='https://restaurant.example.test/';c.seo.business.category='Restaurante mediterráneo';c.seo.business.cuisine=['Mediterránea'];return c;};
const realEstate=()=>{const c={brand:{name:'Casa Norte'},hero:{body:'Asesoría de compra independiente.'},business:{name:'Casa Norte',address:{city:'Alicante',country:'ES'}},services:[{id:'s1',name:'Búsqueda de vivienda',short:'Representación del comprador.'}],seo:core.defaults()};c.seo.adapterId='real-estate';c.seo.business.category='Buyer Agent';c.seo.site.baseUrl='https://casa-norte.example.test/';return c;};
const out={source:'Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a98e881aff4adf26f16a0679dc3e1f11f5',cases:{}};
for(const [name,f] of Object.entries({lumina,realEstate}))for(const env of ['production','preview']){const p=pub.publish(f(),env);out.cases[name+':'+env]=scrub({seo:p.seo,publisher:p.publisher,preview:core.preview(f())});}
fs.writeFileSync('tests/fixtures/golden/source-388e48a-publish.json',JSON.stringify(out,null,1)+'\n');
console.log(Object.keys(out.cases));

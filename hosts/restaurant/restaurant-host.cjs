/* Reference host integration — Restaurantes Premium (Restaurant Experience Engine).
   Host-specific code moved out of the Core materializer. Extracted verbatim from
   WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a scripts/seo-geo-materialize-public.cjs
   (premiumHomeBody, loadDefaultProjectState). It paints the Restaurant premium HOME
   template slots; it owns no SEO decision. The Core Publisher stays the only authority. */
'use strict';

const fs=require('node:fs');
const vm=require('node:vm');
const materializer=require('../../src/rubik-seo-geo-materialize.cjs');

const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const text=value=>typeof value==='string'?value.trim():'';
const escapeRe=value=>String(value).replace(/[.*+?^$()|[\]\\]/g,'\\$&');

function pathGet(obj,key){
  return String(key||'').split('.').reduce((acc,part)=>acc?.[part],obj);
}

function replaceTextById(html,id,value){
  const safe=esc(value);
  const re=new RegExp('(<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=["\\\']'+escapeRe(id)+'["\\\'][^>]*>)[\\s\\S]*?(<\\/\\2>)','i');
  return html.replace(re,(m,open,tag,close)=>open+safe+close);
}

function replaceInnerById(html,id,markup){
  const re=new RegExp('(<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=["\\\']'+escapeRe(id)+'["\\\'][^>]*>)[\\s\\S]*?(<\\/\\2>)','i');
  return html.replace(re,(m,open,tag,close)=>open+markup+close);
}

function replaceMediaHost(html,slot,markup){
  const re=new RegExp('(<div\\b[^>]*data-media-host=["\\\']'+escapeRe(slot)+'["\\\'][^>]*>)[\\s\\S]*?(<\\/div>)','i');
  return html.replace(re,(m,open,close)=>open+markup+close);
}

function premiumHomeBody(template,state){
  const map={
    'hero-kicker':'hero.kicker','hero-line1':'hero.line1','hero-line2':'hero.line2',
    'hero-body':'hero.body','hero-cta':'hero.cta','hero-stamp':'hero.stamp',
    'scroll-hint':'hero.scroll','philosophy-index':'philosophy.index',
    'philosophy-title':'philosophy.title','philosophy-body1':'philosophy.body1',
    'philosophy-body2':'philosophy.body2','orbital-index':'orbital.index',
    'orbital-kicker':'orbital.kicker','orbital-title':'orbital.title',
    'explore-label':'orbital.explore','origin-index':'origin.index',
    'origin-title':'origin.title','origin-body':'origin.body','origin-caption':'origin.caption',
    'atmosphere-index':'atmosphere.index','atmosphere-title':'atmosphere.title',
    'atmosphere-caption':'atmosphere.caption','atmosphere-body':'atmosphere.body',
    'atmosphere-cta':'atmosphere.cta','chef-index':'chef.index','chef-title':'chef.title',
    'chef-quote':'chef.quote','visit-kicker':'visit.kicker','visit-title':'visit.title',
    'visit-cta':'visit.cta','address-label':'visit.addressLabel','address-text':'visit.address',
    'service-label':'visit.serviceLabel','service-text':'visit.service',
    'contact-label':'visit.contactLabel','contact-text':'visit.contact',
    'footer-left':'footer.left','footer-center':'footer.center','footer-right':'footer.right'
  };
  let html=String(template);
  for(const [id,key] of Object.entries(map)) html=replaceTextById(html,id,pathGet(state,key)??'');

  const badges=(state.chef?.badges||[]).map(x=>'<span>'+esc(x)+'</span>').join('');
  html=replaceInnerById(html,'chef-badges',badges);

  const dishes=(state.dishes||[]).filter(d=>d&&d.enabled!==false&&text(d.name));
  if(dishes.length){
    const first=dishes[0];
    html=replaceTextById(html,'dish-meta',first.meta||'');
    html=replaceTextById(html,'dish-title',first.name||'');
    html=replaceTextById(html,'dish-short',first.short||'');
    html=replaceTextById(html,'dish-counter','01 / '+String(dishes.length).padStart(2,'0'));
    const buttons=dishes.map(d=>'<button type="button" class="orbit-dish" data-id="'+esc(d.id)+'"><img src="'+esc(d.image||'')+'" alt="'+esc(d.name)+'"></button>').join('');
    html=replaceInnerById(html,'orbit-stage',buttons);
  }

  for(const slot of ['hero','origin','atmosphere','chef']){
    const m=state.media?.[slot]||{};
    if(!text(m.url)) continue;
    const tag=m.type==='video'
      ? '<video class="section-media-element" src="'+esc(m.url)+'" muted loop playsinline preload="metadata"></video>'
      : '<img class="section-media-element" src="'+esc(m.url)+'" alt="" loading="'+(slot==='hero'?'eager':'lazy')+'">';
    html=replaceMediaHost(html,slot,tag);
  }

  return html;
}

/* The host's defaults live in its own repository (class4-config.js). The path is
   mandatory: the Core never reaches into a host checkout implicitly. */
function loadDefaultProjectState(file){
  if(!file) throw new Error('loadDefaultProjectState requires the host class4-config.js path');
  const source=fs.readFileSync(file,'utf8');
  const sandbox={window:{},console:{log(){},warn(){},error(){}}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{filename:file,timeout:3000});
  if(!sandbox.window.RestaurantDefaults) throw new Error('RestaurantDefaults not found');
  return clone(sandbox.window.RestaurantDefaults);
}

function materializeSite(options){
  return materializer.materializeSite({...options,renderHomeBody:premiumHomeBody});
}

module.exports=Object.freeze({
  renderHomeBody:premiumHomeBody,
  premiumHomeBody,
  loadDefaultProjectState,
  materializeSite
});

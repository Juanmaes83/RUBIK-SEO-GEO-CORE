'use strict';
/* CORE-6 (D-19): multilingual contract. One Page Registry page per language, explicit
   translationKey, no inferred or generated translations, hreflang only among published,
   indexable, equivalent and reciprocal pages, no x-default, single-es output unchanged. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const core=require('../src/rubik-seo-geo-core.js');
const b=require('../src/rubik-seo-geo-release-b.js');
const pub=require('../src/rubik-seo-geo-publisher.js');
const materializer=require('../src/rubik-seo-geo-materialize.cjs');

const BASE='https://host.example.test/';
const TEMPLATE='<!doctype html><html lang="es"><head><meta charset="utf-8"><title data-rubik-seo="title">x</title></head><body><main><h1>Casa Norte</h1></main></body></html>';

function site(adapterId='real-estate',languages=['es','en','fr']){
  const c={brand:{name:'Casa Norte'},hero:{body:'Servicio local verificable.'},business:{address:{city:'Alicante'}},media:{hero:{type:'image',url:'https://cdn.example.test/hero.webp'}},dishes:[{id:'d1',name:'Plato'}],seo:core.defaults()};
  c.seo.adapterId=adapterId;c.seo.site.baseUrl=BASE;c.seo.site.supportedLanguages=languages;
  return c;
}
function page(id,pagePath,{locale,key,title,...rest}={}){
  const t=title||('Página '+id);
  const p={id,path:pagePath,pageType:'generic',status:'published',indexable:true,title:t,description:t+' · descripción única.',h1:t,primaryQuery:'consulta '+id,content:'Contenido factual suficiente para '+id+'.',internalLinks:['/'],socialImageRef:'hero',...rest};
  if(locale!==undefined)p.locale=locale;
  if(key!==undefined)p.translationKey=key;
  return p;
}
function trio(adapterId){
  const c=site(adapterId);
  c.seo.pages.about=page('about','/sobre/',{key:'about',title:'Sobre nosotros'});
  c.seo.pages.aboutEn=page('aboutEn','/en/about/',{locale:'en',key:'about',title:'About us'});
  c.seo.pages.aboutFr=page('aboutFr','/fr/a-propos/',{locale:'fr',key:'about',title:'À propos'});
  return c;
}
const hreflangs=html=>[...String(html).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)" data-rubik-seo="hreflang">/g)].map(m=>[m[1],m[2]]);
const pageHtml=(c,p,env='production')=>pub.renderPage(c,b.page(c,p),env);

// ── Locale identifiers and site languages ─────────────────────────────────────

test('normalizeLocale accepts language + optional region and rejects everything else',()=>{
  const ok={'es':'es','ES':'es','en_gb':'en-GB','en-GB':'en-GB','pt-br':'pt-BR','es-419':'es-419','ast':'ast'};
  for(const [input,out] of Object.entries(ok))assert.equal(core.normalizeLocale(input),out,input);
  for(const bad of ['','e','english','zh-Hant','en-GB-x','en--GB','en-G',' ',null,undefined,42,{},'es/ES','../es'])assert.equal(core.normalizeLocale(bad),'',String(bad));
});

test('languageSettings keeps es as default, adds valid declared locales, never invents languages',()=>{
  assert.deepEqual(core.languageSettings(undefined),{defaultLanguage:'es',supportedLanguages:['es']});
  assert.deepEqual(core.languageSettings({supportedLanguages:['es']}),{defaultLanguage:'es',supportedLanguages:['es']});
  assert.deepEqual(core.languageSettings({supportedLanguages:['EN','en','fr_FR','bad-tag-x','es']}).supportedLanguages,['es','en','fr-FR']);
  assert.deepEqual(core.languageSettings({supportedLanguages:'en'}).supportedLanguages,['es']);
  const c=site('retail',['en']);c.seo.site.defaultLanguage='en';
  const seo=core.reconcile(c);
  assert.equal(seo.site.defaultLanguage,'es','default stays es: AUTO formulas are Spanish-only');
  assert.deepEqual(seo.site.supportedLanguages,['es','en']);
});

// ── Single-language compatibility ─────────────────────────────────────────────

test('single-es site: no hreflang, lang="es", no inLanguage, even with a translationKey',()=>{
  const c=site('real-estate',['es']);
  c.seo.pages.about=page('about','/sobre/',{key:'about'});
  const out=pub.publish(c,'production');
  for(const html of Object.values(out.publisher.pages)){
    assert.deepEqual(hreflangs(html),[]);
    assert.match(html,/^<!doctype html><html lang="es">/);
    assert.doesNotMatch(html,/inLanguage/);
  }
  assert.deepEqual(hreflangs(out.publisher.head),[]);
  assert.equal(out.publisher.schema['@graph'].find(n=>n['@type']==='WebPage').inLanguage,undefined);
  assert.deepEqual(b.alternates(c,'about'),[]);
});

// ── Translated pages and reciprocal hreflang ──────────────────────────────────

for(const adapterId of ['real-estate','restaurant','professional-service']){
  test(`${adapterId}: three explicitly linked translations emit the same reciprocal, self-referencing set`,()=>{
    const c=trio(adapterId);
    const expected=[['en',BASE+'en/about/'],['es',BASE+'sobre/'],['fr',BASE+'fr/a-propos/']];
    for(const [id,lang] of [['about','es'],['aboutEn','en'],['aboutFr','fr']]){
      const html=pageHtml(c,id);
      assert.deepEqual(hreflangs(html),expected,id);
      assert.match(html,new RegExp(`^<!doctype html><html lang="${lang}">`));
      assert.match(html,new RegExp(`"inLanguage":"${lang}"`));
      assert.match(html,new RegExp(`rel="canonical" href="${BASE}${{about:'sobre/',aboutEn:'en/about/',aboutFr:'fr/a-propos/'}[id]}"`));
    }
    assert.doesNotMatch(pageHtml(c,'about'),/x-default/);
    const sitemap=pub.publish(c,'production').publisher.sitemap;
    for(const u of ['sobre/','en/about/','fr/a-propos/'])assert.ok(sitemap.includes(BASE+u),u);
    assert.doesNotMatch(sitemap,/xhtml|hreflang/,'sitemap format unchanged');
  });
}

test('the home page joins a group through an explicit key; its translation is a separate page',()=>{
  const c=site('retail',['es','en']);
  c.seo.pages.home={translationKey:'home'};
  c.seo.pages.homeEn=page('homeEn','/en/',{locale:'en',key:'home',title:'Casa Norte · Local shop'});
  const out=pub.publish(c,'production');
  assert.deepEqual(hreflangs(out.publisher.head),[['en',BASE+'en/'],['es',BASE]]);
  assert.deepEqual(hreflangs(out.publisher.pages['/en/']),[['en',BASE+'en/'],['es',BASE]]);
  assert.equal(out.publisher.schema['@graph'].find(n=>n['@type']==='WebPage').inLanguage,'es');
});

test('each member self-reference equals its emitted canonical (home included)',()=>{
  const c=trio();
  c.seo.pages.home={translationKey:'home'};
  c.seo.pages.homeFr=page('homeFr','/fr/',{locale:'fr',key:'home',title:'Casa Norte FR'});
  const out=pub.publish(c,'production').publisher;
  const pages={...out.pages,'/':out.head};
  for(const [route,html] of Object.entries(pages)){
    const canonical=/rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const lang=route==='/'?'es':/^<!doctype html><html lang="([^"]+)">/.exec(html)[1];
    const self=hreflangs(html).find(([l])=>l===lang);
    if(self)assert.equal(self[1],canonical,route);
  }
});

test('no inference from URLs: different locales without a shared translationKey are not alternates',()=>{
  const c=site();
  c.seo.pages.about=page('about','/sobre/');
  c.seo.pages.aboutEn=page('aboutEn','/en/sobre/',{locale:'en'});
  assert.deepEqual(hreflangs(pageHtml(c,'about')),[]);
  assert.deepEqual(hreflangs(pageHtml(c,'aboutEn')),[]);
});

// ── Missing, unsupported, incomplete and non-publishable ──────────────────────

test('missing translation: no alternate, no fallback route, an audit warning',()=>{
  const c=site();
  c.seo.pages.about=page('about','/sobre/',{key:'about'});
  const out=pub.publish(c,'production');
  assert.deepEqual(hreflangs(out.publisher.pages['/sobre/']),[]);
  assert.deepEqual(Object.keys(out.publisher.pages).sort(),['/','/sobre/'],'no /en/ or /fr/ route is generated');
  assert.ok(b.audit(c).some(i=>i.id==='page.about.translation.no-hreflang-alternate'&&i.severity==='WARNING'));
});

test('unsupported and invalid locales are blocked and never become hreflang targets',()=>{
  const c=trio();
  c.seo.pages.aboutDe=page('aboutDe','/de/uber/',{locale:'de',key:'about',title:'Über uns'});
  c.seo.pages.aboutBad=page('aboutBad','/xx/',{locale:'english',key:'about',title:'Bad'});
  assert.deepEqual(b.page(c,'aboutDe').contract.blockers,['unsupported-locale']);
  assert.deepEqual(b.page(c,'aboutBad').contract.blockers,['invalid-locale']);
  assert.equal(b.canPublish(c,b.page(c,'aboutDe')),false);
  const values=hreflangs(pageHtml(c,'about'));
  assert.deepEqual(values.map(v=>v[0]),['en','es','fr']);
  assert.ok(values.every(([lang])=>core.reconcile(c).site.supportedLanguages.includes(lang)));
  assert.doesNotMatch(pageHtml(c,'about'),/\/de\/uber\/|\/xx\//);
});

test('incomplete, draft and noindex translations are excluded from every member',()=>{
  const c=trio();
  c.seo.pages.aboutFr.title='';c.seo.pages.aboutFr.h1='';
  c.seo.pages.aboutEn.status='draft';
  const draftPublished=pub.publish(c,'production').publisher.pages;
  assert.deepEqual(hreflangs(draftPublished['/sobre/']),[],'only es remains eligible: no group');
  assert.ok(b.page(c,'aboutFr').contract.blockers.includes('missing-title'));
  c.seo.pages.aboutEn.status='published';c.seo.pages.aboutEn.indexable=false;
  assert.deepEqual(hreflangs(pageHtml(c,'about')),[]);
  c.seo.pages.aboutEn.indexable=true;
  assert.deepEqual(hreflangs(pageHtml(c,'about')).map(v=>v[0]),['en','es'],'fr (incomplete) stays excluded');
  assert.deepEqual(hreflangs(pageHtml(c,'aboutFr')),[],'a blocked page emits nothing');
});

test('ambiguous locale inside a group is excluded with a warning; the rest stays reciprocal',()=>{
  const c=trio();
  c.seo.pages.aboutEn2=page('aboutEn2','/en/about-us/',{locale:'en',key:'about',title:'About the team'});
  assert.deepEqual(hreflangs(pageHtml(c,'about')).map(v=>v[0]),['es','fr']);
  assert.deepEqual(hreflangs(pageHtml(c,'aboutEn')),[]);
  const warnings=b.audit(c).filter(i=>/translation\.ambiguous-translation$/.test(i.id)).map(i=>i.id).sort();
  assert.deepEqual(warnings,['page.aboutEn.translation.ambiguous-translation','page.aboutEn2.translation.ambiguous-translation']);
});

test('preview never emits hreflang',()=>{
  const out=pub.publish(trio(),'preview');
  for(const html of Object.values(out.publisher.pages))assert.deepEqual(hreflangs(html),[]);
});

// ── Canonical AUTO / CUSTOM per locale ────────────────────────────────────────

test('canonical AUTO per locale is the page own localized URL; CUSTOM equal to it is accepted',()=>{
  const c=trio();
  assert.equal(b.page(c,'aboutEn').canonical,BASE+'en/about/');
  c.seo.pages.aboutEn.canonicalMode='custom';c.seo.pages.aboutEn.canonical=BASE+'en/about/';
  assert.equal(b.canPublish(c,b.page(c,'aboutEn')),true);
});

test('CUSTOM canonical to another locale is blocked as cross-locale; to the same locale only as conflict',()=>{
  const c=trio();
  c.seo.pages.aboutEn.canonicalMode='custom';c.seo.pages.aboutEn.canonical=BASE+'sobre/';
  assert.deepEqual(b.page(c,'aboutEn').contract.blockers.filter(x=>/canonical/.test(x)).sort(),['canonical-conflict','cross-locale-canonical']);
  assert.deepEqual(hreflangs(pageHtml(c,'about')).map(v=>v[0]),['es','fr'],'the conflicting page leaves the group');
  c.seo.pages.otherEn=page('otherEn','/en/other/',{locale:'en',title:'Other'});
  c.seo.pages.aboutEn.canonical=BASE+'en/other/';
  assert.deepEqual(b.page(c,'aboutEn').contract.blockers.filter(x=>/canonical/.test(x)),['canonical-conflict']);
});

// ── Per-locale metadata rules ─────────────────────────────────────────────────

test('duplicate title/description checks are per locale',()=>{
  const c=site();
  c.seo.pages.a=page('a','/marca/',{title:'Casa Norte'});
  c.seo.pages.aEn=page('aEn','/en/brand/',{locale:'en',title:'Casa Norte'});
  c.seo.pages.aEn.description=c.seo.pages.a.description;
  assert.equal(b.canPublish(c,b.page(c,'aEn')),true,'same brand title in another language is allowed');
  c.seo.pages.b2=page('b2','/marca-2/',{title:'Casa Norte'});
  assert.ok(b.page(c,'b2').contract.blockers.includes('duplicate-title'),'same-locale duplicates still block');
});

test('home pages are default-language only',()=>{
  const c=site();
  c.seo.pages.home={locale:'en'};
  assert.ok(b.page(c,'home').contract.blockers.includes('home-requires-default-locale'));
  const d=site();
  d.seo.pages.landingEn=page('landingEn','/en/',{locale:'en',pageType:'home',title:'Home EN'});
  assert.ok(b.page(d,'landingEn').contract.blockers.includes('home-requires-default-locale'));
});

// ── Materializer ─────────────────────────────────────────────────────────────

test('materializer writes each published locale route with its hreflang and nothing outside outputDir',t=>{
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'rubik-core6-'));
  t.after(()=>fs.rmSync(sandbox,{recursive:true,force:true}));
  const outputDir=path.join(sandbox,'out');
  const c=trio();
  c.seo.pages.home={translationKey:'home'};
  c.seo.pages.homeEn=page('homeEn','/en/',{locale:'en',key:'home',title:'Casa Norte EN'});
  c.seo.pages.evilEn=page('evilEn','/en/../../escape/',{locale:'en',key:'evil',title:'Evil'});
  const result=materializer.materializeSite({state:c,template:TEMPLATE,outputDir,environment:'production',baseUrl:BASE});
  assert.deepEqual(result.manifest.routes.sort(),['/','/en/','/en/about/','/fr/a-propos/','/sobre/']);
  const read=f=>fs.readFileSync(path.join(outputDir,...f.split('/')),'utf8');
  assert.deepEqual(hreflangs(read('en/about/index.html')).map(v=>v[0]),['en','es','fr']);
  assert.deepEqual(hreflangs(read('index.html')),[['en',BASE+'en/'],['es',BASE]]);
  assert.match(read('en/about/index.html'),/^<!doctype html><html lang="en">/);
  assert.ok(b.page(c,'evilEn').contract.blockers.includes('unsafe-path'));
  assert.equal(fs.existsSync(path.join(sandbox,'escape')),false);
  assert.deepEqual(fs.readdirSync(sandbox),['out']);
});

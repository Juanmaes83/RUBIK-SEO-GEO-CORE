/* Rubik SEO/GEO Production Hardening A — deployment materializer (Core).
   Extracted from WEB-RESTAURACI-N-PREMIUM-DIN-MICA@388e48a scripts/seo-geo-materialize-public.cjs.
   The canonical Publisher remains the only SEO authority. This module only turns
   its decisions into physical files/routes. Painting host content into the HOME
   template is a host responsibility injected through `renderHomeBody`
   (see hosts/restaurant/restaurant-host.cjs and docs/HOST-INTEGRATION-CONTRACT.md). */
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const core=require('./rubik-seo-geo-core.js');
const releaseB=require('./rubik-seo-geo-release-b.js');
const publisher=require('./rubik-seo-geo-publisher.js');

const clone=value=>JSON.parse(JSON.stringify(value));

function argValue(name,args=process.argv.slice(2)){
  const prefix='--'+name+'=';
  const hit=args.find(x=>x.startsWith(prefix));
  return hit?hit.slice(prefix.length):'';
}

function stripCanonicalSeoHead(html){
  let out=String(html);
  out=out.replace(/<title\b[^>]*data-rubik-seo=["'][^"']+["'][^>]*>[\s\S]*?<\/title>\s*/gi,'');
  out=out.replace(/<script\b[^>]*data-rubik-seo=["'][^"']+["'][^>]*>[\s\S]*?<\/script>\s*/gi,'');
  out=out.replace(/<(?:meta|link)\b[^>]*data-rubik-seo=["'][^"']+["'][^>]*>\s*/gi,'');
  return out;
}

/* Default host hook: the template is already the host's HOME body. */
const identityHomeBody=template=>String(template);

function materializeHome(template,state,environment,renderHomeBody=identityHomeBody){
  const published=publisher.publish(state,environment);
  let html=renderHomeBody(template,{...state,seo:published.seo});
  html=stripCanonicalSeoHead(html);
  html=html.replace('</head>',published.publisher.head+'\n</head>');
  return {html,published};
}

function emptySitemap(){
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
}

function notFoundHtml(){
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>404 · Página no encontrada</title></head><body><main><h1>404</h1><p>Página no encontrada.</p><p><a href="/">Volver al inicio</a></p></main></body></html>';
}

function routeFile(outputDir,route){
  if(route==='/') return path.join(outputDir,'index.html');
  const clean=route.replace(/^\/+|\/+$/g,'');
  return path.join(outputDir,clean,'index.html');
}

function writeFile(file,body){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,body,'utf8');
}

function normalizeState(input,{baseUrl=''}={}){
  const state=clone(input||{});
  state.seo=core.reconcile(state);
  if(baseUrl) state.seo.site.baseUrl=baseUrl;
  state.seo=core.reconcile(state);
  return state;
}

function materializeSite({state,template,outputDir,environment='preview',baseUrl='',renderHomeBody=identityHomeBody}){
  if(!['preview','production'].includes(environment)) throw new Error('environment must be preview|production');
  if(typeof renderHomeBody!=='function') throw new Error('renderHomeBody must be a function');
  const normalized=normalizeState(state,{baseUrl});
  if(environment==='production'&&!core.baseUrl(normalized.seo?.site?.baseUrl)){
    throw new Error('Production materialization requires a valid HTTPS baseUrl');
  }

  const home=materializeHome(template,normalized,environment,renderHomeBody);
  const working={...normalized,seo:home.published.seo};
  const registry=releaseB.registry(working);
  const homePage=registry.find(page=>page.path==='/');
  const homeGate=publisher.rawHtmlContract(working,homePage,home.html,environment);
  if(environment==='production'&&!homeGate.ok)throw new Error('HOME raw HTML contract failed: '+homeGate.blockers.join(','));
  writeFile(routeFile(outputDir,'/'),home.html);

  const materialized=['/'],contracts={'/':homeGate};
  for(const page of registry){
    if(page.path==='/'||!releaseB.canPublish(working,page)) continue;
    const html=publisher.renderPage(working,page,environment),gate=publisher.rawHtmlContract(working,page,html,environment);
    if(environment==='production'&&!gate.ok)throw new Error(page.path+' raw HTML contract failed: '+gate.blockers.join(','));
    writeFile(routeFile(outputDir,page.path),html);
    materialized.push(page.path);contracts[page.path]=gate;
  }

  const sitemap=home.published.publisher.sitemap||emptySitemap();
  writeFile(path.join(outputDir,'sitemap.xml'),sitemap);
  writeFile(path.join(outputDir,'robots.txt'),home.published.publisher.robotsTxt);
  writeFile(path.join(outputDir,'404.html'),notFoundHtml());

  const manifest={
    version:1,
    environment,
    adapter:home.published.publisher.adapter,
    routes:materialized,
    redirects:home.published.publisher.redirects,
    indexable:home.published.publisher.indexable,
    canonical:home.published.publisher.canonical,
    contracts
  };
  writeFile(path.join(outputDir,'seo-geo-routes.json'),JSON.stringify(manifest,null,2)+'\n');

  return {state:working,publisher:home.published.publisher,manifest};
}

/* CLI: the host supplies its Project State, HOME template and, optionally, a module
   exporting `renderHomeBody(template,state)`. The Core ships no default project. */
function runCli(){
  const cwd=process.cwd();
  const projectPath=argValue('project-state');
  const templateArg=argValue('template');
  if(!projectPath||!templateArg){
    process.stderr.write('Usage: rubik-seo-geo-materialize --project-state=<state.json> --template=<home.html> [--output=dir] [--environment=preview|production] [--base-url=https://...] [--home-body=<module.cjs>]\n');
    process.exit(2);
  }
  const output=path.resolve(cwd,argValue('output')||'.');
  const explicitEnv=argValue('environment');
  const baseUrl=argValue('base-url')||process.env.SEO_GEO_PRODUCTION_BASE_URL||'';
  const environment=explicitEnv||(process.env.VERCEL_ENV==='production'&&core.baseUrl(baseUrl)?'production':'preview');
  const homeBodyModule=argValue('home-body');
  const renderHomeBody=homeBodyModule?require(path.resolve(cwd,homeBodyModule)).renderHomeBody:identityHomeBody;
  const state=JSON.parse(fs.readFileSync(path.resolve(cwd,projectPath),'utf8'));
  const template=fs.readFileSync(path.resolve(cwd,templateArg),'utf8');
  const result=materializeSite({state,template,outputDir:output,environment,baseUrl,renderHomeBody});
  process.stdout.write(JSON.stringify({
    environment,
    routes:result.manifest.routes,
    redirects:result.manifest.redirects.length,
    indexable:result.manifest.indexable,
    canonical:result.manifest.canonical
  })+'\n');
}

if(require.main===module) runCli();

module.exports=Object.freeze({
  materializeSite,
  materializeHome,
  normalizeState,
  stripCanonicalSeoHead,
  identityHomeBody
});

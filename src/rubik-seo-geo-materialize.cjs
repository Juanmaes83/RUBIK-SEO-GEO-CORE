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

/* Route paths come from the Project State (Page Registry) and are therefore untrusted:
   release-b `pathOf` keeps `..` segments. Every materialized file must stay inside
   outputDir (docs/DECISIONS.md D-11). */
function unsafeRoute(route,reason){
  return new Error('Unsafe route path rejected ('+reason+'): '+JSON.stringify(route));
}

/* Lexical containment: only '..' itself or a '..<sep>' prefix escapes; names such as
   '..foo' or '...' are ordinary children. */
function isInside(root,file){
  const rel=path.relative(root,file);
  return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);
}

/* Physical containment: every existing component between outputDir (exclusive) and
   the target must be a real directory, and an existing target a regular file.
   A symbolic link or junction anywhere inside outputDir could redirect the write
   outside it, so it is refused. outputDir itself may be a link. Inspects only; never
   writes. */
function assertNoLinkInside(root,file){
  const parts=path.relative(root,file).split(path.sep);
  let current=root;
  for(let i=0;i<parts.length;i++){
    current=path.join(current,parts[i]);
    let stat;
    try{stat=fs.lstatSync(current);}
    catch(error){if(error.code==='ENOENT')return;throw error;}
    if(stat.isSymbolicLink())throw new Error('Refusing to write through a symbolic link inside outputDir: '+current);
    const last=i===parts.length-1;
    if(!last&&!stat.isDirectory())throw new Error('Refusing to write: path component is not a directory: '+current);
    if(last&&!stat.isFile())throw new Error('Refusing to overwrite a non-regular file: '+current);
  }
}

function assertWritable(root,file){
  if(!isInside(root,file))throw new Error('Refusing to write outside outputDir: '+file);
  assertNoLinkInside(root,file);
}

const WRITE_FLAGS=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|(fs.constants.O_NOFOLLOW||0);

function routeFile(outputDir,route){
  const root=path.resolve(outputDir);
  if(typeof route!=='string'||!route.startsWith('/')) throw unsafeRoute(route,'must be a string starting with /');
  if(/[\0\\:]/.test(route)) throw unsafeRoute(route,'NUL, backslash or colon');
  const segments=route.split('/').filter(Boolean);
  for(const segment of segments){
    let decoded=segment;
    try{decoded=decodeURIComponent(segment);}catch{throw unsafeRoute(route,'malformed percent-encoding');}
    if(segment==='.'||segment==='..'||decoded==='.'||decoded==='..'||/[\0\\/:]/.test(decoded)) throw unsafeRoute(route,'dot or encoded separator segment');
  }
  const file=path.join(root,...segments,'index.html');
  if(!isInside(root,file)) throw unsafeRoute(route,'resolves outside outputDir');
  return file;
}

/* Every materializer write goes through here. Directories are created one level at a
   time and re-checked, so a link cannot be followed by a recursive mkdir; the final open
   uses O_NOFOLLOW where the platform provides it (not on Windows, where the lstat checks
   are the barrier). */
function writeFile(root,file,body){
  assertWritable(root,file);
  fs.mkdirSync(root,{recursive:true});
  const parts=path.relative(root,file).split(path.sep).slice(0,-1);
  let current=root;
  for(const part of parts){
    current=path.join(current,part);
    try{fs.mkdirSync(current);}catch(error){if(error.code!=='EEXIST')throw error;}
    const stat=fs.lstatSync(current);
    if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Refusing to write through a symbolic link inside outputDir: '+current);
  }
  assertNoLinkInside(root,file);
  const fd=fs.openSync(file,WRITE_FLAGS,0o666);
  try{fs.writeFileSync(fd,body,'utf8');}finally{fs.closeSync(fd);}
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

  const root=path.resolve(outputDir);
  const home=materializeHome(template,normalized,environment,renderHomeBody);
  const working={...normalized,seo:home.published.seo};
  const registry=releaseB.registry(working);
  const homePage=registry.find(page=>page.path==='/');
  const homeGate=publisher.rawHtmlContract(working,homePage,home.html,environment);
  if(environment==='production'&&!homeGate.ok)throw new Error('HOME raw HTML contract failed: '+homeGate.blockers.join(','));

  /* Validate every publishable route and every output file (lexically and against
     links already present in outputDir) before the first write: an unsafe path fails
     the whole build with no partial output. */
  const routes=registry.filter(page=>page.path!=='/'&&releaseB.canPublish(working,page)).map(page=>({page,file:routeFile(root,page.path)}));
  const fixedFiles=['sitemap.xml','robots.txt','404.html','seo-geo-routes.json'].map(name=>path.join(root,name));
  for(const file of [routeFile(root,'/'),...routes.map(r=>r.file),...fixedFiles])assertWritable(root,file);

  writeFile(root,routeFile(root,'/'),home.html);

  const materialized=['/'],contracts={'/':homeGate};
  for(const {page,file} of routes){
    const html=publisher.renderPage(working,page,environment),gate=publisher.rawHtmlContract(working,page,html,environment);
    if(environment==='production'&&!gate.ok)throw new Error(page.path+' raw HTML contract failed: '+gate.blockers.join(','));
    writeFile(root,file,html);
    materialized.push(page.path);contracts[page.path]=gate;
  }

  const sitemap=home.published.publisher.sitemap||emptySitemap();
  writeFile(root,path.join(root,'sitemap.xml'),sitemap);
  writeFile(root,path.join(root,'robots.txt'),home.published.publisher.robotsTxt);
  writeFile(root,path.join(root,'404.html'),notFoundHtml());

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
  writeFile(root,path.join(root,'seo-geo-routes.json'),JSON.stringify(manifest,null,2)+'\n');

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
  identityHomeBody,
  routeFile,
  isInside
});

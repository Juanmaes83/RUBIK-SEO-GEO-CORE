/* Documentation gate: required docs exist, relative Markdown links resolve and
   every Markdown file is valid UTF-8 without mojibake. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const REQUIRED=['README.md','SCULPT-SOURCE.md','docs/README.md','docs/ROADMAP.md','docs/HANDOFF.md','docs/ARCHITECTURE.md','docs/HOST-INTEGRATION-CONTRACT.md','docs/DECISIONS.md','docs/PROVENANCE.md','docs/upstream/README.md','docs/integrations/OPENSEO.md'];
const errors=[];

for(const file of REQUIRED)if(!fs.existsSync(path.join(ROOT,file)))errors.push(`missing required doc: ${file}`);

const markdown=[];
const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(e.name)||e.name.startsWith('.tmp-'))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md'))markdown.push(p);}};
walk(ROOT);

for(const file of markdown){
  const rel=path.relative(ROOT,file);
  let text;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(file));}
  catch{errors.push(`${rel}: invalid UTF-8`);continue;}
  if(/[ÂÃ�]|â€/u.test(text))errors.push(`${rel}: mojibake`);
  const body=text.replace(/```[\s\S]*?```/g,'');
  for(const [,target] of body.matchAll(/\]\(([^)\s]+)\)/g)){
    if(/^(https?:|mailto:|#)/.test(target))continue;
    const clean=decodeURIComponent(target.split('#')[0]);
    if(!clean)continue;
    if(!fs.existsSync(path.resolve(path.dirname(file),clean)))errors.push(`${rel}: broken link -> ${target}`);
  }
}

if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1);}
process.stdout.write(`docs ok: ${markdown.length} markdown files, ${REQUIRED.length} required present\n`);

/* `node --check` over every JavaScript file this repository owns. */
'use strict';
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const files=[];
for(const dir of ['src','hosts','scripts','tests']){
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(c?js|mjs)$/.test(e.name))files.push(p);}};
  walk(path.join(ROOT,dir));
}
for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
process.stdout.write(`syntax ok: ${files.length} files\n`);

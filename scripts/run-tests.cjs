/* Portable test runner: passes explicit files to `node --test` (Node 20 has no glob
   expansion and npm scripts run under cmd.exe on Windows). */
'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const dir=path.join(__dirname,'..','tests');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>path.join(dir,f));
const run=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
process.exit(run.status===null?1:run.status);

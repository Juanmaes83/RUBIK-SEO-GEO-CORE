const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
/* Adapted from the source encoding gate: same mojibake rule, applied to the files this
   repository owns (Studio/CSS/index.html stay in the host repository). */
const ROOT=path.join(__dirname,'..');
const files=[...fs.readdirSync(path.join(ROOT,'src')).map(f=>path.join('src',f)),path.join('hosts','restaurant','restaurant-host.cjs'),path.join('tests','fixtures','restaurant-home-template.html'),path.join('tests','fixtures','restaurant-lumina-state.json')];
test('SEO/GEO operational files are valid UTF-8 without mojibake',()=>{for(const file of files){const bytes=fs.readFileSync(path.join(ROOT,file));const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);assert.doesNotMatch(text,/[ÂÃâ�]|â€/u,`${file} contiene indicadores de encoding corrupto`);}});

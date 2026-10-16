import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
// The browser loads dist/*.mjs through server.mjs's allow-list; a missing entry 404s and breaks the whole app.
test('every browser module imported from dist is served by server.mjs',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const dist=new URL('../dist/',import.meta.url);
 for(const file of readdirSync(dist).filter(f=>f.endsWith('.mjs'))){
  for(const [,dep] of readFileSync(new URL(file,dist),'utf8').matchAll(/from\s*['"]\.\/([^'"]+\.mjs)['"]/g))
   assert.ok(server.includes(`'${dep}'`)||server.includes(`'/${dep}'`),`${file} imports ${dep}, but server.mjs does not serve it`);
 }
});

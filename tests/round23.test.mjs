import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as catalogModule from '../dist/catalog.mjs';
import * as icons from 'simple-icons';
import {simpleIcons} from '../dist/brand-icons-simple.mjs';
const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
test('inventory omits the license cell and preserves the usage selector and edit action',()=>{
 const row=app.slice(app.indexOf("$('assetRows').innerHTML="),app.indexOf('// Items typed'));
 assert.equal((row.match(/<td>/g)||[]).length,4);
 assert.doesNotMatch(row,/근거 입력됨|근거 추가 필요|a\.license/);
 assert.match(row,/data-selection=/);assert.match(row,/정보·근거 수정/);
 assert.doesNotMatch(html,/<th>라이선스<\/th>/);
 const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
 assert.match(css,/#inventoryView \.no-choice th:nth-child\(3\),#inventoryView \.no-choice td:nth-child\(3\)/);
});
test('every generated Simple Icons path has at least 1.5:1 contrast against white',()=>{
 let count=0;
 for(const icon of Object.values(icons)){
  const svg=simpleIcons[icon.slug];if(!svg||!svg.includes(`d="${icon.path}"`))continue;
  const hex=svg.match(/fill="#([0-9a-f]{6})"/i)?.[1];assert.ok(hex,icon.slug);
  const rgb=hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  assert.ok(1.05/(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722+.05)>=1.5,icon.slug);count++;
 }
 assert.ok(count>10);assert.match(simpleIcons.unity,/fill="#1f2f2a"/);
});
test('exact catalog identity accepts case and aliases but rejects partial and ambiguous names',()=>{
 const match=catalogModule.exactCatalogItem;assert.equal(typeof match,'function');
 for(const name of ['unity','UNITY','유니티'])assert.equal(match(name)?.id,'unity');
 assert.equal(match('blender')?.kind,'tool');assert.equal(match('chatgpt')?.provider,'openai');
 assert.equal(match('Unity plugin'),undefined);assert.equal(match('docker'),undefined);assert.equal(match(''),undefined);
});
test('dialog keeps details closed and stores each existing field exactly once',()=>{
 assert.match(app,/\$\('assessmentDetails'\)\.open=false/);
 assert.doesNotMatch(html,/<details id="assessmentDetails" open/);
 for(const name of ['plan','planType','version','evidence','confirmed'])assert.equal((html.match(new RegExp(`name="${name}"`,'g'))||[]).length,1);
 assert.match(html,/<h3><span>3<\/span> 검토 결과/);
});

test('new-name matching applies the existing catalog handler once and respects edits and manual kind choices',()=>{
 const calls=[],field={value:'unity'};
 const box={editing:null,kindTouched:false,catalogIdentity:'',exactCatalogItem:catalogModule.exactCatalogItem,$:()=>({elements:{name:field}}),applyCatalog:(id,inDialog)=>{calls.push([id,inDialog]);box.catalogIdentity=id;}};
 vm.createContext(box);vm.runInContext(app.slice(app.indexOf('function matchNewCatalog(){'),app.indexOf("$('catalogSearch').oninput=")),box);
 assert.equal(box.matchNewCatalog().name,'Unity');assert.deepEqual(calls,[['unity',true]]);assert.equal(field.value,'unity');
 assert.equal(box.matchNewCatalog(),undefined);assert.equal(calls.length,1);
 box.catalogIdentity='';box.kindTouched=true;assert.equal(box.matchNewCatalog(),undefined);
 box.kindTouched=false;box.editing='saved';assert.equal(box.matchNewCatalog(),undefined);assert.equal(calls.length,1);
 box.editing=null;field.value='unity plugin';assert.equal(box.matchNewCatalog(),undefined);
 field.value='CHATGPT';assert.equal(box.matchNewCatalog().provider,'openai');
});

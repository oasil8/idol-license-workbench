import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,searchCatalog,categoriesOf,categoryRecommendation} from '../dist/catalog.mjs';
import {readFileSync} from 'node:fs';
import {records,codeLicenseRecords,officialRecord} from '../dist/official-sources.mjs';
import {providerNames} from '../dist/ai.mjs';
import {definitions} from '../dist/assignment.mjs';
import {sourceNames,storeSources} from '../dist/license-normalization.mjs';
import {monetizationInfo,monetizationMarkup} from '../dist/monetization.mjs';
// Isolate the missing-local-data case without modifying the private favicon file.
const iconSource=readFileSync(new URL('../dist/brand-icons.mjs',import.meta.url),'utf8')
 .replace(/const icons=await import[^\n]+/, 'const icons={};')
 .replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../dist/'+path,import.meta.url).href}'`);
const {brandIcon}=await import('data:text/javascript;base64,'+Buffer.from(iconSource).toString('base64'));

const products=['Unity','Unreal Engine','Godot','Blender','NVIDIA Isaac Sim','Claude Code','Codex','Cursor','Maya','Houdini','Krita','GIMP','Aseprite','Audacity','FMOD','Wwise','Substance 3D Painter','ZBrush','Photoshop','Visual Studio Code','PyTorch'];
test('round14 software and Korean aliases are available offline',()=>{
 for(const name of products)assert.ok(searchCatalog(name).some(x=>x.name===name),name);
 for(const name of ['블렌더','유니티','언리얼','클로드 코드'])assert.ok(searchCatalog(name).length,name);
 assert.ok(categoriesOf(searchCatalog('Blender')[0]).includes('code'));
 assert.equal(new Set(catalog.map(x=>x.name.toLowerCase())).size,catalog.length);
});
test('new discovery entries do not change evaluation category advice',()=>{
 assert.equal(categoryRecommendation({name:'Blender',kind:'code'}),undefined);
});
test('Simple Icons display software without local favicons',()=>{
 for(const name of ['Blender','Unity','Claude Code'])assert.match(brandIcon({name,kind:'tool'}),/src="data:image\/svg\+xml/);
});

test('all official names, providers, document definitions and asset sites are searchable',()=>{
 for(const name of [...records,...codeLicenseRecords].flatMap(r=>r.names).concat(Object.values(providerNames),definitions.map(d=>d[0]),sourceNames,storeSources.map(s=>s[1])))assert.ok(searchCatalog(name).length,name);
});
test('monetization preserves supplied facts and original inaccessible records',()=>{
 for(const name of ['Unity','Godot','Blender','NVIDIA Isaac Sim','Meshy','Claude Code','Claude'])assert.equal(monetizationInfo({name}).checkedOn,'2026-10-22');
 for(const [name,id] of [['Tripo','tripo'],['Unreal Engine','unreal'],['Codex','openai']]){
  const info=monetizationInfo({name}),r=officialRecord(id);
  assert.equal(info.summary,r.note);assert.equal(info.checkedOn,r.observedOn);assert.deepEqual(info.urls,[r.url]);
 }
 const unity=monetizationInfo({name:'Unity'}).summary;
 for(const value of ['$200,000','$200,001','$24,999,999','$2,310','$210','$25,000,000','$1,000,000','Unity 6 이하'])assert.ok(unity.includes(value),value);
 assert.match(monetizationInfo({name:'NVIDIA Isaac Sim'}).summary,/공식 FAQ 확인 필요/);
 assert.deepEqual(monetizationInfo({name:'Cursor'}),{summary:'공식 라이선스에서 확인 필요',urls:[]});
 assert.match(monetizationMarkup({name:'Blender'},s=>s),/href="https:\/\/www.blender.org\/about\/license\/"/);
});
test('Simple Icons cover requested brands and absent brands keep badges',()=>{
 for(const name of ['Unreal Engine','Godot','NVIDIA Isaac Sim','Maya','Houdini','Krita','GIMP','Aseprite','Audacity','FMOD','Cursor','PyTorch','Claude'])assert.match(brandIcon({name,kind:'tool'}),/data:image\/svg\+xml/);
 for(const name of ['Codex','Meshy','Tripo','Midjourney','Runway'])assert.match(brandIcon({name,kind:'ai'}),/brand-fallback/);
});

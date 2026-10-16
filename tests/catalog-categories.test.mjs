import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,referenceCatalog,searchCatalog,categoriesOf,catalogGroup} from '../dist/catalog.mjs';
import {officialSuggestions} from '../dist/evidence-sources.mjs';
test('every selected category owns its heading even for cross-listed services',()=>{
 for(const a of catalog)for(const c of categoriesOf(a))assert.equal(catalogGroup(a,c),c);
 assert.equal(catalogGroup(catalog.find(x=>x.id==='copilot'),'code'),'code');
 assert.equal(catalogGroup(catalog.find(x=>x.id==='suno'),'audio'),'audio');
});
test('lab examples are searchable with correct material routes and non-authoritative references',()=>{
 for(const [query,kind] of [['qwen3.6','model'],['docker','tool'],['chrono','code'],['isaacsim','tool'],['opensees','code'],['numpy','code'],['python','tool'],['tailscale','tool']])assert.ok(searchCatalog(query).some(x=>x.kind===kind),query);
 assert.equal(referenceCatalog.length,30);
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
 for(const item of referenceCatalog){assert.ok(searchCatalog(item.name).some(x=>x.id===item.id));assert.ok(!item.license&&!item.confirmed);assert.ok(officialSuggestions(item).some(x=>x.url===item.url&&x.type==='suggested'));}
});

test('Hugging Face discovery appears only under models while retaining weights review route',()=>{const item=catalog.find(x=>x.id==='huggingface');assert.deepEqual(categoriesOf(item),['model']);assert.equal(item.provider,'huggingface');});

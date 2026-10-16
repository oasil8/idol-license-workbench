import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCatalog} from '../dist/catalog.mjs';
import {createCatalogSearch} from '../dist/catalog-search.mjs';
test('names, categories and whitespace aliases find the same service',()=>{
 for(const q of ['챗지피티','ChatGPT','AI ChatGPT'])assert.ok(searchCatalog(q).some(x=>x.id==='openai'),q);
 assert.ok(searchCatalog('AI').some(x=>x.id==='openai'));
 for(const q of ['nanobanana','Nano Banana','나노바나나','나노 바나나'])assert.ok(searchCatalog(q).some(x=>x.id==='nanobanana'),q);
});
test('late internet responses and cleared queries cannot replace current results',async()=>{
 const pending=new Map(),states=[];
 const search=createCatalogSearch({request:name=>new Promise(resolve=>pending.set(name,resolve)),onChange:s=>states.push(s)});
 const first=search.search('first'),second=search.search('second');
 pending.get('second')({status:'empty',candidates:[]});await second;
 pending.get('first')({status:'ok',candidates:[]});await first;assert.equal(states.at(-1).name,'second');
 const third=search.search('third');search.clear();pending.get('third')({status:'ok',candidates:[]});await third;assert.equal(states.at(-1).status,'idle');
});
test('internet failure remains distinct from no matches, and unsafe candidates are dropped',async()=>{
 const states=[];const s=createCatalogSearch({request:async()=>{throw Error('offline');},onChange:x=>states.push(x)});
 await s.search('outside catalog');assert.equal(states.at(-1).status,'unavailable');
 const clean=createCatalogSearch({request:async()=>({status:'ok',candidates:[{url:'javascript:alert(1)',query:'x',searchedAt:new Date().toISOString()}]}),onChange:x=>states.push(x)});
 await clean.search('x');assert.deepEqual(states.at(-1).candidates,[]);
});

test('cooldown retries once and clearing cancels a queued retry',async()=>{
 let calls=0;const states=[];
 const s=createCatalogSearch({request:async()=>++calls===1?{status:'unavailable',retryAfterMs:1000}:{status:'empty',candidates:[]},wait:async()=>{},onChange:x=>states.push(x)});
 await s.search('Tool');assert.equal(calls,2);assert.equal(states.at(-1).status,'empty');
 let release;calls=0;const pending=createCatalogSearch({request:async()=>{calls++;return {retryAfterMs:1000};},wait:()=>new Promise(r=>release=r),onChange:()=>{}});
 const result=pending.search('Tool');await Promise.resolve();pending.clear();release();await result;assert.equal(calls,1);
});

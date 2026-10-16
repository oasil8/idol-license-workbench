import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSearchHtml,createSourceSearch} from '../search.mjs';
const markup='<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fvendor.example.com%2Flicense&amp;rut=abc"><b>Tool</b> &amp; license</a><a href="javascript:alert(1)" class="result__a">unsafe</a><a href="https://ads.example.com">Ad</a>';
const date='2026-10-15T01:00:00Z';
test('public search parser extracts organic redirects as unverified candidates only',()=>{
 const rows=parseSearchHtml(markup,'Tool',date);assert.equal(rows.length,1);assert.equal(rows[0].url,'https://vendor.example.com/license');assert.equal(rows[0].title,'Tool & license');
 assert.throws(()=>parseSearchHtml('<form id="challenge-form">', 'Tool',date),/자동 접근/);
 assert.throws(()=>parseSearchHtml('<html>unexpected</html>','Tool',date),/형식/);
 assert.deepEqual(parseSearchHtml('<div class="no-results">No results found</div>','Tool',date),[]);
});
test('search sends only name to fixed free provider and caches recent responses',async()=>{
 let calls=0;const search=createSourceSearch({now:()=>Date.parse(date),fetchImpl:async(url,options)=>{
  calls++;assert.equal(url.origin,'https://html.duckduckgo.com');assert.equal(url.searchParams.get('q'),'Tool official website terms license');assert.equal(options.redirect,'error');
  return new Response(markup,{headers:{'content-type':'text/html'}});
 }});
 const r=await search({name:'Tool',notes:'secret not sent'});assert.equal(r.status,'ok');assert.equal(r.candidates[0].query,'Tool');
 assert.equal((await search({name:'Tool'})).cached,true);assert.equal(calls,1);
 assert.equal((await search({name:'Other tool'})).status,'unavailable');assert.equal(calls,1);
 await assert.rejects(()=>search({name:'a'.repeat(201)}));await assert.rejects(()=>search({name:''}));
});
test('blocking, network failures, unexpected and oversized responses do not produce sources',async()=>{
 for(const response of [()=>new Response('blocked',{status:403}),()=>new Response('<form id="challenge-form">',{headers:{'content-type':'text/html'}}),()=>new Response('x'.repeat(2000001),{headers:{'content-type':'text/html'}}),()=>new Response('{}',{headers:{'content-type':'application/json'}}),()=>{throw Error('network');}]){
  const search=createSourceSearch({fetchImpl:async()=>response()});const r=await search({name:'Tool'});assert.equal(r.status,'unavailable');assert.deepEqual(r.candidates,[]);
 }
});

test('known ambiguous product alias adds vendor context without changing saved query',async()=>{
 const search=createSourceSearch({fetchImpl:async url=>{assert.equal(url.searchParams.get('q'),'Nano Banana Gemini Google official website terms license');return new Response(markup,{headers:{'content-type':'text/html'}});}});
 const result=await search({name:'nanobanana'});assert.equal(result.candidates[0].query,'nanobanana');
});

test('empty terms search tries a broader homepage query once, blocking never retries',async()=>{
 const queries=[];
 const search=createSourceSearch({fetchImpl:async url=>{queries.push(url.searchParams.get('q'));return new Response(queries.length===1?'<div class="no-results">No results found</div>':markup,{headers:{'content-type':'text/html'}});}});
 assert.equal((await search({name:'Tool'})).status,'ok');assert.deepEqual(queries,['Tool official website terms license','Tool official website']);
 let calls=0;const blocked=createSourceSearch({fetchImpl:async()=>{calls++;return new Response('blocked',{status:403});}});await blocked({name:'Tool'});assert.equal(calls,1);
});

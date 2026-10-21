import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sha256Hex,verifyCandidate,huggingfaceTerms} from '../dist/lookup.mjs';

// The link version hashes in the browser; stored contract fingerprints must match the server's node:crypto values.
test('browser SHA-256 equals node:crypto for ASCII, Korean, emoji and block-boundary lengths',()=>{
 for(const text of ['','abc','한글 약관 Terms 🎮','x'.repeat(55),'y'.repeat(56),'z'.repeat(64),'w'.repeat(1000)])
  assert.equal(sha256Hex(text),createHash('sha256').update(text).digest('hex'),text.slice(0,10));
});

test('shared verification runs on an injected fetcher: PyPI + GitHub license works, a blocked site stays a candidate',async()=>{
 const pages={
  'https://pypi.org/pypi/requests/json':{text:JSON.stringify({info:{name:'requests',version:'2.34.2',project_urls:{Source:'https://github.com/psf/requests'}}})},
  'https://api.github.com/repos/psf/requests/license':{text:JSON.stringify({encoding:'base64',content:btoa('Apache License\nVersion 2.0, January 2004\n'+'x'.repeat(300)),license:{spdx_id:'Apache-2.0'}})}
 };
 const fetchPage=async url=>{if(!pages[url])throw Error('blocked');return {...pages[url],url,contentType:'application/json'};};
 const ok=await verifyCandidate({name:'requests',url:'https://github.com/psf/requests'},{fetchPage});
 assert.equal(ok.status,'matched');assert.equal(ok.licenseKey,'Apache-2.0');assert.equal(ok.publishedVersion,'2.34.2');
 const blocked=await verifyCandidate({name:'Some Service',url:'https://example.com/terms'},{fetchPage});
 assert.equal(blocked.status,'candidate');
});

test('Hugging Face lookup uses the injected fetcher and the declared license',async()=>{
 const fetchText=async url=>({text:JSON.stringify({cardData:{license:'apache-2.0'}}),url});
 const r=await huggingfaceTerms({provider:'huggingface',repository:'org/model',scope:'weights'},{status:'review'},fetchText);
 assert.equal(r.license,'Apache-2.0');assert.equal(r.status,'conditions');assert.match(r.hash,/^[0-9a-f]{64}$/);
});

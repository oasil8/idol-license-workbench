import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCandidate} from '../verify-source.mjs';
import {cleanCandidates} from '../dist/source-search.mjs';
import {supplementCodeLicense} from '../dist/official-sources.mjs';
import {evaluate} from '../dist/core.mjs';
import fs from 'node:fs';
test('repository API provides license and original text; unknown ownership remains a candidate',async()=>{
 const text=fs.readFileSync(new URL('../node_modules/mammoth/LICENSE',import.meta.url),'utf8');
 const fetchPage=async url=>{if(url.includes('api.github.com'))return {url,contentType:'application/json',text:JSON.stringify({encoding:'base64',content:Buffer.from(text).toString('base64'),license:{spdx_id:'BSD-2-Clause'}})};throw Error('No official identity');};
 const v=await verifyCandidate({name:'Unknown library',url:'https://github.com/example/library'},{fetchPage});assert.equal(v.licenseKey,'BSD-2-Clause');assert.equal(v.text,text.trim());assert.equal(v.status,'candidate');
 const rows=cleanCandidates([{url:v.url,query:v.query,title:'Library',searchedAt:v.checkedAt,verification:v}]);
 const a=supplementCodeLicense({name:v.query,kind:'code',sourceCandidates:rows});assert.equal(a.license,'BSD-2-Clause');assert.match(a.evidence,/후보 원문에서 라이선스 추출/);assert.doesNotMatch(a.evidence,/공식 원문 자동 보완/);assert.equal(evaluate(a,{commercial:true}).status,'review');
 const matched=await verifyCandidate({name:'FastAPI',url:'https://github.com/fastapi/fastapi'},{fetchPage});assert.equal(matched.status,'matched');
});

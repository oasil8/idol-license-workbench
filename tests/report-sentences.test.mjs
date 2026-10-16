import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matrix,counts,layouts} from './sentence-matrix.mjs';
import {evaluate} from '../dist/core.mjs';
import {resultItems,outcomeReason,inputForTask} from '../dist/result-sections.mjs';
test('sentence edits preserve every matrix status and task bucket count',()=>{
 assert.deepEqual(counts(),JSON.parse(readFileSync(new URL('./fixtures/sentence-baseline.json',import.meta.url),'utf8')));
});
test('source obligations remain mandatory and input checks retain their edit shortcuts',()=>{
 const context={platform:'steam',commercial:true,distribute:true,modified:true,network:true};
 const mit={kind:'code',license:'MIT',confirmed:true,evidence:'LICENSE'};
 assert.deepEqual(resultItems(evaluate(mit,context)).conditions,['원본 저작권 고지와 라이선스 전문을 함께 배포하세요.']);
 const apache=resultItems(evaluate({...mit,license:'Apache-2.0'},context));
 assert.deepEqual(apache.conditions,['라이선스 전문 및 해당 NOTICE를 포함하세요.','수정한 파일에 변경 사실을 표시하세요.']);
 const nc=resultItems(evaluate({...mit,license:'CC-BY-NC-4.0'},{...context,commercial:false}));
 assert.ok(nc.conditions.includes('상업적 이익이나 금전적 보상을 주된 목적으로 사용하지 마세요.'));
 const tripo={name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'unknown'},r=evaluate(tripo,context);
 const parts=resultItems(r,outcomeReason(tripo,r)),plan='사용하거나 생성할 당시의 요금제·구매 유형을 확인해 입력하세요.';
 assert.ok(parts.checks.includes(plan));assert.ok(!parts.conditions.includes(plan));
 assert.equal(inputForTask(plan,tripo).field,'planType');
 assert.equal(inputForTask('공개된 파일이라는 사실만으로 허용된다고 보지 말고, 적용 라이선스의 사용 허가를 확인하세요.',mit).field,'license');
 const openai=resultItems(evaluate({name:'ChatGPT',kind:'ai',provider:'openai',scope:'output',planType:'free'},context));
 assert.ok(openai.conditions.includes('출력물을 OpenAI와 경쟁하는 모델 개발에 이용하지 마세요.'));
 assert.ok(openai.checks.includes('정확성과 적합성을 확인하세요.'));
});
test('legacy combined prohibition is preserved verbatim as an obligation',()=>{
 const sentence='출력물을 경쟁 모델 개발에 이용하지 말고, 정확성을 확인하세요.';
 assert.deepEqual(resultItems({tasks:[sentence]}),{conditions:[sentence],checks:[]});
});
test('all matrix obligations, checks and common blocks are direct action sentences',()=>{
 const entries=matrix().flatMap(r=>[...r.conditions,...r.checks].map(text=>({id:r.id,text})));
 entries.push(...layouts().flatMap(l=>l.common.map(n=>({id:'common',text:n.text}))));
 const invalid=entries.filter(({text})=>!text.endsWith('세요.')||/[“”]/.test(text));
 assert.deepEqual([...new Set(invalid.map(({id,text})=>`${id}: ${text}`))],[]);
});

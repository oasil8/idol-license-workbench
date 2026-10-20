import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {normalizeLicense} from '../dist/license-normalization.mjs';
import {resultItems,outcomeReason} from '../dist/result-sections.mjs';

const aliases=['Unity Asset Store EULA','Unity Asset Store Standard EULA','Standard Unity Asset Store EULA','Unity Asset Store End User License Agreement'];
const context={platform:'steam',commercial:true,distribute:true,modified:true};
const asset={name:'sample',kind:'code',confirmed:true,evidence:'구매 기록',rights:'cleared'};
const conditions=[
 '자산을 게임 등 제품에 포함된 형태로만 배포하고, 자산 자체를 단독으로 판매·배포하거나 이용자가 그렇게 할 수 있게 하지 마세요.',
 '자산이 제품의 주요 부분이 되지 않도록 독자적 콘텐츠와 함께 사용하세요.',
 '구매에 참여하지 않은 제3자와 자산을 공유하지 마세요.',
 '자산을 AI·머신러닝 모델 학습이나 데이터셋에 사용하지 마세요.',
 '자산에 포함된 저작권·상표 고지를 제거하지 마세요.'
];
const checks=[
 '에셋 페이지에 별도 판매자 EULA나 Restricted Asset Terms가 있는지 확인하세요.',
 'Editor Extension·Scripting·Services 자산이면 좌석 수(2대 초과 동시 사용 금지)를 확인하세요.',
 'UGC 제작이 주목적인 게임이거나 NFT·블록체인에 쓰는 경우 판매자·Unity의 별도 허가를 확인하세요.',
 '구매 영수증과 구매 당시 EULA 버전을 보관하세요.'
];
test('Unity aliases share distribution rules, obligations, checks and dated official evidence',()=>{
 for(const kind of ['code','model','image','audio','data','other','tool'])for(const commercial of [true,false]){
  const canonical=evaluate({...asset,kind,license:'LicenseRef-Unity-Asset-Store-EULA'},{...context,commercial});
  for(const license of aliases){
   assert.equal(normalizeLicense(license),'LicenseRef-Unity-Asset-Store-EULA');
   const a={...asset,kind,license},r=evaluate(a,{...context,commercial});
   assert.deepEqual(r,canonical);
   assert.equal(r.status,'conditions');
   const parts=resultItems(r,outcomeReason(a,r));
   assert.deepEqual(parts.conditions,conditions);
   for(const text of checks)assert.ok(parts.checks.includes(text),text);
   assert.equal(parts.checks.length,kind==='tool'?5:4);
   for(const text of [...parts.conditions,...parts.checks])assert.ok(text.endsWith('세요.'),text);
   assert.match(outcomeReason(a,r),/Unity Asset Store EULA \(unity\.com\)/);
   assert.ok(r.sources.some(([label,url])=>label==='Unity Asset Store EULA (unity.com)'&&url==='https://unity.com/legal/as-terms'));
   assert.equal(r.ruleDate,'2026-10-20');
  }
 }
});
test('Unity preserves application confirmation, evidence and conservative scope gates',()=>{
 for(const license of aliases){
  for(const patch of [{confirmed:false},{confirmed:undefined},{evidence:''}]){
   const r=evaluate({...asset,license,...patch},context);
   assert.equal(r.status,'review');
   assert.ok(r.blockers.some(t=>t.includes('라이선스 적용 범위와 근거')));
  }
  // EULA 2.3.1 covers use on the user's own computers, so not distributing is no riskier than distributing.
  assert.equal(evaluate({...asset,license},{...context,distribute:false}).status,'conditions');
  assert.equal(evaluate({...asset,license},{...context,distribute:undefined}).status,'review');
 }
 for(const license of ['Fab Standard License','Pixabay License','Unity Asset Store Restricted Assets','Unity Asset Store EULA except commercial use']){
  assert.equal(evaluate({...asset,license},context).status,'review');
 }
});

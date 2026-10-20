import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {outcomeReason,resultItems} from '../dist/result-sections.mjs';
const steam={platform:'steam',commercial:true,distribute:true,modified:true,network:true};
const research={platform:'research',commercial:false,distribute:false,modified:false,network:false};
const licenses=['MIT','Apache-2.0','BSD-3-Clause','GPL-3.0','LGPL-3.0','AGPL-3.0','CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','CC-BY-ND-4.0','CC0-1.0'];
const asset=(kind,license)=>({kind,license,confirmed:true,evidence:'LICENSE'});

test('round4 context matrix preserves verdicts and excludes sales language for noncommercial use',()=>{
 for(const kind of ['code','image','model'])for(const license of licenses)for(const context of [steam,research,{...steam,commercial:false}]){
  const a=asset(kind,license),r=evaluate(a,context),reason=outcomeReason(a,r);
  const expected=context.distribute&&['GPL-3.0','LGPL-3.0','AGPL-3.0'].includes(license)?'review':
   context.distribute&&license==='CC-BY-ND-4.0'||context.commercial&&license==='CC-BY-NC-4.0'?'conflict':'conditions';
  assert.equal(r.status,expected,`${kind}/${license}/${context.platform}`);
  if(!context.commercial)assert.doesNotMatch(reason,/상업 이용 가능|유료 판매|상용/);
  if(r.status==='conflict')assert.doesNotMatch(reason,/할 수 있습니다|수 있습니다\.|확인하세요|별도 허가나 대체/);
 }
});
test('round4 private copyleft reason retains recheck and never hides AGPL network review',()=>{
 for(const license of ['GPL-3.0','LGPL-3.0','AGPL-3.0'])for(const kind of ['code','image','model']){
  const a=asset(kind,license),r=evaluate(a,research);
  assert.match(outcomeReason(a,r),/외부 배포·네트워크 제공이 없어 현재는 소스 제공 의무가 발생하지 않습니다/);
  assert.ok(resultItems(r,outcomeReason(a,r)).checks.includes('내부 사용 범위를 기록하고 외부 제공 전에 재검토하세요.'));
  for(const network of [true,undefined]){
   const external=evaluate(a,{...research,network});
   assert.doesNotMatch(outcomeReason(a,external),/외부 배포·네트워크 제공이 없어/);
   if(license==='AGPL-3.0'&&network===true)assert.equal(external.status,'review');
  }
 }
});
test('round4 CC0 separates copyright permission from additional rights checks',()=>{
 for(const kind of ['code','image','model'])for(const context of [steam,research]){
  const a=asset(kind,'CC0-1.0'),r=evaluate(a,context),reason=outcomeReason(a,r),parts=resultItems(r,reason);
  assert.match(reason,/CC0.*저작권.*조건 없이.*이용.*허용/);
  assert.doesNotMatch(reason,/상표·특허/);
  assert.ok(parts.checks.includes('CC0는 상표·특허·제3자 권리까지 허가하지 않으므로, 해당 권리를 별도로 확인하세요.'));
  assert.equal(parts.conditions.length,0);
  assert.ok(parts.checks.every(text=>text.endsWith('세요.')));
 }
});
test('round4 conflicts state restrictions without speculation or next actions',()=>{
 for(const license of ['CC-BY-ND-4.0','CC-BY-NC-4.0','CC-BY-NC-ND-4.0']){
  const a=asset('image',license),r=evaluate(a,steam);
  assert.equal(r.status,'conflict');
  assert.doesNotMatch(outcomeReason(a,r),/할 수 있습니다|수 있습니다\.|확인하세요|별도 허가나 대체/);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
const a={kind:'code',name:'Example',confirmed:true,evidence:'LICENSE @ version 1',rights:'cleared'};
const c={platform:'research',commercial:true,distribute:false,modified:false,network:false};
test('known obligations do not force review for MPL internal use and unchanged BY-SA distribution',()=>{
 assert.equal(evaluate({...a,license:'MPL-2.0'},c).status,'conditions');
 assert.equal(evaluate({...a,license:'MPL-2.0'},{...c,distribute:true}).status,'conditions');
 assert.equal(evaluate({...a,license:'CC-BY-SA-4.0'},{...c,distribute:true}).status,'conditions');
 assert.equal(evaluate({...a,license:'CC-BY-SA-4.0'},{...c,distribute:true,modified:true}).status,'conditions');
});
test('permission still requires applicable evidence and explicit restrictions remain conflicts',()=>{
 const missing=evaluate({...a,license:'MIT',confirmed:false},c);assert.equal(missing.status,'review');assert.ok(missing.blockers.some(x=>x.includes('적용 범위')));
 assert.equal(evaluate({...a,license:'CC-BY-NC-4.0'},c).status,'conflict');
 assert.equal(evaluate({...a,license:'MIT'},c).status,'conditions');assert.deepEqual(evaluate({...a,license:'MIT'},c).blockers,[]);
 assert.equal(evaluate({...a,license:'MPL-2.0'},{...c,distribute:undefined}).status,'review');
});

import {permissionMarkup} from '../dist/result-sections.mjs';
import {validateProject,kinds} from '../dist/core.mjs';
test('supported obligations remain visible without blockers and purpose changes NC outcome',()=>{
 for(const license of ['MPL-2.0','CC-BY-SA-4.0']){const r=evaluate({...a,license},{...c,distribute:true,modified:true});assert.equal(r.status,'conditions');assert.equal(r.blockers.length,0);assert.ok(r.tasks.length>=2);}
 const nc={...a,license:'CC-BY-NC-4.0'};
 assert.equal(evaluate(nc,{...c,commercial:false}).status,'conditions');
 assert.equal(evaluate(nc,{...c,commercial:true}).status,'conflict');
 assert.equal(evaluate(nc,{...c,commercial:undefined}).status,'review');
 assert.equal(evaluate({...a,license:'MPL-2.0',confirmed:false},{...c,distribute:true}).status,'review');
 assert.equal(kinds.other,'기타');assert.equal(validateProject({name:'Test',context:c,assets:[{...a,kind:'other',license:'MIT'}]}).assets[0].kind,'other');
});
test('conflict legal reference is clearly separate from permission and predicts no fine',()=>{
 const html=permissionMarkup(a,{status:'conflict'},String);assert.match(html,/08-1001.pdf/);assert.match(html,/동일한 사건이 아니며/);assert.match(html,/자동 산정하지 않습니다/);
 assert.ok(!permissionMarkup(a,{status:'conditions'},String).includes('08-1001.pdf'));
});

test('confirmed Chrono BSD code is not blocked by missing version-only metadata',()=>{
 const item={...a,name:'Project Chrono',license:'BSD-3-Clause',evidence:'https://github.com/projectchrono/chrono/blob/main/LICENSE'};
 for(const platform of ['research','conference','enterprise','steam','general'])assert.equal(evaluate(item,{...c,platform,distribute:true}).status,'conditions');
 assert.equal(evaluate({...item,confirmed:false},c).status,'review');
});

import {reviewReason} from '../dist/result-sections.mjs';
test('review reason is short and preserves the concrete missing information',()=>{
 assert.equal(reviewReason(evaluate({...a,license:'',confirmed:false},c)),'적용 라이선스 미기록 · 이 자료에 대한 라이선스 적용 미확인');
 assert.equal(reviewReason(evaluate({...a,license:'MIT'},c)),'');
});

import {outcomeReason} from '../dist/result-sections.mjs';
test('all statuses explain outcome and blocked grants do not read as approved permission',()=>{
 const allowed=evaluate({...a,license:'MIT'},c);assert.match(outcomeReason({...a,license:'MIT'},allowed),/남은 일은.*이행/);
 assert.match(outcomeReason(a,{status:'conflict',notes:['상업 목적과 충돌합니다.']}),/사용 불가 이유/);
 assert.ok(!permissionMarkup(a,{status:'review',permissions:['승인된 이용']},String).includes('승인된 이용'));
});

test('conditional reason explains the actual allowed use rather than only naming a license',()=>{
 const item={...a,license:'LicenseRef-OpenSees'};
 assert.match(outcomeReason(item,evaluate(item,{...c,distribute:false})),/내부 이용/);
 assert.match(outcomeReason({...item,nonprofitEntityConfirmed:true},evaluate({...item,nonprofitEntityConfirmed:true},{...c,commercial:false,distribute:true})),/비상업 배포/);
});

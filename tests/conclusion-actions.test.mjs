import test from 'node:test';
import assert from 'node:assert/strict';
import {projectConclusion} from '../dist/result-sections.mjs';

const context={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const asset=(name,kind,license)=>({id:name,name,kind,license,confirmed:true,evidence:'https://example.org',selection:'used'});

test('to-do lines name what blocks each item, not a generic check or a label',()=>{
 const assets=[asset('팀','image','팀 내부 제작'),asset('BSD','code','BSD'),asset('Fab','model','Fab Standard License'),
  {id:'mj',name:'Midjourney',kind:'ai',provider:'other',serviceName:'Midjourney',scope:'output',planType:'unknown',selection:'used'}];
 const actions=Object.fromEntries(projectConclusion({name:'p',contextConfirmed:true,context,assets}).actions.map(a=>[a.name,a.action]));
 assert.match(actions['팀'],/팀원 각자의 저작권 귀속/);
 assert.match(actions.Midjourney,/Pro\/Mega 플랜/);
 assert.equal(actions.BSD,'BSD 라이선스 원문에서 조항 수(2/3 등)를 확인해 입력하세요.');
 assert.match(actions.Fab,/^구매·다운로드 당시 Fab 라이선스 원문을 저장/);
 for(const text of Object.values(actions))assert.doesNotMatch(text,/자동 판정 미지원/);
});

test('card checks do not repeat the reason label, and Unity evidence shows its domain once',async()=>{
 const {resultItems,outcomeReason}=await import('../dist/result-sections.mjs');const {evaluate}=await import('../dist/core.mjs');
 const a=asset('Mixamo 애니메이션','model','Mixamo'),r=evaluate(a,context),parts=resultItems(r,outcomeReason(a,r));
 assert.ok(parts.checks.some(t=>t.startsWith('구매·다운로드 당시 Mixamo 라이선스 원문을 저장')));
 assert.ok(parts.checks.every(t=>!t.includes('자동 판정 미지원')));
 const u=evaluate(asset('팩','model','Unity Asset Store EULA'),context);assert.ok(u.sources.some(([label])=>label==='Unity Asset Store EULA'));
});

test('items saved with the briefly shipped font kind still load, as other',async()=>{
 const {validateProject}=await import('../dist/core.mjs');
 const p=validateProject({name:'p',contextConfirmed:true,context,assets:[{name:'Pretendard',kind:'font',license:'SIL OFL 1.1',selection:'used'}]},{local:true});
 assert.equal(p.assets[0].kind,'other');
});

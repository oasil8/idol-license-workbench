import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {normalizeLicense} from '../dist/license-normalization.mjs';
import {outcomeReason,resultItems} from '../dist/result-sections.mjs';
const c={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const asset=license=>({name:'sample',kind:'code',license,confirmed:true,evidence:'LICENSE'});
const run=(license,extra={})=>{const a={...asset(license),...extra},r=evaluate(a,c);return {...r,reason:outcomeReason(a,r),...resultItems(r,outcomeReason(a,r))};};
const included='다른 사람의 에셋·AI 생성물·참고 이미지·폰트·음원을 포함하지 않았는지 확인하세요. 포함했다면 그 자료를 따로 등록하세요.';
const employer='회사·학교 업무나 과제로 만든 경우 저작권이 소속 기관에 있는지 확인하세요.';
const agreement='팀원 각자의 저작권 귀속 또는 이용 허락 합의를 문서로 확인하세요.';
const contract='외주 계약서에서 저작권 양도 또는 게임 상업 이용 허락 범위를 확인하세요.';
for(const [names,id,status,checks] of [
 [['직접 제작','자체 제작','직접 만듦','Original','Own work','Self-made'],'LicenseRef-Own-Work','conditions',[included,employer]],
 [['팀 내부 제작','팀원 제작','Team work'],'LicenseRef-Team-Work','review',[included,employer,agreement]],
 [['외주 제작','외주','Commissioned','Work for hire'],'LicenseRef-Commissioned','review',[contract,included]]
])for(const name of [...names,id])test(`creation ${name}`,()=>{
 for(const input of [name,`  ${name.toUpperCase().replaceAll(' ','  ')}  `,name.replaceAll(' ','')]){
  assert.equal(normalizeLicense(input),id);
  const r=run(input);assert.equal(r.status,status);assert.deepEqual(r.conditions,[]);assert.deepEqual(r.checks,checks);
  if(status==='conditions')assert.equal(r.reason,'직접 제작한 자료로 기록되어 있습니다.');
 }
 assert.equal(run(name,{confirmed:false}).status,'review');
 assert.equal(run(name,{evidence:''}).status,'review');
});
for(const name of ['구매함','구매','Purchased','Paid asset'])test(`purchase ${name}`,()=>{
 const r=run(name);assert.equal(r.status,'review');assert.equal(r.reason,'구매 자료 · 판매처 라이선스 미기록');assert.deepEqual(r.conditions,[]);assert.deepEqual(r.checks,['구매한 판매처의 라이선스 이름이나 원문을 입력하세요.']);
});
const expressions=[['MIT OR Apache-2.0',['MIT','Apache-2.0'],'OR'],['Apache-2.0 OR MIT',['Apache-2.0','MIT'],'OR'],['MIT/Apache-2.0',['MIT','Apache-2.0'],'OR'],['MIT / Apache 2.0',['MIT','Apache-2.0'],'OR'],['Apache 2.0 or MIT',['Apache-2.0','MIT'],'OR'],['MIT AND Zlib',['MIT','Zlib'],'AND'],['BSD 2-Clause / BSD 3-Clause / ISC / Apache 2.0 / Zlib / BSL-1.0 / 0BSD / Unlicense / CC0',['BSD-2-Clause','BSD-3-Clause','ISC','Apache-2.0','Zlib','BSL-1.0','0BSD','Unlicense','CC0-1.0'],'OR'],['MIT AND ISC AND BSL-1.0',['MIT','ISC','BSL-1.0'],'AND']];
for(const [input,ids,op] of expressions)test(`permissive expression ${input}`,()=>{
 const r=run(input);assert.equal(r.status,'conditions');
 assert.equal(r.reason,op==='OR'?ids.join(' 또는 ')+' 중 하나를 선택해 이용할 수 있습니다.':ids.join('·')+'의 조건을 모두 지켜야 합니다.');
 assert.deepEqual(r.conditions,[...new Set(ids.flatMap(id=>run(id).conditions))]);
 assert.deepEqual(r.checks,[...new Set([...ids.flatMap(id=>run(id).checks),...(op==='OR'?['선택한 라이선스를 기록하세요.']:[])])]);
 assert.equal(run(input,{confirmed:false}).status,'review');assert.equal(run(input,{evidence:''}).status,'review');
});
for(const input of ['MIT OR GPLv3','MIT/Custom','MIT WITH LLVM-exception','(MIT OR Apache-2.0)','MIT OR (Apache-2.0 AND ISC)','MIT OR ISC AND Zlib','MIT OR','/MIT','MIT//ISC','MIT OR OFL 1.1','MIT/PSF-2.0'])test(`unsafe expression ${input}`,()=>{
 const r=run(input);assert.equal(r.status,'review');assert.match(r.reason,/복수 라이선스 또는 예외 조항/);
});
for(const [input,source,id] of [['Kenney CC0','Kenney','CC0-1.0'],['Freesound CC BY 4.0','Freesound','CC-BY-4.0'],['CC BY 4.0 (Freesound)','Freesound','CC-BY-4.0'],['Google Fonts OFL 1.1','Google Fonts','OFL-1.1'],['OFL 1.1 (Google Fonts)','Google Fonts','OFL-1.1'],['Sketchfab CC BY 4.0','Sketchfab','CC-BY-4.0'],['OpenGameArt CC0','OpenGameArt','CC0-1.0'],['itch.io CC0','itch.io','CC0-1.0'],['MIT GitHub','GitHub','MIT'],['(Poly Haven) CC0','Poly Haven','CC0-1.0'],['CC0 ambientCG','ambientCG','CC0-1.0']])test(`source ${input}`,()=>{
 const r=run(input),base=run(id);assert.equal(normalizeLicense(input),id);assert.equal(r.status,base.status);assert.equal(r.reason,base.reason);assert.deepEqual(r.conditions,base.conditions);assert.deepEqual(r.checks,[...base.checks,`다운로드한 ${source} 페이지에 표시된 라이선스와 작성자를 저장하세요.`]);
});
for(const [input,id] of [['Sketchfab CC BY','CC BY'],['Google Fonts OFL','OFL']])test(`source without version ${input}`,()=>{
 const r=run(input),base=run(id);assert.equal(r.status,'review');assert.equal(r.reason,base.reason);assert.ok(r.checks.includes(base.checks[0]));
});
test('unknown source terms retain conservative handling',()=>{
 assert.match(run('itch.io custom').reason,/판매처 라이선스/);
 for(const input of ['Kenney custom','NotKenney CC0','CC0 (Kenney custom)','GitHub MIT noncommercial'])assert.equal(run(input).status,'review');
 assert.equal(run('Sketchfab CC BY-NC 4.0').status,'conflict');
});
test('empty tool license requests output rights; other kinds keep file check',()=>{
 const r=run('',{kind:'tool'});assert.equal(r.status,'review');assert.equal(r.checks[0],'도구의 라이선스·구독 플랜에서 제작물을 상업적으로 이용할 수 있는지 확인하고 라이선스를 입력하세요.');
 assert.equal(run('').checks[0],'공개된 파일이라는 사실만으로 허용된다고 보지 말고, 적용 라이선스의 사용 허가를 확인하세요.');
});

test('source names accept case, spacing and attached parentheses without dropping qualifiers',()=>{
 for(const source of ['Kenney','Freesound','Google Fonts','Sketchfab','OpenGameArt','itch.io','GitHub','Poly Haven','ambientCG']){
  for(const input of [`${source.toUpperCase()}  CC0`,`CC0 (${source})`,`(${source})CC0`,`CC0(${source})`]){
   const r=run(input);assert.equal(r.status,'conditions',input);assert.equal(normalizeLicense(input),'CC0-1.0');
   assert.ok(r.checks.includes(`다운로드한 ${source} 페이지에 표시된 라이선스와 작성자를 저장하세요.`));
  }
 }
});
test('creation review reasons and every new action stay explicit',()=>{
 assert.equal(run('팀원 제작').reason,'팀 내부 제작 자료 · 저작권 귀속·이용 허락 합의 미확인');
 assert.equal(run('외주').reason,'외주 제작 자료 · 계약상 이용 허락 범위 미확인');
 for(const name of ['직접 제작','팀원 제작','외주','구매','MIT OR Apache-2.0','MIT AND Zlib','Kenney CC0','Sketchfab CC BY','']){
  for(const kind of ['code','tool','image','audio','model','data']){
   const r=run(name,{kind});for(const text of [...r.conditions,...r.checks])assert.ok(text.endsWith('세요.'),text);
  }
 }
});
test('new recognition never changes stored input or bypasses confirmation and AI review',()=>{
 for(const name of ['Own work','Team work','Purchased','MIT/Apache 2.0','Kenney CC0']){
  const a=asset(name),before=structuredClone(a);evaluate(a,c);assert.deepEqual(a,before);
  assert.equal(run(name,{confirmed:false}).status,'review');assert.equal(run(name,{evidence:''}).status,'review');
  assert.equal(run(name,{aiGenerated:true}).status,'review');
 }
});

test('first-time spellings: bare Unity Asset Store, "free" labels and Mixamo get specific guidance',()=>{
 const steam={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
 const at=license=>evaluate({name:'x',kind:'model',license,confirmed:true,evidence:'https://example.org'},steam);
 assert.deepEqual(at('Unity Asset Store'),at('Unity Asset Store EULA'));
 for(const license of ['무료','상업용 무료','Free']){const r=at(license);assert.equal(r.status,'review');assert.ok(r.blockers.some(t=>t.includes('무료 배포는 이용 허락과 다르므로')),license);}
 const mixamo=at('Mixamo');assert.equal(mixamo.status,'review');assert.ok(mixamo.blockers.some(t=>t.includes('Mixamo 라이선스 원문')));
});

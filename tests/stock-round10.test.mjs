import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {normalizeLicense} from '../dist/license-normalization.mjs';
import {outcomeReason,resultItems} from '../dist/result-sections.mjs';

const context={platform:'steam',commercial:true,distribute:true,modified:true};
const asset={name:'sample',kind:'image',confirmed:true,evidence:'다운로드 페이지',rights:'cleared'};
const common=[
 '자료를 수정하지 않은 원본 그대로 단독 판매·배포하지 말고 게임 등 새 창작물의 일부로 사용하세요.',
 '자료를 상표·로고·상호의 일부로 쓰지 마세요.',
 '자료 속 인물·브랜드가 게임을 보증하거나 제휴한 것처럼 보이게 하지 마세요.'
];
const checks=[
 '자료에 나오는 인물·로고·브랜드·건축물·작품의 제3자 권리(초상권·상표권 등)는 사이트가 보증하지 않으므로 별도로 확인하세요.',
 '다운로드한 페이지 주소와 다운로드 날짜를 기록하세요.'
];
for(const [site,names,url,extra] of [
 ['Pixabay',['Pixabay License','Pixabay Content License','Pixabay'],'https://pixabay.com/service/terms/',[
  '상표·로고·브랜드가 보이는 자료는 상품·서비스와 관련된 상업 목적으로 쓰지 마세요.',
  '음란·공격적·정치적 맥락이나 오해를 부르는 방식으로 쓰지 마세요.'
 ]],
 ['Unsplash',['Unsplash License','Unsplash'],'https://unsplash.com/license',[
  '자료를 모아 비슷하거나 경쟁하는 서비스를 만들지 마세요.'
 ]],
 ['Pexels',['Pexels License','Pexels'],'https://www.pexels.com/license/',[
  '식별 가능한 인물을 부정적이거나 공격적으로 묘사하지 마세요.',
  '다른 스톡·배경화면 플랫폼에 재배포하거나 판매하지 마세요.'
 ]]
]){
 test(`${site} aliases produce exact stock conditions, checks and dated sources`,()=>{
  for(const license of [...names,`LicenseRef-${site}`,`  ${names[0].toUpperCase()}  `]){
   assert.equal(normalizeLicense(license),`LicenseRef-${site}`);
   for(const kind of ['image','audio','model','data','other','code'])for(const distribute of [true,false]){
    const a={...asset,license,kind},r=evaluate(a,{...context,distribute});
    assert.equal(r.status,'conditions');
    const reason=outcomeReason(a,r),parts=resultItems(r,reason);
    assert.equal(reason,`${site} 라이선스는 상업 이용과 수정을 허용하며 출처 표시가 필수가 아닙니다. 근거: ${site} 라이선스 (${site.toLowerCase()}.com).`);
    assert.deepEqual(parts.conditions,[...common,...extra]);
    assert.deepEqual(parts.checks,[...checks,...(site==='Pixabay'?['2019-01-09 이전 게시물은 CC0일 수 있으니 페이지에 표시된 라이선스를 확인하세요.']:[])]);
    for(const text of [...parts.conditions,...parts.checks])assert.ok(text.endsWith('세요.'),text);
    assert.ok(r.sources.some(([label,ref])=>label===`${site} 라이선스`&&ref===url));
    if(site==='Pixabay')assert.ok(r.sources.some(([,ref])=>ref==='https://pixabay.com/service/license-summary/'));
    assert.equal(r.ruleDate,'2026-10-20');
   }
  }
 });
 test(`${site} preserves confirmation, evidence, distribution and unsupported scope gates`,()=>{
  for(const license of names){
   for(const patch of [{confirmed:false},{confirmed:undefined},{evidence:''},{evidence:'  '}]){
    const r=evaluate({...asset,license,...patch},context);
    assert.equal(r.status,'review');
    assert.ok(r.blockers.some(t=>t.includes('라이선스가 이 자료에 적용되는지와 근거')));
   }
   for(const distribute of [undefined,null,'true',0])assert.equal(evaluate({...asset,license},{...context,distribute}).status,'review');
   assert.equal(evaluate({...asset,license,kind:'tool'},context).status,'review');
   assert.equal(evaluate({...asset,license,aiGenerated:true},context).status,'review');
   assert.equal(evaluate({...asset,license:`${license} except commercial use`},context).status,'review');
  }
 });
 test(`${site} source wrappers retain explicit CC licensing`,()=>{
  for(const [suffix,id] of [['CC0','CC0-1.0'],['CC BY 4.0','CC-BY-4.0']]){
   for(const license of [`${site} ${suffix}`,`${suffix} (${site})`,`(${site})${suffix}`]){
    assert.equal(normalizeLicense(license),id);
    const a={...asset,license},r=evaluate(a,context),base=evaluate({...asset,license:id},context);
    assert.equal(r.status,'conditions');
    assert.equal(outcomeReason(a,r),outcomeReason({...asset,license:id},base));
    assert.deepEqual(r.tasks,base.tasks);
    assert.ok(r.humanChecks.includes(`다운로드한 ${site} 페이지에 표시된 라이선스와 작성자를 저장하세요.`));
   }
  }
 });
}
test('other storefronts remain unsupported',()=>{
 for(const license of ['Fab Standard License','Adobe Stock','Adobe Stock Standard','Envato Elements']){
  assert.equal(evaluate({...asset,license},context).status,'review');
 }
});

test('store licenses ask for the distribution choice instead of a generic unsupported reason',()=>{
 for(const license of ['Pixabay License','Unsplash','Pexels License','Unity Asset Store EULA']){
  const r=evaluate({name:'x',kind:'image',license,confirmed:true,evidence:'https://example.org'},{platform:'steam',commercial:true});
  assert.equal(r.status,'review');assert.ok(r.blockers.some(t=>t.includes('외부 배포 여부를 지정하세요')),license);
  assert.ok(!r.blockers.some(t=>t.includes('지원하지 않는 라이선스')),license);
 }
});

test('an all-clear conclusion does not say "the rest"',async()=>{
 const {projectConclusion}=await import('../dist/result-sections.mjs');
 const mk=(name,license)=>({id:name,name,kind:'image',license,confirmed:true,evidence:'https://example.org',selection:'used'});
 const c=projectConclusion({name:'p',contextConfirmed:true,context:{platform:'steam',commercial:true,distribute:true,modified:true,network:false},assets:[mk('a','MIT'),mk('b','CC0-1.0')]});
 assert.equal(c.actions.length,0);assert.equal(c.conditionsText,'2개 모두 표시된 조건을 지키면 사용할 수 있습니다.');
});

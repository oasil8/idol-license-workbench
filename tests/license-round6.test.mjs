import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,parseFile} from '../dist/core.mjs';
import {outcomeReason,resultItems} from '../dist/result-sections.mjs';
import {normalizeLicense} from '../dist/license-normalization.mjs';

const steam={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const research={platform:'research',commercial:false,distribute:false,modified:false,network:false};
const asset=license=>({name:'sample',kind:'code',license,confirmed:true,evidence:'LICENSE'});
export const aliases=[
 ['MIT License','MIT'],['mit','MIT'],['The MIT License (MIT)','MIT'],
 ['  mIt-Licence  ','MIT'],['Apache v2.0','Apache-2.0'],['MPL version 2.0','MPL-2.0'],
 ['Apache 2.0','Apache-2.0'],['Apache License 2.0','Apache-2.0'],['Apache License, Version 2.0','Apache-2.0'],
 ['GPLv3','GPL-3.0-only'],['GPL v2','GPL-2.0-only'],['GPL 3 or later','GPL-3.0-or-later'],['GPLv3+','GPL-3.0-or-later'],
 ['LGPL-2.1','LGPL-2.1-only'],['LGPL v2.1+','LGPL-2.1-or-later'],['AGPL v3','AGPL-3.0-only'],
 ['BSD 3-Clause','BSD-3-Clause'],['New BSD','BSD-3-Clause'],['BSD 2-Clause','BSD-2-Clause'],['Simplified BSD','BSD-2-Clause'],
 ['ISC License','ISC'],['MPL 2.0','MPL-2.0'],
 ['CC0','CC0-1.0'],['CC0 1.0','CC0-1.0'],['CC0-1.0 Universal','CC0-1.0'],
 ['SIL OFL 1.1','OFL-1.1'],['Open Font License 1.1','OFL-1.1'],
 ['zlib','Zlib'],['The Unlicense','Unlicense'],['Boost Software License 1.0','BSL-1.0'],
 ...['3.0','4.0'].flatMap(v=>[
  [`CC BY ${v}`,`CC-BY-${v}`],[`CC-BY ${v}`,`CC-BY-${v}`],
  ...[['',''],['-SA',' ShareAlike'],['-NC',' NonCommercial'],['-ND',' NoDerivatives'],['-NC-SA',' NonCommercial ShareAlike'],['-NC-ND',' NonCommercial NoDerivatives']].flatMap(([suffix,words])=>[
   [`CC BY${suffix} ${v}`,`CC-BY${suffix}-${v}`],
   [`Creative Commons Attribution${words} ${v}`,`CC-BY${suffix}-${v}`]
  ])
 ])
];
for(const [input,id] of aliases)test(`alias ${input} preserves ${id} evaluation and input`,()=>{
 assert.equal(normalizeLicense(input),id);
 assert.equal(normalizeLicense(normalizeLicense(input)),id);
 for(const context of [steam,research])for(const kind of ['code','image','audio','model','font']){
  const a={...asset(input),kind},before=structuredClone(a);
  assert.deepEqual(evaluate(a,context),evaluate({...a,license:id},context));
  assert.deepEqual(a,before);
 }
});
test('or-later SPDX IDs are not OR expressions and retain copyleft behavior',()=>{
 for(const license of ['GPL-2.0-or-later','GPL-3.0-or-later','LGPL-2.0-or-later','LGPL-2.1-or-later','LGPL-3.0-or-later','AGPL-3.0-or-later']){
  const a=asset(license),r=evaluate(a,steam);
  assert.equal(r.status,'review');
  assert.doesNotMatch(outcomeReason(a,r),/복수 라이선스/);
  assert.equal(evaluate(a,research).status,'conditions');
 }
});
test('file-imported alias stays stored verbatim and evaluates canonically',()=>{
 const [a]=parseFile('package.json',JSON.stringify({name:'sample',license:'MIT License'}));
 assert.equal(a.license,'MIT License');
 assert.deepEqual(evaluate({...a,confirmed:true},steam),evaluate({...a,license:'MIT',confirmed:true},steam));
});
const unclear=[
 ['GPL',/GPL.*버전.*2\/3.*or later/],['LGPL',/LGPL.*버전.*or later/],['AGPL',/AGPL.*버전.*or later/],
 ['BSD',/조항 수/],['CC BY',/버전/],['Public Domain',/근거/],['Royalty Free',/판매처.*라이선스.*원문/],['Boost',/버전/]
];
for(const [input,pattern] of unclear)test(`unclear ${input} requests missing evidence`,()=>{
 const a=asset(input),r=evaluate(a,steam),reason=outcomeReason(a,r);
 assert.equal(r.status,'review');
 assert.doesNotMatch(reason,/지원하지 않는 라이선스·개별 계약/);
 assert.match([...r.blockers,...r.humanChecks].join(' '),pattern);
});
const stores=['Unity Asset Store EULA','Unity Asset Store Standard EULA','Fab Standard License','Unreal Engine EULA','Epic Content License','Pixabay License','Unsplash License','Pexels License','Adobe Stock','Adobe Stock Standard','Envato','Envato Elements','Epidemic Sound','itch.io','itch.io custom'];
for(const input of stores)test(`store ${input} uses its supported rule or stays review with a concrete action`,()=>{
 const a=asset(input),r=evaluate(a,steam);
 if(input.startsWith('Unity Asset Store')){
  assert.equal(r.status,'conditions');
  assert.match(outcomeReason(a,r),/Unity Asset Store 표준 EULA.*허용/);
  assert.match(outcomeReason(a,r),/Unity Asset Store EULA \(unity\.com\)/);
  const parts=resultItems(r,outcomeReason(a,r));
  assert.equal(parts.conditions.length,5);
  assert.equal(parts.checks.length,4);
  assert.match(parts.checks.join(' '),/별도 판매자 EULA.*Restricted Asset Terms.*구매 영수증/);
  return;
 }
 assert.equal(r.status,'review');
 assert.match(outcomeReason(a,r),/판매처 라이선스.*자동 판정 미지원/);
 assert.doesNotMatch(outcomeReason(a,r),/지원하지 않는 라이선스·개별 계약/);
 assert.match(resultItems(r,outcomeReason(a,r)).checks.join(' '),/구매·다운로드 당시.*라이선스 원문.*게임.*판매·배포.*단독 재배포/);
});
for(const input of ['MIT OR Apache-2.0','(MIT AND Apache-2.0)','MIT WITH LLVM-exception','mit or apache 2.0','MIT (Apache-2.0)','MIT / ISC','MIT License except commercial use','CC BY 4.0 NC SA ND','GPLv4','AGPL v2','CC BY 3.0 US','Kenney CC0','Proprietary',''])
 test(`unresolved ${input} uses round9 support or stays conservative`,()=>{
  const supported=['MIT OR Apache-2.0','mit or apache 2.0','MIT / ISC','Kenney CC0'].includes(input);
  for(const context of [steam,research])assert.equal(evaluate(asset(input),context).status,supported?'conditions':'review');
 });
test('abbreviation parentheses alone do not imply an SPDX expression',()=>{
 const a=asset('MIT (Apache-2.0)'),r=evaluate(a,steam);
 assert.doesNotMatch(outcomeReason(a,r),/복수 라이선스 또는 예외 조항/);
});
test('expression review preserves operators and gives action sentences',()=>{
 for(const license of ['(MIT AND Apache-2.0)','MIT or (Apache-2.0)','GPL-3.0-only WITH Classpath-exception-2.0']){
  const a=asset(license),r=evaluate(a,steam);
  assert.equal(normalizeLicense(license),license);
  assert.match(outcomeReason(a,r),/복수 라이선스 또는 예외 조항/);
  for(const text of [...r.tasks,...r.blockers])assert.ok(text.endsWith('세요.'),text);
 }
});
const additions=[
 ['Zlib','conditions'],['BSL-1.0','conditions'],['0BSD','conditions'],['Unlicense','conditions'],
 ['CC-BY-3.0','conditions'],['CC-BY-SA-3.0','conditions'],['CC-BY-NC-3.0','conflict'],
 ['CC-BY-ND-3.0','conflict'],['CC-BY-NC-SA-3.0','conflict'],['CC-BY-NC-ND-3.0','conflict'],
 ['EPL-2.0','review'],['WTFPL','review']
];
for(const [id,status] of additions)test(`new ${id} fixes Steam and research outcomes with source/actions`,()=>{
 for(const [context,want] of [[steam,status],[research,id==='WTFPL'?'review':'conditions']]){
  const a={...asset(id),kind:'image'},r=evaluate(a,context);
  assert.equal(r.status,want);
  assert.ok(r.sources.some(([,url])=>url===`https://spdx.org/licenses/${id}.html`));
  for(const text of [...r.tasks,...r.humanChecks,...r.blockers])assert.ok(text.endsWith('세요.'),text);
  assert.ok(r.humanChecks.some(t=>t.includes('제3자 권리')));
 }
});
test('new license obligations retain the substantive restrictions',()=>{
 const run=id=>evaluate(asset(id),steam);
 assert.match(run('Zlib').tasks.join(' '),/원 출처.*변경.*고지/);
 assert.match(run('BSL-1.0').tasks.join(' '),/배포 시.*고지.*유지/);
 for(const id of ['0BSD','Unlicense'])assert.deepEqual(run(id).tasks,[]);
 assert.match(run('CC-BY-SA-3.0').tasks.join(' '),/3\.0.*동일/);
 assert.match(run('EPL-2.0').blockers.join(' '),/소스.*제공/);
 assert.match(run('WTFPL').blockers.join(' '),/법적 효력.*저작권자.*이용 허가/);
});

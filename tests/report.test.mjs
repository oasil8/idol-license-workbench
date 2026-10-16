import {installReportPrint} from '../dist/print-report.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {reportHtml} from '../dist/report.mjs';
test('한글 보고서는 UTF-8 문서이며 PDF 발췌문을 접고 출처를 보존한다',()=>{
 const html=reportHtml('# 검토 보고서\n\n## Tripo\n\n상용 결론: 판단 보류\n근거: 스케치.pdf · PDF 1페이지\n잘린\nPDF 문장\n메모: 실제 사용 미정\n\n- 공식 출처: https://example.com/terms\n\n### 스케치.pdf — 과제 자료\n\n추출 원문');
 assert.ok(html.startsWith('\ufeff<!doctype html>'));
 assert.match(html,/<meta charset="utf-8">/);
 assert.match(html,/<details><summary>문서에서 추출한 발췌문<\/summary><pre>잘린\nPDF 문장<\/pre><\/details>/);
 assert.match(html,/<a href="https:\/\/example.com\/terms"/);
 assert.match(html,/<summary>스케치.pdf — 과제 자료 · 추출 원문<\/summary>/);
 assert.doesNotMatch(html,/<p># /);
});
test('보고서 내용은 실행하지 않고 안전한 링크만 만든다',()=>{
 const html=reportHtml('# <script>alert(1)</script>\n\n[위험](javascript:alert(1))\n\n[공식](https://example.com/?a=1&b=2)');
 assert.doesNotMatch(html,/<script|href="javascript:/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/href="https:\/\/example.com\/\?a=1&amp;b=2"/);
});

import {buildProjectReport} from '../dist/report.mjs';
test('project report has a linked overview and preserves full evidence behind details',()=>{
 const p={name:'Shared <review>',context:{platform:'research',commercial:false,distribute:false},assets:[{name:'Image A',kind:'image',license:'CC-BY-4.0',confirmed:true,evidence:'https://example.com/source',notes:'Keep this original note',rights:'unknown',selection:'used'},{name:'Unused',kind:'code',selection:'excluded'}]};
 const html=buildProjectReport({...p,contextConfirmed:true});
 assert.match(html,/자료별 결과 한눈에 보기/);assert.match(html,/href="#material-0"/);assert.match(html,/id="material-0"/);
 assert.equal((html.match(/data-material/g)||[]).length,1);assert.match(html,/<details class="material-evidence"><summary>상세 근거·출처·원문 보기/);
 for(const value of ['Keep this original note','https://example.com/source','허용 근거','확인 필요','지켜야 할 조건','Shared &lt;review&gt;'])assert.ok(html.includes(value),value);
 assert.doesNotMatch(html.replace(`<script>(${installReportPrint.toString()})(document.querySelector('main'));</script>`,''),/버전: 미기록|플랜: 미기록|<script>/);
 assert.match(html,/인쇄본은 결과·조건·적용 범위와 보관된 원문 부록/);
});

import {evaluate,commercialVerdict} from '../dist/core.mjs';
import {resultItems,outcomeReason} from '../dist/result-sections.mjs';
// Shared third-party guidance replaces these equivalent task variants, without dropping the obligation.
const displayedTask=value=>value.includes('제3자 권리')?'입력 자료·브랜드·디자인·상표·초상·음성·개인정보 등 제3자 권리는 라이선스·약관상 허용만으로 확보되지 않으므로 실제 자료를 기준으로 별도 확인하세요.':value;
test('report preserves evaluated conditions, checks, scope and differing commercial reasons',()=>{
 const a={name:'Study image',kind:'image',license:'CC-BY-NC-4.0',confirmed:true,rights:'unknown',selection:'used',reviewScope:'bundle',notes:'Original note'};
 const p={name:'Parity',context:{platform:'research',commercial:false,distribute:true},assets:[a]};
 const html=buildProjectReport({...p,contextConfirmed:true}),r=evaluate(a,p.context),parts=resultItems(r);
 for(const value of [outcomeReason(a,r),...parts.conditions.map(displayedTask),...parts.checks.map(displayedTask),...commercialVerdict(a,p.context).notes,'패키지·번들 전체','Original note'])assert.ok(html.includes(value),value);
 assert.match(html,/해당 항목: Study image/);
});
test('report preserves document checklist title, role and located candidate excerpts',()=>{
 const text='Blender is mentioned in this feedback.';
 const p={name:'Docs',context:{platform:'research'},assets:[],assignment:{documents:[{name:'feedback.docx',role:'feedback',text,locations:[{label:'문단 1',start:0,end:text.length}],warnings:['원문 확인']}]}};
 const html=buildProjectReport({...p,contextConfirmed:true});
 for(const value of ['문서 보완 체크리스트','feedback.docx · 피드백','문단 1','Blender is mentioned','원문 확인'])assert.ok(html.includes(value),value);
});

import {supplementCodeLicense} from '../dist/official-sources.mjs';
import {summaryReason,projectSummary} from '../dist/workflow.mjs';
test('reports preserve all result sections across products, scopes and usage flags',()=>{
 const products=[['Docker Engine','tool'],['Tailscale','tool'],['Qwen3.6-35B-A3B','model'],['NVIDIA Isaac Sim','tool'],['OpenSees','code'],['NumPy','code'],['Python','tool'],['Project Chrono','code']];
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const seen=new Set();
 for(const [name,kind] of products)for(const reviewScope of ['code','model','service','bundle'])for(let flags=0;flags<16;flags++){
  const a={...supplementCodeLicense({name,kind}),reviewScope,selection:'used'};
  const context={platform:'research',commercial:!!(flags&1),distribute:!!(flags&2),modified:!!(flags&4),network:!!(flags&8)};
  const p={name:'Coverage',assets:[a],context},r=evaluate(a,context),items=resultItems(r),html=buildProjectReport({...p,contextConfirmed:true});
  seen.add(r.status);
  for(const value of [outcomeReason(a,r),...items.conditions.map(displayedTask),...items.checks.map(displayedTask),...r.notes])assert.ok(html.includes(escape(value)),`${name}/${reviewScope}/${flags}: ${value}`);
  assert.ok(html.includes(escape(summaryReason(projectSummary(p)))));
 }
 assert.deepEqual([...seen].sort(),['conditions','conflict','review']);
});
test('print sources remain outside folded evidence and raw document locations are preserved',()=>{
 const a={name:'Local license',kind:'code',license:'MIT',confirmed:true,selection:'used',evidence:'https://example.com/LICENSE',licenseDocument:{name:'LICENSE.pdf',text:'Permission is hereby granted.',locations:[{label:'PDF 2페이지',start:0,end:28}],warnings:['OCR 미사용']}};
 const html=buildProjectReport({contextConfirmed:true,name:'Print sources',context:{platform:'research'},assets:[a]});
 assert.ok(html.indexOf('class="report-citations"')<html.indexOf('<details class="material-evidence">'));
 assert.match(html,/<span class="print-url">https:\/\/example.com\/LICENSE<\/span>/);
 for(const value of ['PDF 2페이지','Permission is hereby granted.','OCR 미사용'])assert.ok(html.includes(value));
});

test('every exported overlapping quote link has an original anchor',()=>{
 const originalText='Start Alpha Beta Gamma Delta End';
 const a={name:'Manual source',kind:'ai',provider:'other',scope:'output',selection:'used',terms:{method:'manual',sourceUrl:'https://example.com/terms',originalText,excerpts:['Alpha Beta Gamma','Beta Gamma','Gamma Delta']}};
 const html=buildProjectReport({contextConfirmed:true,name:'Anchors',context:{platform:'research'},assets:[a]});
 for(const index of [0,1,2]){assert.ok(html.includes(`href="#terms-0-${index}"`));assert.equal((html.match(new RegExp(`id="terms-0-${index}"`,'g'))||[]).length,1);}
});

test('exported source links preserve balanced parentheses and labels without Markdown reparsing',()=>{
 const url='https://example.com/a_(b)?license=v1&lang=en';
 const a={name:'Source',kind:'code',license:'MIT',confirmed:true,selection:'used',evidence:url};
 const html=buildProjectReport({contextConfirmed:true,name:'Exact links',context:{platform:'research'},assets:[a]});
 assert.ok(html.includes('href="https://example.com/a_(b)?license=v1&amp;lang=en"'));
 assert.ok(!html.includes('href="https://example.com/a_(b"'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {koreanTermsSummary,verificationMarkup} from '../dist/source-search.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const now=Date.now(),a={name:'Test',kind:'ai',planType:'unknown',scope:'output'};
const v={query:'Test',url:'https://vendor.example.com/terms',status:'matched',checkedAt:new Date(now).toISOString(),text:'Free plan outputs are for personal non-commercial use only. Paid users may commercially exploit outputs, except remixes. Attribution is required when distributing the output.',excerpts:[]};
test('Korean clause summaries retain exact original positions and conditions without granting rights',()=>{
 const s=koreanTermsSummary(v,a,now);assert.equal(s.status,'review');assert.ok(s.items.length>=3);
 for(const e of s.items)assert.equal(v.text.slice(e.start,e.start+e.text.length),e.text);
 assert.ok(s.items.some(e=>e.text.includes('except remixes')));assert.match(s.reasons.join(' '),/플랜/);
 const paid=koreanTermsSummary(v,{...a,planType:'paid',sourceConditionsConfirmed:true,date:'2026-10-15'},now);assert.equal(paid.status,'review');assert.ok(!paid.reasons.some(r=>r.includes('플랜')));
});
test('candidate, stale, imported, renamed and truncated texts cannot become permission',()=>{
 for(const changed of [{status:'candidate'},{imported:true},{checkedAt:'2020-01-01'},{query:'Other'},{truncated:true}]){
 const s=koreanTermsSummary({...v,...changed},a,now);assert.equal(s.status,'review');assert.match(s.reasons.join(' '),/재확인|누락/);
 }
 assert.match(koreanTermsSummary({...v,text:'No supported clause here.'},a).reasons.join(' '),/찾지 못/);
 assert.equal(koreanTermsSummary({...v,text:'Commercial use is allowed '+ 'x'.repeat(2000)+' except restricted outputs.'},a).items.length,0);
});
test('Korean evidence disclosures escape text and are included in exported reports',()=>{
 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=verificationMarkup({...v,text:v.text+' Commercial use <script>alert(1)</script> is forbidden.'},esc,a);
 assert.match(html,/원문 근거 보기/);assert.ok(!html.includes('<script>'));assert.match(html,/원문 웹사이트 열기/);
 const report=buildProjectReport({contextConfirmed:true,name:'Test',context:{},assets:[{...a,selection:'used',sourceCandidates:[{query:v.query,url:v.url,searchedAt:v.checkedAt,verification:v}]}]});
 assert.match(report,/확인 전 검색 후보 1개 · 근거로 사용하지 않음/);assert.doesNotMatch(report,/한국어 요약|원문 근거 보기|vendor.example.com|except remixes/);
 const official={...v,query:'Suno',url:'https://suno.com/terms'};
 const trusted=buildProjectReport({contextConfirmed:true,name:'Test',context:{},assets:[{...a,name:'Suno',selection:'used',sourceCandidates:[{query:official.query,url:official.url,searchedAt:official.checkedAt,verification:official}]}]});
 assert.match(trusted,/한국어 요약/);assert.match(trusted,/원문 근거 보기/);
});

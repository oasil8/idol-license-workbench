import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pdfReportData,originalKey,createReportPdf} from '../report-pdf.mjs';
import {evaluate} from '../dist/core.mjs';
import {resultItems,outcomeReason} from '../dist/result-sections.mjs';
const project={name:'간단 리포트',context:{platform:'research',commercial:false,distribute:true},assets:[{name:'NumPy',kind:'code',license:'BSD-3-Clause',confirmed:true,selection:'used',reviewScope:'code',evidence:'https://numpy.org/doc/stable/license.html'}],assignment:{documents:[{name:'terms.pdf',text:'Allow commercial use.\nKeep notice.',role:'material'},{name:'terms.docx',text:'Allow commercial use. Keep notice.',role:'material'},{name:'different.txt',text:'Do not allow commercial use. Keep notice.',role:'material'}]}};
test('default PDF omits original documents but preserves all result conditions and scope',()=>{
 const before=JSON.stringify(project),data=pdfReportData(project),r=evaluate(project.assets[0],project.context);
 assert.equal(data.originals.length,0);assert.equal(data.items[0].reason,outcomeReason(project.assets[0],r));
 assert.deepEqual(data.items[0].conditions,resultItems(r).conditions);assert.deepEqual(data.items[0].checks,resultItems(r).checks);assert.equal(data.items[0].scope,'코드·오픈소스 자체');assert.equal(JSON.stringify(project),before);
});
test('optional originals merge whitespace duplicates preserving all source names and distinct conditions',()=>{
 const before=JSON.stringify(project),data=pdfReportData(project,true),terms=data.originals.find(x=>x.labels.includes('terms.pdf · 검토 자료'));
 assert.deepEqual(terms.labels,['terms.pdf · 검토 자료','terms.docx · 검토 자료']);assert.ok(data.originals.some(x=>x.labels.includes('different.txt · 검토 자료')));assert.equal(JSON.stringify(project),before);
 assert.notEqual(originalKey('now here'),originalKey('nowhere'));assert.notEqual(originalKey('commercial allowed'),originalKey('commercial not allowed'));
});
test('PDF file uses actual PDF bytes and never changes source data',{skip:!fs.existsSync('C:/Windows/Fonts/malgun.ttf')},async()=>{
 const before=JSON.stringify(project),pdf=await createReportPdf(project);
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.subarray(-30).toString().includes('%%EOF'));assert.equal(JSON.stringify(project),before);
});
test('download UI has one concise PDF action without appendix selector',()=>{
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="(?:printReport|refreshTerms)"/);assert.doesNotMatch(html,/includeReportOriginals|rightsConditions/);assert.match(app,/includeOriginals:false/);assert.match(app,/download\('license-review.pdf'/);assert.doesNotMatch(app,/download\('license-review.html'/);
});

test('concise PDF agrees with the Meshy screen result and includes plan conditions',()=>{
 const data=pdfReportData({...project,assets:[{name:'Meshy',kind:'ai',provider:'meshy',scope:'output',planType:'unknown',selection:'used'}]});
 assert.equal(data.items[0].status,'사용 가능 (조건부)');assert.ok(data.items[0].conditions.some(x=>x.includes('CC BY')));assert.ok(data.items[0].sources.some(x=>x.url.includes('help.meshy.ai')&&x.clause.includes('CC BY')));assert.equal(data.originals.length,0);
});

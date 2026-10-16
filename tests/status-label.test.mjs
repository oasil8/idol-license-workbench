import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {statuses} from '../dist/core.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {pdfReportData} from '../report-pdf.mjs';
test('live cards, printable HTML and PDF use the same status definition',()=>{
 const code=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const declaration=code.slice(code.indexOf('const badge='),code.indexOf('\n',code.indexOf('const badge=')));
 const badge=vm.runInNewContext(declaration+';badge',{statuses});
 for(const status of Object.keys(statuses))for(const evidenceMethod of ['manual','public-review',undefined])assert.equal(badge({status,contractConfirmed:true,evidenceMethod}),`<span class="badge ${status}">${statuses[status]}</span>`);
 const p=JSON.parse(readFileSync(new URL('./fixtures/report-sample.json',import.meta.url))),html=buildProjectReport(p);
 for(const item of pdfReportData(p).items)assert.ok(html.includes(item.status));
});

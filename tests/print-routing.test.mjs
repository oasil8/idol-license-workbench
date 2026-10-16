import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reportPrintCss} from '../dist/print-report.mjs';
test('served app stylesheet matches standalone print layout and new module is routable',()=>{
 assert.ok(fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8').replaceAll('\r\n','\n').includes(reportPrintCss));
 assert.match(fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8'),/'print-report.mjs'/);
});

test('print verdict colors match generated PDF and Korean cards keep readable page boundaries',async()=>{
 const {verdictColor,createReportPdf}=await import('../report-pdf.mjs');const {statuses}=await import('../dist/core.mjs');
 for(const key of ['conflict','review','conditions'])assert.ok(reportPrintCss.includes(`#overall.${key} h2 { color:${verdictColor(statuses[key])}; }`));
 assert.match(reportPrintCss,/\.result-card \{ break-inside:avoid/);assert.match(reportPrintCss,/word-break:keep-all/);assert.match(reportPrintCss,/print-color-adjust:exact/);
 const sample=JSON.parse(fs.readFileSync(new URL('./fixtures/report-sample.json',import.meta.url),'utf8'));
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await getDocument({data:new Uint8Array(await createReportPdf(sample)),useSystemFonts:true}).promise;const first=(await (await doc.getPage(1)).getTextContent()).items.map(x=>x.str).join('');for(const label of Object.values(statuses))assert.ok(first.includes(label));
});

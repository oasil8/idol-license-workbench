import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reportPrintCss} from '../dist/print-report.mjs';
test('served app stylesheet matches standalone print layout and new module is routable',()=>{
 assert.ok(fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8').replaceAll('\r\n','\n').includes(reportPrintCss));
 assert.match(fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8'),/'print-report.mjs'/);
});

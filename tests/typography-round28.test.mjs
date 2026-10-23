import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
// Print-only pt sizes are preserved: browser print is outside the screen scale.
const printSizes=new Set(['9pt','10pt','11pt','20pt','22pt']);
const screenCss=css.replace(/@media print\s*\{(?:[^{}]|\{[^{}]*\})*\}/g,'');
const tokens={page:26,conclusion:22,section:16,subheading:14,body:14,secondary:13,small:12,'page-mobile':22,'conclusion-mobile':20,'workspace-label':11};
test('screen typography uses the declared role scale without arbitrary sizes or weights',()=>{
 for(const [role,size] of Object.entries(tokens)) assert.match(css,new RegExp('--font-'+role+':\\s*'+size+'px'));
 for(const [,value] of css.matchAll(/font-size\s*:\s*([^;}]+)/g)) {
  const size=value.replace(/!important/g,'').trim();
  assert.ok(printSizes.has(size)||Object.keys(tokens).some(role=>size==='var(--font-'+role+')'), 'Unexpected font-size: '+size);
 }
 for(const [,value] of screenCss.matchAll(/font-size\s*:\s*([^;}]+)/g)) assert.match(value.trim(),/^var\(--font-[a-z-]+\)(!important)?$/);
 for(const [,value] of css.matchAll(/font-weight\s*:\s*([^;}]+)/g)) assert.match(value.trim(),/^(400|700|normal|bold)(!important)?$/);
 // Shorthand must not bypass the scale; retain the existing print pre/blockquote shorthand.
 for(const [,value] of css.matchAll(/(?:^|[;{])\s*font\s*:\s*([^;}]+)/g)) assert.ok(value==='inherit'||value.includes('var(--font-')||value==='10pt/1.6 "Malgun Gothic",sans-serif',value);
 assert.equal((css.match(/font-size:var\(--font-workspace-label\)/g)||[]).length,1);
 assert.match(css,/\.workspace-label\{font-size:var\(--font-workspace-label\)/);
 assert.doesNotMatch(css,/\r/);
});
test('conclusion content compensates for the extra four border pixels in every state',()=>{
 assert.match(css,/#overall\s*\{[^}]*padding-inline:var\(--report-card-inset\)[^}]*padding-left:calc\(var\(--report-card-inset\) - 4px\)/);
 assert.match(css,/#reportContent>\.result-card\s*\{[^}]*padding:var\(--report-card-inset\)/);
 assert.match(css,/#reportContent>\.report-item\s*\{[^}]*padding:var\(--report-card-inset\)/);
 for(const state of ['conflict','review','conditions']) assert.match(css,new RegExp('\\.overall\\.'+state+'\\{[^}]*border-left:5px'));
});
test('checkboxes, shortcut actions and section summaries retain their intended hierarchy',()=>{
 assert.match(css,/\.context-fields>label\.check\s*\{[^}]*font-size:var\(--font-body\)!important;[^}]*font-weight:400!important/);
 assert.match(css,/\.result-card \.text-button\s*\{[^}]*font-size:var\(--font-secondary\);font-weight:400/);
 assert.match(css,/\.violation-cases>summary[^}]*font-size:var\(--font-section\);font-weight:700/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installReportPrint,reportPrintCss} from '../dist/print-report.mjs';
import {buildProjectReport} from '../dist/report.mjs';

// Small DOM fixture checks relocation by identity (including original anchors), not copies.
class Element {
 constructor(tag,doc,text=''){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.textContent=text;this.children=[];this.open=false;this.className='';}
 get parentElement(){return this.parent;}
 get isConnected(){return !!this.parent;}
 get previousElementSibling(){return this.parent?.children[this.parent.children.indexOf(this)-1];}
 append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
 replaceWith(node){const parent=this.parent,index=parent.children.indexOf(this);node.remove();parent.children[index]=node;node.parent=parent;this.parent=null;}
 querySelector(selector){return this.children.find(n=>['SUMMARY','H2','H3'].includes(n.tagName));}
 querySelectorAll(tag){const selectors=tag.split(',').map(x=>x.trim());return this.children.flatMap(n=>[...(selectors.some(x=>x.startsWith('.')?n.className===x.slice(1):n.tagName===x.toUpperCase())?[n]:[]),...n.querySelectorAll(tag)]);}
}
test('printing includes nested scope details and every original in a trailing appendix, then restores exactly',()=>{
 const doc={createElement:tag=>new Element(tag,doc)},root=doc.createElement('main'),events={};
 const make=(tag,text)=>new Element(tag,doc,text);
 const outer=make('details'),scope=make('details'),raw=make('pre','<unsafe>\n'+ '긴원문'.repeat(10000)),label=make('h4','PDF 14페이지');
 raw.id='quote-anchor';outer.open=true;scope.append(make('summary','적용 범위·설명'),make('p','공식 적용 범위'),label,raw);outer.append(make('summary','Sample service'),scope);root.append(outer);
 const before=[...scope.children];const api=installReportPrint(root,{addEventListener:(name,fn)=>events[name]=fn});
 events.beforeprint();events.beforeprint();assert.equal(root.children.length,2);assert.equal(scope.open,true);
 const appendix=root.children[1];assert.equal(appendix.className,'print-appendix');assert.equal(appendix.querySelectorAll('pre')[0],raw);assert.equal(raw.id,'quote-anchor');
 assert.match(appendix.children[1].children[0].textContent,/Sample service.*적용 범위·설명.*PDF 14페이지/);
 assert.equal(raw.textContent,'<unsafe>\n'+'긴원문'.repeat(10000));assert.equal(scope.querySelectorAll('pre').length,0);
 events.afterprint();assert.deepEqual(scope.children,before);assert.equal(scope.open,false);assert.equal(outer.open,true);assert.equal(root.children.length,1);
 api.prepare();api.restore();assert.deepEqual(scope.children,before);
});
test('empty report prints without adding an empty appendix',()=>{
 const doc={createElement:tag=>new Element(tag,doc)},root=doc.createElement('main');
 const api=installReportPrint(root,{addEventListener:()=>{}});api.prepare();assert.equal(root.children.length,0);api.restore();
});
test('app and standalone download use the same complete print pipeline',()=>{
 const source=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(source,/installReportPrint\(\$\('reportView'\)\)/);
 assert.match(source,/저장된 약관 원문<\/summary><pre>\$\{esc\(t.originalText\)\}/);
 const html=buildProjectReport({name:'Print',context:{platform:'research'},assets:[]});
 assert.ok(html.includes(installReportPrint.toString()));assert.ok(html.includes(reportPrintCss));
 assert.match(reportPrintCss,/white-space:pre-wrap!important/);assert.match(reportPrintCss,/break-before:page/);
 assert.match(reportPrintCss,/\.assessment-evidence,\.verification-record,\.assignment-source/);
});

test('document page originals stay grouped in one appendix entry without duplication',()=>{
 const doc={createElement:tag=>new Element(tag,doc)},root=doc.createElement('main');
 const document=doc.createElement('details');document.className='assignment-source';
 const title=new Element('summary',doc,'Source.pdf · 검토 자료');
 const pages=[new Element('pre',doc,'PAGE 1'),new Element('pre',doc,'PAGE 2')];document.append(title,...pages);root.append(document);
 const api=installReportPrint(root,{addEventListener:()=>{}});api.prepare();
 const appendix=root.children[1];assert.equal(appendix.children.length,2);assert.deepEqual(appendix.querySelectorAll('pre'),pages);
 assert.equal(document.open,true);api.restore();assert.equal(root.children[0],document);assert.equal(document.open,false);assert.deepEqual(document.querySelectorAll('pre'),pages);
});

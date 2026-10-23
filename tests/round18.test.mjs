import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import PDFDocument from 'pdfkit';
import {renderReportPdf} from '../dist/pdf-report.mjs';

test('common PDF notes have hanging bullets, separate names and measured spacing',async()=>{
 const project=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 const calls=[];let page=0;
 class MeasuredPDF extends PDFDocument{
  addPage(...args){page++;return super.addPage(...args);}
  text(value,x,y,options){
   const call={value,x,y,page,size:this._fontSize};
   const result=super.text(value,x,y,options);call.end=this.y;calls.push(call);return result;
  }
 }
 const bytes=await renderReportPdf(project,{PDFDocument:MeasuredPDF,font:process.env.IDOL_PDF_FONT||'C:/Windows/Fonts/malgun.ttf'});
 assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'%PDF');
 const firstCard=calls.findIndex(c=>/^1\. /.test(c.value)&&c.x===48);
 const common=calls.slice(calls.findIndex(c=>c.value==='공통 확인사항'),firstCard);
 const names=common.filter(c=>c.value.startsWith('(해당 항목:'));
 assert.ok(names.length>=2);
 for(const name of names){
  const index=common.indexOf(name),body=common[index-1],bullet=common[index-2];
  assert.equal(bullet.value,'•');assert.equal(body.x,54);assert.equal(name.x,54);
  assert.equal(bullet.x,42);assert.equal(bullet.y,body.y);
  assert.equal(body.page,name.page);assert.ok(name.y>=body.end+2);
  assert.ok(name.size<body.size);assert.ok(name.end<=841.89-44);
  const next=common[index+1];
  if(next&&next.page===name.page)assert.ok(next.y-name.end>=5);
 }
 const heading=common[0],first=common[1];
 assert.equal(heading.page,first.page);assert.ok(first.y-heading.end>=6);
 const minor=common.findIndex(c=>c.value==='그 밖의 일반 주의사항');
 assert.ok(minor>0);assert.ok(common[minor].y-common[minor-1].end>=12);
 const card=calls[firstCard],last=common.at(-1);
 if(card.page===last.page)assert.ok(card.y-last.end>=20);
});

test('guide keeps short steps and verdict badges visible and folds supporting explanations',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const guide=html.match(/<section id="guideView"[\s\S]*?<\/section>/)[0];
 const visible=guide.replace(/<details\b[\s\S]*?<\/details>/g,'');
 for(const label of ['확정','잠정','철회','근거 링크 읽는 법','문서 가져오기'])assert.ok(!visible.includes(label),label);
 for(const status of ['conditions','review','conflict'])assert.ok(visible.includes(`class="badge ${status}"`));
 assert.ok(visible.includes('이 결과는 검토 기록이며 출시 승인이나 법률 의견이 아닙니다.'));
 assert.doesNotMatch(guide,/<details[^>]*\bopen\b|이 PC의 로컬 서버|PC에 설치된 글꼴/);
 for(const label of ['PDF·DOCX·PPTX·XLSX·HWPX·ODT·RTF·TXT·MD','연구·학회도 자동으로 비상업용','모델 가중치','전체 백업 · 기기 이동','Lobe Icons','Simple Icons','상표'])assert.ok(guide.includes(label),label);
 assert.equal(guide.split('THIRD-PARTY-NOTICES.txt').length-1,1);
});

test('common heading and note move together when the remaining page space is too small',async()=>{
 const project=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 let page=0;const calls=[];
 class PageEndPDF extends PDFDocument{
  addPage(...args){page++;return super.addPage(...args);}
  moveDown(...args){const result=super.moveDown(...args);if(page===1)this.y=770;return result;}
  text(value,x,y,options){const result=super.text(value,x,y,options);calls.push({value,page,y,end:this.y});return result;}
 }
 await renderReportPdf(project,{PDFDocument:PageEndPDF,font:process.env.IDOL_PDF_FONT||'C:/Windows/Fonts/malgun.ttf'});
 const heading=calls.findIndex(c=>c.value==='공통 확인사항');
 assert.equal(calls[heading].page,2);
 assert.equal(calls[heading].page,calls[heading+3].page);
 for(const call of calls.filter(c=>c.value.startsWith('(해당 항목:')))assert.ok(call.end<=797.89);
});

test('wrapped common note lines keep the same hanging indent in the generated PDF',async()=>{
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const project=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 class NarrowPDF extends PDFDocument{constructor(options){super({...options,size:[340,841.89]});}}
 const data=await renderReportPdf(project,{PDFDocument:NarrowPDF,font:process.env.IDOL_PDF_FONT||'C:/Windows/Fonts/malgun.ttf'});
 const loadingTask=getDocument({data}),pdf=await loadingTask.promise;
 let checked=false;
 for(let i=1;i<=pdf.numPages;i++){
  const {items}=await (await pdf.getPage(i)).getTextContent();
  const start=items.findIndex(x=>x.str.replace(/\s/g,'').includes('공식원문에서실제'));
  if(start<0)continue;
  const end=items.findIndex((x,j)=>j>start&&x.str.replace(/\s/g,'').startsWith('(해당항목:'));
  assert.ok(end>start);
  const lines=items.slice(start,end).filter(x=>x.str.trim());
  assert.ok(lines.length>1);
  // PDF.js may merge the bullet and first text line into one item at x=42.
  for(const line of lines.slice(1))assert.ok(Math.abs(line.transform[4]-54)<0.01);
  checked=true;
 }
 assert.ok(checked);
 await loadingTask.destroy();
});

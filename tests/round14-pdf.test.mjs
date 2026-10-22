import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import PDFDocument from 'pdfkit';
import {renderReportPdf} from '../dist/pdf-report.mjs';
test('PDF title boxes leave five points before their verdict line',async()=>{
 const project=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 const gaps=[];let rect,waiting=false;
 class MeasuredPDF extends PDFDocument{
  rect(x,y,w,h){rect={x,y,w,h};return super.rect(x,y,w,h);}
  text(value,x,y,options){
   if(waiting){gaps.push(y-rect.y-rect.h);waiting=false;}
   if(/^\d+\. /.test(value)&&x===48)waiting=true;
   return super.text(value,x,y,options);
  }
 }
 await renderReportPdf(project,{PDFDocument:MeasuredPDF,font:process.env.IDOL_PDF_FONT||'C:/Windows/Fonts/malgun.ttf'});
 assert.ok(gaps.length>0);
 for(const gap of gaps)assert.ok(Math.abs(gap-5)<0.01,`gap: ${gap}`);
});

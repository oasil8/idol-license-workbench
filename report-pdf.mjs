import PDFDocument from 'pdfkit';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {renderReportPdf} from './dist/pdf-report.mjs';
export * from './dist/pdf-report.mjs';

// Server-side PDF: Windows Malgun Gothic by default, or a Korean TTF/OTF given in IDOL_PDF_FONT.
export async function createReportPdf(project,{includeOriginals=false}={}){
 const font=process.env.IDOL_PDF_FONT||join(process.env.WINDIR||'C:/Windows','Fonts','malgun.ttf');
 if(!existsSync(font))throw Error('한글 PDF 글꼴을 찾지 못했습니다. 서버의 IDOL_PDF_FONT에 한글 TTF/OTF 글꼴 경로를 설정하세요.');
 return Buffer.from(await renderReportPdf(project,{includeOriginals,PDFDocument,font}));
}

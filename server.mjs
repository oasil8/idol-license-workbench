import {createReportPdf} from './report-pdf.mjs';
import http from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {lookupTerms} from './terms.mjs';
import {searchSources} from './search.mjs';
import {verifyCandidate} from './verify-source.mjs';
const port=Number(process.env.PORT||4173);
const files={'/terms-analysis.mjs':['terms-analysis.mjs','text/javascript'],'/manual-terms.mjs':['manual-terms.mjs','text/javascript'],'/':['index.html','text/html'],'/app.mjs':['app.mjs','text/javascript'],'/core.mjs':['core.mjs','text/javascript'],'/ai.mjs':['ai.mjs','text/javascript'],'/projects.mjs':['projects.mjs','text/javascript'],'/style.css':['style.css','text/css']};
for(const name of ['verdict-log.mjs','license-normalization.mjs','result-layout.mjs','asset-normalization.mjs','contract-profiles.mjs','contract-review.mjs','contract-reviewed-hashes.mjs','auto-review.mjs','print-report.mjs','brand-icons.mjs','brand-icons-data.mjs','web-api.mjs','lookup.mjs','pdf-report.mjs','catalog-search.mjs','usage-terms.mjs','result-sections.mjs','source-search.mjs','source-policy.mjs','extract-worker.mjs','extract-file.mjs','document-text.mjs','backup.mjs','catalog.mjs','assignment.mjs','assignment-ui.mjs','pptx-text.mjs','import-files.mjs','official-sources.mjs','evidence-sources.mjs','report.mjs','workflow.mjs'])files['/'+name]=[name,'text/javascript'];
files['/vendor/jszip.min.js']=['../node_modules/jszip/dist/jszip.min.js','text/javascript'];
for(const [name,path] of Object.entries({'pdf.mjs':'pdfjs-dist/build/pdf.mjs','pdf.worker.mjs':'pdfjs-dist/build/pdf.worker.mjs','mammoth.browser.min.js':'mammoth/mammoth.browser.min.js'}))files['/vendor/'+name]=['../node_modules/'+path,'text/javascript'];
for(const name of await readdir(new URL('./node_modules/pdfjs-dist/cmaps/',import.meta.url)))if(name.endsWith('.bcmap'))files['/vendor/cmaps/'+name]=['../node_modules/pdfjs-dist/cmaps/'+name,'application/octet-stream'];
let active=0;
http.createServer(async(req,res)=>{
 const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
 if(!allowedHosts.has(req.headers.host)){res.writeHead(403);res.end('Local host only');return;}
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/report-pdf'){
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));};
  if(req.method!=='POST'){fail(405,'POST required');return;}
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){fail(403,'Same origin required');return;}
  if(req.headers['content-type']!=='application/json'){fail(415,'JSON required');return;}
  if(active>=3){fail(429,'다른 처리가 진행 중입니다. 잠시 후 다시 시도하세요.');return;}
  active++;
  try{
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024){fail(413,'PDF 요청이 너무 큽니다. 프로젝트를 나눠 출력하세요.');return;}chunks.push(chunk);}
   const input=JSON.parse(Buffer.concat(chunks).toString());
   if(input.includeOriginals!==undefined&&typeof input.includeOriginals!=='boolean')throw Error('부록 선택 값이 올바르지 않습니다.');
   const pdf=await createReportPdf(input.project,{includeOriginals:input.includeOriginals===true});
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="license-review.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(pdf);
  }catch(error){fail(400,error.message);}finally{active--;}
  return;
 }
 if(path==='/api/terms'||path==='/api/source-search'||path==='/api/source-verify'){
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.method!=='POST'){reply(405,{error:'POST required'});return;}
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){reply(403,{error:'Same origin required'});return;}
  if(req.headers['content-type']!=='application/json'){reply(415,{error:'JSON required'});return;}
  if(active>=3){reply(429,{error:'조회가 진행 중입니다. 잠시 후 다시 시도하세요.'});return;}
  active++;
  try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096){reply(413,{error:'Request too large'});return;}chunks.push(chunk);}const result=await (path==='/api/source-verify'?verifyCandidate:path==='/api/source-search'?searchSources:lookupTerms)(JSON.parse(Buffer.concat(chunks).toString()));reply(200,result);}
  catch(err){reply(400,{error:err.message});}finally{active--;}return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const file=files[new URL(req.url,'http://localhost').pathname];
 if(!file){res.writeHead(404);res.end('Not found');return;}
 try{
  const data=await readFile(new URL('./dist/'+file[0],import.meta.url));
  res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(500);res.end('Cannot read application file');}
}).listen(port,'127.0.0.1',()=>console.log(`License Workbench: http://127.0.0.1:${port}`));

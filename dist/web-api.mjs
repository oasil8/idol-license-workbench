// One entry point for the app's server calls. The local version posts to its own server; the link (GitHub Pages)
// version has no server, so it does the same work in the browser where the browser is allowed to.
import {verifyCandidate,huggingfaceTerms} from './lookup.mjs';

export const hosted=!/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
const blocked='링크 버전에서는 이 사이트를 브라우저가 직접 읽을 수 없습니다(사이트가 허용하지 않음). 원문을 열어 붙여넣거나 로컬 버전을 쓰세요.';

// Sites that allow cross-origin reads (Hugging Face, GitHub API, PyPI, Wikidata) work; others fail with the message above.
async function browserPage(target){
 let response;
 try{response=await fetch(target,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});}
 catch(error){throw Error(error?.name==='TimeoutError'?'응답 시간이 초과되었습니다.':blocked);}
 if(!response.ok)throw Error('HTTP '+response.status);
 const text=await response.text();
 if(text.length>2*1024*1024)throw Error('응답이 너무 큽니다.');
 return {text,url:response.url,contentType:response.headers.get('content-type')||''};
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

async function termsInBrowser(query){
 const base={...query,attemptedAt:new Date().toISOString(),checkedAt:null,status:'review',summary:'조회하지 못했습니다.',conditions:[],excerpts:[],sourceUrl:'',sourceName:'',documentDate:'명시일 자동 확인 불가',license:'',hash:'',error:''};
 if(query.provider==='huggingface'){
  try{return await huggingfaceTerms(query,{...base,sourceName:'Hugging Face'},browserPage);}
  catch(error){return {...base,error:error.message,summary:'모델 정보를 조회하지 못해 판단을 보류합니다.'};}
 }
 return {...base,error:blocked,summary:'링크 버전에서는 이 서비스의 약관을 자동으로 읽을 수 없어 판단을 보류합니다. 아래 ‘직접 약관 넣기’로 공식 원문을 붙여넣으세요.'};
}

async function pdfInBrowser({project,includeOriginals}){
 const [{renderReportPdf}]=await Promise.all([import('./pdf-report.mjs'),window.PDFDocument||import('./vendor/pdfkit.standalone.js')]);
 const font=await fetch('./fonts/NanumGothic-Regular.ttf').then(r=>{if(!r.ok)throw Error('PDF 글꼴을 불러오지 못했습니다.');return r.arrayBuffer();});
 const pdf=await renderReportPdf(project,{includeOriginals,PDFDocument:window.PDFDocument,font:new Uint8Array(font)});
 return new Response(new Blob([pdf],{type:'application/pdf'}),{headers:{'Content-Type':'application/pdf'}});
}

export async function apiFetch(path,init){
 if(!hosted)return fetch(path,init);
 const body=JSON.parse(init?.body||'{}');
 try{
  if(path==='/api/terms')return json(await termsInBrowser(body));
  if(path==='/api/source-verify')return json(await verifyCandidate(body,{fetchPage:browserPage}));
  if(path==='/api/report-pdf')return await pdfInBrowser(body);
  if(path==='/api/source-search')return json({error:'링크 버전에서는 웹 검색을 자동으로 할 수 없습니다. ‘웹 검색 열기’로 공식 페이지를 찾아 주소를 넣으세요.'},503);
 }catch(error){return json({error:error.message||'처리하지 못했습니다.'},500);}
 return json({error:'지원하지 않는 요청입니다.'},404);
}

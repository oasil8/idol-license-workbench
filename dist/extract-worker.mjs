import {assembleSections,checkDocxZip,extractOfficeXml,rtfText} from './document-text.mjs';
import {extractPptx} from './pptx-text.mjs';
self.onmessage=async({data:{buffer,extension,assignment=false}})=>{
 try{
  let result;
  if(extension==='pdf'){
   const pdfjs=await import('./vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
   const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,useWorkerFetch:true});
   task.onPassword=()=>{task.destroy();self.postMessage({error:'암호화된 PDF는 암호를 해제한 사본을 선택하세요.'});};
   const doc=await task.promise,sections=[];let size=0;
   try{if(doc.numPages>150)throw Error('PDF는 최대 150페이지까지 읽습니다. 문서를 나누어 검토하세요.');
    for(let page=1;page<=doc.numPages;page++){
     const content=await(await doc.getPage(page)).getTextContent();const text=content.items.map(x=>x.str===undefined?'':x.str+(x.hasEOL?'\n':' ')).join('');size+=text.length;
     if(size>200000)throw Error('추출한 텍스트가 200,000자를 초과합니다.');
     if(text.trim().length<5)throw Error(`${page}페이지에서 텍스트를 읽을 수 없습니다. 스캔·빈 페이지 여부를 확인하고 OCR 처리한 사본을 선택하세요.`);
     sections.push({label:`PDF ${page}페이지`,text});
    }
    result=assembleSections(sections,{minimum:assignment?1:40});
   }finally{await task.destroy();}
  }else if(extension==='pptx'){
   await import('./vendor/jszip.min.js');result=await extractPptx(buffer,self.JSZip);
  }else if(['xlsx','hwpx','odt','ods','odp'].includes(extension)){
   await import('./vendor/jszip.min.js');result=await extractOfficeXml(buffer,self.JSZip,extension,{minimum:assignment?1:40});
  }else if(extension==='rtf'){
   result=assembleSections([{label:'RTF 본문',text:rtfText(new TextDecoder('latin1').decode(buffer))}],{minimum:assignment?1:40});
  }else if(extension==='docx'){
   checkDocxZip(buffer);await import('./vendor/mammoth.browser.min.js');
   const doc=await self.mammoth.extractRawText({arrayBuffer:buffer});
   result=assembleSections(doc.value.split(/\n\s*\n/).filter(x=>x.trim()).map((text,i)=>({label:`Word 추출 문단 ${i+1}`,text})),{minimum:assignment?1:40});
   result.warnings=doc.messages.map(x=>x.message).slice(0,10);
  }else{
   const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);if(text.includes('\0'))throw Error('UTF-8 텍스트 파일을 선택하세요.');
   result=assembleSections([{label:'텍스트 원문',text}],{minimum:assignment?1:40});
  }
  self.postMessage({result});
 }catch(err){self.postMessage({error:err.message||'문서에서 텍스트를 추출할 수 없습니다.'});}
};

export async function extractFile(file,{assignment=false}={}){
 const extension=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx','pptx','txt','md'].includes(extension))throw Error('PDF·PPTX·DOCX·TXT·MD를 선택하세요. 구형 .doc·.ppt는 최신 형식으로 저장하세요.');
 if(file.size>(['txt','md'].includes(extension)?200000:(extension==='pptx'?30:10)*1024*1024))throw Error('PPTX는 최대 30MB, PDF·DOCX는 최대 10MB, TXT·MD는 최대 200KB입니다.');
 const buffer=await file.arrayBuffer();
 return new Promise((resolve,reject)=>{
  const worker=new Worker('/extract-worker.mjs',{type:'module'});
  const finish=(error,result)=>{clearTimeout(timer);worker.terminate();error?reject(Error(error)):resolve(result);};
  const timer=setTimeout(()=>finish('추출 시간이 30초를 초과했습니다. 문서를 나누거나 다른 사본을 선택하세요.'),30000);
  worker.onmessage=({data})=>{if(data.result||typeof data.error==='string')finish(data.error,data.result);};worker.onerror=()=>finish('문서 추출기에 오류가 발생했습니다. 파일 형식과 브라우저를 확인하세요.');
  worker.postMessage({buffer,extension,assignment},[buffer]);
 });
}

import {cleanCandidates} from './source-search.mjs';
// The latest query owns the screen, even if an older request finishes later.
export function createCatalogSearch({request,onChange,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let revision=0;
 return {
  clear(){revision++;onChange({status:'idle',candidates:[]});},
  async search(query){
   const current=++revision,name=query.trim();
   if(!name||name.length>200){onChange({status:'idle',candidates:[]});return;}
   onChange({status:'loading',name,candidates:[],message:'인터넷에서 홈페이지·약관 후보를 찾고 있습니다…'});
   try{
    let result=await request(name);
    if(current!==revision)return;
    if(Number.isFinite(result.retryAfterMs)&&result.retryAfterMs>0&&result.retryAfterMs<=10000){onChange({...result,name,candidates:[]});await wait(result.retryAfterMs+100);if(current!==revision)return;result=await request(name);}
    if(current!==revision)return;
    onChange({...result,name,...(result.retryAfterMs?{message:'검색이 혼잡합니다. 검색 버튼으로 다시 시도하거나 웹 검색을 여세요.'}:{}),candidates:cleanCandidates(result.candidates)});
   }catch{
    if(current===revision)onChange({status:'unavailable',name,candidates:[],message:'인터넷 검색에 연결하지 못했습니다. 검색어는 유지됩니다. 검색 버튼으로 다시 시도하거나 웹 검색을 여세요.'});
   }
  }
 };
}

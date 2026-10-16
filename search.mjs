import {officialSource} from './dist/official-sources.mjs';
import {officialSuggestions} from './dist/evidence-sources.mjs';
import {cleanCandidates,rankCandidates} from './dist/source-search.mjs';
const endpoint='https://html.duckduckgo.com/html/';
const decode=text=>text.replace(/&(?:amp|quot|apos|lt|gt|#39|#x[0-9a-f]+|#\d+);/gi,x=>{
 const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"};
 if(named[x.toLowerCase()])return named[x.toLowerCase()];
 const n=parseInt(x.slice(x[2].toLowerCase()==='x'?3:2,-1),x[2].toLowerCase()==='x'?16:10);
 return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
});
export function parseSearchHtml(html,name,searchedAt){
 if(/challenge-form|anomaly-modal|anomaly\.js/i.test(html))throw Error('검색 서비스가 자동 접근을 제한했습니다. 직접 검색을 이용하세요.');
 const rows=[];
 for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  const attrs=m[1],cls=attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
  if(!cls.split(/\s+/).includes('result__a'))continue;
  const href=attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];if(!href)continue;
  try{const u=new URL(decode(href),endpoint);const url=u.hostname==='duckduckgo.com'&&u.pathname==='/l/'?u.searchParams.get('uddg'):u.href;
   rows.push({url,title:decode(m[2].replace(/<[^>]*>/g,'')).trim(),query:name,searchedAt});
  }catch{}
 }
 if(!rows.length&&!/no-results|No results found/i.test(html))throw Error('검색 페이지 형식이 바뀌었거나 결과를 읽지 못했습니다. 직접 검색을 이용하세요.');
 return cleanCandidates(rows);
}
export function createSourceSearch({fetchImpl=fetch,now=Date.now,cooldownMs=10000}={}){
 const cache=new Map();let lastAttempt=-Infinity,inFlight=false;
 return async function searchSources(input){
  if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>200||/[\x00-\x1f]/.test(input.name))throw Error('검색할 이름을 1~200자로 입력하세요.');
  const name=input.name.normalize('NFKC').trim(),key=name.toLowerCase(),time=now(),cached=cache.get(key);
  if(cached&&time-cached.time<10*60000)return {...cached.result,cached:true};
  if(inFlight||time-lastAttempt<cooldownMs)return {status:'unavailable',candidates:[],retryAfterMs:Math.max(1000,cooldownMs-(time-lastAttempt)),message:'검색 간격을 조절하고 있습니다. 잠시 후 자동으로 다시 찾습니다.'};
  inFlight=true;lastAttempt=time;
  try{
   const url=new URL(endpoint);const alias=({nanobanana:'Nano Banana Gemini Google',나노바나나:'Nano Banana Gemini Google',챗지피티:'ChatGPT OpenAI'})[name.toLowerCase().replace(/\s+/g,'')];
   url.searchParams.set('q',(alias||name)+' official website terms license');
   async function lookup(query){
   url.searchParams.set('q',query);
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'text/html','User-Agent':'IDOL-License-Workbench/1.4 (source discovery)'}});
   if(!response.ok)throw Error('검색 서비스에 연결하지 못했습니다 (HTTP '+response.status+'). 직접 검색을 이용하세요.');
   if(!/text\/html/i.test(response.headers.get('content-type')||''))throw Error('검색 서비스에서 예상한 페이지를 받지 못했습니다.');
   let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>2000000)throw Error('검색 응답이 너무 큽니다. 직접 검색을 이용하세요.');chunks.push(chunk);}
   const searchedAt=new Date(now()).toISOString(),candidates=parseSearchHtml(Buffer.concat(chunks).toString('utf8'),name,searchedAt);
   return {searchedAt,candidates};
   }
   let {searchedAt,candidates}=await lookup(url.searchParams.get('q'));
   if(!candidates.length)({searchedAt,candidates}=await lookup((alias||name)+' official website'));
   candidates=rankCandidates(candidates,[officialSource({name}),...officialSuggestions({name})].filter(Boolean).map(x=>x.url)).slice(0,6);
   const result={status:candidates.length?'ok':'empty',candidates,searchedAt,message:candidates.length?'검색 후보를 찾았습니다. 공식 사이트 여부와 원문은 별도로 확인하세요.':'검색 결과가 없습니다. 정확한 서비스명·개발사명을 입력하거나 직접 검색하세요.'};
   if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{time:now(),result});return result;
  }catch(err){return {status:'unavailable',candidates:[],message:/검색/.test(err.message)?err.message:'자동 검색에 연결하지 못했습니다. 네트워크 상태를 확인하거나 직접 검색을 이용하세요.'};}
  finally{inFlight=false;}
 };
}
export const searchSources=createSourceSearch();

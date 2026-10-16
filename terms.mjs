import {analyzeTerms} from './dist/terms-analysis.mjs';
export {analyzeTerms} from './dist/terms-analysis.mjs';
import {createHash} from 'node:crypto';
export const providers={
 openai:{name:'OpenAI / ChatGPT (개인용)',url:'https://openai.com/policies/row-terms-of-use/'},
 anthropic:{name:'Anthropic / Claude (개인용)',url:'https://www.anthropic.com/legal/consumer-terms'},
 meshy:{name:'Meshy',url:'https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained'},
 tripo:{name:'Tripo',url:'https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially'},
 huggingface:{name:'Hugging Face 모델 저장소',url:'https://huggingface.co'}
};
const hosts=new Set(Object.values(providers).map(p=>new URL(p.url).hostname));hosts.add('anthropic.com');
export function validRequest(data){
 if(!data||!Object.hasOwn(providers,data.provider))throw Error('지원하는 서비스 또는 Hugging Face 저장소를 선택하세요.');
 if(!['free','paid','business','unknown'].includes(data.planType)||!['output','weights','service'].includes(data.scope))throw Error('플랜과 검토 대상을 선택하세요.');
 const repository=typeof data.repository==='string'?data.repository.trim():'';
 if(data.provider==='huggingface'&&!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(repository))throw Error('모델 ID는 owner/model 형식이어야 합니다.');
 return {provider:data.provider,planType:data.planType,scope:data.scope,repository:data.provider==='huggingface'?repository:''};
}
export function htmlText(html){
 return html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|quot|apos|lt|gt);/g,s=>({'&amp;':'&','&nbsp;':' ','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[s])).replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):' ').replace(/\s+/g,' ').trim();
}
export async function fetchOfficial(url,fetcher=fetch){
 const signal=AbortSignal.timeout(18000);let target=new URL(url);
 for(let hop=0;hop<4;hop++){
  if(target.protocol!=='https:'||!hosts.has(target.hostname)||target.username||target.password||target.port)throw Error('허용된 공식 HTTPS 주소가 아닙니다.');
  const response=await fetcher(target,{redirect:'manual',signal,headers:{Accept:'text/html,application/json,text/plain','User-Agent':'LicenseWorkbench/1.1 (public license review)'}});
  if(response.status>=300&&response.status<400){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('리디렉션 주소가 없습니다.');target=new URL(location,target);continue;}
  if(!response.ok){await response.body?.cancel();throw Error(`공식 사이트 응답 HTTP ${response.status}. 로그인·접근 제한은 우회하지 않습니다.`);}
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error('공식 문서가 2MB 제한을 초과했습니다.');}chunks.push(value);}
  return {text:Buffer.concat(chunks).toString('utf8'),url:target.href};
 }
 throw Error('공식 문서 리디렉션이 너무 많습니다.');
}
export async function lookupTerms(raw){
 const input=validRequest(raw),attemptedAt=new Date().toISOString(),provider=providers[input.provider];
 const base={...input,attemptedAt,checkedAt:null,status:'review',summary:'조회하지 못했습니다.',conditions:[],excerpts:[],sourceUrl:provider.url,sourceName:provider.name,documentDate:'명시일 자동 확인 불가',license:'',hash:'',error:''};
 try{
  if(input.provider==='huggingface'){
   base.sourceUrl=`https://huggingface.co/${input.repository}`;
   const page=await fetchOfficial(`https://huggingface.co/api/models/${input.repository}`),data=JSON.parse(page.text);
   const declared=data.cardData?.license||data.tags?.find(t=>t.startsWith('license:'))?.slice(8)||'';
   const aliases={mit:'MIT','apache-2.0':'Apache-2.0','bsd-3-clause':'BSD-3-Clause','bsd-2-clause':'BSD-2-Clause','cc0-1.0':'CC0-1.0','cc-by-4.0':'CC-BY-4.0','cc-by-nc-4.0':'CC-BY-NC-4.0'};
   const license=typeof declared==='string'?(aliases[declared]||declared):'';
   const permissive=['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','CC0-1.0','CC-BY-4.0'].includes(license);
   const status=input.scope!=='weights'?'review':/\bnc\b|non.?commercial/i.test(license)?'conflict':permissive?'conditions':'review';
   return {...base,checkedAt:new Date().toISOString(),license,status,summary:input.scope!=='weights'?'모델 카드의 가중치 라이선스를 출력물에 자동 적용할 수 없습니다.':status==='conditions'?'저장소가 선언한 모델 라이선스상 상용 사용 가능 (조건부).':status==='conflict'?'모델 카드에 비상업용 라이선스가 선언되어 있습니다.':'모델의 선언 라이선스가 미확인 또는 개별 검토 대상입니다.',conditions:['모델 카드의 선언은 게시자 주장입니다. 원저작자·LICENSE·추가 이용 제한을 직접 확인하세요.','다운로드한 모델 버전과 저장소 리비전이 같은지 확인하세요.'],excerpts:[`model card license: ${String(declared).slice(0,200)}`],documentDate:data.lastModified?`저장소 수정: ${data.lastModified}`:'저장소 수정일 미표시',revision:typeof data.sha==='string'?data.sha:'',hash:createHash('sha256').update(page.text).digest('hex')};
  }
  const page=await fetchOfficial(provider.url),text=htmlText(page.text),analysis=analyzeTerms(input,text);
  const date=text.match(/(?:Effective(?: date)?|Last (?:updated|modified)|Updated|Published)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d{2}|20\d{2}-\d{2}-\d{2})/i);
  return {...base,...analysis,checkedAt:new Date().toISOString(),sourceUrl:page.url,documentDate:date?date[0]:'문서 시행·수정일 자동 확인 불가',hash:createHash('sha256').update(text).digest('hex')};
 }catch(err){return {...base,error:err.message,summary:'최신 문서를 조회하지 못해 판단을 보류합니다. 마지막 시도와 원문 링크를 확인하세요.'};}
}

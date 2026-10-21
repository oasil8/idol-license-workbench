import {analyzeTerms} from './dist/terms-analysis.mjs';
export {analyzeTerms} from './dist/terms-analysis.mjs';
import {createHash} from 'node:crypto';
import {htmlText,huggingfaceTerms} from './dist/lookup.mjs';
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
export {htmlText} from './dist/lookup.mjs';
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
  if(input.provider==='huggingface')return await huggingfaceTerms(input,base,fetchOfficial);
  const page=await fetchOfficial(provider.url),text=htmlText(page.text),analysis=analyzeTerms(input,text);
  const date=text.match(/(?:Effective(?: date)?|Last (?:updated|modified)|Updated|Published)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d{2}|20\d{2}-\d{2}-\d{2})/i);
  return {...base,...analysis,checkedAt:new Date().toISOString(),sourceUrl:page.url,documentDate:date?date[0]:'문서 시행·수정일 자동 확인 불가',hash:createHash('sha256').update(text).digest('hex')};
 }catch(err){return {...base,error:err.message,summary:'최신 문서를 조회하지 못해 판단을 보류합니다. 마지막 시도와 원문 링크를 확인하세요.'};}
}

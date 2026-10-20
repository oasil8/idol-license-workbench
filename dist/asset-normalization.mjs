import {officialNameMatches} from './official-sources.mjs';
// Calculation/form view only: never mutate stored or imported records.
export function normalizeAsset(a,{resolveProvider=true}={}){
 if(a.kind==='ai'){
  if(!resolveProvider||a.provider&&a.provider!=='other')return a;
  const matches=officialNameMatches(a.serviceName||a.name);
  return matches.length===1?{...a,provider:matches[0].id}:a;
 }
 const result={...a};
 for(const key of ['serviceName','provider','scope','planType','outputType','repository','contractRoute','apiAccessConfirmed'])delete result[key];
 return result;
}
export function assetScope(input){
 const a=normalizeAsset(input);
 return ({code:'코드·오픈소스 자체',model:'모델·가중치',service:'서비스·API 계약',bundle:'패키지·번들 전체'}[a.reviewScope])||({output:'AI 생성 결과물',weights:'모델 가중치',service:'API·서비스 계약',training:'학습·미세조정',other:'기타 이용'}[a.scope])||({code:'코드·라이브러리',model:'모델·가중치',tool:'제작 도구',image:'이미지·텍스처',audio:'음원·음성',data:'데이터셋'}[a.kind])||'등록한 자료 범위';
}

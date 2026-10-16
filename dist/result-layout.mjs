import {statuses} from './core.mjs';

const thirdParty='입력 자료·브랜드·디자인·상표·초상·음성·개인정보 등 제3자 권리는 실제 자료를 기준으로 별도 확인하세요. 라이선스·약관상 허용만으로 확보되는 권리가 아닙니다.';

// Common notes keep the bucket they came from: an obligation never becomes a check.
export function resultBodyLayout(items){
 const uses=new Map();
 for(const item of items)for(const [bucket,texts] of [['condition',item.conditions],['check',item.checks]])for(const text of texts){
  const merge=text.includes('제3자 권리')&&text.includes('확인'),kind=merge?'check':bucket,key=merge?thirdParty:text,id=kind+'\n'+key;
  if(!uses.has(id))uses.set(id,{kind,text:key,names:[],sourceTexts:[]});
  const note=uses.get(id);
  if(!note.names.includes(item.name))note.names.push(item.name);
  if(!note.sourceTexts.includes(text))note.sourceTexts.push(text);
 }
 const common=[...uses.values()].filter(({text,names})=>names.length>1||/제3자 권리|과거 생성물|Steam 공개|금지 콘텐츠|직접 입력.*출처/.test(text));
 const sharedIn=kind=>new Set(common.filter(n=>n.kind===kind).flatMap(n=>n.sourceTexts)),order=[statuses.conflict,statuses.review,statuses.conditions];
 const sharedConditions=sharedIn('condition'),sharedChecks=sharedIn('check');
 const isShared=(set,t)=>set.has(t)||(t.includes('제3자 권리')&&t.includes('확인')&&sharedChecks.has(t));
 return {common,items:items.map(item=>({...item,conditions:item.conditions.filter(t=>!isShared(sharedConditions,t)),checks:item.checks.filter(t=>!isShared(sharedChecks,t))})).sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status))};
}

export const commonGroups=[['condition','공통으로 지켜야 할 조건'],['check','공통 확인사항']];

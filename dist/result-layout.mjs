import {statuses} from './core.mjs';

const thirdParty='브랜드·상표·초상·음성·개인정보 등 제3자 권리는 라이선스와 별도로 확인하세요.';
// Notes that apply to nearly every item; the result screen folds them so the specific ones stand out.
export const minorNote=/금지 콘텐츠·서비스 이용 정책|과거 생성물·별도 계약|호스팅 서비스·유료 배포판/;
export const noteNames=names=>names.length>3?names.slice(0,2).join(', ')+` 외 ${names.length-2}개`:names.join(', ');
// Display-only equivalents: keep the original sentences on each material's record.
const checkGroups=[
 ['공식 원문에서 실제 자료·버전·기능의 적용 여부와 제작물의 상업 이용 허용을 확인하고, 라이선스·구매 증빙·근거와 확인 여부를 기록하세요.',[
  '라이선스가 이 자료에 적용되는지와 근거가 아직 확인되지 않았습니다. 원문을 보고 확인 체크와 근거를 기록하세요.',
  '원문·구매 증빙·적용 버전을 확인하고 확인 여부를 기록하세요.',
  '실제 사용한 버전·기능에 공식 원문이 적용되는지 확인하세요.',
  '도구의 라이선스·구독 플랜에서 제작물을 상업적으로 이용할 수 있는지 확인하고 라이선스를 입력하세요.'
 ]],
 ['사용·생성 당시 서비스와 요금제·구매 유형을 입력하고, 공식 사이트의 최신 약관 원문과 적용 플랜을 확인·기록하세요.',[
  '공식 사이트에서 최신 약관을 열어 원문과 적용 플랜을 기록하세요.',
  '서비스·플랜을 지정하고 최신 약관 조회를 실행하세요.',
  '사용하거나 생성할 당시의 요금제·구매 유형을 확인해 입력하세요.'
 ]]
];

// Common notes keep the bucket they came from: an obligation never becomes a check.
export function resultBodyLayout(items){
 const uses=new Map();
 for(const item of items)for(const [bucket,texts] of [['condition',item.conditions],['check',item.checks]])for(const text of texts){
  const merge=text.includes('제3자 권리')&&text.includes('확인'),kind=merge?'check':bucket;
  const key=merge?thirdParty:bucket==='check'?(checkGroups.find(([,texts])=>texts.includes(text))?.[0]||text):text,id=kind+'\n'+key;
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

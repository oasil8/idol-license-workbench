import {statuses} from './core.mjs';

export function resultBodyLayout(items){
 const uses=new Map();
 for(const item of items)for(const text of [...item.conditions,...item.checks]){
  const key=text.includes('제3자 권리')?'입력 자료·브랜드·디자인·상표·초상·음성·개인정보 등 제3자 권리는 실제 자료를 기준으로 별도 확인하세요. 라이선스·약관상 허용만으로 확보되는 권리가 아닙니다.':text;
  if(!uses.has(key))uses.set(key,{text:key,names:[],sourceTexts:[]});
  const note=uses.get(key);
  if(!note.names.includes(item.name))note.names.push(item.name);
  if(!note.sourceTexts.includes(text))note.sourceTexts.push(text);
 }
 const common=[...uses.values()].filter(({text,names})=>names.length>1||/제3자 권리|과거 생성물|Steam 공개|금지 콘텐츠|직접 입력.*출처/.test(text));
 const shared=new Set(common.flatMap(n=>n.sourceTexts)),order=[statuses.conflict,statuses.review,statuses.conditions];
 return {common,items:items.map(item=>({...item,conditions:item.conditions.filter(t=>!shared.has(t)),checks:item.checks.filter(t=>!shared.has(t))})).sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status))};
}

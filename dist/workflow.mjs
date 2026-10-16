export const conditionsConfirmed=p=>p.contextConfirmed===true;
export const conditionsPrompt='사용 조건을 먼저 정하세요';
import {evaluate} from './core.mjs';
export const selectionLabels={pending:'선택 전',used:'실제 사용',alternative:'대안 보관',excluded:'사용 안 함'};
export function selectionOf(a){
 if(Object.hasOwn(selectionLabels,a.selection))return a.selection;
 return String(a.notes||'').startsWith('과제 자료에서 언급된 검토 후보입니다.')?'pending':'used';
}
export const selectedAssets=p=>p.assets.filter(a=>selectionOf(a)==='used');
export function projectSummary(p){
 const assets=selectedAssets(p),pending=p.assets.filter(a=>selectionOf(a)==='pending').length;
 const counts={conditions:0,review:0,conflict:0};
 for(const a of assets)counts[evaluate(a,p.context).status]++;
 return {assets,pending,counts,status:counts.conflict?'conflict':!assets.length||pending||counts.review?'review':'conditions'};
}
// Mutate an isolated snapshot; keep the old state if persistence is refused.
export function commitChange(state,change,persist){
 const before=structuredClone(state);
 try{change(state);if(!persist(state))throw Error('저장 공간에 기록하지 못했습니다. 기존 데이터는 유지했습니다.');return true;}
 catch(error){for(const k of Object.keys(state))delete state[k];Object.assign(state,before);throw error;}
}

export function summaryReason(summary){
 const {counts,pending,assets}=summary;
 return counts.conflict?`${counts.conflict}개 사용 자료가 현재 사용 조건과 충돌합니다.`:pending?`${pending}개 자료의 실제 사용 여부를 먼저 선택하세요.`:!assets.length?'실제 사용할 자료가 선택되지 않았습니다.':counts.review?`${counts.review}개 사용 자료의 근거·필수 조건을 보완하세요.`:'선택한 자료의 허용 근거가 확인되었습니다. 표시된 사용 조건을 이행하세요.';
}

export function contextConfirmationNotice(project,context=project.context){
 if(conditionsConfirmed(project))return '';
 const message='이 프로젝트의 사용 조건이 아직 확인되지 않았습니다. 상업 목적·외부 배포 여부를 실제 사용 방식에 맞게 확인한 뒤 적용하세요.';
 return message+(['commercial','distribute','modified','network'].every(key=>!context?.[key])?' 현재 비상업·비배포 기준입니다.':'');
}

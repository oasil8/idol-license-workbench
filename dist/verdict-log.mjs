const fields={kind:['종류',30],license:['라이선스',500],version:['버전',500],confirmed:['원문 확인',0],provider:['제공자',50],serviceName:['서비스 이름',200],scope:['이용 범위',30],planType:['플랜',30],reviewScope:['검토 범위',30],contractRoute:['계약 경로',30],outputType:['결과물 종류',30]};
const statuses={conditions:'사용 가능 (조건부)',review:'판단 보류',conflict:'사용 불가'};
const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
export const contextKey=context=>[context.platform,...['commercial','distribute','modified','network'].map(k=>Boolean(context[k]))].join('|');
export const inputSnapshot=asset=>Object.fromEntries(Object.entries(fields).map(([key,[,max]])=>[key,key==='confirmed'?asset[key]===true:String(asset[key]??'').slice(0,max)]));
export const verdictState=status=>status==='review'?'잠정':'확정';
const display=(key,value)=>key==='confirmed'?(value?'예':'아니요'):key==='planType'?({paid:'유료',free:'무료',unknown:'미확인'}[value]||value||'미확인'):value||'미확인';

export function recordVerdict(log,{status,reason,inputs,ruleDate},context,today){
 const index=log.findLastIndex(x=>x.context===context&&!x.retractedOn),previous=log[index];
 reason=String(reason??'').slice(0,600);
 if(previous?.status===status){
  if(previous.reason===reason)return log;
  return log.map((x,i)=>i===index?{...x,reason}:x);
 }
 const next=log.slice();
 if(previous){
  const changes=Object.entries(fields).filter(([key])=>previous.inputs[key]!==inputs[key]).map(([key,[label]])=>`${label}: ${display(key,previous.inputs[key])} → ${display(key,inputs[key])}`);
  const why=changes.length?changes.join(' · '):previous.ruleDate!==ruleDate?`판정 규칙 갱신 (기준일 ${previous.ruleDate} → ${ruleDate})`:'공식 기록의 확인 기간 경과 또는 근거 변경';
  next[index]={...previous,retractedOn:today,retractedWhy:why.slice(0,300)};
 }
 return [...next,{context,status,reason,inputs:{...inputs},ruleDate,on:today}].slice(-30);
}

export function cleanVerdictLog(log){
 if(!Array.isArray(log))return [];
 const string=(v,max)=>typeof v==='string'&&v.length<=max;
 return log.filter(x=>x&&typeof x==='object'&&string(x.context,100)&&/^(general|steam|enterprise|conference|research)(\|(true|false)){4}$/.test(x.context)&&typeof x.status==='string'&&Object.hasOwn(statuses,x.status)&&string(x.reason,600)&&isDate(x.ruleDate)&&isDate(x.on)&&x.inputs&&typeof x.inputs==='object'&&!Array.isArray(x.inputs)&&Object.entries(fields).every(([key,[,max]])=>key==='confirmed'?typeof x.inputs[key]==='boolean':string(x.inputs[key],max))&&(x.retractedOn===undefined?x.retractedWhy===undefined:isDate(x.retractedOn)&&string(x.retractedWhy,300))).slice(-30).map(x=>({context:x.context,status:x.status,reason:x.reason,inputs:inputSnapshot(x.inputs),ruleDate:x.ruleDate,on:x.on,...(x.retractedOn?{retractedOn:x.retractedOn,retractedWhy:x.retractedWhy}:{})}));
}

export function verdictHistoryMarkup(log,context,esc){
 const items=(log||[]).filter(x=>x.context===context),count=items.filter(x=>x.retractedOn).length;
 if(!count)return '';
 return `<details class="verdict-history"><summary>판정 기록 · 이전 결론 철회 ${count}건</summary><ol>${items.slice().reverse().map(x=>`<li><span class="verdict-state ${x.retractedOn?'retracted':x.status==='review'?'provisional':'settled'}">${x.retractedOn?'철회':verdictState(x.status)}</span> <time>${esc(x.on)}</time><p>${esc(statuses[x.status])} · ${esc(x.reason)}</p>${x.retractedOn?`<p>철회일: ${esc(x.retractedOn)} · 철회 사유: ${esc(x.retractedWhy)}</p>`:''}</li>`).join('')}</ol></details>`;
}

export function verdictHistorySummary(log,context){
 const items=(log||[]).filter(x=>x.context===context),active=items.findLast(x=>!x.retractedOn);
 if(!active)return '';
 const count=items.filter(x=>x.retractedOn).length;
 return `판정 기록: ${verdictState(active.status)} (${active.on})${count?` · 이전 결론 철회 ${count}건`:''}`;
}

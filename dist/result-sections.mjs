import {resultBodyLayout,commonGroups} from './result-layout.mjs';
import {evaluate,statuses} from './core.mjs';
import {projectSummary,selectionOf} from './workflow.mjs';
import {reviewAge} from './official-sources.mjs';
import {candidateNotice} from './evidence-sources.mjs';
import {normalizeAsset,assetScope} from './asset-normalization.mjs';
import {planImpact} from './ai.mjs';
export const conflictNextAction='현재 사용 조건에서는 이 자료를 쓰지 마세요. 플랜·계약이나 사용 목적이 바뀌면 정보를 수정해 다시 판정하세요.';


export const reportDisclaimer='검토 기록이며 출시 승인·법률 의견이 아닙니다.';
export function projectConclusion(p){
 const summary=projectSummary(p),c=p.context;
 const platform={general:'일반 이용',research:'연구',conference:'학회·논문',enterprise:'기업·납품',steam:'Steam 출시'}[c.platform]||'일반 이용';
 const purpose=c.commercial?(c.platform==='steam'?'Steam 상업 출시':platform+' (상업)'):platform;
 const actions=['conflict','review'].flatMap(status=>resultLayout(summary.assets,c).items.flatMap(({a,r,checks})=>{
  if(r.status!==status)return [];
  return [{name:a.name,action:status==='conflict'?conflictNextAction:checks[0]||resultItems(r,outcomeReason(a,r)).checks[0]||reviewReason(r)}];
 })).concat(p.assets.filter(a=>selectionOf(a)==='pending').map(a=>({name:a.name,action:'실제 사용 여부를 선택하세요.'})));
 return {title:purpose+': '+({conflict:'아직 불가',review:'판단 보류',conditions:'가능 (조건 이행 필요)'}[summary.status]),
  actionsTitle:'이 목적으로 쓰려면 해결할 일',actions,
  conditionsText:summary.counts.conditions?`나머지 ${summary.counts.conditions}개는 표시된 조건을 지키면 사용할 수 있습니다.`:'',
  countsText:`현재 조건으로 사용 불가 ${summary.counts.conflict}개 · 판단 보류 ${summary.counts.review}개 · 사용 가능 (조건부) ${summary.counts.conditions}개 · 선택 전 ${summary.pending}개`,
  contextText:`${platform} · 상업 ${c.commercial?'예':'아니요'} · 배포 ${c.distribute?'예':'아니요'} · 수정 ${c.modified?'예':'아니요'} · 네트워크 ${c.network?'예':'아니요'}`,
  emptyText:!summary.assets.length&&!summary.pending?'실제 사용할 자료가 선택되지 않았습니다.':'',disclaimer:reportDisclaimer};
}
export function conclusionMarkup(p,esc){
 const c=projectConclusion(p);
 return `<div class="project-conclusion"><h2>${esc(c.title)}</h2><small>${esc(c.contextText)}</small>${c.actions.length?`<h3>${c.actionsTitle}</h3><ul class="resolution-actions">${c.actions.map(a=>`<li>${esc(a.name)} — ${esc(a.action)}</li>`).join('')}</ul>`:''}${c.conditionsText?`<p>${esc(c.conditionsText)}</p>`:''}${c.emptyText?`<p>${esc(c.emptyText)}</p>`:''}<p class="verdict-counts">${esc(c.countsText)}</p><small>${c.disclaimer}</small></div>`;
}

export function resultLayout(assets,context){
 return resultBodyLayout(assets.map(a=>{
  const r=evaluate(a,context),parts=resultItems(r,outcomeReason(a,r));
  return {a,r,name:a.name,status:statuses[r.status],allTasks:[...parts.conditions,...parts.checks],...parts};
 }));
}

function taskButton(text,a,esc){
 const action=inputForTask(text,a);
 return action&&a.id?` <button type="button" class="text-button" data-edit="${esc(a.id)}" data-field="${action.field}">${action.label}</button>`:'';
}
export function commonChecksMarkup(layout,esc,{buttons=true}={}){
 return commonGroups.map(([kind,title])=>{
  const notes=layout.common.filter(note=>note.kind===kind);
  return notes.length?`<section class="report-item common-checks"><h3>${title}</h3><ul>${notes.map(note=>{
   const shortcuts=buttons?layout.items.filter(item=>note.sourceTexts.some(text=>item.allTasks.includes(text))).map(item=>{
    const button=taskButton(note.text,item.a,esc);
    return button?` <span>${esc(item.name)}:${button}</span>`:'';
   }).join(''):'';
   return `<li>${esc(note.text)} (해당 항목: ${esc(note.names.join(', '))})${shortcuts}</li>`;
  }).join('')}</ul></section>`:'';
 }).join('');
}

export function permissionMarkup(a,r,esc){
 let permission=r.status==='conditions'?(r.permissions||[]).join(' '):'';
 if(!permission&&r.status==='conditions')permission=a.kind==='ai'?'확보한 약관에서 선택한 이용 범위의 허용 조항을 확인했습니다.':`${a.license}의 이용 허가와 이 자료에 대한 적용 확인 기록에 근거합니다.`;
 const url=a.kind==='ai'?(a.terms?.sourceUrl||r.sources?.[0]?.[1]):r.sources?.[0]?.[1];
 const legal=r.status==='conflict'?`<details class="legal-reference"><summary>법적 참고 · 위반 확정 아님</summary><p>현재 선택한 조건과 허가 범위가 충돌한다는 뜻입니다. 별도 허가를 받거나 실제 이용 조건을 바꾸면 다시 검토할 수 있습니다. 처벌·벌금·손해배상은 관할과 구체적 사실에 따라 달라지므로 자동 산정하지 않습니다.</p><p><a href="https://www.cafc.uscourts.gov/opinions-orders/08-1001.pdf" target="_blank" rel="noopener noreferrer">미국 Jacobsen v. Katzer (2008) · 법원 원문 ↗</a>: Artistic License의 고지 등 조건이 저작권 허락 범위를 제한할 수 있다고 보고 환송한 사례입니다. 현재 자료와 동일한 사건이 아니며, 이 판결은 벌금이나 배상액을 확정한 판결이 아닙니다.</p></details>`:'';
 let link='';try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password)link=` <a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${a.kind==='ai'?'약관 원문':'라이선스 규칙 원문'} ↗</a>`;}catch{}
 return `<section class="permission-section"><h3>${r.status==='conflict'?'이유·제한 근거':'이유·허용 근거'}</h3><p>${esc(outcomeReason(a,r))}</p><p>${esc(permission||(r.status==='conflict'?'현재 선택한 이용 방식은 확인한 허가 범위를 벗어납니다.':'현재 이용 조건의 허용 여부를 결정할 필수 근거가 아직 확인되지 않았습니다.'))}${link}</p>${r.status==='conflict'?`<p class="conflict-next-action">${esc(conflictNextAction)}</p>`:''}${legal}</section>`;
}

export function reviewReason(r){
 if(r.status!=='review')return '';
 const reasons=(r.blockers?.length?r.blockers:r.notes||[]).filter(t=>!t.includes('실시간 조회한 기록은 아닙니다')).map(t=>
 t.includes(' — 자동 판정 미지원. ')?t.split(' — 자동 판정 미지원. ')[0]+' — 자동 판정 미지원':
 t.includes('출력물의 상업 이용을 명시적으로 허용하는 문구를 인식하지 못')?'원문 확보됨 · 자동 해석 지원 범위 밖, 허용·예외 조항 검토 필요':
 t.includes('허용 문구는 있지만 적용 플랜·예외')?'허용 근거 확보됨 · 플랜·예외 조항 해석 필요':
 t.includes('Copilot 계약 경로를')?'Copilot 계약 경로 선택 필요':
 t.includes('Microsoft 구매 경로')?'Microsoft 구매 약관·허용 범위 확인 필요':
 t.includes('모델 ID는 owner/model')?'사용할 모델의 owner/model 주소 필요':
 t.includes('실제 MinerU 배포 버전')?'MinerU 배포 버전 필요 · 현재/과거 라이선스가 다름':
 t.includes('합산 MAU')?'조직 규모 기준·별도 상업 허가 적용 여부 필요':
 t.includes('요금제·구매 유형을 확인해')?'생성 당시 플랜·구매 유형 필요':
 t.includes('버전이 미정')?'실제 배포판·모델 버전 필요':
 t.includes('개인용과 기업/API')?'개인용 / 기업·API 중 적용 계약 필요':
 t.includes('조회 실패:')?'공식 원문 확보 실패 · 재조회 또는 직접 원문 필요':
 t.includes('공식 사이트에서 최신 약관을 열어')?'해당 이용 방식의 공식 허용 근거 필요':
 t.includes('적용 라이선스의 사용 허가')?'적용 라이선스가 기록되지 않았습니다.':
 t.includes('라이선스 적용 범위와 근거')?'이 자료에 대한 라이선스 적용 미확인':
 t.includes('도구 자체를 함께 배포')?'도구 자체의 배포·번들 여부 미확인':
 t.includes('소스 제공·재링크')?'결합·배포 범위와 소스 제공 방법 미확인':
 t.includes('지원하지 않는 라이선스')?'지원하지 않는 라이선스·개별 계약':t);
 const specific=reasons.filter(t=>!t.includes('제3자 권리가 미확인')&&!t.includes('실제 사용한 버전·기능에 공식 원문'));
 const concise=specific.includes('적용 라이선스가 기록되지 않았습니다.')?specific.filter(t=>t!=='이 자료에 대한 라이선스 적용 미확인'):specific;
 return [...new Set(concise.length?concise:reasons)].slice(0,2).join(' · ')||'필수 근거 확인 필요';
}

// The verdict badge sits beside the reason everywhere, so the reason carries no verdict prefix.
export function outcomeReason(a,r){
 if(r.status==='review')return reviewReason(r);
 if(r.status==='conflict')return (r.conflicts?.join(' ')||'현재 이용 조건이 확인한 허가 범위와 충돌합니다.');
 const specific=(r.notes||[]).find(note=>/허용|가능|금지되지|^외부 배포·네트워크 제공이 없어 현재는 소스 제공 의무가 발생하지/.test(note)&&!note.startsWith('공식 원문'));
 return specific||(a.kind==='ai'?'해당 약관에서 선택한 이용 범위의 허용을 확인했습니다.':`${a.license==='LicenseRef-OpenSees'?'OpenSees 라이선스':a.license||'확인한 라이선스'}에 따라 현재 이용이 허용됩니다.`);
}

export function summaryReasonText(reason,limit=56){
 const core=reason.trim();
 if(core.length<=limit)return core;
 const prefix=core.slice(0,limit-1),sentence=prefix.match(/^.*[.!?](?=\s)/)?.[0];
 const cut=sentence||prefix.replace(/\s+\S*$/,'');
 return cut.replace(/[.!?…\s]+$/,'')+'…';
}

export function resultItems(r,reason=''){
 const seen=new Set(),unique=items=>items.filter(t=>{const key=String(t).replace(/\s+/g,' ').trim();if(!key||seen.has(key)||reason.includes(key))return false;seen.add(key);return true;});
 const conditions=[],actions=[];
 for(const task of (r.tasks||[]).filter(t=>!r.conflicts?.includes(t))){
  // Older saved terms may combine a prohibition and a check; keep the prohibition intact.
  (!task.includes('하지 말고,')&&/(?:확인하세요|검토(?:하세요)?|확인(?:해야 합니다|이 필요합니다)?)[.!?]?$/.test(task)?actions:conditions).push(task);
 }
 return {conditions:unique(conditions),checks:unique([...actions,...(r.status==='review'?r.blockers||[]:[]),...(r.humanChecks||[])])};
}

// Retained for report callers: source dates are rendered beside their own links.
export function reviewStampMarkup(){return '';}

export function displaySources(r,rows,now=Date.now()){
 return rows.map(s=>{
  const rule=s.type==='rule',date=(s.date||(rule?r.ruleDate:''))?.slice(0,10)||'';
  const dateLabel=rule?'판정 규칙 기준일':s.type==='suggested'?'주소 확인일':s.type==='candidate'?'검색일':'기록일';
  return {...s,date,dateLabel,warning:rule?'':reviewAge(date,now),recordLabel:r.evidenceMethod==='public-review'&&s.url===r.reviewedEvidence?.sourceUrl?'내장 검토 기록 · 실시간 조회 아님':''};
 });
}

export function compactResultMarkup(a,r,rows,esc,parts){
 a=normalizeAsset(a,{resolveProvider:false});
 const reason=outcomeReason(a,r),{conditions,checks}=parts||resultItems(r,reason),todo=[...conditions,...checks];
 const excerpts=[...new Set([...(r.reviewedEvidence?.excerpts||a.terms?.excerpts||[]),...rows.flatMap(s=>(s.verification?.excerpts||[]).map(e=>e.text))])].filter(t=>!reason.includes(t)&&!todo.includes(t));
 return `<p class="review-scope">검토 범위: ${esc(assetScope(a))}</p><p class="review-reason">${esc(reason)}</p>${r.status==='conflict'?`<p class="conflict-next-action">${esc(conflictNextAction)}</p>`:''}${reviewStampMarkup(r,esc)}${todo.length?`<h4>해야 할 일</h4><ul>${todo.map(t=>`<li>${esc(t)}${taskButton(t,a,esc)}</li>`).join('')}</ul>`:''}<section class="report-citations"><h4>근거 링크</h4>${candidateNotice(a)?`<p>${esc(candidateNotice(a))}</p>`:''}${displaySources(r,rows).map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>${s.recordLabel?` · ${esc(s.recordLabel)}`:''}${s.date?` · ${esc(s.dateLabel)}: ${esc(s.date)}`:''}${s.warning?` · ${esc(s.warning)}`:''}</p>`).join('')||'<p>확인한 근거 없음</p>'}</section>${excerpts.length?`<details class="material-evidence"><summary>원문 발췌</summary>${excerpts.map(t=>`<blockquote>${esc(t)}</blockquote>`).join('')}</details>`:''}`;
}

export function inputForTask(text,a){
 if(/API.*접근 권한/.test(text)&&a.scope==='service')return {field:'apiAccessConfirmed',label:'API 권한 확인하기'};
 if(/계약 경로/.test(text)&&/copilot/i.test(a.serviceName||a.name))return {field:'contractRoute',label:'계약 경로 선택하기'};
 if(/플랜|요금제|Pro\/Mega/.test(text)&&a.kind==='ai'&&planImpact(a).status==='affected')return {field:'planType',label:'플랜 입력하기'};
 if(/owner\/model|모델 ID/.test(text)&&a.provider==='huggingface')return {field:'repository',label:'모델 주소 입력하기'};
 if(/버전|배포판/.test(text))return {field:'version',label:'버전 입력하기'};
 if(/라이선스 미기록|적용 라이선스가 기록되지|적용 라이선스의 사용 허가/.test(text))return {field:'license',label:'라이선스 입력하기'};
}

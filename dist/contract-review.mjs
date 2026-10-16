import {contractProfiles} from './contract-profiles.mjs';
import {reviewedHashes} from './contract-reviewed-hashes.mjs';
export const matches=(when={},facts={})=>Object.entries(when).every(([key,values])=>values.includes(facts[key]??''));
export function contractProfile(a){if(a.kind&&a.kind!=='ai')return;const name=String(a.serviceName||a.name||'').normalize('NFKC').trim().toLowerCase();return contractProfiles.find(p=>p.names.includes(name));}
export function cleanContractChoices(value){return Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([k,v])=>/^[a-zA-Z]{1,30}$/.test(k)&&typeof v==='string'&&v.length<=50).slice(0,20));}
export function contractFacts(a,c={}){const facts={...cleanContractChoices(a.contractChoices),scope:a.scope||'',planType:a.planType||'unknown',apiAccessConfirmed:a.apiAccessConfirmed===true,commercial:c.commercial!==false,distribute:c.distribute===true};for(const q of contractProfile(a)?.questions||[])if(!matches(q.when,facts))delete facts[q.key];return facts;}
export function contractQuestions(a,c={}){const p=contractProfile(a);return p?p.questions.filter(q=>matches(q.when,contractFacts(a,c))):[];}
export function bundleDocuments(a){const p=contractProfile(a);if(!p)return [];const candidates=(a.sourceCandidates||[]).filter(s=>s.query===(a.serviceName||a.name));return candidates.flatMap(s=>s.verification?.documents||[]).filter(d=>p.documents.some(x=>x.url===d.url));}
export function contractBundleNeeded(a,now=Date.now()){const p=contractProfile(a);if(!p||a.terms?.method==='manual'||a.selection==='pending')return false;const docs=bundleDocuments(a);return !p.documents.every(x=>docs.some(d=>d.url===x.url&&!d.imported&&Date.parse(d.checkedAt)<=now+60000&&Number.isFinite(Date.parse(d.checkedAt))&&now-Date.parse(d.checkedAt)<7*86400000));}
export function evaluateContractBundle(a,c={},now=Date.now()){
 const p=contractProfile(a);if(!p||a.terms?.method==='manual')return;
 // Existing services retain their old path until a multi-document review is captured.
 const documents=bundleDocuments(a);if(!documents.length)return;
 const facts=contractFacts(a,c),required=p.documents.filter(d=>matches(d.when,facts)),missing=[];
 const accepted=[];
 for(const def of required){const doc=documents.filter(d=>d.url===def.url).sort((x,y)=>String(y.checkedAt).localeCompare(x.checkedAt))[0];const time=Date.parse(doc?.checkedAt);
  if(!doc?.text||doc.imported||doc.truncated||doc.status!=='matched'||!Number.isFinite(time)||now-time>7*86400000||time>now+60000||!reviewedHashes[def.url]||doc.contractHash!==reviewedHashes[def.url])missing.push(def.label+' 원문 재확인 필요');else accepted.push({...doc,label:def.label,id:def.id,excerpts:(def.anchors||[]).filter(anchor=>typeof anchor==='string'||matches(anchor.when,facts)).map(anchor=>{const phrase=typeof anchor==='string'?anchor:anchor.text;const start=doc.text.indexOf(phrase);return start<0?null:{start,text:doc.text.slice(start,start+240)};}).filter(Boolean)});
 }
 const result={status:'review',notes:[],blockers:[],tasks:[],humanChecks:[],sources:accepted.map(d=>[d.label,d.url]),contractConfirmed:false,scopeUnresolved:true,evidenceMethod:'automatic',contractDocuments:accepted};
 if(missing.length){result.notes=result.blockers=missing;result.tasks=['추가 약관 자동 조회를 다시 실행하세요. 변경된 원문은 검토 전 자동 허용하지 않습니다.'];return result;}
 if(facts.contract==='custom'){result.notes=result.blockers=['별도로 체결한 계약 원문 필요'];return result;}
 if(a.version||(a.date&&a.date<p.checkedOn)){result.notes=result.blockers=['등록한 과거 생성·구매 시점 또는 버전에 적용되는 계약 확인 필요'];return result;}
 const unresolved=contractQuestions(a,c).filter(q=>!q.options.some(([v])=>v===facts[q.key])).map(q=>q.label+' 선택 필요');
 const rules=p.rules.filter(r=>matches(r.when,facts)),conflicts=rules.filter(r=>r.status==='conflict'),reviews=rules.filter(r=>r.status==='review');
 const priority=new Set((conflicts.length?conflicts:reviews).flatMap(r=>r.docs));result.sources=[...accepted].sort((x,y)=>Number(priority.has(y.id))-Number(priority.has(x.id))).map(d=>[d.label,d.url]);
 result.status=conflicts.length?'conflict':unresolved.length||reviews.length?'review':'conditions';
 result.blockers=result.status==='review'?[...unresolved,...reviews.map(r=>r.reason)]:[];
 result.notes=conflicts.length?conflicts.map(r=>r.reason):result.status==='review'?result.blockers:['일반 약관과 해당 기능의 추가 약관을 함께 확인했습니다. 선택한 범위의 이용이 허용되며 표시된 의무를 지켜야 합니다.'];
 result.tasks=p.duties.filter(r=>matches(r.when,facts)).map(r=>r.text);
 result.humanChecks=['실제 입력 자료의 저작권·음성·초상 동의와 출력물의 정확성·비침해 여부를 확인하세요.'];
 result.contractConfirmed=result.status==='conditions';
 result.permissions=result.status==='conditions'?[c.commercial===false?'선택한 비상업 이용 범위의 허가를 확인했습니다.':'선택한 상업 이용 범위의 허가를 확인했습니다.']:[];
 // Each source keeps its own text, date and URL; additions never get folded into an anonymous quote.
 result.contractDocuments=accepted.map(d=>({...d,clause:p.duties.filter(r=>r.docs.includes(d.id)&&matches(r.when,facts)).map(r=>r.text).concat(rules.filter(r=>r.docs.includes(d.id)).map(r=>r.reason)).join(' ')}));
 return result;
}
export function contractChoicesMarkup(a,c,esc){const p=contractProfile(a);if(!p)return '';return `<h3>이용 사실 확인</h3><p class="muted">일반·추가 약관은 자동 연결합니다. 실제 이용에 해당하는 항목만 선택하세요.</p><div class="form-grid">${contractQuestions(a,c).map(q=>`<label>${esc(q.label)}<select data-contract-choice="${esc(q.key)}"><option value="">선택 필요</option>${q.options.map(([v,label])=>`<option value="${esc(v)}" ${a.contractChoices?.[q.key]===v?'selected':''}>${esc(label)}</option>`).join('')}</select>${q.why?`<small>${esc(q.why)}</small>`:''}</label>`).join('')}</div>`;}

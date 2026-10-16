import {contractProfile,contractChoicesMarkup,cleanContractChoices} from './contract-review.mjs';
import {sourceRefreshJobs} from './auto-review.mjs';
import {installReportPrint} from './print-report.mjs';
import {brandIcon} from './brand-icons.mjs';
import {createCatalogSearch} from './catalog-search.mjs';
import {reviewStampMarkup,permissionMarkup,reviewReason,outcomeReason,resultItems} from './result-sections.mjs';
import {cleanCandidates,sourceSearchName,verificationLabel,verificationMarkup} from './source-search.mjs';
import {conditionsConfirmed,conditionsPrompt,selectionOf,selectionLabels,selectedAssets,projectSummary,summaryReason,commitChange} from './workflow.mjs';
import {assetSources,sourceTypes,sourceGroup,sourceSearchUrl,officialSuggestions} from './evidence-sources.mjs';
import {reviewSourceConditions,supplementCodeLicense} from './official-sources.mjs';
import {reviewAssignment} from './assignment.mjs';
import {splitImportFiles} from './import-files.mjs';
import {setupAssignment,renderAssignment} from './assignment-ui.mjs';
import {catalog,searchCatalog,categoryNames,categoriesOf,catalogGroup,categoryRecommendation} from './catalog.mjs';
import {validateWorkspace} from './backup.mjs';
import {extractFile} from './extract-file.mjs';
import {evidenceMarkup,purposeDefaults} from './document-text.mjs';
import {reviewManual} from './manual-terms.mjs';
import {evaluate,commercialVerdict,projectTasks,parseFile,isReadable,validateProject,kinds,statuses,sources,RULE_DATE} from './core.mjs';
import {providerNames,queryKey,cleanTerms,planImpact,planImpactMarkup} from './ai.mjs';
import {deduplicate,projectFingerprint} from './projects.mjs';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='license-workbench-v1';let projects=[],trash=[],current,editing=null,view='intake',busy=false,workingContractChoices={},workingTerms,termsBusy=false,migrated=false,manualDirty=false,documentLocations=[],extractionBusy=false,dialogGeneration=0,storageFailed=false,workingCandidates=[],searchGeneration=0,verifyBusy=false;
let contextDraftProject='',contextDraft;
const fresh=name=>({id:crypto.randomUUID(),name,contextConfirmed:false,context:{platform:'general',commercial:true,distribute:true,modified:false,network:false},assets:[],scan:''});
function message(text,error=false){if(storageFailed&&!error){text='최근 저장에 실패했습니다. 저장 상태를 확인하세요. '+text;error=true;}$('notice').textContent=text;$('notice').className=error?'error':'success';}
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(!Array.isArray(saved.projects)||saved.projects.length>50)throw Error('저장 형식 오류');const loaded=saved.projects.map(p=>validateProject(p,{local:true})),selected=loaded[Math.min(saved.index||0,loaded.length-1)];const unique=deduplicate(loaded);projects=unique.projects;trash=Array.isArray(saved.trash)?saved.trash.map(p=>({...validateProject(p,{local:true}),deletedAt:p.deletedAt||new Date().toISOString()})):[];trash.push(...unique.removed.map(p=>({...p,deletedAt:new Date().toISOString()})));current=projects.find(p=>selected&&projectFingerprint(p)===projectFingerprint(selected))?.id||projects[0]?.id;if(unique.removed.length){migrated=true;message(`동일 내용의 중복 프로젝트 ${unique.removed.length}개를 휴지통으로 이동했습니다. 필요하면 복원할 수 있습니다.`);}}}
catch{message('저장 데이터를 읽을 수 없습니다. 원본 저장값은 자동 덮어쓰지 않았습니다. 백업을 가져오거나 새 기록을 저장하세요.',true);}
if(!projects.length){const p=fresh('새 라이선스 점검');projects.push(p);current=p.id;}
const project=()=>projects.find(p=>p.id===current);
function save(){try{localStorage.setItem(key,JSON.stringify({projects,trash,index:projects.findIndex(p=>p.id===current)}));storageFailed=false;return true;}catch{storageFailed=true;message('브라우저 저장 공간에 저장하지 못했습니다. 전체 백업을 내려받으세요. 현재 변경은 메모리에만 있으며 새로고침하면 사라집니다.',true);return false;}}
function transact(change){
 const state={projects,trash,current};
 try{commitChange(state,change,next=>{projects=next.projects;trash=next.trash;current=next.current;return save();});return true;}
 catch(error){projects=state.projects;trash=state.trash;current=state.current;message(error.message,true);return false;}
}
const badge=r=>{const status=Object.hasOwn(statuses,r.status)?r.status:'review';return `<span class="badge ${status}">${r.contractConfirmed&&status==='conditions'?(r.evidenceMethod==='manual'?'직접 입력 약관상 사용 가능 (조건부)':'약관상 사용 가능 (조건부)'):statuses[status]}</span>`;};
function sourceLink(label,url){return `<div class="source-link"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a><div class="source-url-row"><a class="source-url" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a><button type="button" class="text-button" data-copy-url="${esc(url)}">주소 복사</button><span class="copy-status" role="status"></span></div></div>`;}
function links(items){const seen=new Set();return items.filter(([,url])=>{if(seen.has(url))return false;seen.add(url);return true;}).map(([label,url])=>sourceLink(label,url)).join('');}

function evidenceLinks(a){return [...new Set((a.evidence||'').match(/https?:\/\/[^\s<>"']+/g)||[])].map(url=>['사용자 제공 근거 (미검증)',url]);}
const formatDate=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value))+' (KST)':'아직 확인하지 않음';
function termsPanel(a){const t=a.terms;if(!t)return '';const evidence=t.method==='manual'?evidenceMarkup(t,esc):null;return `<section class="terms-record"><div class="terms-record-title"><b>${t.method==='manual'?'직접 입력 약관 검토 기록':'공식 문서 조회 기록'}</b><small>저장 당시 분석 · 현재 결과는 위 검토 결과를 따릅니다.</small>${badge(t)}</div><p>${esc(t.summary)}</p><dl><dt>확인 시각</dt><dd>${esc(t.method==='manual'?(t.checkedAt||'').slice(0,10)+' (사용자 확인일 · KST)':formatDate(t.checkedAt))}</dd><dt>마지막 시도</dt><dd>${esc(formatDate(t.attemptedAt))}</dd><dt>문서 날짜</dt><dd>${esc(t.documentDate||'미표시')}</dd>${t.revision?`<dt>모델 리비전</dt><dd><code>${esc(t.revision)}</code></dd>`:''}</dl>${t.imported?'<p class="warning">백업에서 가져온 기록입니다. 재조회하거나 직접 입력 약관을 재검토하면 결론에 반영됩니다.</p>':''}${t.error?`<p class="warning">${esc(t.error)}</p>`:''}${evidence?evidence.quotes:(t.excerpts||[]).map(x=>`<blockquote>${esc(x)}</blockquote>`).join('')}<div class="source-links">${links(/^https:\/\//.test(t.sourceUrl||'')?[[t.sourceName||'조회 문서',t.sourceUrl]]:[])}</div>${t.method==='manual'?`<p class="warning">사용자가 제공한 원문입니다. 출처의 진위·최신성은 자동 검증하지 않았습니다.</p><details><summary>저장된 약관 원문 ${esc(t.fileName||'붙여넣기')}</summary><div class="original-sections">${evidence.original}</div></details>`:t.originalText?`<details><summary>저장된 약관 원문</summary><pre>${esc(t.originalText)}</pre></details>`:''}<small>확보한 문서의 핵심 조항을 규칙으로 분석합니다. 문서 전체의 법률 해석이나 과거 계약 검증은 포함하지 않습니다.</small></section>`;}
function useSummary(a){return a.kind==='ai'?[a.serviceName||providerNames[a.provider]||'',({output:'생성 결과물',weights:'모델 가중치',service:'서비스·API',training:'학습·미세조정',other:'기타 이용'})[a.scope]||'',({code:'코드',text:'텍스트',image:'이미지',model:'3D 모델',audio:'음악·음성',video:'영상',data:'데이터',other:'기타 결과물'})[a.outputType],a.useDescription].filter(Boolean).join(' · '):'';}
function sourceReviewPanel(a){const review=reviewSourceConditions(a,project().context,Date.now(),{contractConfirmed:commercialVerdict(a,project().context).contractConfirmed});if(!review)return '';const r=review.source,missing=review.missing.filter(item=>evaluate(a,project().context).tasks.includes(item));return `<section class="source-review-panel"><h3>공식 원문에서 확인한 조건</h3><p><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></p><dl><dt>검토 방식</dt><dd>공개 원문 직접 검토 기록 · ${esc(r.observedOn)}${review.stale?' · 최신 원문 재확인 필요':''}</dd><dt>검토한 부분</dt><dd>${esc(r.clause)}</dd><dt>적용 범위</dt><dd>${esc(r.scope)}</dd></dl><p>${esc(review.summary)}</p><h4>현재 입력과 대조한 결과</h4>${missing.length?`<ul>${missing.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>기록한 이용 방식과 원문 적용 범위를 최종 확인하세요.</p>'}<small>이 기록은 표시된 문서·날짜·범위에 한정합니다. 임의 링크의 실시간 자동 해석이나 실제 권리 확보를 뜻하지 않습니다.</small></section>`;}
function sourceLinksPanel(a){const rows=assetSources(a,project().context);const groups=[...new Set(rows.map(sourceGroup))];return `<section class="source-links-panel"><h3>결과 근거 · 웹사이트</h3><p><strong>${esc(a.name)}</strong> · ${esc($('contextSummary').textContent)}</p><p class="muted">이 자료의 출처와 적용 조건입니다. 확인한 원문도 등록한 버전·이용 방식에 적용되는지 확인해야 합니다.</p>${groups.map(group=>`<h4>${esc(group)}</h4>${rows.filter(s=>sourceGroup(s)===group).map(s=>`<article>${sourceLink(s.label,s.url)}<small>${esc(sourceTypes[s.type])}${s.date?' · '+(s.type==='suggested'?'주소 확인일: ':s.type==='candidate'?'검색일: ':'기록일: ')+esc(/^\d{4}-\d{2}-\d{2}$/.test(s.date)?s.date:formatDate(s.date)):''}</small><details><summary>적용 범위·설명</summary><p>${esc(s.note||'')}${s.scope?' · '+esc(s.scope):''}</p>${s.clause?`<p>${esc(s.clause)}</p>`:''}</details>${verificationMarkup(s.verification,esc,a)}</article>`).join('')}`).join('')||'<p class="muted">공식 출처를 특정하지 못했습니다. 파일명·의존성 이름만으로 사이트를 확정하지 않습니다.</p>'}${!rows.some(s=>['reference','queried','suggested'].includes(s.type))&&sourceSearchUrl(a)?`<p><a href="${esc(sourceSearchUrl(a))}" target="_blank" rel="noopener noreferrer">공식 출처 웹 검색 ↗</a><small> · 항목명을 검색 서비스로 보냅니다. 검색 결과는 검증된 근거가 아닙니다. 확인한 URL은 정보 보완의 근거에 기록하세요.</small></p>`:''}</section>`;}


function assessment(a,showDecision=true){
 const context=project().context,r=commercialVerdict(a,context),commercial=evaluate(a,context);
 const {conditions:tasks,checks}=resultItems(commercial);
 const summary=useSummary(a),list=items=>`<ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
 const details=(a.evidence?`<h4>입력한 근거 · 파일 위치</h4><pre class="preserve">${esc(a.evidence)}</pre>`:'')+(a.notes?`<h4>검토 메모</h4><pre class="preserve">${esc(a.notes)}</pre>`:'')+sourceReviewPanel(a)+termsPanel(a)+(a.licenseDocument?`<details><summary>추출한 라이선스 원문 · ${esc(a.licenseDocument.name)}</summary><pre class="preserve">${esc(a.licenseDocument.text)}</pre></details>`:'');
 return `${summary?`<p class="use-summary">${esc(summary)}</p>`:''}${showDecision?`<div class="decision"><small>현재 사용 목적</small>${badge(commercial)}</div>`:''}

 ${r.status!==commercial.status?`<div class="decision"><small>상업 이용으로 바꾸면</small>${badge(r)}</div>${list(r.notes)}`:''}
 <div class="result-overview">${permissionMarkup(a,commercial,esc)}
 <section class="usage-conditions"><h3>지켜야 할 조건</h3>${tasks.length?list(tasks):'<p>추가로 표시할 사용 조건이 없습니다.</p>'}</section>
 <section class="human-checks"><h3>확인 필요한 부분</h3>${checks.length?list(checks):'<p>추가로 표시할 확인 사항이 없습니다.</p>'}</section>
 </div><details class="assessment-sources"><summary>출처·확인 기록 보기</summary>${sourceLinksPanel(a)}</details>
 ${commercial.notes.length||details?`<details class="assessment-evidence"><summary>상세 근거 · 약관 · 원문</summary>${list(commercial.notes)}${details}</details>`:''}`;
}
function render(){const p=project();
 $('projectSelect').innerHTML=projects.map(x=>`<option value="${x.id}" ${x.id===current?'selected':''}>${esc(x.name)}</option>`).join('');
 if(contextDraftProject&&contextDraftProject!==current){contextDraft=undefined;contextDraftProject='';$('contextPending').textContent='';}
 $('projectTitle').textContent=p.name;const purpose={general:'일반 이용 · 직접 설정',steam:'Steam 출시',enterprise:'기업 사용·납품',conference:'학회·논문 공개',research:'연구 프로젝트'}[p.context.platform];const flags=[['commercial','상업 목적'],['distribute','외부 배포'],['modified','자료 수정'],['network','네트워크 서비스']].filter(([key])=>p.context[key]).map(([,label])=>label);const contextText=purpose+' · '+(flags.join(' · ')||'추가 조건 없음');$('contextSummary').textContent=contextText;$('reportContext').textContent='검토 기준: '+contextText+' · 결과는 적용 라이선스·계약상 허용 여부입니다. 실제 자료의 권리는 별도 확인 사항을 보세요.';
 for(const field of ['platform','commercial','distribute','modified','network']){if(field==='platform')$(field).value=(contextDraftProject===current&&contextDraft||p.context)[field];else $(field).checked=(contextDraftProject===current&&contextDraft||p.context)[field];}
 const summary=projectSummary(p),counts=summary.counts;
 $('stats').innerHTML=`<div class="stat"><span>검토 대상</span><strong>${summary.assets.length}<small>개 항목</small></strong><p>코드 · 에셋 · AI · 도구</p></div>`+[['conditions','사용 가능 · 조건부','고지·허가 조건 이행 필요'],['review','판단 보류','근거 또는 적용 범위 확인'],['conflict','현재 조건으로 사용 불가','현재 조건 기준 · 별도 허가 검토']].map(([s,label,hint])=>`<div class="stat ${s}"><span>${label}</span><strong>${counts[s]}<small>개 항목</small></strong><p>${hint}</p></div>`).join('');
 $('assetCount').textContent=p.assets.length;$('scanLog').textContent=p.scan||'아직 선택한 파일이 없습니다.';
 const mentions=new Map(reviewAssignment(p.assignment?.documents||[]).candidates.map(c=>[c.name,c]));
 const mentionLabel=a=>{const c=mentions.get(a.name);return c?`<small class="source-role-label">${c.references.every(r=>r.role==='feedback')?'피드백에서만 언급 · 대안 후보':'문서에서 추출한 후보'}</small>`:'';};
 const query=$('search').value.toLowerCase(),filter=$('statusFilter').value;
 const rows=p.assets.filter(a=>(a.name+' '+a.license+' '+a.evidence).toLowerCase().includes(query)).filter(a=>filter==='all'||selectionOf(a)===filter);
 $('assetRows').innerHTML=rows.map(a=>`<tr><td><button class="asset-name" data-edit="${a.id}">${brandIcon(a)}${esc(a.name)}</button><small>${esc(a.version||'버전 미기록')}</small>${mentionLabel(a)}</td><td>${esc(kinds[a.kind])}</td><td><code>${esc(a.license||'미확인')}</code><small>${a.terms?'약관 기록 있음':a.evidence?.trim()?'근거 입력됨':'근거 추가 필요'}</small></td><td><select data-selection="${a.id}" aria-label="${esc(a.name)} 사용 여부">${Object.entries(selectionLabels).map(([key,label])=>`<option value="${key}" ${selectionOf(a)===key?'selected':''}>${label}</option>`).join('')}</select></td><td><button class="row-open" data-edit="${a.id}">정보·근거 수정</button></td></tr>`).join('');
 $('selectionSummary').textContent=`실제 사용 ${summary.assets.length}개 · 선택 전 ${summary.pending}개 · 대안/제외 ${p.assets.length-summary.assets.length-summary.pending}개`;

 $('empty').hidden=p.assets.length>0;$('assetRows').closest('.table-wrap').hidden=p.assets.length===0;
 if(p.assets.length&&!rows.length)$('assetRows').innerHTML='<tr><td colspan="5" class="no-results">검색 조건에 맞는 항목이 없습니다.</td></tr>';
 renderReport();
 const overall=summary.status;
 $('overall').innerHTML=`<div><span class="eyebrow">현재 사용 목적 · 프로젝트 결과</span><h2>${statuses[overall]}</h2><p>${esc(summaryReason(summary))}</p><small>실제 사용 ${summary.assets.length}개에 대한 잠정 결과 · 선택 전 ${summary.pending}개 · 사람이 별도로 확인할 사항이 있는 자료 ${summary.assets.filter(a=>evaluate(a,p.context).humanChecks?.length).length}개 · 출시 승인이 아닙니다.</small></div>`;
 $('overall').className='overall '+overall;
 renderProjects();
 renderAssignment(p);
 if(!conditionsConfirmed(p)){$('overall').innerHTML=`<h2>${conditionsPrompt}</h2><p>2단계에서 실제 사용 조건을 확인하고 적용하세요.</p><button id="setConditions">사용 조건 정하기</button>`;$('setConditions').onclick=()=>setView('inventory');$('stats').hidden=true;$('documentReviewSection').hidden=true;}else $('stats').hidden=false;
}
function renderReport(){const p=project();if(!conditionsConfirmed(p)){$('reportContent').innerHTML='';return;}const assets=selectedAssets(p),tasks=projectTasks(p);
 $('reportContent').innerHTML=(tasks.length?`<details class="project-task-summary"><summary>공통 확인사항 ${tasks.length}개</summary><ul>${tasks.map(t=>`<li>${esc(t.task)} · ${t.count}개 자료</li>`).join('')}</ul></details>`:'')+assets.map(a=>`<details class="report-item result-card"><summary><strong class="brand-name">${brandIcon(a)}${esc(a.name)}</strong>${badge(evaluate(a,p.context))}${reviewStampMarkup(evaluate(a,p.context),esc)}<small class="review-reason ${evaluate(a,p.context).status}">${esc(outcomeReason(a,evaluate(a,p.context)))}</small><span>이유·할 일 보기</span></summary><div class="result-detail">${assessment(a,false)}<button class="outline" data-edit="${a.id}">정보 보완</button></div></details>`).join('');
}
function setView(next){if(next==='report'&&contextDraftProject===current)message('사용 조건에 미적용 변경이 있습니다. 결과는 마지막으로 적용한 조건 기준입니다.');view=next;window.scrollTo({top:0,behavior:'instant'});for(const v of ['intake','inventory','report','guide'])$(v+'View').hidden=v!==view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});$('viewSubtitle').textContent={intake:'파일을 가져오거나 이름으로 검색해서 자료를 등록하세요.',inventory:'각 자료를 실제 사용, 대안 보관, 사용 안 함으로 분류하세요.',report:'실제 사용하는 자료의 결론과 근거를 확인하세요.',guide:'사용 순서와 결과를 읽는 방법을 확인하세요.'}[view];$('pageLabel').textContent={intake:'1. 자료 넣기',inventory:'2. 실제 사용할 것 선택',report:'3. 결과 확인',guide:'사용법·결과 안내'}[view];}
$('assetRows').addEventListener('change',e=>{const id=e.target.dataset.selection;if(!id)return;const value=e.target.value;if(!Object.hasOwn(selectionLabels,value))return;transact(state=>{state.projects.find(p=>p.id===state.current).assets.find(a=>a.id===id).selection=value;});render();});
$('reportContent').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)openAsset(b.dataset.edit);};

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));

function readContextDraft(){return {platform:$('platform').value,...Object.fromEntries(['commercial','distribute','modified','network'].map(k=>[k,$(k).checked]))};}
function markContextDraft(){contextDraftProject=current;contextDraft=readContextDraft();$('contextPending').textContent='아직 적용하지 않은 변경입니다.';}
$('platform').onchange=()=>{const defaults=purposeDefaults($('platform').value);for(const k of ['commercial','distribute','modified','network'])$(k).checked=defaults[k];markContextDraft();};
for(const k of ['commercial','distribute','modified','network'])$(k).onchange=markContextDraft;
$('applyContext').onclick=()=>{
 const context=readContextDraft();
 const ok=transact(state=>{const p=state.projects.find(x=>x.id===state.current);p.context=context;p.contextConfirmed=true;});
 if(ok){contextDraft=undefined;contextDraftProject='';$('contextPending').textContent='사용 조건을 적용했습니다.';render();message('사용 조건을 적용하고 결과를 갱신했습니다.');}
};
$('homeLink').onclick=e=>{e.preventDefault();setView('intake');};
function formAsset(){const f=$('assetForm'),data=Object.fromEntries(new FormData(f));return {...(project().assets.find(a=>a.id===editing)||{}),...data,contractChoices:cleanContractChoices(workingContractChoices),provider:data.kind==='ai'?data.provider||'':'',serviceName:data.kind==='ai'?data.serviceName||'':'',nonprofitEntityConfirmed:f.elements.nonprofitEntityConfirmed.checked,licenseOrigin:f.dataset.licenseOrigin||(project().assets.find(a=>a.id===editing)?.licenseOrigin||''),apiAccessConfirmed:f.elements.apiAccessConfirmed.checked,sourceCandidates:workingCandidates,selection:data.selection||'used',sourceConditionsConfirmed:f.elements.sourceConditionsConfirmed.checked,id:editing||crypto.randomUUID(),confirmed:f.elements.confirmed.checked,aiGenerated:f.elements.aiGenerated.checked,terms:data.kind==='ai'?workingTerms:undefined};}
function updateForm(){const a=formAsset();$('contractPanel').hidden=!contractProfile(a);$('contractChoices').innerHTML=contractChoicesMarkup(a,project().context,esc);const advice=categoryRecommendation(a);$('categoryAdvice').hidden=!advice;$('categoryAdviceText').textContent=advice?`범주 추천: ${advice.name} → ${kinds[advice.kind]}`:'';$('copilotRouteField').hidden=a.kind!=='ai'||!['github copilot','깃허브 코파일럿'].includes(String(a.serviceName||a.name).toLowerCase());$('organizationScaleField').hidden=a.license!=='LicenseRef-MinerU';$('assetForm').elements.scope.required=a.kind==='ai';$('nonprofitEntityField').hidden=a.license!=='LicenseRef-OpenSees'&&a.name.toLowerCase()!=='opensees';$('assetResultSection').hidden=!editing;$('apiAccessField').hidden=a.scope!=='service';$('planField').hidden=planImpact(a).status!=='affected'||!!contractProfile(a)&&(a.contractChoices?.product==='music'||a.contractChoices?.edition==='beta');$('planImpactInfo').innerHTML=planImpactMarkup(a,esc);$('providerSearch').required=a.kind==='ai';$('selectedService').textContent=a.provider?(a.provider==='other'?(workingCandidates.some(s=>s.query===a.serviceName)?'검색한 서비스: ':'검토할 서비스: ')+(a.serviceName||'서비스 이름을 입력하세요'):'선택한 서비스: '+providerNames[a.provider]):'이름을 입력하면 목록에서 찾거나 직접 등록할 수 있습니다.';$('licenseFields').classList.toggle('ai-extra',a.kind==='ai');$('lookupHelp').textContent=a.provider==='other'?'검색 후보의 ‘공식성·원문 자동 확인’으로 출처를 검토하세요. 원문을 가져오지 못하면 파일·텍스트로 보완할 수 있습니다.':['training','other'].includes(a.scope)?'이 이용 방식은 계약별 검토가 필요합니다. 원문을 저장하고 적용 범위를 확인하세요.':'공식 약관을 조회하거나, 접근이 막히면 파일·원문을 직접 등록하세요.';$('lookupTerms').hidden=a.provider==='other'||['training','other'].includes(a.scope);$('assetForm').elements.outputType.closest('label').hidden=a.scope!=='output';$('assetDialog').classList.toggle('ai-mode',a.kind==='ai');$('aiSetup').hidden=a.kind!=='ai';$('aiFields').hidden=a.kind!=='ai';$('assetDecision').innerHTML='<span>이 항목의 현재 결과</span>'+badge(evaluate(a,project().context));$('repositoryField').hidden=a.provider!=='huggingface';$('assetAssessment').innerHTML=assessment(a);$('sourceSearchFallback').href=sourceSearchUrl({name:sourceSearchName(a)});$('sourceSearchFallback').hidden=!sourceSearchName(a);$('sourceSearchResults').innerHTML=workingCandidates.map((s,i)=>`<article>${sourceLink(s.title,s.url)}<small>${esc(verificationLabel(s,sourceSearchName(a)))} · 검색어: ${esc(s.query)} · ${esc(formatDate(s.searchedAt))}</small><button type="button" data-verify-source="${i}" ${verifyBusy?'disabled':''}>공식성·원문 자동 확인</button>${verificationMarkup(s.verification,esc,a)}</article>`).join('');}
$('applyCategoryAdvice').onclick=()=>{const advice=categoryRecommendation(formAsset());if(!advice)return;const f=$('assetForm').elements;f.kind.value=advice.kind;f.provider.value=advice.provider||'';f.serviceName.value=advice.kind==='ai'?advice.name:'';f.scope.value='';$('providerSearch').value=advice.name;updateForm();};
function openAsset(id,ai=false){editing=id||null;$('assetForm').dataset.licenseOrigin='';dialogGeneration++;$('providerSearch').value='';$('providerResults').innerHTML='';manualDirty=false;const a=project().assets.find(x=>x.id===id)||{kind:ai?'ai':'code',selection:'used',rights:'unknown',planType:'unknown',scope:'output',provider:''};workingContractChoices=cleanContractChoices(a.contractChoices);workingTerms=a.terms;workingCandidates=cleanCandidates(a.sourceCandidates);verifyBusy=false;searchGeneration++;$('sourceSearchStatus').textContent='';$('findSources').disabled=false;documentLocations=a.terms?.locations||[];$('assetForm').reset();$('rawTextDetails').open=false;$('extraFields').open=false;$('assessmentDetails').open=true;$('manualText').value=a.terms?.originalText||'';$('manualUrl').value=a.terms?.sourceUrl||'';$('manualDate').value=a.terms?.method==='manual'?(a.terms.checkedAt||'').slice(0,10):new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());$('termsFileName').textContent=a.terms?.fileName||'';$('manualAttested').checked=false;$('manualTerms').open=a.terms?.method==='manual';for(const [k,v]of Object.entries(a)){const field=$('assetForm').elements.namedItem(k);if(field&&v!==undefined){if(field.type==='checkbox')field.checked=!!v;else field.value=v;}}
 if(a.kind==='ai'&&!a.provider){$('providerInput').value=/tripo/i.test(a.name||'')?'tripo':/meshy/i.test(a.name||'')?'meshy':/claude|anthropic/i.test(a.name||'')?'anthropic':/openai|chatgpt|codex/i.test(a.name||'')?'openai':'';}
 $('providerSearch').value=$('providerInput').value==='other'?a.serviceName||'':(catalog.find(x=>x.provider===$('providerInput').value)?.name||'');$('dialogTitle').textContent=a.kind==='ai'?'서비스·API·약관 검토':id?'자료·근거 수정':'자료 추가';$('deleteAsset').hidden=!id;$('termsProgress').textContent='';updateForm();$('assetDialog').showModal();}
 $('assetRows').onclick=e=>{const b=e.target.closest('[data-edit]');if(b){openAsset(b.dataset.edit);if(b.hasAttribute('data-assess')){$('assessmentDetails').open=true;$('assessmentDetails').scrollIntoView({block:'start'});}}};
 $('kindInput').innerHTML='<option value="">범주 선택</option>'+Object.entries(kinds).map(([v,n])=>`<option value="${v}">${n}</option>`).join('');
 $('addAsset').onclick=()=>openAsset();$('closeDialog').onclick=()=>$('assetDialog').close();

 $('assetForm').oninput=e=>{if(e.target.dataset.contractChoice)workingContractChoices[e.target.dataset.contractChoice]=e.target.value;if(['provider','planType','scope','apiAccessConfirmed','version','plan','useDescription','repository','evidence'].includes(e.target.name))$('assetForm').elements.sourceConditionsConfirmed.checked=false;updateForm();};
 $('assetForm').onchange=updateForm;
 $('refreshContractBundle').onclick=()=>{const p=contractProfile(formAsset());if(!p)return;const query=sourceSearchName(formAsset());let i=workingCandidates.findIndex(s=>s.url===p.root&&s.query===query);if(i<0){workingCandidates=cleanCandidates([{url:p.root,title:'일반·추가 약관',query,searchedAt:new Date().toISOString()},...workingCandidates]);i=0;}verifySource(i);};
 $('sourceSearchResults').onclick=e=>{const button=e.target.closest('[data-verify-source]');if(button)verifySource(Number(button.dataset.verifySource));};
 async function verifySource(index){
  if(verifyBusy||$('findSources').disabled)return;
  const candidate=workingCandidates[index];if(!candidate)return;
  if(candidate.query!==sourceSearchName(formAsset())){$('sourceSearchStatus').textContent='이름이 바뀌었습니다. 새 이름으로 후보를 다시 검색하세요.';return;}
  const generation=searchGeneration,dialog=dialogGeneration,projectId=current;
  verifyBusy=true;updateForm();$('sourceSearchStatus').textContent='공식 주소와 원문을 대조하고 있습니다…';
  try{
   const response=await fetch('/api/source-verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:candidate.query,url:candidate.url}),signal:AbortSignal.timeout(50000)});
   const result=await response.json();
   if(dialog!==dialogGeneration||generation!==searchGeneration||projectId!==current||!$('assetDialog').open||candidate.query!==sourceSearchName(formAsset()))return;
   if(!response.ok||result.error)throw Error('확인 실패');
   const verification=result.documents?.length&&candidate.verification?.text?{...candidate.verification,documents:result.documents,attemptedAt:result.attemptedAt}:!result.text&&candidate.verification?.text?{...candidate.verification,...result,text:candidate.verification.text,excerpts:candidate.verification.excerpts,hash:candidate.verification.hash,checkedAt:candidate.verification.checkedAt,imported:true,reason:result.reason+' 이전 원문 기록을 보존합니다.'}:result;
   workingCandidates[index]=cleanCandidates([{...candidate,verification}])[0];
   if(!$('assetForm').elements.kind.value&&result.status==='matched'&&result.licenseKey&&result.repositoryId)$('assetForm').elements.kind.value='code';
   const supplemented=supplementCodeLicense(formAsset());
   if(supplemented.licenseOrigin){$('assetForm').elements.license.value=supplemented.license;$('assetForm').elements.evidence.value=supplemented.evidence;$('assetForm').dataset.licenseOrigin=supplemented.licenseOrigin;}
   $('sourceSearchStatus').textContent=result.text?(result.excerpts?.length?'원문과 근거 문구를 확보했습니다. 요약 결과와 적용 조건을 확인하세요.':'페이지 텍스트는 확보했지만 관련 약관 문구를 찾지 못했습니다. 공식 문서·파일로 보완하세요.'):result.reason;
  }catch{if(dialog===dialogGeneration)$('sourceSearchStatus').textContent='확인에 실패했습니다. 기존 후보·원문 기록은 유지됩니다.';}
  finally{if(dialog===dialogGeneration){verifyBusy=false;updateForm();if($('assetDialog').open){$('assessmentDetails').open=true;(editing?$('assetDecision'):$('sourceSearchResults')).scrollIntoView({block:'start',behavior:'smooth'});}}}
 };
 $('findSources').onclick=async()=>{
  if(verifyBusy)return;
  const name=sourceSearchName(formAsset());
  if(!name||name.length>200){$('sourceSearchStatus').textContent='검색할 이름을 1~200자로 입력하세요.';return;}
  const generation=++searchGeneration,dialog=dialogGeneration,projectId=current;
  $('findSources').disabled=true;$('sourceSearchStatus').textContent='무료 웹 검색 중…';
  try{
   const response=await fetch('/api/source-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),signal:AbortSignal.timeout(35000)});
   const result=await response.json();
   if(generation!==searchGeneration||dialog!==dialogGeneration||projectId!==current||!$('assetDialog').open)return;
   if(name!==sourceSearchName(formAsset())){$('sourceSearchStatus').textContent='이름이 변경되어 이전 검색 결과를 적용하지 않았습니다. 다시 검색하세요.';return;}
   if(!response.ok||result.error)throw Error(result.error||'검색 요청에 실패했습니다.');
   if(result.status==='ok')workingCandidates=cleanCandidates(result.candidates);
   $('sourceSearchStatus').textContent=(result.message||'검색을 완료했습니다.')+(result.cached?' (최근 10분 내 검색 기록)':'')+(result.status==='ok'?' 후보를 보관하려면 검토 내용을 저장하세요.':' 기존 후보는 유지됩니다.');
   updateForm();
  }catch{$('sourceSearchStatus').textContent=generation===searchGeneration&&dialog===dialogGeneration?'검색에 실패했습니다. 기존 후보는 유지됩니다. 직접 검색을 이용하세요.':$('sourceSearchStatus').textContent;}
  finally{if(generation===searchGeneration&&dialog===dialogGeneration)$('findSources').disabled=false;}
 };

 $('assetForm').onsubmit=e=>{e.preventDefault();if($('findSources').disabled||verifyBusy){$('sourceSearchStatus').textContent='출처 검색이 끝난 후 저장하세요.';return;}if(extractionBusy){$('termsProgress').textContent='문서 추출이 끝난 후 저장하세요.';return;}if(manualDirty&&$('kindInput').value==='ai'){$('termsProgress').textContent='약관 입력 내용이 변경되었습니다. 입력 약관 분석을 실행한 후 저장하세요.';$('manualTerms').open=true;$('rawTextDetails').open=true;return;}const a=supplementCodeLicense(formAsset());if(a.kind==='ai'&&(!a.provider||(a.provider==='other'&&!a.serviceName?.trim()))){$('selectedService').textContent='서비스 이름을 입력하거나 검색 결과에서 선택하세요.';$('providerSearch').focus();return;}if(!a.name.trim()){message('이름을 입력하세요.',true);return;}if(!editing&&project().assets.length>=5000){message('프로젝트당 최대 5,000개 항목입니다.',true);return;}const i=project().assets.findIndex(x=>x.id===editing);const previous=i>=0?project().assets[i]:null;if(i>=0)project().assets[i]=a;else project().assets.push(a);if(!save()){if(i>=0)project().assets[i]=previous;else project().assets.pop();$('termsProgress').textContent='저장 공간이 부족합니다. 내용은 이 창에 유지됩니다. 기존 자료를 백업한 뒤 공간을 확보하세요.';return;}render();$('assetDialog').close();message('자료를 저장했습니다. 계속 추가하거나 다음 단계로 이동하세요.');supplementRegisteredRepositories();};
 $('deleteAsset').onclick=()=>{if(confirm('이 항목의 검토 기록을 삭제할까요?')){const previous=project().assets;project().assets=previous.filter(a=>a.id!==editing);if(!save()){project().assets=previous;$('termsProgress').textContent='삭제 내용을 저장하지 못했습니다. 기존 항목을 유지합니다.';return;}render();$('assetDialog').close();}};
 $('newProject').onclick=()=>$('newDialog').showModal();$('closeNew').onclick=()=>$('newDialog').close();
 function addProject(p){
 const ok=transact(state=>{
  const found=state.projects.find(x=>projectFingerprint(x)===projectFingerprint(p));if(found){state.current=found.id;return;}
  if(state.projects.length>=50)throw Error('프로젝트는 최대 50개입니다.');
  const candidate=structuredClone(p),base=p.name;let n=2;
  while(state.projects.some(x=>x.name===candidate.name))candidate.name=`${base} (${n++})`;
  state.projects.push(candidate);state.current=candidate.id;
 });
 render();if(!ok)return undefined;setView('intake');return project();
 }
 $('newForm').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('projectName').trim();if(name){if(addProject(fresh(name))){$('newDialog').close();e.target.reset();}}};
 $('projectSelect').onchange=()=>{current=$('projectSelect').value;save();render();};$('search').oninput=render;$('statusFilter').onchange=render;
 function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 $('exportWorkspace').onclick=()=>download('license-workspace-backup.json',JSON.stringify({type:'license-workbench-workspace',schemaVersion:1,exportedAt:new Date().toISOString(),projects,trash},null,2),'application/json');
 $('exportProject').onclick=()=>download('license-project.json',JSON.stringify({schemaVersion:1,...project()},null,2),'application/json');
 $('importProject').onclick=()=>$('jsonInput').click();$('jsonInput').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>50*1024*1024)throw Error('백업 JSON은 최대 50MB입니다.');
  const raw=JSON.parse(await file.text());
  const restored=raw.type==='license-workbench-workspace'?validateWorkspace(raw):{projects:[validateProject(raw)],trash:[]};
  const ok=transact(state=>{
   // Imported flags indicate trust, not different project content.
   const identity=p=>projectFingerprint(JSON.parse(JSON.stringify(p),(k,v)=>k==='imported'?undefined:v));
   const merge=(target,items,limit)=>{for(const p of items){const match=target.find(x=>identity(x)===identity(p));if(match)continue;if(target.length>=limit)throw Error('프로젝트·휴지통 개수 제한을 초과합니다.');target.push(p);}};
   merge(state.projects,restored.projects,50);merge(state.trash,restored.trash,100);
  });
  render();if(ok){setView('inventory');message('백업을 병합했습니다. 기존 자료는 유지하며 가져온 AI 약관은 재확인해야 합니다.');}
 }catch(error){message('가져오기 실패: '+error.message,true);}finally{e.target.value='';}
 };

 installReportPrint($('reportView'));
 $('exportReport').onclick=async()=>{
  const button=$('exportReport');button.disabled=true;
  try{
   message('PDF 리포트를 만들고 있습니다…');
   const response=await fetch('/api/report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:project(),includeOriginals:false})});
   if(!response.ok){const error=await response.json();throw Error(error.error||'PDF 생성 실패');}
   download('license-review.pdf',await response.blob(),'application/pdf');
   message('PDF 내려받기를 요청했습니다. 브라우저 다운로드 목록을 확인하세요.');
  }catch(error){message('PDF 내려받기 실패: '+error.message,true);}finally{button.disabled=false;}
 };

 $('sourceLinks').innerHTML=links(sources);
 $('folderButton').onclick=()=>$('folderInput').click();$('filesButton').onclick=()=>$('filesInput').click();
 async function scan(files,p){if(busy)throw Error("다른 가져오기가 진행 중입니다.");busy=true;const log=[],total=files.length;let bytes=0,read=0,ignored=0,added=0,failed=0;
 $('folderButton').disabled=$('filesButton').disabled=true;
 const seen=new Set(p.assets.map(a=>[a.name,a.version,a.license,a.evidence].join('|')));
 try{for(const f of Array.from(files).slice(0,10000)){
  const path=f.webkitRelativePath||f.name;let rows=[];
  if(/(^|\/)(\.git|\.env[^/]*|\.ssh|\.aws)(\/|$)/i.test(path)){ignored++;continue;}
  const model=/\.(glb|gltf|fbx|obj|blend|stl|usd|usdz)$/i.test(path),image=/\.(png|jpg|jpeg|webp|tga|svg)$/i.test(path),audio=/\.(wav|mp3|ogg|flac)$/i.test(path),ai=/\.(safetensors|gguf|onnx|pt|pth)$/i.test(path);
  if(model||image||audio||ai)rows=[{name:f.name,kind:ai?'ai':model?'model':image?'image':'audio',license:'',evidence:path,notes:'파일명만 등록. 콘텐츠·권리·라이선스는 미분석.',rights:'unknown',confirmed:false}];
  else if(!isReadable(path)){ignored++;continue;}
  else if(f.size>2*1024*1024||bytes+f.size>30*1024*1024){ignored++;log.push('크기 제한으로 건너뜀: '+path);continue;}
  else{try{bytes+=f.size;rows=parseFile(path,await f.text());read++;}catch(err){failed++;log.push('읽기/파싱 실패: '+path+' — '+err.message);continue;}}
  for(const a of rows){const identity=[a.name,a.version||'',a.license,a.evidence].join('|');if(!seen.has(identity)){if(p.assets.length>=5000){log.push('5,000개 등록 제한 도달. 나머지 항목 미등록.');break;}p.assets.push({version:'',...a,selection:'pending',id:crypto.randomUUID()});seen.add(identity);added++;}}
  if(p.assets.length>=5000)break;
  if((read+ignored)%100===0){message(`파일을 읽고 있습니다… ${read}개 텍스트 처리, ${added}개 항목 발견`);await new Promise(r=>setTimeout(r,0));}
 }
 if(total>10000)log.push('선택 10,000개 초과: 초과 파일은 처리하지 않았습니다.');
 p.scan=(p.scan?p.scan+'\n':'')+`선택 ${total}개 / 텍스트 읽기 ${read}개 / 제외 ${ignored}개 / 실패 ${failed}개 / 신규 등록 ${added}개\n${log.join('\n')}\n자동 탐지는 적용 라이선스 확정이 아닙니다. 의존성 선언과 잠금 파일 항목은 근거별로 별도 등록됩니다.`;
 return {added,failed};
 }finally{busy=false;$('folderButton').disabled=$('filesButton').disabled=importing;}}
 let importing=false;
 async function importFiles(files){
  if(importing||busy)return;
  importing=true;$('folderButton').disabled=$('filesButton').disabled=true;
  try{
   if(!files.length)return;
   if(files.length>10000)throw Error('한 번에 최대 10,000개 파일을 선택하세요.');
   const original=project(),originalId=original.id,fingerprint=projectFingerprint(original);
   const {documents,assets,ignored}=splitImportFiles(files);
   if(!documents.length&&!assets.length)throw Error('가져올 자료가 없습니다. 자격증명·비공개 설정 경로는 제외합니다.');
   const staged=documents.length?await readAssignment(documents,original):structuredClone(original);
   const scanned=assets.length?await scan(assets,staged):{added:0,failed:0};
   if(!transact(state=>{const index=state.projects.findIndex(p=>p.id===originalId);if(index<0||projectFingerprint(state.projects[index])!==fingerprint)throw Error('읽는 동안 프로젝트가 변경됐습니다. 기존 기록을 유지했으니 다시 가져오세요.');state.projects[index]=staged;state.current=originalId;}))throw Error('저장 실패로 가져오기를 취소했습니다. 기존 기록은 유지했습니다.');
   render();
   const summary=`가져오기 완료 · 문서 ${documents.length}개 / 소스·에셋 파일 ${assets.length}개 / 보안 경로 제외 ${ignored.length}개 · 파싱 실패 ${scanned.failed}개`;
   $('importProgress').textContent=summary;message(summary,scanned.failed>0);supplementRegisteredRepositories();
  }catch(err){$('importProgress').textContent='가져오기 실패: '+err.message;message('가져오기 실패: '+err.message,true);}
  finally{importing=false;$('folderButton').disabled=$('filesButton').disabled=false;}
 }
 for(const id of ['folderInput','filesInput'])$(id).onchange=async e=>{try{await importFiles(Array.from(e.target.files));}finally{e.target.value='';}};
 $('demoButton').onclick=()=>{const existing=projects.find(p=>p.demo||p.name.startsWith('샘플 · 출시 전 라이선스 검토'));if(existing){current=existing.id;save();render();message('기존 샘플 프로젝트를 열었습니다. 중복 생성하지 않습니다.');return;}const p=fresh('샘플 · 자료 라이선스 검토');p.demo=true;p.assets=[
 {name:'예제 분석 라이브러리',kind:'code',license:'MIT',confirmed:true,evidence:'https://opensource.org/license/mit',notes:'가상 샘플. 실제 프로젝트 자료가 아닙니다.',version:'1.0'},
 {name:'예제 3D 모델',kind:'model',license:'CC-BY-NC-4.0',confirmed:true,rights:'unknown',evidence:'https://creativecommons.org/licenses/by-nc/4.0/',notes:'비상업용 자료를 상업 목적으로 배포하는 가상 사례.'},
 {name:'AI 생성 모델 (예제)',kind:'ai',provider:'tripo',scope:'output',planType:'unknown',license:'Custom',plan:'플랜 미확인',evidence:'https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially',notes:'상용 권리·생성 시점·입력 이미지 권리 확인 필요.'},
 {name:'예제 데이터 처리 도구',kind:'code',license:'GPL-3.0-only',confirmed:true,evidence:'https://www.gnu.org/licenses/gpl-3.0.html',notes:'배포 시 결합 범위 검토가 필요한 가상 사례.'}
 ].map(a=>({version:'',...a,id:crypto.randomUUID()}));addProject(p);message('가상 샘플입니다. 실제 연구 자료나 파일을 검사하지 않았습니다.');};
function renderProjects(){
 $('projectList').innerHTML=projects.map(p=>`<div class="project-row"><div><strong>${esc(p.name)}</strong><small>${p.assets.length}개 항목 ${p.id===current?' · 현재 프로젝트':''}</small></div><div><button class="outline" data-project-open="${p.id}">열기</button><button class="outline" data-project-rename="${p.id}">이름 변경</button><button class="danger" data-project-delete="${p.id}">삭제</button></div></div>`).join('');
 $('trashList').innerHTML=trash.length?trash.map(p=>`<div class="project-row"><div><strong>${esc(p.name)}</strong><small>${esc(formatDate(p.deletedAt))}</small></div><button class="outline" data-project-restore="${p.id}">복원</button></div>`).join(''):'<p class="muted">휴지통이 비어 있습니다.</p>';
 $('trashCount').textContent=trash.length;
}
 $('manageProjects').onclick=()=>{renderProjects();$('projectsDialog').showModal();};$('closeProjects').onclick=()=>$('projectsDialog').close();
 $('projectManagerNew').onclick=()=>{$('projectsDialog').close();$('newDialog').showModal();};
 $('projectsDialog').onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  const {projectOpen,projectDelete,projectRename,projectRestore}=button.dataset;
  if(projectOpen){current=projectOpen;save();render();$('projectsDialog').close();}
  if(projectRename){const p=projects.find(x=>x.id===projectRename);$('renameId').value=p.id;$('renameName').value=p.name;$('projectsDialog').close();$('renameDialog').showModal();}
  if(projectDelete){const p=projects.find(x=>x.id===projectDelete);if(trash.length>=100){message('휴지통 100개 한도입니다. 복원 후 백업해 주세요.',true);return;}trash.push({...p,deletedAt:new Date().toISOString()});projects=projects.filter(x=>x.id!==p.id);if(!projects.length)projects.push(fresh('새 라이선스 점검'));if(current===p.id)current=projects[0].id;save();render();message('프로젝트를 휴지통으로 이동했습니다. 프로젝트 관리에서 복원할 수 있습니다.');}
  if(projectRestore){if(projects.length>=50){message('활성 프로젝트 50개 한도입니다.',true);return;}const p=trash.find(x=>x.id===projectRestore);trash=trash.filter(x=>x.id!==p.id);delete p.deletedAt;if(projects.some(x=>x.name===p.name)){const base=p.name;let n=1;while(projects.some(x=>x.name===`${base} (복원 ${n})`))n++;p.name=`${base} (복원 ${n})`;}projects.push(p);current=p.id;save();render();message('프로젝트를 복원했습니다.');}
 };
 $('closeRename').onclick=()=>$('renameDialog').close();$('renameForm').onsubmit=e=>{e.preventDefault();const p=projects.find(x=>x.id===$('renameId').value),name=$('renameName').value.trim();if(!p||!name)return;p.name=name;save();render();$('renameDialog').close();message('프로젝트 이름을 변경했습니다.');};
 
 async function retrieveTerms(a){
  if(a.provider==='other'||['training','other'].includes(a.scope))return {status:'review',summary:'이 서비스·이용 방식은 원문을 직접 등록하고 적용 범위를 검토하세요.',conditions:[],excerpts:[],queryKey:queryKey(a)};
  const query={provider:a.provider,planType:a.planType||'unknown',scope:a.scope||'output',repository:(a.repository||'').trim()};
  try{const response=await fetch('/api/terms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok)throw Error(result.error||`HTTP ${response.status}`);return {...cleanTerms(result),queryKey:queryKey({...a,repository:query.repository}),imported:false};}
  catch(err){return {status:'review',summary:'조회 실패로 최신 약관 판단을 보류합니다.',error:err.message,attemptedAt:new Date().toISOString(),checkedAt:null,conditions:[],excerpts:[],queryKey:queryKey(a)};}
 }
 $('lookupTerms').onclick=async()=>{
  if(termsBusy)return;const a=formAsset();if(!a.provider||a.provider==='other'){$('termsProgress').textContent='지원 서비스를 선택하세요. 다른 서비스는 공식 원문을 근거에 기록해 수동 검토합니다.';return;}
  termsBusy=true;$('lookupTerms').disabled=true;$('termsProgress').textContent='공식 문서를 조회하고 있습니다…';
  const generation=dialogGeneration,editingId=editing,projectId=current,query=queryKey(a);const previousTerms=workingTerms;const result=await retrieveTerms(a);
  if(generation===dialogGeneration&&editing===editingId&&current===projectId&&$('assetDialog').open&&queryKey(formAsset())===query&&workingTerms===previousTerms){if(!(result.error&&workingTerms?.method==='manual'))workingTerms=result;updateForm();if(result.error){$('manualTerms').open=true;if(!$('manualUrl').value)$('manualUrl').value=result.sourceUrl||reviewSourceConditions(a,project().context)?.source.url||'';}$('termsProgress').textContent=result.error?'자동 조회에 실패했습니다. 아래에서 공식 약관 PDF·Word를 가져오거나 원문 전체를 붙여넣으세요. 기존 직접 입력 기록은 유지됩니다.':'조회 완료 — 아래 결론과 확인 시각을 확인한 후 기록을 저장하세요.';}
  termsBusy=false;$('lookupTerms').disabled=false;
 };

 $('statusFilter').innerHTML='<option value="all">모든 자료</option>'+Object.entries(selectionLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
const readAssignment=setupAssignment({project,fresh,addProject,save,render});
if(migrated)save();
const supplementCount=projects.reduce((n,p)=>n+p.assets.filter(a=>supplementCodeLicense(a)!==a).length,0);
if(supplementCount&&transact(state=>{for(const p of state.projects)p.assets=p.assets.map(supplementCodeLicense);})){message(`공식 출처로 기존 자료 ${supplementCount}개의 라이선스·적용 근거를 보완했습니다. 실제 배포판 등 남은 확인 사항은 결과에서 확인하세요.`);}
render();
setView('intake');

for(const id of ['manualText','manualUrl','manualDate','manualAttested'])$(id).addEventListener('input',()=>{manualDirty=true;if(workingTerms?.method==='manual'){workingTerms=undefined;updateForm();$('termsProgress').textContent='직접 입력 내용이 변경되었습니다. 입력 약관 분석을 다시 실행하세요.';}});
$('termsFile').onchange=async e=>{const file=e.target.files[0];if(!file||extractionBusy)return;extractionBusy=true;const dialogId=editing,projectId=current,generation=dialogGeneration;$('termsFile').disabled=$('analyzeManual').disabled=true;$('manualText').readOnly=true;$('termsProgress').textContent='문서에서 텍스트를 추출하고 있습니다…';try{const result=await extractFile(file);if(generation!==dialogGeneration||dialogId!==editing||projectId!==current||!$('assetDialog').open)return;$('manualText').value=result.text;$('rawTextDetails').open=true;$('termsFileName').textContent=file.name;$('manualAttested').checked=false;$('manualText').dispatchEvent(new Event('input',{bubbles:true}));documentLocations=result.locations;$('termsProgress').textContent=`추출 완료 · ${result.locations.length}개 페이지/문단. 원문 누락과 읽기 순서, 출처·확인일을 확인하고 분석하세요.`+(result.warnings?.length?' 추출기 안내: '+result.warnings.join(' / '):'');}catch(err){if(dialogId===editing&&projectId===current)$('termsProgress').textContent='추출 실패: '+err.message+' 기존 입력은 유지됩니다.';}finally{extractionBusy=false;$('termsFile').disabled=$('analyzeManual').disabled=false;$('manualText').readOnly=false;e.target.value='';}};
$('analyzeManual').onclick=()=>{try{workingTerms=reviewManual(formAsset(),{text:$('manualText').value,sourceUrl:$('manualUrl').value.trim(),date:$('manualDate').value,attested:$('manualAttested').checked,fileName:$('termsFileName').textContent,locations:documentLocations});manualDirty=false;updateForm();$('termsProgress').textContent='직접 입력 약관 분석 완료. 아래 결론과 조건을 확인한 뒤 기록 저장을 누르세요.';}catch(err){$('termsProgress').textContent=err.message;}};

$('manualText').addEventListener('input',()=>{documentLocations=[];});
document.addEventListener('click',e=>{const button=e.target.closest('[data-evidence]');if(!button)return;const panel=button.closest('.terms-record'),details=panel.querySelector('details');if(details)details.open=true;const mark=panel.querySelector(`[data-evidence-mark="${button.dataset.evidence}"]`);if(mark){mark.scrollIntoView({behavior:'smooth',block:'center'});mark.focus({preventScroll:true});}});

const categoryIds=new Set(['other-ai','code','model','image','audio','data','tool']);
let catalogCategory='',catalogTimer,catalogRemote={status:'idle',candidates:[]};
function catalogButtons(query,aiOnly=false){
 const matches=searchCatalog(query,aiOnly).filter(x=>!categoryIds.has(x.id)&&(aiOnly||(!catalogCategory||categoriesOf(x).includes(catalogCategory))));
 if(!aiOnly&&!query.trim()&&!catalogCategory)return '';
 const groupOf=x=>catalogGroup(x,aiOnly?'':catalogCategory);
 const groups=[...new Set(matches.map(groupOf))];
 return groups.map(group=>`<section class="catalog-group"><h3>${esc(categoryNames[group])}</h3><div class="catalog-results">${matches.filter(x=>groupOf(x)===group).map(x=>`<article class="catalog-item"><button type="button" class="catalog-choice" data-catalog="${x.id}"><strong class="brand-name">${brandIcon(x)}${esc(x.name)}</strong><small>${esc(categoriesOf(x).map(k=>categoryNames[k]).join(' / '))}</small><small>등록된 안내 · 적용 약관 확인 필요</small></button>${officialSuggestions(x).map(ref=>`<a class="catalog-reference" href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.label)} ↗ <small>참고 링크 · 이용 허가 미확인</small></a>`).join('')}</article>`).join('')}</div></section>`).join('');
}
function renderCatalog(){
 const query=$('catalogSearch').value.trim();
 $('catalogCategories').innerHTML=[['','전체'],...Object.entries(categoryNames)].map(([id,label])=>`<button type="button" data-category="${id}" aria-pressed="${catalogCategory===id}">${esc(label)}</button>`).join('');
 $('catalogResults').innerHTML=catalogButtons(query);
 $('catalogWebFallback').hidden=!query;$('catalogWebFallback').href='https://www.google.com/search?q='+encodeURIComponent(query+' official website terms license');
 const rows=catalogRemote.name===query?catalogRemote.candidates:[];
 $('catalogWebResults').innerHTML=rows.length?`<h3>인터넷에서 찾은 후보 · 범주·공식성 확인 전</h3><div class="catalog-results">${rows.map((r,i)=>`<article class="catalog-choice"><button type="button" class="candidate-title" data-web-candidate="${i}">${esc(r.title)}</button><small>${esc(new URL(r.url).hostname)}</small><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">사이트 열기 ↗</a><button type="button" data-web-candidate="${i}">원문 확인·검토</button></article>`).join('')}</div>`:'';
 $('catalogSearchStatus').textContent=catalogRemote.name===query?catalogRemote.message||'':query?'인터넷 후보도 함께 검색합니다.':catalogCategory?'범주에 맞는 이름을 입력하면 인터넷 후보까지 찾습니다.':'이름을 입력하거나 범주를 선택하세요.';
}
const catalogLookup=createCatalogSearch({request:async name=>{
 const response=await fetch('/api/source-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),signal:AbortSignal.timeout(35000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'검색 실패');return result;
},onChange:state=>{catalogRemote=state;renderCatalog();}});
function runCatalogSearch(){clearTimeout(catalogTimer);return catalogLookup.search($('catalogSearch').value);}

function applyCatalog(id,inDialog=false){const item=catalog.find(x=>x.id===id);if(!item)return;if(!inDialog)openAsset(null,item.kind==='ai');const f=$('assetForm');if(f.elements.provider.value!==item.provider||(f.elements.serviceName.value&&f.elements.serviceName.value!==item.name))f.elements.planType.value='unknown';f.elements.kind.value=item.kind;f.elements.provider.value=item.provider;f.elements.sourceConditionsConfirmed.checked=false;f.elements.serviceName.value=item.kind==='ai'?item.name:'';if(!f.elements.name.value)f.elements.name.value=item.name;f.elements.scope.value=item.provider==='huggingface'?'weights':'output';if(!inDialog&&item.url)f.elements.evidence.value=item.url;if(item.id==='car')f.elements.notes.value='모델 파일 이용 허가와 별도로 실제 차량 디자인·상표·로고의 권리를 확인하세요.';$('extraFields').open=false;$('manualTerms').open=item.provider==='other';$('providerSearch').value=item.name;$('providerResults').innerHTML='';$('dialogTitle').textContent=item.kind==='ai'?'서비스·API·약관 검토':'자료·라이선스 검토';updateForm();}
$('catalogSearch').oninput=()=>{clearTimeout(catalogTimer);catalogLookup.clear();renderCatalog();if($('catalogSearch').value.trim())catalogTimer=setTimeout(runCatalogSearch,1200);};
$('catalogSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runCatalogSearch();}};
$('catalogSearchButton').onclick=runCatalogSearch;
$('catalogCategories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;catalogCategory=b.dataset.category;renderCatalog();};
$('catalogResults').onclick=e=>{const b=e.target.closest('[data-catalog]');if(b)applyCatalog(b.dataset.catalog);};
$('catalogWebResults').onclick=e=>{
 const b=e.target.closest('[data-web-candidate]');if(!b)return;
 const row=catalogRemote.candidates[Number(b.dataset.webCandidate)];if(!row||catalogRemote.name!==$('catalogSearch').value.trim())return;
 const kind=catalogCategory||'';openAsset(null,kind==='ai');const f=$('assetForm').elements;
 f.name.value=row.query;f.kind.value=kind;
 f.provider.value='other';f.serviceName.value=row.query;$('providerSearch').value=row.query;
 f.evidence.value=row.url;workingCandidates=cleanCandidates([row]);$('sourceSearchResults').closest('details').open=true;
 $('dialogTitle').textContent='검색 후보 · 원문과 이용 조건 확인';updateForm();verifySource(0);
};
renderCatalog();
$('providerSearch').oninput=()=>{const name=$('providerSearch').value.trim();if(name!==$('assetForm').elements.serviceName.value)$('assetForm').elements.planType.value='unknown';$('providerInput').value=name?'other':'';$('assetForm').elements.serviceName.value=name;$('assetForm').elements.sourceConditionsConfirmed.checked=false;$('providerResults').innerHTML=name?catalogButtons(name,true):'';updateForm();};
$('providerResults').onclick=e=>{const b=e.target.closest('[data-catalog]');if(b)applyCatalog(b.dataset.catalog,true);};

document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-copy-url]');if(!button)return;
 const status=button.parentElement.querySelector('.copy-status');
 try{await navigator.clipboard.writeText(button.dataset.copyUrl);status.textContent='복사됨';}
 catch{status.textContent='복사 권한이 없습니다. 옆 URL을 선택해 복사하세요.';}
});


// Bounded, same-origin lookups; failures remain candidates and are not retried on every render.
let repositorySupplementBusy=false;
async function supplementRegisteredRepositories(){
 if(repositorySupplementBusy)return;repositorySupplementBusy=true;
 let completed=0;
 const work=sourceRefreshJobs(projects);
 for(const w of work){try{
  let url=w.url,candidates=[];
  if(!url){const found=await fetch('/api/source-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:w.name}),signal:AbortSignal.timeout(35000)});if(!found.ok)continue;const data=await found.json();candidates=cleanCandidates(data.candidates);url=candidates[0]?.url;if(!url)continue;}
  const response=await fetch('/api/source-verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:w.name,url}),signal:AbortSignal.timeout(50000)});
  if(!response.ok)continue;const verification=await response.json();
  let candidate={url,title:w.name+' 출처 확인',query:w.name,searchedAt:new Date().toISOString(),verification};
  const currentAsset=projects.find(p=>p.id===w.projectId)?.assets.find(a=>a.id===w.assetId);
  if(!currentAsset||JSON.stringify(currentAsset)!==w.signature)continue;
  const previous=currentAsset.sourceCandidates?.find(s=>s.url===url&&s.query===w.name);if(previous?.verification?.text&&verification.documents?.length)candidate={...previous,verification:{...previous.verification,documents:verification.documents,attemptedAt:verification.attemptedAt}};
  const updated=supplementCodeLicense({...currentAsset,sourceCandidates:cleanCandidates([candidate,...candidates,...(currentAsset.sourceCandidates||[])])});
  if(!transact(state=>{const p=state.projects.find(p=>p.id===w.projectId),i=p?.assets.findIndex(a=>a.id===w.assetId);if(i>=0)p.assets[i]=updated;}))break;
  completed++;render();
 }catch{/* Network failures never replace existing evidence. */}}
 repositorySupplementBusy=false;
 if(completed){render();message(`기존 자료 ${completed}개의 출처 확인을 진행했습니다. 적용 범위와 남은 확인 사항을 결과에서 확인하세요.`);}
}
supplementRegisteredRepositories();

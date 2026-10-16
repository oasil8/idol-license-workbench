from pathlib import Path
p=Path('dist/app.mjs');s=p.read_text(encoding='utf-8')
s="import {selectionOf,selectionLabels,selectedAssets,projectSummary,commitChange} from './workflow.mjs';\n"+s
s=s.replace("import {reportHtml}","import {buildProjectReport}")
s=s.replace("view='inventory'","view='intake'",1)
# transaction boundary used by project creation, import and selection
at=s.index('const badge=')
s=s[:at]+'''function transact(change){
 const state={projects,trash,current};
 try{commitChange(state,change,next=>{projects=next.projects;trash=next.trash;current=next.current;return save();});return true;}
 catch(error){projects=state.projects;trash=state.trash;current=state.current;message(error.message,true);return false;}
}
'''+s[at:]
s=s.replace("const counts={conditions:0,review:0,conflict:0};p.assets.forEach(a=>counts[commercialVerdict(a,p.context).status]++);","const summary=projectSummary(p),counts=summary.counts;")
s=s.replace('${p.assets.length}<small>개 항목</small>', '${summary.assets.length}<small>개 항목</small>',1)
# replace row html line only
start=s.index(" $('assetRows').innerHTML=rows.map")
end=s.index("\n $('empty')",start)
s=s[:start]+''' $('assetRows').innerHTML=rows.map(a=>`<tr><td><button class="asset-name" data-edit="${a.id}">${esc(a.name)}</button><small>${esc(a.version||'버전 미기록')}</small>${mentionLabel(a)}</td><td>${esc(kinds[a.kind])}</td><td><code>${esc(a.license||'미확인')}</code><small>${a.terms?'약관 기록 있음':a.evidence?.trim()?'근거 입력됨':'근거 추가 필요'}</small></td><td><select data-selection="${a.id}" aria-label="${esc(a.name)} 사용 여부">${Object.entries(selectionLabels).map(([key,label])=>`<option value="${key}" ${selectionOf(a)===key?'selected':''}>${label}</option>`).join('')}</select></td><td><button class="row-open" data-edit="${a.id}">정보·근거 수정</button></td></tr>`).join('');
 $('selectionSummary').textContent=`실제 사용 ${summary.assets.length}개 · 선택 전 ${summary.pending}개 · 대안/제외 ${p.assets.length-summary.assets.length-summary.pending}개`;
''' +s[end:]
start=s.index(" const overall=counts.conflict?")
end=s.index('\n renderProjects();',start)
s=s[:start]+''' const overall=summary.status;
 $('overall').innerHTML=`<div><span class="eyebrow">현재 프로젝트 · 상용 사용 결론</span><h2>${statuses[overall]}</h2><p>${counts.conflict?`${counts.conflict}개 사용 자료가 상용 조건과 충돌합니다.`:summary.pending?`${summary.pending}개 자료의 실제 사용 여부를 먼저 선택하세요.`:!summary.assets.length?'실제 사용할 자료가 선택되지 않았습니다.':counts.review?`${counts.review}개 사용 자료의 근거·필수 조건을 보완하세요.`:'선택한 자료의 표시된 조건을 이행해야 합니다.'}</p><small>실제 사용 ${summary.assets.length}개에 대한 잠정 결과 · 선택 전 ${summary.pending}개 · 출시 승인이 아닙니다.</small></div>`;
 $('overall').className='overall '+overall;''' +s[end:]
start=s.index('function renderReport(){');end=s.index('\ndocument.querySelectorAll',start)
s=s[:start]+'''function renderReport(){const p=project(),assets=selectedAssets(p),tasks=projectTasks(p);
 $('reportContent').innerHTML=(tasks.length?`<details class="project-task-summary"><summary>공통 확인사항 ${tasks.length}개</summary><ul>${tasks.map(t=>`<li>${esc(t.task)} · ${t.count}개 자료</li>`).join('')}</ul></details>`:'')+assets.map(a=>`<details class="report-item result-card"><summary><strong>${esc(a.name)}</strong>${badge(commercialVerdict(a,p.context))}<span>근거 보기</span></summary><div class="result-detail">${assessment(a)}<button class="outline" data-edit="${a.id}">정보 보완</button></div></details>`).join('');
}
function setView(next){view=next;for(const v of ['intake','inventory','report','guide'])$(v+'View').hidden=v!==view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});$('viewSubtitle').textContent={intake:'파일을 가져오거나 이름으로 검색해서 자료를 등록하세요.',inventory:'각 자료를 실제 사용, 대안 보관, 사용 안 함으로 분류하세요.',report:'실제 사용하는 자료의 결론과 근거를 확인하세요.',guide:'사용 순서와 판정 기준을 확인하세요.'}[view];$('pageLabel').textContent={intake:'1. 자료 넣기',inventory:'2. 실제 사용할 것 선택',report:'3. 결과 확인',guide:'사용법·판정 기준'}[view];}
$('assetRows').addEventListener('change',e=>{const id=e.target.dataset.selection;if(!id)return;const value=e.target.value;if(!Object.hasOwn(selectionLabels,value))return;transact(state=>{state.projects.find(p=>p.id===state.current).assets.find(a=>a.id===id).selection=value;});render();});
$('reportContent').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)openAsset(b.dataset.edit);};
''' +s[end:]
s=s.replace("return {...data,id:editing", "return {...(project().assets.find(a=>a.id===editing)||{}),...data,selection:data.selection||'used',sourceConditionsConfirmed:f.elements.sourceConditionsConfirmed.checked,id:editing")
s=s.replace("{kind:ai?'ai':'code',rights:","{kind:ai?'ai':'code',selection:'used',rights:")
# retain extracted license in dialog
s=s.replace('${sourceReviewPanel(a)}${termsPanel(a)}', '${sourceReviewPanel(a)}${termsPanel(a)}${a.licenseDocument?`<details><summary>추출한 라이선스 원문 · ${esc(a.licenseDocument.name)}</summary><pre class="preserve">${esc(a.licenseDocument.text)}</pre></details>`:""}')
# project creation transaction
start=s.index(' function addProject(p){');end=s.index("\n $('newForm')",start)
s=s[:start]+''' function addProject(p){
 const ok=transact(state=>{
  const found=state.projects.find(x=>projectFingerprint(x)===projectFingerprint(p));if(found){state.current=found.id;return;}
  if(state.projects.length>=50)throw Error('프로젝트는 최대 50개입니다.');
  const candidate=structuredClone(p),base=p.name;let n=2;
  while(state.projects.some(x=>x.name===candidate.name))candidate.name=`${base} (${n++})`;
  state.projects.push(candidate);state.current=candidate.id;
 });
 render();if(!ok)return undefined;setView('intake');return project();
 }''' +s[end:]
s=s.replace("addProject(fresh(name));$('newDialog').close();e.target.reset();", "if(addProject(fresh(name))){$('newDialog').close();e.target.reset();}")
# replace report exporter
start=s.index(" $('exportReport').onclick=");end=s.index("\n $('sourceLinks')",start)
s=s[:start]+" $('exportReport').onclick=()=>download('license-review.html',buildProjectReport(project()),'text/html;charset=utf-8');"+s[end:]
# staged scan: no saving or rendering until entire import succeeds
s=s.replace('async function scan(files){if(busy)return;busy=true;const p=project(),log=[]', 'async function scan(files,p){if(busy)throw Error("다른 가져오기가 진행 중입니다.");busy=true;const log=[]')
s=s.replace("version:'',...a,id:crypto.randomUUID()", "version:'',...a,selection:'pending',id:crypto.randomUUID()",1)
s=s.replace("save();render();message(`탐지 완료: ${added}개 항목 등록. 상세 결과에서 원문과 출처를 확인하세요.`,failed>0);return {added,failed};", "return {added,failed};")
s=s.replace("p.scan=`선택 ${total}", "p.scan=(p.scan?p.scan+'\\n':'')+`선택 ${total}")
s=s.replace("const {documents,assets,ignored}=splitImportFiles(files);", "const original=project(),originalId=original.id,fingerprint=projectFingerprint(original);\n   const {documents,assets,ignored}=splitImportFiles(files);")
s=s.replace("if(documents.length)await readAssignment(documents);\n   const scanned=assets.length?await scan(assets):{added:0,failed:0};", "const staged=documents.length?await readAssignment(documents):structuredClone(original);\n   const scanned=assets.length?await scan(assets,staged):{added:0,failed:0};\n   if(!transact(state=>{const index=state.projects.findIndex(p=>p.id===originalId);if(index<0||projectFingerprint(state.projects[index])!==fingerprint)throw Error('읽는 동안 프로젝트가 변경됐습니다. 기존 기록을 유지했으니 다시 가져오세요.');state.projects[index]=staged;state.current=originalId;}))throw Error('저장 실패로 가져오기를 취소했습니다. 기존 기록은 유지했습니다.');\n   render();")
s=s.replace("setView(documents.length?'report':'inventory');\n   if(documents.length){$('reportView').scrollIntoView({block:'start'});await refreshTerms();}", "setView('inventory');")
s=s.replace("assets=p.assets.filter(a=>a.kind==='ai'", "assets=selectedAssets(p).filter(a=>a.kind==='ai'")
s=s.replace("if(project().assignment)setView('report');", "setView(project().assets.length?'inventory':'intake');")
# only input status filter in selection screen
start=s.index(" $('statusFilter').innerHTML=");end=s.index('\n',start)
s=s[:start]+" $('statusFilter').innerHTML='<option value=\"all\">모든 자료</option>'+Object.entries(selectionLabels).map(([k,v])=>`<option value=\"${k}\">${v}</option>`).join('');"+s[end:]
start=s.index(".filter(a=>filter==='all'||(Object.hasOwn(statuses,filter)");end=s.index(';',start)
s=s[:start]+".filter(a=>filter==='all'||selectionOf(a)===filter)"+s[end:]
# preserve explicit state on update; source conditions attestation invalidated by changes
s=s.replace("$('assetForm').oninput=updateForm;", "$('assetForm').oninput=e=>{if(['provider','planType','scope','version','plan','useDescription','repository','evidence'].includes(e.target.name))$('assetForm').elements.sourceConditionsConfirmed.checked=false;updateForm();};")
p.write_text(s,encoding='utf-8')

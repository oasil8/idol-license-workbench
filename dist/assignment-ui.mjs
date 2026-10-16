import {isLicenseDocument,licenseAsset} from './import-files.mjs';
import {reviewAssignment,validateAssignment,candidateAssets} from './assignment.mjs';
import {extractFile} from './extract-file.mjs';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function assignmentMarkup(assignment){
 if(!assignment)return '<div class="report-empty">아직 검토 자료가 없습니다. 발표자료와 피드백을 함께 선택하면 도구 후보와 보완 체크리스트를 확인할 수 있습니다.</div>';
 const {candidates,checklist,checklistTitle}=reviewAssignment(assignment.documents);
 const warnings=assignment.documents.flatMap(d=>(d.warnings||[]).map(w=>`${d.name}: ${w}`));
 return `<div class="assignment-overview"><h2>자료 ${assignment.documents.length}개 · 검토 후보 ${candidates.length}개</h2><p>텍스트에서 이름을 찾는 규칙 기반 검토입니다. 대안·추천으로 언급된 도구도 포함하며, 실제 사용 여부와 버전·플랜은 항목에서 보완하세요. 실제 사용할 자료를 2단계에서 선택한 뒤, 항목별 권리·출처는 3단계 결과 확인에서 확인하세요. 문서 내용은 분석 자료로만 취급합니다.</p></div>
 ${warnings.length?`<details class="assignment-warnings"><summary>읽지 못한 범위와 추출 안내 ${warnings.length}건</summary><ul>${warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}
 ${checklist.length?`<h2 class="assignment-section-title">${esc(checklistTitle)}</h2><p class="muted">저장된 문서의 텍스트와 유형에 따라 구성한 보완 질문입니다. AI가 새로 작성한 문서 요약이나 완료 판정은 아닙니다. 문서 추가·역할 변경 및 화면 갱신 시 다시 계산하며, 사용 목적 변경은 자료별 라이선스 결과에 반영됩니다. 외부 약관을 자동으로 새로 가져오지는 않습니다.</p><div class="assignment-checklist">${checklist.map(c=>`<article><h3>${esc(c.title)}</h3><p>${esc(c.detail)}</p></article>`).join('')}</div>`:''}
 <h2 class="assignment-section-title">피드백과 추출 원문</h2><p class="muted">파일명에 ‘피드백’ 또는 ‘feedback’이 있으면 피드백으로 분류합니다. 실제 문서 역할에 맞게 바꿀 수 있습니다. 스케치 이미지와 도형은 원본에서 직접 확인하세요.</p>
 ${assignment.documents.map((d,i)=>`<details class="assignment-source"><summary>${esc(d.name)} · ${d.locations?.length||1}개 페이지/문단 · ${d.role==='feedback'?'피드백':'검토 자료'}</summary><label>문서 역할<select aria-label="${esc(d.name)} 문서 역할" data-assignment-role="${i}"><option value="material" ${d.role!=='feedback'?'selected':''}>검토 자료</option><option value="feedback" ${d.role==='feedback'?'selected':''}>피드백·대안 제안</option></select></label>${(d.locations?.length?d.locations:[{label:'텍스트 원문',start:0,end:d.text.length}]).map(l=>`<h4>${esc(l.label)}</h4><pre>${esc(d.text.slice(l.start,l.end))}</pre>`).join('')}</details>`).join('')}`;
}
export function renderAssignment(p){
 $('assignmentResults').innerHTML=assignmentMarkup(p.assignment);
 $('documentReviewSection').hidden=!p.assignment;
 $('documentReviewCount').textContent=p.assignment?`문서 ${p.assignment.documents.length}개`:'';
}
export function assignmentReportText(assignment){
 if(!assignment)return '';
 const r=reviewAssignment(assignment.documents);
 return '\n## 검토 자료 검토\n\n텍스트 기반 후보 탐지와 보완 질문입니다. 설계·권리 검증 또는 자동 채점 결과가 아닙니다.\n\n'+r.candidates.map(c=>`- ${c.name}: ${c.references.map(s=>`${s.fileName} / ${s.label}${s.role==='feedback'?' (피드백·대안 포함)':''}`).join(', ')}`).join('\n')+'\n\n'+r.checklist.map(c=>`### ${c.title}\n\n${c.detail}`).join('\n\n')+'\n\n'+assignment.documents.map(d=>`### ${d.name} — ${d.role==='feedback'?'피드백':'검토 자료'}\n\n${d.text}\n\n${(d.warnings||[]).join('\n')}`).join('\n\n')+'\n';
}
export function setupAssignment({project,save,render,extract=extractFile}){
 $('assignmentResults').onchange=e=>{
  const index=e.target.dataset.assignmentRole;if(index===undefined)return;
  const d=project().assignment.documents[Number(index)],previous=d.role;d.role=e.target.value;
  if(!save()){d.role=previous;render();return;}render();
 };
 return async function readAssignment(files,base=project()){
  if(!files.length||files.length>20)throw Error('문서 자료는 1~20개 선택하세요.');
  if(files.reduce((n,f)=>n+f.size,0)>60*1024*1024)throw Error('문서 자료 합계는 최대 60MB입니다.');
  const documents=[],licenseAssets=[];let totalText=0;
  for(const [i,file] of files.entries()){
   $('importProgress').textContent=`문서 읽는 중 ${i+1}/${files.length} · ${file.name}`;
   let result;try{result=await extract(file,{assignment:true});}catch(e){throw Error(file.name+' — '+e.message);}
   totalText+=result.text.length;if(totalText>500000)throw Error('추출 문서 합계는 최대 500,000자입니다.');
   if(isLicenseDocument(file.name))licenseAssets.push(licenseAsset(file,result));
   else documents.push({name:file.webkitRelativePath||file.name,role:/피드백|feedback/i.test(file.name)?'feedback':'material',...result});
  }
  const p=structuredClone(base);
  if(documents.length){
   const previous=p.assignment?.documents||[];
   const all=[...previous];for(const d of documents)if(!all.some(x=>x.name===d.name&&x.text===d.text))all.push(d);
   p.assignment=validateAssignment({documents:all});
   const candidates=candidateAssets(reviewAssignment(documents).candidates);
   for(const a of candidates)if(!p.assets.some(x=>x.name===a.name&&x.kind===a.kind))p.assets.push(a);
  }
  for(const a of licenseAssets)if(!p.assets.some(x=>x.licenseDocument?.name===a.licenseDocument.name&&x.licenseDocument.text===a.licenseDocument.text))p.assets.push(a);
  if(p.assets.length>5000)throw Error('프로젝트당 최대 5,000개 항목입니다.');
  p.scan=`문서 ${files.length}개를 읽었습니다. 새 후보는 선택 전 상태이며 추출한 원문은 브라우저와 백업에 저장합니다.`;

  return p;
 };
}

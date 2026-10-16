from pathlib import Path
p=Path('dist/report.mjs');s=p.read_text(encoding='utf-8');s="import {projectSummary,selectionOf,selectionLabels} from './workflow.mjs';\nimport {evaluate,commercialVerdict,statuses} from './core.mjs';\nimport {assetSources,sourceTypes} from './evidence-sources.mjs';\nimport {reviewAssignment} from './assignment.mjs';\n"+s
s+='''
export function buildProjectReport(p){
 const summary=projectSummary(p),c=p.context;
 const paragraph=text=>`<p>${esc(text)}</p>`;
 const list=items=>items.length?'<ul>'+[...new Set(items)].map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p>추가 항목 없음</p>';
 const raw=(label,text)=>`<details><summary>${esc(label)}</summary><pre>${esc(text||'')}</pre></details>`;
 let body=`<h1>${esc(p.name)} — 라이선스 검토</h1><p>작성: ${esc(new Date().toISOString())}</p><section><h2>프로젝트 상용 결론: ${esc(statuses[summary.status])}</h2>`;
 body+=paragraph(`실제 사용 ${summary.assets.length}개 · 선택 전 ${summary.pending}개 · 대안/제외 ${p.assets.length-summary.assets.length-summary.pending}개`);
 body+=paragraph(`사용 목적: ${{steam:'Steam 출시',enterprise:'기업 사용·납품',conference:'학회·논문',research:'연구'}[c.platform]} / 상업 목적: ${c.commercial?'예':'아니요'} / 외부 배포: ${c.distribute?'예':'아니요'} / 수정: ${c.modified?'예':'아니요'} / 네트워크 서비스: ${c.network?'예':'아니요'}`);
 body+=paragraph('실제 사용으로 선택한 자료만 판정했습니다. 선택 전 항목이 남으면 전체 결론은 보류합니다. 조건부 결과는 의무 이행을 전제로 하며 출시 승인이나 법률 의견이 아닙니다.')+'</section>';
 for(const a of summary.assets){
  const r=commercialVerdict(a,c),purpose=evaluate(a,c),t=a.terms;
  body+=`<section data-material><h2>${esc(a.name)}</h2><h3>결론</h3>`+paragraph(`상용: ${statuses[r.status]} / 현재 목적: ${statuses[purpose.status]}`)+list(r.notes);
  body+=paragraph(`버전: ${a.version||'미기록'} / 라이선스: ${t?.license||a.license||'미확인'} / 플랜: ${a.plan||a.planType||'미기록'} / 생성·구매일: ${a.date||'미기록'}`);
  if(a.kind==='ai')body+=paragraph(`서비스: ${a.serviceName||a.provider||'미기록'} / 이용 범위: ${a.scope||'미기록'} / 결과물: ${a.outputType||'미기록'} / 이용 설명: ${a.useDescription||'미기록'}`);
  body+='<h3>확인할 조건</h3>'+list([...r.tasks,...purpose.tasks]);
  body+='<h3>근거와 출처</h3>'+raw('기록한 근거',a.evidence)+raw('검토 메모',a.notes);
  if(t){body+=paragraph(`약관 확인: ${t.checkedAt||'미확보'} / 마지막 시도: ${t.attemptedAt||'미기록'} / 문서 날짜: ${t.documentDate||'미기록'} / ${t.method==='manual'?'직접 입력 · 출처 미검증':'자동 조회 기록'}`);
   body+=paragraph(t.summary||'');if(t.error)body+=paragraph('조회 실패: '+t.error);if(t.imported)body+=paragraph('백업에서 가져온 약관입니다. 재확인이 필요합니다.');if(t.revision)body+=paragraph('모델 리비전: '+t.revision);
   body+=list(t.excerpts||[]);if(t.originalText)body+=raw('약관 원문 · '+(t.fileName||'직접 입력'),t.originalText);
  }
  if(a.licenseDocument){body+=raw('추출한 라이선스 원문 · '+a.licenseDocument.name,a.licenseDocument.text);body+=list(a.licenseDocument.warnings||[]);}
  body+=assetSources(a,c).map(s=>`<article><p>${inline(`[${s.label}](${s.url})`)} · ${esc(sourceTypes[s.type])}${s.date?' · '+esc(s.date):''}</p>${paragraph(s.note)}${s.scope?paragraph('적용 범위: '+s.scope):''}${s.clause?paragraph('확인 부분: '+s.clause):''}</article>`).join('');
  body+='</section>';
 }
 const omitted=p.assets.filter(a=>selectionOf(a)!=='used');
 if(omitted.length)body+='<details><summary>판정에 포함하지 않은 자료</summary>'+list(omitted.map(a=>`${a.name}: ${selectionLabels[selectionOf(a)]}`))+'</details>';
 if(p.assignment){const review=reviewAssignment(p.assignment.documents);body+='<section><h2>문서 피드백</h2>'+list(review.checklist.map(x=>x.title+' — '+x.detail));
  for(const d of p.assignment.documents)body+=raw(d.name+' · 추출 원문',d.text)+list(d.warnings||[]);body+='</section>';
 }
 body+=raw('탐지 기록',p.scan);
 const shell=reportHtml('# '+String(p.name).replace(/[\\r\\n]/g,' ')+' — 라이선스 검토');
 const start=shell.indexOf('<main>')+6,end=shell.indexOf('<footer>');
 return shell.slice(0,start)+body+shell.slice(end);
}
''';p.write_text(s,encoding='utf-8')
p=Path('dist/assignment-ui.mjs');s=p.read_text(encoding='utf-8');s="import {isLicenseDocument,licenseAsset} from './import-files.mjs';\n"+s
s=s.replace('const documents=[];','const documents=[],licenseAssets=[];let totalText=0;')
s=s.replace("documents.push({name:file.webkitRelativePath||file.name,role:/피드백|feedback/i.test(file.name)?'feedback':'material',...result});", "totalText+=result.text.length;if(totalText>500000)throw Error('추출 문서 합계는 최대 500,000자입니다.');\n   if(isLicenseDocument(file.name))licenseAssets.push(licenseAsset(file,result));\n   else documents.push({name:file.webkitRelativePath||file.name,role:/피드백|feedback/i.test(file.name)?'feedback':'material',...result});")
start=s.index('  const assignment=validateAssignment({documents}),review=')
end=s.index('\n  return p;',start)
s=s[:start]+'''  const p=structuredClone(project());
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
''' +s[end:]
p.write_text(s,encoding='utf-8')

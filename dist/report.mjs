import {installReportPrint,reportPrintCss} from './print-report.mjs';
import {brandIcon,brandIconCss} from './brand-icons.mjs';
import {reviewStampMarkup,permissionMarkup,outcomeReason,resultItems} from './result-sections.mjs';
import {evidenceMarkup} from './document-text.mjs';
import {verificationMarkup} from './source-search.mjs';
import {conditionsConfirmed,conditionsPrompt,projectSummary,summaryReason,selectionOf,selectionLabels} from './workflow.mjs';
import {evaluate,commercialVerdict,statuses,projectTasks,RULE_DATE} from './core.mjs';
import {assetSources,sourceTypes,sourceGroup} from './evidence-sources.mjs';
import {reviewAssignment} from './assignment.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(value){
 const links=[];
 const text=String(value).replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g,(_,label,target,bare)=>{
  const url=target||bare;
  try{const parsed=new URL(url);if(parsed.username||parsed.password)return label||url;}catch{return label||url;}
  links.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label||url)}</a>`);
  return `\u0000${links.length-1}\u0000`;
 });
 return esc(text).replace(/\u0000(\d+)\u0000/g,(_,i)=>links[Number(i)]);
}
export function reportHtml(markdown){
 const lines=String(markdown).replace(/^\ufeff/,'').replace(/\r/g,'').split('\n');
 const title=lines.find(x=>x.startsWith('# '))?.slice(2)||'라이선스 검토 보고서';
 let html='',paragraph=[],list=false,section=false;
 const flush=()=>{if(paragraph.length){html+='<p>'+paragraph.map(inline).join('<br>')+'</p>';paragraph=[];}if(list){html+='</ul>';list=false;}};
 for(let i=0;i<lines.length;i++){
  let line=lines[i];
  if(/^### .+ — (과제 자료|피드백)$/.test(line)){
   flush();const raw=[];while(i+1<lines.length&&!/^#{1,3} /.test(lines[i+1]))raw.push(lines[++i]);
   html+=`<details><summary>${esc(line.slice(4))} · 추출 원문</summary><pre>${esc(raw.join('\n').trim())}</pre></details>`;continue;
  }
  if(line.startsWith('근거: ')){
   flush();html+='<p class="citation">'+inline(line)+'</p>';const raw=[];
   while(i+1<lines.length&&lines[i+1].trim()&&!/^(메모:|#{1,3} )/.test(lines[i+1]))raw.push(lines[++i]);
   if(raw.length)html+=`<details><summary>문서에서 추출한 발췌문</summary><pre>${esc(raw.join('\n'))}</pre></details>`;continue;
  }
  const heading=line.match(/^(#{1,3}) (.*)$/);
  if(heading){flush();const level=heading[1].length;if(level===2){if(section)html+='</section>';html+='<section>';section=true;}html+=`<h${level}>${inline(heading[2])}</h${level}>`;continue;}
  if(!line.trim()){flush();continue;}
  line=line.replace(/\btrue\b/g,'예').replace(/\bfalse\b/g,'아니요').replace(/플랜:\s*(?=\/|$)/g,'플랜: 미정 ').replace(/날짜:\s*$/,'날짜: 미기록');
  if(line.startsWith('- ')){if(paragraph.length)flush();if(!list){html+='<ul>';list=true;}html+='<li>'+inline(line.slice(2))+'</li>';}
  else {if(list)flush();paragraph.push(line);}
 }
 flush();if(section)html+='</section>';
 return '\ufeff'+`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>
 *{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#243244;font:16px/1.8 "Malgun Gothic","Apple SD Gothic Neo",sans-serif}main{max-width:980px;margin:48px auto;padding:40px;background:white;border-top:6px solid #245b78;border-radius:8px}h1{font-size:27px;line-height:1.5;color:#163d54;margin:0 0 24px}h2{font-size:21px;margin:0 0 16px;color:#163d54}h3{font-size:17px;margin:24px 0 8px}section{border-top:1px solid #dbe2e8;margin-top:28px;padding-top:26px}p{margin:12px 0;overflow-wrap:anywhere}li{margin:7px 0}a{color:#17618e;text-decoration:underline;overflow-wrap:anywhere}.citation{border-left:3px solid #91afc2;padding-left:12px;color:#516477}details{margin:14px 0;padding:12px 16px;background:#f5f7fa;border:1px solid #e0e6ed;border-radius:6px}summary{cursor:pointer;color:#40566c}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.8 "Malgun Gothic",sans-serif;color:#526173}footer{border-top:1px solid #dbe2e8;margin-top:32px;padding-top:18px;font-size:13px;color:#66778a}@media(max-width:700px){main{margin:0;padding:24px}h1{font-size:23px}}@media print{body{background:white}main{margin:0;padding:0;border:0;max-width:none}h2,h3{break-after:avoid}details{display:none}a{color:inherit}p,li{orphans:3;widows:3}}
 </style></head><body><main>${html}<footer>발췌문은 PDF의 배치와 추출 순서에 따라 문장이 끊길 수 있습니다. 접힌 원문과 원본 자료를 함께 확인하세요. 이 파일은 내보낸 시점의 검토 기록입니다.</footer></main></body></html>`;
}

export function buildProjectReport(p){
 if(!conditionsConfirmed(p))return reportHtml('# '+p.name+'\n\n'+conditionsPrompt+'\n\n2단계에서 사용 조건을 확인하고 적용하세요.');
 const summary=projectSummary(p),c=p.context;
 const paragraph=text=>`<p>${esc(text)}</p>`;
 const sourceLink=source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a>`;
 const list=items=>items.length?'<ul>'+[...new Set(items)].map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p>추가 항목 없음</p>';
 const raw=(label,text)=>`<details><summary>${esc(label)}</summary><pre>${esc(text||'')}</pre></details>`;
 const badge=status=>`<span class="report-badge ${status}">${esc(statuses[status])}</span>`;
 const results=summary.assets.map(a=>evaluate(a,c));
 let body=`<div class="report-heading" id="report-top"><p class="report-kicker">IDOL LICENSE WORKBENCH · 검토 리포트</p><h1>${esc(p.name)}</h1><p class="report-date">작성: ${esc(new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date()))} (한국 시간)</p></div><section class="report-cover"><h2>현재 사용 목적의 결론: ${badge(summary.status)}</h2>`;
 body+=paragraph(summaryReason(summary));
 body+=paragraph(`실제 사용 ${summary.assets.length}개 · 선택 전 ${summary.pending}개 · 대안/제외 ${p.assets.length-summary.assets.length-summary.pending}개`);
 body+=paragraph(`사용 목적: ${{general:'일반 이용 · 직접 설정',steam:'Steam 출시',enterprise:'기업 사용·납품',conference:'학회·논문',research:'연구'}[c.platform]} / 상업 목적: ${c.commercial?'예':'아니요'} / 외부 배포: ${c.distribute?'예':'아니요'} / 수정: ${c.modified?'예':'아니요'} / 네트워크 서비스: ${c.network?'예':'아니요'}`);
 body+=paragraph(`결과: 사용 가능 ${summary.counts.conditions}개 · 판단 보류 ${summary.counts.review}개 · 현재 조건으로 사용 불가 ${summary.counts.conflict}개 / 검토 규칙 기준일: ${RULE_DATE}`);
 body+=paragraph('실제 사용으로 선택한 자료만 검토했습니다. 선택 전 항목이 남으면 전체 결론은 보류합니다. 조건부 결과는 의무 이행을 전제로 하며 출시 승인이나 법률 의견이 아닙니다.')+'</section>';
 body+='<section class="result-legend"><h2>결과를 읽는 방법</h2><dl><dt>사용 가능 (조건부)</dt><dd>이용 허용 근거가 있습니다. 표시된 고지·배포 등 의무를 이행하세요.</dd><dt>판단 보류</dt><dd>허용 여부를 결정할 핵심 근거나 적용 정보가 부족합니다.</dd><dt>현재 조건으로 사용 불가</dt><dd>선택한 이용 방식이 명시된 제한과 충돌합니다. 이용 방식을 바꾸거나 별도 허가가 필요합니다.</dd></dl><p>상표·초상·입력 자료 등 별도 권리 확인은 라이선스상 결과와 구분합니다.</p></section>';
 body+=`<section class="report-index"><h2>자료별 결과 한눈에 보기</h2><p>자료 이름을 누르면 해당 결과로 이동합니다. 확인 필요 사항은 사용 불가와 구분합니다.</p><div class="report-table-wrap"><table><thead><tr><th scope="col">자료</th><th scope="col">현재 결과</th><th scope="col">결과 이유</th></tr></thead><tbody>${summary.assets.map((a,i)=>{const r=results[i];return `<tr><td><a href="#material-${i}">${brandIcon(a)}${esc(a.name)}</a></td><td>${badge(r.status)}</td><td>${esc(outcomeReason(a,r))}</td></tr>`;}).join('')||'<tr><td colspan="3">실제 사용으로 선택한 자료가 없습니다.</td></tr>'}</tbody></table></div></section>`;
 const commonTasks=projectTasks(p);
 if(commonTasks.length)body+='<details class="common-tasks"><summary>공통 확인사항 '+commonTasks.length+'개</summary>'+list(commonTasks.map(item=>item.task+' ('+item.count+'개 자료)'))+'</details>';
 for(const [materialIndex,a] of summary.assets.entries()){
  const r=results[materialIndex],purpose=commercialVerdict(a,c),t=a.terms,{conditions,checks}=resultItems(r);
  body+=`<section data-material id="material-${materialIndex}" class="material-report"><div class="material-heading"><div><p class="report-kicker">자료 ${materialIndex+1}</p><h2 class="brand-name">${brandIcon(a)}${esc(a.name)}</h2></div>${badge(r.status)}</div>`;
  body+=reviewStampMarkup(r,esc);
  if(r.evidenceMethod==='manual')body+='<p class="evidence-origin">직접 입력한 약관 기준 · 공식 출처 자동 검증 아님</p>';
  if(r.status!==purpose.status)body+=`<p class="comparison">상업 이용으로 바꾸면: ${esc(statuses[purpose.status])}</p>`+list(purpose.notes);
  body+='<div class="material-overview">'+permissionMarkup(a,r,esc)+'<section class="report-conditions"><h3>지켜야 할 조건</h3>'+list(conditions)+'</section><section class="report-checks"><h3>확인 필요한 부분</h3>'+list(checks)+'</section></div>';
  const citations=assetSources(a,c);
  body+='<section class="report-citations"><h3>근거·출처 요약</h3>'+citations.map(source=>`<p><strong>${esc(sourceGroup(source))}</strong> · ${sourceLink(source)}${source.date?' · '+esc(source.date):''}<span class="print-url">${esc(source.url)}</span>${source.scope?'<br>적용 범위: '+esc(source.scope):''}</p>`).join('')+(citations.length?'':'<p>등록된 출처 링크가 없습니다. 상세 근거에서 입력한 원문을 확인하세요.</p>')+'</section>';
  body+='<details class="material-evidence"><summary>상세 근거·출처·원문 보기</summary><div class="evidence-body">';
  body+='<h3>결과 설명</h3>'+list(r.notes);
  const metadata=[['검토 범위',({code:'코드·오픈소스 자체',model:'모델·가중치',service:'서비스·API 계약',bundle:'패키지·번들 전체'}[a.reviewScope]||a.reviewScope)],['비영리 기관 조건',a.license==='LicenseRef-OpenSees'?(a.nonprofitEntityConfirmed?'교육·연구·비영리 기관 해당 확인':'해당 여부 미확인'):''],['버전',a.version],['라이선스',t?.license||a.license],['플랜',a.plan||({free:'무료',paid:'일반 유료',business:'기업·별도 계약'}[a.planType])],['생성·구매일',a.date],['결과물 종류',({code:'코드',text:'텍스트·문서',image:'이미지·디자인',model:'3D 모델',audio:'음악·음성',video:'영상',data:'데이터',other:'기타'}[a.outputType]||a.outputType)],['이용 설명',a.useDescription]].filter(([,v])=>v);
  if(metadata.length)body+='<dl class="report-metadata">'+metadata.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>';
  if(a.kind==='ai')body+=paragraph(`서비스: ${a.serviceName||a.provider||'미기록'} / 이용 범위: ${{output:'생성 결과물',service:'API·서비스 연동',weights:'모델 가중치',training:'학습·미세조정',other:'기타'}[a.scope]||'미확인'}`);
  body+='<h3>근거와 출처</h3>'+(a.evidence?raw('기록한 근거',a.evidence):'')+(a.notes?raw('검토 메모',a.notes):'');
  if(t){body+=paragraph(`약관 확인: ${t.checkedAt||'미확보'} / 마지막 시도: ${t.attemptedAt||'미기록'} / 문서 날짜: ${t.documentDate||'미기록'} / ${t.method==='manual'?'직접 입력 · 출처 미검증':'자동 조회 기록'}`);
   body+=paragraph(t.summary||'');if(t.error)body+=paragraph('조회 실패: '+t.error);if(t.imported)body+=paragraph('백업에서 가져온 약관입니다. 재확인이 필요합니다.');if(t.revision)body+=paragraph('모델 리비전: '+t.revision);
   if(t.method==='manual'&&t.originalText){
    const evidence=evidenceMarkup(t,esc),seen=new Set(),prefix=`terms-${materialIndex}-`;
    body+=evidence.quotes.replace(/<button type="button" class="evidence-jump" data-evidence="(\d+)">([^<]*)<\/button>/g,(_,i,label)=>` <a href="#${prefix}${i}">${label}</a>`);
    const original=evidence.original.replace(/data-evidence-mark="(\d+)"/g,(_,i)=>{if(seen.has(i))return '';seen.add(i);return `id="${prefix}${i}"`;});
    body+=`<details><summary>약관 원문 · ${esc(t.fileName||'직접 입력')}</summary>${original}</details>`;
   }else{body+=list(t.excerpts||[]);if(t.originalText)body+=raw('약관 원문 · '+(t.fileName||'직접 입력'),t.originalText);}
  }
  if(a.licenseDocument){const document=a.licenseDocument;body+=raw('추출한 라이선스 원문 · '+document.name,document.text);if(document.locations?.length)body+='<details><summary>라이선스 원문 위치별 보기</summary>'+document.locations.map(location=>'<h4>'+esc(location.label)+'</h4><pre>'+esc(document.text.slice(location.start,location.end))+'</pre>').join('')+'</details>';body+=list(document.warnings||[]);}
  body+=paragraph('원문 확인 기록은 해당 자료의 사용 허가 확정과 다릅니다. 참고 링크는 결과 근거로 자동 적용하지 않습니다.');
  body+=citations.map(s=>`<article><p><strong>${esc(sourceGroup(s))}</strong></p><p>${sourceLink(s)} · ${esc(sourceTypes[s.type])}${s.date?' · '+(s.type==='suggested'?'주소 확인일: ':s.type==='candidate'?'검색일: ':'기록일: ')+esc(s.date):''}</p>${paragraph(s.note)}${s.scope?paragraph('적용 범위: '+s.scope):''}${s.clause?paragraph('확인 부분: '+s.clause):''}${verificationMarkup(s.verification,esc,a)}</article>`).join('');
  body+='</div></details><a class="back-to-index" href="#report-top">↑ 결과 요약으로</a></section>';
 }
 const omitted=p.assets.filter(a=>selectionOf(a)!=='used');
 if(omitted.length)body+='<details><summary>검토에 포함하지 않은 자료</summary>'+list(omitted.map(a=>`${a.name}: ${selectionLabels[selectionOf(a)]}`))+'</details>';
 if(p.assignment){const review=reviewAssignment(p.assignment.documents);body+='<section><h2>문서 피드백</h2><h3>'+esc(review.checklistTitle)+'</h3>'+list(review.checklist.map(x=>x.title+' — '+x.detail));
  for(const candidate of review.candidates)body+='<h3>'+esc(candidate.name)+' · 문서에서 찾은 후보</h3>'+list(candidate.references.map(ref=>ref.fileName+' · '+ref.label+' · '+ref.excerpt));
  for(const d of p.assignment.documents)body+=paragraph(d.name+' · '+(d.role==='feedback'?'피드백':'검토 자료'))+raw(d.name+' · 추출 원문',d.text)+(d.locations?.length?'<details><summary>원문 위치별 보기</summary>'+d.locations.map(location=>'<h4>'+esc(location.label)+'</h4><pre>'+esc(d.text.slice(location.start,location.end))+'</pre>').join('')+'</details>':'')+list(d.warnings||[]);body+='</section>';
 }
 body+=raw('탐지 기록',p.scan);
 const shell=reportHtml('# '+String(p.name).replace(/[\r\n]/g,' ')+' — 라이선스 검토');
 const start=shell.indexOf('<main>')+6,end=shell.indexOf('<footer>');
 const design=`<style>${brandIconCss}
 .result-legend{font-size:13px}.result-legend h2{font-size:17px}.result-legend dl{display:grid;grid-template-columns:180px 1fr;gap:10px 16px}.result-legend dt{font-weight:700}.result-legend dd{margin:0}.print-url{display:none}.report-citations{padding:14px 18px;margin-top:18px;background:#f7faf9;border:1px solid #dbe5e0;border-radius:9px;font-size:13px}.report-citations h3{margin:0 0 10px}.report-citations p{overflow-wrap:anywhere}body{background:#f1f5f4;color:#213a34;font:15px/1.75 "Segoe UI","Malgun Gothic",sans-serif}main{max-width:1120px;padding:40px 44px;border-top:5px solid #087f74}h1{font-size:30px;line-height:1.4;margin:8px 0 12px;color:#163f38}h2{font-size:21px;line-height:1.5;color:#163f38}h3{font-size:16px;line-height:1.5;color:#163f38}p{margin:10px 0}.report-kicker{font-size:12px;font-weight:700;letter-spacing:.06em;color:#5b766c;margin:0}.report-date{font-size:13px;color:#60766b}.report-cover{background:#edf6f2;border:1px solid #d2e5dc;border-radius:12px;padding:24px;margin:26px 0}.report-cover h2{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.report-cover p:last-child{font-size:13px;color:#536b60}.report-badge{display:inline-block;border-radius:6px;padding:5px 10px;font-size:13px;font-weight:700;line-height:1.6;white-space:normal}.report-badge.conditions{background:#dcefe5;color:#175b3b}.report-badge.review{background:#fff0c8;color:#715315}.report-badge.conflict{background:#fbe2df;color:#8b302b}.report-table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th{background:#edf3f0;font-weight:700}td,th{padding:14px 12px;border-bottom:1px solid #dbe5e0;vertical-align:top}td:first-child{width:28%;font-weight:600}td:nth-child(2){width:23%}.material-report{margin-top:36px;padding-top:28px;scroll-margin-top:20px}.material-heading{display:flex;gap:18px;align-items:center;justify-content:space-between}.material-heading h2{margin:4px 0 12px}.material-overview{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.material-overview>section{margin:0;padding:20px;border:1px solid #dbe5e0;border-radius:9px;min-width:0}.material-overview>.permission-section{grid-column:1/-1;background:#f4f8f6}.material-overview h3{margin:0 0 12px}.material-overview ul{margin:0;padding-left:20px}.material-overview li{margin:8px 0}.report-checks{background:#fffdf6}.evidence-origin,.comparison{font-size:13px;color:#596c62}.material-evidence{margin-top:18px;background:#fafcfb}.material-evidence>summary{font-weight:600;padding:4px 0}.evidence-body{padding:16px 4px}.evidence-body article{padding:14px 0;border-top:1px solid #dbe5e0}.report-metadata{display:grid;grid-template-columns:120px 1fr;gap:8px}.report-metadata dt{font-weight:600}.report-metadata dd{margin:0;overflow-wrap:anywhere}.back-to-index{display:inline-block;font-size:13px;margin-top:12px}a{color:#096b64}blockquote{margin:12px 0;border-left:3px solid #81aaa0;padding:10px 14px;background:#f1f6f4;white-space:pre-wrap;overflow-wrap:anywhere}pre{font-size:13px}footer{font-size:12px}
 @media(max-width:700px){.result-legend dl{grid-template-columns:1fr;gap:4px}.result-legend dd{margin-bottom:10px}main{padding:24px 18px;margin:0;border-radius:0}h1{font-size:24px}.material-overview{display:block}.material-overview>section{margin:12px 0}.material-heading{display:block}.report-cover{padding:18px}td,th{padding:10px 8px}table{min-width:520px}.report-metadata{grid-template-columns:1fr}.report-metadata dd{margin-bottom:8px}}
 @media print{@page{margin:16mm}body{background:white;font-size:11pt}main{max-width:none;margin:0;padding:0;border:0}.report-heading{margin-bottom:20px}.report-index table{min-width:0;font-size:9pt}thead{display:table-header-group}tr{break-inside:avoid}.material-report{break-before:auto;margin-top:20px;padding-top:18px}.report-cover,.result-legend{break-inside:avoid}.material-overview{display:block}.material-overview>section{margin:12px 0;padding:14px}.material-heading{break-after:avoid}.material-overview h3{break-after:avoid}.back-to-index{display:none}.report-badge{border:1px solid currentColor;background:white!important}.material-evidence{display:none}.print-url{display:block;font-size:8pt;color:#43574f;overflow-wrap:anywhere}.report-citations{font-size:9pt;padding:12px}.report-citations p{break-inside:avoid}footer:before{content:"인쇄본은 결과·조건·적용 범위와 보관된 원문 부록을 포함합니다. ";font-weight:600}}
 ${reportPrintCss}</style>`;
 return (shell.slice(0,start)+body+shell.slice(end)).replace('</head>',design+'</head>').replace('</body>',`<script>(${installReportPrint.toString()})(document.querySelector('main'));</script></body>`);
}

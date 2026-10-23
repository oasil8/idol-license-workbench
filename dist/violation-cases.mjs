import {normalizeLicense} from './license-normalization.mjs';
// Display-only references: these records never participate in evaluation.
export const caseDisclaimer='사례는 이해를 돕기 위한 참고이며, 실제 결과는 국가·계약·사실관계에 따라 다릅니다. 법률 의견이 아닙니다.';
export const violationCases=[
 {id:'A',title:'오픈소스 조건(고지·소스 제공) 위반',summary:'오픈소스도 조건을 지키지 않으면 저작권 침해나 계약 위반으로 소송이 될 수 있습니다.',entries:[
  {text:'Jacobsen v. Katzer (미국 연방항소법원, 2008) — Artistic License의 저작자 표시 등 조건을 어기면 저작권 침해가 될 수 있다고 판단. 2010년 합의.',url:'https://www.crowell.com/en/insights/client-alerts/in-rare-copyright-decision-federal-circuit-affirms-enforceability-of-open-source-license-conditions'},
  {text:'Artifex v. 한글과컴퓨터 (미국 캘리포니아 북부지방법원, 2017) — Ghostscript를 소스 공개·상용 라이선스 없이 한컴오피스에 넣었다는 소송. GPL의 계약상 강제 가능성을 인정해 기각 신청을 받아들이지 않았고, 2017년 12월 비공개 조건으로 합의.',pdfText:'Artifex v. 한글과컴퓨터 (2017) — GPL의 계약상 강제 가능성을 인정해 기각 신청 거부. 2017년 12월 비공개 조건으로 합의.',url:'https://artifex.com/blog/artifex-and-hancom-reach-settlement-over-ghostscript-open-source-dispute'}]},
 {id:'B',title:'허락 범위 밖 저작물 사용(무단 에셋, 비상업 자료의 상업 이용 등)',pdfTitle:'허락 범위 밖 저작물 사용',summary:'한국에서는 형사처벌 조항이 있고, 민사 손해배상과 판매 중단이 따로 생길 수 있습니다.',entries:[
  {text:'한국 저작권법 제136조 제1항 — 저작재산권을 복제·배포·공중송신·2차적저작물 작성 등으로 침해하면 5년 이하 징역 또는 5천만원 이하 벌금(함께 부과 가능). 링크에서 조문 원문을 확인하세요.',pdfText:'저작권법 제136조 제1항 — 저작재산권 침해: 5년 이하 징역 또는 5천만원 이하 벌금(함께 부과 가능). 조문 원문을 확인하세요.',url:'https://www.law.go.kr/법령/저작권법'},
  {text:'Steam — 권리자가 저작권 침해 신고(DMCA)를 하면 Valve가 해당 콘텐츠를 내릴 수 있고, 반론 절차가 있습니다.',url:'https://steamcommunity.com/dmca/create/'}]},
 {id:'C',title:'AI 서비스 약관 위반',summary:'약관은 계약입니다. 위반 시 계정 정지·이용 권리 상실·손해배상 청구가 생길 수 있으며 구체적 결과는 서비스 약관에 따릅니다.',entries:[{text:'공개된 판결 사례는 이 앱에 기록하지 않았습니다. 각 자료의 약관 기록에 있는 원문 링크를 확인하세요.'}]}
];

export function projectViolationCases(items){
 const names={A:[],B:[],C:[]};
 for(const {a,r} of items){
  const obligations=(r.tasks||[]).join(' '),reasons=[...(r.blockers||[]),...(r.conflicts||[]),...(r.notes||[])].join(' ');
  const openSource=/^(MIT|BSD-|Apache-|ISC$|PSF-|Zlib$|BSL-|EPL-|[AL]?GPL-|MPL-|OFL-)/i.test(normalizeLicense(r.sourceLicense||a.license)||'')||a.kind==='code';
  if(openSource&&/고지|저작권|소스.*(제공|공개)|카피레프트|동일.*라이선스/.test(obligations+' '+(r.blockers||[]).join(' ')))names.A.push(a.name);
  if(r.status==='conflict'||r.status==='review'&&(/비상업|상업.*제한|이용 허락|사용 허가|허용 범위|재배포.*제한|수정.*금지/.test(reasons)||['image','model','audio','data','other'].includes(a.kind)&&/라이선스.*(미확인|미기록|기록되지)|적용 라이선스의 사용 허가/.test(reasons)))names.B.push(a.name);
  if(a.kind==='ai')names.C.push(a.name);
 }
 return violationCases.filter(c=>names[c.id].length).map(c=>({...c,names:[...new Set(names[c.id])]}));
}
export function violationCasesMarkup(items,esc){
 const cases=projectViolationCases(items);if(!cases.length)return '';
 return '<details class="report-item violation-cases"><summary>위반하면 어떤 일이 생기나요? (실제 사례)</summary>'+cases.map(c=>`<section><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p>${c.entries.map(e=>`<p>${esc(e.text)}${e.url?` <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">출처</a>`:''}</p>`).join('')}<p>해당 자료: ${esc(c.names.join(', '))}</p></section>`).join('')+`<p>${caseDisclaimer}</p></details>`;
}

import {planImpact} from './ai.mjs';
// Search results are discovery candidates, never license evidence.
export function documentDate(text){return String(text||'').match(/(?:Last (?:Updated|Revised)|Effective Date|Updated(?: on)?|최종 수정일|시행일)\s*:?\s*((?:[A-Za-z]+ \d{1,2},? \d{4})|(?:\d{1,2}\s+[A-Za-z]+\s+\d{4})|(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}))/i)?.[0]||'';}
export function candidateUrl(value){
 try{const u=new URL(value),host=u.hostname.toLowerCase();
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||!host.includes('.')||host.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||/\.(localhost|local|internal|test|invalid)$/.test(host))return undefined;
  u.hash='';return u.href;
 }catch{return undefined;}
}
export function cleanCandidates(value,{imported=false}={}){
 if(!Array.isArray(value))return [];
 const seen=new Set(),rows=[];
 for(const item of value.slice(0,10)){
  if(!item||typeof item!=='object')continue;
  const url=candidateUrl(item.url);if(!url||url.length>2000||seen.has(url))continue;
  const query=typeof item.query==='string'?item.query.slice(0,200):'';
  const searchedAt=typeof item.searchedAt==='string'&&Number.isFinite(Date.parse(item.searchedAt))?item.searchedAt.slice(0,40):'';
  if(!query||!searchedAt)continue;
  seen.add(url);rows.push({url,title:typeof item.title==='string'?item.title.slice(0,300):new URL(url).hostname,query,searchedAt,verification:cleanVerification(item.verification,{url,query,imported})});
 }
 return rows;
}
export const sourceSearchName=a=>String(a.kind==='ai'?(a.serviceName||a.name||''):(a.name||'')).trim();

export function cleanVerification(v,{url,query,imported=false}={}){
 if(!v||typeof v!=='object'||v.url!==url||v.query!==query)return undefined;
 const string=(key,max)=>typeof v[key]==='string'?v[key].slice(0,max):'';
 const text=string('text',80000),out={status:v.status==='matched'?'matched':'candidate',url,query,reason:string('reason',600),attemptedAt:string('attemptedAt',40),checkedAt:string('checkedAt',40),text,title:string('title',300),documentKind:string('documentKind',100),contractDate:string('contractDate',120)||documentDate(text),hash:string('hash',64),truncated:!!v.truncated,imported:imported||!!v.imported};
 if(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','MPL-2.0','ISC','GPL-3.0','GPL-2.0'].includes(v.licenseKey)){out.licenseKey=v.licenseKey;out.repositoryId=string('repositoryId',200);out.publishedVersion=string('publishedVersion',100);out.sourceRef=string('sourceRef',200);}
 for(const key of ['basisUrl','homepage','finalUrl'])out[key]=candidateUrl(v[key])||'';
 let total=0;
 out.documents=Array.isArray(v.documents)?v.documents.slice(0,14).filter(d=>d&&candidateUrl(d.url)).map(d=>{const text=String(d.text||'').slice(0,80000);total+=text.length;return {url:candidateUrl(d.url),title:String(d.title||'추가 약관').slice(0,300),text:total<=360000?text:'',status:d.status==='matched'?'matched':'candidate',checkedAt:String(d.checkedAt||'').slice(0,40),contractHash:String(d.contractHash||'').slice(0,64),contractDate:String(d.contractDate||documentDate(text)).slice(0,120),truncated:!!d.truncated||String(d.text||'').length>80000||total>360000,imported:imported||!!v.imported||!!d.imported,error:String(d.error||'').slice(0,300)};}):[];
 out.excerpts=Array.isArray(v.excerpts)?v.excerpts.slice(0,3).filter(e=>e&&Number.isInteger(e.start)&&e.start>=0&&typeof e.text==='string'&&e.text.length<=450&&text.slice(e.start,e.start+e.text.length)===e.text).map(e=>({start:e.start,text:e.text})):[];
 return out;
}
export function verificationLabel(s,name=s.query,now=Date.now()){
 const v=s.verification;if(!v)return '검색 후보 · 확인 전';
 if(v.query!==name)return '검색 후보 · 이름 변경 후 재확인 필요';
 const checked=Date.parse(v.checkedAt);
 if(v.imported||!Number.isFinite(checked)||now-checked>7*86400000||checked>now+60000)return '검색 후보 · 재확인 필요';
 return v.status==='matched'?'공식 주소 대조 · 원문 확보':v.text?'검색 후보 · 공식성 미확인·원문 확보':'검색 후보 · 확인 전';
}


// These are clause-finding rules, not a full contract interpretation engine.
export function koreanTermsSummary(v,a={},now=Date.now()){
 const text=v?.text||'',items=[],seen=new Set();
 const rules=[
  [/non[ -]commercial|비상업|상업적?\s*(?:이용|사용).{0,30}(?:금지|불가)/i,'비상업적 이용 또는 상업 이용 제한 조항입니다. 적용 대상과 예외를 확인하세요.'],
  [/commercial(?:ly)? (?:use|exploit)|상업적?\s*(?:이용|사용)/i,'상업 이용 범위를 정한 조항입니다. 허용 대상과 전제 조건을 함께 확인하세요.'],
  [/\b(?:free|basic) (?:plan|tier)|무료\s*(?:플랜|요금제)/i,'무료 플랜에 별도 조건이 있습니다. 생성 당시 플랜에 적용되는지 확인하세요.'],
  [/\b(?:paid (?:customer|user|plan|subscriber)|pro (?:or|and) premier)|유료\s*(?:플랜|요금제)/i,'유료 플랜에 관한 권리·조건입니다. 결제 여부와 생성 당시 적용 범위를 확인하세요.'],
  [/\bremix(?:es|ing)?\b/i,'리믹스에는 별도 조건이 있을 수 있습니다. 일반 생성물과 같은 허가로 간주하지 마세요.'],
  [/\b(?:permitted|authorized) download\b/i,'허용된 방식의 다운로드가 조건에 포함됩니다. 실제 취득 경로를 확인하세요.'],
  [/\b(?:attribution|credit (?:us|the|to))\b|저작자\s*표시|출처\s*표시/i,'저작자·출처 표시 관련 조항입니다. 표시 대상과 방식을 확인하세요.'],
  [/\b(?:third.party rights|rights (?:in|to) (?:the |your )?input)\b|제3자.{0,20}권리/i,'입력 자료·제3자 권리 관련 조항입니다. 별도 권리 확인이 필요합니다.']
 ];
 // Preserve complete sentences: never cut a qualification off a long clause.
 const sentences=[...text.matchAll(/[^.!?\n]+(?:[.!?](?=\s|$)|$)/g)].map(m=>({text:m[0].trim(),start:m.index+m[0].indexOf(m[0].trim())})).filter(e=>e.text.length>=25&&e.text.length<=1600);
 for(const [pattern,summary]of rules){const e=sentences.find(e=>pattern.test(e.text)&&!seen.has(e.start));if(e){let ko=summary;
 if(/personal.{0,30}non[ -]commercial|non[ -]commercial use only/i.test(e.text))ko='이 조항의 대상은 개인·비상업적 이용으로 제한됩니다.';
 if(/free (?:or basic )?(?:plan|tier)/i.test(e.text)&&/non[ -]commercial/i.test(e.text))ko='무료 플랜 결과물은 이 조항에서 비상업적 이용으로 제한합니다.';
 if(/attribution is required/i.test(e.text))ko='배포할 때 저작자·출처 표시가 필요합니다.';
 items.push({summary:ko,...e});seen.add(e.start);}}
 const reasons=[];
 if(!v||verificationLabel({query:v.query,verification:v},sourceSearchName(a),now)!=='공식 주소 대조 · 원문 확보')reasons.push('공식 출처를 재확인해야 합니다.');
 if(!text)reasons.push('확보한 원문이 없습니다.');
 if(v?.truncated)reasons.push('원문 일부만 보관되어 누락된 예외가 있을 수 있습니다.');
 if(a.kind==='ai'&&(!a.planType||['unknown','business'].includes(a.planType)))reasons.push(planImpact(a,now).status==='affected'?'플랜 또는 별도 계약이 미확인입니다.':'플랜 영향과 적용 계약 확인이 필요합니다.');
 if(a.kind==='ai'&&a.scope!=='output')reasons.push('이용 방식에 적용되는 계약을 확인해야 합니다.');
 if(!a.date)reasons.push('생성·구매 시점의 약관 적용 여부가 미확인입니다.');
 if(!a.sourceConditionsConfirmed)reasons.push('자료에 적용되는 조건 확인이 남아 있습니다.');
 if(!items.length)reasons.push('지원하는 표현으로 요약할 수 있는 조항을 찾지 못했습니다.');
 // Finding permission words cannot establish all exceptions or asset applicability.
 reasons.push('자동 요약만으로 계약의 모든 예외와 사용 허가를 확정하지 않습니다.');
 return {status:'review',items,reasons};
}
function summaryMarkup(v,a,esc){
 if(!v.text)return '';
 const s=koreanTermsSummary(v,a);
 return `<section class="terms-korean-summary"><h4>상업적 사용 · 한국어 요약</h4><p>무료 규칙 기반 조항 요약 · 최종 결과는 자료의 결과 표시를 확인하세요.</p><details><summary>원문 적용 시 확인할 사항</summary><ul>${s.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details>${s.items.map(e=>`<article><p>${esc(e.summary)}</p><details><summary>원문 근거 보기</summary><blockquote>${esc(e.text)}</blockquote><small>보관한 원문 ${e.start+1}자 위치 · </small><a href="${esc(candidateUrl(v.finalUrl||v.url)||'#')}" target="_blank" rel="noopener noreferrer">원문 웹사이트 열기 ↗</a></details></article>`).join('')}<small>발견한 조항만 요약합니다. 전체 번역이 아니며, 후보 출처는 요약 후에도 후보로 남습니다.</small></section>`;
}

export function verificationMarkup(v,esc,a={}){
 if(!v)return '';
 const link=(url,label)=>url?`<p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}: ${esc(url)}</a></p>`:'';
 return `<details class="verification-record"><summary>자동 확인 결과·근거</summary><p>${esc(v.reason)}</p><p>시도: ${esc(v.attemptedAt||'미기록')} · 원문 확보: ${esc(v.checkedAt||'미확보')}</p>${v.contractDate?`<p>문서에 명시된 날짜: ${esc(v.contractDate)} · 실제 이용 시점과 별도</p>`:''}${v.publishedVersion?`<p>배포처 공개 버전: ${esc(v.publishedVersion)} · 실제 사용 버전을 자동 지정한 것은 아닙니다.</p>`:''}${v.sourceRef?`<p>라이선스 확인 참조: ${esc(v.sourceRef)}</p>`:''}${link(v.basisUrl,'주소 대조 출처')}${link(v.homepage,'대조한 홈페이지')}${link(v.finalUrl,'확인한 원문 주소')}${v.documents?.length?'<p>일반·추가 약관을 함께 대조한 결론은 위의 결과에 표시합니다. 아래는 문서별 원문 보관 기록입니다.</p>':summaryMarkup(v,a,esc)}${(v.documents||[]).length?`<details><summary>연결된 일반·추가 약관 ${(v.documents||[]).length}개</summary>${v.documents.map(d=>`<details><summary>${esc(d.title||d.url)} · ${d.text?'원문 확보':'조회 필요'}</summary><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">공식 원문 ↗</a><p>${esc(d.contractDate||d.checkedAt||'')} ${esc(d.error||'')}</p><pre>${esc(d.text||'')}</pre></details>`).join('')}</details>`:''}${v.text?`<p>${esc(v.documentKind)} · 사용 허가를 판정한 것은 아닙니다.</p><h4>원문에서 찾은 문구</h4>${v.excerpts.length?v.excerpts.map(e=>`<blockquote>${esc(e.text)}<small> · 추출 텍스트 ${e.start+1}자 위치</small></blockquote>`).join(''):'<p>관련 문구를 자동 추출하지 못했습니다.</p>'}<details><summary>확보한 원문 텍스트${v.truncated?' · 앞 80,000자만 보관':''}</summary><pre>${esc(v.text)}</pre></details><small>텍스트 SHA-256: ${esc(v.hash)}</small>`:''}</details>`;
}

// Ranking is a discovery hint, never an official-site verification.
export function rankCandidates(rows,officialUrls=[]){
 const scope=url=>{const u=new URL(url),host=u.hostname.replace(/^www\./,''),parts=u.pathname.split('/').filter(Boolean);if(['github.com','huggingface.co'].includes(host)){const length=host==='huggingface.co'&&['datasets','spaces'].includes(parts[0])?3:2;return host+'/'+parts.slice(0,length).join('/').toLowerCase();}return host;};
 const official=new Set(officialUrls.flatMap(url=>{try{return [scope(url)];}catch{return [];}}));
 const score=r=>{const u=new URL(r.url);return (official.has(scope(r.url))?100:0)+(/terms|license|licence|legal|약관|라이선스/i.test(u.pathname+' '+r.title)?30:0)+(u.pathname==='/'?15:0);};
 return [...rows].sort((a,b)=>score(b)-score(a));
}

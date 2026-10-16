import {officialDomains,isOfficialCandidate} from './source-policy.mjs';
import {officialRecord} from './official-sources.mjs';
import {contractProfile} from './contract-review.mjs';
import {analyzeTerms} from './terms-analysis.mjs';
export const providerNames={openai:'OpenAI / ChatGPT · 개인용',anthropic:'Anthropic / Claude · 개인용',meshy:'Meshy',tripo:'Tripo',huggingface:'Hugging Face 모델',other:'다른 서비스 · 수동 검토'};
export function queryKey(a){return JSON.stringify([a.provider||'',a.planType||'unknown',a.scope||'output',a.repository||'',...(a.contractRoute?['contract:'+a.contractRoute]:[]),...(a.apiAccessConfirmed===true?['api-access-confirmed']:[]),...(a.serviceName||a.outputType||a.useDescription?[a.serviceName||'',a.outputType||'',a.useDescription||'']:[])]);}
const officialTermsUrls={
 tripo:['https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially'],
 meshy:['https://www.meshy.ai/terms-of-use','https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained'],
 openai:['https://openai.com/policies/row-terms-of-use/'],
 anthropic:['https://www.anthropic.com/legal/consumer-terms'],
 copilot:['https://docs.github.com/en/site-policy/github-terms/github-terms-of-service','https://github.com/customer-terms/github-generative-ai-services-terms'],
 midjourney:['https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service'],
 runway:['https://help.runwayml.com/hc/en-us/articles/21668707517587-Can-I-use-the-content-I-made-in-Runway-for-commercial-purposes','https://runwayml.com/terms-of-use/']
};
function verifiedTerms(a,now){
 const provider=officialTermsUrls[a.provider]?a.provider:({'tripo':'tripo','meshy':'meshy','openai':'openai','chatgpt':'openai','claude':'anthropic','anthropic':'anthropic'})[String(a.serviceName||a.name||'').trim().toLowerCase()];
 if(!['output','service'].includes(a.scope))return undefined;
 const name=String(a.serviceName||a.name||'').trim();
 for(const s of a.sourceCandidates||[]){if(officialDomains(name).length&&!isOfficialCandidate(name,s.url))continue;const v=s.verification,checked=Date.parse(v?.checkedAt);
  if(!v||v.status!=='matched'||v.imported||v.truncated||!v.text||v.query!==name||v.url!==s.url||(provider&&!officialTermsUrls[provider].includes(v.url))||(v.finalUrl&&v.finalUrl!==v.url)||!Number.isFinite(checked)||now-checked>7*86400000||checked>now+60000)continue;
  const result=analyzeTerms({...a,provider:provider||'other',manual:!provider,sourceUrl:v.url},v.text);
  return {...result,sourceUrl:v.url,sourceName:'공식 주소 대조 · 확보한 원문',checkedAt:v.checkedAt,queryKey:queryKey(a),verifiedProvider:provider,verifiedSource:true};
 }
}
// Reviewed public help article, not a live fetch or user attestation.
function publicOutputTerms(a,now){
 const provider=officialTermsUrls[a.provider]?a.provider:a.provider==='other'?({'runway':'runway','runway ml':'runway','런웨이':'runway','midjourney':'midjourney','미드저니':'midjourney','github copilot':'copilot','깃허브 코파일럿':'copilot'})[String(a.serviceName||a.name||'').trim().toLowerCase()]:undefined;
 const checkedAt=(officialRecord(provider)?.observedOn||'')+'T00:00:00+09:00';
 if(!provider||a.scope!=='output'||a.selection==='pending'||a.sourceCandidates?.length||a.terms||a.repository||a.version||(a.planType==='business'&&provider!=='copilot')||/community|커뮤니티|타인|다른 사람|evaluation|preview|평가판|미리보기|경쟁.*(?:모델|서비스)|competing/i.test(a.useDescription||'')||now<Date.parse(checkedAt))return;
 const common=['금지 콘텐츠·입력 자료의 권리·서비스 이용 정책을 준수하세요.','현재 공개 안내의 생성물 범위입니다. 과거 생성물·별도 계약·외부 콘텐츠의 적용 여부는 따로 확인하세요.'];
 let analysis;
 if(provider==='meshy')analysis=analyzeTerms(a,'if you are a paid customer, you own the assets created through our platform. If you are on a free plan, we grant you a CC BY 4.0 license instead.');
 else if(provider==='copilot'){
  const route=a.contractRoute||(a.planType==='free'?'personal':'');
  const supported=['personal','github-business'].includes(route);
  analysis={status:supported?'conditions':'review',summary:supported?'선택한 GitHub 계약은 출력물 소유권을 주장하지 않으며 제품에 포함한 출력물 이용을 다룹니다. 제3자 코드 라이선스 준수 조건으로 이용 가능합니다.':(route==='microsoft'?'Microsoft 구매 경로의 Copilot 적용 약관·허용 범위 확인이 필요합니다.':'Copilot 계약 경로가 필요합니다: 개인용 / GitHub 직접 기업 구매 / Microsoft 구매.'),conditions:['제안 코드의 기존 오픈소스 라이선스·저작권 고지를 확인하고 적용 의무 준수','사용 전 코드의 정확성·보안·기능을 검토하고 이용 정책 준수'],checks:['입력 코드의 기밀성·개인정보와 계약별 학습·보관 설정을 확인하세요.'],excerpts:[route==='github-business'?'GitHub does not own Inputs or Outputs.':'GitHub does not claim ownership of your Input or Output.']};
 }else if(provider==='midjourney'){
  analysis={status:'review',summary:'Midjourney 생성물 권리는 확인했지만, 연 매출 100만 달러 초과 회사·직원의 Pro/Mega 조건과 직접 생성 여부가 미확인입니다.',conditions:[],checks:['회사·직원의 매출 기준 해당 여부와 생성 당시 Pro/Mega 플랜을 확인하세요. 타인의 이미지 업스케일은 원 제작자의 권리입니다.'],excerpts:['You own all Assets You create with the Services']};
 }else if(provider==='tripo'){
  if(a.planType!=='paid')return;
  analysis={status:'conditions',summary:'유료 플랜에서 직접 생성한 Tripo 모델은 상업 이용·수정·배포가 허용됩니다.',conditions:['생성 당시 유료 플랜의 적용을 유지·증빙하세요.','생성물을 이용한 경쟁 3D 생성 서비스 제작과 무단 서비스 재제공을 하지 마세요.'],excerpts:['Paid Users have full rights to use, modify, distribute, and commercially exploit all 3D models']};
 }else {
  const grants={openai:['개인용 ChatGPT 출력물은 권리 조항에 따라 이용이 허용됩니다. API·기업 계약은 별도입니다.','you (a) retain your ownership rights in Input and (b) own the Output'],anthropic:['일반 Claude 개인용 출력물은 권리 양도 조항에 따라 이용이 허용됩니다. 평가용 서비스는 별도입니다.','we assign to you all of our right, title, and interest—if any—in Outputs'],runway:['Runway에서 직접 만든 콘텐츠는 상업 이용이 허용되며 출력물에 Runway 출처 표시를 요구하지 않습니다. API 연동 조건은 별도입니다.','the content you create using Runway is yours to use without any non-commercial restrictions from us.']};
  const grant=grants[provider];if(!grant)return;
  analysis={status:'conditions',summary:grant[0],excerpts:[grant[1]],conditions:provider==='anthropic'?['Claude 서비스·출력물을 경쟁 제품·서비스 제작이나 AI 모델 학습에 이용하지 마세요.']:provider==='openai'?['출력물을 OpenAI와 경쟁하는 모델 개발에 이용하지 말고, 정확성과 적합성을 확인하세요.']:[]};
 }
 return {...analysis,conditions:[...analysis.conditions,...common],checkedAt,queryKey:queryKey(a),sourceUrl:officialTermsUrls[provider][provider==='meshy'||provider==='copilot'&&a.contractRoute==='github-business'?1:0],sourceName:'공식 공개 안내 · '+checkedAt.slice(0,10)+' 검토 기록',builtIn:true,verifiedProvider:provider,method:'public-review'};
}
export function aiResult(a,now=Date.now()){
 let t=a.terms?.method==='manual'?a.terms:(!a.terms||a.terms.error||a.terms.queryKey!==queryKey(a)||(a.terms.status==='review'&&a.terms.method!=='manual'&&!a.terms.imported))?(verifiedTerms(a,now)||a.terms):a.terms;t ||= publicOutputTerms(a,now);let status='review',notes=[],tasks=[],sources=[],humanChecks=[];
 if(t?.method==='manual'){const original=String(t.originalText||'');const analysis=analyzeTerms({...a,manual:true,sourceUrl:t.sourceUrl},original.replace(/\s+/g,' ').trim());t={...t,...analysis,summary:analysis.summary.replace('조회한 공식 문서','직접 입력한 약관')};if(original.trim().length<40)t.status='review';}
 if(!t){const captured=(a.sourceCandidates||[]).some(s=>s.verification?.text);notes.push(captured?'후보 원문은 확보했지만 이 이용 방식의 허용 범위·적용 조건이 아직 확정되지 않았습니다.':'최신 약관을 아직 조회하지 않았습니다.');tasks.push(captured?'확보한 원문의 허용 조항·적용 범위를 확인하고 필요한 계약 정보를 보완':a.provider==='other'?'공식 참고 링크에서 약관을 확인하고 원문·적용 플랜을 기록':'서비스·플랜을 지정하고 최신 약관 조회 실행');if(a.rights!=='cleared')humanChecks.push('입력 자료·상표·초상·음성 등 실제 자료의 추가 권리는 별도 확인이 필요합니다.');return {status,notes,tasks,sources,humanChecks};}
 const sourceName=a.serviceName||a.name;if(t.sourceUrl&&officialDomains(sourceName).length&&!isOfficialCandidate(sourceName,t.sourceUrl))return {status:'review',notes:['비공식 해설은 허용 근거로 사용할 수 없습니다.'],tasks:['공식 도메인의 원문을 확인하세요.'],sources:[],humanChecks:[]};
 if(/^https:\/\//.test(t.sourceUrl||''))sources.push([t.sourceName||'공식 문서',t.sourceUrl]);
 const stale=!t.checkedAt||!Number.isFinite(Date.parse(t.checkedAt))||(!t.builtIn&&now-Date.parse(t.checkedAt)>7*86400000)||Date.parse(t.checkedAt)>now+60000;
 if(t.error)notes.push('조회 실패: '+t.error);
 else if(t.method==='manual'&&!t.attested)notes.push('직접 입력한 문서의 전체 내용과 적용 범위를 확인하세요.');
 else if(t.imported)notes.push('가져온 조회 기록입니다. 이 기기에서 다시 조회하거나 직접 입력 약관을 재검토하세요.');
 else if(t.queryKey!==queryKey(a))notes.push('서비스·플랜·검토 대상이 변경되어 재조회가 필요합니다.');
 else if(stale)notes.push('조회 결과가 없거나 7일 이상 지났습니다. 최신 약관을 다시 확인하세요. 직접 입력 기록도 재검토해야 합니다.');
 else {status=['conditions','conflict'].includes(t.status)?t.status:'review';notes.push(t.summary||'허가 조항 확인 필요');}
 tasks.push(...(t.conditions||[]));humanChecks.push(...(t.checks||[]));
 const contractConfirmed=status==='conditions'&&['output','service'].includes(a.scope)&&t.excerpts?.length>0&&(t.method==='manual'?t.attested===true&&!!t.originalText:(t.verifiedSource===true||(officialTermsUrls[t.verifiedProvider||a.provider]||[]).includes(t.sourceUrl)));
 if(status==='conditions'&&a.rights!=='cleared'){if(contractConfirmed)humanChecks.push('입력 자료·상표·초상·음성 등 제3자 권리: 실제 자료를 기준으로 별도 확인해야 합니다. 약관상 허용만으로 이 권리가 확보되지는 않습니다.');else{status='review';notes.push('입력·제3자 권리 또는 원문 출처의 확인이 필요합니다.');tasks.push('입력 자료와 제3자 권리 확인을 기록');}}
 if(contractConfirmed&&t.method==='manual'){humanChecks.push('직접 입력한 원문의 공식 출처·최신성·전체 내용 여부를 확인하세요. 사이트에서 자동 확보한 문서가 아닙니다.');notes.push('사용자가 제공하고 적용 여부를 확인한 원문에 근거한 결과입니다. 공식 출처의 자동 검증과는 구분됩니다.');}
 if(t.method==='public-review')notes.push(t.checkedAt.slice(0,10)+'에 검토한 공식 공개 안내를 적용했습니다. 이 항목에서 실시간 조회한 기록은 아닙니다.');
 if(contractConfirmed){humanChecks.push('선택한 플랜·계약과 실제 자료의 취득·이용 조건이 일치하는지 확인하고, 표시 의무와 서비스 이용 정책을 이행하세요.');notes.push('서비스 약관상 허용 범위에 대한 결과입니다. 실제 자료의 제3자 권리 확인은 아래에 별도로 표시합니다.');}
 if(status==='conditions'&&a.provider==='huggingface'&&(!a.confirmed||!a.evidence?.trim())){status='review';notes.push('모델 게시자의 권한과 원본 LICENSE 적용 범위를 직접 확인하세요.');}
 return {status,notes,tasks,sources,humanChecks,reviewedEvidence:t.method==='public-review'||t.verifiedSource?t:undefined,permissions:!t.error&&!t.imported&&!stale&&t.queryKey===queryKey(a)?t.permissions||[]:[],contractConfirmed,evidenceMethod:t.method==='manual'?'manual':t.method==='public-review'?'public-review':'automatic'};
}
export function cleanTerms(t,{imported=false}={}){
 if(!t||typeof t!=='object')return undefined;
 const out={};for(const key of ['provider','planType','scope','repository','attemptedAt','checkedAt','status','summary','sourceUrl','sourceName','documentDate','license','hash','error','revision','queryKey','method','fileName'])if(typeof t[key]==='string')out[key]=t[key].slice(0,key==='summary'||key==='error'?2000:key==='queryKey'?1600:700);
 if(t.method==='manual'){out.originalText=typeof t.originalText==='string'?t.originalText.slice(0,200000):'';out.attested=t.attested===true;out.locations=Array.isArray(t.locations)?t.locations.filter(l=>l&&typeof l.label==='string'&&Number.isInteger(l.start)&&Number.isInteger(l.end)&&l.start>=0&&l.end>=l.start&&l.end<=out.originalText.length).slice(0,5000).map(l=>({label:l.label.slice(0,100),start:l.start,end:l.end})):[];}
 for(const key of ['conditions','permissions','checks'])out[key]=Array.isArray(t[key])?t[key].filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,1000)):[];
 out.excerpts=Array.isArray(t.excerpts)?t.excerpts.filter(x=>typeof x==='string').slice(0,3).map(x=>x.slice(0,1000)):[];
 out.imported=imported||!!t.imported;return out;
}
// Public terms checked 2026-10-15. This classifies the need for a plan, not permission.
const planEvidence={
 recraft:{reviewedOn:'2026-10-15',names:['recraft','리크래프트','레크래프트'],reason:'직접 생성한 무료 자료의 상업 이용 제한과 유료 자료의 권리 조건이 다릅니다. 공유 자료·API에는 별도 범위가 적용됩니다.',url:'https://www.recraft.ai/legal/terms',section:'7.1 Free Tier / 7.2 Paid Subscription / 7.3 Programmatic Access',quote:'no commercial use of Free Tier Assets is permitted'},
 tripo:{reviewedOn:'2026-10-15',names:['tripo','트리포'],reason:'무료·유료에 따라 결과물의 상업 이용 권한이 달라집니다.',url:'https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially',section:'Free vs Paid Plans',quote:'If you need commercial use rights, upgrade to a paid plan.'},
 meshy:{reviewedOn:'2026-10-15',names:['meshy','meshy ai','메시','메쉬'],reason:'무료 결과물의 출처 표시 의무와 유료 결과물의 소유권 조건이 다릅니다.',url:'https://www.meshy.ai/terms-of-use',section:'3.2 Ownership of User Content',quote:'such customers on a paid Meshy plan own their Customer Output.'},
 suno:{reviewedOn:'2026-10-15',names:['suno','수노'],reason:'플랜별 출력 권리와 허용 다운로드 조건을 구분합니다. 유료라도 리믹스 제한은 별도입니다.',url:'https://suno.com/terms',section:'Pro and Premier Accounts / Free or Basic Tier Accounts / Permitted Commercial Use',quote:'The number of Downloads you are permitted per month depends on your service tier'}
};
export function planImpact(a,now=Date.now()){
 const profile=contractProfile(a);if(profile?.planDependent)return {status:'affected',checkedAt:profile.checkedOn,reason:profile.planExplanation,evidence:{section:'일반 약관 1(c) 및 서비스별 추가 약관',quote:'Free User / Paid User',url:profile.root}};
 const verified=(a.sourceCandidates||[]).map(s=>s.verification).find(v=>v?.status==='matched'&&!v.imported&&!v.truncated&&v.query===(a.serviceName||a.name)&&now-Date.parse(v.checkedAt)<=7*86400000&&Date.parse(v.checkedAt)<=now+60000);
 const free=verified?.text?.match(/if you access or use our Services free of charge[\s\S]{0,180}?only use the Services for non-commercial purposes/i);
 const paid=verified?.text?.match(/if you access or use our Services through a paid subscription plan[\s\S]{0,180}?may use the Services for commercial purposes/i);
 if(a.kind==='ai'&&free&&paid)return {status:'affected',checkedAt:verified.checkedAt.slice(0,10),reason:'확보한 계약에 무료는 비상업 용도, 유료 구독은 상업 용도라는 차이가 명시되어 있습니다. 실제 이용 당시 구독을 선택하세요. 제품별 추가 약관의 적용은 결과에서 별도로 확인합니다.',evidence:{section:'원문에서 확인한 무료·유료 이용 범위 · 추가 약관 별도',quote:free[0]+'; '+paid[0],url:verified.url}};
 const shared=publicOutputTerms(a,now);
 if(shared?.verifiedProvider==='copilot')return {status:'contract',checkedAt:shared.checkedAt.slice(0,10),reason:'Copilot은 개인용·GitHub 직접 기업 구매·Microsoft 구매에 따라 적용 계약이 다릅니다. 위 계약 경로를 선택하세요.',evidence:{section:'계약 경로별 적용 약관',quote:'GitHub Terms of Service / Generative AI Services Terms / Microsoft Product Terms',url:'https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features'}};
 if(shared?.status==='conditions'&&!['meshy','tripo','copilot'].includes(shared.verifiedProvider))return {status:'unaffected',checkedAt:shared.checkedAt.slice(0,10),reason:'확인한 일반 생성물 허용 범위에는 무료·유료 플랜 미선택만으로 보류하지 않습니다. API·기업 별도 계약과 특별 기능은 별도입니다.',evidence:{section:'생성물 권리 · 공식 공개 안내',quote:shared.excerpts[0],url:shared.sourceUrl}};
 const name=String(a.serviceName||a.name||'').trim().toLowerCase();
 const id=['tripo','meshy'].includes(a.provider)?a.provider:(!a.provider||a.provider==='other')?Object.keys(planEvidence).find(k=>planEvidence[k].names.includes(name)):undefined;
 const evidence=planEvidence[id];
 const fresh=evidence&&now>=Date.parse(evidence.reviewedOn);
 const confirmed=a.kind==='ai'&&a.scope==='output'&&evidence&&fresh;
 return {status:confirmed?'affected':'unknown',evidence,checkedAt:evidence?.reviewedOn,reason:confirmed?evidence.reason:!name&&!a.provider?'먼저 AI 서비스를 입력하세요.':a.scope!=='output'?'이 이용 방식은 결과물 약관과 다를 수 있어 별도 계약 확인이 필요합니다.':evidence&&!fresh?'근거 확인일이 지나 최신 약관의 플랜 조건을 다시 확인해야 합니다.':'플랜에 따라 이용 권리가 달라지는지 아직 확인하지 못했습니다.'};
}
export function planImpactMarkup(a,esc,now=Date.now()){
 const p=planImpact(a,now);
 return `<strong>${p.status==='contract'?'적용 계약 확인':p.status==='affected'?'플랜 확인이 필요한 이유':p.status==='unaffected'?'플랜 미선택으로 보류하지 않는 범위':'플랜 영향 · 확인 필요'}</strong><p>${esc(p.reason)}</p>${p.evidence?`<details><summary>약관 근거 보기</summary><p>${esc(p.evidence.section)}</p><blockquote>${esc(p.evidence.quote)}</blockquote><a href="${esc(p.evidence.url)}" target="_blank" rel="noopener noreferrer">공식 원문 열기 ↗</a><small> · 확인일 ${p.checkedAt}${p.status==='unknown'?' · 현재 적용 여부 재확인 필요':''}</small></details>`:''}${p.status==='unknown'?'<small>아래 공식 출처 찾기에서 약관을 확인하고, 적용 조건을 근거·메모에 기록하세요. 영향이 없다는 뜻은 아닙니다.</small>':['unaffected','contract'].includes(p.status)?'':'<small>해당 자료에 적용되는 플랜을 선택하세요. 생성·다운로드 등 기준 시점은 원문을 따릅니다.</small>'}${a.planType&&a.planType!=='unknown'&&p.status==='unknown'?'<p>기존 플랜 기록은 보존됩니다. 현재 적용 여부는 미확인입니다.</p>':''}`;
}

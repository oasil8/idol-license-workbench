import {analyzeUsageTerms} from './usage-terms.mjs';
export const pastOutputCheck='과거 생성물·별도 계약·외부 콘텐츠에는 당시 계약과 적용 범위를 확인하세요.';
export const thirdPartyCheck='약관상 허용만으로 확보되지 않는 입력 자료·상표·초상·음성 등 제3자 권리를 실제 자료를 기준으로 별도 확인하세요.';
export function analyzeTerms(input,text){
 text=String(text||'').replace(/\s+/g,' ').trim();
 const usage=analyzeUsageTerms(input,text);if(usage)return usage;
 // Reuse a reviewed service rule only when both the entered identity and source match.
 if(input.manual&&input.provider==='other'&&/^(meshy|meshy ai|메시|메쉬)$/i.test(String(input.serviceName||'').trim())){
  try{const u=new URL(input.sourceUrl);if(u.protocol==='https:'&&['www.meshy.ai','meshy.ai'].includes(u.hostname)&&u.pathname==='/terms-of-use')input={...input,provider:'meshy'};}catch{}
 }

 const result={status:'review',summary:'핵심 허가 조항을 확인하지 못했습니다. 원문 검토가 필요합니다.',conditions:[],checks:[],excerpts:[],license:''};
 if(input.scope!=='output'){result.summary='생성 결과물 약관은 모델 가중치·서비스 자체의 재배포 허가가 아닙니다.';return result;}
 if(input.provider==='other'&&input.manual===true)return analyzeCustomTerms(input,text,result);
 // Both plan branches must grant permission before an unknown plan can share it.
 if(input.provider==='meshy'&&(!input.planType||input.planType==='unknown')){
  const free=analyzeTerms({...input,planType:'free'},text),paid=analyzeTerms({...input,planType:'paid'},text);
  if(free.status==='conditions'&&paid.status==='conditions')return {...free,summary:'무료·유료 플랜 모두 생성물의 상업 이용을 허용합니다. 플랜 미선택은 표시 의무를 구분할 사항입니다.',checks:['생성 당시 플랜 미기록: 유료 소유권을 주장하려면 해당 플랜 증빙을 확인하세요.'],conditions:[...free.conditions,'플랜 확인 전에는 무료 플랜의 Meshy 출처·CC BY 4.0 표시 조건을 적용하세요.'],excerpts:[...free.excerpts,...paid.excerpts]};
  return {...result,summary:'플랜별 공통 허용 근거가 부족합니다. 생성 당시 플랜 또는 적용 계약을 확인하세요.'};
 }
 if(input.planType==='business'||(!['free','paid'].includes(input.planType)&&!['openai','anthropic'].includes(input.provider))){result.summary='플랜이 미확인이거나 기업·API 별도 계약입니다. 적용 계약을 확인하세요.';return result;}
 const restriction=text.match(/non-commercial use only|commercial use (?:is )?(?:not allowed|prohibited)|not (?:use|exploit)[^.]{0,80}commercial/i);
 if(restriction){result.excerpts=[restriction[0]];result.summary='상업 이용 제한 문구가 함께 발견되었습니다. 허가 조항만으로 결론 내리지 않고 원문 검토를 보류합니다.';return result;}
 let match;
 if(input.provider==='meshy'){
  if(/community|커뮤니티/i.test(input.useDescription||'')&&/image|이미지|upload|업로드/i.test(input.useDescription||'')){result.summary='커뮤니티의 업로드 이미지 등은 생성 결과물과 라이선스가 다릅니다. 해당 자료의 적용 조항 확인이 필요합니다.';return result;}

  match=input.planType==='free'?(text.match(/If you are on a free plan, we grant you a CC BY 4\.0 license instead/i)||text.match(/makes such rights available to free plan customers under the Creative Commons Attribution 4\.0 International License/i)):(text.match(/if you are a paid customer, you own the assets created through our platform/i)||text.match(/such customers on a paid Meshy plan own their Customer Output/i));
  if(match){if(/You agree not to remove, alter, disable, or otherwise tamper with such identifiers/i.test(text))result.conditions.push('결과물의 AI 생성 표시·디지털 워터마크·식별 메타데이터를 제거하거나 변경하지 마세요.');result.conditions.push('이 결과는 생성 결과물에만 해당하므로, 커뮤니티 업로드 이미지 등 다른 자료의 라이선스에 확대 적용하지 마세요.');result.license=input.planType==='free'?'CC-BY-4.0':'Service-Output';result.conditions.push(input.planType==='free'?'Meshy 출처·CC BY 4.0 링크·변경 사실을 표시하세요.':'생성 당시 유료 플랜과 소유권 조건의 적용을 확인하세요.');}
 }else if(input.provider==='tripo'){
  if(input.planType==='free'){
   match=text.match(/If you need commercial use rights, upgrade to a paid plan/i);
   if(match&&/Free Users[\s\S]{0,350}Tripo retains all rights/i.test(text)){result.status='conflict';result.summary='현재 공식 안내에서 무료 플랜의 상용 권리를 부여하지 않습니다.';result.excerpts=[match[0]];return result;}
   match=null;
  }else match=text.match(/Paid Users have full rights to use, modify, distribute, and commercially exploit all 3D models/i);
 }else if(input.provider==='openai')match=text.match(/you \(a\) retain your ownership rights in Input and \(b\) own the Output/i);
 else if(input.provider==='anthropic')match=text.match(/we assign to you all of our right, title, and interest.{0,25}in Outputs/i)||text.match(/귀하에게 산출물에 대한 당사의 모든 권리, 소유권 및 이권.{0,30}양도합니다/);
 if(match){result.status='conditions';result.summary='조회한 공식 문서의 출력물 권리 조항상 상용 사용 가능 (조건부).';result.excerpts=[match[0].split(/\s+/).slice(0,24).join(' ')];result.conditions.push('콘텐츠 정책·경쟁 모델 학습 제한 등 나머지 약관을 준수하세요.');result.checks.push(pastOutputCheck);}
 return result;
}

// Deliberately narrow: unknown services require direct input and explicit output grants.
function analyzeCustomTerms(input,text,result){
 if(!String(input.serviceName||'').trim()){result.summary='검토할 AI 서비스 이름을 입력하세요.';return result;}
 const clauses=text.split(/(?<=[.!?。])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 const grant=/^(?:You (?:may|are (?:permitted|allowed) to) (?:use|utilize) (?:the |your |all )?(?:generated )?(?:outputs|generated content) for commercial purposes|Commercial use of (?:the |your )?(?:generated )?outputs is (?:permitted|allowed)|(?:사용자|귀하)는 (?:생성된 )?(?:결과물|출력물)을 상업적(?:인)? (?:목적으로|용도로) (?:사용|이용)할 수 있습니다)[.!]?$/i;
 const attribution=/^(?:You must (?:provide attribution|credit the service)(?: when using (?:the )?outputs)?\.|(?:사용자|귀하)는 (?:결과물 사용 시 )?출처를 표시해야 합니다\.)$/i;
 const grants=clauses.filter(s=>grant.test(s));
 if(!grants.length){
  const limited=text.match(/no commercial use of [^;.]{1,160} is permitted/i),ownership=text.match(/we assign to you all of our right, title, and interest.{0,25}in the Outputs/i);
  result.summary=limited?'확인 필요: 무료·특정 범위의 상업 이용 제한이 있습니다. 적용 플랜과 직접 생성·공유 자료의 범위를 구분해야 합니다.':ownership?'확인 필요: 출력물 권리 양도는 확인했지만 나머지 이용 제한과 적용 계약을 자동 확정하지 못했습니다.':'확인 필요: 출력물의 상업 이용을 명시적으로 허용하는 문구를 인식하지 못했습니다. 소유권 문구나 서비스 이용 허용만으로는 확정하지 않습니다.';
  if(limited||ownership)result.excerpts=[(limited||ownership)[0]];
  return result;
 }
 result.excerpts=[grants[0]];
 const duties=clauses.filter(s=>attribution.test(s));
 const routine=[
  [/^(?:You (?:must|shall) (?:comply with|follow) (?:all )?(?:applicable laws|our (?:acceptable use|usage|content) polic(?:y|ies))|(?:사용자|귀하)는 (?:관련 법률|이용 정책)을 준수해야 합니다)[.!]?$/i,'이용 정책과 관련 법률을 준수하세요.','condition'],
  [/^You (?:must|shall) (?:retain|preserve) (?:all )?(?:copyright|license|attribution) notices[.!]?$/i,'저작권·라이선스·출처 고지를 유지하세요.','condition'],
  [/^(?:You (?:must not|may not|shall not) infringe (?:the )?(?:intellectual property|copyright|privacy|third.party) rights(?: of others)?|You are responsible for (?:ensuring|obtaining) (?:all )?(?:necessary )?(?:rights|permissions) (?:to|for) (?:your )?inputs)[.!]?$/i,'실제 입력 자료와 제3자 권리를 확인하세요.','check'],
  [/^Outputs (?:may not be unique|may contain errors|are provided as is)[.!]?$/i,'출력물의 정확성·유사성과 보증 제외를 확인하세요.','check']
 ];
 const recognized=clauses.map(clause=>({clause,rule:routine.find(([pattern])=>pattern.test(clause))})).filter(x=>x.rule);
 result.checks=recognized.filter(x=>x.rule[2]==='check').map(x=>x.rule[1]);
 // Conditional, negative, or unrecognized duty clauses may change the grant itself.
 const uncertain=clauses.filter(s=>!grant.test(s)&&!attribution.test(s)&&!recognized.some(x=>x.clause===s));
 if(input.planType==='business'||uncertain.length){result.summary='확인 필요: 허용 문구는 있지만 적용 플랜·예외 또는 추가 의무의 해석이 남아 있습니다.';result.excerpts.push(...uncertain.slice(0,2));result.conditions=[...(duties.length?['결과물을 사용할 때 서비스 출처를 표시하세요.']:[]),...uncertain.slice(0,3).map(s=>'적용 여부 확인 필요: '+s)];return result;}
 result.conditions.push(...recognized.filter(x=>x.rule[2]==='condition').map(x=>x.rule[1]));
 result.status='conditions';result.license='Service-Output';
 result.summary='직접 입력한 약관에서 출력물의 명시적 상업 이용 허용을 확인했습니다. 표시된 의무를 이행하는 조건입니다.';
 if(duties.length){result.conditions.push('결과물을 사용할 때 서비스 출처를 표시하세요.');result.excerpts.push(duties[0]);}
 return result;
}

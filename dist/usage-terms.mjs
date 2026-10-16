// Recognize explicit rights for a chosen use, never infer API or weight rights from output ownership.
export function analyzeUsageTerms(input,text){
 if(!input.manual||!String(input.serviceName||'').trim())return null;
 const output=text.match(/(?:^|[.!?]\s+)(Subject to your compliance with the Agreement, (?:the Company|we) (?:does|do) not restrict your commercial use of your Outputs\.)/i);
 const api=text.match(/if you have purchased access to the APIs, you may use the APIs to access the Services, integrate the functionality of such Services into your own applications, products, and services[\s\S]{0,650}?in accordance with our Branding Guidelines\s*\./i);
 const grant=input.scope==='output'?output?.[1]:input.scope==='service'?api?.[0]:null;
 if(!grant)return null;
 const result={status:'review',summary:'허용 조항은 확인했지만 적용 조건 확인이 필요합니다.',conditions:[],excerpts:[grant],license:input.scope==='service'?'Service-API':'Service-Output',permissions:[input.scope==='service'?'구매한 API 접근 권한으로 기능을 제품에 통합하고 최종 사용자에게 제공할 수 있습니다.':'약관 준수를 전제로 생성 결과물의 상업 이용을 제한하지 않는다는 조항을 확인했습니다.'],checks:[]};
 const restriction=text.match(/[^.!?]*(?:commercial use (?:is )?(?:prohibited|not allowed)|only paid subscribers are eligible|separate agreement is required for commercial use|non-commercial use only|(?:may|must|shall) not use (?:the |your )?(?:APIs|Outputs)[^.!?]{0,80}commercial|commercial (?:use|rights)[^.!?]{0,80}(?:only available|limited to|additional licen[sc]e)|(?:API|Output) (?:rights|permission)[^.!?]{0,60}(?:revoked|withdrawn))[^.!?]*[.!?]?/i);
 if(restriction){result.excerpts.push(restriction[0].trim());result.checks.push('상업 이용 제한·별도 계약 문구가 함께 있어 적용 범위를 확인해야 합니다.');return result;}
 if(input.planType==='business'){result.checks.push('기업 별도 계약이 선택되어 공개 약관과의 우선순위 확인이 필요합니다.');return result;}
 if(input.scope==='service'){
  const branding=api[0].match(/display\s+[“"]([^”"]+)[”"]\s+and link to\s+(\S+)/i);
  if(!branding){result.checks.push('API 표시·링크 의무를 해석하지 못했습니다.');return result;}
  result.conditions.push(`최종 사용자 화면에 “${branding[1]}”를 눈에 띄게 표시하고 ${branding[2]}에 연결하세요. 브랜드 지침도 지켜야 합니다.`);
  result.conditions.push('계약·주문에 정한 API 사용 한도와 이용 정책을 준수하세요.');
  if(input.apiAccessConfirmed!==true){result.checks.push('이용할 API의 접근 권한을 구매·확보했는지 확인하세요. 일반 서비스 구독과 구분합니다.');return result;}
  result.checks.push('전송할 개인정보·기밀 자료, 보관·학습 정책, 최종 사용자 고지와 계약 적용 범위를 확인하세요.');
 }
 const competition=text.match(/directly or indirectly uses the Services \(including, but not limited to, Outputs\) to create, train, develop, or improve similar or competitive products or services/i);
 if(competition){result.conditions.push('서비스·결과물을 이용해 유사하거나 경쟁하는 제품·서비스를 제작·학습·개선하지 마세요.');result.excerpts.push(competition[0]);}
 result.conditions.push('금지 콘텐츠·제3자 권리 침해 등 이용 정책을 준수하세요.');
 result.checks.push('실제 콘텐츠가 금지 용도에 해당하는지, 별도 계약·아바타 등 예외 대상인지 확인하세요.');
 result.status='conditions';result.summary='선택한 이용 방식에 대한 명시적 허용 근거를 확인했습니다. 약관 의무 이행을 전제로 사용할 수 있습니다.';
 return result;
}

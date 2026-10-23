import {cleanVerdictLog} from './verdict-log.mjs';
import {normalizeAsset} from './asset-normalization.mjs';
import {normalizeLicense,licenseClarification,licenseDetails} from './license-normalization.mjs';
import {evaluateContractBundle,cleanContractChoices} from './contract-review.mjs';
import {categoryRecommendation} from './catalog.mjs';
import {cleanCandidates} from './source-search.mjs';
import {selectionOf,selectedAssets} from './workflow.mjs';
import {reviewAge,reviewSourceConditions,appliedOfficialLicense,codeLicenseRecords} from './official-sources.mjs';
import {aiResult,cleanTerms} from './ai.mjs';
import {validateAssignment} from './assignment.mjs';
export const RULE_DATE='2026-10-16';
export const sources=[
 ['MIT','https://opensource.org/license/mit'],
 ['Apache 2.0','https://www.apache.org/licenses/LICENSE-2.0'],
 ['GNU 라이선스 FAQ','https://www.gnu.org/licenses/gpl-faq.en.html'],
 ['CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'],
 ['CC BY-NC 4.0','https://creativecommons.org/licenses/by-nc/4.0/'],
 ['CC0','https://creativecommons.org/publicdomain/zero/1.0/'],
 ['Steam AI 콘텐츠 설문','https://partner.steamgames.com/doc/gettingstarted/contentsurvey'],
 ['OpenAI 이용약관','https://openai.com/policies/row-terms-of-use/'],
 ['Meshy 상업 이용','https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained'],
 ['Tripo 상업 이용','https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially'],
 ['Editorial 에셋 제한','https://www.turbosquid.com/help/en/articles/9937424-editorial-use-information'],
 ['BSD 2-Clause','https://opensource.org/license/bsd-2-clause'],
 ['BSD 3-Clause','https://opensource.org/license/bsd-3-clause'],
 ['MPL 2.0','https://www.mozilla.org/en-US/MPL/2.0/'],
 ['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],
 ['CC BY-ND 4.0','https://creativecommons.org/licenses/by-nd/4.0/'],
 ['SPDX 표현식','https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/'],
 ['PSF License 2 · Python 공식 원문','https://docs.python.org/3/license.html#psf-license'],
 ['SIL OFL 1.1 공식 원문','https://openfontlicense.org/open-font-license-official-text/'],
 ['ISC License','https://opensource.org/license/isc'],
 ...['Zlib','BSL-1.0','0BSD','Unlicense','EPL-2.0','WTFPL','CC-BY-3.0','CC-BY-SA-3.0','CC-BY-NC-3.0','CC-BY-ND-3.0','CC-BY-NC-SA-3.0','CC-BY-NC-ND-3.0'].map(id=>[id,`https://spdx.org/licenses/${id}.html`]),
 ['Unity Asset Store EULA','https://unity.com/legal/as-terms'],
 ['Pixabay 라이선스','https://pixabay.com/service/terms/'],
 ['Pixabay 라이선스 요약','https://pixabay.com/service/license-summary/'],
 ['Unsplash 라이선스','https://unsplash.com/license'],
 ['Pexels 라이선스','https://www.pexels.com/license/']
];
export const kinds={code:'코드 / 오픈소스',model:'모델 / 가중치 / 3D',image:'이미지 / 텍스처',audio:'음원 / 음성',ai:'서비스 / API / AI',data:'데이터셋',tool:'제작 도구',other:'기타'};
export const statuses={conflict:'현재 조건으로 사용 불가',review:'판단 보류',conditions:'사용 가능 (조건부)'};
export function commercialVerdict(a,c){return evaluate(a,{...c,commercial:true});}
export function projectTasks(p){
 const counts=new Map();
 for(const a of selectedAssets(p)){
  const current=evaluate(a,p.context);
  const tasks=new Set([...current.tasks,...(current.humanChecks||[])]);
  if(a.terms?.error)tasks.add('실패한 공식 약관 조회를 재시도하거나 공식 원문을 직접 등록');
  for(const task of tasks)counts.set(task,(counts.get(task)||0)+1);
 }
 return [...counts].map(([task,count])=>({task,count})).sort((a,b)=>b.count-a.count||a.task.localeCompare(b.task,'ko'));
}
export function evaluate(a,c,now=Date.now()){
 a=normalizeAsset(a);
 const result=evaluateBase(a,c,now),review=reviewSourceConditions(appliedOfficialLicense(a)?{...a,confirmed:true}:a,c,now,{contractConfirmed:result.contractConfirmed});result.blockers ||= result.status==='review'?[...result.notes]:[];
 if(review&&!result.scopeUnresolved&&!(appliedOfficialLicense(a)?.id==='isaac-code-20261016'&&a.reviewScope==='code')){
  if(review.status==='conflict'){result.status='conflict';result.conflicts=[...(result.conflicts||[]),...review.conflicts];}
  else if(review.blockers.length&&result.status==='conditions')result.status='review';
  result.notes.push(`공식 원문 검토 기록 (${review.source.observedOn})이 있습니다. 확인한 조건과 실제 사용 범위의 대조 결과를 확인하세요.`);
  if(a.provider==='other'){result.notes=result.notes.filter(n=>n!=='공식 사이트에서 최신 약관을 열어 원문과 적용 플랜을 기록하세요.');result.tasks=result.tasks.filter(t=>t!=='서비스·플랜을 지정하고 최신 약관 조회를 실행하세요.');}
  result.humanChecks=[...new Set([...(result.humanChecks||[]),...review.missing])];result.blockers=[...new Set([...result.blockers,...review.blockers])];
  if(!result.sources.some(([,url])=>url===review.source.url))result.sources.push([review.source.title,review.source.url]);
 }
 if(['conditions','conflict'].includes(result.status)&&a.planType&&a.planType!=='unknown')result.humanChecks=(result.humanChecks||[]).filter(t=>t!=='서비스·플랜을 지정하고 최신 약관 조회를 실행하세요.');
 result.reviewDates=[...new Set([review?.source.observedOn,result.reviewedEvidence?.checkedAt?.slice(0,10),!a.terms?.imported&&!a.terms?.error?a.terms?.checkedAt?.slice(0,10):undefined,a.sourceConditionsConfirmed?a.sourceConditionsDate:undefined,appliedOfficialLicense(a)?.date].filter(Boolean))];
 result.reviewDates=result.reviewDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&Date.parse(d)<=now);
 if(!result.reviewDates.length)result.ruleDate=normalizeLicense(a.license)==='LicenseRef-Unity-Asset-Store-EULA'&&result.sources.some(([,url])=>url==='https://unity.com/legal/as-terms')?'2026-10-20':RULE_DATE;
 if(!result.reviewDates.length&&['LicenseRef-Pixabay','LicenseRef-Unsplash','LicenseRef-Pexels'].includes(normalizeLicense(a.license))&&result.sources.some(([,url])=>['https://pixabay.com/service/terms/','https://unsplash.com/license','https://www.pexels.com/license/'].includes(url)))result.ruleDate='2026-10-20';
 result.reviewWarnings=[...new Set(result.reviewDates.map(d=>reviewAge(d,now)).filter(Boolean))];
 return result;
}
function evaluateBase(a,c,now){
 if(a.licenseOrigin&&!appliedOfficialLicense(a)){
  const record=codeLicenseRecords.find(r=>a.licenseOrigin.startsWith(r.id));
  const reason=record?.requiresVersion&&!a.version?'실제 MinerU 배포 버전이 필요합니다. 현재 추가 조건 라이선스를 과거 AGPL 배포판에 적용할 수 없습니다.':a.reviewScope==='service'?'확인한 코드·모델 라이선스는 호스팅 서비스·API 구독 계약을 포함하지 않습니다.':a.reviewScope==='bundle'?'설치 배포판의 추가 구성요소·에셋 계약이 아직 확인되지 않았습니다.':record?.requiresScope&&a.reviewScope!=='code'?'공개 소스 코드만 검토할지, Kit·추가 자료까지 포함할지 선택해야 합니다.':a.version?'등록한 버전과 확보한 공식 원문의 적용 버전이 일치하는지 확인해야 합니다.':'정확한 제품·모델 배포판 또는 공식 저장소의 적용 범위가 미확인입니다.';
  return {status:'review',scopeUnresolved:true,notes:[reason],blockers:[reason],humanChecks:[],tasks:['정보 보완에서 실제 검토 범위와 해당 계약·배포판을 지정'],sources:record?[[record.scope,record.url]]:[]};
 }

 if(a.kind==='ai'&&(a.provider||!a.terms&&!a.sourceCandidates?.length&&(a.serviceName||a.name))){
  const result=evaluateContractBundle(a,c,now)||aiResult(a,now);
  // An explicitly commercial-only prohibition cannot decide a noncommercial use.
  if(!c.commercial&&result.status==='conflict'&&result.notes.includes('현재 공식 안내에서 무료 플랜의 상용 권리를 부여하지 않습니다.')){result.status='review';result.notes.push('상업 이용 제한과 별개로 현재 비상업 이용 범위에 대한 허가를 확인해야 합니다.');}

  if(c.platform==='steam'&&a.scope==='output')result.humanChecks.push('플레이어에게 보이는 AI 생성물이면 Steam 공개 대상인지 확인하세요.');
  if(a.scope==='weights')result.tasks.push('모델 버전·재배포·고지·학습 데이터 이용 조건을 확인하세요.');
  if(c.platform==='conference')result.humanChecks.push('학회·출판사의 AI 사용 공개 정책을 확인하세요.');
  return result;
 }
 const recommendation=categoryRecommendation(a);
 if(recommendation){const reason=`범주 추천: ${recommendation.name} → ${kinds[recommendation.kind]}. 실제 이용 방식을 선택하세요.`;return {status:'review',notes:[reason],blockers:[reason],tasks:['정보 보완에서 추천 범주를 확인하고 생성물·API·가중치 등 실제 이용 방식 선택'],humanChecks:[],sources:[]};}
 const details=licenseDetails(a.license),license=details.license, notes=[], tasks=[], humanChecks=[], blockers=[], conflicts=[], refs=new Set(); let status='conditions',reason;
 const review=t=>{if(status!=='conflict')status='review';notes.push(t);blockers.push(t);};
 const conflict=t=>{status='conflict';notes.push(t);conflicts.push(t);};
 const clarification=licenseClarification(license);
 if(!license||['UNKNOWN','NOASSERTION','NONE','UNLICENSED'].includes(license.toUpperCase())) review(!license&&a.kind==='tool'?`도구의 라이선스·구독 플랜에서 제작물을 ${c.commercial?'상업적으로':'현재 목적으로'} 이용할 수 있는지 확인하고 라이선스를 입력하세요.`:'공개된 파일이라는 사실만으로 허용된다고 보지 말고, 적용 라이선스의 사용 허가를 확인하세요.');
 else if(['LicenseRef-Own-Work','LicenseRef-Team-Work','LicenseRef-Commissioned'].includes(license)){
  const included='다른 사람의 에셋·AI 생성물·참고 이미지·폰트·음원을 포함하지 않았는지 확인하세요. 포함했다면 그 자료를 따로 등록하세요.';
  if(license==='LicenseRef-Commissioned'){
   status='review';notes.push('외주 제작 자료 · 계약상 이용 허락 범위 미확인');
   humanChecks.push('외주 계약서에서 저작권 양도 또는 게임 상업 이용 허락 범위를 확인하세요.',included);
  }else{
   humanChecks.push(included,'회사·학교 업무나 과제로 만든 경우 저작권이 소속 기관에 있는지 확인하세요.');
   if(license==='LicenseRef-Team-Work'){
    status='review';notes.push('팀 내부 제작 자료 · 저작권 귀속·이용 허락 합의 미확인');
    humanChecks.push('팀원 각자의 저작권 귀속 또는 이용 허락 합의를 문서로 확인하세요.');
   }else reason='직접 제작한 자료로 기록되어 있습니다.';
  }
 }else if(license==='LicenseRef-Purchased'){
  status='review';notes.push('구매 자료 · 판매처 라이선스 미기록');humanChecks.push('구매한 판매처의 라이선스 이름이나 원문을 입력하세요.');
 }else if(details.expression){
  const {licenses,operator}=details.expression;
  const results=licenses.map(id=>evaluateBase({...a,license:id},c,now));
  for(const result of results){
   tasks.push(...result.tasks);humanChecks.push(...result.humanChecks);
   for(const source of result.sources)refs.add(sources.findIndex(([,url])=>url===source[1]));
   if(result.status!=='conditions')for(const blocker of result.blockers)review(blocker);
  }
  if(operator==='OR')humanChecks.push('선택한 라이선스를 기록하세요.');
  reason=operator==='OR'?licenses.join(' 또는 ')+' 중 하나를 선택해 이용할 수 있습니다.':licenses.join('·')+'의 조건을 모두 지켜야 합니다.';
 }else if(details.multiple){refs.add(16);review('복수 라이선스 또는 예외 조항입니다. AND의 모든 조건, OR의 선택한 조건, WITH의 예외 범위를 직접 확인하세요.');tasks.push('적용할 라이선스와 선택·예외 근거를 기록하세요.');}
 else if(clarification)review(`${clarification[0]} — 자동 판정 미지원. ${clarification[1]}`);
 else if(['LicenseRef-Unity-Asset-Store-EULA','LicenseRef-Pixabay','LicenseRef-Unsplash','LicenseRef-Pexels'].includes(license)&&typeof c.distribute!=='boolean')review('외부 배포 여부가 정해지지 않았습니다. 사용 조건에서 외부 배포 여부를 지정하세요.');
 else if(license==='LicenseRef-Unity-Asset-Store-EULA'&&['code','model','image','audio','data','other','tool'].includes(a.kind)&&typeof c.distribute==='boolean'){
  refs.add(sources.findIndex(([,url])=>url==='https://unity.com/legal/as-terms'));
  notes.push('Unity Asset Store 표준 EULA는 자산을 독자적 콘텐츠와 함께 게임에 포함해 배포·수익화하는 것을 허용합니다. 근거: Unity Asset Store EULA (unity.com).');
  tasks.push(
   '자산을 게임 등 제품에 포함된 형태로만 배포하고, 자산 자체를 단독으로 판매·배포하거나 이용자가 그렇게 할 수 있게 하지 마세요.',
   '자산이 제품의 주요 부분이 되지 않도록 독자적 콘텐츠와 함께 사용하세요.',
   '구매에 참여하지 않은 제3자와 자산을 공유하지 마세요.',
   '자산을 AI·머신러닝 모델 학습이나 데이터셋에 사용하지 마세요.',
   '자산에 포함된 저작권·상표 고지를 제거하지 마세요.'
  );
  humanChecks.push(
   '에셋 페이지에 별도 판매자 EULA나 Restricted Asset Terms가 있는지 확인하세요.',
   'Editor Extension·Scripting·Services 자산이면 좌석 수(2대 초과 동시 사용 금지)를 확인하세요.',
   'UGC 제작이 주목적인 게임이거나 NFT·블록체인에 쓰는 경우 판매자·Unity의 별도 허가를 확인하세요.',
   '구매 영수증과 구매 당시 EULA 버전을 보관하세요.'
  );
 }
 else if(['LicenseRef-Pixabay','LicenseRef-Unsplash','LicenseRef-Pexels'].includes(license)&&['image','audio','model','data','other','code'].includes(a.kind)&&typeof c.distribute==='boolean'){
  const site=license.slice('LicenseRef-'.length),label=`${site} 라이선스 (${site.toLowerCase()}.com)`;
  refs.add(sources.findIndex(([,url])=>url==={Pixabay:'https://pixabay.com/service/terms/',Unsplash:'https://unsplash.com/license',Pexels:'https://www.pexels.com/license/'}[site]));
  notes.push(`${site} 라이선스는 상업 이용과 수정을 허용하며 출처 표시가 필수가 아닙니다. 근거: ${label}.`);
  tasks.push(
   '자료를 수정하지 않은 원본 그대로 단독 판매·배포하지 말고 게임 등 새 창작물의 일부로 사용하세요.',
   '자료를 상표·로고·상호의 일부로 쓰지 마세요.',
   '자료 속 인물·브랜드가 게임을 보증하거나 제휴한 것처럼 보이게 하지 마세요.'
  );
  humanChecks.push(
   '자료에 나오는 인물·로고·브랜드·건축물·작품의 제3자 권리(초상권·상표권 등)는 사이트가 보증하지 않으므로 별도로 확인하세요.',
   '다운로드한 페이지 주소와 다운로드 날짜를 기록하세요.'
  );
  if(site==='Pixabay'){
   refs.add(sources.findIndex(([,url])=>url==='https://pixabay.com/service/license-summary/'));
   tasks.push('상표·로고·브랜드가 보이는 자료는 상품·서비스와 관련된 상업 목적으로 쓰지 마세요.','음란·공격적·정치적 맥락이나 오해를 부르는 방식으로 쓰지 마세요.');
   humanChecks.push('2019-01-09 이전 게시물은 CC0일 수 있으니 페이지에 표시된 라이선스를 확인하세요.');
  }else if(site==='Unsplash')tasks.push('자료를 모아 비슷하거나 경쟁하는 서비스를 만들지 마세요.');
  else tasks.push('식별 가능한 인물을 부정적이거나 공격적으로 묘사하지 마세요.','다른 스톡·배경화면 플랫폼에 재배포하거나 판매하지 마세요.');
 }
 else if(['Zlib','BSL-1.0','0BSD','Unlicense'].includes(license)){
  refs.add(sources.findIndex(([id])=>id===license));
  notes.push(`${license}는 상업·비상업 이용과 수정·배포를 허용합니다.`);
  if(license==='Zlib')tasks.push('원 출처를 오인하게 하거나 원본을 직접 작성했다고 주장하지 마세요.','변경한 소스는 변경 사실을 명확히 표시하고 원본으로 오인하게 하지 마세요.','소스 배포 시 원래 고지를 삭제하거나 변경하지 말고 유지하세요.');
  if(license==='BSL-1.0')tasks.push('배포 시 저작권 고지와 BSL-1.0 라이선스 전문을 유지하세요.');
 }else if(license==='EPL-2.0'){
  refs.add(sources.findIndex(([id])=>id===license));
  if(c.distribute===false){notes.push('EPL-2.0은 외부 배포 없는 내부 이용을 허용합니다.');tasks.push('외부 배포를 시작하기 전에 EPL-2.0 적용 프로그램·수정 부분의 소스 제공 범위를 확인하세요.');}
  else review('EPL-2.0 소스 제공 범위 미확인 — 자동 판정 미지원. EPL-2.0 배포 시 적용 프로그램·해당 파일과 수정 부분의 소스 제공 범위, 수령자의 소스 입수 방법 및 상업 배포 책임 조항을 확인하세요.');
  tasks.push('EPL-2.0 적용 부분의 저작권·특허 등 고지와 라이선스 전문을 유지하세요.');
 }else if(license==='WTFPL'){
  refs.add(sources.findIndex(([id])=>id===license));
  review('WTFPL 이용 허가 확인 필요 — 자동 판정 미지원. WTFPL은 법적 효력 해석이 갈리므로 저작권자에게 이용 허가를 확인하세요.');
 }else if(license==='MIT'||/^BSD-[23]-Clause$/.test(license)){
  notes.push(`${c.commercial?'상업 이용 가능.':'현재 목적의 이용이 허용됩니다.'} 배포 시 저작권 및 라이선스 고지를 유지해야 합니다.`);tasks.push('원본 저작권 고지와 라이선스 전문을 함께 배포하세요.');refs.add(license==='MIT'?0:license==='BSD-2-Clause'?11:12);
 }else if(license==='ISC'){
  refs.add(19);notes.push('ISC는 유료·무료의 사용·복제·수정·배포를 허용합니다.');tasks.push('모든 사본에 원 저작권 고지와 ISC 허가 문구를 유지하세요.');
 }else if(license==='PSF-2.0'){
  refs.add(17);notes.push('PSF License 2는 상업·연구 이용과 수정·배포를 허용합니다. Python으로 만든 독립 결과물에 동일 라이선스를 요구하지 않습니다.');
  tasks.push('Python 및 파생본의 PSF 라이선스와 저작권 고지를 유지하세요.');
  if(c.distribute&&c.modified)tasks.push('Python 수정본 배포 시 Python에 가한 변경 사항 요약을 포함하세요.');
  humanChecks.push('실제 Python 배포판의 함께 포함된 구성요소·추가 패키지는 각각의 라이선스를 확인하세요. PSF 이름·상표를 보증·홍보에 사용할 권리는 별도입니다.');
 }else if(license==='OFL-1.1'){
  refs.add(18);notes.push('OFL 1.1은 글꼴 사용·임베딩·수정·동봉 배포를 허용합니다. 글꼴로 만든 문서·이미지에 OFL을 적용할 의무는 없습니다.');
  tasks.push('글꼴 자체만 단독 판매하지 마세요.','글꼴 배포 시 저작권 고지·OFL 전문을 유지하고 글꼴 자체의 OFL을 유지하세요.');
  if(c.modified)tasks.push('수정 글꼴의 예약 글꼴명(RFN)은 권리자의 서면 허가 없이 사용하지 마세요.');
  humanChecks.push('저작권자·제작자의 이름으로 수정 글꼴을 홍보·보증하려면 별도 허가를 확인하세요.');
 }else if(license==='LicenseRef-OpenSees'){
  if(c.distribute&&c.commercial)conflict('OpenSees 코드를 포함한 상업적 제품 배포는 별도 허가가 필요합니다.');
  else if(c.distribute&&a.nonprofitEntityConfirmed)notes.push('확인한 교육·연구·비영리 기관의 비상업 배포 범위에서 허용됩니다.');
  else if(c.distribute)review('비상업 배포 허가 대상인 교육·연구·비영리 기관에 해당하는지 확인하세요.');
  else if(c.distribute===false)notes.push('공식 조항은 내부 이용·수정·복제를 허용합니다.');
  else review('OpenSees 코드의 외부 배포 여부를 지정하세요.');
  tasks.push('UC Berkeley 저작권·허가·면책 문구를 유지하세요.','상업 배포 전 별도 허가를 확보하세요.');
 }else if(license==='LicenseRef-MinerU'){
  if(c.commercial&&a.organizationScale==='above')conflict('MinerU 규모 기준을 초과하여 별도 상업 라이선스가 필요합니다. 현재 공개 허가만으로 사용할 수 없습니다.');
  else if(c.commercial&&a.organizationScale!=='below')review('상업 이용 시 조직·계열사 합산 MAU 1억 초과 또는 월 매출 2천만 달러 초과 여부와 별도 허가가 필요한지 확인해야 합니다.');
  else if(c.commercial)notes.push('조직 규모가 확인된 기준 이하이므로 MinerU 상업 이용이 추가 조건과 함께 허용됩니다.');
  else notes.push('확인한 MinerU 코드의 비상업 이용은 Apache 2.0 및 추가 표시 조건으로 허용됩니다.');
  tasks.push('Apache 2.0 라이선스·고지를 유지하고 수정 사항을 표시하세요.');
  if(c.network)tasks.push('온라인 서비스 화면 또는 공개 문서에 MinerU 사용을 명확하게 표시하세요.');
  humanChecks.push('별도 모델 가중치·입력 문서의 권리와 실제 배포 버전은 구분하세요.');
 }else if(license==='Apache-2.0'){
  notes.push(`${c.commercial?'상업 이용 가능.':'현재 목적의 이용이 허용됩니다.'} 라이선스·고지 보존 및 수정 표시 조건이 있습니다.`);tasks.push('라이선스 전문 및 해당 NOTICE를 포함하세요.','수정한 파일에 변경 사실을 표시하세요.');refs.add(1);
 }else if(/^(A?GPL|LGPL)-[23]\.0(-only|-or-later)?$/.test(license)||license==='LGPL-2.1-only'||license==='LGPL-2.1-or-later'){
  refs.add(2);notes.push(c.distribute===false&&c.network===false?'외부 배포·네트워크 제공이 없어 현재는 소스 제공 의무가 발생하지 않습니다.':`${c.commercial?'유료 판매 자체는 금지되지 않습니다.':'라이선스 조건에 따른 이용이 가능합니다.'} 결합 방식과 배포·네트워크 제공 여부가 중요합니다.`);
  if(a.kind==='tool'&&a.reviewScope==='code'&&c.distribute){tasks.push('배포하는 도구·수정본의 대응 소스와 빌드·설치 정보를 해당 GPL 조건으로 제공하세요.','동일 라이선스와 저작권 고지를 유지하고 추가 제한을 부과하지 마세요.');if(license.startsWith('AGPL')&&c.network)tasks.push('수정 AGPL 프로그램과 네트워크로 상호작용하는 사용자에게 대응 소스 제공 기회를 안내하세요.');humanChecks.push('독립 도구 자체의 배포 기준입니다. 다른 프로그램에 결합·링크한 제품은 별도로 검토하세요.');}
  else if(c.distribute||license.startsWith('AGPL')&&c.network){review(a.kind==='tool'?'도구로 만든 결과물만 쓰는지, 도구 자체를 함께 배포·수정·번들해 소스 제공·재링크 의무가 생기는지 확인하세요.':'정적/동적 링크·수정·배포 방식과 적용 버전·예외에 따른 소스 제공·재링크·동일 라이선스 적용 범위를 확인하세요.');}
  else tasks.push('내부 사용 범위를 기록하고 외부 제공 전에 재검토하세요.');
 }else if(license==='MPL-2.0'){
  refs.add(13);if(c.distribute===false){notes.push('외부 배포 없는 내부 이용에는 외부 소스 제공 의무가 발생하지 않습니다.');tasks.push('외부 배포를 시작하기 전에 MPL 파일의 고지·소스 제공 범위를 재검토하세요.');}else if(c.distribute===true){notes.push('MPL 파일의 소스 제공과 고지 의무를 지키면 배포할 수 있습니다. 별도 파일 전체에 MPL을 강제하지 않습니다.');tasks.push('MPL 적용 파일(수정분 포함)의 소스를 MPL로 제공하고 수령자에게 입수 방법을 안내하세요.','라이선스·저작권 고지를 유지하고 소스에 대한 수령자의 권리를 제한하지 마세요.');}else review('외부 배포 여부를 지정하세요.');
 }else if(license==='CC0-1.0'){
  notes.push('CC0에 따라 저작권 관련 조건 없이 현재 목적의 이용이 허용됩니다.');humanChecks.push('CC0는 상표·특허·제3자 권리까지 허가하지 않으므로, 해당 권리를 별도로 확인하세요.');refs.add(5);
 }else if(/^CC-BY(?:-NC)?(?:-SA|-ND)?-[34]\.0$/.test(license)){
  const cc3=license.endsWith('-3.0');
  refs.add(cc3?sources.findIndex(([id])=>id===license):license.includes('-NC')?4:license.includes('-SA')?14:license.includes('-ND')?15:3);tasks.push(cc3?'CC 3.0 원문의 저작자·작품명(제공된 경우)·출처·라이선스 링크와 변경 사실을 표시하세요.':'저작자·출처·라이선스 링크·변경 사실을 표시하세요.');
  if(license.includes('-NC')&&c.commercial)conflict('비상업용(NC) 조건과 선택한 상업 목적이 충돌합니다.');
  if(license.includes('-NC')&&c.commercial===false){tasks.push('상업적 이익이나 금전적 보상을 주된 목적으로 사용하지 마세요.');humanChecks.push('비상업 목적을 선택했더라도 연구·학회라는 명칭만으로 NC 충족이 보장되지는 않으므로, 실제 이용 목적이 NC 조건을 충족하는지 확인하세요.');}else if(license.includes('-NC')&&c.commercial!==true)review('상업 목적 여부를 지정하세요.');
  if(license.includes('-SA')&&c.distribute&&c.modified!==false){if(typeof c.modified!=='boolean')review('자료 수정 여부를 지정하세요.');else{tasks.push(cc3?'공유하는 변형물에 CC 3.0 원문이 허용하는 동일하거나 호환되는 SA 라이선스를 적용하세요.':'공유하는 변형물에 동일하거나 호환되는 SA 라이선스를 적용하세요.','추가 법적 제한이나 이용을 막는 기술적 조치를 부과하지 마세요.');humanChecks.push('단순 모음과 변형물의 구분이 애매하면 해당 부분의 적용 범위를 확인하세요.');}}
  if(license.includes('-ND')&&c.modified&&c.distribute)conflict('변경금지(ND) 자료를 수정해 배포하는 것은 허용되지 않습니다.');
 }else if(license==='Editorial-Only'){
  refs.add(10);if(c.commercial||c.platform==='steam')conflict('Editorial 전용 허가는 일반 상업 게임 사용을 허용하지 않습니다. 권리자의 별도 허가가 필요합니다.');
  else review('해당 이용이 허가된 보도·편집·연구 용도에 해당하는지 확인하세요.');
 }else if(license)review('사용자 계약 또는 지원하지 않는 라이선스에 해당하므로 원문 조건을 직접 검토하세요.');
 const official=appliedOfficialLicense(a);
 if(official){notes.push('공식 원문 자동 보완 · '+official.date+' · '+official.scope);humanChecks.push('공식 원문에 표시된 코드·모델 범위 기준입니다. 별도 배포판·포크·동봉 라이브러리·모델·데이터는 각 라이선스를 확인하세요.');}
 if((!a.confirmed||!a.evidence?.trim())&&!official){review('라이선스가 이 자료에 적용되는지와 근거가 아직 확인되지 않았습니다. 원문을 보고 확인 체크와 근거를 기록하세요.');humanChecks.push('원문·구매 증빙·적용 버전을 확인하고 확인 여부를 기록하세요.');if(a.licenseOrigin)blockers.push('자동 보완 원문과 등록된 이름·종류·버전의 적용 범위를 대조해야 합니다.');}
 if(['model','image','audio','data'].includes(a.kind)&&a.rights!=='cleared'){
  humanChecks.push('라이선스상 허용만으로 확보되지 않는 브랜드·디자인·초상·음성·개인정보 등 제3자 권리를 별도로 확인하세요.');
 }
 if(a.kind==='ai'||a.aiGenerated){
  if(/meshy/i.test(a.name))refs.add(8);else if(/tripo/i.test(a.name))refs.add(9);else if(/openai|chatgpt|codex/i.test(a.name))refs.add(7);
  review('AI 서비스·플랜·생성 시점 약관 및 입력 자료 권리는 별도 검토 대상입니다.');
  tasks.push('플랜·생성일·약관 버전·입력 출처 기록','출력 이용 허가와 모델 가중치/서비스 이용 허가를 구분');
  if(c.platform==='steam'&&a.kind!=='tool'){refs.add(6);humanChecks.push('플레이어에게 제공되는 AI 콘텐츠인지와 Steam 설문 기재 범위를 확인하세요.');}
 }
 if(a.kind==='tool'){humanChecks.push('이 결과는 확인한 도구 라이선스 범위이므로, 호스팅 서비스·유료 배포판·플러그인·동봉 에셋을 함께 쓰는 경우 해당 계약을 별도로 확인하세요.');}
 if(c.platform==='conference')humanChecks.push('학회·출판사의 AI 공개 및 자료 재사용 정책을 확인하세요.');
 if(c.platform==='enterprise')humanChecks.push('납품 계약의 재배포·보증·소스 공개 조건을 확인하세요.');
 if(details.source)humanChecks.push(`다운로드한 ${details.source} 페이지에 표시된 라이선스와 작성자를 저장하세요.`);
 return {status,...(details.source?{sourceLicense:license}:{}),...(reason&&status==='conditions'?{reason}:{}),conflicts,permissions:official?['확인한 범위: '+official.scope+'. 이 범위의 공식 라이선스에서 이용 허가를 확인했습니다. 개별 설치 파일 전체를 검사한 결과는 아닙니다.']:[],humanChecks:details.expression?[...new Set(humanChecks)]:humanChecks,blockers:[...new Set(blockers)],notes:[...new Set(notes)],tasks:[...new Set(tasks)],sources:[...(official?[[official.scope,official.url]]:[]),...[...refs].map(i=>sources[i])]};
}
const cleanLicense=x=> typeof x==='string'&&!['NOASSERTION','NONE'].includes(x)?x:typeof x?.type==='string'?x.type:'';
export function isReadable(path){
 if(/(^|[\\/])(\.git|\.env[^/\\]*|\.ssh|\.aws)([\\/]|$)/i.test(path))return false;
 return /(^|\/)(package(?:-lock)?\.json|requirements[^/]*\.txt|[^/]*(?:sbom|bom)[^/]*\.json|licenses?(?:[.-][^/]*)?|copying(?:[.-][^/]*)?|notice(?:[.-][^/]*)?|ofl(?:[.-][^/]*)?|(?:readme|copyright|credits|attributions?|authors|third[-_ ]?party[-_ ]?notices?)(?:[.-][^/]*)?|ProjectVersion\.txt|project\.godot|plugin\.cfg|pyproject\.toml|Pipfile|Cargo\.toml|go\.mod|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|go\.sum|packages\.config|pom\.xml|build\.gradle(?:\.kts)?)$/i.test(path)||/\.(js|mjs|ts|tsx|jsx|py|cs|cpp|c|h|rs|go|java|json|gd|lua|hlsl|glsl|shader|cginc|compute|rpy|gml|swift|kt|rb|php|dart|cc|cxx|hpp|csproj|uproject|uplugin)$/i.test(path);
}
// License texts and short names recognised in LICENSE/CREDITS/README files and image metadata.
// Returns every distinct license found; callers fill the field only when exactly one is present.
const ccCode=words=>'CC-BY'+(/non-?commercial|\bnc\b/i.test(words)?'-NC':'')+(/share-?alike|\bsa\b/i.test(words)?'-SA':/no-?deriv|\bnd\b/i.test(words)?'-ND':'');
export function detectLicenses(text){
 const t=String(text),flat=t.replace(/\s+/g,' '),found=[];
 const has=(...patterns)=>patterns.every(p=>p.test(flat));
 if(has(/PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2/i,/royalty-free/i))found.push('PSF-2.0');
 else if(has(/SIL OPEN FONT LICENSE[ ,]*Version 1\.1/i,/Font Software/i))found.push('OFL-1.1');
 else if(has(/GNU AFFERO GENERAL PUBLIC LICENSE/i,/Version 3/i))found.push('AGPL-3.0-only');
 else if(has(/GNU LESSER GENERAL PUBLIC LICENSE/i,/Version 3/i))found.push('LGPL-3.0-only');
 else if(has(/GNU LESSER GENERAL PUBLIC LICENSE/i,/Version 2\.1/i))found.push('LGPL-2.1-only');
 else if(has(/GNU GENERAL PUBLIC LICENSE/i,/Version 3/i))found.push('GPL-3.0-only');
 else if(has(/GNU GENERAL PUBLIC LICENSE/i,/Version 2/i))found.push('GPL-2.0-only');
 else if(has(/Mozilla Public License,? (?:Version|v\.?) ?2\.0/i))found.push('MPL-2.0');
 else if(has(/Eclipse Public License\s*-?\s*v(?:ersion)? ?2\.0/i))found.push('EPL-2.0');
 else if(has(/Boost Software License\s*-?\s*Version 1\.0/i))found.push('BSL-1.0');
 else if(has(/provided ['‘’]as-is['‘’]/i,/altered source versions must be plainly marked/i))found.push('Zlib');
 else if(has(/free and unencumbered software released into the public domain/i))found.push('Unlicense');
 else if(has(/DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE/i))found.push('WTFPL');
 else if(has(/Permission is hereby granted, free of charge/i,/permission notice shall be included/i))found.push('MIT');
 else if(has(/copyright notice and this permission notice appear in all copies/i,/Permission to use, copy, modify,? and(?:\/or)? distribute this software/i))found.push('ISC');
 else if(has(/Permission to use, copy, modify,? and(?:\/or)? distribute this software for any purpose with or without fee is hereby granted/i))found.push('0BSD');
 else if(has(/Redistribution and use in source and binary forms/i)&&!/advertising materials/i.test(flat))found.push(/Neither the name|endorse or promote products/i.test(flat)?'BSD-3-Clause':'BSD-2-Clause');
 else if(has(/Apache License/i,/Version 2\.0/i))found.push('Apache-2.0');
 // Creative Commons by URL, full title or short name; several may appear in a credits file.
 for(const m of t.matchAll(/creativecommons\.org\/licenses\/(by(?:-nc)?(?:-sa|-nd)?)\/(\d\.\d)/gi))found.push('CC-'+m[1].toUpperCase()+'-'+m[2]);
 for(const m of flat.matchAll(/Creative Commons (Attribution(?:[- ]Non-?Commercial)?(?:[- ](?:Share-?Alike|No-?Derivatives|No-?Derivs))?) (\d\.\d)/gi))found.push(ccCode(m[1])+'-'+m[2]);
 for(const m of flat.matchAll(/\bCC[- ]?(BY(?:[- ]NC)?(?:[- ](?:SA|ND))?)[- ]?(\d\.\d)\b/gi))found.push(ccCode(m[1].replace(/-/g,' '))+'-'+m[2]);
 if(/\bCC0\b|creativecommons\.org\/publicdomain\/zero\/1\.0/i.test(flat))found.push('CC0-1.0');
 return [...new Set(found)];
}
// Minimal TOML table reader for dependency tables: `name = "1.0"` or `name = { version = "1.0", ... }`.
function tomlDependencies(text,header){
 const out=[];let inside=false;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(line.startsWith('[')){
   inside=header.test(line);
   // [dependencies.serde] style: the table name is the package.
   const sub=line.match(/^\[(?:target\..+\.)?(?:dev-|build-)?dependencies\.([^\]]+)\]$/);
   if(sub)out.push([sub[1].replace(/"/g,''),'']);
   continue;
  }
  if(!inside)continue;
  const m=line.match(/^([A-Za-z0-9_.\-"]+)\s*=\s*(.+)$/);
  if(m)out.push([m[1].replace(/"/g,''),m[2].match(/^"([^"]*)"/)?.[1]||m[2].match(/version\s*=\s*"([^"]*)"/)?.[1]||'']);
 }
 return out;
}
export function parseFile(path,text){
 const name=path.split('/').pop(), out=[];
 const add=(name,license='',extra={})=>out.push({name,license:cleanLicense(license),kind:'code',version:'',confirmed:false,evidence:path,notes:'',rights:'unknown',...extra});
 // Engine project files: the engine itself and declared packages/addons, never the game's own assets.
 if(name==='ProjectVersion.txt'){
  const version=text.match(/m_EditorVersion:\s*(\S+)/)?.[1];
  if(version)add('Unity','',{kind:'tool',version,notes:'Unity 에디터 버전. 사용 중인 Unity 플랜(Personal·Pro 등)과 에디터 약관을 확인하세요.'});
  return out;
 }
 if(name==='project.godot'){
  add('Godot Engine','MIT',{kind:'tool',version:text.match(/config\/features=PackedStringArray\("([\d.]+)"/)?.[1]||'',notes:'Godot 엔진은 MIT 라이선스입니다. 게임 배포 시 Godot 저작권·라이선스 고지를 포함하세요.'});
  return out;
 }
 if(name==='plugin.cfg'){
  const field=key=>text.match(new RegExp('^'+key+'\\s*=\\s*"([^"]*)"','m'))?.[1]||'';
  if(field('name'))add(field('name'),'',{version:field('version'),notes:'Godot 애드온. 애드온 폴더의 LICENSE와 받은 곳(에셋 라이브러리 등)의 조건을 확인하세요.'});
  return out;
 }
 // Dependency manifests of other ecosystems: each declared package becomes a candidate with its declared version.
 const declared='의존성 선언만 발견. 버전·실제 배포 여부·라이선스는 미확인.';
 if(name==='pyproject.toml'){
  // The array ends at a ']' that closes its line; extras like "pkg[gpu]" stay inside.
  const list=text.match(/^\s*dependencies\s*=\s*\[([\s\S]*?)\]\s*$/m)?.[1]||'';
  for(const m of list.matchAll(/"([^"]+)"|'([^']+)'/g)){const spec=m[1]||m[2];add(spec.split(/[=<>~!;\s[(]/)[0],'',{version:spec,notes:declared});}
  for(const [dep,version] of tomlDependencies(text,/^\[tool\.poetry\.(?:dev-)?dependencies\]$|^\[tool\.poetry\.group\.[^.]+\.dependencies\]$/))if(dep!=='python')add(dep,'',{version,notes:declared});
  return out;
 }
 if(name==='Pipfile'){
  for(const [dep,version] of tomlDependencies(text,/^\[(?:dev-)?packages\]$/))add(dep,'',{version,notes:declared});
  return out;
 }
 if(name==='Cargo.toml'){
  for(const [dep,version] of tomlDependencies(text,/^\[(?:target\..+\.)?(?:dev-|build-)?dependencies\]$/))add(dep,'',{version,notes:declared});
  return out;
 }
 if(name==='go.mod'){
  for(const m of text.matchAll(/^\s*(?:require\s+)?([\w.\-/]+\.[\w.\-/]+)\s+(v[\w.\-+]+)/gm))add(m[1],'',{version:m[2],notes:declared});
  return out;
 }
 if(/\.csproj$/i.test(name)||name==='packages.config'){
  for(const m of text.matchAll(/<(?:PackageReference|package)\b([^>]*)>(?:\s*<Version>([^<]*)<\/Version>)?/g)){
   const id=m[1].match(/\b(?:Include|id)="([^"]+)"/)?.[1];
   if(id)add(id,'',{version:m[1].match(/\b[Vv]ersion="([^"]*)"/)?.[1]||m[2]||'',notes:declared});
  }
  return out;
 }
 if(name==='pom.xml'){
  for(const m of text.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)){const tag=t=>m[1].match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]||'';if(tag('artifactId'))add(tag('groupId')+':'+tag('artifactId'),'',{version:tag('version'),notes:declared});}
  return out;
 }
 if(/^build\.gradle(\.kts)?$/.test(name)){
  for(const m of text.matchAll(/\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation|annotationProcessor|kapt)\s*\(?\s*["']([^"':\s]+:[^"':\s]+)(?::([^"'\s]+))?["']/g))add(m[1],'',{version:m[2]||'',notes:declared});
  return out;
 }
 // Lock files record the exact installed versions, including packages pulled in indirectly.
 const locked='잠금 파일에 기록된 설치 버전. 라이선스는 미확인.',seenLock=new Set();
 const lock=(dep,version)=>{const key=dep+'@'+version;if(dep&&!seenLock.has(key)){seenLock.add(key);add(dep,'',{version,notes:locked});}};
 if(name==='yarn.lock'){
  for(const block of text.split(/\r?\n(?=\S)/)){
   const spec=block.split(/,|:\s*$|:\r?\n/)[0].trim().replace(/^"|"$/g,'');
   if(!spec||spec.startsWith('#')||spec.startsWith('__metadata'))continue;
   lock(spec.slice(0,spec.indexOf('@',1)),block.match(/^\s+version:?\s+"?([^"\s]+)"?/m)?.[1]||'');
  }
  return out;
 }
 if(name==='pnpm-lock.yaml'){
  const section=text.split(/^packages:\s*$/m)[1]?.split(/^\S/m)[0]||'';
  for(const m of section.matchAll(/^ {2}'?\/?((?:@[^@\s'/]+\/)?[^@\s'/]+)[@/](\d[^:'\s(]*)/gm))lock(m[1],m[2]);
  return out;
 }
 if(/^(Cargo|poetry|uv)\.lock$/.test(name)){
  for(const block of text.split(/^\[\[package\]\]\s*$/m).slice(1)){
   const field=key=>block.match(new RegExp('^'+key+'\\s*=\\s*"([^"]*)"','m'))?.[1]||'';
   // Cargo lists the project's own crates without a source; uv marks the project as editable or virtual.
   if(name==='Cargo.lock'&&!/^source\s*=/m.test(block))continue;
   if(name==='uv.lock'&&/^source\s*=\s*\{\s*(?:editable|virtual)/m.test(block))continue;
   lock(field('name'),field('version'));
  }
  return out;
 }
 if(name==='Pipfile.lock'){
  const j=JSON.parse(text);
  for(const group of ['default','develop'])for(const [dep,v] of Object.entries(j?.[group]||{}))lock(dep,String(v?.version||'').replace(/^==/,''));
  return out;
 }
 if(name==='go.sum'){
  for(const m of text.matchAll(/^(\S+)\s+(v[^\s/]+)(?:\/go\.mod)?\s+h1:/gm))lock(m[1],m[2]);
  return out;
 }
 if(/\.(uproject|uplugin)$/i.test(name)){
  const j=JSON.parse(text);
  if(j.EngineAssociation)add('Unreal Engine','',{kind:'tool',version:String(j.EngineAssociation),notes:'Unreal Engine 버전. Unreal Engine EULA의 로열티·배포 조건을 확인하세요.'});
  if(/\.uplugin$/i.test(name))add(j.FriendlyName||name.replace(/\.uplugin$/i,''),'',{version:j.VersionName||'',notes:'Unreal 플러그인. 받은 곳(Fab 등)과 그 라이선스를 확인하세요.'});
  for(const p of Array.isArray(j.Plugins)?j.Plugins:[])if(p?.Enabled&&p.Name&&(p.MarketplaceURL||p.FabURL))add(p.Name,'',{notes:'Unreal 프로젝트에서 켠 마켓플레이스 플러그인. 구매처의 라이선스를 확인하세요.'});
  return out;
 }
 if(/\.json$/i.test(name)){
  const j=JSON.parse(text);
  if(!j||typeof j!=='object')return out;
  if(name==='manifest.json'&&j.dependencies&&Object.keys(j.dependencies).some(k=>/^com\./.test(k))){
   for(const [dep,version] of Object.entries(j.dependencies))add(dep,'',{version:String(version),notes:/^com\.unity\./.test(dep)?'Unity 패키지 선언. Unity 공식 패키지는 Unity Companion License 등 Unity 약관이 적용될 수 있습니다. 패키지 문서의 라이선스를 확인하세요.':'Unity 패키지 선언. 패키지 제공처의 라이선스를 확인하세요.'});
  }else if(name==='packages-lock.json'&&j.dependencies&&Object.keys(j.dependencies).some(k=>/^com\./.test(k))){
   // Direct packages already come from manifest.json; the lock adds what they pull in.
   for(const [dep,v] of Object.entries(j.dependencies))if(v?.depth>0)add(dep,'',{version:String(v.version||''),notes:'Unity 패키지가 함께 설치한 간접 패키지. 패키지 문서의 라이선스를 확인하세요.'});
  }else if(name==='packages.lock.json'&&j.version&&j.dependencies){
   // NuGet lock: dependencies grouped by target framework.
   const seen=new Set();
   for(const framework of Object.values(j.dependencies))for(const [dep,v] of Object.entries(framework||{})){const key=dep+'@'+v?.resolved;if(!seen.has(key)){seen.add(key);add(dep,'',{version:String(v?.resolved||''),notes:'잠금 파일에 기록된 설치 버전. 라이선스는 미확인.'});}}
  }else if(name==='vcpkg.json'){
   for(const d of Array.isArray(j.dependencies)?j.dependencies:[]){const dep=typeof d==='string'?d:d?.name;if(dep)add(dep,'',{version:typeof d==='object'&&d['version>=']||'',notes:'의존성 선언만 발견. 버전·실제 배포 여부·라이선스는 미확인.'});}
  }else if(name==='package.json'){
   add(j.name||path,j.license,{version:j.version||'',evidence:[path,j.homepage,typeof j.repository==='string'?j.repository:j.repository?.url].filter(v=>typeof v==='string'&&v).join('\n')});
   for(const [dep,version] of Object.entries({...j.dependencies,...j.devDependencies,...j.optionalDependencies,...j.peerDependencies}))add(dep,'',{version:String(version),notes:'의존성 선언만 발견. 버전 범위·실제 배포 여부·의존성 라이선스는 미확인.'});
  }else if(name==='package-lock.json'){
   if(j.packages)for(const [key,value]of Object.entries(j.packages)){if(key)add(value.name||key.split('node_modules/').pop(),value.license,{version:value.version||'',evidence:path+' :: '+key});}
   else if(j.dependencies) {const walk=(deps)=>{for(const [key,v]of Object.entries(deps)){add(key,v.license,{version:v.version||''});if(v.dependencies)walk(v.dependencies);}};walk(j.dependencies);}
  }else if(j.spdxVersion&&Array.isArray(j.packages)){
   for(const p of j.packages)add(p.name||'SPDX package',cleanLicense(p.licenseConcluded)||p.licenseDeclared,{version:p.versionInfo||'',evidence:[path,p.homepage,p.downloadLocation].filter(v=>typeof v==='string'&&v&&!['NOASSERTION','NONE'].includes(v)).join('\n')});
  }else if(j.bomFormat==='CycloneDX'&&Array.isArray(j.components)){
   const walk=components=>{for(const p of components){add(p.name||'Component',(p.licenses||[]).map(l=>l.expression||l.license?.id||l.license?.name||'').filter(Boolean).join(' AND '),{version:p.version||'',evidence:[path,...(p.externalReferences||[]).map(r=>r.url)].filter(v=>typeof v==='string'&&v).join('\n')});if(p.components)walk(p.components);}};walk(j.components);
  }
  return out;
 }
 if(/^requirements.*\.txt$/i.test(name)){
  for(const line of text.split('\n')){const value=line.trim();if(value&&!value.startsWith('#'))add(value.split(/[=<>~!;\s]/)[0]||value,'',{version:value,notes:'Python 의존성 선언. 버전·라이선스·전이 의존성을 추가 확인하세요.'});}
  return out;
 }
 const expressions=[...text.matchAll(/SPDX-License-Identifier:\s*([^\r\n]+)/g)].map(m=>m[1].replace(/\s*\*\/\s*$/,'').trim());
 if(expressions.length){for(const expression of new Set(expressions))add(path,expression);return out;}
 // A README counts only when it states license or credit terms, as asset-store packs often do.
 const readme=/^readme/i.test(name);
 if(readme&&!/\b(?:licen[cs]ed?|attribution|credits?|royalty[- ]free|creative commons|cc[- ]by|cc0|eula)\b|라이선스|저작권|출처 표기|크레딧/i.test(text))return out;
 if(/^(readme|license|licence|copying|notice|ofl|copyright|credits|attributions?|authors|third[-_ ]?party[-_ ]?notices?)/i.test(name)){
  const found=detectLicenses(text);
  add(path,found.length===1?found[0]:'',{notes:found.length>1?`여러 라이선스가 함께 있습니다(${found.join(', ')}). 자료마다 어떤 라이선스가 적용되는지 나누어 등록하세요.`:'문서 내 문구로 탐지한 후보. 여러 라이선스·수정 조항·파일별 적용 범위를 원문에서 확인하세요.'});
 }
 return out;
}
export function validateProject(input,{local=false}={}){
 if(!input||typeof input.name!=='string'||!Array.isArray(input.assets)||input.assets.length>5000)throw Error('프로젝트 이름과 최대 5,000개 항목이 있는 JSON이 필요합니다.');
 const str=(v,max=12000)=>{if(v===undefined)return '';if(typeof v!=='string'||v.length>max)throw Error('문자열 필드 형식 또는 길이가 올바르지 않습니다.');return v;};
 const bool=(v,f=false)=>{if(v===undefined)return f;if(typeof v!=='boolean')throw Error('확인 상태는 true/false여야 합니다.');return v;};
 const c=input.context||{};
 const platform=['general','steam','enterprise','conference','research'].includes(c.platform)?c.platform:'general';
 return {id:crypto.randomUUID(),demo:input.demo===true,contextConfirmed:input.contextConfirmed===true,name:str(input.name,200),context:{platform,commercial:bool(c.commercial,true),distribute:bool(c.distribute,true),modified:bool(c.modified),network:bool(c.network)},assets:input.assets.map(a=>{
  // 'font' existed briefly (981d38b, reverted); read such saved items as 'other' instead of rejecting the whole store.
  if(a?.kind==='font')a={...a,kind:'other'};
  if(!a||!a.name||!kinds[a.kind||'code'])throw Error('항목 이름 또는 종류가 올바르지 않습니다.');
  return {id:crypto.randomUUID(),name:str(a.name,500),selection:selectionOf(a),verdictLog:cleanVerdictLog(a.verdictLog),sourceCandidates:cleanCandidates(a.sourceCandidates,{imported:!local}),sourceConditionsConfirmed:bool(a.sourceConditionsConfirmed),sourceConditionsDate:str(a.sourceConditionsDate,100),licenseDocument:a.licenseDocument?validateAssignment({documents:[a.licenseDocument]}).documents[0]:undefined,kind:a.kind||'code',license:str(a.license,500),licenseOrigin:str(a.licenseOrigin,100),contractChoices:cleanContractChoices(a.contractChoices),contractRoute:str(a.contractRoute,30),organizationScale:str(a.organizationScale,30),reviewScope:str(a.reviewScope,30),version:str(a.version,500),evidence:str(a.evidence),notes:str(a.notes),plan:str(a.plan,500),date:str(a.date,100),rights:a.rights==='cleared'?'cleared':'unknown',confirmed:bool(a.confirmed),nonprofitEntityConfirmed:bool(a.nonprofitEntityConfirmed),aiGenerated:bool(a.aiGenerated),provider:str(a.provider,50),apiAccessConfirmed:bool(a.apiAccessConfirmed),planType:str(a.planType,30),scope:str(a.scope,30),repository:str(a.repository,200),serviceName:str(a.serviceName,200),outputType:str(a.outputType,30),useDescription:str(a.useDescription,500),terms:cleanTerms(a.terms,{imported:!local})};
 }),scan: typeof input.scan==='string'?input.scan.slice(0,30000):'',assignment:validateAssignment(input.assignment)};
}

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
 ['ISC License','https://opensource.org/license/isc']
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
 const result=evaluateBase(a,c,now),review=reviewSourceConditions(appliedOfficialLicense(a)?{...a,confirmed:true}:a,c,now,{contractConfirmed:result.contractConfirmed});result.blockers ||= result.status==='review'?[...result.notes]:[];
 if(review&&!result.scopeUnresolved&&!(appliedOfficialLicense(a)?.id==='isaac-code-20261016'&&a.reviewScope==='code')){
  if(review.status==='conflict'){result.status='conflict';result.conflicts=[...(result.conflicts||[]),...review.conflicts];}
  else if(review.blockers.length&&result.status==='conditions')result.status='review';
  result.notes.push(`공식 원문 검토 기록 (${review.source.observedOn})이 있습니다. 확인한 조건과 실제 사용 범위의 대조 결과를 확인하세요.`);
  if(a.provider==='other'){result.notes=result.notes.filter(n=>n!=='최신 약관을 아직 조회하지 않았습니다.');result.tasks=result.tasks.filter(t=>t!=='서비스·플랜을 지정하고 최신 약관 조회 실행');}
  result.humanChecks=[...new Set([...(result.humanChecks||[]),...review.missing])];result.blockers=[...new Set([...result.blockers,...review.blockers])];
  if(!result.sources.some(([,url])=>url===review.source.url))result.sources.push([review.source.title,review.source.url]);
 }
 result.reviewDates=[...new Set([review?.source.observedOn,result.reviewedEvidence?.builtIn?result.reviewedEvidence.checkedAt.slice(0,10):undefined,appliedOfficialLicense(a)?.date].filter(Boolean))];
 if(!result.reviewDates.length&&!a.terms&&!a.sourceCandidates?.length)result.reviewDates=[RULE_DATE];
 result.reviewWarnings=[...new Set(result.reviewDates.map(d=>reviewAge(d,now)).filter(Boolean))];
 return result;
}
function evaluateBase(a,c,now){
 if(a.licenseOrigin&&!appliedOfficialLicense(a)){
  const record=codeLicenseRecords.find(r=>a.licenseOrigin.startsWith(r.id));
  const reason=record?.requiresVersion&&!a.version?'실제 MinerU 배포 버전이 필요합니다. 현재 추가 조건 라이선스를 과거 AGPL 배포판에 적용할 수 없습니다.':a.reviewScope==='service'?'확인한 코드·모델 라이선스는 호스팅 서비스·API 구독 계약을 포함하지 않습니다.':a.reviewScope==='bundle'?'설치 배포판의 추가 구성요소·에셋 계약이 아직 확인되지 않았습니다.':record?.requiresScope&&a.reviewScope!=='code'?'공개 소스 코드만 검토할지, Kit·추가 자료까지 포함할지 선택해야 합니다.':a.version?'등록한 버전과 확보한 공식 원문의 적용 버전이 일치하는지 확인해야 합니다.':'정확한 제품·모델 배포판 또는 공식 저장소의 적용 범위가 미확인입니다.';
  return {status:'review',scopeUnresolved:true,notes:[reason],blockers:[reason],humanChecks:[],tasks:['정보 보완에서 실제 검토 범위와 해당 계약·배포판을 지정'],sources:record?[[record.scope,record.url]]:[]};
 }

 if(a.kind==='ai'&&a.provider){
  const result=evaluateContractBundle(a,c,now)||aiResult(a,now);
  // An explicitly commercial-only prohibition cannot decide a noncommercial use.
  if(!c.commercial&&result.status==='conflict'&&result.notes.includes('현재 공식 안내에서 무료 플랜의 상용 권리를 부여하지 않습니다.')){result.status='review';result.notes.push('상업 이용 제한과 별개로 현재 비상업 이용 범위에 대한 허가를 확인해야 합니다.');}

  if(c.platform==='steam'&&a.scope==='output')result.humanChecks.push('플레이어에게 제공되는 AI 콘텐츠 여부와 Steam 공개 범위 확인');
  if(a.scope==='weights')result.tasks.push('모델 버전·재배포·고지·학습 데이터 이용 조건 확인');
  if(c.platform==='conference')result.humanChecks.push('학회·출판사의 AI 사용 공개 정책 확인');
  return result;
 }
 const recommendation=categoryRecommendation(a);
 if(recommendation){const reason=`범주 추천: ${recommendation.name} → ${kinds[recommendation.kind]}. 실제 이용 방식을 선택하세요.`;return {status:'review',notes:[reason],blockers:[reason],tasks:['정보 보완에서 추천 범주를 확인하고 생성물·API·가중치 등 실제 이용 방식 선택'],humanChecks:[],sources:[]};}
 const license=(a.license||'').trim(), notes=[], tasks=[], humanChecks=[], blockers=[], conflicts=[], refs=new Set(); let status='conditions';
 const review=t=>{if(status!=='conflict')status='review';notes.push(t);blockers.push(t);};
 const conflict=t=>{status='conflict';notes.push(t);conflicts.push(t);};
 if(!license||['UNKNOWN','NOASSERTION','NONE','UNLICENSED'].includes(license.toUpperCase())) review('사용 허가를 확인할 수 없습니다. 공개된 파일이라는 사실만으로 이용이 허용되지는 않습니다.');
 else if(/\b(AND|OR|WITH)\b|[()]/.test(license)){refs.add(16);review('복수 라이선스 또는 예외 조항입니다. AND의 모든 조건, OR의 선택한 조건, WITH의 예외 범위를 직접 확인하세요.');tasks.push('적용할 라이선스와 선택·예외 근거를 기록');}
 else if(license==='MIT'||/^BSD-[23]-Clause$/.test(license)){
  notes.push('상업 이용 가능. 배포 시 저작권 및 라이선스 고지를 유지해야 합니다.');tasks.push('원본 저작권 고지와 라이선스 전문 동봉');refs.add(license==='MIT'?0:license==='BSD-2-Clause'?11:12);
 }else if(license==='ISC'){
  refs.add(19);notes.push('ISC는 유료·무료의 사용·복제·수정·배포를 허용합니다.');tasks.push('모든 사본에 원 저작권 고지와 ISC 허가 문구 유지');
 }else if(license==='PSF-2.0'){
  refs.add(17);notes.push('PSF License 2는 상업·연구 이용과 수정·배포를 허용합니다. Python으로 만든 독립 결과물에 동일 라이선스를 요구하지 않습니다.');
  tasks.push('Python 및 파생본의 PSF 라이선스와 저작권 고지 유지');
  if(c.distribute&&c.modified)tasks.push('Python 수정본 배포 시 Python에 가한 변경 사항 요약 포함');
  humanChecks.push('실제 Python 배포판의 함께 포함된 구성요소·추가 패키지는 각각의 라이선스를 확인하세요. PSF 이름·상표를 보증·홍보에 사용할 권리는 별도입니다.');
 }else if(license==='OFL-1.1'){
  refs.add(18);notes.push('OFL 1.1은 글꼴 사용·임베딩·수정·동봉 배포를 허용합니다. 글꼴로 만든 문서·이미지에 OFL을 적용할 의무는 없습니다.');
  tasks.push('글꼴 자체만 단독 판매하지 않기','글꼴 배포 시 저작권 고지·OFL 전문 유지 및 글꼴 자체의 OFL 유지');
  if(c.modified)tasks.push('수정 글꼴의 예약 글꼴명(RFN)은 권리자의 서면 허가 없이 사용하지 않기');
  humanChecks.push('저작권자·제작자의 이름으로 수정 글꼴을 홍보·보증하려면 별도 허가를 확인하세요.');
 }else if(license==='LicenseRef-OpenSees'){
  if(c.distribute&&c.commercial)conflict('OpenSees 코드를 포함한 상업적 제품 배포는 별도 허가가 필요합니다.');
  else if(c.distribute&&a.nonprofitEntityConfirmed)notes.push('확인한 교육·연구·비영리 기관의 비상업 배포 범위에서 허용됩니다.');
  else if(c.distribute)review('비상업 배포 허가 대상인 교육·연구·비영리 기관에 해당하는지 확인하세요.');
  else if(c.distribute===false)notes.push('공식 조항은 내부 이용·수정·복제를 허용합니다.');
  else review('OpenSees 코드의 외부 배포 여부를 지정하세요.');
  tasks.push('UC Berkeley 저작권·허가·면책 문구 유지','상업 배포 전 별도 허가 확보');
 }else if(license==='LicenseRef-MinerU'){
  if(c.commercial&&a.organizationScale==='above')conflict('MinerU 규모 기준을 초과하여 별도 상업 라이선스가 필요합니다. 현재 공개 허가만으로 사용할 수 없습니다.');
  else if(c.commercial&&a.organizationScale!=='below')review('상업 이용 시 조직·계열사 합산 MAU 1억 초과 또는 월 매출 2천만 달러 초과 여부와 별도 허가가 필요한지 확인해야 합니다.');
  else if(c.commercial)notes.push('조직 규모가 확인된 기준 이하이므로 MinerU 상업 이용이 추가 조건과 함께 허용됩니다.');
  else notes.push('확인한 MinerU 코드의 비상업 이용은 Apache 2.0 및 추가 표시 조건으로 허용됩니다.');
  tasks.push('Apache 2.0 라이선스·고지 유지 및 수정 사항 표시');
  if(c.network)tasks.push('온라인 서비스 화면 또는 공개 문서에 MinerU 사용을 명확하게 표시');
  humanChecks.push('별도 모델 가중치·입력 문서의 권리와 실제 배포 버전은 구분하세요.');
 }else if(license==='Apache-2.0'){
  notes.push('상업 이용 가능. 라이선스·고지 보존 및 수정 표시 조건이 있습니다.');tasks.push('라이선스 전문 및 해당 NOTICE 포함','수정한 파일에 변경 사실 표시');refs.add(1);
 }else if(/^(A?GPL|LGPL)-[23]\.0(-only|-or-later)?$/.test(license)||license==='LGPL-2.1-only'||license==='LGPL-2.1-or-later'){
  refs.add(2);notes.push('유료 판매 자체는 금지되지 않습니다. 결합 방식과 배포·네트워크 제공 여부가 중요합니다.');
  if(a.kind==='tool'&&a.reviewScope==='code'&&c.distribute){tasks.push('배포하는 도구·수정본의 대응 소스와 빌드·설치 정보를 해당 GPL 조건으로 제공','동일 라이선스와 저작권 고지를 유지하고 추가 제한을 부과하지 않기');if(license.startsWith('AGPL')&&c.network)tasks.push('수정 AGPL 프로그램과 네트워크로 상호작용하는 사용자에게 대응 소스 제공 기회 안내');humanChecks.push('독립 도구 자체의 배포 기준입니다. 다른 프로그램에 결합·링크한 제품은 별도로 검토하세요.');}
  else if(c.distribute||license.startsWith('AGPL')&&c.network){review('소스 제공·재링크·동일 라이선스 적용 범위를 확인해야 합니다.');tasks.push('정적/동적 링크, 수정 여부, 배포 범위를 검토','적용 버전과 예외에 따른 소스 제공 의무 검토');}
  else tasks.push('내부 사용 범위를 기록하고 외부 제공 전 재검토');
 }else if(license==='MPL-2.0'){
  refs.add(13);if(c.distribute===false){notes.push('외부 배포 없는 내부 이용에는 외부 소스 제공 의무가 발생하지 않습니다.');tasks.push('외부 배포를 시작하기 전에 MPL 파일의 고지·소스 제공 범위 재검토');}else if(c.distribute===true){notes.push('MPL 파일의 소스 제공과 고지 의무를 지키면 배포할 수 있습니다. 별도 파일 전체에 MPL을 강제하지 않습니다.');tasks.push('MPL 적용 파일(수정분 포함)의 소스를 MPL로 제공하고 수령자에게 입수 방법 안내','라이선스·저작권 고지를 유지하고 소스에 대한 수령자의 권리를 제한하지 않기');}else review('외부 배포 여부를 지정하세요.');
 }else if(license==='CC0-1.0'){
  notes.push('저작권 관련 조건은 간소하지만 상표·특허·제3자 권리까지 허가하는 것은 아닙니다.');refs.add(5);
 }else if(/^CC-BY(?:-NC)?(?:-SA|-ND)?-4\.0$/.test(license)){
  refs.add(license.includes('-NC')?4:license.includes('-SA')?14:license.includes('-ND')?15:3);tasks.push('저작자·출처·라이선스 링크·변경 사실 표시');
  if(license.includes('-NC')&&c.commercial)conflict('비상업용(NC) 조건과 선택한 상업 목적이 충돌합니다. 별도 허가나 대체 자료가 필요합니다.');
  if(license.includes('-NC')&&c.commercial===false){tasks.push('상업적 이익이나 금전적 보상을 주된 목적으로 사용하지 않기');humanChecks.push('비상업 목적 선택을 기준으로 합니다. 연구·학회라는 명칭만으로 NC 충족이 보장되지는 않습니다.');}else if(license.includes('-NC')&&c.commercial!==true)review('상업 목적 여부를 지정하세요.');
  if(license.includes('-SA')&&c.distribute&&c.modified!==false){if(typeof c.modified!=='boolean')review('자료 수정 여부를 지정하세요.');else{tasks.push('공유하는 변형물에 동일하거나 호환되는 SA 라이선스 적용','추가 법적 제한이나 이용을 막는 기술적 조치를 부과하지 않기');humanChecks.push('단순 모음과 변형물의 구분이 애매하면 해당 부분의 적용 범위를 확인하세요.');}}
  if(license.includes('-ND')&&c.modified&&c.distribute)conflict('변경금지(ND) 자료의 변형물 공유와 충돌할 수 있습니다. 별도 허가를 확인하세요.');
 }else if(license==='Editorial-Only'){
  refs.add(10);if(c.commercial||c.platform==='steam')conflict('Editorial 전용 허가는 일반 상업 게임 사용을 허용하지 않습니다. 권리자의 별도 허가가 필요합니다.');
  else review('해당 이용이 허가된 보도·편집·연구 용도에 해당하는지 확인하세요.');
 }else if(license)review('사용자 계약 또는 지원하지 않는 라이선스입니다. 원문 조건을 직접 검토하세요.');
 const official=appliedOfficialLicense(a);
 if(official){notes.push('공식 원문 자동 보완 · '+official.date+' · '+official.scope);humanChecks.push('공식 원문에 표시된 코드·모델 범위 기준입니다. 별도 배포판·포크·동봉 라이브러리·모델·데이터는 각 라이선스를 확인하세요.');}
 if((!a.confirmed||!a.evidence?.trim())&&!official){review('라이선스 적용 범위와 근거가 아직 확인되지 않았습니다. 자동 탐지는 후보 정보입니다.');humanChecks.push('원문·구매 증빙·적용 버전을 확인하고 확인 여부 기록');if(a.licenseOrigin)blockers.push('자동 보완 원문과 등록된 이름·종류·버전의 적용 범위를 대조해야 합니다.');}
 if(['model','image','audio','data'].includes(a.kind)&&a.rights!=='cleared'){
  humanChecks.push('브랜드·디자인·초상·음성·개인정보 등 제3자 권리는 별도 확인이 필요합니다. 라이선스상 허용만으로 확보되는 권리가 아닙니다.');
 }
 if(a.kind==='ai'||a.aiGenerated){
  if(/meshy/i.test(a.name))refs.add(8);else if(/tripo/i.test(a.name))refs.add(9);else if(/openai|chatgpt|codex/i.test(a.name))refs.add(7);
  review('AI 서비스·플랜·생성 시점 약관 및 입력 자료 권리는 별도 검토 대상입니다.');
  tasks.push('플랜·생성일·약관 버전·입력 출처 기록','출력 이용 허가와 모델 가중치/서비스 이용 허가를 구분');
  if(c.platform==='steam'&&a.kind!=='tool'){refs.add(6);humanChecks.push('플레이어에게 제공되는 AI 콘텐츠 여부와 Steam 설문 기재 범위 확인');}
 }
 if(a.kind==='tool'){humanChecks.push('호스팅 서비스·유료 배포판·플러그인·동봉 에셋을 함께 쓰는 경우 해당 계약을 별도로 확인하세요. 이 결과는 확인한 도구 라이선스 범위입니다.');}
 if(c.platform==='conference')humanChecks.push('학회·출판사의 AI 공개 및 자료 재사용 정책 확인');
 if(c.platform==='enterprise')humanChecks.push('납품 계약의 재배포·보증·소스 공개 조건 확인');
 return {status,conflicts,permissions:official?['확인한 범위: '+official.scope+'. 이 범위의 공식 라이선스에서 이용 허가를 확인했습니다. 개별 설치 파일 전체를 검사한 결과는 아닙니다.']:[],humanChecks,blockers:[...new Set(blockers)],notes:[...new Set(notes)],tasks:[...new Set(tasks)],sources:[...(official?[[official.scope,official.url]]:[]),...[...refs].map(i=>sources[i])]};
}
const cleanLicense=x=> typeof x==='string'&&!['NOASSERTION','NONE'].includes(x)?x:typeof x?.type==='string'?x.type:'';
export function isReadable(path){
 if(/(^|[\\/])(\.git|\.env[^/\\]*|\.ssh|\.aws)([\\/]|$)/i.test(path))return false;
 return /(^|\/)(package(?:-lock)?\.json|requirements[^/]*\.txt|[^/]*(?:sbom|bom)[^/]*\.json|licenses?(?:[.-][^/]*)?|copying(?:[.-][^/]*)?|notice(?:[.-][^/]*)?)$/i.test(path)||/\.(js|mjs|ts|tsx|jsx|py|cs|cpp|c|h|rs|go|java|json)$/i.test(path);
}
export function parseFile(path,text){
 const name=path.split('/').pop(), out=[];
 const add=(name,license='',extra={})=>out.push({name,license:cleanLicense(license),kind:'code',version:'',confirmed:false,evidence:path,notes:'',rights:'unknown',...extra});
 if(/\.json$/i.test(name)){
  const j=JSON.parse(text);
  if(!j||typeof j!=='object')return out;
  if(name==='package.json'){
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
 if(/^(license|licence|copying|notice)/i.test(name)){
  let candidate='';
  if(/PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2/i.test(text)&&/royalty-free/i.test(text))candidate='PSF-2.0';
  else if(/SIL OPEN FONT LICENSE[\s,]*Version 1\.1/i.test(text)&&/Font Software/i.test(text))candidate='OFL-1.1';
  else if(/Permission is hereby granted, free of charge/i.test(text)&&/permission notice shall be included/i.test(text))candidate='MIT';
  else if(/ISC License/i.test(text)&&/copyright notice and this permission notice appear in all copies/i.test(text.replace(/\s+/g,' ')))candidate='ISC';
  else if(/Apache License/i.test(text)&&/Version 2\.0/i.test(text))candidate='Apache-2.0';
  else if(/CC0 1\.0|creativecommons.org\/publicdomain\/zero\/1.0/i.test(text))candidate='CC0-1.0';
  add(path,candidate,{notes:'문서 내 문구로 탐지한 후보. 여러 라이선스·수정 조항·파일별 적용 범위를 원문에서 확인하세요.'});
 }
 if(!out.length&&/\.(js|mjs|ts|tsx|jsx|py|cs|cpp|c|h|rs|go|java)$/i.test(path))add(path,'',{notes:'소스에서 SPDX 표시를 찾지 못했습니다. 직접 작성한 코드인지, 어떤 상위 라이선스·계약이 적용되는지 확인하세요.'});
 return out;
}
export function validateProject(input,{local=false}={}){
 if(!input||typeof input.name!=='string'||!Array.isArray(input.assets)||input.assets.length>5000)throw Error('프로젝트 이름과 최대 5,000개 항목이 있는 JSON이 필요합니다.');
 const str=(v,max=12000)=>{if(v===undefined)return '';if(typeof v!=='string'||v.length>max)throw Error('문자열 필드 형식 또는 길이가 올바르지 않습니다.');return v;};
 const bool=(v,f=false)=>{if(v===undefined)return f;if(typeof v!=='boolean')throw Error('확인 상태는 true/false여야 합니다.');return v;};
 const c=input.context||{};
 const platform=['general','steam','enterprise','conference','research'].includes(c.platform)?c.platform:'general';
 return {id:crypto.randomUUID(),demo:input.demo===true,contextConfirmed:input.contextConfirmed===true,name:str(input.name,200),context:{platform,commercial:bool(c.commercial,true),distribute:bool(c.distribute,true),modified:bool(c.modified),network:bool(c.network)},assets:input.assets.map(a=>{
  if(!a||!a.name||!kinds[a.kind||'code'])throw Error('항목 이름 또는 종류가 올바르지 않습니다.');
  return {id:crypto.randomUUID(),name:str(a.name,500),selection:selectionOf(a),sourceCandidates:cleanCandidates(a.sourceCandidates,{imported:!local}),sourceConditionsConfirmed:bool(a.sourceConditionsConfirmed),sourceConditionsDate:str(a.sourceConditionsDate,100),licenseDocument:a.licenseDocument?validateAssignment({documents:[a.licenseDocument]}).documents[0]:undefined,kind:a.kind||'code',license:str(a.license,500),licenseOrigin:str(a.licenseOrigin,100),contractChoices:cleanContractChoices(a.contractChoices),contractRoute:str(a.contractRoute,30),organizationScale:str(a.organizationScale,30),reviewScope:str(a.reviewScope,30),version:str(a.version,500),evidence:str(a.evidence),notes:str(a.notes),plan:str(a.plan,500),date:str(a.date,100),rights:a.rights==='cleared'?'cleared':'unknown',confirmed:bool(a.confirmed),nonprofitEntityConfirmed:bool(a.nonprofitEntityConfirmed),aiGenerated:bool(a.aiGenerated),provider:str(a.provider,50),apiAccessConfirmed:bool(a.apiAccessConfirmed),planType:str(a.planType,30),scope:str(a.scope,30),repository:str(a.repository,200),serviceName:str(a.serviceName,200),outputType:str(a.outputType,30),useDescription:str(a.useDescription,500),terms:cleanTerms(a.terms,{imported:!local})};
 }),scan: typeof input.scan==='string'?input.scan.slice(0,30000):'',assignment:validateAssignment(input.assignment)};
}

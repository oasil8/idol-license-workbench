// Curated public-source observations, reviewed 2026-10-15; never user/project data.
const observedOn='2026-10-15';
const records=[
 ['midjourney',['Midjourney','미드저니'],'Midjourney 이용약관','https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service','Rights You Give to Midjourney; Your Rights','매출 조건과 Pro/Mega 플랜, 직접 생성 여부를 확인하세요.','직접 생성한 출력물 · 추가 조건 별도'],
 ['elevenlabs',['ElevenLabs'],'ElevenLabs 일반 약관 (non-EEA)','https://elevenlabs.io/terms-of-use','Free User / Paid User; Output / Models','무료 서비스는 비상업 용도, 유료 구독은 상업 용도를 허용하는 조항이 있습니다. 금지 이용 정책·서비스별 추가 약관과 실제 계약 적용 범위는 별도입니다.','일반 서비스 계약 · 지역·구독·제품별 조건 구분'],
 ['copilot',['GitHub Copilot','깃허브 코파일럿'],'GitHub Copilot 적용 계약 안내','https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features','GitHub Copilot — purchasing route','개인용은 GitHub ToS J, GitHub 직접 기업 구매는 Generative AI Services Terms, Microsoft 구매는 Microsoft Product Terms. 출력물의 제3자 라이선스 확인 필요.','구매 경로별 계약 · 코드 출력물과 API 제공 구분'],
 ['runway',['Runway','Runway ML','런웨이'],'Runway 생성물 상업 이용 안내','https://help.runwayml.com/hc/en-us/articles/21668707517587-Can-I-use-the-content-I-made-in-Runway-for-commercial-purposes','Commercial use of generated content','직접 생성한 콘텐츠는 상업 이용이 허용됩니다. 출력물 표시와 별개로 API 통합에는 별도 표시·접근 조건이 적용됩니다.','직접 생성한 출력물 · API·가중치 제외'],
 ['tripo',['Tripo'],'Tripo 상업 이용 안내','https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially','Free vs Paid Plans; What About Input Images?','유료 플랜 생성물의 상업 이용과 무료 플랜의 권리 차이를 명시합니다. 입력 자료에 포함된 저작권·상표 등 제3자 권리는 별개입니다.','서비스 출력물 · 생성 당시 플랜 기준'],
 ['meshy',['Meshy'],'Meshy 생성물 이용 허가','https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained','Can I use my generated assets for commercial projects? — If you are on a free plan, we grant you a CC BY 4.0 license instead.','무료 플랜은 CC BY 4.0 및 출처 표시, 유료 플랜은 비침해 입력 자료를 전제로 생성물 소유를 설명합니다.','서비스 출력물 · 모델 가중치 허가와 구분'],
 ['openai',['OpenAI / ChatGPT','OpenAI','ChatGPT','Codex'],'OpenAI 개인용 이용약관','https://openai.com/policies/row-terms-of-use/','Content — Your content; Ownership of content','개인용 서비스의 출력 권리 이전과 입력 권리 확보 의무를 명시합니다. API·기업용은 별도 계약입니다.','개인용 서비스 · 기업/API 계약에 적용 확정 불가'],
 ['anthropic',['Claude','Anthropic'],'Anthropic 개인용 이용약관','https://www.anthropic.com/legal/consumer-terms','4. Inputs, Outputs, Actions, and Materials','약관 준수를 전제로 출력 권리를 양도하며 입력 권리와 정확성 확인은 사용자에게 요구합니다. API는 별도 상업 약관입니다.','Claude 개인용 · API 계약과 구분'],
 ['rodin',['Rodin','Hyper3D'],'Hyper3D / Rodin 이용약관','https://hyper3d.ai/legal/terms','2. Use of Our Services; 5. Prompts and Output','구독·구매 조건에 따라 3D 결과물 이용이 달라집니다. 구매한 결과물과 공개·탐색 콘텐츠의 허가를 구분해야 합니다.','Rodin 서비스 · 구매 항목과 적용 계약 확인 필요'],
 ['higgsfield',['Higgsfield'],'Higgsfield 이용약관','https://higgsfield.ai/terms-of-use-agreement','4.2–4.4; 5. User Conduct','출력물 상업 이용을 제한하지 않는다는 조항이 있습니다. 입력 자료·인물 등의 권리 확보와 학습 이용 제한은 별도 조건입니다.','서비스 출력물 · 입력 권리 및 허용 이용 조건 별도'],
 ['hunyuan',['Hunyuan3D','Hunyuan3D-2','Hunyuan3D 2.0'],'Hunyuan3D 2.0 LICENSE','https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE','Definitions — Territory; 4. Additional Commercial Terms; 5(c)','이 2.0 라이선스의 허용 지역에서 EU·영국·한국이 제외됩니다. 다른 버전이나 별도 호스팅 계약까지 같은 결론으로 확대하면 안 됩니다.','Hunyuan3D 2.0 배포판 한정 · 실제 버전·사용 지역 확인'],
 ['cosmos',['NVIDIA Cosmos','Cosmos'],'NVIDIA Cosmos 공식 저장소','https://github.com/NVIDIA/cosmos/blob/main/README.md','Citation & license','확인한 현재 저장소는 Cosmos 3의 코드·모델에 OpenMDW-1.1을 연결합니다. 이전 세대와 구성요소는 별도 라이선스일 수 있습니다.','현재 저장소 안내 · 모델 세대·코드/가중치 범위 확인'],
 ['blender',['Blender'],'Blender License','https://www.blender.org/about/license/','Your Artwork; GNU General Public License','Blender 프로그램의 GPL과 제작한 작품의 권리를 구분합니다. 공식 안내는 제작한 작품의 상업 이용을 허용하며 외부 에셋·애드온 권리는 별도입니다.','공식 Blender 및 제작물 · 애드온·입력 에셋 별도'],
 ['isaac',['NVIDIA Isaac Sim','Isaac Sim'],'NVIDIA Isaac Sim 추가 소프트웨어·자료 라이선스','https://www.nvidia.com/en-us/agreements/enterprise-software/isaac-sim-additional-software-and-materials-license/','1. License Grant; 2. License Restrictions; Components Under Other Licenses','이 계약이 적용되는 추가 소프트웨어·자료에는 NVIDIA GPU 환경 및 재배포 제한 등이 있습니다. 공개 소스·추가 패키지별 계약을 구분해야 합니다.','추가 소프트웨어·자료 계약 · 실제 Isaac Sim 버전·구성 확인'],
 ['chrono',['Project Chrono','Chrono'],'Project Chrono LICENSE','https://github.com/projectchrono/chrono/blob/main/LICENSE','Redistribution conditions','확인한 공식 저장소는 BSD 3-Clause 조건으로 고지 보존과 보증 부인을 요구합니다. 배포 버전과 함께 사용하는 별도 모델·데이터는 추가 확인 대상입니다.','공식 저장소 코드 · 차량 에셋·데이터의 허가와 구분'],
 ['unity',['Unity'],'Unity Editor Software Terms','https://unity.com/legal/editor-terms-of-service/software','1. Unity Software Tier Eligibility; Unity Editor Rights','사용자·회사·고객의 재무 조건과 사용 목적에 맞는 요금제 자격을 확인해야 합니다. 엔진 사용권과 Asset Store 자료의 허가는 다릅니다.','Unity Editor · 버전·플랜·재무/고객 조건 확인'],
 ['unreal',['Unreal Engine','Unreal'],'Unreal Engine EULA','https://www.unrealengine.com/eula/unreal','3. What you Pay; 4. Distribution; 6. Seat Subscriptions','제품·배포 방식에 따라 로열티 또는 좌석 구독과 예외를 검토합니다. 별도 마켓 에셋은 엔진 EULA만으로 허가되지 않습니다.','Unreal Engine · 제품 유형·배포·좌석/로열티 조건 확인'],
 ['usd',['OpenUSD','USD'],'OpenUSD 공식 소개 및 라이선스 안내','https://openusd.org/dev/intro.html','Introduction to USD — license','공식 소개는 TOST 라이선스를 안내합니다. USD 라이브러리 허가는 USD 파일 안에 포함한 차량·텍스처·상표의 권리를 부여하지 않습니다.','OpenUSD 구현 · 컨테이너 안의 콘텐츠 권리와 구분'],
 ['porsche',['Porsche 997'],'Porsche 공식 법적 고지','https://newsroom.porsche.com/en_US/legal-notice.html','Restricted Use and Copyrights; Trademarks','미국 뉴스룸 고지는 사진·차량의 구별되는 형상·상표 등을 다루며 사이트 공개가 사용 허가를 뜻하지 않음을 명시합니다. 실제 적용 법과 별도 허가를 확인해야 합니다.','미국 뉴스룸 자료 · 차량 디자인 사용 허가의 대체 문서 아님'],
 ['tesla',['Tesla Cybertruck','Cybertruck'],'Tesla 지식재산권 안내','https://www.tesla.com/legal/additional-resources#intellectual-property','Intellectual Property — Copyrights; Trademarks; No Licenses','공식 사이트 자료·상표의 권리를 보호하며 사이트 자료 제공 자체가 지식재산권 라이선스를 부여하지 않는다고 명시합니다.','사이트 콘텐츠·상표 안내 · 차량 모델 사용 허가 별도']
].map(([id,names,title,url,clause,note,scope])=>({id,names,title,url,clause,note,scope,observedOn:['meshy','openai','anthropic','tripo','runway','copilot','elevenlabs','midjourney'].includes(id)?'2026-10-16':observedOn}));

export function officialSource(a){
 const text=String(a.serviceName||a.name||'').normalize('NFKC').trim().toLowerCase();
 return records.find(r=>['tripo','meshy','openai','anthropic'].includes(a.provider)?r.id===a.provider:r.names.some(n=>n.toLowerCase()===text));
}
export function reviewSourceConditions(a,c,now=Date.now(),{contractConfirmed=false}={}){
 const source=officialSource(a);if(!source)return undefined;
 const stale=now-Date.parse(source.observedOn+'T00:00:00+09:00')>90*86400000;
 const checked=Date.parse((a.sourceConditionsDate||'')+'T00:00:00+09:00');
 const reviewedRecently=a.sourceConditionsConfirmed&&a.confirmed&&!!a.evidence?.trim()&&Number.isFinite(checked)&&checked<=now&&now-checked<=7*86400000;
 const missing=[],conflicts=[];let status='review';
 const fixedLicense=['chrono','blender'].includes(source.id)&&a.confirmed&&!!a.evidence?.trim()&&['BSD-3-Clause','GPL-3.0-only','GPL-2.0-or-later'].includes(a.license);
 if((['tripo','rodin','unity'].includes(source.id)||source.id==='meshy'&&!contractConfirmed)&&(!a.planType||a.planType==='unknown')&&!a.plan)missing.push('사용하거나 생성할 당시의 요금제·구매 유형이 미정입니다.');
 if(['hunyuan','cosmos','isaac','chrono','unity','unreal','usd'].includes(source.id)&&!a.version&&!fixedLicense)missing.push('실제 배포판·모델·엔진 버전이 미정입니다.');
 if(['hunyuan','unity','unreal'].includes(source.id)&&!reviewedRecently)missing.push('사용 지역·조직/고객 조건·배포 방식 중 적용 조건을 근거에 기록하세요.');
 if(!contractConfirmed&&['openai','anthropic'].includes(source.id)&&(!a.planType||['unknown','business'].includes(a.planType)))missing.push('개인용 또는 기업/API 계약 중 어떤 문서가 적용되는지 확정해야 합니다.');
 if(!contractConfirmed&&(a.kind==='ai'||a.kind==='model')&&a.rights!=='cleared')missing.push('입력 자료·상표·초상 등 제3자 권리가 미확인입니다.');
 if(!contractConfirmed&&!a.confirmed)missing.push('이 자료에 대한 원문 적용 범위를 아직 직접 확인하지 않았습니다.');
 if(a.kind==='ai'&&a.provider==='tripo'&&source.id==='tripo'&&a.scope==='output'&&a.planType==='free'&&c.commercial){status='conflict';conflicts.push('공식 안내에서 무료 플랜 결과물의 상업 이용 권리는 부여되지 않습니다.');}
 return {source,status,missing,conflicts,blockers:[...missing],stale,summary:source.note};
}

// Official code-license observations, not a live fetch or user attestation.
export const codeLicenseRecords=[
 {id:'mineru-20261016',names:['MinerU'],license:'LicenseRef-MinerU',url:'https://github.com/opendatalab/MinerU/blob/master/LICENSE.md',home:'https://github.com/opendatalab/MinerU',versions:['master'],requiresVersion:true,scope:'MinerU 현재 master 코드 · 모델 가중치·과거 배포판 제외',clause:'Apache 2.0에 추가 조건이 있음. 합산 MAU 1억 초과 또는 월 매출 2천만 달러 초과 시 별도 상업 라이선스. 온라인 서비스에 MinerU 사용 표시. 과거 AGPL 배포판과 구분.'},
 {id:'docker-20261016',names:['Docker Engine','Moby'],license:'Apache-2.0',url:'https://github.com/moby/moby/blob/master/LICENSE',home:'https://github.com/moby/moby',versions:['master'],scope:'Docker Engine / Moby 공개 코드 · Desktop/Hub 구독 제외',clause:'Apache-2.0 고지·수정 표시 의무. Docker Desktop을 통한 사용과 Hub 서비스는 별도 계약.'},
 {id:'tailscale-20261016',names:['Tailscale'],license:'BSD-3-Clause',url:'https://github.com/tailscale/tailscale/blob/main/LICENSE',home:'https://github.com/tailscale/tailscale',versions:['main'],scope:'Tailscale 공개 클라이언트 코드 · 호스팅 서비스 제외',clause:'BSD 고지·면책 유지. 관리 서비스 구독 및 별도 앱 구성요소는 해당 계약 확인.'},
 {id:'isaac-code-20261016',names:['NVIDIA Isaac Sim','Isaac Sim','IsaacSim'],license:'Apache-2.0',url:'https://docs.isaacsim.omniverse.nvidia.com/6.2.0/common/license-faq.html',home:'https://github.com/isaac-sim/IsaacSim',versions:['6.2','6.2.0','main'],requiresScope:true,scope:'Isaac Sim 공개 소스 코드만 · Omniverse Kit/추가 모델·텍스처 제외',clause:'공개 코드는 Apache-2.0. Kit 포함 배포·제3자 서비스는 별도 라이선스 검토. 검토 범위를 코드로 명시해야 코드 결론을 적용.'},
 {id:'qwen36-20261016',names:['Qwen3.6','Qwen3.6-35B-A3B'],kinds:['model'],license:'Apache-2.0',url:'https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE',home:'https://huggingface.co/Qwen/Qwen3.6-35B-A3B',versions:['main','Qwen3.6-35B-A3B'],scope:'Qwen3.6-35B-A3B 가중치 배포판 · Qwen API/다른 모델 제외',clause:'해당 가중치 저장소의 Apache-2.0. Qwen3.6 제품군 전체나 호스팅 API 계약으로 확대하지 않음.'},
 {id:'opensees-20261016',names:['OpenSees'],license:'LicenseRef-OpenSees',url:'https://opensees.github.io/OpenSeesDocumentation/developer/license.html',home:'https://github.com/OpenSees/OpenSees',versions:[],scope:'OpenSees UC Berkeley 코드 이용 조건',clause:'교육·연구·비영리 기관의 비상업적 이용·배포 및 다른 주체의 내부 이용 허용. 상업적 제품 배포는 별도 허가 필요. 고지 유지.'},

 {id:'numpy-20261016',names:['NumPy','넘파이'],license:'BSD-3-Clause',url:'https://numpy.org/doc/stable/license.html',home:'https://github.com/numpy/numpy',versions:['2.5','2.5.0'],scope:'NumPy 공식 프로젝트 코드',clause:'소스·바이너리의 사용·수정·재배포 허용. 고지·면책 문구 유지, 이름을 이용한 무단 보증 금지.'},
 {id:'python-20261016',names:['Python','파이썬'],license:'PSF-2.0',url:'https://docs.python.org/3/license.html#psf-license',home:'https://www.python.org/',versions:['3.15','3.15.0'],scope:'CPython 공식 코드·문서의 PSF 적용 부분',clause:'사용·수정·배포 허용. PSF 고지 유지, 수정 배포 시 변경 요약. 포함된 별도 라이선스는 추가 확인.'},
 {id:'chrono-20261016',names:['Project Chrono','Chrono'],license:'BSD-3-Clause',url:'https://github.com/projectchrono/chrono/blob/main/LICENSE',home:'https://github.com/projectchrono/chrono',versions:['main'],scope:'Project Chrono 공식 저장소 코드',clause:'소스·바이너리 사용·수정·재배포 허용. 고지·면책 유지, 기여자 이름으로 무단 보증 금지.'}
].map(r=>({...r,date:'2026-10-16'}));
function evidenceAddresses(a){
 return (String(a.evidence||'').match(/https:\/\/[^\s<>]+/g)||[]).map(x=>{try{const u=new URL(x.replace(/[.,;)\]]+$/,''));return !u.username&&!u.password?(u.origin+u.pathname).replace(/\/$/,''):'';}catch{return '';}});
}
function missingQwenDistribution(a,r){
 return r?.id==='qwen36-20261016'&&String(a.name||'').normalize('NFKC').trim().toLowerCase()==='qwen3.6'&&!evidenceAddresses(a).includes(r.home);
}
export function matchingCodeLicense(a){
 if(!['code','tool','model'].includes(a.kind)||a.aiGenerated||a.provider||a.repository||['service','bundle'].includes(a.reviewScope))return;
 if(a.reviewScope==='model'&&a.kind!=='model'||a.reviewScope==='code'&&a.kind==='model')return;
 const name=String(a.name||'').normalize('NFKC').trim().toLowerCase();
 const urls=evidenceAddresses(a);
 return codeLicenseRecords.find(r=>(r.kinds||['code','tool']).includes(a.kind)&&r.names.some(n=>name===n.toLowerCase()||name.startsWith(n.toLowerCase()+' · ')&&urls.includes(r.home.replace(/\/$/,''))));
}
export function supplementCodeLicense(a){
 const r=matchingCodeLicense(a)||webLicenseRecord(a);if(!r)return a;
 const license=String(a.license||'').trim();
 const unknown=!license||['UNKNOWN','NOASSERTION','미확인'].includes(license.toUpperCase());
 if(a.licenseOrigin||(!unknown&&(license!==r.license||r.trusted===false)))return a;
 const addition=`${r.trusted===false?'후보 원문에서 라이선스 추출':'공식 원문 자동 보완'} · ${r.date} · ${r.scope}\n${r.url}\n${r.clause}`;
 if((a.evidence||'').length+addition.length+2>12000)return a;
 const origin=missingQwenDistribution(a,r)?r.id+'-scope-needed':r.id;
 return {...a,license:r.license,licenseOrigin:origin,evidence:[a.evidence,addition].filter(Boolean).join('\n\n')};
}
export function appliedOfficialLicense(a){
 const r=matchingCodeLicense(a)||webLicenseRecord(a);
 if(r?.requiresScope&&a.reviewScope!=='code'||r?.requiresVersion&&!a.version)return;
 if(missingQwenDistribution(a,r))return;
 if(r?.trusted===false)return;
 if(!r||![r.id,...(r.id==='qwen36-20261016'?[r.id+'-scope-needed']:[])].includes(a.licenseOrigin)||a.license!==r.license||!String(a.evidence||'').includes(r.url))return;
 if(a.version&&!r.versions.includes(a.version.trim()))return;
 return r;
}

export function webLicenseRecord(a){
 if(!['code','tool'].includes(a.kind)||['service','bundle','model'].includes(a.reviewScope)||a.provider||a.aiGenerated)return;
 for(const s of a.sourceCandidates||[]){const v=s.verification;if(!v?.licenseKey||v.query!==a.name||!v.text||v.truncated)continue;
 const date=Date.parse(v.checkedAt),fresh=Number.isFinite(date)&&Date.now()-date<=7*86400000&&date<=Date.now()+60000;
 return {id:'web:'+v.hash,license:v.licenseKey,url:v.finalUrl,home:s.url,versions:v.sourceRef?[v.sourceRef]:[],scope:'저장소 코드 · '+v.repositoryId+(v.sourceRef?' · '+v.sourceRef:''),clause:'GitHub 라이선스 원문과 SPDX 식별자를 확보했습니다. 공식 저장소 여부·별도 파일 적용은 구분합니다.',date:v.checkedAt.slice(0,10),trusted:v.status==='matched'&&!v.imported&&fresh};
 }
}

export const oldReviewWarning='검토한 지 오래된 기록입니다. 원문을 다시 확인하세요';
export function reviewAge(date,now=Date.now()){return Number.isFinite(Date.parse(date))&&now-Date.parse(date)>90*86400000?oldReviewWarning:'';}

export const officialRecord=id=>records.find(r=>r.id===id);

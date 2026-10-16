const definitions=[
 ['Tripo','ai','tripo','model',/\btripo(?:\s*ai)?\b|트리포/iu],
 ['Rodin','ai','other','model',/\brodin\b|로딘/iu],
 ['Hunyuan3D','ai','other','model',/\bhunyuan\s*3d(?:[-\s]*\d+(?:\.\d+)*)?\b|훈위안|혼위안/iu],
 ['Higgsfield','ai','other','image',/\bhiggsfield\b|힉스필드/iu],
 ['NVIDIA Cosmos','ai','other','video',/\bcosmos\b|코스모스/iu],
 ['OpenAI / ChatGPT','ai','openai','code',/\b(?:openai|chatgpt|codex)\b|챗지피티|챗GPT|코덱스/iu],
 ['Claude','ai','anthropic','code',/\b(?:claude|anthropic)\b|클로드/iu],
 ['Meshy','ai','meshy','model',/\bmeshy\b|메시\s*AI/iu],
 ['Blender','tool','','',/\bblender\b|블렌더/iu],
 ['NVIDIA Isaac Sim','tool','','',/\bisaac\s*sim\b|아이[작삭]\s*심/iu],
 ['Project Chrono','code','','',/\b(?:project\s*)?chrono(?:-unity)?\b|크로노/iu],
 ['Unity','tool','','',/\bunity\b|유니티/iu],
 ['Unreal Engine','tool','','',/\bunreal(?:\s*engine)?\b|언리얼/iu],
 ['OpenUSD','code','','',/\b(?:open\s*)?usd\b|오픈\s*USD/iu],
 ['Porsche 997','model','','',/\bporsche\s*997\b|포르[쉐셰]\s*997/iu],
 ['Tesla Cybertruck','model','','',/\b(?:tesla\s*)?cybertruck\b|사이버트럭/iu]
];
const checklist=[
 {title:'단계별 입력 → 처리 원리 → 출력',detail:'스케치·사양 → 3D 생성 → 메시 정리 → USD 전달 → 주행 실험 → 비교 단계마다 입력 형식, 사람이 정하는 값, 도구가 수행하는 처리, 출력 형식과 실패 조건을 표로 작성하세요.'},
 {title:'형상 손실을 측정할 기준',detail:'원본 스케치의 기준 치수와 생성 모델의 전장·전폭·전고, 바퀴 위치를 정하고 단계별 오차를 비교하세요. 2D만 있으면 단일 정답 3D가 정해지지 않으므로 추가 사양과 측정 기준을 명시하세요.'},
 {title:'주행 비교 실험의 통제 조건',detail:'질량·관성·휠베이스·마찰·구동 입력·초기 상태를 기록하고, 시각 메시와 충돌 형상을 구분하세요. 바꾸는 형상과 고정하는 물성값을 정한 뒤 같은 조건에서 경로·속도 등의 결과를 비교하세요.'},
 {title:'OpenUSD 전달과 SimReady 점검',detail:'파일 변환 후 단위·축·스케일·좌표와 충돌체·강체·관절·바퀴 회전을 확인하세요. USD로 저장했다는 사실만으로 주행 가능한 모델이 되지는 않습니다.'},
 {title:'도구 선택의 근거와 재현 기록',detail:'실제 사용 도구와 피드백의 대안을 구분하고, 선택한 이유와 버전·프롬프트·설정·중간 파일을 남기세요. 주행 목적에 맞는 파이프라인인지 작은 예제로 검증하세요.'},
 {title:'서비스·가중치·생성물·참고 자료의 권리',detail:'서비스 플랜과 생성일, 코드·가중치의 정확한 버전, 생성물 이용 조건을 따로 확인하세요. 입력 자료의 저작권과 포함된 디자인·상표·초상은 별도 근거가 필요합니다.'}
];
export function validateAssignment(value){
 if(value===undefined)return undefined;
 if(!value||!Array.isArray(value.documents)||!value.documents.length||value.documents.length>20)throw Error('과제 자료는 1~20개까지 저장할 수 있습니다.');
 let total=0;
 return {documents:value.documents.map(d=>{
  if(!d||typeof d.name!=='string'||d.name.length>500||typeof d.text!=='string'||!d.text.trim()||d.text.length>200000)throw Error('과제 파일 이름 또는 추출 텍스트가 올바르지 않습니다. 파일당 최대 200,000자입니다.');
  total+=d.text.length;if(total>500000)throw Error('과제 자료 전체 텍스트는 최대 500,000자입니다.');
  const locations=Array.isArray(d.locations)?d.locations:[];
  if(locations.length>5000||locations.some(l=>!l||typeof l.label!=='string'||l.label.length>100||!Number.isInteger(l.start)||!Number.isInteger(l.end)||l.start<0||l.end<l.start||l.end>d.text.length))throw Error('과제 원문 위치 정보가 올바르지 않습니다.');
  return {name:d.name,text:d.text,role:d.role==='feedback'?'feedback':'material',locations:locations.map(l=>({label:l.label,start:l.start,end:l.end})),warnings:Array.isArray(d.warnings)?d.warnings.filter(w=>typeof w==='string').slice(0,160).map(w=>w.slice(0,500)):[]};
 })};
}
export function reviewAssignment(documents){
 const candidates=[];
 for(const [name,kind,provider,outputType,pattern] of definitions){
  const references=[];
  for(const d of documents){
   const normalized=d.text.normalize('NFKC'),match=pattern.exec(normalized);if(!match)continue;
   // Match each section independently so normalized character widths do not corrupt source offsets.
   const section=(d.locations||[]).find(l=>pattern.test(d.text.slice(l.start,l.end).normalize('NFKC')));
   const source=section?d.text.slice(section.start,section.end):d.text;
   const hit=pattern.exec(source.normalize('NFKC'));
   references.push({fileName:d.name,role:d.role||'material',label:section?.label||'텍스트 원문',excerpt:source.normalize('NFKC').slice(Math.max(0,(hit?.index||0)-60),(hit?.index||0)+180).trim()});
  }
  if(references.length)candidates.push({name,kind,provider,outputType,references});
 }
 const termsDocuments=documents.filter(d=>/terms\s+of\s+(?:use|service)|이용\s*약관|SIL OPEN FONT LICENSE|PSF LICENSE|Redistribution and use in source/iu.test(d.text));
 const cadcam=documents.some(d=>!termsDocuments.includes(d)&&(/cad\s*[/·,]?\s*cam|캐드캠/iu.test(d.text)||/스케치|형상/iu.test(d.text)&&/주행|SimReady|물성|휠베이스/iu.test(d.text)));
 const general=[
  {title:'검토 대상과 입력 자료',detail:`문서 ${documents.length}개에서 알려진 도구·서비스 후보 ${candidates.length}개를 찾았습니다. 문서에 언급된 후보와 실제 사용하는 자료를 구분하세요.`},
  {title:'라이선스 적용 근거',detail:'자료별 공식 LICENSE·약관과 적용 대상·버전을 연결하세요. 홈페이지나 문서 속 이름만으로 이용 허가가 확인되지는 않습니다.'},
  {title:'사용 목적과 이행할 조건',detail:'2단계에서 실제 상업·배포·수정·네트워크 조건을 적용하세요. 결과의 허용 근거, 지켜야 할 의무, 확인 필요 사항을 나누어 점검하세요.'}
 ];
 const termsChecks=[{title:'약관의 대상과 허용 범위',detail:`약관·라이선스 형식이 감지된 문서 ${termsDocuments.length}개입니다. 서비스 이용, API, 생성물, 모델 가중치 중 어떤 대상에 적용되는지 확인하세요.`},{title:'적용 조건과 원문 근거',detail:'허용 문구와 함께 예외·플랜·지역·시점 조건을 확인하세요. 문서 가져오기는 원문 보관 단계이며, 실제 자료와의 연결은 별도로 확인해야 합니다.'}];
 return {candidates,checklist:cadcam?checklist:[...general,...(termsDocuments.length?termsChecks:[])],checklistTitle:cadcam?'CAD/CAM 자료 보완 체크리스트':termsDocuments.length?'약관·라이선스 보완 체크리스트':'문서 보완 체크리스트',feedback:documents.filter(d=>d.role==='feedback')};
}
export function candidateAssets(candidates){
 return candidates.map(c=>({id:crypto.randomUUID(),name:c.name,selection:'pending',kind:c.kind,provider:c.provider,serviceName:c.provider==='other'?c.name:'',outputType:c.outputType,scope:'output',planType:'unknown',license:'',version:'',rights:'unknown',confirmed:false,aiGenerated:c.kind==='ai',evidence:c.references.map(r=>`${r.fileName} · ${r.label}\n${r.excerpt}`).join('\n\n').slice(0,12000),notes:'과제 자료에서 언급된 검토 후보입니다. 실제 사용 여부·버전·플랜·생성일을 확인하세요. 문서의 언급은 이용 허가 근거가 아닙니다.'+(c.kind==='model'?' 참고 자료와 모델에 포함된 디자인·상표·로고의 권리를 별도로 확인하세요.':'')+(c.name==='Hunyuan3D'?' 코드·가중치·호스팅 서비스 중 사용하는 범위를 선택하고 정확한 배포판을 기록하세요.':'')}));
}

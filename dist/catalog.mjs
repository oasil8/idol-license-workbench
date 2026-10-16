// Search suggestions describe a registration route, never a license clearance.
export const catalog=[
 ['tripo','Tripo','트리포 3d 차량 모델','ai','tripo'],
 ['meshy','Meshy','메시 메쉬 3d 모델','ai','meshy'],
 ['openai','OpenAI / ChatGPT','오픈에이아이 챗지피티 지피티 chatgpt openai gpt 챗gpt codex 코덱스','ai','openai'],
 ['anthropic','Claude','클로드 앤트로픽 anthropic','ai','anthropic'],
 ['huggingface','Hugging Face 모델','허깅페이스 가중치 오픈모델','ai','huggingface'],
 ['nanobanana','Nano Banana (Gemini 이미지 생성)','nanobanana nano banana 나노바나나 나노 바나나 구글 google 이미지','ai','other'],
 ['gemini','Gemini','제미나이 구글 google','ai','other'],
 ['midjourney','Midjourney','미드저니 이미지','ai','other'],
 ['copilot','GitHub Copilot','깃허브 코파일럿 코드','ai','other'],
 ['runway','Runway','런웨이 runway ml 영상 생성','ai','other'],
 ['suno','Suno','수노 음악 음원','ai','other'],
 ['other-ai','서비스 · API · AI','직접 입력 기타 ai api 서비스','ai','other'],
 ['code','오픈소스 · 코드','mit apache gpl bsd 라이브러리 패키지 소스','code',''],
 ['model','모델 · 가중치 · 3D','모델 가중치 mesh 3d fbx glb obj','model',''],
 ['car','차량 3D 모델','차량 디자인 자동차 로고 메시 fbx glb obj blend','model',''],
 ['image','이미지 · 디자인','사진 일러스트 텍스처 폰트 그림','image',''],
 ['audio','음악 · 음성','음원 효과음 사운드','audio',''],
 ['data','데이터셋','학습 데이터 연구 자료 csv','data',''],
 ['tool','개발 도구 · 소프트웨어','cad cam cadcam sdk 엔진 프로그램','tool','']
].map(([id,name,aliases,kind,provider])=>({id,name,aliases,kind,provider}));
export const categoryNames={ai:'AI · 서비스 · API',code:'코드 · 오픈소스 · 도구',model:'모델 · 가중치 · 3D',image:'이미지 · 디자인',audio:'음악 · 음성',data:'데이터셋'};
export function categoriesOf(item){return [...new Set([item.id==='huggingface'?'model':item.kind==='tool'?'code':item.kind,...({nanobanana:['image'],midjourney:['image'],suno:['audio'],copilot:['code']}[item.id]||[])])];}
export function searchCatalog(query='',aiOnly=false){
 const words=query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
 return catalog.filter(x=>(!aiOnly||x.kind==='ai')&&words.every(w=>(x.name+' '+x.aliases+' '+categoriesOf(x).map(k=>categoryNames[k]).join(' ')).normalize('NFKC').toLowerCase().includes(w)));
}

// Reference entries identify projects, not permissions or an installed version.
export const referenceCatalog=[
 {
  "id": "mineru-vlm",
  "name": "MinerU2.5 VLM",
  "aliases": "mineru 모델 문서 인식",
  "kind": "model",
  "provider": "",
  "url": "https://huggingface.co/opendatalab/MinerU2.5-2509-1.2B"
 },
 {
  "id": "qwen36",
  "name": "Qwen3.6",
  "aliases": "qwen 큐웬 알리바바 언어 모델",
  "kind": "model",
  "provider": "",
  "url": "https://huggingface.co/Qwen/Qwen3.6-35B-A3B"
 },
 {
  "id": "paddleocr-model",
  "name": "PaddleOCR 모델",
  "aliases": "paddleocr 문자인식 가중치",
  "kind": "model",
  "provider": "",
  "url": "https://github.com/PaddlePaddle/PaddleOCR"
 },
 {
  "id": "mineru",
  "name": "MinerU",
  "aliases": "문서 pdf 추출",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/opendatalab/MinerU"
 },
 {
  "id": "babeldoc",
  "name": "BabelDOC",
  "aliases": "pdf 번역 문서",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/funstory-ai/BabelDOC"
 },
 {
  "id": "ocrmypdf",
  "name": "OCRmyPDF",
  "aliases": "pdf ocr 문서",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/ocrmypdf/OCRmyPDF"
 },
 {
  "id": "tesseract",
  "name": "Tesseract",
  "aliases": "ocr 문자 인식",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/tesseract-ocr/tesseract"
 },
 {
  "id": "vllm",
  "name": "vLLM",
  "aliases": "추론 서버 ai api",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/vllm-project/vllm"
 },
 {
  "id": "fastapi",
  "name": "FastAPI",
  "aliases": "웹 api 서버 파이썬",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/fastapi/fastapi"
 },
 {
  "id": "huey",
  "name": "Huey",
  "aliases": "작업 큐 파이썬",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/coleifer/huey"
 },
 {
  "id": "docker-engine",
  "name": "Docker Engine",
  "aliases": "docker 도커 컨테이너 moby",
  "kind": "tool",
  "provider": "",
  "url": "https://github.com/moby/moby"
 },
 {
  "id": "docker-desktop",
  "name": "Docker Desktop",
  "aliases": "docker 도커 데스크톱 컨테이너",
  "kind": "tool",
  "provider": "",
  "url": "https://docs.docker.com/subscription-billing/desktop-license/"
 },
 {
  "id": "chrono",
  "name": "Project Chrono",
  "aliases": "chrono 크로노 시뮬레이션 물리",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/projectchrono/chrono"
 },
 {
  "id": "chrono-models",
  "name": "Chrono 로버 모델",
  "aliases": "chrono 크로노 viper curiosity 로버 차량",
  "kind": "model",
  "provider": "",
  "url": "https://api.chrono.projectchrono.org/group__vehicle__models.html"
 },
 {
  "id": "threejs",
  "name": "three.js",
  "aliases": "threejs 웹 3d 렌더링",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/mrdoob/three.js"
 },
 {
  "id": "numpy",
  "name": "NumPy",
  "aliases": "numpy 넘파이 배열 수치 계산",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/numpy/numpy"
 },
 {
  "id": "pillow",
  "name": "Pillow",
  "aliases": "이미지 처리 pil",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/python-pillow/Pillow"
 },
 {
  "id": "caddy",
  "name": "Caddy",
  "aliases": "웹 서버 프록시",
  "kind": "tool",
  "provider": "",
  "url": "https://github.com/caddyserver/caddy"
 },
 {
  "id": "tailscale",
  "name": "Tailscale",
  "aliases": "테일스케일 vpn 네트워크",
  "kind": "tool",
  "provider": "",
  "url": "https://github.com/tailscale/tailscale"
 },
 {
  "id": "wireguard",
  "name": "WireGuard",
  "aliases": "와이어가드 vpn 네트워크",
  "kind": "tool",
  "provider": "",
  "url": "https://www.wireguard.com/"
 },
 {
  "id": "python",
  "name": "Python",
  "aliases": "python 파이썬 언어",
  "kind": "tool",
  "provider": "",
  "url": "https://docs.python.org/3/license.html"
 },
 {
  "id": "sqlite",
  "name": "SQLite",
  "aliases": "sqlite 데이터베이스",
  "kind": "code",
  "provider": "",
  "url": "https://www.sqlite.org/copyright.html"
 },
 {
  "id": "ibm-plex",
  "name": "IBM Plex Sans KR",
  "aliases": "ibm plex 폰트 글꼴 한글",
  "kind": "image",
  "provider": "",
  "url": "https://github.com/IBM/plex"
 },
 {
  "id": "lodash",
  "name": "lodash",
  "aliases": "javascript 자바스크립트 유틸리티",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/lodash/lodash"
 },
 {
  "id": "lroc-dtm",
  "name": "LROC NAC DTM (Apollo 15)",
  "aliases": "nasa pds 달 지형 아폴로",
  "kind": "data",
  "provider": "",
  "url": "https://www.lroc.asu.edu/"
 },
 {
  "id": "hirise-dtm",
  "name": "HiRISE DTM (Jezero)",
  "aliases": "nasa pds 화성 지형 제제로",
  "kind": "data",
  "provider": "",
  "url": "https://www.uahirise.org/dtm/"
 },
 {
  "id": "moon-kit",
  "name": "CGI Moon Kit",
  "aliases": "nasa 달 텍스처 지형",
  "kind": "data",
  "provider": "",
  "url": "https://svs.gsfc.nasa.gov/4720/"
 },
 {
  "id": "viking-mdim",
  "name": "Viking MDIM 2.1",
  "aliases": "mdm2.1 mdim2.1 nasa usgs 화성 지도",
  "kind": "data",
  "provider": "",
  "url": "https://astrogeology.usgs.gov/search/map/viking_mdim2_1_grayscale_global_mosaic_232m"
 },
 {
  "id": "isaacsim",
  "name": "NVIDIA Isaac Sim",
  "aliases": "isaacsim isaac sim 아이작심 엔비디아 로봇 시뮬레이션",
  "kind": "tool",
  "provider": "",
  "url": "https://github.com/isaac-sim/IsaacSim"
 },
 {
  "id": "opensees",
  "name": "OpenSees",
  "aliases": "opensees 오픈시스 구조 해석 지진",
  "kind": "code",
  "provider": "",
  "url": "https://github.com/OpenSees/OpenSees"
 }
];
catalog.push(...referenceCatalog);
export const catalogGroup=(item,category='')=>category&&categoriesOf(item).includes(category)?category:categoriesOf(item)[0];

// Recommend identity/category only; never infer an output/API/model usage scope.
export function categoryRecommendation(a){
 if(a.provider||a.license?.trim())return;
 const name=String(a.name||'').normalize('NFKC').trim().toLowerCase();
 if(name.length<2)return;
 const generic=new Set(['code','model','car','image','audio','data','tool','other-ai']);
 const matches=catalog.filter(x=>!generic.has(x.id)&&([x.name.toLowerCase(),...x.aliases.toLowerCase().split(/\s+/)]).includes(name));
 if(matches.length!==1||matches[0].kind===a.kind)return;
 return matches[0];
}

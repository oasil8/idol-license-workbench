import {isReadable,parseFile} from './core.mjs';

export function splitImportFiles(files){
 const documents=[],assets=[],ignored=[];
 for(const file of files){
  const path=(file.webkitRelativePath||file.name).replaceAll('\\','/'),name=path.split('/').pop();
  if(/(^|\/)(\.git|\.env[^/]*|\.ssh|\.aws)(\/|$)/i.test(path)){ignored.push(file);continue;}
  const reference=/^(?:licenses?|copying|notice|readme|changelog|ofl|copyright|credits|attributions?|authors|third[-_ ]?party[-_ ]?notices?)(?:[.-].*)?$/i.test(name);
  const vendor=/(^|\/)(?:node_modules|\.venv|venv)(\/|$)/i.test(path);
  const document=!vendor&&(/\.(pdf|pptx|docx)$/i.test(name)||(!reference&&/\.(txt|md)$/i.test(name)&&!isReadable(path)));
  (document?documents:assets).push(file);
 }
 return {documents,assets,ignored};
}

export const isLicenseDocument=path=>/^(?:licen[cs]es?|copying|notice|terms)(?:[.-].*)?$/i.test(String(path).replaceAll('\\','/').split('/').pop());
export function licenseAsset(file,result){
 const path=file.webkitRelativePath||file.name;
 const candidate=parseFile('LICENSE.txt',result.text)[0];
 return {id:crypto.randomUUID(),name:file.name,kind:'code',selection:'pending',license:candidate?.license||'',confirmed:false,rights:'unknown',evidence:path,
 notes:'추출한 라이선스 문서입니다. 이름과 종류를 실제 적용 대상에 맞게 바꾸고 적용 범위·출처를 확인하세요. 주변 자료에 자동 적용되지 않습니다.',
 date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
 licenseDocument:{name:path,role:'material',text:result.text,locations:result.locations||[],warnings:result.warnings||[]}};
}

// Files registered by name only: their contents are not parsed, but each may carry its own license.
const fileTypes=[
 ['model',/\.(glb|gltf|fbx|obj|blend|stl|usd|usda|usdc|usdz|dae|3ds|max|ma|mb|c4d|ply|abc|vrm|pmx|pmd|x|lwo|vox|ztl|zpr|spp|sbsar|sbs|uasset|umap)$/i,'파일명만 등록. 콘텐츠·권리·라이선스는 미분석.'],
 ['image',/\.(png|jpg|jpeg|jfif|webp|avif|heic|tga|svg|svgz|gif|bmp|psd|psb|tif|tiff|exr|hdr|dds|ktx2?|ico|icns|xcf|kra|ase|aseprite|clip|ai|eps|afphoto|afdesign)$/i,'파일명만 등록. 콘텐츠·권리·라이선스는 미분석.'],
 ['audio',/\.(wav|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|wma|mid|midi|mod|xm|it|s3m|sf2|sfz|bank|bnk|wem|fsb)$/i,'파일명만 등록. 콘텐츠·권리·라이선스는 미분석.'],
 ['ai',/\.(safetensors|gguf|onnx|pt|pth|ckpt|tflite|mlmodel|h5|keras)$/i,'모델 파일. 파일명만 등록. 받은 곳과 모델 라이선스를 확인하세요.'],
 ['other',/\.(ttf|otf|ttc|woff2?|fnt|bdf|pfb)$/i,'글꼴 파일. 파일명만 등록. 배포처의 글꼴 라이선스(OFL 등)와 게임 포함·배포 허용을 확인하세요.'],
 ['other',/\.(mp4|mov|webm|avi|mkv|wmv|flv|m4v|ogv)$/i,'파일명만 등록. 콘텐츠·권리·라이선스는 미분석.'],
 ['code',/\.(dll|so|dylib|a|lib|jar|aar|whl|nupkg|gem|bundle)$/i,'바이너리 라이브러리. 직접 빌드한 것이 아니면 받은 곳과 라이선스·고지 의무를 확인하세요.'],
 ['other',/\.(unitypackage|uplugin\.zip)$/i,'Unity 패키지 파일. 받은 곳(Asset Store 등)과 그 라이선스를 확인하세요.'],
 ['other',/\.(zip|rar|7z|tar|gz|tgz|xz)$/i,'압축 파일. 안의 자료는 분석하지 않았습니다. 압축을 풀어 다시 가져오거나 받은 곳의 라이선스를 확인하세요.'],
 ['other',/\.(hwp|hwpx|rtf|odt|doc|xls|xlsx|ppt|pages)$/i,'문서 파일. 텍스트를 읽지 못하는 형식입니다. 약관·계약서라면 PDF·DOCX로 저장해 다시 가져오세요.']
];
export function fileAsset(path){
 // go.mod is a Go manifest, not a tracker-music .mod file.
 if(/(^|\/)go\.mod$/i.test(path))return null;
 const hit=fileTypes.find(([,pattern])=>pattern.test(path));
 return hit&&{kind:hit[0],license:'',evidence:path,notes:hit[2],rights:'unknown',confirmed:false};
}

import {isReadable,parseFile,detectLicenses} from './core.mjs';

export function splitImportFiles(files){
 const documents=[],assets=[],ignored=[];
 for(const file of files){
  const path=(file.webkitRelativePath||file.name).replaceAll('\\','/'),name=path.split('/').pop();
  if(/(^|\/)(\.git|\.env[^/]*|\.ssh|\.aws)(\/|$)/i.test(path)){ignored.push(file);continue;}
  const reference=/^(?:licenses?|copying|notice|readme|changelog|ofl|copyright|credits|attributions?|authors|third[-_ ]?party[-_ ]?notices?)(?:[.-].*)?$/i.test(name);
  const vendor=/(^|\/)(?:node_modules|\.venv|venv)(\/|$)/i.test(path);
  const document=!vendor&&(/\.(pdf|pptx|docx|xlsx|hwpx|odt|ods|odp|rtf)$/i.test(name)||(!reference&&/\.(txt|md)$/i.test(name)&&!isReadable(path)));
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
 ['other',/\.(hwp|doc|xls|ppt|pages|numbers)$/i,'구형·전용 문서 파일. 텍스트를 읽지 못하는 형식입니다. 약관·계약서라면 PDF·DOCX·HWPX로 저장해 다시 가져오세요.']
];
export function fileAsset(path){
 // go.mod is a Go manifest, not a tracker-music .mod file.
 if(/(^|\/)go\.mod$/i.test(path))return null;
 const hit=fileTypes.find(([,pattern])=>pattern.test(path));
 return hit&&{kind:hit[0],license:'',evidence:path,notes:hit[2],rights:'unknown',confirmed:false};
}

// Lists a .zip's entries with the same rules as loose files; text entries are read, others registered by name.
export async function readZip(buffer,JSZip,zipPath,{maxEntries=5000,maxText=2*1024*1024,maxTotal=60*1024*1024}={}){
 const zip=await JSZip.loadAsync(buffer),rows=[],skipped=new Map(),notes=[];let total=0,count=0;
 for(const entry of Object.values(zip.files)){
  if(entry.dir||/(^|\/)(__MACOSX|\.DS_Store)(\/|$)/.test(entry.name))continue;
  if(++count>maxEntries){notes.push(`${zipPath}: 압축 안 항목이 ${maxEntries}개를 넘어 나머지는 읽지 않았습니다.`);break;}
  if(/(^|\/)(\.git|\.env[^/]*|\.ssh|\.aws)(\/|$)/i.test(entry.name))continue;
  const inner=zipPath+'!/'+entry.name,name=entry.name.split('/').pop(),asset=fileAsset(inner);
  if(asset){rows.push({name,...asset});continue;}
  if(/\.(pdf|docx|pptx|xlsx|hwpx|odt|ods|odp|rtf)$/i.test(name)){rows.push({name,kind:'other',license:'',evidence:inner,notes:'압축 안 문서. 압축을 풀어 다시 가져오면 내용을 읽습니다. 라이선스·약관 문서인지 확인하세요.',rights:'unknown',confirmed:false});continue;}
  if(!isReadable(inner)){const ext=(name.match(/\.([^.]+)$/)?.[1]||'확장자 없음').toLowerCase();skipped.set(ext,(skipped.get(ext)||0)+1);continue;}
  // Sizes come from the zip directory, so a compressed bomb is refused before it is inflated.
  const size=entry._data?.uncompressedSize??maxText+1;
  if(size>maxText||total+size>maxTotal){notes.push('크기 제한으로 건너뜀: '+inner);continue;}
  total+=size;
  try{rows.push(...parseFile(inner,await entry.async('string')));}catch(err){notes.push('읽기/파싱 실패: '+inner+' — '+err.message);}
 }
 return {rows,skipped,notes,count};
}

// Rights embedded in media files: XMP in images (and some audio/video), Vorbis comments in OGG/FLAC, ID3 TCOP/WCOP in MP3.
// Metadata can be edited by anyone, so it only fills hints and a license candidate, never a confirmation.
export function metadataRights(bytes){
 const utf=new TextDecoder().decode(bytes),latin=new TextDecoder('latin1').decode(bytes),parts=[];
 const xmp=utf.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/)?.[0]||'';
 const li=tag=>xmp.match(new RegExp('<'+tag+'[^>]*>[\\s\\S]*?<rdf:li[^>]*>([^<]+)</rdf:li>'))?.[1]?.trim()||'';
 const prop=tag=>xmp.match(new RegExp(tag+'(?:="([^"]+)"|\\s+rdf:resource="([^"]+)"|>([^<]+)<)'))?.slice(1).find(Boolean)?.trim()||'';
 const vorbis=key=>utf.match(new RegExp('(?:^|[\\u0000-\\u001f])'+key+'=([^\\u0000-\\u001f]{2,300})','i'))?.[1]?.trim()||'';
 const id3=frame=>{
  const at=latin.indexOf(frame);if(at<0||at+11>bytes.length)return '';
  const size=(bytes[at+4]<<24|bytes[at+5]<<16|bytes[at+6]<<8|bytes[at+7])>>>0;if(!size||size>2000||at+10+size>bytes.length)return '';
  const body=bytes.subarray(at+10,at+10+size),encoding=frame==='TCOP'?body[0]:0,data=frame==='TCOP'?body.subarray(1):body;
  return new TextDecoder(encoding===1?'utf-16':encoding===2?'utf-16be':encoding===3?'utf-8':'latin1').decode(data).replace(/\0/g,'').trim();
 };
 const rights=li('dc:rights')||vorbis('COPYRIGHT')||id3('TCOP'),creator=li('dc:creator')||vorbis('ARTIST'),usage=li('xmpRights:UsageTerms')||vorbis('LICENSE');
 const url=prop('cc:license')||prop('xmpRights:WebStatement')||id3('WCOP');
 if(rights)parts.push('저작권 "'+rights.slice(0,200)+'"');
 if(creator)parts.push('제작자 '+creator.slice(0,100));
 if(usage)parts.push('이용 조건 "'+usage.slice(0,200)+'"');
 if(url)parts.push('라이선스 주소 '+url.slice(0,200));
 const found=detectLicenses([url,usage,rights].join(' '));
 return {license:found.length===1?found[0]:'',summary:parts.join(' · ')};
}

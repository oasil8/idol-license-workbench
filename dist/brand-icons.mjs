// Shared embedded logos keep local and hosted versions identical.
import {simpleIcons} from './brand-icons-simple.mjs';
import {normalizeAsset} from './asset-normalization.mjs';
const aliases={openai:['openai','chatgpt','챗지피티'],anthropic:['anthropic','claude','클로드'],huggingface:['hugging face','huggingface'],gemini:['gemini','nano banana','nanobanana','제미나이','나노바나나'],github:['github copilot','copilot','깃허브'],meshy:['meshy','메시','메쉬'],tripo:['tripo','트리포'],midjourney:['midjourney','미드저니'],suno:['suno','수노'],runway:['runway','런웨이']};
const simpleSlugs={github:'githubcopilot',unreal:'unrealengine',godot:'godotengine',maya:'autodeskmaya',threejs:'threedotjs'};
Object.assign(aliases,{
 blender:['blender','블렌더'],unity:['unity','유니티'],unreal:['unreal engine','unreal','언리얼'],godot:['godot','고도 엔진','고도엔진'],
 nvidia:['nvidia','isaac sim','isaacsim','아이작 심','아이작심'],maya:['maya','autodesk maya','마야'],
 houdini:['houdini','후디니'],krita:['krita','크리타'],gimp:['gimp','김프'],aseprite:['aseprite','에이스프라이트'],audacity:['audacity','오다시티'],
 fmod:['fmod'],cursor:['cursor','커서'],python:['python','파이썬'],numpy:['numpy','넘파이'],threejs:['three.js','threejs'],docker:['docker','도커'],pytorch:['pytorch','파이토치'],
 elevenlabs:['elevenlabs','일레븐랩스'],pixabay:['pixabay','픽사베이'],unsplash:['unsplash','언스플래시'],pexels:['pexels','펙셀스'],sketchfab:['sketchfab','스케치팹']
});
aliases.anthropic=['anthropic','앤트로픽'];
Object.assign(aliases,{
 codex:['codex','코덱스'],claude:['claude','클로드'],github:['github copilot','githubcopilot','copilot','깃허브'],
 stability:['stable diffusion','stability','스테이블 디퓨전'],hunyuan:['hunyuan3d','hunyuan','훈위안'],udio:['udio','유디오'],kling:['kling','클링'],luma:['luma','루마'],
 rodin:['rodin','로딘'],higgsfield:['higgsfield','힉스필드'],kenney:['kenney','케니'],freesound:['freesound','프리사운드'],mixamo:['mixamo','믹사모'],
 wwise:['wwise'],substance:['substance','섭스턴스'],zbrush:['zbrush','지브러시'],photoshop:['photoshop','포토샵'],vscode:['visual studio code','vs code','비주얼 스튜디오 코드'],fab:['fab'],epidemic:['epidemic sound']
});
const initials={rodin:'Rd',higgsfield:'Hf',kenney:'Ke',freesound:'Fs',mixamo:'Mx',wwise:'Ww',substance:'Su',zbrush:'Zb',photoshop:'Ps',vscode:'VS',fab:'Fa',epidemic:'Es'};
const simpleIcon=brand=>{
 const icon=simpleIcons[simpleSlugs[brand]||brand];
 return icon?{src:'data:image/svg+xml,'+encodeURIComponent(icon).replace(/'/g,'%27')}:undefined;
};
export function brandOf(asset={}){
 asset=normalizeAsset(asset);
 const provider=asset.provider||asset.aiProvider;
 const name=String(asset.serviceName||asset.name||'').toLowerCase();
 return Object.keys(aliases).find(key=>aliases[key].some(alias=>name===alias||name.startsWith(alias+' ')||name.startsWith(alias+' /')||name.startsWith(alias+'(')))||(aliases[provider]||simpleIcon(provider)?provider:'');
}
export function brandIcon(asset={}){
 const brand=brandOf(asset),icon=simpleIcon(brand);
 if(icon)return `<img class="brand-icon" src="${icon.src}" width="22" height="22" alt="" aria-hidden="true">`;
 if(brand)return `<span class="brand-icon brand-fallback brand-initials brand-${brand}" aria-hidden="true" data-label="${initials[brand]||brand.slice(0,2)}"></span>`;
 const label={ai:'AI',api:'API',code:'&lt;/&gt;',model:'3D',image:'▧',audio:'♪',data:'▦',tool:'⚙'}[asset.kind]||'◇';
 // The label is CSS-generated so it never joins the title in copied or extracted text.
 return `<span class="brand-icon brand-fallback" aria-hidden="true" data-label="${label}"></span>`;
}
export const brandIconCss='.brand-name{display:inline-flex;align-items:center;gap:8px;min-width:0}.brand-icon{display:inline-block;vertical-align:middle;flex:0 0 22px;width:22px;height:22px;object-fit:contain;box-sizing:border-box;border-radius:5px;background:#fff;border:1px solid #dce5e1;padding:2px;margin-right:7px}.brand-name .brand-icon{margin-right:0}.brand-fallback{white-space:nowrap;overflow:hidden;font:700 9px/16px "Segoe UI",sans-serif;text-align:center;color:#42675e;background:#edf4f1}.brand-fallback::before{content:attr(data-label)}.brand-initials{border-radius:50%;color:#fff}'+Object.keys(aliases).map(brand=>`.brand-${brand}{background:hsl(${[...brand].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,0)} 35% 35%)}`).join('');

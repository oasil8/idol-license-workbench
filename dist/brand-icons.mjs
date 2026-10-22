// Prefer local favicons, then CC0 Simple Icons, then a text badge.
import {simpleIcons} from './brand-icons-simple.mjs';
const icons=await import('./brand-icons-data.mjs').then(m=>m.icons,()=>({}));
import {normalizeAsset} from './asset-normalization.mjs';
const aliases={openai:['openai','chatgpt','챗지피티'],anthropic:['anthropic','claude','클로드'],huggingface:['hugging face','huggingface'],gemini:['gemini','nano banana','nanobanana','제미나이','나노바나나'],github:['github copilot','copilot','깃허브'],meshy:['meshy','메시','메쉬'],tripo:['tripo','트리포'],midjourney:['midjourney','미드저니'],suno:['suno','수노'],runway:['runway','런웨이']};
const simpleSlugs={anthropic:'claude',github:'githubcopilot',gemini:'googlegemini',unreal:'unrealengine',godot:'godotengine',maya:'autodeskmaya',threejs:'threedotjs'};
Object.assign(aliases,{
 blender:['blender','블렌더'],unity:['unity','유니티'],unreal:['unreal engine','unreal','언리얼'],godot:['godot','고도 엔진','고도엔진'],
 nvidia:['nvidia','isaac sim','isaacsim','아이작 심','아이작심'],maya:['maya','autodesk maya','마야'],
 houdini:['houdini','후디니'],krita:['krita','크리타'],gimp:['gimp','김프'],aseprite:['aseprite','에이스프라이트'],audacity:['audacity','오다시티'],
 fmod:['fmod'],cursor:['cursor','커서'],python:['python','파이썬'],numpy:['numpy','넘파이'],threejs:['three.js','threejs'],docker:['docker','도커'],pytorch:['pytorch','파이토치'],
 elevenlabs:['elevenlabs','일레븐랩스'],pixabay:['pixabay','픽사베이'],unsplash:['unsplash','언스플래시'],pexels:['pexels','펙셀스'],sketchfab:['sketchfab','스케치팹']
});
aliases.openai.push('codex','코덱스');
const simpleIcon=brand=>{
 const icon=simpleIcons[simpleSlugs[brand]||brand];
 return icon?{src:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${icon.hex}" d="${icon.path}"/></svg>`).replace(/'/g,'%27')}:undefined;
};
export function brandOf(asset={}){
 asset=normalizeAsset(asset);
 const provider=asset.provider||asset.aiProvider;
 if(icons[provider]||simpleIcon(provider))return provider;
 const name=String(asset.serviceName||asset.name||'').toLowerCase();
 return Object.keys(aliases).find(key=>aliases[key].some(alias=>name===alias||name.startsWith(alias+' ')||name.startsWith(alias+' /')||name.startsWith(alias+'(')))||'';
}
export function brandIcon(asset={}){
 const brand=brandOf(asset),icon=icons[brand]||simpleIcon(brand);
 if(icon)return `<img class="brand-icon" src="${icon.src}" width="22" height="22" alt="" aria-hidden="true">`;
 const label={ai:'AI',api:'API',code:'&lt;/&gt;',model:'3D',image:'▧',audio:'♪',data:'▦',tool:'⚙'}[asset.kind]||'◇';
 // The label is CSS-generated so it never joins the title in copied or extracted text.
 return `<span class="brand-icon brand-fallback" aria-hidden="true" data-label="${label}"></span>`;
}
export const brandIconCss='.brand-name{display:inline-flex;align-items:center;gap:8px;min-width:0}.brand-icon{display:inline-block;vertical-align:middle;flex:0 0 22px;width:22px;height:22px;object-fit:contain;box-sizing:border-box;border-radius:5px;background:#fff;border:1px solid #dce5e1;padding:2px;margin-right:7px}.brand-name .brand-icon{margin-right:0}.brand-fallback{white-space:nowrap;overflow:hidden;font:700 9px/16px "Segoe UI",sans-serif;text-align:center;color:#42675e;background:#edf4f1}.brand-fallback::before{content:attr(data-label)}';

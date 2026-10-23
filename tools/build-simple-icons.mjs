import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as icons from 'simple-icons';
import {pathToFileURL} from 'node:url';
// Only static SVG markup and fragment-local references are accepted. No entities or CSS escapes.
export function safeSvg(svg){
 return /^<svg\s/i.test(svg)&&!/<\s*(?:script|foreignObject|iframe|object|embed|image|a|style|animate\w*|set)\b|<!|<\?|\son\w+\s*=|\bsrc\s*=|javascript:|@import|\\|&/i.test(svg)
  &&!/(?:href)\s*=/i.test(svg.replace(/(?:[\w-]+:)?href\s*=\s*(["'])#[\w.-]+\1/gi,''))
  &&[...svg.matchAll(/url\s*\((.*?)\)/gi)].every(([,value])=>/^["']?#[\w.-]+["']?$/.test(value.trim()));
}
export function buildIcons(){
const version=JSON.parse(readFileSync(new URL('../node_modules/simple-icons/package.json',import.meta.url))).version;
assert.equal(version,'16.35.0');
const slugs='blender unity unrealengine godotengine nvidia claude anthropic githubcopilot googlegemini huggingface suno elevenlabs pixabay unsplash pexels sketchfab autodeskmaya houdini krita gimp aseprite audacity fmod cursor python numpy threedotjs docker pytorch'.split(' ');
const data=Object.fromEntries(slugs.map(slug=>{
 const icon=Object.values(icons).find(icon=>icon.slug===slug);
 assert.ok(icon?.path&&/^[0-9A-F]{6}$/i.test(icon.hex),slug);
 return [slug,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${icon.hex}" d="${icon.path}"/></svg>`];
}));
const lobeRoot=new URL('../node_modules/@lobehub/icons-static-svg/',import.meta.url);
assert.equal(JSON.parse(readFileSync(new URL('package.json',lobeRoot))).version,'1.98.0');
for(const slug of 'openai codex tripo meshy midjourney runway claude anthropic gemini githubcopilot huggingface suno elevenlabs stability hunyuan nvidia cursor udio kling luma'.split(' ')){
 const color=new URL(`icons/${slug}-color.svg`,lobeRoot),plain=new URL(`icons/${slug}.svg`,lobeRoot);
 const svg=readFileSync(existsSync(color)?color:plain,'utf8').trim();
 if(safeSvg(svg))data[slug]=svg;
 else {delete data[slug];console.warn(`Skipped unsafe SVG: ${slug}`);}
}
for(const [slug,svg] of Object.entries(data))if(!safeSvg(svg)){delete data[slug];console.warn(`Skipped unsafe SVG: ${slug}`);}
writeFileSync(new URL('../dist/brand-icons-simple.mjs',import.meta.url),'// Lobe Icons 1.98.0 (MIT), Simple Icons 16.35.0 (CC0). Logos belong to their owners.\nexport const simpleIcons='+JSON.stringify(data,null,1)+';\n');
console.log(`Generated ${Object.keys(data).length} brand SVGs`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildIcons();

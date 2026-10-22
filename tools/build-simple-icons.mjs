import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as icons from 'simple-icons';
const version=JSON.parse(readFileSync(new URL('../node_modules/simple-icons/package.json',import.meta.url))).version;
assert.equal(version,'16.35.0');
const slugs='blender unity unrealengine godotengine nvidia claude anthropic githubcopilot googlegemini huggingface suno elevenlabs pixabay unsplash pexels sketchfab autodeskmaya houdini krita gimp aseprite audacity fmod cursor python numpy threedotjs docker pytorch'.split(' ');
const data=Object.fromEntries(slugs.map(slug=>{
 const icon=Object.values(icons).find(icon=>icon.slug===slug);
 assert.ok(icon?.path&&/^[0-9A-F]{6}$/i.test(icon.hex),slug);
 return [slug,{path:icon.path,hex:icon.hex}];
}));
writeFileSync(new URL('../dist/brand-icons-simple.mjs',import.meta.url),'// Simple Icons 16.35.0, CC0-1.0, 상표는 각 소유자. 식별 목적.\nexport const simpleIcons='+JSON.stringify(data,null,1)+';\n');
console.log(`Generated ${slugs.length} Simple Icons`);

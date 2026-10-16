import test from 'node:test';
import assert from 'node:assert/strict';
import {brandIcon,brandOf} from '../dist/brand-icons.mjs';
import {buildProjectReport} from '../dist/report.mjs';
test('service icons use bundled images and unknown names retain a neutral fallback',()=>{
 assert.match(brandIcon({name:'Meshy',kind:'ai'}),/src="data:image/);
 assert.match(brandIcon({name:'Hugging Face 모델',kind:'ai'}),/src="data:image/);
 assert.equal(brandOf({name:'nanobanana',kind:'ai'}),'gemini');
 assert.equal(brandOf({name:'meshy-unrelated.example',kind:'ai'}),'');
 assert.doesNotMatch(brandIcon({name:'<img onerror=alert(1)>',kind:'code'}),/<img|onerror|https:/);
 assert.match(brandIcon({name:'Unknown',kind:'audio'}),/♪/);
});
test('exported service icons remain embedded and do not require external image requests',()=>{
 const html=buildProjectReport({name:'Icon test',context:{},assets:[{name:'Meshy',kind:'ai',selection:'used'}]});
 assert.match(html,/<img class="brand-icon" src="data:image/);
 assert.doesNotMatch(html,/<img[^>]*src="https?:/);
});

test('user supplied OpenAI and Midjourney logos are embedded',()=>{for(const name of ['OpenAI / ChatGPT','Midjourney'])assert.match(brandIcon({name,kind:'ai'}),/src="data:image\/png;base64,/);});

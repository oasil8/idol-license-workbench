import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('menu guide keeps workflow cards first in desktop and narrow-screen reading order',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
 const guide=html.match(/<h2>왼쪽 메뉴 둘러보기<\/h2><div class="guide-overview">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(guide);
 const cards=[...guide.matchAll(/<article>([\s\S]*?)<\/article>/g)].map(m=>m[1]);
 assert.deepEqual(cards.map(card=>card.match(/<h3>(.*?)<\/h3>/)?.[1]),[
  '① 자료 넣기','② 사용 조건 정하기','③ 결과 확인',
  '프로젝트 선택 · ＋ 새 프로젝트 · 프로젝트 관리','◷ 사용법·결과 안내','백업'
 ]);
 assert.deepEqual(cards.map(card=>card.match(/data-view="([^"]+)"/)?.[1]),[
  'intake','inventory','report',undefined,undefined,undefined
 ]);
 assert.match(css,/\.guide-overview\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:800px\)\{\.guide-overview\{grid-template-columns:1fr\}\}/);
 assert.doesNotMatch(guide,/\bstyle=/);
 const guideRules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].includes('.guide-overview'));
 for(const rule of guideRules)assert.doesNotMatch(rule[2],/(?:^|;)\s*(?:order|grid-area|grid-row|grid-column|grid-auto-flow)\s*:/);
});

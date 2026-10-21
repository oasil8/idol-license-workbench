import {existsSync,readFileSync} from 'node:fs';

// Service terms snapshots and brand favicons are other parties' works, so the public repository leaves them out
// (see .gitignore). Tests that need them run where the local copies exist and are skipped elsewhere.
export const hasTerms=existsSync(new URL('./fixtures/real-terms/meshy.txt',import.meta.url));
export const needsTerms={skip:hasTerms?false:'서비스 약관 원문 사본이 없는 저장소에서는 건너뜁니다'};
export const readTerms=url=>hasTerms?readFileSync(url,'utf8'):'';
export const hasIcons=existsSync(new URL('../dist/brand-icons-data.mjs',import.meta.url));
export const needsIcons={skip:hasIcons?false:'서비스 로고 사본이 없는 저장소에서는 건너뜁니다'};

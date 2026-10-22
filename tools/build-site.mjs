// Assembles the link (GitHub Pages) version into site/: the app, the browser libraries it loads, and an OFL Korean font.
// Run after `npm ci`. The local version (npm start) does not need this.
// Plain file operations only: recursive fs.rmSync/cpSync crash Node 24 on Windows when the path has non-ASCII folder names.
import {copyFileSync,existsSync,mkdirSync,readdirSync,readFileSync,rmdirSync,statSync,unlinkSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'site');
const copy=(source,target)=>copyFileSync(join(root,source),join(out,target));
const clear=dir=>{for(const name of readdirSync(dir)){const p=join(dir,name);statSync(p).isDirectory()?clear(p):unlinkSync(p);}rmdirSync(dir);};
if(existsSync(out))clear(out);
mkdirSync(join(out,'vendor','cmaps'),{recursive:true});mkdirSync(join(out,'fonts'));

// Local favicons and reference images stay private; generated CC0 Simple Icons are included.
const skip=/^(brand-icons-data\.mjs|.*-transparent\.png)$/;
for(const name of readdirSync(join(root,'dist')))if(!skip.test(name))copy(join('dist',name),name);
const vendor={'jszip.min.js':'jszip/dist/jszip.min.js','pdf.mjs':'pdfjs-dist/build/pdf.mjs','pdf.worker.mjs':'pdfjs-dist/build/pdf.worker.mjs','mammoth.browser.min.js':'mammoth/mammoth.browser.min.js','pdfkit.standalone.js':'pdfkit/js/pdfkit.standalone.js'};
for(const [name,path] of Object.entries(vendor))copy(join('node_modules',path),join('vendor',name));
for(const name of readdirSync(join(root,'node_modules','pdfjs-dist','cmaps')))if(name.endsWith('.bcmap'))copy(join('node_modules','pdfjs-dist','cmaps',name),join('vendor','cmaps',name));
for(const name of readdirSync(join(root,'web','fonts')))copy(join('web','fonts',name),join('fonts',name));
copy('LICENSE','LICENSE.txt');copy('THIRD-PARTY-NOTICES.txt','THIRD-PARTY-NOTICES.txt');

// Same policy as the local server, plus the sites the browser may read directly for lookups.
const lookups='https://huggingface.co https://pypi.org https://www.wikidata.org https://api.github.com';
const csp=`default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'self' ${lookups}; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const index=join(out,'index.html'),html=readFileSync(index,'utf8');
if(!html.includes('<head>'))throw Error('index.html has no <head>');
writeFileSync(index,html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}">`));
writeFileSync(join(out,'.nojekyll'),'');
console.log('site/ ready:',readdirSync(out).length,'entries');

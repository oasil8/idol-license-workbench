from pathlib import Path
import zipfile,hashlib
p=Path('README.md');s=p.read_text(encoding='utf-8');s=s.replace('현재 프로젝트의 지원 서비스 항목을 갱신합니다.','현재 프로젝트에서 실제 사용으로 선택한 지원 서비스 항목을 갱신합니다.');p.write_text(s,encoding='utf-8')
root=Path.cwd();out=root.parent/'IDOL-License-WORKBENCH-v1.4-laptop.zip'
files=[p for d in ['dist','tests'] for p in (root/d).rglob('*') if p.is_file()]
files += [root/n for n in ['package.json','package-lock.json','server.mjs','terms.mjs','start.cmd','README.md','HANDOFF.txt','VALIDATION.txt','DESIGN-REFERENCES.txt']]
assert not out.exists(),'Do not overwrite existing package'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,Path('IDOL-License-WORKBENCH')/p.relative_to(root))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for p in files:assert z.read(str(Path('IDOL-License-WORKBENCH')/p.relative_to(root)).replace('\\','/'))==p.read_bytes()
sha=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.sha256.txt').write_text(sha+'  '+out.name+'\n',encoding='utf-8')
print(f'{out}\n{len(files)} files, {out.stat().st_size} bytes\nSHA256 {sha}\nArchive integrity and source-byte comparison passed')

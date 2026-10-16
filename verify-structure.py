from pathlib import Path
from html.parser import HTMLParser
import re, subprocess
class Check(HTMLParser):
 def __init__(self): super().__init__(); self.ids=[];self.stack=[];self.views=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if a.get('id') in ['intakeView','inventoryView','reportView','guideView']:
   assert not any(x[1] in ['intakeView','inventoryView','reportView','guideView'] for x in self.stack),'nested views'
   self.views.append(a['id'])
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append((t,a.get('id')))
 def handle_endtag(self,t):
  assert self.stack and self.stack[-1][0]==t,(t,self.stack[-3:])
  self.stack.pop()
h=Check();h.feed(Path('dist/index.html').read_text(encoding='utf-8-sig'))
assert not h.stack and len(h.ids)==len(set(h.ids))
assert len(h.views)==4
refs=set(re.findall(r"\$\('([^']+)'\)",Path('dist/app.mjs').read_text(encoding='utf-8')))
assert not refs-set(h.ids),refs-set(h.ids)
files=list(Path('dist').glob('*.mjs'))+list(Path('tests').glob('*.mjs'))+[Path('server.mjs'),Path('terms.mjs'),Path('search.mjs'),Path('verify-source.mjs'),Path('public-fetch.mjs')]
for f in files:subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
print(f'PASS: HTML tags, unique IDs, {len(refs)} ID references, four sibling views; {len(files)} JS modules syntax')

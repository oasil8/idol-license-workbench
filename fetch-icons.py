import urllib.request,concurrent.futures,json,base64
from pathlib import Path
urls={'openai':'https://chatgpt.com/favicon.ico','anthropic':'https://claude.ai/favicon.ico','huggingface':'https://huggingface.co/favicon.ico','gemini':'https://www.google.com/favicon.ico','github':'https://github.com/favicon.ico','meshy':'https://www.meshy.ai/favicon.ico','tripo':'https://www.tripo3d.ai/favicon.ico','midjourney':'https://www.midjourney.com/favicon.ico','suno':'https://suno.com/favicon.ico','runway':'https://runwayml.com/favicon.ico'}
def get(item):
 k,u=item
 try:
  r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=15); b=r.read(512001)
  if len(b)>512000 or not (b.startswith(b'\x00\x00\x01\x00') or b.startswith(b'\x89PNG')): return k,None
  mime='image/png' if b.startswith(b'\x89PNG') else 'image/x-icon'
  return k,{'src':'data:'+mime+';base64,'+base64.b64encode(b).decode(),'source':u}
 except Exception as e: print(k,str(e));return k,None
# The data file is local-only (gitignored); start empty on a fresh clone.
data=Path('dist/brand-icons-data.mjs')
previous=json.loads(data.read_text(encoding='utf-8').split('export const icons=',1)[1].rstrip(';\n')) if data.exists() else {}
items=dict(concurrent.futures.ThreadPoolExecutor().map(get,urls.items()));items={k:v for k,v in items.items() if v}
previous.update(items);items=previous
open('dist/brand-icons-data.mjs','w',encoding='utf-8').write('// Official-site favicon snapshots, 2026-10-16. Identification only, not license evidence.\nexport const icons='+json.dumps(items)+';\n')
print({k:len(v['src']) for k,v in items.items()})

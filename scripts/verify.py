from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

root = Path('.')
errors=[]
class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(); self.file=file; self.forms=[]; self.current=None; self.ids=set(); self.refs=[]; self.h1=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: errors.append(f'{self.file}: duplicate ID {a["id"]}')
            self.ids.add(a['id'])
        if tag=='h1': self.h1+=1
        if tag=='img' and not a.get('alt'): errors.append(f'{self.file}: image missing alt')
        if tag=='form':
            self.current={'attrs':a,'inputs':[]}
            if 'data-cart-add' not in a: self.forms.append(self.current)
        if tag in ['input','select','textarea'] and self.current is not None: self.current['inputs'].append(a)
        for key in ['href','src']:
            value=a.get(key,'')
            if value.startswith('/'):
                p=root/unquote(urlsplit(value).path.lstrip('/'))
                if p.is_dir(): p=p/'index.html'
                if not p.is_file(): errors.append(f'{self.file}: missing {value}')
            if value.startswith('#'): self.refs.append(value[1:])
    def handle_endtag(self,tag):
        if tag=='form': self.current=None

pages=[p for p in root.rglob('*.html') if not any(part.startswith('.') or part in ['src','node_modules','qa'] for part in p.parts)]
for file in pages:
    p=Page(file); p.feed(file.read_text(encoding='utf-8'))
    assert p.h1==1, f'{file}: expected one H1'
    for ref in p.refs:
        if ref not in p.ids: errors.append(f'{file}: missing anchor {ref}')
    for form in p.forms:
        a=form['attrs']; inputs={i.get('name'):i for i in form['inputs'] if i.get('name')}
        assert a.get('method')=='POST' and a.get('action')=='https://formsubmit.co/hello.luvio8@gmail.com',file
        assert all(k in inputs for k in ['email','_honey','_subject','_template','_next']),file
        assert '_captcha' not in inputs,file
        if a.get('id')=='custom-order-form':
            assert a.get('enctype')=='multipart/form-data',file
            assert 'creation_type' in inputs and 'vision' in inputs,file
assert not errors, '\n'.join(errors)
print(f'Passed: {len(pages)} HTML files, local links, assets, anchors, alt text, H1s, IDs, form destinations, spam fields, and multipart configuration.')

# Unrelated page bodies must survive the shared-shell migration exactly.
import json
routes=json.loads(Path('src/routes.json').read_text(encoding='utf-8'))
for route in routes:
    if route['path']=='/' or route['path'].startswith('/shop/'):
        continue
    before=Path('src/templates/'+route['template']+'.html').read_text(encoding='utf-8')
    generated=Path(route['path'].strip('/')+'/index.html').read_text(encoding='utf-8')
    body=generated.split('<main id="main">',1)[1].split('</main>',1)[0]
    assert before==body, route['path']+' unrelated content changed'
print('Passed: all unrelated main-page content preserved exactly.')

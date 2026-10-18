import re,base64,pathlib,sys
root=pathlib.Path(__file__).parent
P=root/'parts'
import os
fonts=pathlib.Path(os.environ.get('FONTS_DIR',str(root/'node_modules'/'@fontsource')))

def b64(p): return base64.b64encode(pathlib.Path(p).read_bytes()).decode()

def font_css():
    out=''
    for fam,name,ws in [('Chakra Petch','chakra-petch',[500,600,700]),('Archivo','archivo',[400,500,600,700]),('Noto Serif Display','noto-serif-display',[400])]:
        for w in ws:
            out+=f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64(fonts/name/'files'/f'{name}-latin-{w}-normal.woff2')}) format('woff2')}}\n"
    return out

def scope(css,prefix='.deck '):
    css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
    def blocks(s):
        i=0;n=len(s);res=[]
        while i<n:
            j=s.find('{',i)
            if j<0: break
            head=s[i:j].strip();d=1;k=j+1
            while k<n and d>0:
                if s[k]=='{': d+=1
                elif s[k]=='}': d-=1
                k+=1
            res.append((head,s[j+1:k-1]));i=k
        return res
    def go(s):
        out=[]
        for head,body in blocks(s):
            if head.startswith('@keyframes') or head.startswith('@font-face'):
                out.append(head+'{'+body+'}')
            elif head.startswith('@media'):
                out.append(head+'{'+go(body)+'}')
            else:
                sels=[x.strip() for x in head.split(',')]
                sels=[x if x.startswith('.deck') else prefix+x for x in sels]
                out.append(','.join(sels)+'{'+body.strip()+'}')
        return '\n'.join(out)
    return go(css)

logo='data:image/png;base64,'+b64(P/'logo-default.png')
js=(P/'app.js').read_text(encoding='utf-8').replace('%%LOGO%%',logo)
theme=scope((P/'theme-vidrio.css').read_text(encoding='utf-8'))
ui=(P/'ui.css').read_text(encoding='utf-8')
body=(P/'body.html').read_text(encoding='utf-8')
fonts_css=font_css()
styles=f'<style id="font-css">{fonts_css}</style>\n<style id="theme-css">\n{theme}\n</style>\n<style id="ui-css">\n{ui}\n</style>\n'
title='<title>Taber Slides</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
script='<script>\n'+js+'\n</script>\n'

(root/'dist').mkdir(exist_ok=True)
artifact=title+styles+body+script
(root/'dist'/'artifact.html').write_text(artifact,encoding='utf-8')

head='<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+title+'<style>[hidden]{display:none!important}img{max-width:100%}html{color-scheme:dark}</style>\n'+styles+'</head>\n<body>\n'
standalone=head+body+script+'</body>\n</html>\n'
(root/'dist'/'index.html').write_text(standalone,encoding='utf-8')
print('artifact',len(artifact)/1e6,'MB  standalone',len(standalone)/1e6,'MB')

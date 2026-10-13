"""Build Column mapping slide mode from approved article and homepage copy.
Run: python3 slides/build-column-mapping.py
"""
from pathlib import Path
from html import escape, unescape
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / 'case-studies/column-mapping.html').read_text()
home = (ROOT / 'index.html').read_text()
reference = (ROOT / 'slides/validation.html').read_text()

def element(text, start, tag):
    depth = 0
    for m in re.finditer(r'</?' + tag + r'\b[^>]*>', text[start:]):
        depth += -1 if m.group().startswith('</') else 1
        if depth == 0: return text[start:start + m.end()]
    raise ValueError('Unclosed ' + tag)

def pick(text, pattern, tag):
    return element(text, re.search(pattern, text).start(), tag)

def clean(text):
    text = re.sub(r'<svg\b.*?</svg>', '', text, flags=re.S)
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', text)).split())

def inner(text): return text[text.index('>')+1:text.rfind('</')]
def section(id): return pick(src, rf'<section aria-labelledby="{id}-heading"', 'section')
def heading(text): return clean(pick(text, r'<h3\b', 'h3'))
def card(text): return pick(text, r'<div class="evidence-card[^\"]*"', 'div')
def asset(text):
    text = re.sub(r'\sloading="lazy"', '', text)
    return re.sub(r'(src|poster|href|data)="media/', r'\1="../case-studies/media/', text)

slides, dialogs = [], []
def popup(id, source_card, title, strap=''):
    source_card = asset(source_card)
    head = pick(source_card, r'<div class="framing-head">', 'div')
    label = clean(pick(head, r'<span class="framing-label">', 'span'))
    trigger = head.replace('<div class="framing-head">', f'<button class="framing-head validation-trigger" type="button" data-dialog="{id}" aria-haspopup="dialog" aria-controls="{id}">', 1).replace('</div>', '</button>')
    full_head = head.replace('<span class="framing-label">', f'<span class="framing-label" id="{id}-label">', 1)
    full_head += f'<header class="dialog-heading"><h2 tabindex="-1" autofocus>{escape(title)}</h2>'
    if strap: full_head += f'<p class="dialog-strap">{escape(strap)}</p>'
    full_head += '</header>'
    body = source_card.replace(head, full_head, 1)
    dialogs.append(f'<dialog id="{id}" class="validation-dialog" aria-labelledby="{id}-label"><button class="dialog-close" type="button" aria-label="Close {escape(label.lower())}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>{body}</dialog>')
    return trigger

def slide(id, group, title, content='', kind='', strap='', trigger=''):
    header = f'<header><p class="eyebrow">{escape(group)}</p>'
    if title: header += f'<h2>{escape(title)}</h2>'
    if strap: header += f'<p class="strap">{escape(strap)}</p>'
    header += trigger + '</header>'
    slides.append(f'<section id="{id}" class="{kind}" data-title="{escape(title, quote=True)}"><div class="slide-layout">{header}{content}</div></section>')

def outline(id, group, title, items, kind='portrait-media contents-side'):
    links=''.join(f'<li><a href="#/{target}"><span>{i:02}</span>{escape(label)}</a></li>' for i,(target,label) in enumerate(items,1))
    slide(id, group, title, '<ol class="contents-list">'+links+'</ol>', 'contents-slide '+kind)

def video(id, text, title):
    v=asset(pick(text, r'<video\b', 'video'))
    v=v.replace(' autoplay','').replace(' disablepictureinpicture','').replace('<video ', '<video controls data-autoplay ',1)
    slides.append(f'<section id="{id}" class="full-video" data-title="{escape(title,quote=True)}">{v}</section>')

def image_slide(id, group, title, img, strap='', trigger='', kind=''):
    slide(id,group,title,'<div class="media-stage">'+asset(img)+'</div>','media-slide '+kind,strap,trigger)

def poster_for(filename):
    raw=(ROOT/'case-studies/media'/filename).read_text()
    raw=re.sub(r'<script\b.*?</script>', '', raw, flags=re.S)
    # Freeze SMIL at its completed layout so overview art isn't an empty first frame.
    if '<animate' in raw:
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
        tree=ET.fromstring(raw)
        for parent in tree.iter():
            for child in list(parent):
                tag=child.tag.split('}')[-1]
                if tag in ('animate','animateTransform','animateMotion','set'):
                    values=child.get('values','').split(';')
                    times=[float(t) for t in child.get('keyTimes','').split(';') if t]
                    # The final frame fades out for looping; the 80% hold is readable.
                    index=max((i for i,t in enumerate(times) if t<=.8),default=len(values)-1)
                    value=child.get('to') or values[min(index,len(values)-1)]
                    attr=child.get('attributeName')
                    if attr and value:
                        if tag=='animateTransform': value=child.get('type','translate')+'('+value+')'
                        parent.set(attr,value)
                    parent.remove(child)
        raw=ET.tostring(tree,encoding='unicode')
    raw=raw.replace('</svg>', '<style>*,*::before,*::after{animation:none!important;transition:none!important}</style></svg>')
    out=ROOT/'slides/media'/filename.replace('.svg','-poster.svg')
    out.parent.mkdir(exist_ok=True); out.write_text(raw)
    return 'media/'+out.name+'?v=2'

def svg_object(id, filename, title):
    poster=poster_for(filename)
    svg=(ROOT/'case-studies/media'/filename).read_text()
    box=[float(x) for x in re.search(r'viewBox="([^"]+)"',svg).group(1).split()]
    scale=min(1280/box[2],720/box[3])
    dimensions=f'width:{box[2]*scale:g}px;height:{box[3]*scale:g}px'
    obj=f'<object class="animated-artwork" style="{dimensions}" type="image/svg+xml" data="../case-studies/media/{filename}" data-overview-src="{poster}" aria-label="{escape(title,quote=True)}"><img src="{poster}" alt="{escape(title,quote=True)}"></object>'
    slides.append(f'<section id="{id}" class="full-graphic mapping-artwork" data-title="{escape(title,quote=True)}"><div class="media-stage">{obj}</div></section>')

home_card=pick(home,r'<a class="case-block has-image mapping-card"','a')
hero=pick(home_card,r'<svg class="case-block-media mapping-vector"','svg')
title=clean(pick(home_card,r'<span class="case-block-title">','span'))
strap=inner(pick(home_card,r'<span class="case-block-subtitle">','span'))
slides.append(f'<section id="splash" class="splash" data-title="{escape(title)}"><div class="slide-layout"><div class="splash-copy"><p class="eyebrow splash-label"><img src="../media/icons/mapping.svg" alt="" width="28" height="28">Column mapping</p><h1>{escape(title)}</h1><p class="strap">{strap}</p></div><div class="media-stage">{hero}</div></div></section>')
slide('key-points','Column mapping','Key points',pick(src,r'<ul class="key-points">','ul'),'key-slide')
sections=['problem','approach','keydecisions','automation','evolution','outcome','reflections']
labels=[clean(pick(section(id),r'<h2\b','h2')) for id in sections]
groups={id:f'{i:02} / {label}' for i,(id,label) in enumerate(zip(sections,labels),1)}
outline('contents','Column mapping','Contents',list(zip(sections,labels)),'contents-columns mapping-contents')
meta=pick(src,r'<div class="meta-row">','div');meta=re.sub(r'\.(?=\s*(?:<|$))','',meta)
slide('project','Column mapping','Project details',meta,'meta-slide')

problem=section('problem')
slide('problem',groups['problem'],heading(problem),kind='section-slide mapping-problem')
flow=asset(pick(problem,r'<div class="diagram schema-flow"','div'))
slides.append(f'<section id="schema-flow-slide" class="full-graphic" data-title="{escape(heading(problem))}"><div class="media-stage">{flow}</div></section>')

approach=section('approach')
trigger=popup('excel-evidence',card(approach),heading(approach))
caption=clean(pick(approach,r'<figcaption>','figcaption'))
images=[asset(img) for img in re.findall(r'<img\b[^>]*>',approach)]
thumbs=''.join(f'<button class="excel-thumbnail" type="button" data-excel-index="{i}" aria-label="Open spreadsheet image {i+1}" aria-haspopup="dialog">{img}</button>' for i,img in enumerate(images))
slide('approach',groups['approach'],heading(approach),'<div class="excel-thumbnails">'+thumbs+'</div>','excel-gallery',caption,trigger)
dialogs.append('<dialog id="excel-lightbox" class="excel-lightbox" aria-label="Spreadsheet images"><button class="lightbox-close" aria-label="Close image">×</button><img class="lightbox-image" alt="" tabindex="-1" autofocus><div class="lightbox-controls"><button class="lightbox-prev" aria-label="Previous image">←</button><span class="lightbox-count" aria-live="polite"></span><button class="lightbox-next" aria-label="Next image">→</button></div></dialog>')

design=section('keydecisions')
outline('keydecisions',groups['keydecisions'],heading(design),[
    ('aligned','Aligned schemas'),
    ('combined-tabs','Combined tab/progress bar'),('completed-interface','Completed interface')
], 'portrait-media contents-side mapping-design-contents')
svg_object('traditional','mch-traditional-animated.svg','Traditional approach: Connecting lines')
svg_object('aligned','mch-alignment-animated.svg','A better approach: Aligned schemas')
svg_object('stacked-tabs','mch-wireframe-extended-animated.svg',clean(pick(design,r'<figcaption>','figcaption')))
tabs=asset(pick(design,r'<figure class="figure mapping-tabs-detail"','figure'))
tabs=tabs.replace(pick(tabs,r'<div class="stage-heading">','div'),'')
tabs=tabs.replace('<object ','<object data-overview-src="media/mapping-tabs-poster.jpg" ',1)
slide('combined-tabs',groups['keydecisions'],'Combined tab/progress bar',tabs,'portrait-media mapping-interactive')
ship=popup('ship-and-learn',card(design),'Completed interface')
slide('completed-interface',groups['keydecisions'],'Completed interface','','section-slide',trigger=ship)
video('completed-interface-video',design,'Completed interface')

automation=section('automation')
slide('automation',groups['automation'],heading(automation),'','section-slide',clean(pick(automation,r'<figcaption>','figcaption')))
video('automap-preview',automation,heading(automation))
refinement=pick(automation,r'<div class="subsection" id="refinement-heading"','div')
confidence=popup('confidence-validation',card(refinement),heading(refinement))
# Match the article's enlarged detail and its crop of the green top border.
crop='<svg class="confidence-crop" viewBox="14 298 632 234" role="img" aria-label="'+escape(unescape(re.search(r'alt="([^"]+)"',refinement).group(1)),quote=True)+'"><image href="../case-studies/media/mapping-detail.png" width="1348" height="746"/></svg>'
image_slide('uncertainty',groups['automation'],heading(refinement),crop,'',confidence)

evolution=section('evolution')
semantics=pick(evolution,r'<div class="subsection" id="semantics-heading"','div')
evaluation=pick(evolution,r'<div class="subsection" id="evaluation-heading"','div')
outline('evolution',groups['evolution'],'Evolution', [('semantics',heading(semantics)),('evaluation',heading(evaluation))])
exploration=popup('model-exploration',card(semantics),heading(semantics))
slide('semantics',groups['evolution'],heading(semantics),pick(semantics,r'<blockquote','blockquote'),'quote-slide mapping-semantics',trigger=exploration)
model=popup('model-evaluation',card(evaluation),clean(pick(evaluation,r'<span class="problem-item-title">','span')),
    clean(pick(evaluation,r'<span class="problem-item-teaser">','span')))
chart=pick(evaluation,r'<figure class="model-chart"','figure')
slide('evaluation',groups['evolution'],heading(evaluation),chart,'mapping-chart-slide',trigger=model)

outcomes=section('outcome'); adoption=pick(outcomes,r'<div class="subsection"','div')
intro=clean(pick(adoption,r'<p>','p'))
points=pick(adoption,r'<ul class="outcomes-list">','ul').replace('href="#evaluation-heading"','href="#/evaluation"')
slide('outcome',groups['outcome'],heading(adoption),points,'mapping-outcomes',intro)
slide('client-quote',groups['outcome'],heading(adoption),pick(outcomes,r'<blockquote','blockquote'),'quote-slide outcome-quote-slide')
reflections=section('reflections')
for i,m in enumerate(re.finditer(r'<div class="subsection">',reflections)):
    part=element(reflections,m.start(),'div')
    copy=''.join(re.findall(r'<p>.*?</p>',part,re.S))
    slide('reflections' if i==0 else 'schema-change',groups['reflections'],heading(part),f'<div class="reflection-copy">{copy}</div>','section-slide reflection-slide mapping-reflection')

# Reuse the approved navigation chrome without executing Validation's generator.
nav=pick(reference,r'<nav class="deck-toolbar"','nav').replace('../case-studies/validation.html','../case-studies/column-mapping.html')
footer=pick(reference,r'<footer class="deck-footer"','footer').replace('/</span> Validation','/</span> Column mapping')
page='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Column mapping — slide mode</title><link rel="icon" href="../tdg-favicon.svg"><link rel="stylesheet" href="vendor/reveal/reveal.css"><link rel="stylesheet" href="deck.css?v=42"><link rel="stylesheet" href="column-mapping.css?v=4"></head><body class="mapping-deck">'''+nav+'<main class="reveal"><div class="slides">'+'\n'.join(slides)+'</div></main>'+footer+'\n'.join(dialogs)+'''<noscript>This presentation needs JavaScript. <a href="../case-studies/column-mapping.html">Read the case study</a>.</noscript><script src="vendor/reveal/reveal.js"></script><script src="deck.js?v=42"></script><script src="column-mapping.js?v=2"></script></body></html>'''
(ROOT/'slides/column-mapping.html').write_text('\n'.join(line.rstrip() for line in page.splitlines())+'\n')
# Retain the diagram's exact animation geometry and timing; gate it by slide state.
scripts=re.findall(r'<script[^>]*>(.*?)</script>',src,re.S)
flow_script=next(s for s in scripts if "var diagram = document.querySelector('.schema-flow')" in s)
start=flow_script.index("  if ('IntersectionObserver' in window) {")
end=flow_script.index("  motion.addEventListener",start)
flow_script=flow_script[:start]+'''  function setVisibility() {
    visible = diagram.closest('section').classList.contains('present') && !document.querySelector('main.reveal').inert;
    sync();
  }
  var observer = new MutationObserver(setVisibility);
  observer.observe(diagram.closest('section'), {attributes:true, attributeFilter:['class']});
  observer.observe(document.querySelector('main.reveal'), {attributes:true, attributeFilter:['inert']});
  setVisibility();
'''+flow_script[end:]
(ROOT/'slides/mapping-flow.js').write_text('// Extracted from the article by build-column-mapping.py.\n'+flow_script.strip()+'\n')
# Inject separately so the source animation stays inspectable.
p=ROOT/'slides/column-mapping.html';p.write_text(p.read_text().replace('<script src="column-mapping.js', '<script src="mapping-flow.js"></script><script src="column-mapping.js'))
print(f'Built {len(slides)} slides, {len(dialogs)} popup cards and {page.count("<video ")} videos.')

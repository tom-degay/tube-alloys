"""Regenerate the slide prototype from the approved case-study content.
Run with: python3 slides/build-validation.py (no build step needed to view).
"""
from pathlib import Path
import re
from html import escape, unescape

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / 'case-studies/validation.html').read_text()

def element(text, start, tag):
    depth = 0
    for m in re.finditer(r'</?' + tag + r'\b[^>]*>', text[start:]):
        depth += -1 if m.group().startswith('</') else 1
        if depth == 0:
            return text[start:start + m.end()]
    raise ValueError('Unclosed ' + tag)

def pick(text, pattern, tag):
    return element(text, re.search(pattern, text).start(), tag)

def cards(text):
    return [element(text,m.start(),'div') for m in re.finditer(r'<div class="evidence-card[^\"]*"[^>]*>',text)]

def clean(text):
    text = re.sub(r'<svg\b.*?</svg>', '', text, flags=re.S)
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', text)).split())

def asset(text):
    for attr in ['src', 'poster', 'href']:
        text=text.replace(f'{attr}="media/', f'{attr}="../case-studies/media/')
    return text

slides=[]
def slide(id, group, title, content, kind='', strap=''):
    header = f'<header><p class="eyebrow">{group}</p>' + (f'<h2>{title}</h2>' if title else '') + (f'<p class="strap">{strap}</p>' if strap else '') + '</header>'
    slides.append(f'<section id="{id}" class="{kind}" data-title="{escape(clean(title),quote=True)}"><div class="slide-layout">{header}{content}</div></section>')

def card_slide(id, group, title, card):
    # Detailed prototype imagery gets its own full-size slides below.
    while '<figure' in card:
        fig=element(card,card.index('<figure'),'figure');card=card.replace(fig,'')
    slide(id,group,title,card,'card-slide')

def image_slide(id,group,title,filename,alt,strap='',kind=''):
    media=f'<div class="media-stage"><img src="../case-studies/media/{filename}" alt="{escape(alt,quote=True)}" decoding="async"></div>'
    slide(id,group,title,media,'media-slide '+kind,strap)

def video_slide(id,group,title,filename,poster,strap=''):
    media=f'<div class="media-stage"><video controls muted loop playsinline preload="metadata" poster="../case-studies/media/{poster}" data-autoplay><source src="../case-studies/media/{filename}" type="video/mp4"></video></div>'
    slide(id,group,title,media,'media-slide',strap)

def full_video(id, title, markup):
    markup=asset(markup).replace(' autoplay', '').replace('<video ', '<video data-autoplay controls ')
    markup=markup.replace(' disablepictureinpicture', '')
    slides.append(f'<section id="{id}" class="full-video" data-title="{escape(title,quote=True)}">{markup}</section>')

def outline(id, group, title, entries, kind=''):
    items=''.join(f'<li><a href="#/{target}"><span>{i:02}</span>{label}</a></li>' for i,(target,label) in enumerate(entries,1))
    slide(id,group,title,f'<ol class="contents-list">{items}</ol>','contents-slide '+kind)

def detail(id):
    return pick(src,rf'<details class="problem-item" id="{id}"','details')

def detail_heading(id):
    text=detail(id)
    return (clean(pick(text,r'<span class="problem-item-title"','span')),
            clean(pick(text,r'<span class="problem-item-teaser"','span')))

def extend_detail(id, group):
    """Keep every card and visual, in source order; use exact summary copy."""
    text=detail(id)
    title,strap=detail_heading(id)
    body=pick(text,r'<div class="problem-item-body">','div')
    # Match only top-level visual/card units, skipping their inner markup.
    pattern=r'<div class="evidence-card[^\"]*"[^>]*>|<img\b[^>]*>|<video\b[^>]*>|<svg class="submit-mockup-frame"[^>]*>'
    cursor=0; count=0
    while (match:=re.search(pattern,body[cursor:])):
        start=cursor+match.start(); opening=match.group()
        tag=re.match(r'<(\w+)',opening).group(1)
        block=opening if tag=='img' else element(body,start,tag)
        cursor=start+len(block); count+=1
        slide_id=id if count==1 else f'{id}-{count}'
        if tag=='div':
            kind='card-slide portrait-media scope-evidence' if id=='kd-scope' else 'card-slide'
            slide(slide_id,group,title,asset(block),kind,strap)
        elif tag=='video':
            slide(slide_id,group,title,'','section-slide',strap)
            full_video(slide_id+'-video',title,block)
        else:
            block=asset(block).replace(' loading="lazy"','')
            if id=='impl-ordering' and count==1:
                slide(slide_id,group,title,'','section-slide',strap)
                slides.append(f'<section id="{slide_id}-image" class="full-image" data-title="{escape(title,quote=True)}">{block}</section>')
                continue
            kind='portrait-media' if tag=='img' and int(re.search(r'height="(\d+)"',block).group(1))/int(re.search(r'width="(\d+)"',block).group(1)) > .65 else ''
            if id=='kd-scope' and count==1:
                image_src=re.search(r'src="([^"]+)"',block).group(1)
                alt=re.search(r'alt="([^"]+)"',block).group(1)
                block=f'<svg class="popup-detail-image" viewBox="440 235 1045 725" role="img" aria-label="{alt}"><image href="{image_src}" width="1899" height="1068"/></svg>'
                kind='portrait-media popup-detail'
            container='figure' if tag=='svg' else 'div'
            figure_id=' id="corrections-submit-mockup"' if tag=='svg' else ''
            media=f'<{container}{figure_id} class="media-stage">{block}</{container}>'
            slide(slide_id,group,title,media,'media-slide '+kind,strap)

home=(ROOT/'index.html').read_text()
home_card=pick(home,r'<a class="case-block has-image validation-card" id="validations-card"','a')
headline=clean(pick(home_card,r'<span class="case-block-title">','span'))
strap=clean(pick(home_card,r'<span class="case-block-subtitle">','span'))
hero_graphic=pick(home_card,r'<svg class="case-block-media validation-vector"','svg')
strap=strap.replace('audit trail. ', 'audit trail.<br>')
slides.append(f'''<section id="splash" class="splash" data-title="{headline}"><div class="slide-layout"><div class="splash-copy"><p class="eyebrow splash-label"><img src="../media/icons/validation.svg" alt="" width="28" height="28">Validation</p><h1>{headline}</h1><p class="strap">{strap}</p></div><div class="media-stage">{hero_graphic}</div></div></section>''')
keypoints=pick(src,r'<ul class="key-points">','ul')
slide('key-points','Validation','Key points',keypoints,'key-slide')
outline('contents','Validation','Contents',[
    ('problem','Problem'),('approach','Approach'),('design-decisions','Design decisions'),
    ('sharing','Sharing'),('outcome','Outcome'),('reflections','Reflections')
], 'contents-columns')
meta=pick(src,r'<div class="meta-row">','div')
meta=re.sub(r'\.(?=\s*(?:<|$))', '', meta)
slide('project','Validation','Project details',meta,'meta-slide')
problem=src[src.index('<section aria-labelledby="problem-heading"'):src.index('<section aria-labelledby="approach-heading"')]
quote='<blockquote><p>You can see exactly where the data is wrong.</p><p>Fixing it means leaving the report, writing a formula in a pipeline, or emailing the supplier and waiting.</p><p>Now imagine working through hundreds of checks every month.</p></blockquote>'
# The statement is the headline here, so no redundant large heading.
slide('problem','01 / Problem','',quote,'quote-slide')
slides.append('<section id="original-report" class="full-video" data-title="Original validation report"><video aria-label="Original validation report" controls muted loop playsinline preload="metadata" poster="../case-studies/media/validations-drill-down.jpg" data-start="1"><source src="../case-studies/media/validations-drill-down.mp4#t=1" type="video/mp4"></video></section>')
image_slide('fixing-errors','01 / Problem','No easy way to fix errors in data','ad-hoc-correction.png','An ad hoc IF statement corrects the Accident State for a specific policy number.','We’d made errors easy to spot but hard to fix','wide-detail')
pc=cards(problem)
card_slide('correction-evidence','01 / Problem','No easy way to fix errors in data',pc[0])
slide('siloed','01 / Problem','Results were siloed in Quantemplate',pc[1],'card-slide','Clients wanted an easier way to share results with suppliers')
image_slide('enterprise-scale','01 / Problem','Workflow was inefficient at enterprise scale','validation-report-passed.png','A client report with hundreds of validation rules.','Usage had outgrown original design intent','portrait-media enterprise-detail')
slide('scale-evidence','01 / Problem','Workflow was inefficient at enterprise scale',pc[2],'card-slide portrait-media evidence-detail','Usage had outgrown original design intent')
workflow=pick(problem,r'<svg class="wf-diagram"','svg')
slides.append(f'<section id="workflow" class="full-graphic" data-title="The correction workflow"><div class="media-stage interactive-stage">{workflow}</div></section>')
approach=src[src.index('<section aria-labelledby="approach-heading"'):src.index('<section aria-labelledby="keydecisions-heading"')]
approach_intro=clean(pick(approach,r'<p>','p'))
slides.append('<section id="approach" class="section-slide" data-title="Framing the problem"><div class="slide-layout"><header><p class="eyebrow">02 / Approach</p></header><h1>Framing the problem</h1></div></section>')
for id,title,card in zip(['cell-editing','navigation','supplier-feedback'],['Make a rule as easy as editing a cell','Fix the journey, not just the scroll position','Connect the feedback workflow'],cards(approach)):
    # Card text is kept verbatim; a quiet section label replaces an added headline.
    card_slide(id,'02 / Approach','',card)
    slides[-1]=slides[-1].replace('class="card-slide"','class="card-slide framing-slide"',1)
outline('design-decisions','03 / Design decisions','Applying corrections',[
    ('before-and-after','Show before and after'),
    *[(id,detail_heading(id)[0]) for id in ['kd-scope','kd-evidence','kd-feedback','impl-ordering']]
], 'portrait-media contents-side')
before_after=src[src.index('<details class="problem-item" id="kd-entering"'):src.index('<details class="problem-item" id="kd-scope"')]
image_slide('before-and-after','03 / Design decisions','Show before and after','corrections-detail.png','Original failed values alongside editable correction fields.','Keep the original value beside the correction','portrait-media')
image_slide('first-prototype','03 / Design decisions','First prototype','corrections-before.png','First prototype: correction fields were not clearly editable.',"Fields don't look clickable",'portrait-media')
image_slide('improved-design','03 / Design decisions','Improved design','corrections-after.png','Revised entry fields are clearly defined and linked to original values.','Clearer text entry affordances','portrait-media')

for id in ['kd-scope','kd-evidence','kd-feedback','impl-ordering']:
    extend_detail(id,'03 / Design decisions')

outline('improved-workflow','03 / Design decisions','Improved workflow',
        [(id,detail_heading(id)[0]) for id in ['iw-filter','iw-skip','iw-navigation']], 'portrait-media contents-side')
improved=pick(src,r'<div class="subsection" id="improved-workflow">','div')
improved_graphic=pick(improved,r'<svg class="wf-diagram"','svg')
slides.append(f'<section id="improved-workflow-graphic" class="full-graphic" data-title="Improved workflow"><div class="media-stage interactive-stage">{improved_graphic}</div></section>')
for id in ['iw-filter','iw-skip','iw-navigation']:
    extend_detail(id,'03 / Design decisions')

slides.append('<section id="applying-corrections" class="full-video" data-title="Applying corrections"><video aria-label="Applying corrections" controls muted loop playsinline preload="metadata" poster="../case-studies/media/validation-hero-poster.jpg" data-autoplay><source src="../case-studies/media/validation-hero.mp4" type="video/mp4"></video></section>')

sharing=pick(src,r'<section aria-labelledby="sharing-heading"','section')
outline('sharing','04 / Sharing',clean(pick(sharing,r'<h3>','h3')),
        [(id,detail_heading(id)[0]) for id in ['sh-choose','sh-submit','sh-progress']], 'portrait-media contents-side')
# Keep the architecture diagram immediately after the Sharing contents slide.
architecture=(ROOT/'case-studies/media/correction-requests.svg').read_text()
architecture=architecture.replace('<svg ', '<svg class="correction-requests-diagram" style="display:block;width:100%;height:auto;max-height:100%" ', 1)
# Slide-only playback: keep the article's timing, but finish with everything visible.
architecture=architecture.replace(' infinite;', ' 1 forwards;')
architecture=re.sub(r'/\* Preserve the movement speed,.*?\*/',
                    '/* Play once on slide entry and hold the completed diagram. */', architecture, count=1, flags=re.S)
architecture=re.sub(r'@keyframes cr-reset \{[^\n]+\}',
                    '@keyframes cr-reset { from, to { opacity: 1; } }', architecture, count=1)
for label in ['in','out']:
    pattern=rf'@keyframes cr-label-{label} \{{\s*0%, ([\d.]+)%, [\d.]+%, 100% \{{ opacity: 0; \}}\s*([\d.]+)%, [\d.]+% \{{ opacity: 1; \}}\s*\}}'
    timing=re.search(pattern,architecture)
    assert timing, f'Missing correction-request label timing: {label}'
    architecture=re.sub(pattern, f'@keyframes cr-label-{label} {{\n  0%, {timing[1]}% {{ opacity: 0; }}\n  {timing[2]}%, 100% {{ opacity: 1; }}\n}}', architecture, count=1)
# Replay on re-entry, and leave a complete static diagram in the overview.
architecture=architecture.replace('</style>', '''
.slides section:not(.present) .correction-requests-diagram *,
main.reveal[inert] .correction-requests-diagram *,
.grid-preview .correction-requests-diagram * { animation: none !important; }
</style>''', 1)
slides.append(f'<section id="correction-requests-architecture" class="full-graphic" data-title="Correction requests architecture"><div class="media-stage">{architecture}</div></section>')
for id in ['sh-choose','sh-submit','sh-progress']:
    extend_detail(id,'04 / Sharing')
full_video('sharing-setup','Bringing suppliers into the correction workflow',pick(sharing,r'<video\b','video'))

outcome=pick(src,r'<section aria-labelledby="outcome-heading"','section')
slide('outcome','05 / Outcome',clean(pick(outcome,r'<h3>','h3')),
      pick(outcome,r'<blockquote','blockquote'),'quote-slide outcome-quote-slide')
chart=pick(outcome,r'<figure class="corrections-chart"','figure')
chart_title=pick(chart,r'<h3','h3')
chart_subtitle=pick(chart,r'<p class="corrections-chart-subtitle"','p')
chart=chart.replace(chart_title,'').replace(chart_subtitle,'')
slide('corrections-outcome','05 / Outcome',clean(chart_title),chart,'chart-slide',clean(chart_subtitle))
slides[-1]=slides[-1].replace('<h2>', '<h2 id="corrections-chart-title">', 1)

reflections=pick(src,r'<section aria-labelledby="reflections-heading"','section')
reflection_parts=re.split(r'<h3>',reflections)[1:]
for i,part in enumerate(reflection_parts):
    title=clean('<h3>'+part[:part.index('</h3>')+5])
    if i==0:
        paragraphs=''.join(re.findall(r'<p>.*?</p>',part,re.S))
        slide('reflections','06 / Reflections',title,
              f'<div class="reflection-copy">{paragraphs}</div>','section-slide reflection-slide')
    if '<img' in part:
        img=re.search(r'<img\b[^>]*>',part).group().replace(' loading="lazy"','')
        caption=clean(pick(part,r'<figcaption>','figcaption'))
        slide('agentic-preview','06 / Reflections',title,
              f'<div class="media-stage">{img}</div>','media-slide portrait-media',caption)

# Use stable IDs throughout this pass: the requested numbers refer to the
# 51-slide sequence before any cards are removed.
original_slides={re.search(r'<section id="([^"]+)"',markup).group(1):markup for markup in slides}
dialogs=[]
def card_popup(dialog_id, targets, card, title, strap=''):
    # Prototype images already have their own slides; retain all card prose.
    while '<figure' in card:
        figure=element(card,card.index('<figure'),'figure')
        card=card.replace(figure,'')
    card=asset(card)
    label_head=pick(card,r'<div class="framing-head">','div')
    label=clean(pick(label_head,r'<span class="framing-label">','span'))
    trigger=label_head.replace('<div class="framing-head">',
        f'<button class="framing-head validation-trigger" type="button" data-dialog="{dialog_id}" aria-haspopup="dialog" aria-controls="{dialog_id}">',1).replace('</div>','</button>')
    for target in targets:
        index=next(i for i,markup in enumerate(slides) if markup.startswith(f'<section id="{target}"'))
        slides[index]=slides[index].replace('</header>',trigger+'</header>',1)
    label_id=dialog_id+'-label'
    heading=f'<header class="dialog-heading"><h2 tabindex="-1" autofocus>{title}</h2>'
    if strap:
        heading+=f'<p class="dialog-strap">{strap}</p>'
    heading+='</header>'
    card=card.replace(label_head,label_head+heading,1).replace('<span class="framing-label">',f'<span class="framing-label" id="{label_id}">',1)
    dialogs.append(f'<dialog id="{dialog_id}" class="validation-dialog" aria-labelledby="{label_id}"><button class="dialog-close" type="button" aria-label="Close {escape(label.lower(),quote=True)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>{card}</dialog>')

popup_cards=[
    # Original target slides / card slide: 07/08, 10/11, 21/22, 26/28,
    # 33/34, 40+41/39, 42/43 and 44+46/45.
    ('correction-evidence-popup', ['fixing-errors'], 'correction-evidence'),
    ('scale-evidence-popup', ['enterprise-scale'], 'scale-evidence'),
    ('scope-validation', ['kd-scope'], 'kd-scope-2'),
    ('ordering-constraint', ['impl-ordering'], 'impl-ordering-2'),
    ('navigation-validation', ['iw-skip'], 'iw-skip-2'),
    ('sharing-evidence', ['sh-choose-2','sh-choose-3'], 'sh-choose'),
    ('submission-exploration', ['sh-submit'], 'sh-submit-2'),
    ('progress-exploration', ['sh-progress','sh-progress-3'], 'sh-progress-2'),
]
for dialog_id,targets,source_id in popup_cards:
    source=original_slides[source_id]
    title=clean(pick(source,r'<h2>','h2'))
    strap=clean(pick(source,r'<p class="strap">','p')) if '<p class="strap">' in source else ''
    card_popup(dialog_id,targets,cards(source)[0],title,strap)
# Original slides 19 and 20 share the complete website validation card.
card_popup('entry-validation',['first-prototype','improved-design'],cards(before_after)[0],*detail_heading('kd-entering'))
removed_ids={source_id for _,_,source_id in popup_cards}
slides=[markup for markup in slides if re.search(r'<section id="([^"]+)"',markup).group(1) not in removed_ids]
# Original slide 35 now uses the same side-by-side layout as original slide 36.
slides=[markup.replace('<section id="iw-navigation" class="media-slide "', '<section id="iw-navigation" class="media-slide portrait-media"')
        .replace('href="#/sh-choose"','href="#/sh-choose-2"') for markup in slides]

page='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Validation — slide mode</title><link rel="icon" href="../tdg-favicon.svg"><link rel="stylesheet" href="vendor/reveal/reveal.css"><link rel="stylesheet" href="deck.css?v=42"><link rel="stylesheet" href="details.css?v=22"></head><body>
<nav class="deck-toolbar" aria-label="Presentation controls"><a href="../case-studies/validation.html" class="back-link">↖ Case study</a><div><button id="contents-button" type="button" aria-label="Contents" title="Contents"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M3 6h1M3 12h1M3 18h1"/></svg></button><button id="overview-button" type="button" aria-label="Overview" title="Overview (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button><button id="fullscreen-button" type="button" aria-label="Full screen" title="Full screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="expand-icon" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path class="collapse-icon" d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/></svg></button></div></nav>
<main class="reveal"><div class="slides">'''+ '\n'.join(slides)+'''</div></main>
<footer class="deck-footer"><span>Tom de Gay <span class="footer-divider">/</span> Validation</span><div><button id="prev-slide" aria-label="Previous slide">←</button><span id="slide-count" aria-live="polite"></span><button id="next-slide" aria-label="Next slide">→</button></div></footer>
<noscript>This presentation needs JavaScript. <a href="../case-studies/validation.html">Read the case study</a>.</noscript>
<script src="vendor/reveal/reveal.js"></script><script src="workflow.js"></script><script src="deck.js?v=41"></script><script src="details.js?v=22"></script></body></html>'''
page=page.replace('<noscript>','\n'.join(dialogs)+'\n<noscript>')
page='\n'.join(line.rstrip() for line in page.splitlines())+'\n'
(ROOT/'slides/validation.html').write_text(page)
script=next(x for x in re.findall(r'<script[^>]*>(.*?)</script>',src,re.S) if "querySelectorAll('.wf-diagram')" in x)
# Fixed slide canvas: keep the wide diagram layout when a viewport scales down.
script=script.replace('var STACK_BELOW = 600;', 'var STACK_BELOW = 0;')
(ROOT/'slides/workflow.js').write_text('// Copied from the case study by build-validation.py.\n'+script)
card_count=''.join(slides).count('<div class="evidence-card')
video_count=page.count('<video ')
print(f'Built {len(slides)} slides, {card_count} inline cards, {len(dialogs)} popup cards and {video_count} videos.')

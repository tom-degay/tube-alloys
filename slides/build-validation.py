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
    return [element(text,m.start(),'div') for m in re.finditer(r'<div class="evidence-card[^\"]*">',text)]

def clean(text):
    text = re.sub(r'<svg\b.*?</svg>', '', text, flags=re.S)
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', text)).split())

def asset(text):
    return text.replace('src="media/', 'src="../case-studies/media/').replace('poster="media/', 'poster="../case-studies/media/')

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

headline=clean(pick(src,r'<h1 class="display head-fade">','h1'))
strap=clean(pick(src,r'<p class="subtitle head-fade">','p'))
slides.append(f'''<section id="splash" class="splash" data-title="{headline}"><div class="slide-layout"><img class="splash-icon" src="../media/icons/validation.svg" alt=""><p class="eyebrow">Quantemplate · Validation</p><h1>{headline}</h1><p class="strap">{strap}</p><p class="byline">Tom de Gay <span>Product design</span></p></div></section>''')
keypoints=pick(src,r'<ul class="key-points">','ul')
slide('key-points','Validation','Key points',keypoints,'key-slide')
slide('contents','Validation','Contents','''<ol class="contents-list"><li><a href="#/problem"><span>01</span>Problem</a></li><li><a href="#/approach"><span>02</span>Approach</a></li><li><a href="#/design-decisions"><span>03</span>Design decisions <small>Applying corrections · Show before and after</small></a></li></ol>''','contents-slide')
meta=pick(src,r'<div class="meta-row">','div')
slide('project','Validation','Project details',meta,'meta-slide')
problem=src[src.index('<section aria-labelledby="problem-heading"'):src.index('<section aria-labelledby="approach-heading"')]
quote=pick(problem,r'<blockquote>','blockquote')
# The statement is the headline here, so no redundant large heading.
slide('problem','01 / Problem','',quote,'quote-slide')
video_slide('original-report','01 / Problem','Original validation report','validations-drill-down.mp4','validations-drill-down.jpg','We’d made errors easy to spot but hard to fix')
image_slide('fixing-errors','01 / Problem','No easy way to fix errors in data','ad-hoc-correction.png','An ad hoc IF statement corrects the Accident State for a specific policy number.','We’d made errors easy to spot but hard to fix','wide-detail')
pc=cards(problem)
card_slide('correction-evidence','01 / Problem','No easy way to fix errors in data',pc[0])
slide('siloed','01 / Problem','Results were siloed in Quantemplate',pc[1],'card-slide','Clients wanted an easier way to share results with suppliers')
image_slide('enterprise-scale','01 / Problem','Workflow was inefficient at enterprise scale','validation-report-passed.png','A client report with hundreds of validation rules.','Usage had outgrown original design intent','portrait-media')
card_slide('scale-evidence','01 / Problem','Usage had outgrown original design intent',pc[2])
workflow=pick(problem,r'<svg class="wf-diagram"','svg')
slide('workflow','01 / Problem','The correction workflow',f'<div class="media-stage interactive-stage">{workflow}</div>','media-slide','Compare the original and improved workflows')
approach=src[src.index('<section aria-labelledby="approach-heading"'):src.index('<section aria-labelledby="keydecisions-heading"')]
approach_intro=clean(pick(approach,r'<p>','p'))
slide('approach','02 / Approach','Framing the problem',f'<p class="section-statement">{approach_intro}</p>','section-slide')
for id,title,card in zip(['cell-editing','navigation','supplier-feedback'],['Make a rule as easy as editing a cell','Fix the journey, not just the scroll position','Connect the feedback workflow'],cards(approach)):
    # Card text is kept verbatim; a quiet section label replaces an added headline.
    card_slide(id,'02 / Approach','',card)
video_slide('design-decisions','03 / Design decisions','Applying corrections','validation-hero.mp4','validation-hero-poster.jpg')
before_after=src[src.index('<details class="problem-item" id="kd-entering"'):src.index('<details class="problem-item" id="kd-scope"')]
image_slide('before-and-after','03 / Design decisions','Show before and after','corrections-detail.png','Original failed values alongside editable correction fields.','Keep the original value beside the correction','portrait-media')
card_slide('design-validation','03 / Design decisions','Show before and after',cards(before_after)[0])
image_slide('first-prototype','03 / Design decisions','First prototype','corrections-before.png','First prototype: correction fields were not clearly editable.','Show before and after','portrait-media')
image_slide('improved-design','03 / Design decisions','Improved design','corrections-after.png','Revised entry fields are clearly defined and linked to original values.','Show before and after','portrait-media')

page='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Validation — slide mode</title><link rel="icon" href="../tdg-favicon.svg"><link rel="stylesheet" href="vendor/reveal/reveal.css"><link rel="stylesheet" href="deck.css?v=2"></head><body>
<nav class="deck-toolbar" aria-label="Presentation controls"><a href="../case-studies/validation.html" class="back-link">↖ Case study</a><div><button id="contents-button" type="button">Contents</button><button id="overview-button" type="button" title="Slide overview (Esc)">Overview</button><button id="fullscreen-button" type="button">Full screen</button></div></nav>
<main class="reveal"><div class="slides">'''+ '\n'.join(slides)+'''</div></main>
<footer class="deck-footer"><span>Tom de Gay <span class="footer-divider">/</span> Validation</span><div><button id="prev-slide" aria-label="Previous slide">←</button><span id="slide-count" aria-live="polite"></span><button id="next-slide" aria-label="Next slide">→</button></div></footer>
<noscript>This presentation needs JavaScript. <a href="../case-studies/validation.html">Read the case study</a>.</noscript>
<script src="vendor/reveal/reveal.js"></script><script src="workflow.js"></script><script src="deck.js"></script></body></html>'''
(ROOT/'slides/validation.html').write_text(page)
script=next(x for x in re.findall(r'<script[^>]*>(.*?)</script>',src,re.S) if "querySelectorAll('.wf-diagram')" in x)
# Fixed slide canvas: keep the wide diagram layout when a viewport scales down.
script=script.replace('var STACK_BELOW = 600;', 'var STACK_BELOW = 0;')
(ROOT/'slides/workflow.js').write_text('// Copied from the case study by build-validation.py.\n'+script)
print(f'Built {len(slides)} slides, {len(pc)+len(cards(approach))+len(cards(before_after))} cards, 2 videos and the interactive workflow.')

"""Build Validation's static slide mode from the current case study.
Run: python3 slides/build-validation.py. No build step is needed to view the deck.

November 2026: article-only content; no key points, contents, API/sharing section
or retired slide-copy overrides. Supporting prose stays available in popups.
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
    match = re.search(pattern, text)
    if not match:
        raise ValueError('Missing article content: ' + pattern)
    return element(text, match.start(), tag)


def inner(markup):
    return re.sub(r'^<[^>]+>|</[^>]+>$', '', markup.strip())


def clean(text):
    text = re.sub(r'<svg\b.*?</svg>', '', text, flags=re.S)
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', text)).split())


def asset(text):
    for attr in ['src', 'poster', 'href']:
        text = text.replace(f'{attr}="media/', f'{attr}="../case-studies/media/')
    return text.replace(' loading="lazy"', '')


def without_figures(text):
    while '<figure' in text:
        text = text.replace(element(text, text.index('<figure'), 'figure'), '')
    return text


def without_evidence(text):
    while re.search(r'<details class="evidence-card', text):
        text = text.replace(pick(text, r'<details class="evidence-card', 'details'), '')
    return text


slides = []
dialogs = []


def slide(id, group, title, content='', kind='section-slide', strap=''):
    header = f'<header><p class="eyebrow">{group}</p>'
    if title:
        header += f'<h2>{title}</h2>'
    if strap:
        header += f'<p class="strap">{strap}</p>'
    header += '</header>'
    slides.append(f'<section id="{id}" class="{kind}" data-title="{escape(clean(title or group), quote=True)}"><div class="slide-layout">{header}{content}</div></section>')


def media_slide(id, group, title, markup, strap='', kind='portrait-media'):
    slide(id, group, title, f'<div class="media-stage">{asset(markup)}</div>', 'media-slide ' + kind, strap)


def full_image(id, title, markup, caption=''):
    slides.append(f'<section id="{id}" class="full-image source-figure" data-title="{escape(clean(title), quote=True)}"><figure>{asset(markup)}' + (f'<figcaption>{caption}</figcaption>' if caption else '') + '</figure></section>')


def full_video(id, title, markup, manual=False):
    # Keep the article's selected asset, including its intentional close-up crops.
    markup = re.sub(r'\s(?:id|data-modal-src|data-modal-poster|controlslist)="[^"]*"', '', markup)
    markup = re.sub(r'\s(?:autoplay|controls|disablepictureinpicture)\b', '', markup)
    if manual:
        markup = re.sub(r'(<source src="[^"]+)(")', r'\1#t=1\2', markup)
    playback = 'data-start="1"' if manual else 'data-autoplay'
    markup = markup.replace('<video ', f'<video controls {playback} aria-label="{escape(title, quote=True)}" ', 1)
    slides.append(f'<section id="{id}" class="full-video" data-title="{escape(title, quote=True)}">{asset(markup)}</section>')


icon = pick(src, r'<svg class="framing-icon"', 'svg')


def popup(id, targets, label, title, body, strap=''):
    """Exact source prose; supplied figures have dedicated slides instead."""
    head = f'<div class="framing-head">{icon}<span class="framing-label">{label}</span></div>'
    trigger = head.replace('<div class="framing-head">', f'<button class="framing-head validation-trigger" type="button" data-dialog="{id}" aria-haspopup="dialog" aria-controls="{id}">', 1).replace('</div>', '</button>')
    for target in targets:
        index = next(i for i, s in enumerate(slides) if s.startswith(f'<section id="{target}"'))
        slides[index] = slides[index].replace('</header>', trigger + '</header>', 1)
    heading = f'<header class="dialog-heading"><h2 id="{id}-title" tabindex="-1" autofocus>{title}</h2>'
    if strap:
        heading += f'<p class="dialog-strap">{strap}</p>'
    dialogs.append(f'<dialog id="{id}" class="validation-dialog" aria-labelledby="{id}-title"><button class="dialog-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button><div class="evidence-card framing-card">{head}{heading}</header>{asset(body)}</div></dialog>')


def decision(id):
    return pick(src, rf'<div class="kd-slide[^\"]*" id="{id}"', 'div')


def heading(block):
    return inner(pick(block, r'<h4 class="kd-title"', 'h4'))


def strapline(block):
    return inner(pick(block, r'<p class="kd-strap"', 'p'))


def decision_popups(id, targets=None):
    block = decision(id)
    targets = targets or [id]
    body = inner(pick(block, r'<div class="kd-more-body"', 'div'))
    popup(id + '-more', targets, 'More', heading(block), without_figures(without_evidence(body)), strapline(block))
    for match in re.finditer(r'<details class="evidence-card', block):
        card = element(block, match.start(), 'details')
        label = clean(pick(card, r'<span class="framing-label"', 'span'))
        card_body = inner(pick(card, r'<div class="evidence-body"', 'div'))
        popup(id + '-support', targets, label, heading(block), without_figures(card_body), strapline(block))


# The current article, including its two-layer hero, is the source of truth.
hero = pick(src, r'<div class="val-hero-shot"', 'div')
hero_copy = pick(src, r'<div class="val-hero-text"', 'div')
title = inner(pick(hero_copy, r'<h1', 'h1'))
subtitle = inner(pick(hero_copy, r'<p class="subtitle"', 'p'))
slides.append(f'<section id="splash" class="splash" data-title="{escape(clean(title), quote=True)}"><div class="slide-layout"><div class="splash-copy"><p class="eyebrow splash-label"><img src="../media/icons/validation.svg" alt="" width="28" height="28">Validation</p><h1>{title}</h1><p class="strap">{subtitle}</p></div><div class="media-stage"><div class="val-hero-media">{asset(hero)}</div></div></div></section>')
slide('project', 'Validation', 'Project details', pick(src, r'<div class="meta-row"', 'div'), 'meta-slide')
# Reuse the requested Column mapping slides by stable ID, not changing numbers.
mapping = (ROOT / 'slides/column-mapping.html').read_text()
context_title = pick(mapping, r'<section id="problem"', 'section')
slides.append(context_title.replace('id="problem"', 'id="context-schemas"', 1).replace('01 / Problem', 'Context'))
slides.append(pick(mapping, r'<section id="schema-flow-slide"', 'section'))

profile_icons = [
    '<path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M2 8h18M8 8v12M2 14h8"/><path d="m13 17 3 3 6-7"/>',
    '<path d="M8 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M6 7h6M6 11h2"/><circle cx="15" cy="14" r="5"/><path d="m19 18 3 3m-9-6v-2m3 2v-4"/>',
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 4v2"/>',
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
]
profiles = [
    ('Data Operations Analysts', 'Routine data operations', 'Process incoming data, monitor throughput and resolve routine validation issues using established procedures.', 'Basic Excel skills'),
    ('Business Analysts', 'Business interpretation and complex corrections', 'Interpret business data, investigate complex exceptions and define correction logic using domain knowledge.', 'Advanced Excel skills; no coding knowledge'),
    ('Team managers', 'Team oversight', 'Monitor team activity and data throughput.', 'Operations and audit expertise; no coding knowledge'),
    ('CFOs, IT leaders and auditors', 'Oversight and assurance', 'Review outputs and reports, and perform spot checks.', 'Finance, technology or audit expertise, depending on role'),
]
cards = []
for (role, focus, task, skills), drawing in zip(profiles, profile_icons):
    cards.append(f'<article class="user-profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{drawing}</svg><div><h3>{role}</h3><p class="profile-focus">{focus}</p><p class="profile-skills">{skills}</p></div></article>')
slide('user-profiles', 'Context', 'Quantemplate user profiles', '<div class="user-profiles">' + ''.join(cards) + '</div>', 'profiles-slide')
problem = pick(src, r'<section aria-labelledby="problem-heading"', 'section')
statement = inner(pick(problem, r'<p class="display problem-statement"', 'p'))
slide('problem', 'Problem', statement, kind='section-slide problem-slide')
evidence = pick(src, r'<div class="card-modal" id="evidence-modal"', 'div')
evidence_body = inner(pick(evidence, r'<div class="card-modal-body', 'div'))
# Slide-specific edit: introductory paragraphs are replaced by a brief label.
evidence_list = pick(evidence_body, r'<ul class="evidence-list"', 'ul')
popup('problem-evidence', ['problem'], 'Evidence', statement, '<p>Evidence:</p>' + evidence_list)
full_video('original-report', 'Original validation report', pick(evidence, r'<video\b', 'video'), manual=True)
for id, filename in [('fixing-errors', 'ad-hoc-correction.png'), ('enterprise-scale', 'validation-report-passed.png')]:
    figure = next(element(evidence, m.start(), 'figure') for m in re.finditer('<figure', evidence) if filename in element(evidence, m.start(), 'figure'))
    caption = inner(pick(figure, r'<figcaption', 'figcaption'))
    full_image(id, clean(caption), re.search(r'<img\b[^>]*>', figure).group(), caption)
framing = pick(src, r'<div class="card-modal" id="framing-modal"', 'div')
for id, match in zip(['cell-editing', 'navigation'], re.finditer(r'<div class="framing-pair"', framing)):
    card = element(framing, match.start(), 'div')
    slide(id, 'Problem framing', '', f'<div class="evidence-card framing-card">{inner(card)}</div>', 'card-slide framing-slide')
    slides[-1] = slides[-1].replace('data-title="Problem framing"', f'data-title="{escape(clean(pick(card, r"<p class=\"framing-quote\"", "p")), quote=True)}"')

# Step 1, in exactly the article's order. No section contents slides.
workflow = pick(src, r'<section aria-labelledby="approach-heading"', 'section')
step_heading = pick(workflow, r'<p class="display problem-statement"', 'p')
step_title = inner(step_heading).replace(pick(step_heading, r'<span class="step-label"', 'span'), '')
slide('improved-workflow', 'Step 1', inner(step_heading), kind='section-slide step-title-slide')
workflow_intro = workflow[:workflow.index('<figure')]
workflow_paragraphs = re.findall(r'<p>.*?</p>', workflow_intro, re.S)
assert len(workflow_paragraphs) == 2, 'Review the workflow context popup split'
popup('workflow-context', ['improved-workflow'], 'Technical context', 'Technical context', workflow_paragraphs[0])
popup('workflow-priority', ['improved-workflow'], 'Why prioritise this?', 'Why prioritise this?', workflow_paragraphs[1])
svg = pick(workflow, r'<svg class="wf-diagram"', 'svg')
# The article hides the retired Feeds stage in page CSS. Carry that treatment
# inside the extracted SVG so both the live slide and overview inherit it.
for retired_id in ['wf-divider', 'wf-feeds']:
    assert f'id="{retired_id}"' in svg
    svg = svg.replace(f'id="{retired_id}"', f'id="{retired_id}" style="display: none;"')
slides.append(f'<section id="improved-workflow-graphic" class="full-graphic" data-title="{escape(clean(step_title))}"><div class="media-stage interactive-stage">{svg}</div></section>')
for id in ['iw-filter', 'iw-skip', 'iw-navigation']:
    block = decision(id)
    figure = pick(block, r'<figure class="figure kd-media"', 'figure')
    if '<video' in figure:
        slide(id, 'Step 1', heading(block), strap=strapline(block))
        full_video(id + '-video', clean(heading(block)), pick(figure, r'<video\b', 'video'))
    else:
        media_slide(id, 'Step 1', heading(block), re.search(r'<img\b[^>]*>', figure).group(), strapline(block))
    targets = [id]
    if id == 'iw-navigation':
        extra = re.findall(r'<img\b[^>]*>', block)[1]
        media_slide(id + '-2', 'Step 1', heading(block), extra, strapline(block))
        targets.append(id + '-2')
    decision_popups(id, targets)

step2 = pick(src, r'<div class="subsection" id="applying-corrections"', 'div')
step_heading = pick(step2, r'<h3 class="display kd-heading"', 'h3')
step_title = inner(step_heading).replace(pick(step_heading, r'<span class="step-label"', 'span'), '')
intro = inner(pick(step2, r'<p class="kd-intro"', 'p'))
slide('design-decisions', 'Step 2', inner(step_heading), f'<div class="step-intro"><p>{intro}</p></div>', kind='section-slide step-title-slide')
for id in ['kd-entering', 'kd-scope', 'kd-evidence', 'kd-feedback', 'impl-ordering']:
    block = decision(id)
    figure = pick(block, r'<figure class="figure kd-media"', 'figure')
    target = 'before-and-after' if id == 'kd-entering' else id
    if '<video' in figure:
        slide(target, 'Step 2', heading(block), strap=strapline(block))
        full_video(target + '-video', clean(heading(block)), pick(figure, r'<video\b', 'video'))
    elif id == 'impl-ordering':
        slide(target, 'Step 2', heading(block), strap=strapline(block))
        # Requested 01:03–01:23 excerpt; preserve the existing slide's stable ID.
        full_video(target + '-image', clean(heading(block)), '<video muted loop playsinline preload="metadata" poster="./media/validation-ordering-poster.jpg"><source src="./media/validation-ordering-excerpt.mp4" type="video/mp4"></video>')
    else:
        media_slide(target, 'Step 2', heading(block), re.search(r'<img\b[^>]*>', figure).group(), strapline(block))
    targets = [target]
    if id == 'kd-entering':
        for name, match in zip(['first-prototype', 'improved-design'], re.finditer(r'<figure>', block)):
            fig = element(block, match.start(), 'figure')
            caption = inner(pick(fig, r'<figcaption', 'figcaption'))
            media_slide(name, 'Step 2', caption, re.search(r'<img\b[^>]*>', fig).group())
            targets.append(name)
    decision_popups(id, targets)
# New annotated two-minute demo, selected from the page rather than hard-coded.
demo = src[src.index('<p class="eyebrow kd-eyebrow" id="video"'):]
slide('demo-title', 'Step 2', '2-minute demo', strap='Validation workflow walkthrough')
full_video('applying-corrections', '2-minute demo', pick(demo, r'<video\b', 'video'))

outcome = pick(src, r'<section aria-labelledby="outcome-heading"', 'section')
outcome_title = inner(pick(outcome, r'<p class="display problem-statement"', 'p'))
summary = pick(outcome, r'<ul class="outcome-cards"', 'ul')
slide('outcomes', 'Outcome', outcome_title, summary, 'outcomes-slide')
slide('outcome', 'Outcome', '', pick(outcome, r'<blockquote', 'blockquote'), 'quote-slide outcome-quote-slide')
chart = pick(outcome, r'<figure class="corrections-chart"', 'figure')
chart_title = pick(chart, r'<h3', 'h3')
chart_subtitle = pick(chart, r'<p class="corrections-chart-subtitle"', 'p')
chart = chart.replace(chart_title, '').replace(chart_subtitle, '')
slide('corrections-outcome', 'Outcome', inner(chart_title), chart, 'chart-slide', inner(chart_subtitle))
slides[-1] = slides[-1].replace('<h2>', '<h2 id="corrections-chart-title">', 1)

# Preserve the article's live Time, Trust, Truth component before Adoption rates.
radar = pick(src, r'<div id="ttt-component"', 'div')
radar_css = re.search(r'<style>(.*?)</style>', radar, re.S)[1]
radar_js = re.search(r'<script>(.*?)</script>', radar, re.S)[1]
radar = re.sub(r'<(?:style|script)>.*?</(?:style|script)>', '', radar, flags=re.S)
radar = radar.replace('id="ttt-component"', 'id="ttt-component" class="ttt-component"')
radar = radar.replace('id="ttt-chart"', 'id="ttt-chart" class="ttt-chart"')
# Class selectors also style overview copies, whose IDs are renamed by deck.js.
radar_css = radar_css.replace('#ttt-component', '.validation-deck .reveal .ttt-component').replace('#ttt-chart', '.ttt-chart')
(ROOT / 'slides/time-trust-truth.css').write_text('/* Extracted from the article by build-validation.py. */\n' + radar_css)
# Slide handles keep their keyboard interactions without advancing the deck.
radar_js = radar_js.replace("root.addEventListener('keydown',event=>{", "root.addEventListener('keydown',event=>{event.stopPropagation();")
# Animate only on the active slide, never underneath the overview or offscreen.
a = radar_js.index(' if(!reduce.matches){\n  if(typeof IntersectionObserver')
b = radar_js.index(" if(reduce.addEventListener)", a)
radar_js = radar_js[:a] + """ const slide=root.closest('section'), main=document.querySelector('main.reveal');
 function syncVisibility(){
  const visible=slide.classList.contains('present')&&!main.inert&&main.style.visibility!=='hidden'&&!document.hidden;
  if(!visible){cancelAnimationFrame(introRaf);introRaf=0;hideTooltip();}
  else if(!introDone&&!reduce.matches)playIntro();
 }
 new MutationObserver(syncVisibility).observe(main,{subtree:true,attributes:true,attributeFilter:['class','inert','style']});
 document.addEventListener('visibilitychange',syncVisibility);
 syncVisibility();
""" + radar_js[b:]
(ROOT / 'slides/time-trust-truth.js').write_text('// Extracted from the article by build-validation.py.\n' + radar_js)
slide('time-trust-truth', 'Outcome', '', radar, 'radar-slide')
slides[-1] = slides[-1].replace('data-title="Outcome"', 'data-title="Time, Trust, Truth"')

# Restore the approved adoption reflection verbatim from the original deck.
slide('adoption-rates', 'Reflections', 'Adoption rates',
      '<div class="reflection-copy"><p>Adoption has been uneven despite support in research. Some clients started immediately; others were reluctant to change a documented system-of-record workflow. This showed that interest in a feature doesn&rsquo;t necessarily indicate readiness to adopt it.</p></div>',
      'section-slide reflection-slide')

# Next steps now includes the requested supplier-sharing preview.
next_steps = pick(src, r'<section aria-labelledby="nextsteps-label"', 'section')
supplier = next_steps[:next_steps.index('<h3>Agentic suggestions</h3>')]
supplier_title = inner(pick(supplier, r'<h3', 'h3'))
# Retain the approved preview now that the article links to the sharing study.
supplier_figure = ('<figure><img src="media/correction-sharing-popup.png" width="2418" height="2216" '
                   'alt="The sharing popup: &lsquo;Share with 2 partners&rsquo;, listing each partner organisation with its submitters and the validation results selected to share, with a Review sharing button."></figure>')
media_slide('supplier-sharing-preview', 'Next steps', supplier_title, re.search(r'<img\b[^>]*>', supplier_figure).group())
popup('supplier-sharing-context', ['supplier-sharing-preview'], 'More', supplier_title, pick(supplier, r'<p>', 'p'))
agent = next_steps[next_steps.index('<h3>Agentic suggestions</h3>'):]
agent_title = 'Suggest corrections'  # Approved slide-specific wording.
prose = ''.join(re.findall(r'<p>.*?</p>', agent, re.S))
slide('reflections', 'Next steps', agent_title, f'<div class="reflection-copy">{prose}</div>', 'section-slide reflection-slide')
figure = pick(agent, r'<figure', 'figure')
media_slide('agentic-preview', 'Next steps', agent_title, re.search(r'<img\b[^>]*>', figure).group(), inner(pick(figure, r'<figcaption', 'figcaption')).replace('Proposed next step:', 'One solution:'))

page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Validation — slide mode</title><link rel="icon" href="../tdg-favicon.svg"><link rel="stylesheet" href="vendor/reveal/reveal.css"><link rel="stylesheet" href="deck.css?v=42"><link rel="stylesheet" href="details.css?v=22"><link rel="stylesheet" href="validation.css?v=8"><link rel="stylesheet" href="time-trust-truth.css?v=1"></head><body class="validation-deck">
<nav class="deck-toolbar" aria-label="Presentation controls"><a href="../case-studies/validation.html" class="back-link">↖ Case study</a><div><button id="overview-button" type="button" aria-label="Overview" title="Overview (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button><button id="fullscreen-button" type="button" aria-label="Full screen" title="Full screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="expand-icon" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path class="collapse-icon" d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/></svg></button></div></nav>
<main class="reveal"><div class="slides">''' + '\n'.join(slides) + '''</div></main>
<footer class="deck-footer"><span>Tom de Gay <span class="footer-divider">/</span> Validation</span><div><button id="prev-slide" aria-label="Previous slide">←</button><span id="slide-count" aria-live="polite"></span><button id="next-slide" aria-label="Next slide">→</button></div></footer>
''' + '\n'.join(dialogs) + '''
<noscript>This presentation needs JavaScript. <a href="../case-studies/validation.html">Read the case study</a>.</noscript>
<script src="vendor/reveal/reveal.js"></script><script src="mapping-flow.js?v=1"></script><script src="workflow.js?v=2"></script><script src="deck.js?v=43"></script><script src="details.js?v=23"></script><script src="time-trust-truth.js?v=1"></script></body></html>
'''
page = '\n'.join(line.rstrip() for line in page.splitlines()) + '\n'
(ROOT / 'slides/validation.html').write_text(page)
script = next(x for x in re.findall(r'<script[^>]*>(.*?)</script>', src, re.S) if "querySelectorAll('.wf-diagram')" in x)
script = script.replace('var STACK_BELOW = 600;', 'var STACK_BELOW = 0;')
# Article autoplay also needs slide/overview visibility, not only geometry.
script = script.replace('var HOLD = 3200, loopTimer = 0, inView = false;',
                        'var HOLD = 3200, loopTimer = 0, inView = false, intersects = false;')
old_observer = """        var autoIO = new IntersectionObserver(function (entries) {
          var e = entries[0];
          var now = e.intersectionRatio >= 0.6;
          if (now === inView) return;
          inView = now;
          if (inView) schedule(1200); else clearTimeout(loopTimer);
        }, { threshold: [0, 0.6] });
        autoIO.observe(svg);"""
new_observer = """        var main = document.querySelector('main.reveal');
        function syncSlideVisibility() {
          var now = intersects && !document.hidden && !main.inert &&
            main.style.visibility !== 'hidden' && svg.closest('section').classList.contains('present');
          if (now === inView) return;
          inView = now;
          if (inView) schedule(1200); else clearTimeout(loopTimer);
        }
        var autoIO = new IntersectionObserver(function (entries) {
          intersects = entries[0].intersectionRatio >= 0.6;
          syncSlideVisibility();
        }, { threshold: [0, 0.6] });
        autoIO.observe(svg);
        new MutationObserver(syncSlideVisibility).observe(main, {
          subtree: true, attributes: true, attributeFilter: ['class', 'inert', 'style']
        });
        document.addEventListener('visibilitychange', syncSlideVisibility);"""
assert old_observer in script, 'Article workflow visibility hook changed'
script = script.replace(old_observer, new_observer)
(ROOT / 'slides/workflow.js').write_text('// Copied from the case study by build-validation.py.\n' + script)
print(f'Built {len(slides)} slides, {len(dialogs)} popups, {page.count("<video ")} videos.')
for n, markup in enumerate(slides, 1):
    print(n, re.search(r'<section id="([^"]+)"', markup)[1], clean(re.search(r'data-title="([^"]*)"', markup)[1]))

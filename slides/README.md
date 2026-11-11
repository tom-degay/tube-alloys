# Validation slides

A separate Reveal.js deck using the site's Fakt fonts, colours and existing media.

For all future decks and edits, read [the reusable slide rules](AGENTS.md).
They record the approved content, typography, popup, media and navigation decisions.
Validation now follows the current case-study page in 34 slides.

Open `/slides/validation.html` on the local server. Vercel's clean URL is
`/slides/validation`. The case-study header has a **View slides** link.

## Content

The sequence is article hero and project details, Problem and supporting
material, **Step 1: Improve the workflow**, **Step 2: Fix errors where you find
them**, Outcome, Reflections (Adoption rates), and Next steps (Bringing suppliers into the loop and Suggest corrections).

The November 2026 revision removes key points, contents and mini-contents, the
supplier-sharing workflow/API request, and the retired adoption reflection.
The simple problem statement is the article's current headline. Source copy,
visuals, prototype captions, chart values and full supporting-card text are read
from the current page. The hero uses the article's current two-layer screenshot.
A 20-second excerpt (01:03–01:23) demonstrates correction ordering. A title slide introduces the full annotated two-minute video that closes Step 2. Sixteen popups preserve
explanations and research notes without overcrowding the slides.

## Controls

- Left/right arrows or the footer buttons advance slides.
- Overview (or Escape) displays a numbered grid fitted to the viewport.
- Full screen uses the browser's fullscreen mode where available.
- The workflow diagram retains its click and Enter/Space controls.
- Chart points show their values on hover, focus, click or Enter.
- Popups close with Escape, the close button or backdrop, returning focus to
  the opener. Arrow navigation then continues normally.
- Videos autoplay only on their active slide, except `original-report`: it starts
  at one second and waits for manual playback. Videos pause on leaving.
- Reduced-motion preferences disable slide transitions and SVG animation.

## Editing

`validation.html` is a ready-to-serve static page. There is no runtime fetch of
case-study content and no build required to view it. Regenerate with:

```sh
python3 slides/build-validation.py
```

Edit the generator rather than hand-editing the generated HTML. It selects the
current article's carousel items, evidence, framing, media and outcome chart.
It includes the supplier-sharing next-step preview, per Tom's latest request. The article's ordinary explanations are retained in More popups;
supporting research cards have their own labelled popups with complete prose.

`validation.css` contains only this deck's layout refinements. Shared navigation,
popup behaviour and typography remain in `deck.js` and `deck.css`. `workflow.js`
is extracted from the article with the wide layout retained on the fixed slide
canvas. `details.css` and `details.js` preserve the interactive outcome chart.

Reveal.js 5.2.1 is vendored in `vendor/reveal` under its included MIT license.
All fonts, videos, images and runtime files are served from this repository.

## Column mapping

`/slides/column-mapping.html` (production clean route `/slides/column-mapping`)
is a second deck with 25 slides, five full-card popups, a three-image lightbox
and three videos. It keeps
the homepage card artwork and wording, the article's seven sections, the schema
flow animation, three animated SVG diagrams, the interactive mapping tabs and
demo controls, and the model chart with its evaluation caveat. The source article
has the matching View slides entry point.

Regenerate its content with `python3 slides/build-column-mapping.py`. This reads
the article and homepage plus Validation's navigation chrome. The study-specific
CSS and SVG controls live in `column-mapping.css` and `column-mapping.js`; the
schema-flow animation is extracted into `mapping-flow.js`. Only the small
object-to-static-poster addition to `deck.js` is shared with Validation.

`slides/media` contains static SVG overview posters generated from the source
artwork and a screenshot of the interactive tabs' initial state. Live slides use
the original SVG documents; overview thumbnails do not create interactive copies.
Keep the tab screenshot up to date if the source demo's initial appearance changes.

# Validation slides

A separate Reveal.js deck using the site's Fakt fonts, colours and existing media.

For all future decks and edits, read [the reusable slide rules](AGENTS.md).
They record the approved content, typography, popup, media and navigation decisions.
The full case study is presented in 43 slides through Reflections.

Open `/slides/validation.html` on the local server. Vercel's clean URL is
`/slides/validation`. The case-study header has a **View slides** link.

## Content

The sequence begins with the homepage Validation card, key points, contents and
project metadata, followed by Problem, Approach, Design decisions, Sharing,
Outcome and Reflections. It preserves the approved presentation edits and uses
source headings, straplines, card text, quote, figures and reflection text
verbatim. Ordinary explanatory paragraphs are omitted in favour of visuals.
Four cards remain on their own slides. Nine supporting cards open as popups
from their labelled icons, with shared cards accessible from each relevant slide.

The deck reuses the original images, five videos, two interactive workflow SVGs,
the animated submission mockup and the interactive corrections chart. The main
corrections demo closes Design decisions. The sharing demo closes Sharing.

## Controls

- Left/right arrows or the footer buttons advance slides.
- Contents jumps to the outline; section outlines link to their slides.
- Overview (or Escape) displays a numbered grid fitted to the viewport.
- Full screen uses the browser's fullscreen mode where available.
- Workflow diagrams retain their click and Enter/Space controls.
- Chart points show their values on hover, focus, click or Enter.
- Supporting card popups fade in over 0.3 seconds. Escape, the close button or
  clicking the backdrop closes them and returns focus to the opening button.
- Videos autoplay only on the active slide, except slide 6: it starts at one
  second and waits for manual playback. Videos pause when leaving the slide.
- Reduced-motion preferences disable slide transitions and SVG animation.

## Editing

`validation.html` is a ready-to-serve static page. There is no runtime fetch of
case-study content and no build required to view it. To refresh the extracted
content after editing the case study:

```sh
python3 slides/build-validation.py
```

The generator defines the slide sequence and preserves the requested wording
changes in the opening slides. Edit layout and presentation behaviour in
`deck.css` and `deck.js`. `workflow.js` is extracted from the case study with the
wide layout retained on the fixed slide canvas. `details.css` and `details.js`
adapt the chart and submission animation to slide mode.

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

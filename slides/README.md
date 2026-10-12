# Validation slide prototype

A separate Reveal.js deck using the site's Fakt fonts, colours and existing media.
The prototype stops at the end of **Design decisions → Show before and after**.

Open `/slides/validation.html` on the local server. Vercel's clean URL is
`/slides/validation`. The case-study header has a **View slides** link.

## Content

21 slides: splash, key points, contents, project metadata, Problem, Approach,
and the first Design decisions subsection. All seven evidence/framing cards in
this range retain their complete text, one card per slide. The images embedded
in the final design-validation card are expanded into separate slides.

Ordinary explanatory body paragraphs are omitted, except the introductory
Approach sentence used as a strapline. The Problem blockquote is retained in full.
The two source videos, five screenshot assets and interactive workflow SVG are
reused without changing the original media.

## Controls

- Left/right arrows or the footer buttons advance slides.
- Contents jumps to the outline; its section links navigate within the deck.
- Overview (or Escape) displays the slide grid.
- Full screen uses the browser's fullscreen mode where available.
- The workflow diagram retains its click and Enter/Space controls.
- Videos have playback controls; only the current slide autoplays. Reduced-motion
  preferences disable autoplay and slide transitions.

## Editing

`validation.html` is a ready-to-serve static page. There is no runtime fetch of
case-study content and no build required to view it. To refresh the extracted
copy/cards/diagram after editing the case study:

```sh
python3 slides/build-validation.py
```

Edit layout and presentation behaviour in `deck.css` and `deck.js`.
`workflow.js` is extracted from the case study by the generator, with the wide
layout retained on the fixed slide canvas. The generator also defines the slide
sequence and short media headings.

Reveal.js 5.2.1 is vendored in `vendor/reveal` under its included MIT license.
All fonts, videos, images and runtime files are served from this repository.

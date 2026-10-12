# Tom de Gay — case-study slide template

This records Tom's approved presentation decisions from the Validation deck work,
through 12 October 2026. Read it before creating or changing a case-study deck.
The working visual reference is `validation.html`, with `deck.css`, `deck.js`,
`details.css`, `details.js` and `workflow.js`. Use the latest approved version of
those files; the rules below explain the intent behind them.

## Content: preserve the author's words

- **Do not rewrite anything** unless Tom explicitly requests a wording change.
  Extract the approved case-study headings, straplines, blockquotes, card text,
  captions and media. Do not invent bridging copy, claims or supporting evidence.
- Keep slides sparse: normally a headline and strapline, plus any text called out
  as a blockquote. Leave ordinary explanatory paragraphs in the article. Include
  the full wording of supporting cards in popups, not a shortened summary.
- Preserve quotes, attributions, figures and qualifications exactly. Selecting
  which source elements to show is different from rewriting their contents.
- Preserve source labels and icons: Evidence, Design validation, Design
  exploration, Framing and Engineering constraint are distinct. Do not relabel
  design exploration as evidence or turn intent into a proven outcome.
- Use single quotation marks when adding requested copy. Do not normalise or
  rewrite quoted source text merely to apply this preference.
- Explicit slide-specific wording approved by Tom takes precedence over the
  source article for that slide. Retain those overrides when regenerating.

## Sequence and pacing

1. Splash: use the **exact same image, title and strapline as the homepage preview
   card** for that case study. Make the image large, use a smaller headline beside
   it, and include the case-study icon and label. No keyword chips or extra
   'Tom de Gay / Product design' credit in the splash content.
2. Key points: large, light/regular text with the site's green arrow bullets.
3. Contents: the main section titles only. For six sections use two columns of
   three, ordered down the first column then down the second. No nested list of
   individual design decisions here.
4. Project metadata: team, role, domain, users, timeframe as available in the
   source. Use light/regular Fakt (400) for the detail values. Remove terminal
   full stops. Keep each short timeframe entry, e.g. ‘2 months / v1 release’,
   on one line; preserve deliberate breaks between separate entries.
5. Problem statement, then the case study's remaining sections in source order.

- Use section mini-contents where needed. The established template places a large
  page title on the left and a **single column** of linked subsection titles on
  the right. Titles in all contents lists are regular/light, not bold.
- Keep section label and page title separate: e.g. '03 / Design decisions' above
  a page titled 'Applying corrections'. Do not repeat the section label as the
  page title when a more specific source title exists.
- Put broad workflow diagrams on their own full-slide page. A short text slide
  can precede a separate full-slide detail image or video.
- Put the overall product demo at the end of the design-decisions sequence; put
  the sharing demo at the end of Sharing when those sections exist.
- Do not add a Resources section. Do not copy deleted or redundant slides back in.
- Do not hard-code the Validation deck's 43-slide count into a new deck.

## Typography and visual system

- Match the website: Fakt Blond for regular text (400), Fakt SemiBold for headings
  (600); IBM Plex Mono for small uppercase section and card labels.
- **No letter spacing on Fakt text**, including headings, body, buttons and
  contents. The existing 2px tracking on mono labels is intentional and separate.
- Use big bold headlines, but fit the available space. Reduce an unusually long
  heading slightly rather than letting it crowd the image or rewriting it.
- **Avoid orphans throughout**: headings, straplines, bullets, quotes, popups and
  body copy. Use `text-wrap: balance` for headings/short display text and `pretty`
  for prose, then inspect visually. Adjust width, size or deliberate line breaks
  without changing the words. Do not shrink all typography to solve one slide.
- Background: `#131313`. Primary text `#eee`, secondary/strapline/reflection text
  around `#aaa`; green accent `#00d8aa`. Keep the website's neutral hierarchy.
- Big text does not always mean bold: key-point bullets, contents titles, client
  quotes and reflective body copy use the lighter weight.
- Slide canvas: 1280 × 720 (16:9), scaled to the viewport. Toolbar/footer remain
  outside it. Keep the presentation layout on small screens; don't turn it into
  a scrolling article.
- Consistent section eyebrow position: **54px from the left, 38px from the top**
  of the slide canvas, 17px mono type. It must not inherit giant body text rules.
- Keep straplines close to their heading (18px top margin in the reference).
  Apply this consistently to every text/section slide, not one slide at a time.
- Framing-the-problem cards share a common top edge: 150px on the reference
  canvas. Do not vertically centre each differently according to its height.
- Useful reference sizes, not a mandate to force copy to fit: headings 57px;
  side-by-side headings 56px; long problem headings 50px; straplines 29–30px;
  key points 40px; side-by-side contents 36px. Splash heading 58px, strapline 27px.

## Images, SVGs and video

- **Round every slide image's visible corners**, including the splash,
  full-slide images, SVG image crops and diagrams. The current standard is 16px
  on the 1280px canvas. This applies to artwork, not tiny decorative icons.
- Apply clipping to the actual image bounds, not a large `object-fit: contain`
  box whose empty margins leave the real image square. Preserve aspect ratio.
- Make relevant details large. For dialogs/popups shown within product screenshots,
  crop into the actual popup rather than showing a tiny full application window.
  Reuse the same heading-left / image-right template for related screenshots.
- Keep inline SVGs and their interactions live. Preserve chart tooltips, diagram
  tabs, click/keyboard controls and SVG animation; don't flatten them to PNGs.
- Animation on the splash: play on entry, hold the completed artwork for **five
  seconds**, then replay. Repeat only while the splash is active; stop on exit
  or overview. Respect reduced-motion preferences. In Validation this replays
  both the pie/donut animation and the staggered top-to-bottom rule fade.
- Default video treatment: autoplay **on entering its slide**, muted, looping,
  inline, with usable controls. Pause when leaving. Do not play overview copies.
- Full-screen video slides show the video itself without extra headings.
- Honour individual playback/start-time exceptions; don't propagate an exception
  to every video. See the Validation-specific notes below.

## Supporting cards become popups

- Default supporting Evidence, Design validation, Design exploration and
  Engineering constraint cards to **popups on the relevant image/text slide**.
  Place a clickable source icon + label below the slide heading/strapline.
- Include the **whole card's text**: all paragraphs, bullets and relevant heading
  or strapline. Do not stop at the label or omit the paragraph explaining the
  revised design. Images already given their own slide need not be duplicated
  inside the popup.
- When one card supports two screenshots, expose the same popup from both slides.
  Remove the separate supporting-card slide rather than keeping duplicate text.
- Framing cards may remain central slide content, one card per slide with full
  text. Validation also retains one explicitly approved standalone Evidence card.
  Follow specific user placement choices rather than automatically moving every
  visible card into a popup.
- Popup design: dark `#212121` card, 16px radius, subtle `#444` border; width
  `min(840px, calc(100vw - 40px))`, bounded by viewport height and scrollable.
  Dark translucent blurred backdrop; **0.3s opening fade**, disabled for reduced
  motion. Desktop padding 38px; heading 38px, strapline 22px, body 25px/1.45.
  Narrow screens use padding 30px 24px and body 21px.
- Opening must **not put the visible focus ring on the X**. Focus a noninteractive
  heading (`tabindex=-1`, autofocus), with no visible outline on that heading.
  Keep genuine keyboard focus indication on interactive controls.
- Close with X, backdrop click or Escape. Return focus to the actual opener.
  After closing, Left/Right should advance slides and blur the trigger, so the
  trigger doesn't acquire a distracting ring or swallow arrow navigation.
  Enter/Space on the trigger still opens it. While a popup is open, slideshow
  keyboard shortcuts must not navigate underneath it.
- Safari lesson: render dialogs outside Reveal's slide/scaled tree, with the card
  in normal block flow, height:auto, max-height:none. Percentage height caps on a
  flex card made the popup collapse to its label and padding. Check full content
  is actually visible, especially when a user reports Safari problems.

## Client quote cards

- Match the case-study outcome quote: a rounded dark gradient card
  (`#1a1a1a` to `#2c2c2c`), **large muted opening quotation mark**, large light
  Fakt text and a smaller muted citation. No green left border on this card.
- Current slide implementation: 10px card radius, padding 30px 38px, quote
  38px/1.3 at weight 400 and white .82; quote mark 140px at weight 600 and white
  .22; citation 21px/1.4, regular, `#aaa`. Keep the citation with its quote.

## Navigation and overview

- Toolbar uses icons for Contents, Overview and Full screen, with accessible
  labels/tooltips. Include a link back to the article. Footer includes previous /
  next arrows and current / total slide numbers.
- Overview is a **numbered grid of all slides that fits the page**, on `#131313`.
  Derive rows, columns and thumbnail scale from the available viewport and slide
  count. Keep thumbnails opaque/dark; no transparent stacked slide clutter.
  Show the active slide and make each thumbnail selectable.
- Overview previews must not autoplay videos, run SVG animations, duplicate DOM
  IDs or make hidden controls focusable. Keep the native SVG references valid.
- Preserve arrow-key navigation, Escape for overview and fullscreen where
  supported. Embedded interactive SVGs retain their own Enter/Space behaviour.

## Article entry point

- 'View slides' button goes at the **top right of the article content block**.
  Its right edge must always align with the right endpoint of the horizontal
  rule below, including at responsive widths; not the viewport or side rail.
- Use the Overview grid icon to the left of the text and the same styling as
  'Download CV': dark fill/border, 8px radius, Fakt SemiBold, 16px muted icon,
  established button padding and label baseline alignment.
- Remove keyword chips from the case-study page when adding this presentation
  entry treatment, as requested for Validation. Don't remove them site-wide.

## Validation-specific decisions: preserve, don't generalise blindly

- Stable IDs identify slides; numbers below describe the approved 43-slide deck.
  Recalculate positions before interpreting future requests by slide number.
- Splash `splash`: break the source strapline after 'audit trail.'
- `problem` (5): three separate paragraphs, exactly:
  'You can see exactly where the data is wrong.' / 'Fixing it means leaving the
  report, writing a formula in a pipeline, or emailing the supplier and waiting.' /
  'Now imagine working through hundreds of checks every month.'
- `original-report` (6): full-slide video, start at **1 second**, **manual** play.
  This later instruction supersedes the earlier request for every video to autoplay.
- `first-prototype` / `improved-design` (17/18): 'Fields don’t look clickable' /
  'Clearer text entry affordances' are the approved display messages. Keep their
  Design validation icon/label and shared complete source-card popup.
- `kd-scope` (19): enlarged crop focused on the product popup plus its complete
  Design validation popup. The temporary removal of that trigger was reversed.
- `kd-evidence` (20): the same side-by-side image template.
- `impl-ordering` (23): text + Engineering constraint popup; the image has its own
  full-slide page immediately afterwards.
- `design-decisions`, `improved-workflow`, `sharing` (15/25/33): all use the
  left-title / single-right-column contents template. The first is titled
  'Applying corrections' and does not list 'Improved workflow' in its five items.
- `iw-navigation` / `iw-navigation-2` (30/31): matching side-by-side layouts.
- `outcome` (40): client quote card styling described above, exact source quote.
- `reflections` / `agentic-preview` (42/43): secondary main text grey `#aaa`;
  section eyebrows remain the normal 17px size.
- Four cards remain inline: `siloed`, `cell-editing`, `navigation`,
  `supplier-feedback`. Nine distinct popup cards serve twelve triggers:

| Popup | Slides that open it |
| --- | --- |
| correction-evidence-popup | fixing-errors |
| scale-evidence-popup | enterprise-scale |
| entry-validation | first-prototype, improved-design |
| scope-validation | kd-scope |
| ordering-constraint | impl-ordering |
| navigation-validation | iw-skip |
| sharing-evidence | sh-choose-2, sh-choose-3 |
| submission-exploration | sh-submit |
| progress-exploration | sh-progress, sh-progress-3 |

## Implementation and review

- This is a browser-based Reveal.js deck in the existing static portfolio repo,
  **not a PowerPoint, Google Slides or new Sites project**. Reuse its shared theme
  and controls. Preserve local fonts/assets and the no-build viewing workflow.
- `build-validation.py` is the canonical content/structure generator; do not make
  HTML-only edits that regeneration erases. Give another case study its own source
  mapping/generator rather than overwriting Validation's one.
- Keep article content as the reference, with deliberate overrides explicit in
  the generator. Use stable slide IDs in transformations, links and popup targets.
  Map current numbers to IDs before removing/reordering slides in a batch.
- Version changed CSS/JS references so Safari and other browsers load updates.
  Verify the actual served file if a preview looks stale.
- Before delivery: compare extracted wording and complete popup contents with the
  source; inspect the splash, overview, long headlines, image crops, quote and
  reflections; check no orphans/clipping; exercise popup close → arrow navigation,
  video entry/exit and SVG controls. Check every image's actual visible corners.
- Shared CSS/JS changes affect existing decks: scope a study-specific exception
  and check the other decks before changing their appearance or behaviour.
- Creating/editing a deck doesn't itself authorise publishing. Follow Tom's
  current instruction for deployment; preserve unrelated repository changes.

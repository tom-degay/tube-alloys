# Image Insight session prototype

Open `/prototypes/image-insight/` through the site's static server. From the
repository root, `python3 -m http.server 8765 --bind 127.0.0.1` serves it at
http://127.0.0.1:8765/prototypes/image-insight/.

The complete flow is: create a session → expanded settings with a dated default name → choose a question →
select board images → expand the session → discuss an image and add notes →
review and complete the session. New sessions default to “Session [date]” using
the current London date. Continue in settings opens the nine-question selector;
Continue in that selector starts image selection. Unfinished setup resumes after reload.

The grid is the existing `case-studies/media/image-insight-grid-interactive.html`
component, with an opt-in `?mode=session&hints=off` view. This mode provides a
scrolling board and selection messages to the same-origin parent; the normal
case-study crop retains its existing behaviour. The parent validates messages
against the frame and the frame's image catalogue.

`icons.js` and `icons.css` reuse the artwork and animations from
`image-insight-icons-interactive.svg`. All photographs and fonts are local.
There is no build step or third-party dependency.

The session-only `session-library.json` offers 301 curated photographs, stored as
1,200 × 1,200 WebP files alongside the original grid images. Source photographs
smaller than that were excluded. Photographer names, original dimensions and
individual Unsplash links are recorded in `session-photo-credits.csv` in that
folder; the photographs use the Unsplash license.

Each gallery remembers its displayed images for the lifetime of the page.
Refresh draws from unseen photos first; changing galleries preserves progress,
and undo restores the previous grid without forgetting newly seen photos.
Every gallery supports an initial grid of 30 plus three refreshes without a
repeat. A new cycle begins only once its remaining unseen images cannot fill
the grid. Only displayed images load, rather than downloading the full library.

Drafts and up to 12 previous sessions are saved in this browser's localStorage
under `image-insight-session-prototype-v1`. The folder button reopens them.
No account, server storage or cloud sync is included.

The production route is `/case-studies/image-insight/prototype`, rewritten to
this directory's entry point. Root-relative asset URLs keep both routes working.
It has no navigation links or sitemap entry. A robots meta tag and Vercel
`X-Robots-Tag` headers exclude the prototype and its original asset route from
search indexing. Crawlers may fetch the page so they can read that instruction.

Dialogs support keyboard navigation and Escape. Reduced-motion preferences
disable the panel/card animations. On small screens the sidebar becomes a
compact tray, with the expanded session and dialogs filling the available space.
Settings replace the sidebar content, with the cross or Done returning to the
session. Dialogs initially focus their heading; pointer navigation suppresses
button outlines, while keyboard focus remains visible across the board iframe.

Manually checked at desktop and phone sizes: question selection; adding images;
grid count, themes, refresh and undo; expand/collapse; per-image notes; review
name validation, summary and actions; completion; draft restoration after reload.
Refinements checked at 1440 × 1000 and 390 × 844: 120 distinct cards across four
batches in each gallery; refresh/undo/refresh; settings and discussion focus;
keyboard focus; review focus; and vertical centring with one image.

### Art direction — October 2026

The prototype library is selected for atmospheric light, considered composition,
texture and visual ambiguity, aiming for a photography art book rather than
a generic stock library. 85 weaker images (including the pub interior) are
excluded; their files and attribution remain available for reference.
`session-curation.json` records the exclusions. `session-library.json` defines
the approved collections and deliberate opening sequences. Shared case-study
preview images are unaffected.

The Standard gallery has 301 photographs; Nature 146, Leisure 127 and Urban 126.
Some images belong to multiple appropriate themes. Every gallery still has
at least 120 distinct images for an initial grid of 30 and three refreshes.

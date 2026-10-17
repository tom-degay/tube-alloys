/* ==================================================================
   Case study, second-generation treatment: behaviour.

   1. Carousels (.kd-reel): drag, snap, glide, page dots, a neighbour
      click brings it in.
   2. Modals: side cards (.side-card[aria-controls]) open their
      .card-modal; carousel "More" opens the slide in the shared
      #kd-modal with previous / next.

   Shared copy of the scripts first built inline on validation.html.
   Load with defer BEFORE /lightbox.js, so its Escape / Tab handling
   registers first and can defer to an open lightbox.
   ================================================================== */

/* Carousel: the dial follows the actual scroll position; a mouse
   can drag the strip; clicking a screen that is not the current one
   brings it in rather than opening it full size. Moves made here glide
   on a gentle ease-in-out rather than the browser's brisk smooth
   scroll, with snapping paused until they land. */
(function () {
  document.querySelectorAll(".kd-reel").forEach(function (reel) {
  var track = reel.querySelector(".kd-reel-track");
  var slides = Array.prototype.slice.call(track.querySelectorAll(".kd-slide"));
  var targetIndex = null;
  // iOS-style page dots: one per slide, the current one lit; a dot
  // brings its slide in
  var dotsEl = reel.querySelector('.kd-dots');
  dotsEl.setAttribute('role', 'group');
  dotsEl.setAttribute('aria-label', track.getAttribute('aria-label'));
  var dots = slides.map(function (slide, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kd-dot';
    b.setAttribute('aria-label', 'Slide ' + (n + 1) + ' of ' + slides.length);
    b.setAttribute('aria-controls', track.id);
    b.addEventListener('click', function () { go(n); });
    dotsEl.appendChild(b);
    return b;
  });
  dotsEl.hidden = false;
  var dial = {
    render: function (phase, i) {
      dots.forEach(function (d, n) {
        d.classList.toggle('is-current', n === i);
        if (n === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
  };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function centreOf(i) {
    return slides[i].offsetLeft + slides[i].offsetWidth / 2 - track.clientWidth / 2;
  }

  function current() {
    var best = 0, dist = Infinity;
    slides.forEach(function (s, i) {
      var d = Math.abs(centreOf(i) - track.scrollLeft);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  var glide = null;
  function stopGlide() {
    targetIndex = null;
    if (!glide) return;
    cancelAnimationFrame(glide);
    glide = null;
    track.classList.remove("is-gliding");
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    stopGlide();
    targetIndex = i;
    var from = track.scrollLeft, to = centreOf(i), dist = to - from;
    if (reduce || Math.abs(dist) < 1) { track.scrollLeft = to; targetIndex = null; paint(); return; }
    var dur = Math.min(1100, Math.max(650, 450 + Math.abs(dist) * 0.25)), t0 = null;
    track.classList.add("is-gliding");
    function step(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      track.scrollLeft = from + dist * ease(t);
      paint();
      if (t < 1) glide = requestAnimationFrame(step);
      else { glide = null; targetIndex = null; track.classList.remove("is-gliding"); paint(); }
    }
    glide = requestAnimationFrame(step);
  }

  // a hand on the strip takes over from a glide in progress
  ["wheel", "touchstart"].forEach(function (type) {
    track.addEventListener(type, stopGlide, { passive: true });
  });

  var ticking = false;
  function paint() {
    ticking = false;
    var i = current();
    slides.forEach(function (s, si) { s.classList.toggle("is-current", si === i); });
    var phase = 0;
    for (var n = 0; n < slides.length - 1; n++) {
      var left = centreOf(n), right = centreOf(n + 1);
      if (track.scrollLeft >= right) { phase = n + 1; continue; }
      if (track.scrollLeft > left && right > left) phase = n + (track.scrollLeft - left) / (right - left);
      break;
    }
    dial.render(phase, i);
  }
  track.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(paint); }
  }, { passive: true });

  window.addEventListener("resize", paint);
  paint();

  var drag = null, moved = false;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    stopGlide();
    drag = { x: e.clientX, left: track.scrollLeft, from: current() };
    moved = false;
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) < 6) return;
    if (!moved) { moved = true; track.classList.add("is-dragging"); }
    track.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, from = drag.from;
    drag = null;
    if (!moved) return;
    // the click that follows a drag is swallowed below; clear the flag
    // afterwards in case the drag ended off the strip and none comes
    setTimeout(function () { moved = false; }, 0);
    // a deliberate flick moves one screen even if it fell short of halfway
    var to = current();
    if (to === from && Math.abs(dx) > 60) to = from + (dx < 0 ? 1 : -1);
    go(to);
    track.classList.remove("is-dragging");
  });

  // capture phase, so it runs before the lightbox's own click handler
  track.addEventListener("click", function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    var slide = e.target.closest(".kd-slide");
    if (!slide) return;
    var i = slides.indexOf(slide);
    if (i !== current()) { e.preventDefault(); e.stopPropagation(); go(i); }
  }, true);
  });
})();

  

/* Problem's Evidence and Problem framing cards open their content in a
   modal: Escape, the close button or a click on the backdrop closes it;
   focus stays inside while open and returns to the card after. Leaves
   Escape and Tab to the lightbox while one of its pictures is open. */
(function () {
  var opener = null, open = null;
  function lightboxOpen() { var lb = document.getElementById('lightbox'); return lb && lb.classList.contains('is-open'); }
  function focusables(m) {
    return Array.prototype.slice.call(m.querySelectorAll('button, [href], video[controls], [tabindex]:not([tabindex="-1"])')).filter(function (el) { return el.offsetParent !== null; });
  }
  function fades(m) {
    var b = m.querySelector('.card-modal-body');
    var rest = b.scrollHeight - b.clientHeight - b.scrollTop;
    b.style.setProperty('--fade-top', b.scrollTop > 2 ? '48px' : '0px');
    b.style.setProperty('--fade-bottom', rest > 2 ? '48px' : '0px');
  }
  document.querySelectorAll('.card-modal-body').forEach(function (b) {
    b.addEventListener('scroll', function () { fades(b.closest('.card-modal')); }, { passive: true });
    // pictures arriving change how far there is to scroll
    b.querySelectorAll('img').forEach(function (el) { el.addEventListener('load', function () { if (open) fades(open); }); });
    b.querySelectorAll('video').forEach(function (el) { el.addEventListener('loadedmetadata', function () { if (open) fades(open); }); });
  });
  window.addEventListener('resize', function () { if (open) fades(open); });
  function show(m, from) {
    opener = from; open = m;
    m.hidden = false;
    m.querySelector('.card-modal-body').scrollTop = 0;
    fades(m);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { m.classList.add('is-open'); });
    m.querySelector('.card-modal-close').focus();
  }
  // a slide whose picture is a live, interactive piece (not an image or a
  // video) lends it to the modal while open; this puts it back
  var borrowed = null;
  function giveBack() {
    if (!borrowed) return;
    borrowed.ph.parentNode.replaceChild(borrowed.el, borrowed.ph);
    borrowed = null;
  }
  function hide() {
    if (!open) return;
    giveBack();
    var m = open; open = null;
    m.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    setTimeout(function () { if (!m.classList.contains('is-open')) m.hidden = true; }, 200);
    if (opener) opener.focus();
  }
  document.querySelectorAll('.side-card[aria-controls]').forEach(function (b) {
    var m = document.getElementById(b.getAttribute('aria-controls'));
    if (!m) return;
    b.addEventListener('click', function () { show(m, b); });
    m.querySelector('.card-modal-close').addEventListener('click', hide);
    m.addEventListener('click', function (e) { if (e.target === m) hide(); });
  });
  // carousel slides: More opens the slide in the shared modal, with
  // its picture and full text
  var kd = document.getElementById('kd-modal');
  if (kd) {
    var kdBody = kd.querySelector('.card-modal-body');
    kd.querySelector('.card-modal-close').addEventListener('click', hide);
    kd.addEventListener('click', function (e) { if (e.target === kd) hide(); });
    var kdSlide = null;
    // number above the headline only when the two won't share a line
    function stackTitle() {
      var t = kd.querySelector('.kd-modal-title');
      t.classList.remove('is-stacked');
      var lh = parseFloat(getComputedStyle(t).lineHeight) || 30;
      if (t.getBoundingClientRect().height > lh * 1.5) t.classList.add('is-stacked');
    }
    window.addEventListener('resize', function () { if (open === kd) stackTitle(); });
    function fill(slide) {
      kdSlide = slide;
      kd.querySelector('.kd-modal-num').textContent = (slide.querySelector('.kd-num') || {}).textContent || '';
      kd.querySelector('.kd-modal-name').innerHTML = slide.querySelector('.kd-title').innerHTML;
      stackTitle();
      kdBody.innerHTML = '';
      var strap = slide.querySelector('.kd-strap');
      if (strap) { var sp = document.createElement('p'); sp.className = 'kd-modal-strap'; sp.innerHTML = strap.innerHTML; kdBody.appendChild(sp); }
      var media = slide.querySelector('.kd-media');
      var fig = document.createElement('figure');
      fig.className = 'kd-modal-media';
      giveBack();
      var src = media.querySelector(':scope > img, video');
      if (!src) {
        var live = Array.prototype.find.call(media.children, function (c) { return c.tagName !== 'FIGCAPTION'; });
        var ph = document.createComment('lent to the modal');
        live.parentNode.replaceChild(ph, live);
        borrowed = { el: live, ph: ph };
        var lframe = document.createElement('div');
        lframe.className = 'figure-portrait-frame kd-modal-live';
        lframe.appendChild(live);
        fig.appendChild(lframe);
        kdBody.appendChild(fig);
        src = null;
      }
      var copy = src ? src.cloneNode(true) : document.createElement('span');
      if (src) {
      copy.removeAttribute('loading');
      // a slide can show a tighter crop than its expanded view: the
      // modal swaps in the full picture or video when one is named
      // (not on phones, where the tight crop reads better)
      if (copy.dataset && copy.dataset.modalSrc && !window.matchMedia('(max-width: 640px)').matches) {
        if (copy.tagName === 'VIDEO') {
          var so = copy.querySelector('source');
          if (so) so.src = copy.dataset.modalSrc; else copy.src = copy.dataset.modalSrc;
          if (copy.dataset.modalPoster) copy.poster = copy.dataset.modalPoster;
          copy.load();
        } else copy.src = copy.dataset.modalSrc;
      }
      copy.removeAttribute('tabindex');
      copy.removeAttribute('role');
      if (copy.tagName === 'VIDEO') { copy.muted = true; copy.setAttribute('controls', ''); copy.addEventListener('loadedmetadata', function () { fades(kd); }); }
      else copy.addEventListener('load', function () { fades(kd); });
      // framed, as the page's other figures
      var frame = document.createElement('div');
      frame.className = 'figure-portrait-frame';
      frame.appendChild(copy);
      fig.appendChild(frame);
      kdBody.appendChild(fig);
      }
      var more = slide.querySelector('.kd-more-body');
      if (more) Array.prototype.forEach.call(more.children, function (c) { kdBody.appendChild(c.cloneNode(true)); });
      // cards inside the modal are shown open, with no toggle
      kdBody.querySelectorAll('details').forEach(function (d) {
        d.open = true;
        d.classList.add('is-static');
        var sm = d.querySelector(':scope > summary');
        if (sm) { sm.setAttribute('tabindex', '-1'); sm.addEventListener('click', function (ev) { ev.preventDefault(); }); }
      });
      kdBody.querySelectorAll('img').forEach(function (im) { im.removeAttribute('loading'); im.addEventListener('load', function () { fades(kd); }); });
      if (copy.tagName === 'VIDEO') { var pl = copy.play(); if (pl && pl.catch) pl.catch(function () {}); }
      kdBody.scrollTop = 0;
      fades(kd);
      var all = Array.prototype.slice.call(slide.parentNode.querySelectorAll('.kd-slide'));
      var at = all.indexOf(slide);
      kd.querySelector('.kd-modal-step[data-step="-1"]').disabled = at <= 0;
      kd.querySelector('.kd-modal-step[data-step="1"]').disabled = at >= all.length - 1;
    }
    // < > step through the same carousel, moving the strip too, so
    // closing lands on the slide last shown
    function step(dir) {
      if (!kdSlide) return;
      var all = Array.prototype.slice.call(kdSlide.parentNode.querySelectorAll('.kd-slide'));
      var to = all[all.indexOf(kdSlide) + dir];
      if (!to) return;
      var dots = kdSlide.closest('.kd-reel').querySelectorAll('.kd-dot');
      if (dots[all.indexOf(to)]) dots[all.indexOf(to)].click();
      fill(to);
      opener = to.querySelector('.kd-more > summary');
    }
    kd.querySelectorAll('.kd-modal-step').forEach(function (b) {
      b.addEventListener('click', function () { step(+b.getAttribute('data-step')); });
    });
    kd.addEventListener('keydown', function (e) {
      if (lightboxOpen() || e.target.tagName === 'VIDEO') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    document.querySelectorAll('.kd-more > summary').forEach(function (sum) {
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var slide = sum.closest('.kd-slide');
        if (!slide.classList.contains('is-current')) return;
        show(kd, sum);
        fill(slide);
      });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!open || lightboxOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
    else if (e.key === 'Tab') {
      var f = focusables(open);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !open.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !open.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });
})();
  

/* Marker-pen highlights: one ink stroke per line of each .marker, placed
   from the phrase's own line boxes relative to its paragraph; redrawn when
   the paragraph changes size. Seeded from the words, so each stroke is
   always the same. */
(function () {
  var marks = Array.prototype.slice.call(document.querySelectorAll('.marker'));
  if (!marks.length) return;
  function seedOf(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
  function draw(m) {
    var host = m.parentElement;
    host.classList.add('marker-host');
    host.querySelectorAll('.marker-ink[data-for="' + m.dataset.mk + '"]').forEach(function (n) { n.remove(); });
    var hr = host.getBoundingClientRect();
    if (!hr.width) return;
    var seed = seedOf(m.textContent);
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    Array.prototype.forEach.call(m.getClientRects(), function (r) {
      if (r.width < 2) return;
      var h = r.height, padL = h * (0.06 + rnd() * 0.08), padR = h * (0.1 + rnd() * 0.16);
      // body text's line boxes are tight, so the stroke covers the whole box and a little more
      var top = h * (-0.2 + rnd() * 0.06), hh = h * (1.3 + rnd() * 0.1);
      padL += h * 0.12;
      var n = document.createElement('span');
      n.className = 'marker-ink';
      n.dataset.for = m.dataset.mk;
      n.setAttribute('aria-hidden', 'true');
      n.style.left = (r.left - hr.left - padL) + 'px';
      n.style.top = (r.top - hr.top + top) + 'px';
      n.style.width = (r.width + padL + padR) + 'px';
      n.style.height = hh + 'px';
      n.style.transform = 'rotate(' + (rnd() * 2.4 - 1.2).toFixed(2) + 'deg)';
      host.appendChild(n);
    });
  }
  marks.forEach(function (m, i) { m.dataset.mk = i; });
  function drawAll() { marks.forEach(draw); }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(drawAll);
    marks.forEach(function (m) { ro.observe(m.parentElement); });
  }
  window.addEventListener('load', drawAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  drawAll();
})();

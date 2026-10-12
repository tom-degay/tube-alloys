// Copied from the case study by build-validation.py.

    /* Workflow diagram: tween between the original (p = 0) and improved
       (p = 1) workflows; the tab background slides with a slight stretch.
       Two layouts share one set of shapes. "Wide" is the drawing as
       exported (725 wide). "Stacked", for containers under STACK_BELOW,
       re-places each card in a single 302-wide column with transforms --
       cards 130 x 103 at x 14, 12 apart, connectors turned to point down,
       and the "next rule" loop and its label down the right-hand side. */
    (function () {
      document.querySelectorAll('.wf-diagram').forEach(function (svg) {
      var prefix = svg.getAttribute('data-id-prefix') || 'wf-';
      function $(id) { return svg.querySelector('#' + prefix + id); }
      function slice(list) { return Array.prototype.slice.call(list); }
      var el = {};
      ['bg', 'bgrect', 'tabs', 'content', 'card1', 'conn1', 'card2', 'valicon', 'conn2', 'drill',
       'conn3', 'grid', 'fail', 'failline', 'failmark', 'apply', 'divider', 'feeds', 'arc', 'head',
       'label'].forEach(function (id) { el[id] = $(id); });
      var dots = slice($('dots').children), fdots = slice($('fdots').children);
      var tabs = slice(svg.querySelectorAll('.wf-tab'));

      function clamp(x) { return Math.min(1, Math.max(0, x)); }
      function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
      function inOutQuart(x) { return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }
      function seg(t, a, b) { return ease(clamp((t - a) / (b - a))); }
      function lerp(a, b, k) { return a + (b - a) * k; }
      function pop(k) { return k < 1 ? k * 1.3 - 0.3 * k * k : 1; }  // slight overshoot
      function tr(x, y) { return 'translate(' + x + ' ' + y + ')'; }
      // Turn a rightward connector that starts at (fx, fy) in the drawing so
      // it points down from (x, y).
      function down(x, y, fx, fy) { return tr(x, y) + ' rotate(90) ' + tr(-fx, -fy); }

      // ---- Layout ----------------------------------------------------------
      var STACK_BELOW = 0;    // container width (px) under which to stack
      var STACK_SCALE = 1.08;   // px per unit when stacked: text near desktop size
      var COL = 302, STACK_H = 660;
      // Stacked card tops (0-based slot) and the column's centre line. A card
      // drawn at x = cx moves by (14 - cx, top - 81).
      function slot(i) { return 84 + i * 115; }
      var MID = 79;

      var stacked = null, W = 0, H = 0;
      function measure() {
        var cw = svg.parentNode.clientWidth;
        var s = cw > 0 && cw < STACK_BELOW;
        var w = s ? Math.max(COL, Math.round(cw / STACK_SCALE)) : 725;
        if (s === stacked && w === W) return;
        stacked = s; W = w; H = s ? STACK_H : 335;
        var ox = (W - COL) / 2;  // centres the column when the box is wider
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        el.bgrect.setAttribute('width', W);
        el.bgrect.setAttribute('height', H);
        el.bg.setAttribute('x1', W / 2);
        el.bg.setAttribute('x2', W / 2);
        el.bg.setAttribute('y2', H);
        el.tabs.setAttribute('transform', s ? tr(2.5 + ox, 2.5) : tr(18.5, 10.5));
        el.content.setAttribute('transform', s ? tr(ox, 0) : tr(0, 52));
        // Units that only move with the layout, not with the animation.
        var place = s ? {
          card1: tr(-16, slot(0) - 81),
          conn1: down(MID, slot(0) + 103, 160, 131.5),
          card2: tr(-158, slot(1) - 81),
          conn2: down(MID, slot(1) + 103, 302, 131.5),
          conn3: down(MID, slot(2) + 103, 444, 131.5),
          failline: down(MID, slot(3) + 103, 586, 131.5),
          // The red X (drawn centred on x 649, top 119) sits 6 below the arrow tip.
          failmark: tr(MID - 649, slot(3) + 103 + 43.5 + 6 - 119.06)
        } : {};
        ['card1', 'conn1', 'card2', 'conn2', 'conn3', 'failline', 'failmark'].forEach(function (k) {
          if (place[k]) el[k].setAttribute('transform', place[k]);
          else el[k].removeAttribute('transform');
        });
        render(p);
      }

      // ---- Frame -----------------------------------------------------------
      function render(p) {
        var out = seg(p, 0, 0.22), drop = seg(p, 0.10, 0.36), move = seg(p, 0.28, 0.62),
            apply = seg(p, 0.60, 0.80), div = seg(p, 0.66, 0.86), feeds = seg(p, 0.74, 1);
        // Placement of anything drawn under the improved grid (x 314): slot 2.
        var under = stacked ? tr(-300, slot(2) - 81) + ' ' : '';

        el.fail.style.opacity = 1 - out;
        el.fail.setAttribute('transform', stacked ? tr(0, -12 * out) : tr(-12 * out, 0));
        el.drill.style.opacity = 1 - drop;
        el.drill.setAttribute('transform', under + 'translate(379 132) scale(' + (1 - 0.08 * drop) + ') translate(-379 -132)');
        el.conn3.style.opacity = 1 - drop;

        el.grid.setAttribute('transform', stacked
          ? tr(-442, lerp(slot(3), slot(2), move) - 81)
          : tr(-142 * move, 0));
        el.valicon.setAttribute('transform', tr(-2 * move, 0));
        // Stacked: label beside the loop, centred on the slot-2 card.
        el.label.setAttribute('transform', stacked
          ? tr(178 - 341.96, slot(2) + 51.5 - 44.87)
          : tr(-2 * move, -move));

        // "Go to next rule" loop. Wide: over the top, left end walking from
        // the validation card to the grid. Stacked: down the right-hand side,
        // from the grid back to the validation card, tightening to a loop on
        // the grid itself.
        var d, h;
        if (stacked) {
          var sy = lerp(slot(3) + 51.5, slot(2) + 70, move), ey = lerp(slot(1) + 51.5, slot(2) + 33, move);
          d = 'M144 ' + sy + ' H152 A16 16 0 0 0 168 ' + (sy - 16) + ' V' + (ey + 16) + ' A16 16 0 0 0 152 ' + ey + ' H146.8';
          h = 'M150.2 ' + (ey - 3.5) + ' L146.8 ' + ey + ' L150.2 ' + (ey + 3.5);
        } else {
          var sx = lerp(235.5, 336, move), ex = lerp(522.5, 420, move);
          d = 'M' + sx + ' 77.8 A22 22 0 0 1 ' + (sx + 22) + ' 56 H' + (ex - 25) + ' A25 25 0 0 1 ' + ex + ' 81';
          h = 'M' + (sx - 3.5) + ' 74.8 L' + sx + ' 78.2 L' + (sx + 3.5) + ' 74.8';
        }
        el.arc.setAttribute('d', d);
        el.head.setAttribute('d', h);

        dots.forEach(function (c, i) {
          var k = seg(p, 0.56 + i * 0.05, 0.70 + i * 0.05);
          c.style.opacity = k; c.setAttribute('r', (2.5 * pop(k)).toFixed(3));
        });
        el.apply.style.opacity = apply;
        el.apply.setAttribute('transform', under + tr(0, 6 * (1 - apply)));

        // Divider draws out: downwards when wide, rightwards when stacked.
        var dv = el.divider;
        dv.style.opacity = div ? 1 : 0;
        if (stacked) {
          dv.setAttribute('x1', 14); dv.setAttribute('x2', 14 + 274 * div);
          dv.setAttribute('y1', 476); dv.setAttribute('y2', 476);
        } else {
          dv.setAttribute('x1', 493.5); dv.setAttribute('x2', 493.5);
          dv.setAttribute('y1', 38); dv.setAttribute('y2', 38 + 187 * div);
        }

        el.feeds.style.opacity = feeds;
        el.feeds.setAttribute('transform', stacked
          ? tr(14 - 539, 496 - 81 + 12 * (1 - feeds))
          : tr(16 * (1 - feeds), 0));
        fdots.forEach(function (c, i) {
          var k = seg(p, 0.80 + i * 0.04, 0.88 + i * 0.04);  // last one lands at p = 1
          c.style.opacity = k; c.setAttribute('r', (2.5 * pop(k)).toFixed(3));
        });
      }

      // ---- Tab background: the leading edge runs ahead while the trailing
      // edge lags, so the pill stretches to about 1.1x mid-move, then catches up.
      var tabbg = $('tabbg');
      var SLOTS = [{ l: 15, r: 144 }, { l: 144, r: 282 }];
      var bg = { l: 15, r: 144 }, bgRaf = 0;
      function drawBg() {
        tabbg.setAttribute('x', bg.l.toFixed(2));
        tabbg.setAttribute('width', (bg.r - bg.l).toFixed(2));
      }
      function slideBg(to, instant) {
        cancelAnimationFrame(bgRaf);
        var a = { l: bg.l, r: bg.r }, b = SLOTS[to];
        if (instant) { bg = { l: b.l, r: b.r }; drawBg(); return; }
        var right = b.l > a.l, t0 = performance.now();
        function step(now) {
          var t = Math.min(1, (now - t0) / 520);
          var lead = ease(clamp(t / 0.95)), trail = inOutQuart(clamp((t - 0.03) / 0.97));
          bg = { l: lerp(a.l, b.l, right ? trail : lead), r: lerp(a.r, b.r, right ? lead : trail) };
          drawBg();
          if (t < 1) bgRaf = requestAnimationFrame(step);
        }
        bgRaf = requestAnimationFrame(step);
      }

      // ---- Switching -------------------------------------------------------
      var DURATION = 1900;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var p = +(svg.getAttribute('data-initial-state') || 0), target = p, raf = 0;
      function go(to) {
        if (to === target) return;
        target = to;
        var from = p, start = performance.now(), span = DURATION * Math.abs(to - from);
        tabs.forEach(function (t) {
          var on = +t.getAttribute('data-state') === to;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-pressed', on);
        });
        slideBg(to, reduced);
        cancelAnimationFrame(raf);
        if (reduced) { p = to; render(p); return; }
        function step(now) {
          var k = Math.min(1, (now - start) / span);
          p = lerp(from, to, k);
          render(p);
          if (k < 1) raf = requestAnimationFrame(step);
        }
        raf = requestAnimationFrame(step);
      }

      tabs.forEach(function (t) {
        var to = +t.getAttribute('data-state');
        t.addEventListener('click', function () { go(to); });
        t.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(to); }
        });
      });
      tabs.forEach(function (t) {
        var on = +t.getAttribute('data-state') === target;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', on);
      });
      slideBg(target, true);
      measure();
      if ('ResizeObserver' in window) new ResizeObserver(measure).observe(svg.parentNode);
      else window.addEventListener('resize', measure);
      });
    })();
  
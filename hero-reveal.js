/* Mobile case-study heroes: stable layout, compositor-only playback. */
(function () {
  'use strict';
  var media = document.querySelector('[data-hero-reveal]');
  if (!media) return;
  var button = document.querySelector(media.getAttribute('data-reveal-button'));
  var phone = window.matchMedia('(max-width: 640px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = false, ready = false, restingTop = 0;
  var width = window.innerWidth, generation = 0, queued = false;

  function update() {
    queued = false;
    if (!active || !ready) return;
    if (window.scrollY <= 0) {
      media.classList.remove('is-in');
    } else if (window.scrollY >= Math.max(1, restingTop - window.innerHeight + 40)) {
      media.classList.add('is-played', 'is-in');
    }
  }

  function configure() {
    var current = ++generation;
    active = ready = false;
    // Remove transitions before measuring or changing the resting space.
    media.classList.remove('is-armed', 'is-in', 'is-played', 'has-reveal-spacing');
    media.style.removeProperty('--hero-close');
    if (!phone.matches) return;

    var top = media.getBoundingClientRect().top;
    var documentTop = top + window.scrollY;
    var close = button ? Math.max(0, Math.round(top - button.getBoundingClientRect().bottom - 56)) : 0;
    media.style.setProperty('--hero-close', close + 'px');
    media.classList.add('has-reveal-spacing');

    // Retain the visible image when restoring a page partway down.
    if (reduce.matches || (window.scrollY > 0 && top - close < window.innerHeight - 40)) return;

    // Match Image Insight: start when 40px of the original resting slot
    // enters view. Keep the slot fixed, but use the current viewport height
    // in update() so Safari's expanding/collapsing toolbar cannot delay it.
    restingTop = documentTop;
    active = true;
    media.classList.add('is-armed');
    // Commit the hidden, composited starting state before playback can
    // begin, including when scroll restoration occurs during page load.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (current !== generation) return;
        ready = true;
        update();
      });
    });
  }

  window.addEventListener('scroll', function () {
    if (!active || queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (window.innerWidth === width) {
      update();
      return;
    }
    width = window.innerWidth;
    configure();
  });
  reduce.addEventListener('change', configure);
  window.addEventListener('pageshow', function (event) {
    // A normal reload can restore its scroll position after fonts settle.
    // Do not restart a reveal the user has already triggered while loading.
    if (event.persisted || (window.scrollY > 0 && !media.classList.contains('is-played'))) configure();
  });

  function initialise() {
    if (document.fonts) document.fonts.ready.then(configure);
    else configure();
  }
  // Deferred navigation replaces the fallback header. Wait for that and
  // the heading fonts before taking any position measurements.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else initialise();
})();

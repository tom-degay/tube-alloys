/* Keep the mobile hero 56px below its button, with no entrance animation. */
(function () {
  'use strict';
  var media = document.querySelector('[data-hero-spacing]');
  if (!media) return;
  var button = document.querySelector(media.getAttribute('data-spacing-button'));
  if (!button) return;
  var phone = window.matchMedia('(max-width: 640px)');
  var queued = false;

  function update() {
    queued = false;
    if (!phone.matches) {
      media.style.removeProperty('--hero-close');
      return;
    }
    var margin = parseFloat(window.getComputedStyle(media).marginTop) || 0;
    var naturalTop = media.getBoundingClientRect().top - margin;
    var close = Math.max(0, Math.round(naturalTop - button.getBoundingClientRect().bottom - 56));
    media.style.setProperty('--hero-close', close + 'px');
  }

  window.addEventListener('resize', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  });
  update();
  if (document.fonts) document.fonts.ready.then(update);
})();

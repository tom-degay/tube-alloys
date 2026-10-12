(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const deck = new Reveal(document.querySelector('.reveal'), {
    width: 1280, height: 720, margin: 0.025, minScale: 0.1, maxScale: 2,
    hash: true, hashOneBasedIndex: false, controls: false, progress: true,
    center: false, transition: motion.matches ? 'none' : 'fade', transitionSpeed: 'fast',
    // Keep a slide canvas on narrow screens, rather than switching to a document.
    view: 'slide', embedded: false, autoPlayMedia: !motion.matches,
    keyboardCondition: event => !event.target.closest('video, button, a, [role="button"]'),
    help: true
  });
  const count = document.querySelector('#slide-count');
  const previous = document.querySelector('#prev-slide');
  const next = document.querySelector('#next-slide');
  function update() {
    const index = deck.getIndices().h;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${deck.getTotalSlides()}`;
    previous.disabled = deck.isFirstSlide();
    next.disabled = deck.isLastSlide();
    // Hidden slide content should never take keyboard focus.
    deck.getSlides().forEach(slide => { slide.inert = slide !== deck.getCurrentSlide() && !deck.isOverview(); });
    const focused = document.activeElement;
    if (focused && focused.closest('.slides section') && !focused.closest('.slides section.present')) focused.blur();
  }
  function navigate(fn) { fn(); document.activeElement?.blur(); }
  previous.addEventListener('click', () => navigate(() => deck.prev()));
  next.addEventListener('click', () => navigate(() => deck.next()));
  document.querySelector('#contents-button').addEventListener('click', () => navigate(() => deck.slide(2)));
  document.querySelector('#overview-button').addEventListener('click', () => navigate(() => deck.toggleOverview()));
  const fullscreen = document.querySelector('#fullscreen-button');
  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { /* The deck remains usable if the browser blocks fullscreen. */ }
    fullscreen.blur();
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
  deck.on('slidechanged', update);
  deck.on('overviewshown', () => {
    deck.getSlides().forEach(slide => { slide.inert = false; });
    document.querySelectorAll('video').forEach(video => video.pause());
  });
  deck.on('overviewhidden', update);
  motion.addEventListener('change', () => {
    deck.configure({autoPlayMedia: !motion.matches, transition: motion.matches ? 'none' : 'fade'});
    if (motion.matches) document.querySelectorAll('video').forEach(video => video.pause());
  });
  // Let the embedded diagram handle Enter/Space without advancing the deck.
  document.querySelectorAll('.wf-diagram').forEach(svg => {
    svg.addEventListener('keydown', event => event.stopPropagation());
  });
  deck.initialize().then(update);
})();

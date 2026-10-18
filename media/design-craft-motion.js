/* Play the remaining demos when they enter view. Existing Agent, motif and
   profile animations already observe scrolling in their own scripts. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window)) return;
  const states = [];
  function stop(state) {
    state.timers.forEach(clearTimeout);
    state.timers = [];
    state.animations.forEach(animation => animation.cancel());
    state.animations = [];
    state.card.classList.remove('is-scroll-playing');
    const root = state.embed?.contentDocument?.documentElement;
    if (root && state.started && state.kind === 'mapping') root.dispatchEvent(new Event('mapping-demo-stop'));
    if (root && state.started && state.kind === 'date') root.dispatchEvent(new Event('zf-demo-stop'));
  }
  function revealItems(state, doc, selector) {
    const items = [...doc.querySelectorAll(selector)];
    if (!items.length) return false;
    items.forEach((item, i) => state.animations.push(item.animate([
      { opacity: 0, transform: 'translateY(12px) scale(.97)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 650, delay: Math.min(i * 55, 440), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' })));
    return true;
  }
  function play(state) {
    if (!state.visible || state.started || state.used || reduced.matches) return;
    const doc = state.embed?.contentDocument;
    const root = doc?.documentElement;
    if (state.embed && (!root || !doc.querySelector(state.ready))) return;
    state.started = true;
    state.card.dataset.scrollAnimation = 'played';
    if (state.kind === 'statement') state.card.classList.add('is-scroll-playing');
    if (state.kind === 'mapping') root.dispatchEvent(new Event('mapping-demo-play'));
    if (state.kind === 'date') root.dispatchEvent(new Event('zf-demo-start'));
    if (state.kind === 'brand') {
      const mark = state.card.querySelector('.zf-brand-mark');
      mark.classList.add('is-colour');
      mark.setAttribute('aria-pressed', 'true');
    }
    if (state.kind === 'icons') {
      doc.querySelectorAll('.icon').forEach((icon, i) => {
        state.timers.push(setTimeout(() => {
          if (!state.visible || state.used || reduced.matches) return;
          icon.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
        }, i * 110));
      });
    }
    if (state.kind === 'grid') revealItems(state, doc, '.photo:not([hidden]) img');
    if (state.kind === 'programme') revealItems(state, doc, '.option');
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.find(item => item.card === entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .3;
      if (state.visible) play(state);
      else {
        stop(state);
        state.started = false;
        // Re-arm on the next pass without interrupting someone using a card.
        if (!entry.isIntersecting) {
          state.used = false;
          if (state.kind === 'brand') {
            const mark = state.card.querySelector('.zf-brand-mark');
            mark.classList.remove('is-colour');
            mark.setAttribute('aria-pressed', 'false');
          }
        }
      }
    });
  }, { threshold: [0, .3], rootMargin: '0px 0px -5% 0px' });
  [
    ['craft-statement', 'statement', null],
    ['mapping-tabs-detail', 'mapping', '#mapped-tab'],
    ['craft-zonefully-date-picker', 'date', '#zf-calendar'],
    ['craft-zonefully-brand', 'brand', null],
    ['craft-image-insight-icons', 'icons', '.icon'],
    ['craft-image-insight-grid', 'grid', '.photo img'],
    ['craft-zonefully-programme', 'programme', '.option']
  ].forEach(([id, kind, ready]) => {
    const card = document.getElementById(id);
    if (!card) return;
    const state = { card, kind, ready, embed: card.querySelector('object, iframe'), visible: false, started: false, used: false, timers: [], animations: [] };
    states.push(state);
    const takeControl = event => {
      if (!event.isTrusted) return;
      state.used = true;
      // Playback buttons own their toggle; stopping on pointerdown would
      // turn a Stop click into Play before its click handler runs.
      if (state.kind === 'mapping' && event.target.closest?.('.demo-controls')) return;
      stop(state);
    };
    card.addEventListener('pointerdown', takeControl, true);
    card.addEventListener('keydown', takeControl, true);
    function connect() {
      const doc = state.embed?.contentDocument;
      if (doc && doc !== state.doc) {
        state.doc = doc;
        doc.addEventListener('pointerdown', takeControl, true);
        doc.addEventListener('keydown', takeControl, true);
      }
      play(state);
    }
    state.embed?.addEventListener('load', connect);
    connect();
    observer.observe(card);
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) states.forEach(stop);
    else states.forEach(play);
  });
})();

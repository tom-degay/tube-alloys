(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const deck = new Reveal(document.querySelector('.reveal'), {
    width: 1280, height: 720, margin: 0.025, minScale: 0.1, maxScale: 2,
    hash: true, hashOneBasedIndex: false, controls: false, progress: true,
    center: false, transition: motion.matches ? 'none' : 'fade', transitionSpeed: 'fast',
    // Keep a slide canvas on narrow screens, rather than switching to a document.
    view: 'slide', scrollActivationWidth: null, embedded: false, autoPlayMedia: null,
    keyboardCondition: event => {
      if (document.querySelector('dialog[open]')) return false;
      const popupTrigger = event.target.closest('[data-dialog]');
      // Closing a card returns focus to its trigger. Arrow navigation should
      // still work there; Enter/Space remain native button activation.
      if (popupTrigger && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        popupTrigger.blur();
        return true;
      }
      return !event.target.closest('video, button, a, [role="button"]');
    },
    help: true
  });
  const overview = document.createElement('div');
  overview.className = 'slide-grid';
  overview.hidden = true;
  overview.setAttribute('role', 'navigation');
  overview.setAttribute('aria-label', 'All slides');
  document.body.append(overview);
  function fitGrid() {
    const n = overview.children.length;
    if (!n || overview.hidden) return;
    const width = overview.clientWidth - 32, height = overview.clientHeight - 32;
    let best = {size: 0};
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const size = Math.min((width - (cols - 1) * 12) / cols, ((height - (rows - 1) * 12) / rows - 26) * 16 / 9);
      if (size > best.size) best = {size, cols};
    }
    overview.style.gridTemplateColumns = `repeat(${best.cols}, ${best.size}px)`;
    overview.style.setProperty('--thumb-width', `${best.size}px`);
    overview.style.setProperty('--thumb-scale', best.size / 1280);
  }
  function buildGrid() {
    overview.replaceChildren();
    deck.getSlides().forEach((slide, index) => {
      const button = document.createElement('button');
      button.className = 'slide-grid-item';
      button.setAttribute('aria-label', `Slide ${index + 1}: ${slide.dataset.title || 'Untitled'}`);
      button.setAttribute('aria-current', String(index === deck.getIndices().h));
      const thumb = document.createElement('div');
      thumb.className = 'slide-grid-thumb';
      const preview = document.createElement('div');
      preview.className = 'reveal grid-preview';
      preview.setAttribute('aria-hidden', 'true');
      preview.inert = true;
      const canvas = document.createElement('div');
      canvas.className = 'slides';
      const clone = slide.cloneNode(true);
      clone.removeAttribute('style');
      clone.classList.remove('past', 'future');
      clone.classList.add('present');
      clone.removeAttribute('hidden');
      // Preserve SVG references without duplicating document IDs.
      [clone, ...clone.querySelectorAll('[id]')].forEach(el => {
        if (!el.id) return;
        const old = el.id, next = `thumb-${index}-${old}`;
        clone.querySelectorAll('*').forEach(child => {
          Array.from(child.attributes).forEach(attr => {
            if (attr.value.includes(`#${old}`)) child.setAttribute(attr.name, attr.value.replaceAll(`#${old}`, `#${next}`));
          });
        });
        el.id = next;
      });
      clone.querySelectorAll('video').forEach(video => {
        const img = document.createElement('img');
        img.src = video.poster; img.alt = '';
        img.className = 'video-poster'; video.replaceWith(img);
      });
      canvas.append(clone); preview.append(canvas); thumb.append(preview);
      const label = document.createElement('span');
      label.className = 'slide-grid-number';
      label.textContent = String(index + 1).padStart(2, '0');
      button.append(thumb, label);
      button.addEventListener('click', () => { deck.slide(index); deck.toggleOverview(false); document.querySelector('#overview-button').focus(); });
      overview.append(button);
    });
  }
  window.addEventListener('resize', fitGrid);
  const count = document.querySelector('#slide-count');
  const previous = document.querySelector('#prev-slide');
  const next = document.querySelector('#next-slide');
  const splash = document.querySelector('main #splash');
  let splashActive = false, splashCycle = 0, splashReplay;
  function syncSplash() {
    const active = deck.getCurrentSlide() === splash && !deck.isOverview() && !motion.matches;
    if (active === splashActive) return;
    splashActive = active;
    const cycle = ++splashCycle;
    clearTimeout(splashReplay);
    splash.classList.remove('splash-animating');
    if (!active) return;
    function replay() {
      splash.classList.remove('splash-animating');
      void splash.offsetWidth;
      splash.classList.add('splash-animating');
      // Hold the completed graphic for five seconds before replaying both effects.
      const animations = splash.getAnimations({subtree: true});
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (cycle === splashCycle) splashReplay = setTimeout(replay, 5000);
      }).catch(() => { /* Leaving the slide cancels its animations. */ });
    }
    replay();
  }
  function update() {
    syncSplash();
    const index = deck.getIndices().h;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${deck.getTotalSlides()}`;
    previous.disabled = deck.isFirstSlide();
    next.disabled = deck.isLastSlide();
    // Hidden slide content should never take keyboard focus.
    deck.getSlides().forEach(slide => { slide.inert = slide !== deck.getCurrentSlide() && !deck.isOverview(); });
    const focused = document.activeElement;
    if (focused && focused.closest('.slides section') && !focused.closest('.slides section.present')) focused.blur();
    // Restart playback after every entry, including selection from the overview.
    deck.getSlides().forEach(slide => {
      slide.querySelectorAll('video').forEach(video => {
        const isActive = slide === deck.getCurrentSlide() && !deck.isOverview();
        const shouldPlay = isActive && video.hasAttribute('data-autoplay');
        if (shouldPlay) {
          video.muted = true;
          video.play().catch(() => { /* Native controls remain available. */ });
        } else if (!isActive) video.pause();
      });
    });
  }
  function navigate(fn) { fn(); document.activeElement?.blur(); }
  previous.addEventListener('click', () => navigate(() => deck.prev()));
  next.addEventListener('click', () => navigate(() => deck.next()));
  document.querySelector('#contents-button').addEventListener('click', () => navigate(() => { deck.slide(2); deck.toggleOverview(false); }));
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
    const label = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
    fullscreen.setAttribute('aria-label', label);
    fullscreen.title = label;
    fullscreen.classList.toggle('is-fullscreen', !!document.fullscreenElement);
  });
  deck.on('slidechanged', update);
  deck.on('slidetransitionend', update);
  deck.on('overviewshown', () => {
    syncSplash();
    buildGrid();
    overview.hidden = false;
    fitGrid();
    document.querySelector('main.reveal').style.visibility = 'hidden';
    document.querySelector('main.reveal').inert = true;
    overview.querySelector('[aria-current="true"]').focus();
    document.querySelectorAll('video').forEach(video => video.pause());
  });
  deck.on('overviewhidden', () => { overview.hidden = true; document.querySelector('main.reveal').style.visibility = ''; document.querySelector('main.reveal').inert = false; update(); });
  overview.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); deck.toggleOverview(false); document.querySelector('#overview-button').focus(); } });
  motion.addEventListener('change', () => {
    deck.configure({autoPlayMedia: null, transition: motion.matches ? 'none' : 'fade'});
    update();
  });
  // Let the embedded diagram handle Enter/Space without advancing the deck.
  document.querySelectorAll('.wf-diagram').forEach(svg => {
    svg.addEventListener('keydown', event => event.stopPropagation());
  });
  document.querySelectorAll('main video[data-start]').forEach(video => {
    const start = Number(video.dataset.start);
    const seekStart = () => { video.currentTime = start; };
    video.addEventListener('loadedmetadata', seekStart, {once: true});
    if (video.readyState >= 1) seekStart();
    video.addEventListener('timeupdate', () => { if (video.currentTime < start) video.currentTime = start; });
  });
  document.querySelectorAll('.validation-dialog').forEach(dialog => {
    let opener;
    document.querySelectorAll(`main [data-dialog="${dialog.id}"]`).forEach(trigger => {
      trigger.addEventListener('click', () => {
        opener = trigger;
        dialog.showModal();
      });
    });
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => opener?.focus());
  });
  // Keep modal navigation separate from Reveal's global keyboard shortcuts.
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  }, true);
  deck.initialize().then(update);
})();

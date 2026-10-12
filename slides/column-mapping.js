// Controls preserved from the case study.
(function () {
      var detail = document.querySelector('.mapping-tabs-detail');
      var diagram = detail.querySelector('object');
      var reset = detail.querySelector('.reset-button');
      var demo = detail.querySelector('.demo-button');
      var status = detail.querySelector('.demo-status');
      var connectedRoot;
      function connect() {
        var root = diagram.contentDocument && diagram.contentDocument.documentElement;
        if (!root || root.localName !== 'svg' || root === connectedRoot) return;
        connectedRoot = root;
        var running = false;
        reset.disabled = false;
        demo.disabled = false;
        demo.setAttribute('aria-pressed', 'false');
        demo.querySelector('span').textContent = 'Play demo';
        var hint = detail.querySelector('.try-hint');
        var canvas = hint.closest('.mapping-demo-canvas');
        function showHint(visible) {
          canvas.classList.toggle('is-interacted', !visible);
          hint.disabled = !visible;
          hint.setAttribute('aria-hidden', String(!visible));
        }
        showHint(true);
        root.addEventListener('mapping-hint-state', function (event) { showHint(event.detail.visible); });
        hint.onmouseenter = hint.onfocus = function () { root.dispatchEvent(new Event('mapping-hint-hover')); };
        hint.onmouseleave = hint.onblur = function () { root.dispatchEvent(new Event('mapping-hint-leave')); };
        hint.onclick = function () { root.dispatchEvent(new Event('mapping-hint-activate')); };
        reset.onclick = function () { root.dispatchEvent(new Event('mapping-reset')); };
        demo.onclick = function () { root.dispatchEvent(new Event(running ? 'mapping-demo-stop' : 'mapping-demo-play')); };
        root.addEventListener('mapping-demo-state', function (event) {
          running = event.detail.running;
          demo.setAttribute('aria-pressed', String(running));
          demo.querySelector('span').textContent = running ? 'Stop demo' : 'Play demo';
          status.textContent = event.detail.message;
        });
      }
      diagram.addEventListener('load', connect);
      connect();
    })();

// Keep animated SVG documents tied to the active slide, including in overview.
(() => {
  const main = document.querySelector('main.reveal');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const objects = Array.from(main.querySelectorAll('object'));
  const wasActive = new WeakMap();
  function update() {
    for (const object of objects) {
      const doc = object.contentDocument;
      const root = doc?.documentElement;
      if (root?.localName !== 'svg') continue;
      const active = !document.hidden && !main.inert && object.closest('section').classList.contains('present');
      if (!active && wasActive.get(object)) root.dispatchEvent(new Event('mapping-demo-stop'));
      if (object.classList.contains('animated-artwork')) {
        const running = active && !motion.matches;
        if (running && !wasActive.get(object)) root.setCurrentTime?.(0);
        if (running) root.unpauseAnimations?.();
        else root.pauseAnimations?.();
        doc.getAnimations().forEach(animation => {
          if (running) {
            if (!wasActive.get(object)) animation.currentTime = 0;
            animation.play();
          } else animation.pause();
        });
      }
      wasActive.set(object, active && !motion.matches);
    }
  }
  objects.forEach(object => {
    object.addEventListener('load', () => {
      const doc = object.contentDocument;
      if (doc?.documentElement.localName !== 'svg') return;
      const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = 'text, button, input {letter-spacing:normal!important}';
      doc.documentElement.append(style);
      update();
    });
  });
  const observer = new MutationObserver(update);
  observer.observe(main, {attributes:true, attributeFilter:['class','style','inert']});
  main.querySelectorAll('.slides>section').forEach(section => observer.observe(section,{attributes:true,attributeFilter:['class']}));
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();

// Three source spreadsheets share one navigable lightbox.
(() => {
  const dialog = document.querySelector('#excel-lightbox');
  const thumbs = [...document.querySelectorAll('main .excel-thumbnail')];
  const image = dialog.querySelector('.lightbox-image');
  let index = 0, opener;
  function show(next) {
    index = (next + thumbs.length) % thumbs.length;
    const source = thumbs[index].querySelector('img');
    image.src = source.src;
    image.alt = source.alt;
    dialog.querySelector('.lightbox-count').textContent = `${index + 1} / ${thumbs.length}`;
  }
  thumbs.forEach((button, i) => button.addEventListener('click', () => {
    opener = button; show(i); dialog.showModal(); image.focus();
  }));
  dialog.querySelector('.lightbox-close').onclick = () => dialog.close();
  dialog.querySelector('.lightbox-prev').onclick = () => show(index - 1);
  dialog.querySelector('.lightbox-next').onclick = () => show(index + 1);
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }, true);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { opener?.focus(); opener?.blur(); });
})();

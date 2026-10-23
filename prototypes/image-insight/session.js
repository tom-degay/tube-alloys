(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const board = $('#image-board');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionScroller = $('.session-body');
  function updateScrollFades() {
    const remaining = sessionScroller.scrollHeight - sessionScroller.clientHeight - sessionScroller.scrollTop;
    sessionScroller.style.setProperty('--scroll-fade-top', `${Math.min(24, Math.max(0, sessionScroller.scrollTop))}px`);
    sessionScroller.style.setProperty('--scroll-fade-bottom', `${Math.min(24, Math.max(0, remaining))}px`);
  }
  sessionScroller.addEventListener('scroll', updateScrollFades, { passive: true });
  const scrollFadeResize = new ResizeObserver(updateScrollFades);
  [sessionScroller, $('#session-content'), $('#selected-images'), $('#settings-content')].forEach(element => scrollFadeResize.observe(element));
  // Appearance is independent of session data and is shared with the image board.
  const deviceTheme = matchMedia('(prefers-color-scheme: dark)');
  const requestedTheme = new URLSearchParams(location.search).get('theme');
  let themeOverridden = ['light', 'dark'].includes(requestedTheme);
  let theme = themeOverridden ? requestedTheme : deviceTheme.matches ? 'dark' : 'light';
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1c1c1c' : '#47b3cf';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    });
    document.querySelectorAll('[data-theme-label]').forEach(label => { label.textContent = `Dark mode ${theme === 'dark' ? 'on' : 'off'}`; });
    board.contentWindow.postMessage({ type: 'ii-session-theme', theme }, location.origin);
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
    themeOverridden = true;
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  }));
  deviceTheme.addEventListener('change', () => {
    if (themeOverridden) return;
    theme = deviceTheme.matches ? 'dark' : 'light';
    applyTheme();
  });
  applyTheme();

  // Fit sheets to the visible screen when the phone keyboard is open.
  let keyboardBaseline = window.visualViewport?.height || window.innerHeight;
  let keyboardWidth = window.innerWidth;
  function updateVisibleScreen() {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--view-top', `${viewport?.offsetTop || 0}px`);
    const boardEditing = document.activeElement === board && board.contentDocument?.activeElement?.matches('input');
    const editing = document.activeElement?.matches('input, textarea') || boardEditing;
    document.body.classList.toggle('board-editing', Boolean(boardEditing));
    // Some mobile browsers shrink both viewports, so retain the unfocused height.
    if (Math.abs(window.innerWidth - keyboardWidth) > 80) {
      keyboardBaseline = window.innerHeight;
      keyboardWidth = window.innerWidth;
    }
    if (!editing) keyboardBaseline = Math.max(height, window.innerHeight);
    const keyboardOpen = Boolean(editing && Math.max(keyboardBaseline, window.innerHeight) - height > 120);
    document.body.classList.toggle('keyboard-open', keyboardOpen);
    if (keyboardOpen && document.activeElement?.id === 'image-notes') {
      const dialog = document.getElementById('discussion-dialog');
      dialog.scrollTop = 0;
    }
  }
  window.visualViewport?.addEventListener('resize', updateVisibleScreen);
  window.visualViewport?.addEventListener('scroll', updateVisibleScreen);
  window.addEventListener('resize', updateVisibleScreen);
  document.addEventListener('focusin', updateVisibleScreen);
  document.addEventListener('focusout', updateVisibleScreen);
  updateVisibleScreen();

  for (const type of ['pointerdown','click']) document.addEventListener(type, event => {
    if (document.body.classList.contains('grid-slider-dragging') && event.target !== board) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  board.addEventListener('load', () => document.body.classList.remove('grid-slider-dragging'));
  const catalog = new Map();
  const dialogs = [...document.querySelectorAll('dialog')];
  const defaultSessionName = () => `Session ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'
  }).format(new Date())}`;
  // View changes keep a useful focus target, without inheriting keyboard
  // rings from an automatically focused dialog field after a pointer click.
  function setInputMode(mode, notifyBoard = true) {
    document.documentElement.dataset.input = mode;
    if (notifyBoard) board.contentWindow.postMessage({ type: 'ii-session-input', mode }, location.origin);
  }
  setInputMode('pointer', false);
  document.addEventListener('pointerdown', () => setInputMode('pointer'), true);
  document.addEventListener('keydown', event => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) setInputMode('keyboard');
  }, true);
  let expanded = false;
  let settingsOpen = false;
  let activeImage = null;
  let dialogOpener = null;
  const phoneLayout = matchMedia('(max-width:600px), (max-width:900px) and (max-height:500px)');
  let mobileControlsOpen = false;
  function showMobileSessionBar(visible) {
    $('#workspace').classList.toggle('mobile-session-visible', visible);
    $('#mobile-session-bar').inert = !visible || !phoneLayout.matches;
  }
  function setMobileControls(open) {
    mobileControlsOpen = open && phoneLayout.matches;
    $('#mobile-grid-controls').setAttribute('aria-expanded', String(mobileControlsOpen));
    board.contentWindow.postMessage({ type: 'ii-session-controls', open: mobileControlsOpen }, location.origin);
  }
  function syncMobileNavigation() {
    syncToolbarAlignment();
    board.contentWindow.postMessage({ type: 'ii-session-mobile-nav', enabled: phoneLayout.matches }, location.origin);
    $('#mobile-session-bar').inert = !phoneLayout.matches || !$('#workspace').classList.contains('mobile-session-visible');
    if (!phoneLayout.matches) setMobileControls(false);
  }
  phoneLayout.addEventListener('change', syncMobileNavigation);
  function syncToolbarAlignment() {
    const bottom = window.innerWidth > 900 ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) : 12;
    board.contentWindow.postMessage({ type: 'ii-session-toolbar-alignment', bottom }, location.origin);
  }
  window.addEventListener('resize', syncToolbarAlignment);
  $('#mobile-grid-controls').addEventListener('click', () => setMobileControls(!mobileControlsOpen));
  $('#mobile-refresh').addEventListener('click', () => {
    setMobileControls(false);
    board.contentWindow.postMessage({ type: 'ii-session-refresh' }, location.origin);
  });
  $('#mobile-session-bar').addEventListener('click', () => {
    setMobileControls(false);
    if (!state.started) startSession();
    else if (!expanded) toggleExpansion();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#mobile-grid-controls')) setMobileControls(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileControlsOpen) {
      event.preventDefault();
      setMobileControls(false);
      $('#mobile-grid-controls').focus({ preventScroll: true });
    }
  });

  let history = [];
  const freshSession = () => ({
    id: crypto.randomUUID(), started: false, question: '', name: defaultSessionName(), selected: [], setupStep: 'settings',
    notes: {}, summary: '', actions: [], profile: 'Adult', client: '', sessionNotes: '',
    completed: false, updated: new Date().toISOString()
  });
  // Start the demo ready for image selection; explicit new sessions retain setup.
  let state = {
    ...freshSession(), started: true, setupStep: 'complete',
    question: 'What is important to you?'
  };
  // Prototype entries live only in memory and reset on reload or close.
  function announce(message) { $('#announcement').textContent = message; }
  function save() { state.updated = new Date().toISOString(); }
  function archiveCurrent() {
    if (!state.started) return;
    history = [structuredClone(state), ...history.filter(item => item.id !== state.id)].slice(0, 12);
    save();
  }
  function icon(name) {
    return window.sessionIcons[name] || '';
  }
  function mountIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  }
  mountIcons();
  // Keep the same hover/tap motion as the icon demonstration on the case study.
  document.addEventListener('click', event => {
    const button = event.target.closest('button.icon');
    if (!button || reduced.matches) return;
    button.classList.remove('is-playing');
    void button.offsetWidth;
    button.classList.add('is-playing');
    setTimeout(() => button.classList.remove('is-playing'), 720);
  });
  function sendSelection() {
    board.contentWindow.postMessage({ type: 'ii-session-selection', ids: state.selected }, location.origin);
  }
  board.addEventListener('load', () => {
    board.contentWindow.postMessage({ type: 'ii-session-connect' }, location.origin);
    setInputMode(document.documentElement.dataset.input);
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== board.contentWindow) return;
    if (event.data?.type === 'ii-session-slider-drag') {
      document.body.classList.toggle('grid-slider-dragging', event.data.active === true);
    }
    if (event.data?.type === 'ii-session-input' && ['pointer', 'keyboard'].includes(event.data.mode)) {
      setInputMode(event.data.mode, false);
    }
    if (event.data?.type === 'ii-session-ready' && Array.isArray(event.data.images)) {
      for (const image of event.data.images) {
        if (typeof image.id !== 'string' || typeof image.alt !== 'string' || typeof image.src !== 'string') continue;
        const url = new URL(image.src, location.href);
        if (url.origin === location.origin && url.pathname.startsWith('/case-studies/media/image-insight-grid/')) catalog.set(image.id, image);
      }
      state.selected = [...new Set(state.selected)].filter(id => catalog.has(id));
      renderPanel();
      sendSelection();
      syncMobileNavigation();
      applyTheme();
    }
    if (event.data?.type === 'ii-session-scroll' && ['down','up'].includes(event.data.direction) && phoneLayout.matches && !expanded && !settingsOpen) {
      showMobileSessionBar(event.data.direction === 'down');
    }
    if (event.data?.type === 'ii-session-controls-state') {
      mobileControlsOpen = Boolean(event.data.open);
      $('#mobile-grid-controls').setAttribute('aria-expanded', String(mobileControlsOpen));
      if (!mobileControlsOpen && document.activeElement === board && document.documentElement.dataset.input === 'keyboard') {
        $('#mobile-grid-controls').focus({ preventScroll: true });
      }
    }
    if (event.data?.type === 'ii-session-discuss' && catalog.has(event.data.id)) {
      const id = event.data.id;
      if (!state.selected.includes(id)) state.selected.push(id);
      state.completed = false;
      save(); renderPanel(); sendSelection();
      openDiscussion(id, board);
    }
    if (event.data?.type === 'ii-session-toggle' && catalog.has(event.data.id)) {
      if (!state.started || !state.question) {
        startSession();
        return;
      }
      showMobileSessionBar(true);
      const id = event.data.id;
      const selected = state.selected.includes(id);
      if (selected) state.selected = state.selected.filter(item => item !== id);
      else state.selected.push(id);
      state.completed = false;
      save();
      renderPanel();
      sendSelection();
      if (!selected) animateSelectionArrival(id);
      announce(`${selected ? 'Removed' : 'Added'} ${catalog.get(id).alt.toLowerCase()}. ${state.selected.length} images selected.`);
    }
  });

  const selectionFlights = new Set();
  const arrivalPulses = new WeakMap();
  function animateSelectionArrival(id) {
    if (reduced.matches) return;
    const source = [...board.contentDocument.querySelectorAll('.photo')].find(cell => cell.dataset.image === id)?.querySelector('img');
    if (!source) return;
    const frame = board.getBoundingClientRect();
    const rect = source.getBoundingClientRect();
    const from = {left:frame.left + rect.left, top:frame.top + rect.top, width:rect.width, height:rect.height};
    const card = [...$('#selected-images').children].find(item => item.dataset.id === id);
    let target = phoneLayout.matches ? $('.mobile-session-count') : card?.querySelector('img');
    if (!target) return;
    let to = target.getBoundingClientRect();
    if (!phoneLayout.matches) {
      const visible = sessionScroller.getBoundingClientRect();
      if (to.top < visible.top || to.bottom > visible.bottom) {
        target = $('#session-title');
        to = target.getBoundingClientRect();
      }
    }
    // The mobile bar may still be sliding in; aim at its settled position.
    let targetY = to.top + to.height / 2;
    if (phoneLayout.matches) {
      const transform = getComputedStyle($('#mobile-session-bar')).transform;
      if (transform !== 'none') targetY -= new DOMMatrixReadOnly(transform).m42;
    }
    const size = phoneLayout.matches ? 26 : Math.min(64, to.width);
    const ghost = document.createElement('img');
    ghost.className = 'selection-flight';
    ghost.src = source.currentSrc || source.src;
    ghost.alt = '';
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
    document.body.append(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = targetY - (from.top + from.height / 2);
    while (selectionFlights.size >= 3) {
      const oldest = selectionFlights.values().next().value;
      selectionFlights.delete(oldest); oldest.cancel();
    }
    const flight = ghost.animate([
      {transform:'translate(0,0) scale(1)',opacity:.5},
      {transform:`translate(${dx * .55}px,${dy * .55 - 6}px) scale(.45)`,opacity:.4,offset:.55},
      {transform:`translate(${dx}px,${dy}px) scale(${size / from.width})`,opacity:0}
    ], {duration:720,easing:'cubic-bezier(.35,0,.25,1)'});
    selectionFlights.add(flight);
    const clean = () => { ghost.remove(); selectionFlights.delete(flight); };
    flight.oncancel = clean;
    flight.onfinish = () => {
      clean();
      if (!state.selected.includes(id) || !target.isConnected) return;
      arrivalPulses.get(target)?.cancel();
      arrivalPulses.set(target, target.animate([
        {scale:'1'},{scale:phoneLayout.matches?'1.05':'1.012',offset:.4},{scale:'1'}
      ],{duration:380,easing:'ease-in-out'}));
    };
  }

  let selectionRingId = 0;
  function makeSelectionRing() {
    const id = `session-photo-ring-${++selectionRingId}`;
    const contour = $('#session-photo-contour').getAttribute('d');
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'selected-photo-ring');
    ring.setAttribute('viewBox', '0 0 100 100');
    ring.setAttribute('aria-hidden', 'true');
    // Fixed strokes preserve the same 5px clear gap at every card size.
    ring.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="300" height="300" style="mask-type:luminance"><path d="${contour}" fill="white" stroke="white" stroke-width="16" vector-effect="non-scaling-stroke"/><path d="${contour}" fill="black" stroke="black" stroke-width="10" vector-effect="non-scaling-stroke"/></mask></defs><rect x="-100" y="-100" width="300" height="300" fill="currentColor" mask="url(#${id})"/>`;
    return ring;
  }
  function makeImage(id) {
    const image = document.createElement('img');
    const photo = catalog.get(id);
    image.src = photo.src;
    image.alt = photo.alt;
    image.draggable = false;
    image.decoding = 'async';
    return image;
  }
  function renderPanel() {
    $('#workspace').classList.toggle('is-settings-open', settingsOpen);
    $('#mobile-session-name').textContent = state.name.trim() || 'Untitled session';
    $('#mobile-session-count').textContent = state.selected.length;
    $('#mobile-session-bar').setAttribute('aria-label', `${state.name.trim() || 'Untitled session'}, ${state.selected.length} images selected. Open session`);
    $('#session-title').textContent = settingsOpen ? 'Settings' : state.started ? (state.name.trim() || 'Untitled session') : 'New session';
    $('#welcome').hidden = state.started || settingsOpen;
    $('#session-content').hidden = !state.started || settingsOpen;
    $('#session-tools').hidden = !state.started;
    $('#session-footer').hidden = !state.started || settingsOpen;
    $('#settings-content').hidden = !settingsOpen;
    $('#settings-footer').hidden = !settingsOpen;
    $('#settings-done').textContent = state.setupStep === 'settings' ? 'Continue' : 'Done';
    $('#expand-session').hidden = settingsOpen && state.setupStep === 'settings';
    $('#session-settings').setAttribute('aria-expanded', String(settingsOpen));
    $('#session-settings').setAttribute('aria-label', settingsOpen ? 'Back to session' : 'Session settings');
    $('#session-settings').title = settingsOpen ? 'Back to session' : 'Session settings';
    $('#session-panel').classList.toggle('is-settings', settingsOpen);
    $('#current-question').textContent = $('#question-dialog').open
      ? $('#question-form input[name=question]:checked').value : state.question || 'Choose a question';
    $('#empty-selection').hidden = state.selected.length > 0;
    $('#selection-hint').hidden = state.selected.length === 0;
    $('#selection-hint').textContent = expanded ? 'Choose an image to talk about.' : 'Expand an image to discuss it.';
    $('#review-session').disabled = state.selected.length === 0;
    const container = $('#selected-images');
    // Keep existing card nodes so adding or removing an image never reanimates the whole list.
    [...container.children].forEach(card => {
      if (!state.selected.includes(card.dataset.id)) card.remove();
    });
    state.selected.forEach((id, index) => {
      if (!catalog.has(id)) return;
      let card = [...container.children].find(item => item.dataset.id === id);
      if (!card) {
        card = document.createElement('article');
        card.className = 'selected-card';
        card.dataset.id = id;
        const button = document.createElement('div');
        button.className = 'image-button';
        button.append(makeImage(id), makeSelectionRing());
        const toggleImageControls = () => {
          if (!phoneLayout.matches) return;
          const show = !card.classList.contains('controls-visible');
          container.querySelectorAll('.selected-card').forEach(item => {
            const visible = item === card && show;
            item.classList.toggle('controls-visible', visible);
            item.querySelector('.image-button').setAttribute('aria-expanded', String(visible));
          });
        };
        button.addEventListener('click', toggleImageControls);
        button.addEventListener('keydown', event => {
          if (phoneLayout.matches && ['Enter', ' '].includes(event.key)) {
            event.preventDefault(); toggleImageControls();
          }
        });
        const expand = document.createElement('button');
        expand.className = 'expand-image';
        expand.type = 'button';
        expand.setAttribute('aria-label', `Discuss ${catalog.get(id).alt.toLowerCase()}`);
        expand.innerHTML = icon('arrows');
        [...expand.querySelectorAll('.arrow-offset')].slice(0, 2).forEach(arrow => arrow.remove());
        expand.addEventListener('click', () => openDiscussion(id, expand));
        const badge = document.createElement('span');
        badge.className = 'number-badge';
        badge.setAttribute('aria-hidden', 'true');
        button.append(badge);
        const indicator = document.createElement('span');
        indicator.className = 'note-indicator';
        indicator.setAttribute('aria-label', 'Notes added');
        indicator.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 3-2Z" fill="currentColor"/><path d="M6 9h12M6 12h9" stroke="#354856" stroke-width="1.5" stroke-linecap="round"/></svg>';

        button.append(indicator);
        const remove = document.createElement('button');
        remove.className = 'icon icon-button trash remove-image';
        remove.setAttribute('aria-label', `Remove ${catalog.get(id).alt.toLowerCase()} from session`);
        remove.innerHTML = icon('trash');
        remove.addEventListener('click', () => requestImageRemoval(id, remove));
        card.append(button, expand, remove);
      }
      const imageControl = card.querySelector('.image-button');
      if (phoneLayout.matches) {
        imageControl.setAttribute('role', 'button');
        imageControl.tabIndex = 0;
        imageControl.setAttribute('aria-label', `Show controls for ${catalog.get(id).alt.toLowerCase()}`);
        imageControl.setAttribute('aria-expanded', String(card.classList.contains('controls-visible')));
      } else {
        ['role', 'tabindex', 'aria-label', 'aria-expanded'].forEach(attribute => imageControl.removeAttribute(attribute));
      }
      card.querySelector('.number-badge').textContent = index + 1;
      card.querySelector('.note-indicator').hidden = !String(state.notes[id] || '').trim();
      card.classList.toggle('is-active', activeImage === id);
      // append moves nodes into selection order without replacing them.
      container.append(card);
    });
  }

  $('#session-panel').addEventListener('pointerdown', event => {
    if (!phoneLayout.matches || event.target.closest('.selected-card')) return;
    $('#selected-images').querySelectorAll('.controls-visible').forEach(card => {
      card.classList.remove('controls-visible');
      card.querySelector('.image-button').setAttribute('aria-expanded', 'false');
    });
  });

  let armedRemove = null;
  let removeResetTimer;
  function cancelImageRemoval() {
    clearTimeout(removeResetTimer);
    if (!armedRemove) return;
    armedRemove.classList.remove('is-confirming');
    armedRemove.innerHTML = icon('trash');
    armedRemove.setAttribute('aria-label', armedRemove.dataset.originalLabel);
    armedRemove = null;
  }
  function requestImageRemoval(id, button) {
    if (armedRemove !== button) {
      cancelImageRemoval();
      armedRemove = button;
      button.dataset.originalLabel = button.getAttribute('aria-label');
      button.classList.add('is-confirming');
      button.innerHTML = '<span class="remove-label">Remove</span>';
      button.setAttribute('aria-label', `Confirm removal of ${catalog.get(id).alt.toLowerCase()}`);
      removeResetTimer = setTimeout(cancelImageRemoval, 5000);
      return;
    }
    const card = button.closest('.selected-card');
    const next = card.nextElementSibling || card.previousElementSibling;
    cancelImageRemoval();
    state.selected = state.selected.filter(imageId => imageId !== id);
    state.completed = false;
    save(); renderPanel(); sendSelection();
    (next?.querySelector('.expand-image') || $('#edit-question')).focus({preventScroll:true});
    announce('Image removed from the session.');
  }
  document.addEventListener('pointerdown', event => {
    if (armedRemove && !armedRemove.contains(event.target)) cancelImageRemoval();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && armedRemove) { event.preventDefault(); cancelImageRemoval(); }
  });

  const viewPositions = new WeakMap();
  const panelPositions = {collapsed:0,expanded:0};
  function captureViewPosition() {
    return {panel:sessionScroller.scrollTop,board:board.contentDocument?.querySelector('.viewport')?.scrollTop || 0};
  }
  function restoreViewPosition(position) {
    if (!position) return;
    sessionScroller.scrollTop = position.panel;
    const viewport = board.contentDocument?.querySelector('.viewport');
    if (viewport) viewport.scrollTop = position.board;
    updateScrollFades();
  }
  function openDialog(dialog, opener = document.activeElement) {
    viewPositions.set(dialog, captureViewPosition());
    dialogOpener = opener;
    dialogs.forEach(other => { if (other.open) other.close('switch'); });
    dialog.showModal();
    if (dialog.id === 'question-dialog') document.body.classList.add('question-selecting');
    // Announce the view before its controls; do not auto-focus a notes field
    // or a close button merely because it happens to be first in the markup.
    const heading = dialog.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function closeDialog(dialog) { if (dialog.open) dialog.close(); }
  dialogs.forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
    dialog.addEventListener('close', () => {
      if (dialog.id === 'discussion-dialog') {
        rememberNotesCursor();
        activeImage = null;
        renderPanel();
      }
      if (dialog.id === 'question-dialog') {
        document.body.classList.remove('question-selecting');
        renderPanel();
      }
      if (dialog.id === 'review-dialog') renderPanel();
      if (dialog.returnValue !== 'switch' && !dialogs.some(other => other.open)) {
        const position = viewPositions.get(dialog);
        requestAnimationFrame(() => restoreViewPosition(position));
        const mobileBoard = phoneLayout.matches && !expanded && !settingsOpen;
        const openerVisible = dialogOpener?.isConnected && dialogOpener.getClientRects().length && !dialogOpener.closest('[hidden]');
        if (!openerVisible && mobileBoard) showMobileSessionBar(true);
        const target = openerVisible ? dialogOpener : $(mobileBoard ? '#mobile-session-bar' : '#expand-session');
        target?.focus({ preventScroll: true });
      }
      dialog.returnValue = '';
    });
  });

  function startSession() {
    state.started = true;
    if (!state.name.trim()) state.name = defaultSessionName();
    if (state.setupStep === 'question') { openQuestionPicker(); return; }
    dialogs.forEach(dialog => { if (dialog.open) dialog.close('switch'); });
    state.setupStep = 'settings';
    expanded = true;
    applyExpansion();
    openSettings();
    save();
  }
  function requestNewSession() {
    if (state.started && (state.selected.length || state.name.trim() || state.sessionNotes)) {
      openDialog($('#confirm-dialog'));
    } else newSession();
  }
  function newSession() {
    closeDiscussion(false);
    archiveCurrent();
    state = freshSession();
    settingsOpen = false;
    expanded = false;
    applyExpansion();
    $('#selected-images').replaceChildren();
    startSession();
    sendSelection();
  }
  $('#start-session').addEventListener('click', startSession);
  const profileMenu = $('#profile-menu');
  let profileAnchor;
  function closeProfileMenu(restore = false) {
    profileMenu.hidden = true;
    document.querySelectorAll('[data-profile-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (restore) profileAnchor?.focus({preventScroll:true});
  }
  document.querySelectorAll('[data-profile-menu]').forEach(button => button.addEventListener('click', () => {
    const opening = profileMenu.hidden || profileAnchor !== button;
    closeProfileMenu();
    if (!opening) return;
    closeNewSessionMenu();
    profileAnchor = button;
    const rect = button.getBoundingClientRect();
    const mobile = button.classList.contains('mobile-profile');
    profileMenu.hidden = false;
    profileMenu.style.left = `${mobile ? Math.max(12, rect.left) : rect.right + 16}px`;
    profileMenu.style.top = `${Math.max(12, mobile ? rect.top - profileMenu.offsetHeight - 10 : rect.bottom - profileMenu.offsetHeight)}px`;
    button.setAttribute('aria-expanded', 'true');
    if (document.documentElement.dataset.input === 'keyboard') profileMenu.querySelector('button:not(:disabled):not(.profile-appearance)')?.focus();
  }));
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#profile-menu,[data-profile-menu]')) closeProfileMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !profileMenu.hidden) { event.preventDefault(); closeProfileMenu(true); }
  });
  window.addEventListener('resize', () => closeProfileMenu());
  window.addEventListener('blur', () => setTimeout(() => { if (document.activeElement === board) closeProfileMenu(); }, 0));
  $('#profile-logout').addEventListener('click', () => location.reload());
  const newSessionMenu = $('#new-session-menu');
  function closeNewSessionMenu(restoreFocus = false) {
    newSessionMenu.hidden = true;
    $('#new-session').setAttribute('aria-expanded', 'false');
    if (restoreFocus) $('#new-session').focus({ preventScroll: true });
  }
  $('#new-session').addEventListener('click', () => {
    const opening = newSessionMenu.hidden;
    newSessionMenu.hidden = !opening;
    $('#new-session').setAttribute('aria-expanded', String(opening));
    if (opening && document.documentElement.dataset.input === 'keyboard') $('#new-session-choice').focus();
  });
  $('#new-session-choice').addEventListener('click', () => {
    closeNewSessionMenu(true);
    requestNewSession();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.new-session-control')) closeNewSessionMenu();
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest('.new-session-control')) closeNewSessionMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !newSessionMenu.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeNewSessionMenu(true);
    }
  });
  // Pointer events inside an iframe do not bubble to the surrounding page.
  window.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement === board) closeNewSessionMenu(); }, 0);
  });
  $('#confirm-new').addEventListener('click', newSession);
  $('#complete-new').addEventListener('click', newSession);
  function previewQuestion() {
    const choice = $('#question-form input[name=question]:checked').value;
    $('#question-preview').value = choice;
    $('#current-question').textContent = choice;
  }
  function openQuestionPicker() {
    closeDiscussion(false);
    if (expanded) { expanded = false; applyExpansion(); }
    const choices = [...document.querySelectorAll('#question-form input[name=question]')];
    const choice = choices.find(input => input.value === state.question) || choices[0];
    choice.checked = true;
    openDialog($('#question-dialog'), $('#edit-question'));
    previewQuestion();
  }
  $('#edit-question').addEventListener('click', openQuestionPicker);
  $('#question-form').addEventListener('change', previewQuestion);
  $('#question-form').addEventListener('submit', event => {
    event.preventDefault();
    state.question = $('#question-form input[name=question]:checked').value;
    state.setupStep = 'complete';
    save();
    closeDialog($('#question-dialog'));
    renderPanel();
    announce('Question selected. Choose images from the board.');
    if (phoneLayout.matches) { showMobileSessionBar(true); $('#mobile-session-bar').focus({ preventScroll: true }); }
  });

  function applyExpansion() {
    $('#workspace').classList.toggle('is-expanded', expanded);
    $('#mobile-session-bar').setAttribute('aria-expanded', String(expanded));
    setMobileControls(false);
    if (!expanded) showMobileSessionBar(true);
    $('#expand-session').setAttribute('aria-expanded', String(expanded));
    $('#expand-session').setAttribute('aria-label', expanded ? 'Collapse session' : 'Expand session');
    $('#expand-session').title = expanded ? 'Collapse session' : 'Expand session';
    $('#back-to-board').hidden = !expanded;
    $('#image-board').inert = expanded;
    $('#selection-hint').textContent = expanded ? 'Choose an image to talk about.' : 'Expand an image to discuss it.';
  }
  function toggleExpansion() {
    if (activeImage) { closeDiscussion(); return; }
    panelPositions[expanded ? 'expanded' : 'collapsed'] = sessionScroller.scrollTop;
    const boardPosition = captureViewPosition().board;
    const cards = [...$('#selected-images').children];
    const before = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    expanded = !expanded;
    applyExpansion();
    requestAnimationFrame(() => restoreViewPosition({panel:panelPositions[expanded ? 'expanded' : 'collapsed'],board:boardPosition}));
    if (phoneLayout.matches) {
      $(expanded ? '#expand-session' : '#mobile-session-bar').focus({ preventScroll: true });
    }
    if (!reduced.matches) {
      // FLIP preserves the cards' positions while the sidebar grows into the session.
      requestAnimationFrame(() => {
        cards.forEach(card => {
          const from = before.get(card), to = card.getBoundingClientRect();
          if (!from.width || !to.width) return;
          card.animate([
            { transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`, transformOrigin: 'top left' },
            { transform: 'none', transformOrigin: 'top left' }
          ], { duration: 560, easing: 'cubic-bezier(.22,.75,.25,1)' });
        });
      });
    }
  }
  $('#expand-session').addEventListener('click', toggleExpansion);
  $('#back-to-board').addEventListener('click', toggleExpansion);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeImage && !dialogs.some(dialog => dialog.open)) {
      event.preventDefault(); closeDiscussion();
    } else if (event.key === 'Escape' && settingsOpen && !dialogs.some(dialog => dialog.open)) {
      event.preventDefault();
      closeSettings();
    } else if (event.key === 'Escape' && expanded && !dialogs.some(dialog => dialog.open)) {
      toggleExpansion();
      if (!phoneLayout.matches) $('#expand-session').focus();
    }
  });

  const notesCursors = new Map();
  function rememberNotesCursor() {
    if (!activeImage) return;
    const field = $('#image-notes');
    notesCursors.set(activeImage,{start:field.selectionStart,end:field.selectionEnd,scroll:field.scrollTop});
  }
  function restoreNotesCursor() {
    const cursor = notesCursors.get(activeImage);
    if (!cursor) return;
    const field = $('#image-notes');
    field.setSelectionRange(cursor.start,cursor.end);
    field.scrollTop = cursor.scroll;
  }
  function updateNotesIndicator() {
    const hasNotes = Boolean(String(state.notes[activeImage] || '').trim());
    $('#toggle-notes').classList.toggle('has-content',hasNotes);
    $('#toggle-notes').setAttribute('aria-label',hasNotes ? 'Notes — notes added' : 'Notes');
    $('#discussion-note-indicator').hidden = !hasNotes;
  }
  function openDiscussion(id, opener) {
    const from = (opener?.closest('.selected-card')?.querySelector('img') || opener?.querySelector('img'))?.getBoundingClientRect();
    activeImage = id;
    const image = catalog.get(id);
    $('#discussion-image').src = image.src;
    $('#discussion-image').alt = image.alt;
    $('#image-notes').value = String(state.notes[id] || '');
    restoreNotesCursor(); updateNotesIndicator();
    setNotesVisible(Boolean($('#image-notes').value.trim()), false);
    renderPanel();
    const dialog = $('#discussion-dialog');
    openDialog(dialog, opener);
    updateDiscussionNavigation();
    if (from?.width && !reduced.matches) {
      // Use the original thumbnail's screen position as the starting frame.
      dialog.getAnimations().forEach(animation => animation.cancel());
      const hero = $('#discussion-image');
      const to = hero.getBoundingClientRect();
      hero.animate([
        {transformOrigin:'top left', transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},
        {transformOrigin:'top left', transform:'none'}
      ], {duration:480,easing:'cubic-bezier(.22,.75,.25,1)'});
      $('#discussion-dialog .discussion-actions').animate([{opacity:0},{opacity:1}],{duration:360,delay:120,fill:'backwards'});
    }
  }
  function updateDiscussionNavigation() {
    const multiple = state.selected.length > 1;
    $('#discussion-prev').hidden = $('#discussion-next').hidden = !multiple;
    $('#discussion-position').textContent = multiple ? `${state.selected.indexOf(activeImage) + 1} of ${state.selected.length}` : '';
    $('#discussion-position').hidden = !multiple;
    positionDiscussionNotes();
  }
  function navigateDiscussion(direction, swipe = false) {
    if (state.selected.length < 2) return;
    rememberNotesCursor();
    const index = state.selected.indexOf(activeImage);
    activeImage = state.selected[(index + direction + state.selected.length) % state.selected.length];
    const photo = catalog.get(activeImage);
    const hero = $('#discussion-image');
    hero.src = photo.src;
    hero.alt = photo.alt;
    $('#image-notes').value = String(state.notes[activeImage] || '');
    restoreNotesCursor(); updateNotesIndicator();
    renderPanel();
    updateDiscussionNavigation();
    if (!reduced.matches) {
      hero.getAnimations().forEach(animation => animation.cancel());
      hero.animate([{opacity:.4,transform:`translateX(${direction * (swipe ? 64 : 16)}px)`},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.22,.75,.25,1)'});
    }
  }
  $('#discussion-prev').addEventListener('click', () => navigateDiscussion(-1));
  $('#discussion-next').addEventListener('click', () => navigateDiscussion(1));
  $('#discussion-dialog').addEventListener('keydown', event => {
    if (event.target.closest('textarea,input') || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); navigateDiscussion(event.key === 'ArrowRight' ? 1 : -1);
  });
  let swipeStart = null;
  const swipeHero = $('#discussion-image');
  function resetDiscussionDrag(animate = false) {
    const transform = swipeHero.style.transform;
    const opacity = swipeHero.style.opacity;
    swipeHero.style.removeProperty('transform');
    swipeHero.style.removeProperty('opacity');
    if (animate && transform && !reduced.matches) swipeHero.animate([
      {transform,opacity},{transform:'none',opacity:1}
    ],{duration:300,easing:'cubic-bezier(.22,.75,.25,1)'});
    swipeStart = null;
  }
  swipeHero.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary || state.selected.length < 2) return;
    swipeHero.getAnimations().forEach(animation => animation.cancel());
    resetDiscussionDrag();
    swipeStart = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};
    swipeHero.setPointerCapture(event.pointerId);
  });
  swipeHero.addEventListener('pointermove', event => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
    if (!swipeStart.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { resetDiscussionDrag(); return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      swipeStart.horizontal = true;
    }
    swipeStart.dx = dx;
    if (!reduced.matches) {
      const distance = Math.max(-swipeHero.clientWidth * .6, Math.min(swipeHero.clientWidth * .6, dx));
      swipeHero.style.transform = `translateX(${distance}px)`;
      swipeHero.style.opacity = String(1 - Math.min(.25, Math.abs(distance) / swipeHero.clientWidth * .4));
    }
  });
  swipeHero.addEventListener('pointerup', event => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const {dx,horizontal} = swipeStart;
    const commit = horizontal && Math.abs(dx) > Math.min(64, swipeHero.clientWidth * .2);
    resetDiscussionDrag(!commit);
    if (commit) navigateDiscussion(dx < 0 ? 1 : -1, true);
  });
  swipeHero.addEventListener('pointercancel', () => resetDiscussionDrag(true));
  swipeHero.addEventListener('lostpointercapture', () => { if (swipeStart) resetDiscussionDrag(true); });
  $('#discussion-dialog').addEventListener('close', () => resetDiscussionDrag());
  let discussionClosing = false;
  function closeDiscussion() {
    const dialog = $('#discussion-dialog');
    if (!dialog.open || discussionClosing) return;
    rememberNotesCursor();
    if (reduced.matches) { closeDialog(dialog); return; }
    discussionClosing = true;
    resetDiscussionDrag();
    const hero = $('#discussion-image');
    const from = hero.getBoundingClientRect();
    let target;
    if (dialogOpener === board) {
      const source = [...board.contentDocument.querySelectorAll('.photo')].find(cell => cell.dataset.image === activeImage)?.querySelector('img');
      if (source) {
        const rect = source.getBoundingClientRect(), frame = board.getBoundingClientRect();
        target = {left:rect.left+frame.left,top:rect.top+frame.top,width:rect.width,height:rect.height};
      }
    } else {
      const source = [...$('#selected-images').children].find(card => card.dataset.id === activeImage)?.querySelector('img');
      if (source) {
        const rect = source.getBoundingClientRect(), viewport = sessionScroller.getBoundingClientRect();
        if (rect.top >= viewport.top && rect.bottom <= viewport.bottom) target = rect;
      }
    }
    const visible = target?.width && target.top >= 0 && target.top + target.height <= window.innerHeight;
    dialog.classList.add('is-closing');
    hero.getAnimations().forEach(animation => animation.cancel());
    const animation = hero.animate([
      {transformOrigin:'top left',transform:'none',opacity:1},
      {transformOrigin:'top left',transform:visible ? `translate(${target.left-from.left}px,${target.top-from.top}px) scale(${target.width/from.width},${target.height/from.height})` : 'scale(.98)',opacity:visible ? .25 : 0}
    ],{duration:360,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    const finish = () => {
      closeDialog(dialog); animation.cancel(); dialog.classList.remove('is-closing'); discussionClosing = false;
    };
    animation.finished.then(finish, () => { discussionClosing = false; dialog.classList.remove('is-closing'); });
  }
  $('#discussion-dialog').addEventListener('cancel', event => { event.preventDefault(); closeDiscussion(); });
  let notesAnimation;
  let notesContentAnimation;
  function setNotesVisible(visible, focus = true) {
    const surface = $('#discussion-dialog .discussion-actions');
    const field = $('#notes-field');
    const from = surface.getBoundingClientRect();
    notesAnimation?.cancel();
    notesContentAnimation?.cancel();
    $('#discussion-dialog').classList.toggle('has-notes', visible);
    $('#toggle-notes').setAttribute('aria-expanded', String(visible));
    field.inert = !visible;
    field.hidden = !visible;
    if (visible) restoreNotesCursor();
    updateNotesIndicator();
    if (focus && !reduced.matches) {
      const to = surface.getBoundingClientRect();
      notesAnimation = surface.animate([
        {width:`${from.width}px`,height:`${from.height}px`},
        {width:`${to.width}px`,height:`${to.height}px`}
      ], {duration:420,easing:'cubic-bezier(.22,.75,.25,1)'});
      if (visible) notesContentAnimation = field.animate([
        {opacity:0,transform:'translateY(-6px)'},
        {opacity:1,transform:'none'}
      ], {duration:260,delay:100,fill:'backwards',easing:'ease-out'});
    }
    if (visible && focus && document.documentElement.dataset.input === 'keyboard') {
      $('#image-notes').focus({ preventScroll: true });
    }
  }
  $('#image-notes').addEventListener('blur', rememberNotesCursor);
  $('#image-notes').addEventListener('select', rememberNotesCursor);
  $('#toggle-notes').addEventListener('click', () => {
    const opening = $('#toggle-notes').getAttribute('aria-expanded') !== 'true';
    if (!opening) rememberNotesCursor();
    setNotesVisible(opening);
  });
  $('#notes-done').addEventListener('click', () => {
    $('#toggle-notes').focus({ preventScroll: true });
    setNotesVisible(false);
    renderPanel();
    if (String(state.notes[activeImage] || '').trim()) {
      announce('Notes added to this image.');
      if (!reduced.matches) $('#discussion-note-indicator').animate([{opacity:0,scale:'.85'},{opacity:1,scale:'1'}],{duration:250,easing:'ease-out'});
    }
  });
  function positionDiscussionNotes() {
    const image = $('#discussion-image');
    const dialog = $('#discussion-dialog');
    dialog.style.setProperty('--notes-left', `${image.parentElement.offsetLeft + image.offsetLeft + image.offsetWidth + (window.innerWidth <= 600 ? 10 : 20)}px`);
    dialog.style.setProperty('--notes-top', `${image.parentElement.offsetTop + image.offsetTop}px`);
    dialog.style.setProperty('--hero-left', `${image.parentElement.offsetLeft + image.offsetLeft}px`);
    dialog.style.setProperty('--hero-width', `${image.offsetWidth}px`);
    dialog.style.setProperty('--hero-bottom', `${image.parentElement.offsetTop + image.offsetTop + image.offsetHeight}px`);
    dialog.style.setProperty('--hero-middle', `${image.parentElement.offsetTop + image.offsetTop + image.offsetHeight / 2}px`);
    const rightSpace = window.innerWidth - dialog.offsetLeft - image.parentElement.offsetLeft - image.offsetLeft - image.offsetWidth - 36;
    dialog.style.setProperty('--notes-width', `${Math.max(104, Math.min(440, rightSpace))}px`);
  }
  const discussionResize = new ResizeObserver(positionDiscussionNotes);
  discussionResize.observe($('#discussion-image'));
  discussionResize.observe($('#discussion-dialog .discussion-image'));
  $('#discussion-image').addEventListener('load', positionDiscussionNotes);
  const protectedDiscussionTarget = target => target.closest('#discussion-image, .discussion-actions, .discussion-nav');
  let discussionOutsidePress = false;
  $('#discussion-dialog').addEventListener('pointerdown', event => {
    discussionOutsidePress = !protectedDiscussionTarget(event.target);
  });
  $('#discussion-dialog').addEventListener('click', event => {
    if (discussionOutsidePress && !protectedDiscussionTarget(event.target)) closeDiscussion();
    discussionOutsidePress = false;
  });
  $('#image-notes').addEventListener('input', event => {
    if (!activeImage) return;
    state.notes[activeImage] = event.target.value;
    updateNotesIndicator();
    state.completed = false;
    save();
  });

  $('#session-settings').addEventListener('click', () => {
    if (settingsOpen) { closeSettings(); return; }
    openSettings();
  });
  function openSettings() {
    closeDiscussion(false);
    $('#settings-name').value = state.name;
    $('#client-name').value = state.client;
    $('#session-notes').value = state.sessionNotes;
    document.querySelectorAll('input[name=profile]').forEach(input => { input.checked = input.value === state.profile; });
    settingsOpen = true;
    setMobileControls(false);
    renderPanel();
  }
  function closeSettings() {
    if (state.setupStep === 'settings') {
      state.started = false;
      expanded = false;
      applyExpansion();
      save();
    }
    settingsOpen = false;
    renderPanel();
    const returnToBoard = phoneLayout.matches && !expanded;
    if (returnToBoard) showMobileSessionBar(true);
    $(returnToBoard ? '#mobile-session-bar' : state.started ? '#session-settings' : '#start-session').focus({ preventScroll: true });
  }
  $('#settings-done').addEventListener('click', () => {
    if (state.setupStep !== 'settings') { closeSettings(); return; }
    if (!state.name.trim()) state.name = defaultSessionName();
    state.setupStep = 'question';
    settingsOpen = false;
    expanded = false;
    applyExpansion();
    save();
    renderPanel();
    openQuestionPicker();
  });
  [['#settings-name','name'],['#client-name','client'],['#session-notes','sessionNotes']].forEach(([selector, key]) => {
    $(selector).addEventListener('input', event => {
      state[key] = event.target.value;
      save();
      if (key === 'name' && !settingsOpen) $('#session-title').textContent = state.name.trim() || 'Untitled session';
    });
  });
  document.querySelectorAll('input[name=profile]').forEach(input => input.addEventListener('change', () => {
    state.profile = input.value; save();
  }));

  function openReview() {
    if (!state.selected.length) return;
    $('#review-question').textContent = state.question;
    $('#review-name').value = state.name;
    $('#review-summary').value = state.summary;
    $('#name-error').hidden = true;
    $('#review-name').removeAttribute('aria-invalid');
    $('#review-images').replaceChildren();
    state.selected.forEach((id, index) => {
      const row = document.createElement('div');
      row.className = 'review-image-row';
      const label = document.createElement('label');
      label.className = 'sr-only';
      label.htmlFor = `review-note-${index}`;
      label.textContent = `Insights for image ${index + 1}: ${catalog.get(id).alt}`;
      const notes = document.createElement('textarea');
      notes.id = label.htmlFor;
      notes.value = String(state.notes[id] || '');
      notes.placeholder = 'Add insights';
      notes.addEventListener('input', () => { state.notes[id] = notes.value; state.completed = false; save(); });
      row.append(makeImage(id), label, notes);
      $('#review-images').append(row);
    });
    renderActions();
    openDialog($('#review-dialog'));
  }
  $('#review-session').addEventListener('click', openReview);
  $('#reopen-review').addEventListener('click', openReview);
  $('#review-name').addEventListener('input', event => {
    state.name = event.target.value;
    if (state.name.trim()) { $('#name-error').hidden = true; event.target.removeAttribute('aria-invalid'); }
    save(); renderPanel();
  });
  $('#review-summary').addEventListener('input', event => { state.summary = event.target.value; save(); });
  function renderActions() {
    const list = $('#review-actions');
    list.replaceChildren();
    state.actions.forEach((value, index) => {
      const row = document.createElement('div');
      row.className = 'action-row';
      const input = document.createElement('input');
      input.type = 'text'; input.maxLength = 240;
      input.value = String(value);
      input.placeholder = 'What will you do next?';
      input.setAttribute('aria-label', `Action ${index + 1}`);
      input.addEventListener('input', () => { state.actions[index] = input.value; save(); });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon icon-button trash';
      remove.innerHTML = icon('trash');
      remove.setAttribute('aria-label', `Remove action ${index + 1}`);
      remove.addEventListener('click', () => { state.actions.splice(index, 1); save(); renderActions(); $('#add-action').focus(); });
      row.append(input, remove);
      list.append(row);
    });
  }
  $('#add-action').addEventListener('click', () => {
    state.actions.push(''); save(); renderActions();
    $('#review-actions').lastElementChild.querySelector('input').focus();
  });
  $('#review-form').addEventListener('submit', event => {
    event.preventDefault();
    state.name = $('#review-name').value.trim();
    if (!state.name) {
      $('#name-error').hidden = false;
      $('#review-name').setAttribute('aria-invalid', 'true');
      $('#review-name').focus();
      return;
    }
    state.actions = state.actions.map(action => String(action).trim()).filter(Boolean);
    state.completed = true;
    save();
    archiveCurrent();
    renderPanel();
    $('#complete-title').textContent = state.name;
    const count = state.selected.length;
    const notes = state.selected.filter(id => String(state.notes[id] || '').trim()).length;
    $('#complete-detail').textContent = `${count} ${count === 1 ? 'image' : 'images'} explored${notes ? ` · ${notes} with notes` : ''}${state.actions.length ? ` · ${state.actions.length} ${state.actions.length === 1 ? 'action' : 'actions'}` : ''}`;
    $('#complete-images').replaceChildren(...state.selected.slice(0, 6).map(makeImage));
    openDialog($('#complete-dialog'));
    announce('Session complete. Entries are temporary and will be lost when you refresh or close this page.');
  });

  $('#saved-sessions').addEventListener('click', () => {
    const list = $('#saved-list');
    list.replaceChildren();
    const sessions = state.started ? [state, ...history.filter(item => item.id !== state.id)] : history;
    if (!sessions.length) {
      const message = document.createElement('p');
      message.className = 'muted';
      message.textContent = 'Your sessions will appear here. Start a new session using the + button.';
      list.append(message);
    }
    sessions.forEach(session => {
      const button = document.createElement('button');
      button.className = 'saved-session';
      const first = session.selected.find(id => catalog.has(id));
      if (first) button.append(makeImage(first));
      const text = document.createElement('span');
      text.textContent = session.name.trim() || 'Untitled session';
      const detail = document.createElement('small');
      detail.textContent = `${session.completed ? 'Complete' : 'In progress'} · ${session.selected.length} ${session.selected.length === 1 ? 'image' : 'images'}`;
      text.append(detail);
      button.append(text);
      button.addEventListener('click', () => {
        if (session.id !== state.id) archiveCurrent();
        state = structuredClone(session);
        settingsOpen = false;
        state.selected = state.selected.filter(id => catalog.has(id));
        expanded = false; applyExpansion();
        $('#selected-images').replaceChildren();
        save(); renderPanel(); sendSelection();
        closeDialog($('#saved-dialog'));
        resumeSetup();
      });
      list.append(button);
    });
    openDialog($('#saved-dialog'));
  });
  function resumeSetup() {
    if (state.started && state.setupStep === 'settings') {
      expanded = true;
      applyExpansion();
      openSettings();
    } else if (state.started && state.setupStep === 'question') openQuestionPicker();
  }
  $('#prototype-continue').addEventListener('click', () => closeDialog($('#prototype-intro')));
  $('#prototype-intro').addEventListener('close', () => {
    $('#new-session').focus({ preventScroll: true });
  });
  renderPanel();
  openDialog($('#prototype-intro'), $('#new-session'));
  board.contentWindow.postMessage({ type: 'ii-session-connect' }, location.origin);
})();

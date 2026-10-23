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
  function updateVisibleScreen() {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--view-top', `${viewport?.offsetTop || 0}px`);
    const boardEditing = document.activeElement === board && board.contentDocument?.activeElement?.matches('input');
    const editing = document.activeElement?.matches('input, textarea') || boardEditing;
    document.body.classList.toggle('board-editing', Boolean(boardEditing));
    document.body.classList.toggle('keyboard-open', Boolean(editing && window.innerHeight - height > 120));
  }
  window.visualViewport?.addEventListener('resize', updateVisibleScreen);
  window.visualViewport?.addEventListener('scroll', updateVisibleScreen);
  window.addEventListener('resize', updateVisibleScreen);
  document.addEventListener('focusin', updateVisibleScreen);
  document.addEventListener('focusout', updateVisibleScreen);
  updateVisibleScreen();

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
      announce(`${selected ? 'Removed' : 'Added'} ${catalog.get(id).alt.toLowerCase()}. ${state.selected.length} images selected.`);
    }
  });

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

  function openDialog(dialog, opener = document.activeElement) {
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
        activeImage = null;
        renderPanel();
      }
      if (dialog.id === 'question-dialog') {
        document.body.classList.remove('question-selecting');
        renderPanel();
      }
      if (dialog.returnValue !== 'switch' && !dialogs.some(other => other.open)) {
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
    const cards = [...$('#selected-images').children];
    const before = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    expanded = !expanded;
    applyExpansion();
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

  function openDiscussion(id, opener) {
    const from = (opener?.closest('.selected-card')?.querySelector('img') || opener?.querySelector('img'))?.getBoundingClientRect();
    activeImage = id;
    const image = catalog.get(id);
    $('#discussion-image').src = image.src;
    $('#discussion-image').alt = image.alt;
    $('#image-notes').value = String(state.notes[id] || '');
    setNotesVisible(Boolean($('#image-notes').value.trim()), false);
    renderPanel();
    const dialog = $('#discussion-dialog');
    openDialog(dialog, opener);
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
  function closeDiscussion() {
    closeDialog($('#discussion-dialog'));
  }
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
  $('#toggle-notes').addEventListener('click', () => setNotesVisible($('#toggle-notes').getAttribute('aria-expanded') !== 'true'));
  $('#notes-done').addEventListener('click', () => {
    $('#toggle-notes').focus({ preventScroll: true });
    setNotesVisible(false);
  });
  function positionDiscussionNotes() {
    const image = $('#discussion-image');
    const dialog = $('#discussion-dialog');
    dialog.style.setProperty('--notes-left', `${image.parentElement.offsetLeft + image.offsetLeft + image.offsetWidth + (window.innerWidth <= 600 ? 10 : 20)}px`);
    dialog.style.setProperty('--notes-top', `${image.parentElement.offsetTop + image.offsetTop}px`);
    const rightSpace = window.innerWidth - dialog.offsetLeft - image.parentElement.offsetLeft - image.offsetLeft - image.offsetWidth - 36;
    dialog.style.setProperty('--notes-width', `${Math.max(104, Math.min(440, rightSpace))}px`);
  }
  const discussionResize = new ResizeObserver(positionDiscussionNotes);
  discussionResize.observe($('#discussion-image'));
  discussionResize.observe($('#discussion-dialog .discussion-image'));
  $('#discussion-image').addEventListener('load', positionDiscussionNotes);
  const protectedDiscussionTarget = target => target.closest('#discussion-image, .discussion-actions');
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

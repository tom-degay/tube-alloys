/* Shared collapsing identity navigation for tomdegay.com.
   The original HTML menu supplies the links and remains a fallback. */
(() => {
  const doc = document;
  const win = window;
  const pagePath = win.location.pathname;
  const source = doc.querySelector('.site-nav');
  if (!source || doc.querySelector('.identity-nav') ||
      typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
  const nav = doc.createElement('nav');
  nav.className = 'identity-nav'; nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = '<div class="identity-bar"><div class="identity-brand"></div><button class="identity-toggle" type="button" aria-expanded="false" aria-controls="identity-links" aria-haspopup="dialog">Menu</button></div>';
  const links = doc.createElement('div');
  links.className = 'identity-links'; links.id = 'identity-links';
  const sections = [];
  [['Case studies', '/case-studies', 'Case Studies'], ['Approach', '/#approach-heading', 'Approach'], ['About', '/about'], ['Contact', '/contact']].forEach(([label, href, sourceLabel]) => {
    const sourceItem = [...source.querySelectorAll('.nav-item')].find(item => {
      const heading = item.querySelector(':scope > a');
      return heading && heading.textContent.trim() === sourceLabel;
    });
    const cards = sourceItem ? [...sourceItem.querySelectorAll('.nav-dropdown-card')] : [];
    if (!cards.length) {
      const link = doc.createElement('a');
      link.className = 'menu-primary'; link.textContent = label; link.href = href; links.append(link);
      return;
    }
    const section = doc.createElement('div'); section.className = 'menu-section';
    const trigger = doc.createElement('button');
    trigger.type = 'button'; trigger.className = 'menu-primary menu-section-toggle'; trigger.textContent = label;
    const panel = doc.createElement('div');
    const sectionId = label.toLowerCase().replace(/\s+/g, '-');
    panel.className = 'menu-subsections menu-subsections--' + sectionId;
    panel.id = 'menu-' + sectionId; panel.inert = true; panel.setAttribute('aria-hidden', 'true');
    const clip = doc.createElement('div'); clip.className = 'menu-subsections-clip';
    const grid = doc.createElement('div'); grid.className = 'menu-subsections-grid';
    clip.append(grid); panel.append(clip);
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', panel.id);
    // Read the existing site menu so titles, routes and ordering stay in sync.
    cards.forEach((card, index) => {
      if (card.previousElementSibling && card.previousElementSibling.classList.contains('nav-dropdown-divider')) {
        const divider = doc.createElement('hr'); divider.className = 'menu-subsection-divider'; grid.append(divider);
      }
      const item = doc.createElement('div'); item.className = 'menu-subsection-item';
      item.style.setProperty('--entry-delay', (60 + index * 35) + 'ms');
      const link = doc.createElement('a'); link.href = card.getAttribute('href');
      const sourceIcon = card.querySelector('.nav-dropdown-card-kicker-icon');
      const iconSrc = sourceIcon && sourceIcon.getAttribute('src');
      if (iconSrc) {
        const icon = doc.createElement('img'); icon.className = 'menu-subsection-icon';
        icon.src = iconSrc + (iconSrc.endsWith('/feeds.svg') ? '?v=2' : '');
        icon.alt = ''; icon.width = 16; icon.height = 16; link.append(icon);
      }
      const copy = doc.createElement('span'); copy.className = 'menu-subsection-copy';
      const kicker = card.querySelector('.nav-dropdown-card-kicker');
      if (kicker) {
        const overline = doc.createElement('span'); overline.className = 'menu-subsection-kicker';
        overline.textContent = kicker.textContent.trim(); copy.append(overline);
      }
      const title = doc.createElement('span'); title.className = 'menu-subsection-title';
      const sourceTitle = card.querySelector('.nav-dropdown-card-title');
      title.textContent = (sourceTitle || card).textContent.trim();
      copy.append(title); link.append(copy); item.append(link); grid.append(item);
    });
    const entry = {trigger, panel}; sections.push(entry);
    trigger.addEventListener('click', () => {
      const expand = trigger.getAttribute('aria-expanded') !== 'true';
      sections.forEach(item => {
        const active = item === entry && expand;
        setExpanded(item, active);
      });
    });
    section.append(trigger, panel); links.append(section);
  });
  function setExpanded({trigger, panel}, active) {
    trigger.setAttribute('aria-expanded', String(active));
    panel.classList.toggle('is-expanded', active);
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  }
  source.after(nav);
  const toggle = nav.querySelector('.identity-toggle');
  const brand = nav.querySelector('.identity-brand');
  const isCaseStudy = /^\/case-studies\/(?!index(?:\.html)?$)[^/]+/.test(pagePath);
  const contextTitle = isCaseStudy ? doc.title.trim() : 'Product design';
  nav.classList.toggle('identity-case-study', isCaseStudy);
  brand.innerHTML = '<a class="identity-name" href="/">Tom de Gay</a><span class="identity-role"><span aria-hidden="true"> / </span><span class="identity-context"></span></span>';
  brand.querySelector('.identity-context').textContent = contextTitle;
  const dialog = doc.createElement('dialog');
  dialog.className = 'identity-dialog'; dialog.setAttribute('aria-label', 'Site navigation');
  const header = doc.createElement('div'); header.className = 'identity-dialog-top';
  header.append(brand.cloneNode(true));
  const dismiss = doc.createElement('button'); dismiss.className = 'identity-close'; dismiss.type = 'button'; dismiss.textContent = 'Close';
  // Keep initial dialog focus on the control that opened it, not the identity link.
  dismiss.autofocus = true;
  const menuBody = doc.createElement('div'); menuBody.className = 'menu-body';
  menuBody.append(links);
  header.append(dismiss); dialog.append(header, menuBody); nav.append(dialog);
  nav.querySelectorAll('.identity-name').forEach(name => {
    const label = name.textContent;
    name.setAttribute('aria-label', label);
    name.replaceChildren(...Array.from(label, (character, index) => {
      const letter = doc.createElement('span');
      letter.className = 'identity-name-letter'; letter.textContent = character;
      letter.setAttribute('aria-hidden', 'true');
      letter.style.setProperty('--letter-index', index);
      return letter;
    }));
    function flipName() {
      if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      name.classList.add('is-flipping');
    }
    name.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && win.matchMedia('(hover: hover)').matches) flipName();
    });
    name.addEventListener('focus', () => { if (name.matches(':focus-visible')) flipName(); });
    // Finish the whole wave even if the pointer leaves part-way through it.
    function finishFlip(event) {
      if (event.animationName === 'identity-letter-flip' && event.target === name.lastElementChild) name.classList.remove('is-flipping');
    }
    name.addEventListener('animationend', finishFlip);
    name.addEventListener('animationcancel', finishFlip);
  });
  dismiss.addEventListener('click', () => close(true));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(true); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(true); });
  links.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  const iconMarkup = '<span class="menu-icon" aria-hidden="true"><span></span><span></span></span>';
  toggle.innerHTML = '<span class="menu-label">Menu</span>' + iconMarkup;
  dismiss.innerHTML = '<span class="menu-label">Close</span>' + iconMarkup;
  toggle.setAttribute('aria-haspopup', 'dialog');
  function sync() {
    const open = dialog.open;
    links.hidden = !open;
    if (!open) sections.forEach(item => setExpanded(item, false));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('identity-open', open);
    doc.documentElement.classList.toggle('identity-menu-open', open);
  }
  function close(restoreFocus = false) {
    if (dialog.open) dialog.close();
    sync();
    if (restoreFocus) toggle.focus({preventScroll: true});
  }
  nav.addEventListener('pointerdown', () => nav.classList.add('pointer-navigation'));
  toggle.addEventListener('click', () => {
    if (dialog.open) close(true);
    else {
      // Reveal the links before the browser moves focus into the modal.
      links.hidden = false;
      dialog.showModal();
      sync();
    }
  });
  doc.addEventListener('click', event => { if (!nav.contains(event.target)) close(); });
  doc.addEventListener('keydown', event => {
    nav.classList.remove('pointer-navigation');
  });
  // Native modal focus management handles Tab and Escape; a deferred
  // focusout close can race with the next click when focus is restored.
  dialog.addEventListener('close', sync);
  win.addEventListener('resize', () => close());
  const currentPath = pagePath.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
  function markCurrent() {
    links.querySelectorAll('a').forEach(link => {
      const url = new URL(link.href);
      const matches = url.hash ? url.pathname === currentPath && url.hash === win.location.hash : url.pathname === currentPath;
      if (matches) link.setAttribute('aria-current', url.hash ? 'location' : 'page');
      else link.removeAttribute('aria-current');
    });
  }
  markCurrent();
  win.addEventListener('hashchange', markCurrent);
  sync();
  let compact = false;
  function updateScrollState() {
    if (dialog.open) return;
    // Separate thresholds avoid flickering when scrolling near the boundary.
    const next = compact ? win.scrollY > 32 : win.scrollY > 96;
    if (next === compact) return;
    compact = next;
    nav.classList.toggle('is-compact', compact);
    if (compact && brand.contains(doc.activeElement)) toggle.focus({preventScroll: true});
    brand.inert = compact;
    brand.setAttribute('aria-hidden', String(compact));
  }
  win.addEventListener('scroll', updateScrollState, {passive: true});
  dialog.addEventListener('close', updateScrollState);
  updateScrollState();
  doc.body.dataset.navigation = 'identity';
})();

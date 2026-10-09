/* Shared lightbox for tomdegay.com.
   Loaded by every page that has #lightbox: wayfinding, ai, design-craft and
   the six case studies. It handles three sources of content:

     .figure img       one page-wide list; prev/next cycles through it
     .gallery          each gallery is its own list, with thumbs and a dissolve
     .ui-video-expand  opens that video in the same modal (no prev/next)

   A .ui-video carrying data-hover-controls reveals the native player controls
   on hover, inline and in the lightbox, on pointer devices only. That replaces
   an earlier hard-coded filename check -- mark the markup, not the script. */
(function () {
  var lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  var lightboxImg = lightbox.querySelector("img");
  var lightboxVideo = lightbox.querySelector(".lightbox-video");
  var lightboxCaption = lightbox.querySelector(".lightbox-caption");
  var closeBtn = lightbox.querySelector(".lightbox-close");
  var prevBtn = lightbox.querySelector(".lightbox-prev");
  var nextBtn = lightbox.querySelector(".lightbox-next");
  if (!lightboxImg || !closeBtn || !prevBtn || !nextBtn) return;

  var finePointer = !!(window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  var currentList = [];
  var currentIndex = -1;
  var lastFocused = null;
  var hoverControls = false;

  /* The close button sits above the image. If the image is tall enough to push
     it off the top of the viewport, .is-tight moves it inside the frame. */
  (function () {
    var media = lightbox.querySelector(".lightbox-media");
    if (!media || !("ResizeObserver" in window)) return;
    var closeSpace = 70;
    var ro = new ResizeObserver(function () {
      lightbox.classList.toggle("is-tight", media.getBoundingClientRect().top < closeSpace);
    });
    ro.observe(media);
  })();

  /* Captions are set as HTML so a caption can carry a link -- every caption
     comes from our own markup (a figcaption or a data-caption attribute). */
  function setCaption(html) {
    lightboxCaption.innerHTML = html || "";
    lightboxCaption.hidden = !html;
  }

  function showIndex(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    var item = currentList[currentIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || "";
    setCaption(item.caption);
    var showNav = currentList.length > 1;
    prevBtn.hidden = !showNav;
    nextBtn.hidden = !showNav;
  }

  function stopVideo() {
    if (!lightboxVideo) return;
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.removeAttribute("controls");
    lightboxVideo.removeAttribute("controlslist");
    lightboxVideo.load();
    lightboxVideo.hidden = true;
  }

  function reveal() {
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function openLightbox(list, index) {
    currentList = list;
    lastFocused = document.activeElement;
    stopVideo();
    hoverControls = false;
    lightboxImg.hidden = false;
    showIndex(index);
    reveal();
  }

  function openVideo(src, caption, wantControls) {
    if (!lightboxVideo || !src) return;
    lastFocused = document.activeElement;
    currentList = [];
    currentIndex = -1;
    lightboxImg.hidden = true;
    lightboxImg.src = "";
    lightboxVideo.src = src;
    lightboxVideo.hidden = false;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    hoverControls = !!wantControls && finePointer;
    setCaption(caption);
    reveal();
    var playback = lightboxVideo.play();
    if (playback && playback.catch) playback.catch(function () {});
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightboxImg.src = "";
    stopVideo();
    lightboxImg.hidden = false;
    hoverControls = false;
    setCaption("");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  function makeOpenable(img, list, getIndex) {
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    /* Do NOT set aria-label here: it would override the alt text and every
       figure would announce as the same "Enlarge image", which is useless when
       a page has ten screenshots. The alt IS the accessible name. Only name the
       ones that have no alt to lend. */
    if (!img.getAttribute("alt")) img.setAttribute("aria-label", "Enlarge image");
    img.addEventListener("click", function () {
      if (img._swipeAt && Date.now() - img._swipeAt < 400) return;
      openLightbox(list, getIndex());
    });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(list, getIndex());
      }
    });
  }

  /* horizontal swipe -> onPrev / onNext (touch) */
  function addSwipe(el, onPrev, onNext) {
    var x0 = null, y0 = null, t0 = 0;
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Date.now() - t0 > 600) return;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      el._swipeAt = Date.now();
      (dx < 0 ? onNext : onPrev)();
    }, { passive: true });
  }

  /* Standalone captioned figures -> one shared list */
  var figNodes = Array.prototype.slice.call(document.querySelectorAll(".figure img"));
  var figureItems = figNodes.map(function (img) {
    var figure = img.closest("figure");
    var captionEl = figure ? figure.querySelector("figcaption") : null;
    var animation = img.getAttribute("data-scroll-animation");
    var animationUrl = animation ? new URL(animation, document.baseURI) : null;
    // Give enlarged animations their own image instance instead of sharing the inline render.
    if (animationUrl) animationUrl.searchParams.set("view", "lightbox");
    return {
      src: animationUrl ? animationUrl.href : img.src,
      alt: img.alt,
      caption: captionEl ? captionEl.innerHTML.trim() : ""
    };
  });
  figNodes.forEach(function (img, index) {
    makeOpenable(img, figureItems, function () { return index; });
  });

  /* Galleries -> each its own list; thumbnails swap the main image in place */
  Array.prototype.slice.call(document.querySelectorAll(".gallery")).forEach(function (gallery) {
    var main = gallery.querySelector(".gallery-main");
    var fade = gallery.querySelector(".gallery-fade");
    var caption = gallery.querySelector(".gallery-caption");
    var counter = gallery.querySelector(".gallery-count");
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll(".gallery-thumb"));
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var list = thumbs.map(function (thumb) {
      var img = thumb.querySelector("img");
      return {
        src: img.getAttribute("data-full") || img.getAttribute("src"),
        alt: img.getAttribute("data-alt") || "",
        caption: img.getAttribute("data-caption") || ""
      };
    });
    var active = 0;
    var seq = 0;

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function paint(it) {
      main.src = it.src;
      main.alt = it.alt;
    }

    function dissolve(it) {
      if (!fade || reduceMotion) { paint(it); return; }
      fade.src = main.currentSrc || main.src;
      fade.style.transition = "none";
      fade.style.opacity = "1";
      void fade.offsetWidth;
      paint(it);
      fade.style.transition = "";
      fade.style.opacity = "0";
    }

    function select(i, instant) {
      active = (i + list.length) % list.length;
      var it = list[active];
      thumbs.forEach(function (t, ti) { t.classList.toggle("is-active", ti === active); });
      if (caption) caption.innerHTML = it.caption;
      if (counter) counter.textContent = pad(active + 1) + " / " + pad(list.length);
      if (!main) return;
      if (instant) { paint(it); return; }
      /* The caption, counter and active thumb update now; the image only
         appears once it has preloaded. Two quick clicks can therefore finish
         out of order and leave an older image under a newer caption, so a
         preload that is no longer the current selection is discarded. */
      var token = ++seq;
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        if (token !== seq) return;
        dissolve(it);
      };
      pre.src = it.src;
    }

    select(0, true);

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener("click", function () { select(i); });
    });

    var navPrev = gallery.querySelector(".gallery-nav-prev");
    var navNext = gallery.querySelector(".gallery-nav-next");
    if (navPrev) navPrev.addEventListener("click", function () { select(active - 1); });
    if (navNext) navNext.addEventListener("click", function () { select(active + 1); });

    if (main) {
      makeOpenable(main, list, function () { return active; });
      addSwipe(main, function () { select(active - 1); }, function () { select(active + 1); });
    }
  });

  /* Inline videos: our own expand button, and optional hover controls */
  Array.prototype.slice.call(document.querySelectorAll(".ui-video")).forEach(function (wrap) {
    var video = wrap.querySelector("video");
    var wantControls = wrap.hasAttribute("data-hover-controls");

    if (video && wantControls && finePointer) {
      wrap.addEventListener("mouseenter", function () {
        video.setAttribute("controls", "");
        video.setAttribute("controlslist", "nofullscreen nodownload");
      });
      wrap.addEventListener("mouseleave", function () {
        video.removeAttribute("controls");
        video.removeAttribute("controlslist");
      });
    }

    var btn = wrap.querySelector(".ui-video-expand");
    if (!btn) return;
    var source = wrap.querySelector("source");
    if (!source) { btn.hidden = true; return; }
    var figure = wrap.closest("figure");
    var captionEl = figure ? figure.querySelector("figcaption") : null;
    var caption = captionEl ? captionEl.innerHTML.trim() : "";
    btn.addEventListener("click", function () {
      openVideo(source.src, caption, wantControls);
    });
  });

  /* Hover controls for a video playing inside the lightbox */
  (function () {
    var media = lightbox.querySelector(".lightbox-media");
    if (!media || !lightboxVideo || !finePointer) return;
    media.addEventListener("mouseenter", function () {
      if (!hoverControls || lightboxVideo.hidden) return;
      lightboxVideo.setAttribute("controls", "");
      lightboxVideo.setAttribute("controlslist", "nofullscreen nodownload");
    });
    media.addEventListener("mouseleave", function () {
      lightboxVideo.removeAttribute("controls");
      lightboxVideo.removeAttribute("controlslist");
    });
  })();

  prevBtn.addEventListener("click", function (e) { e.stopPropagation(); showIndex(currentIndex - 1); });
  nextBtn.addEventListener("click", function (e) { e.stopPropagation(); showIndex(currentIndex + 1); });
  closeBtn.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  addSwipe(lightbox,
    function () { if (currentList.length > 1) showIndex(currentIndex - 1); },
    function () { if (currentList.length > 1) showIndex(currentIndex + 1); });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") showIndex(currentIndex - 1);
    else if (e.key === "ArrowRight") showIndex(currentIndex + 1);
    else if (e.key === "Tab") {
      var f = Array.prototype.slice.call(lightbox.querySelectorAll('button, video[controls], [href], [tabindex]:not([tabindex="-1"])')).filter(function (el) {
        return !el.hidden && el.offsetParent !== null;
      });
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !lightbox.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !lightbox.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });
})();

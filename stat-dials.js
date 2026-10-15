/* Rolling statistics: scroll into view, or replay when a disclosure opens. */
(function () {
  document.querySelectorAll('.stats').forEach(function (stats) {
    var values = Array.prototype.slice.call(stats.querySelectorAll('.stat-value'));
    if (!values.length) return;
    var details = stats.closest('details');
    if (!('animate' in Element.prototype)) return;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var animations = [];
    var restorations = [];
    function settle() {
      animations.forEach(function (animation) { animation.cancel(); });
      restorations.forEach(function (restore) { restore(); });
      animations = [];
      restorations = [];
    }
    motion.addEventListener('change', function () { if (motion.matches) settle(); });

    function play() {
      settle();
      if (motion.matches) return;
      values.forEach(function (el, statIndex) {
        var raw = el.textContent.trim();
        var label = document.createElement('span');
        label.className = 'visually-hidden';
        label.textContent = raw;
        var dial = document.createElement('span');
        dial.className = 'stat-dial';
        dial.setAttribute('aria-hidden', 'true');
        var wheels = [];
        var digitIndex = 0;
        Array.from(raw).forEach(function (character) {
          if (!/\d/.test(character)) {
            var suffix = document.createElement('span');
            suffix.className = 'stat-dial-suffix';
            suffix.textContent = character;
            dial.appendChild(suffix);
            return;
          }
          var wheel = document.createElement('span');
          wheel.className = 'stat-wheel';
          var track = document.createElement('span');
          track.className = 'stat-wheel-track';
          // Two full turns, then decelerate to the authored digit.
          var stop = 20 + Number(character);
          for (var n = 0; n <= stop; n++) {
            var digit = document.createElement('span');
            digit.className = 'stat-wheel-digit';
            digit.textContent = String(n % 10);
            track.appendChild(digit);
          }
          wheel.appendChild(track);
          dial.appendChild(wheel);
          wheels.push({ track: track, stop: stop, index: digitIndex++ });
        });
        el.replaceChildren(label, dial);
        var restore = function () { el.textContent = raw; };
        restorations.push(restore);
        var running = wheels.map(function (wheel) {
          var animation = wheel.track.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-' + (wheel.stop * 1.05) + 'em)' }
          ], {
            duration: 1700 + wheel.index * 160,
            delay: statIndex * 90 + wheel.index * 65,
            easing: 'cubic-bezier(0.12, 0.7, 0.18, 1)',
            fill: 'both'
          });
          animations.push(animation);
          return animation.finished.then(function () {
            wheel.track.parentElement.classList.add('is-settled');
          });
        });
        Promise.all(running).then(function () {
          // Keep the same wheel widths when settled, avoiding a final shift.
          wheels.forEach(function (wheel) {
            wheel.track.style.transform = 'translateY(-' + (wheel.stop * 1.05) + 'em)';
          });
        }).catch(function () {});
      });
    }

    if (details) {
      // Replay on every expansion, including a reversed closing animation.
      details.addEventListener('toggle', function () {
        if (details.open) play();
      });
      details.addEventListener('disclosure-reopen', play);
      if (details.open) play();
    } else if ('IntersectionObserver' in window) {
      // Open-page figures roll in when the reader reaches them.
      var observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        play();
      }, { threshold: 0.6 });
      observer.observe(stats);
    }
  });
})();

/* A projected dial scale. Its owner supplies the real animation/scroll phase. */
(function () {
  var sequence = 0;
  window.TDGDial = {
    create: function (root, options) {
      var count = options.count, item = options.item || 'item';
      root.classList.add('tdg-dial');
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', options.label || 'Choose a ' + item);
      var track = document.createElement('div');
      track.className = 'tdg-dial-track';
      track.setAttribute('aria-hidden', 'true');
      var status = document.createElement('span');
      status.className = 'tdg-dial-status';
      status.id = 'tdg-dial-position-' + (++sequence);
      root.setAttribute('aria-describedby', status.id);
      root.replaceChildren(track, status);
      var marks = Array.from({ length: 49 }, function () {
        var mark = document.createElement('span');
        mark.className = 'tdg-dial-mark';
        track.appendChild(mark);
        return mark;
      });
      var buttons = [-1, 1].map(function (step) {
        var button = document.createElement('button');
        button.className = 'tdg-dial-step';
        button.type = 'button';
        button.dataset.step = step;
        button.setAttribute('aria-label', (step < 0 ? 'Previous ' : 'Next ') + item);
        if (options.controls) button.setAttribute('aria-controls', options.controls);
        button.addEventListener('click', function () { options.onStep(step); });
        root.appendChild(button);
        return button;
      });
      root.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var button = buttons[event.key === 'ArrowLeft' ? 0 : 1];
        if (!button.disabled) button.click();
      });
      var lastSelected = -1;
      function render(phase, selected) {
        var start = Math.floor(phase * 6) - 24;
        marks.forEach(function (mark, i) {
          var tick = start + i;
          var major = tick % 6 === 0;
          var index = ((tick / 6) % count + count) % count;
          var angle = (tick / 6 - phase) * Math.PI / 4;
          var depth = Math.cos(angle);
          mark.hidden = Math.abs(angle) >= Math.PI / 2 || (!options.loop && major && (tick < 0 || tick > (count - 1) * 6));
          mark.classList.toggle('is-major', major);
          mark.classList.toggle('is-current', major && index === selected);
          if (mark.hidden) return;
          mark.style.left = (50 + 48 * Math.sin(angle)).toFixed(4) + '%';
          mark.style.opacity = Math.pow(Math.max(0, depth), .45).toFixed(4);
        });
        if (selected !== lastSelected) {
          status.textContent = item.charAt(0).toUpperCase() + item.slice(1) + ' ' + (selected + 1) + ' of ' + count;
          lastSelected = selected;
        }
        buttons[0].disabled = !options.loop && phase <= .001;
        buttons[1].disabled = !options.loop && phase >= count - 1.001;
      }
      root.hidden = false;
      render(0, 0);
      return { render: render };
    }
  };
})();

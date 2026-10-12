/* Preserve the case-study chart and submission animation inside slide mode. */
(() => {
  const main = document.querySelector('main.reveal');
  if (!main) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const updates = [];
  function isActive(element) {
    return !document.hidden && !main.inert && main.style.visibility !== 'hidden' &&
      !main.classList.contains('overview') && element.closest('section')?.classList.contains('present');
  }

  const figure = main.querySelector('#corrections-submit-mockup');
  const indicator = figure?.querySelector('[data-submit-indicator]');
  if (indicator?.animate) {
    let animation;
    updates.push(() => {
      if (reduced.matches) {
        animation?.cancel();
        animation = null;
        return;
      }
      if (!animation && isActive(figure)) {
        // These timings and keyframes are the approved case-study loop.
        animation = indicator.animate([
          { offset: 0, opacity: 0, transform: 'translateY(-132px)', easing: 'cubic-bezier(.42,0,.7,1)' },
          { offset: .0864, opacity: 0, transform: 'translateY(-19px)', easing: 'cubic-bezier(.35,0,.8,1)' },
          { offset: .1152, opacity: 1, transform: 'translateY(2px)', easing: 'cubic-bezier(.15,.6,.35,1)' },
          { offset: .144, opacity: 1, transform: 'translateY(-3px)', easing: 'ease-in-out' },
          { offset: .18, opacity: 1, transform: 'translateY(0)' },
          { offset: .88, opacity: 1, transform: 'translateY(0)' },
          { offset: .94, opacity: 0, transform: 'translateY(0)' },
          { offset: 1, opacity: 0, transform: 'translateY(0)' }
        ], { duration: 4000, iterations: Infinity });
      }
      if (animation) {
        if (isActive(figure)) animation.play();
        else animation.pause();
      }
    });
  }

  main.querySelectorAll('.corrections-chart').forEach(chart => {
    const tooltip = chart.querySelector('.corrections-chart-tooltip');
    const plot = chart.querySelector('.corrections-chart-plot');
    // Match the percentage-based axes when the slide chart uses a wider plot.
    chart.querySelector('svg')?.setAttribute('preserveAspectRatio', 'none');
    if (plot && tooltip) {
      chart.querySelectorAll('.corrections-chart-point').forEach(point => {
        function show() {
          if (!isActive(chart)) return;
          tooltip.textContent = point.getAttribute('data-tooltip');
          tooltip.hidden = false;
          const dot = point.getBoundingClientRect();
          const box = plot.getBoundingClientRect();
          const scaleX = box.width / plot.offsetWidth || 1;
          const scaleY = box.height / plot.offsetHeight || 1;
          const half = tooltip.offsetWidth / 2;
          const left = (dot.left + dot.width / 2 - box.left) / scaleX;
          tooltip.style.left = Math.max(half + 4, Math.min(plot.offsetWidth - half - 4, left)) + 'px';
          tooltip.style.top = ((dot.top - box.top) / scaleY - 12) + 'px';
        }
        const hide = () => { tooltip.hidden = true; };
        point.addEventListener('pointerenter', show);
        point.addEventListener('pointerleave', hide);
        point.addEventListener('focus', show);
        point.addEventListener('blur', hide);
        point.addEventListener('click', show);
        point.addEventListener('keydown', event => {
          // Let the chart own its focused keyboard interaction.
          event.stopPropagation();
          if (event.key === 'Escape') hide();
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
        });
      });
    }
    chart.classList.add('is-waiting');
    updates.push(() => {
      const active = isActive(chart);
      chart.classList.toggle('is-active', active);
      if (active) {
        chart.classList.remove('is-waiting');
        chart.classList.add('is-revealed');
      } else if (tooltip) tooltip.hidden = true;
    });
  });

  const update = () => updates.forEach(fn => fn());
  // Observe Reveal's slide state without depending on its private instance.
  const observer = new MutationObserver(update);
  observer.observe(main, { attributes: true, attributeFilter: ['class', 'style', 'inert'] });
  main.querySelectorAll('.slides > section').forEach(section => {
    observer.observe(section, { attributes: true, attributeFilter: ['class'] });
  });
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();

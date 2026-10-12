// Extracted from the article by build-column-mapping.py.
(function () {
  var diagram = document.querySelector('.schema-flow');
  if (!diagram || !Element.prototype.animate) return;
  var svg = diagram.querySelector('svg');
  var motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Preserve the exported curves and transforms: outbound SVG paths run backwards.
  var paths = Array.from(svg.querySelectorAll('path[stroke-width="12"]'));
  if (paths.length !== 8) return;
  var colours = ['#a1ffe4','#a1ffe4','#a1ffe4','#a1ffe4','#c2b5f3','#8cefff','#8bffe3','#8bcfff'];
  var pulses = paths.map(function(path,i) {
    var pulse = path.cloneNode(false);
    pulse.removeAttribute('id');
    pulse.setAttribute('class','schema-pulse');
    pulse.setAttribute('aria-hidden','true');
    pulse.setAttribute('pathLength','1000');
    pulse.setAttribute('stroke',colours[i]);
    pulse.setAttribute('stroke-width','10');
    pulse.setAttribute('stroke-linecap','round');
    pulse.setAttribute('stroke-dasharray','24 1024');
    pulse.style.opacity = '0';
    path.parentNode.insertBefore(pulse,path.nextSibling);
    return pulse;
  });
  var halo = document.createElementNS('http://www.w3.org/2000/svg','circle');
  Object.entries({class:'schema-halo',cx:'622',cy:'459.5',r:'78',fill:'none',stroke:'#51ffcc','stroke-width':'3','aria-hidden':'true'}).forEach(function(entry) { halo.setAttribute(entry[0],entry[1]); });
  halo.style.opacity = '0';
  svg.appendChild(halo);
  var animations = [];
  var visible = !('IntersectionObserver' in window);
  // One six-second cycle includes a quiet beat after the downstream pulses.
  var cycle = 6000;
  function start() {
    pulses.forEach(function(pulse,i) {
      var outbound = i < 4;
      var begin = outbound ? 2800+i*110 : (i-4)*220;
      var duration = outbound ? 1600 : 1800;
      var from = outbound ? '-1000' : '24';
      var to = outbound ? '24' : '-1000';
      animations.push(pulse.animate([
        {strokeDashoffset:from,opacity:0,offset:0},
        {strokeDashoffset:from,opacity:0,offset:begin/cycle},
        {opacity:1,offset:(begin+duration*.08)/cycle},
        {opacity:1,offset:(begin+duration*.88)/cycle},
        {strokeDashoffset:to,opacity:0,offset:(begin+duration)/cycle},
        {strokeDashoffset:to,opacity:0,offset:1}
      ],{duration:cycle,iterations:Infinity,easing:'linear'}));
    });
    animations.push(halo.animate([
      {opacity:0,offset:0}, {opacity:0,offset:2050/cycle},
      {opacity:.75,offset:2435/cycle}, {opacity:0,offset:3150/cycle},
      {opacity:0,offset:1}
    ],{duration:cycle,iterations:Infinity,easing:'ease-in-out'}));
  }
  function sync() {
    if (motion.matches) {
      animations.forEach(function(a) { a.cancel(); });
      animations = [];
      return;
    }
    if (visible && !document.hidden) {
      if (!animations.length) start();
      else animations.forEach(function(a) { a.play(); });
    } else animations.forEach(function(a) { a.pause(); });
  }
  function setVisibility() {
    visible = diagram.closest('section').classList.contains('present') && !document.querySelector('main.reveal').inert;
    sync();
  }
  var observer = new MutationObserver(setVisibility);
  observer.observe(diagram.closest('section'), {attributes:true, attributeFilter:['class']});
  observer.observe(document.querySelector('main.reveal'), {attributes:true, attributeFilter:['inert']});
  setVisibility();
  motion.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  sync();
})();

/* Animate only theme colours so layout and interaction animations stay independent. */
window.setImageInsightTheme = (() => {
  const running = new Map();
  const properties = ['backgroundColor','color','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','fill','stroke','boxShadow'];
  return theme => {
    const root = document.documentElement;
    if (root.dataset.theme === theme) return;
    if (!root.dataset.theme || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      running.forEach(animation => animation.cancel());
      running.clear();
      root.dataset.theme = theme;
      return;
    }
    const targets = [root, ...document.querySelectorAll('body, body *')].filter(element =>
      !element.matches('img,iframe,script,style,defs,defs *') && element.getClientRects().length);
    const before = targets.map(element => {
      const style = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, style[property]]));
    });
    running.forEach(animation => animation.cancel());
    running.clear();
    root.dataset.theme = theme;
    targets.forEach((element, index) => {
      const style = getComputedStyle(element);
      const from = {}, to = {};
      properties.forEach(property => {
        if (before[index][property] !== style[property]) {
          from[property] = before[index][property];
          to[property] = style[property];
        }
      });
      if (!Object.keys(from).length) return;
      const animation = element.animate([from,to], {duration:350,easing:'ease-in-out'});
      running.set(element,animation);
      animation.finished.then(() => {
        if (running.get(element) === animation) running.delete(element);
      }).catch(() => {});
    });
  };
})();

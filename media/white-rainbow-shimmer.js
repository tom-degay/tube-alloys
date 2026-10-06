
(()=>{
 const svg=document.querySelector('.wr-roundel svg');
 const dots=[...svg.querySelectorAll('circle')].map(el=>({el,r:+el.dataset.radius,angle:+el.dataset.angle}));
 const times=[0,.045,.10,.16,.22,.29,.36,.43],sizes=[1,1.04,1.13,1.24,1.18,1.10,1.03,1],greys=[128,149,197,255,223,181,144,128];
 let running=false,visible=false;
 function play(){
  if(running||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  running=true;const start=performance.now();
  function tick(now){
   const elapsed=(now-start)/1000,duration=5.2;
   if(elapsed>=duration){dots.forEach(d=>{d.el.setAttribute('r',d.r);d.el.setAttribute('fill','#808080')});running=false;if(visible)requestAnimationFrame(play);return;}
   const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
   const envelope=smooth(elapsed/.85)*(1-smooth((elapsed-2.7)/2.5));
   const head=elapsed/3.6*Math.PI*2;
   dots.forEach(d=>{
    // Circular profile: identical on both sides of twelve o'clock, with no seam.
    const strength=Math.exp((Math.cos(d.angle-head)-1)/.24)*envelope;
    const grey=Math.round(128+127*strength);
    d.el.setAttribute('r',(d.r*(1+.24*strength)).toFixed(3));
    d.el.setAttribute('fill',`rgb(${grey},${grey},${grey})`);
   });
   requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
 }
 // Plays continuously while the logo is on screen; stops when it scrolls away.
 svg.addEventListener('pointerenter',play);svg.addEventListener('click',play);svg.addEventListener('focus',play);
 if('IntersectionObserver' in window){
  new IntersectionObserver(es=>{visible=es[es.length-1].isIntersecting;if(visible)play()}).observe(svg);
 }else{visible=true;play()}
})();

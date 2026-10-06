
(()=>{
 const svg=document.querySelector('.agent-demo svg');
 const lines=svg.querySelector('.agent-lines'),gradient=svg.querySelector('linearGradient');
 const groups=[lines].map(g=>Array.from(g.querySelectorAll('.spoke')));
 const ends=[[85,96],[195,96],[140,186]],duration=1450;
 let frame=0,running=false;
 const clamp=v=>Math.max(0,Math.min(1,v));
 function reset(){cancelAnimationFrame(frame);running=false;lines.setAttribute('stroke','#fff');groups.forEach(ps=>ps.forEach((p,i)=>{p.setAttribute('d',`M140 127 L${ends[i][0]} ${ends[i][1]}`);p.setAttribute('opacity','1');p.removeAttribute('stroke-linecap')}));}
 function play(){
  if(running)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  running=true;const start=performance.now();lines.setAttribute('stroke','url(#agent-color)');
  function tick(now){
   const t=(now-start)/duration;if(t>=1){reset();return;}
   const angle=-2*Math.PI*t,dx=58*Math.cos(angle),dy=58*Math.sin(angle);
   for(const [k,v] of Object.entries({x1:140-dx,y1:125-dy,x2:140+dx,y2:125+dy}))gradient.setAttribute(k,v);
   const intensity=Math.min(clamp(t/.08),clamp((1-t)/.16));const colors=[[161,210,236],[198,168,239],[211,155,231],[236,165,205],[180,220,240]];gradient.querySelectorAll('stop').forEach((stop,i)=>stop.setAttribute('stop-color',`rgb(${colors[i].map(c=>Math.round(255+(c-255)*intensity)).join(',')})`));
   // Erase centre-to-edge, then redraw edge-to-centre in the same staggered order.
   groups.forEach(ps=>ps.forEach((p,i)=>{
    const erase=clamp((t-i*.12)/.24),draw=clamp((t-.43-i*.12)/.24);
    const a=draw>0?1-draw:erase,b=1;
    const [ex,ey]=ends[i];p.setAttribute('d',`M${140+(ex-140)*a} ${127+(ey-127)*a} L${140+(ex-140)*b} ${127+(ey-127)*b}`);
    p.setAttribute('opacity',Math.abs(b-a)<.002?'0':'1');p.setAttribute('stroke-linecap','round');
   }));frame=requestAnimationFrame(tick);
  }frame=requestAnimationFrame(tick);
 }
 svg.addEventListener('pointerenter',play);

 svg.addEventListener('focus',play);
 svg.addEventListener('click',()=>{play();svg.dispatchEvent(new CustomEvent('agent-activate',{bubbles:true}));});
 svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();svg.dispatchEvent(new MouseEvent('click'));}});
 let scrollTimer;
 window.addEventListener('scroll',()=>{
  clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{
   const box=svg.getBoundingClientRect();
   if(box.bottom>0 && box.top<window.innerHeight)play();
  },100);
 },{passive:true});
 play();
})();

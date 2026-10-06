(()=>{

const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},ends=[[75,97],[185,97],[130,187]];
const stages=[];document.querySelectorAll('.agent-cube-row .cube-stage').forEach(el=>stages[Number(el.dataset.i)]=el);
function reset(el){const svg=el.querySelector('svg');const dots=svg.querySelector('.dots');if(dots)dots.setAttribute('opacity',0);svg.querySelector('.body').removeAttribute('transform');svg.querySelector('.faces').setAttribute('opacity',0);svg.querySelectorAll('.faces path').forEach(p=>p.setAttribute('opacity',0));const o=svg.querySelector('.outline');o.setAttribute('d','M130 65 185 97 185 157 130 187 75 157 75 97Z');o.setAttribute('stroke','#fff');o.removeAttribute('stroke-dasharray');o.removeAttribute('stroke-dashoffset');o.setAttribute('opacity',1);svg.querySelectorAll('.spokes path').forEach((p,j)=>{p.setAttribute('d',`M130 129 ${ends[j][0]} ${ends[j][1]}`);p.setAttribute('opacity',1);p.setAttribute('stroke','#fff');p.removeAttribute('stroke-width')});svg.querySelector('.chase').setAttribute('opacity',0);svg.querySelector('.pulse').setAttribute('opacity',0)}
function play(i){if(i===8){demoInvert();return;}const el=stages[i];if(el.running)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;el.running=true;reset(el);const svg=el.querySelector('svg'),body=svg.querySelector('.body'),o=svg.querySelector('.outline'),ps=[...svg.querySelectorAll('.spokes path')],color=`url(#g${i})`,start=performance.now(),duration=[1800,1650,1900,1750,1700,2100,2200,3000,850,2600][i];
function tick(now){const t=(now-start)/duration;if(t>=1){reset(el);el.running=false;return}const env=Math.min(ease(t/.1),ease((1-t)/.18));const grad=svg.querySelector('linearGradient'),a=-Math.PI*2*t;grad.setAttribute('x1',130-65*Math.cos(a));grad.setAttribute('y1',130-65*Math.sin(a));grad.setAttribute('x2',130+65*Math.cos(a));grad.setAttribute('y2',130+65*Math.sin(a));
if(i===0){const c=svg.querySelector('.chase');c.setAttribute('opacity',env);c.setAttribute('stroke-dasharray','.22 .78');c.setAttribute('stroke-dashoffset',-t*1.5);ps.forEach((p,j)=>{p.setAttribute('stroke',color);p.setAttribute('opacity',.55+.45*Math.pow(Math.max(0,Math.cos(t*2*Math.PI-j*2.1)),2))})}
if(i===1){o.setAttribute('stroke',color);ps.forEach((p,j)=>{const erase=clamp((t-j*.11)/.23),draw=clamp((t-.43-j*.11)/.23),f=draw>0?1-draw:erase;const [x,y]=ends[j];p.setAttribute('d',`M${130+(x-130)*f} ${129+(y-129)*f} ${x} ${y}`);p.setAttribute('opacity',f>.995?0:1);p.setAttribute('stroke',color)})}
if(i===2){const s=1+.065*Math.sin(Math.PI*t)**2;body.setAttribute('transform',`translate(130 126) scale(${s}) translate(-130 -126)`);o.setAttribute('stroke',color);ps.forEach(p=>p.setAttribute('stroke',color))}
if(i===3){
 const faces=svg.querySelector('.faces');
 // Paint faces after the wireframe, covering its strokes during each flash.
 body.appendChild(faces);faces.setAttribute('opacity',1);
 const shades=['#a1d2ec','#d39be7','#eca5cd'];
 [...faces.children].forEach((p,j)=>{
  const local=(t-(.06+j*.27))/.22;
  const flash=local>=0&&local<=1?Math.min(1,local/.12,(1-local)/.22):0;
  p.setAttribute('opacity',clamp(flash));p.setAttribute('fill',shades[j]);
  p.setAttribute('stroke',shades[j]);p.setAttribute('stroke-width',9);p.setAttribute('stroke-linejoin','miter');
 });
 o.setAttribute('stroke','#fff');ps.forEach(p=>p.setAttribute('stroke','#fff'));
}
if(i===4){const pulse=svg.querySelector('.pulse');pulse.setAttribute('r',2+68*ease(t/.82));pulse.setAttribute('stroke-width',2.5);pulse.setAttribute('opacity',.65*Math.sin(Math.PI*clamp(t/.82)));ps.forEach(p=>{p.setAttribute('stroke',color);p.setAttribute('stroke-width',9+2.5*Math.sin(Math.PI*t))});o.setAttribute('stroke',t>.4?color:'#fff')}
if(i===5){o.setAttribute('stroke-linecap','round');const draw=ease(t/.58);o.setAttribute('stroke-dasharray','1 1');o.setAttribute('stroke-dashoffset',1-draw);o.setAttribute('stroke',color);ps.forEach((p,j)=>{const f=ease((t-.43-j*.095)/.22),[x,y]=ends[j];p.setAttribute('d',`M${x} ${y} ${x+(130-x)*f} ${y+(129-y)*f}`);p.setAttribute('opacity',f<.01?0:1);p.setAttribute('stroke',color)})}

if(i===6||i===7){
 const turn=i===6?Math.sin(Math.PI*t)**2*.28:ease(t)*Math.PI*2;
 const a=Math.PI/4+turn,c=Math.cos(a),sn=Math.sin(a),tilt=Math.atan(1/Math.sqrt(2)),st=Math.sin(tilt),ct=Math.cos(tilt);
 const anchors=[[130,65],[185,97],[185,157],[130,187],[75,157],[75,97],[130,129]];
 const verts=[];for(let x of [-1,1])for(let y of [-1,1])for(let z of [-1,1]){
  const rx=x*c+z*sn,rz=-x*sn+z*c;
  const bx=130+(x+z)*Math.SQRT1_2*38.89,by=126+(-y*ct+(-x+z)*Math.SQRT1_2*st)*37.35;
  const anchor=anchors.reduce((best,p)=>Math.hypot(p[0]-bx,p[1]-by)<Math.hypot(best[0]-bx,best[1]-by)?p:best);
  // Calibrate each vertex to the original icon, so start and finish match exactly.
  const weight=i===6?1:Math.pow(Math.cos(turn/2),8);
  verts.push([130+rx*38.89+(anchor[0]-bx)*weight,126+(-y*ct+rz*st)*37.35+(anchor[1]-by)*weight,rz*ct+y*st]);
 }
 const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
 const edges=new Set();
 faces.forEach(f=>{const A=verts[f[0]],B=verts[f[1]],C=verts[f[2]];const cross=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);if(cross<0)for(let k=0;k<4;k++)edges.add([f[k],f[(k+1)%4]].sort((a,b)=>a-b).join(','));});
 const d=[...edges].map(e=>{const [u,v]=e.split(',').map(Number);return `M${verts[u][0]} ${verts[u][1]} L${verts[v][0]} ${verts[v][1]}`}).join(' ');
 o.setAttribute('d',d);o.setAttribute('stroke',color);ps.forEach(p=>p.setAttribute('opacity',0));
}


if(i===8){
 const snap=x=>1-Math.pow(1-clamp(x),3);
 const phase=t<.5?snap(t*2):1-snap((t-.5)*2);
 // Keep the silhouette and central junction fixed; invert only the spokes.
 const targets=[[75,97+60*phase],[185,97+60*phase],[130,187-122*phase]];
 ps.forEach((p,j)=>{p.setAttribute('d',`M130 129 ${targets[j][0]} ${targets[j][1]}`);p.setAttribute('stroke','#fff');p.setAttribute('opacity',Math.hypot(targets[j][0]-130,targets[j][1]-129)<.5?0:1)});
}


if(i===9){
 let dots=svg.querySelector('.dots');
 if(!dots){
  dots=document.createElementNS('http://www.w3.org/2000/svg','g');dots.setAttribute('class','dots');dots.setAttribute('fill',color);body.appendChild(dots);
  const corners=[[130,65],[185,97],[185,157],[130,187],[75,157],[75,97]],segments=corners.map((p,j)=>[p,corners[(j+1)%6]]).concat(ends.map(p=>[[130,129],p]));
  const seen=new Set();let n=0;
  segments.forEach(([a,b])=>{for(let k=0;k<=8;k++){
   const x=a[0]+(b[0]-a[0])*k/8,y=a[1]+(b[1]-a[1])*k/8,key=`${x.toFixed(2)},${y.toFixed(2)}`;if(seen.has(key))continue;seen.add(key);
   const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.dataset.x=x;circle.dataset.y=y;circle.dataset.angle=n*2.39996;circle.dataset.drift=16+(n%7)*4;circle.setAttribute('r',3.2);dots.appendChild(circle);n++;
  }});
 }
 const dissolve=ease((t-.04)/.18),restore=ease((t-.77)/.2),scatter=ease((t-.12)/.3)*(1-ease((t-.53)/.3));
 const dotOpacity=dissolve*(1-restore),lineOpacity=1-dotOpacity;
 dots.setAttribute('opacity',dotOpacity);o.setAttribute('opacity',lineOpacity);ps.forEach(p=>p.setAttribute('opacity',lineOpacity));
 [...dots.children].forEach((p,j)=>{const x=+p.dataset.x,y=+p.dataset.y,a=+p.dataset.angle,d=+p.dataset.drift;
  p.setAttribute('cx',x+scatter*((x-130)*.38+Math.cos(a)*d));p.setAttribute('cy',y+scatter*((y-126)*.38+Math.sin(a)*d));
  p.setAttribute('r',3.2-scatter*.7);p.setAttribute('opacity',1-scatter*(.15+(j%4)*.1));
 });
}

// Resolve colour gently back to white for every study.
const palettes=[[161,210,236],[211,155,231],[236,165,205]];svg.querySelectorAll('stop').forEach((p,j)=>p.setAttribute('stop-color',`rgb(${palettes[j].map(c=>Math.round(255+(c-255)*env)).join(',')})`));requestAnimationFrame(tick)}requestAnimationFrame(tick)}

let invertPhase=0,invertFrame=0,invertTimer=0,invertColour=0;
function setInverted(target){
 clearTimeout(invertTimer);cancelAnimationFrame(invertFrame);
 const start=performance.now(),from=invertPhase,fromColour=invertColour;
 const svg=stages[8].querySelector("svg"),gradient=svg.querySelector("linearGradient");
 gradient.setAttribute("x1",65);gradient.setAttribute("y1",130);gradient.setAttribute("x2",195);gradient.setAttribute("y2",130);
 const ps=[...stages[8].querySelectorAll('.spokes path')];
 function tick(now){
  const t=clamp((now-start)/350),eased=1-Math.pow(1-t,3);invertPhase=from+(target-from)*eased;
  invertColour=fromColour+(target-fromColour)*eased;
  const colours=[[161,210,236],[211,155,231],[236,165,205]];
  gradient.querySelectorAll('stop').forEach((stop,j)=>stop.setAttribute('stop-color',`rgb(${colours[j].map(c=>Math.round(255+(c-255)*invertColour)).join(',')})`));
  svg.querySelector('.outline').setAttribute('stroke','url(#g8)');
  const targets=[[75,97+60*invertPhase],[185,97+60*invertPhase],[130,187-122*invertPhase]];
  ps.forEach((p,j)=>{const [x,y]=targets[j];p.setAttribute('d',`M130 129 ${x} ${y}`);p.setAttribute('stroke','url(#g8)');p.setAttribute('opacity',Math.hypot(x-130,y-129)<.5?0:1)});
  if(t<1)invertFrame=requestAnimationFrame(tick);
 }
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)tick(start+350);else invertFrame=requestAnimationFrame(tick);
}
function demoInvert(){setInverted(1);invertTimer=setTimeout(()=>{if(!stages[8].matches(':hover'))setInverted(0)},850);}
stages.forEach((el,i)=>{
 if(i===8){
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')setInverted(1)});
  el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')setInverted(0)});
  el.addEventListener('focus',()=>setInverted(1));el.addEventListener('blur',()=>setInverted(0));
  el.addEventListener('click',()=>{if(matchMedia('(hover:none)').matches)demoInvert()});
 }else{
  el.addEventListener('pointerenter',()=>play(i));el.addEventListener('click',()=>play(i));el.addEventListener('focus',()=>play(i));
 }
 document.querySelector(`[data-replay="${i}"]`)?.addEventListener('click',()=>play(i));
});

stages.forEach(el=>reset(el));
let sequenceBusy=false,scrollDebounce,lastSequence=-Infinity;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runSequence(){
 if(sequenceBusy||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const box=document.querySelector('.agent-cube-row').getBoundingClientRect();
 if(box.bottom<0||box.top>innerHeight)return;
 sequenceBusy=true;lastSequence=performance.now();
 while(stages.some(el=>el.running))await delay(60);
 for(const [i,ms] of [[5,2100],[6,2200],[8,1250],[9,2600]]){
  // Let an already-running hover cycle finish instead of restarting it.
  if(i===8)demoInvert();else if(!stages[i].running)play(i);
  await delay(ms+180);
 }
 sequenceBusy=false;lastSequence=performance.now();
}
window.addEventListener('scroll',()=>{
 clearTimeout(scrollDebounce);
 scrollDebounce=setTimeout(()=>{if(performance.now()-lastSequence>1200)runSequence()},140);
},{passive:true});


})();

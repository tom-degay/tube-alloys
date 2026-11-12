// Extracted from the article by build-validation.py.
(function(){
 const root=document.getElementById('ttt-component');
 const svg=root.querySelector('#ttt-chart'),area=root.querySelector('#ttt-area');
 const dots=[...root.querySelectorAll('.ttt-dot')],handles=[...root.querySelectorAll('.ttt-handle')];
 const tooltip=root.querySelector('.ttt-tooltip'),tipTitle=tooltip.querySelector('strong'),tipText=tooltip.querySelector('span');
 let tooltipIndex=null;
 const sketchStrokes=[root.querySelector('#ttt-sketch-0')];
 const buttons=[...root.querySelectorAll('button')],pill=root.querySelector('.ttt-pill');
 const center=[362.5,280],ends=[[362.5,120],[223.936,360],[501.064,360]];
 const names=['time','trust','truth'],original=[.54,.54,.63],after=[.8,.9,.66];
 const stages=[
  {headline:'A manual process forces trade-offs.',detail:'More checking takes time. Faster fixes can make changes harder to trace.',truth:['Better-quality data','through manual checking'],time:['Less time and effort','spent making corrections'],trust:['Confidence in a correct,','consistent process']},
  {headline:'A consistent, automated way to spot errors.',detail:'The original validations applied checks automatically and consistently, helping users identify data that needed attention.',truth:['Surface errors consistently','so users can address them'],time:['Apply checks automatically','to reduce manual checking'],trust:['The same checks','across datasets and runs']},
  {headline:'Bring repeatable corrections into the report.',detail:'Repeatable corrections already existed in the pipeline. This work made them easier to apply and verify, directly where users found errors.',truth:['Apply business knowledge','through repeatable fixes'],time:['Find and fix issues','directly in the report'],trust:['Visible, traceable changes','with an audit history']}
 ];
 let manual=[0.21030363225876858,0.21030363225876858,.5],values=manual.slice(),state=0,raf=0,drag=null;
 const stateColors=[[244,0,80],[87,120,228],[0,216,170]];
 let currentColor=stateColors[0].slice();
 const AREA=manual[0]*manual[1]+manual[0]*manual[2]+manual[1]*manual[2];
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 let introRaf=0,introDone=false,introObserver=null;
 const axisNames=['Time','Trust','Truth'];
 const modeNames=['Manual process','Original validations','Corrections workflow'];
 const improvements=[
  ['Checking and correcting data takes repeated manual effort.','Confidence depends on people following a consistent process and keeping track of changes.','Business knowledge helps spot and fix errors, but thorough checking takes time.'],
  ['Checks run automatically, reducing manual checking.','A consistent set of checks is applied across datasets and runs.','Systematic validation makes errors easier to spot and address.'],
  ['An improved workflow lets users find and fix issues directly in the report, with less effort and specialist knowledge.','Visible changes and an audit history make corrections easier to verify.','Existing pipeline capabilities are easier to use, helping users turn business knowledge into consistent, repeatable corrections.']
 ];
 function positionTooltip(){
  if(tooltipIndex===null||tooltip.hidden)return;
  const box=root.getBoundingClientRect(),point=handles[tooltipIndex].getBoundingClientRect();
  const timeBottom=root.querySelector('#ttt-time-1').getBoundingClientRect().bottom;
  const lowerLabels=Math.min(root.querySelector('#ttt-trust-heading').getBoundingClientRect().top,root.querySelector('#ttt-truth-heading').getBoundingClientRect().top);
  const safeTop=timeBottom-box.top+12,safeBottom=lowerLabels-box.top-12;
  const width=tooltip.offsetWidth,height=tooltip.offsetHeight;
  const x=Math.max(12,Math.min(box.width-width-12,point.left-box.left+point.width/2-width/2));
  let y;
  if(height<=safeBottom-safeTop){
   root.style.paddingBottom='';
   y=point.top-box.top-height-12;
   if(y<safeTop)y=point.bottom-box.top+12;
   y=Math.max(safeTop,Math.min(safeBottom-height,y));
  }else{
   // On very narrow screens, place the popup after the caption instead of over labels.
   const caption=root.querySelector('.ttt-caption').getBoundingClientRect();
   y=caption.bottom-box.top+8;
   root.style.paddingBottom=(height+16)+'px';
  }
  tooltip.style.left=x+'px';tooltip.style.top=y+'px';
 }
 function hideTooltip(){tooltip.hidden=true;tooltipIndex=null;root.style.paddingBottom='';handles.forEach(h=>h.removeAttribute('aria-describedby'));}
 function showTooltip(i){
  stopIntro();
  tooltipIndex=i;tipTitle.textContent=modeNames[state]+' · '+axisNames[i];tipText.textContent=improvements[state][i];
  tooltip.hidden=false;handles.forEach((h,j)=>{if(i===j)h.setAttribute('aria-describedby','ttt-tooltip');else h.removeAttribute('aria-describedby');});positionTooltip();
 }
 function points(v){return ends.map((p,i)=>[center[0]+(p[0]-center[0])*v[i],center[1]+(p[1]-center[1])*v[i]]);}
 function pointsString(v){return points(v).map(p=>p.join(',')).join(' ');}
 // The triangle's geometric area is proportional to ab+ac+bc.
 // Move the selected vertex; scale the other two by one factor to preserve it exactly.
 function rebalance(index,requested,source){
  const others=[0,1,2].filter(i=>i!==index),b=source[others[0]],c=source[others[1]];
  const maxScale=.5/Math.max(b,c);
  const minSelected=Math.max(.08,(AREA-b*c*maxScale*maxScale)/((b+c)*maxScale));
  const a=Math.max(minSelected,Math.min(.5,requested));
  const B=a*(b+c),C=b*c;
  const scale=2*AREA/(Math.sqrt(B*B+4*C*AREA)+B);
  const next=source.slice();next[index]=a;next[others[0]]=b*scale;next[others[1]]=c*scale;
  return next;
 }
 function sketchPath(p,rough=1,pass=0){
  return p.map(([x,y],i)=>{const [xx,yy]=p[(i+1)%p.length],dx=xx-x,dy=yy-y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,seed=i*7.13+pass*11.7+1.5,j=rough*(pass===0?.8:1.3),a=Math.sin(seed)*j,b=Math.cos(seed)*j,b1=Math.sin(seed+2)*rough*2.1,b2=Math.cos(seed+5)*rough*1.7;return `M${x+a},${y+b} C${x+dx*.31+nx*b1},${y+dy*.31+ny*b1} ${x+dx*.69+nx*b2},${y+dy*.69+ny*b2} ${xx+Math.cos(seed+1)*j},${yy+Math.sin(seed+3)*j}`;}).join(' ');
 }
 function draw(v,frameColor=stateColors[state]){
  currentColor=frameColor.slice();
  const p=points(v),color='#'+frameColor.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('').toUpperCase();
  area.setAttribute('points',pointsString(v));area.setAttribute('stroke','none');area.setAttribute('fill',color);
  sketchStrokes.forEach((path,k)=>{path.setAttribute('d',sketchPath(p,3.5,k));path.setAttribute('stroke',color);});
  dots.forEach((dot,i)=>{dot.setAttribute('cx',p[i][0]);dot.setAttribute('cy',p[i][1]);dot.setAttribute('fill',color);dot.setAttribute('r',state?2:3);});
  root.dataset.mode=String(state);
  handles.forEach((h,i)=>{
   h.setAttribute('cx',p[i][0]);h.setAttribute('cy',p[i][1]);h.setAttribute('tabindex','0');h.removeAttribute('aria-hidden');
   h.setAttribute('role',state?'button':'slider');h.setAttribute('aria-label',axisNames[i]+': '+improvements[state][i]);
   if(!state){h.setAttribute('aria-valuemin','0');h.setAttribute('aria-valuemax','50');h.setAttribute('aria-valuenow',Math.round(v[i]*100));h.setAttribute('aria-valuetext','Adjust '+names[i]+' priority; the other priorities balance to preserve the triangle area.');}
   else{['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'].forEach(a=>h.removeAttribute(a));}
  });
  positionTooltip();
 }
 function updateLabels(){
  const stage=stages[state];
  root.querySelector('.ttt-instruction').textContent=[
   'Drag the handles to shift the priority.\nYou can’t optimise all three at once.',
   'Automating validation improved all three dimensions,\nwith room for further improvement.',
   'The corrections project made finding and fixing errors faster,\nand changes easier to trace.'
  ][state];

  [['truth','Truth'],['time','Time'],['trust','Trust']].forEach(([key,label])=>root.querySelector('#ttt-'+key+'-heading').textContent=label);

  root.querySelector('#ttt-desc').textContent=stage.headline+' '+stage.detail+(state?' Conceptual illustration of the selected stage.':' Drag a pink corner or use arrow keys. Each corner is capped halfway along its axis; area stays constant.');
 }
 function choose(next){
  stopIntro();
  if(next===state)return;
  cancelAnimationFrame(raf);hideTooltip();drag=null;state=next;
  const from=values.slice(),target=(state===2?after:state===1?original:manual).slice(),fromColor=currentColor.slice(),targetColor=stateColors[state];
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.state)===state)));
  pill.style.transform='translateX('+(state*100)+'%)';updateLabels();
  const t0=performance.now(),duration=reduce.matches?0:850;
  function tick(now){const p=duration?Math.min(1,(now-t0)/duration):1,k=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;values=from.map((v,i)=>v+(target[i]-v)*k);draw(values,fromColor.map((v,i)=>v+(targetColor[i]-v)*k));if(p<1)raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
 }
 buttons.forEach(button=>button.addEventListener('click',()=>choose(Number(button.dataset.state))));
 function setManual(i,requested,source){manual=rebalance(i,requested,source);values=manual.slice();draw(values);}
 function projection(event,i){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());const dx=ends[i][0]-center[0],dy=ends[i][1]-center[1];return((q.x-center[0])*dx+(q.y-center[1])*dy)/(dx*dx+dy*dy);}
 handles.forEach((handle,i)=>{
  handle.addEventListener('pointerenter',()=>{if(!drag)showTooltip(i);});
  handle.addEventListener('pointerleave',()=>{if(document.activeElement!==handle)hideTooltip();});
  handle.addEventListener('focus',()=>showTooltip(i));
  handle.addEventListener('blur',hideTooltip);
  handle.addEventListener('pointerdown',event=>{
   if(state){showTooltip(i);return;}if(event.button>0)return;hideTooltip();event.preventDefault();cancelAnimationFrame(raf);values=manual.slice();draw(values);
   drag={index:i,source:manual.slice(),pointerId:event.pointerId,offset:projection(event,i)-manual[i]};
   handle.setPointerCapture(event.pointerId);handle.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove',event=>{
   if(!drag||state||drag.index!==i||drag.pointerId!==event.pointerId)return;
   event.preventDefault();setManual(i,projection(event,i)-drag.offset,drag.source);
  });
  function finish(event){if(drag&&drag.pointerId===event.pointerId){drag=null;handle.classList.remove('is-dragging');updateLabels();}}
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
  handle.addEventListener('keydown',event=>{
   if(event.key==='Escape'){hideTooltip();return;}
   if(state){if(event.key==='Enter'||event.key===' '){event.preventDefault();showTooltip(i);}return;}
   const delta={ArrowUp:.025,ArrowRight:.025,ArrowDown:-.025,ArrowLeft:-.025}[event.key];
   if(delta===undefined&&event.key!=='Home'&&event.key!=='End')return;
   event.preventDefault();cancelAnimationFrame(raf);setManual(i,event.key==='Home'?.08:event.key==='End'?.5:manual[i]+delta,manual);
  });
 });
 function stopIntro(){
  introDone=true;cancelAnimationFrame(introRaf);introRaf=0;
  if(introObserver)introObserver.disconnect();
 }
 function playIntro(){
  if(introDone||reduce.matches||state!==0)return;
  introDone=true;
  const start=manual.slice(),low=start[0];
  const stops=[start,[.5,low,low],[low,.5,low],start];
  const began=performance.now(),delay=450,move=900,hold=180,leg=move+hold;
  function frame(now){
   if(state!==0||drag||reduce.matches){stopIntro();return;}
   const elapsed=now-began-delay;
   if(elapsed<0){introRaf=requestAnimationFrame(frame);return;}
   const cycleElapsed=elapsed%(3*leg);
   const index=Math.floor(cycleElapsed/leg),phase=Math.min(1,(cycleElapsed-index*leg)/move);
   const k=phase<.5?4*phase*phase*phase:1-Math.pow(-2*phase+2,3)/2;
   const v=stops[index].map((n,i)=>n+(stops[index+1][i]-n)*k);
   const area=v[0]*v[1]+v[0]*v[2]+v[1]*v[2],scale=Math.sqrt(AREA/area);
   manual=v.map(n=>n*scale);values=manual.slice();draw(values);
   introRaf=requestAnimationFrame(frame);
  }
  introRaf=requestAnimationFrame(frame);
 }
 function layout(){
  const cw=root.clientWidth;
  const tabScale=cw>=600?cw/725:cw/Math.max(302,Math.round(cw/1.08));
  root.style.setProperty('--ttt-tab-scale',String(tabScale));
  const narrow=root.clientWidth<520;
  root.style.setProperty('--ttt-description-size',(narrow?18*cw/465:12*cw/725)+'px');
  svg.setAttribute('viewBox',narrow?'130 45 465 417':'0 0 725 452');
  svg.querySelectorAll('text').forEach(t=>{const x=Number(t.getAttribute('data-x')||t.getAttribute('x'));t.setAttribute('data-x',x);t.setAttribute('x',narrow?(x===210?250:x===515?475:x):x);t.setAttribute('font-size',narrow?(t.getAttribute('font-weight')==='600'?21:18):(t.getAttribute('font-weight')==='600'?15:12));});
  handles.forEach(h=>h.setAttribute('r',narrow?35:19));positionTooltip();
 }
 root.addEventListener('pointerdown',event=>{stopIntro();if(!handles.includes(event.target))hideTooltip();});
 root.addEventListener('focusin',stopIntro);
 root.addEventListener('keydown',event=>{event.stopPropagation();stopIntro();if(event.key==='Escape')hideTooltip();});
 new ResizeObserver(layout).observe(root);layout();draw(values);updateLabels();
 const slide=root.closest('section'), main=document.querySelector('main.reveal');
 function syncVisibility(){
  const visible=slide.classList.contains('present')&&!main.inert&&main.style.visibility!=='hidden'&&!document.hidden;
  if(!visible){cancelAnimationFrame(introRaf);introRaf=0;hideTooltip();}
  else if(!introDone&&!reduce.matches)playIntro();
 }
 new MutationObserver(syncVisibility).observe(main,{subtree:true,attributes:true,attributeFilter:['class','inert','style']});
 document.addEventListener('visibilitychange',syncVisibility);
 syncVisibility();
 if(reduce.addEventListener)reduce.addEventListener('change',event=>{if(event.matches)stopIntro();});
})();

"""Rebuild the editable dashboard vectors. Optional source JPEG improves line tracing.
Usage: python3 scripts/build-dashboard-svg.py [/path/to/dashboard.jpg]
"""
from pathlib import Path
import math, html, subprocess, sys, shutil
ROOT=Path(__file__).resolve().parents[1]
p=[]
def add(s): p.append(s)
def rect(x,y,w,h,c,rx=0,extra=''): add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" {extra}/>')
def text(x,y,s,size=13,c='#b8bbd1',weight='normal',anchor='start',extra=''): add(f'<text x="{x}" y="{y}" fill="{c}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" {extra}>{html.escape(str(s))}</text>')
def line(x,y,X,Y,c='#232541',w=1,extra=''): add(f'<path d="M{x},{y} L{X},{Y}" stroke="{c}" stroke-width="{w}" fill="none" {extra}/>')
def path(d,c,stroke='none',w=1,extra=''): add(f'<path d="{d}" fill="{c}" stroke="{stroke}" stroke-width="{w}" {extra}/>')
def circle(x,y,r,c,extra=''): add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" {extra}/>')
def polar(cx,cy,r,a): return (cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a)))
def arc(cx,cy,r,a,b):
 x,y=polar(cx,cy,r,a); X,Y=polar(cx,cy,r,b)
 return f'M{x:.3f},{y:.3f} A{r},{r} 0 {int(b-a>180)} 1 {X:.3f},{Y:.3f}'
def sector_path(cx,cy,ri,ro,a,b):
 x,y=polar(cx,cy,ro,a); X,Y=polar(cx,cy,ro,b); u,v=polar(cx,cy,ri,b); U,V=polar(cx,cy,ri,a)
 return f'M{x:.3f},{y:.3f} A{ro},{ro} 0 {int(b-a>180)} 1 {X:.3f},{Y:.3f} L{u:.3f},{v:.3f} A{ri},{ri} 0 {int(b-a>180)} 0 {U:.3f},{V:.3f} Z'
def sector(cx,cy,ri,ro,a,b,c,extra=''):
 path(sector_path(cx,cy,ri,ro,a,b),c,'#07071f',1.5,extra)
def pill(x,y,w,label):
 rect(x,y,w,22,'#2e385f',11); text(x+13,y+15,label); text(x+w-12,y+9,'▴',8,'#929ab9','normal','middle'); text(x+w-12,y+17,'▾',8,'#929ab9','normal','middle')
add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 915" width="2000" height="915" role="img" aria-labelledby="title desc">')
add('<title id="title">Quantemplate risk dashboard</title><desc id="desc">Vector recreation of the supplied dashboard. Solvency margin, value at risk at 25.710 percent, volatility breakdown, and risk distributions.</desc>')
add('<defs><clipPath id="chart-clip"><rect x="42" y="54" width="463" height="260"/></clipPath><clipPath id="line-clip"><rect id="line-reveal" x="42" y="54" width="463" height="260"/></clipPath><clipPath id="fan-clip"><rect id="fan-reveal" x="181" y="54" width="324" height="261"/></clipPath><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter></defs>')
add('<g font-family="Arial, Helvetica, sans-serif">'); rect(0,0,2000,915,'#020119')
text(16,31,'Solvency margin',16,weight='bold')
rect(42,54,139,260,'#040623')
for i in range(9):
 y=315-i*32.6; line(42,y,505,y,'#171a37'); text(33,y+4,f'{.5+i*.5:.1f}',11,'#898aa4',anchor='end')
line(42,315,505,315,'#5a5b77')
for i,m in enumerate('J F M A M J J A S O N D'.split()):
 x=42+i*41.9; line(x,315,x,309,'#7e7e94'); text(x,333,m,10,'#626681','normal','middle')
add('<g clip-path="url(#fan-clip)" id="forecast-fan">')
for pts,col in [([(181,232),(233,153),(337,117),(422,63),(504,57),(504,270),(422,244),(337,244),(263,266)],'#081534'), ([(181,232),(263,161),(337,133),(422,96),(504,88),(504,220),(422,203),(337,219),(263,253)],'#1d2d4b')]:
 path('M'+' L'.join(f'{x},{y}' for x,y in pts)+' Z',col)
add('</g>')
# Trace the actual green raster line, retaining its original small-scale fluctuations.
source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'media/dashboard.jpg'
raw=subprocess.check_output([shutil.which('ffmpeg') or 'ffmpeg','-v','error','-i',str(source),'-vf','scale=2000:915','-f','rawvideo','-pix_fmt','rgb24','-'])
points=[]; last=145
for x in range(43,505):
 candidates=[]
 for y in range(85,253):
  r,g,b=raw[(y*2000+x)*3:(y*2000+x)*3+3]
  score=g-max(r,b)
  if score>12 and g>48: candidates.append((score-.13*abs(y-last),y))
 if candidates: last=max(candidates)[1]
 points.append((x,last))
path('M'+' L'.join(f'{x},{y}' for x,y in points),'none','#47875b',1.2,'id="solvency-line" clip-path="url(#line-clip)"')
line(233,43,233,315,'#398488',1.5); rect(230,35,6,18,'#3a7f86',3)
circle(181,232,3.5,'#020119','stroke="#d9e4d5" stroke-width="2"')
for y in [154,230,252]: circle(233,y,2.3,'#66a65b')
text(519,59,'Current',13,'#e9e9f0'); text(519,84,'2.802%',24,'#f3f2f7','bold'); text(519,103,'01 May 2012',12,'#dddce7')
text(519,131,'Forecast',13,'#59ae69'); text(519,156,'5.002%',24,'#59ae69','bold'); text(519,175,'14 Sep 2012',12,'#59ae69')
text(519,205,'Percentile'); text(581,205,'95th',13,'#dedde9'); text(519,229,'Upper');text(581,229,'4.200%',12,'#59ae69','bold');text(519,244,'Lower');text(581,244,'3.405%',12,'#59ae69','bold')
for x,w,label,title in [(665,174,'None','Stress test'),(865,174,'Model name','Macro model'),(1077,68,'Years','Time Horizon')]:
 text(x if x<1050 else 1058,30,title,13,'#8a8ca8');pill(x,39,w,label)
text(1061,55,'5')
# Segmented value-at-risk dial.
cx,cy=905,217
path(arc(cx,cy,130,150,390),'none','#171a39',2)
for i in range(100):
 a=150+i*2.4
 path(arc(cx,cy,105,a,a+1.45),'none','#202d57',34)
for i in range(26):
 a=150+i*2.4
 path(arc(cx,cy,105,a,a+1.45),'none','#7dff40',36,f'class="dial-tick" data-step="{i}"')
path(arc(cx,cy,108,150,211.7),'none','#6bff45',29,'opacity=".28" filter="url(#glow)" id="dial-glow"')
x,y=polar(cx,cy,130,-20);circle(round(x,2),round(y,2),3.5,'#020119','stroke="#fc374f" stroke-width="2"')
text(905,191,'Value at Risk',16,weight='bold',anchor='middle');text(905,225,'25.710%',32,'#f9f9ff','bold','middle','id="var-value"')
text(827,285,'0.000',12);text(981,285,'100.000',12,anchor='end')
for x,lines in [(664,['Confidence','Level','99.500 %']),(1083,['Warning','75.000 %'])]:
 for i,s in enumerate(lines):text(x,188+i*17 if x==664 else 198+i*17,s,13)
pill(796,312,126,'Solvency margin');pill(929,312,35,'≤');text(973,327,'0.800 %',12)
line(15,347,1147,347,'#222442')
# Highlight chips and tables.
text(16,388,'Highlight',16,weight='bold')
for x,y,s,on in [(102,373,'FX',1),(277,373,'Interest Rates',0),(452,373,'GDP',0),(102,409,'Counterparty Risk',0),(277,409,'Inflation',0),(452,409,'Unemployment',0)]:
 rect(x,y,159,27,'#2e385f',14);text(x+13,y+18,s,14,'#a1a6c3','bold');circle(x+146,y+13,5.5,'#ee315f' if on else '#17264b')
regions=['Antarctica','Asia','Australia and Oceania','Central America & Caribbean','Europe','M.E, N.A. and Greater Arabia','North America','South America','Sub-Sahara Africa']
industries=['Consumer Discretionary','Consumer Staples','Energy','Financials','Health Care','Industrials','Information Technology','Materials','Telecommunication Services','Utilities']
for x,title,rows,vals in [(16,'Region',regions,['00.000','12.304','13.109','04.234','19.023','01.015','23.023','02.012','00.019']),(331,'Industry',industries,['19.023','01.015','23.023','02.012','00.019','19.023','01.015','23.023','02.012','00.019'])]:
 rect(x,462,280,37,'#2c365d');text(x+9,486,title,14,weight='bold');rect(x+136,471,55,19,'#112143',10);text(x+164,485,'Filter',13,weight='bold',anchor='middle');circle(x+206,481,5.5,'#142649');text(x+220,486,'% of VaR',13,'#9ca1bb')
 for i,(label,val) in enumerate(zip(rows,vals)):
  y=518+i*36.7;path(f'M{x+7},{y-5} l4,5 -4,5 Z','#8992b4');text(x+15,y+4,label,12,'#c3c3d4');circle(x+206,y,5.5,'#1a2a50','class="region-dot"' if x==16 else 'class="industry-dot"');text(x+273,y+4,val,12,'#c5c7dd',anchor='end');line(x,y+18,x+280,y+18,'#64647f',1.1)
 for i in range(len(rows)):
  glow_class='region-glow' if x==16 else 'industry-glow'
  circle(x+206,518+i*36.7,7,'#70d58c',f'class="{glow_class}" opacity="0" filter="url(#glow)" pointer-events="none"')
 rect(x+285,501,8,325 if x==16 else 298,'#182442',4)
# Sunburst geometry is shared by the neutral segments and their red overlays.
# Each bar starts at its segment's inner radius and uses the exact same angles.
text(663,388,'Volatility Breakdown',16,weight='bold');text(663,406,'% of VaR',13,'#9396b0')
cx,cy=911,622
segments={}
def donut_segment(name,ri,ro,a,b,c):
 segments[name]=(ri,ro,a,b)
 sector(cx,cy,ri,ro,a,b,c,extra=f'id="segment-{name}"')
for name,a,b,col in [('current-assets',-90,26,'#434359'),('long-term-assets',28,81,'#404157'),('current-liabilities',83,109,'#303149'),('long-term-liabilities',111,253,'#45455a'),('equities',255,269,'#45455a')]:
 donut_segment(name,77,128,a,b,col)
middle=[('assets-upper',-90,-55,182,'#292a42'),('assets-right',-55,-1,178,'#292a42'),('assets-lower',0,25,181,'#27283f'),('long-assets-upper',27,48,178,'#282940'),('long-assets-lower',49,64,178,'#282940'),('long-assets-highlight',65,81,179,'#272940'),('current-liab-a',83,91,177,'#2e2f47'),('current-liab-b',92,101,178,'#2c2d45'),('current-liab-c',102,109,179,'#2b2c43'),('long-liab-middle',111,218,178,'#2c2c44'),('equities-a',219,232,183,'#2c2c44'),('equities-highlight',232,248,183,'#2c2c44'),('equities-b',248,250,183,'#2c2c44'),('equities-c',251,258,184,'#303048'),('equities-d',259,268,184,'#35354d')]
for name,a,b,r,col in middle:
 donut_segment(name,128,r,a,b,col)
 if name not in ['assets-right','long-assets-lower','long-liab-middle']:
  sector(cx,cy,r+2,r+8,a,b,col)
for name,a,b,r in [('assets-outer',-55,-1,230),('long-assets-outer',49,64,235),('long-liab-outer-highlight',111,133,236),('long-liab-outer-a',133,174,236),('long-liab-outer-sliver',174,178,236),('long-liab-outer-b',178,218,236)]:
 donut_segment(name,182,r,a,b,'#1e1f38')
 sector(cx,cy,r+2,r+8,a,b,'#17182e')
for a in [-88,-83,-80,25,29,46,79,82,101,103,105,249,253,257,260]:
 x,y=polar(cx,cy,130,a);X,Y=polar(cx,cy,181,a);line(x,y,X,Y,'#07071c',1)
# Clip to the shared segment paths and redraw their borders over the bars.
red_segments=[('long-term-liabilities',20,'#f02e5d'),('long-term-assets',22,'#f02e5d'),('long-liab-middle',12,'#851c47'),('long-assets-highlight',24,'#851c47'),('long-liab-outer-highlight',8,'#5c173b'),('long-liab-outer-sliver',5,'#6e193f'),('equities-highlight',2,'#ac2452')]
for name,w,c in red_segments:
 ri,ro,a,b=segments[name]
 d=sector_path(cx,cy,ri,ro,a,b)
 add(f'<defs><clipPath id="clip-{name}"><path d="{d}"/></clipPath></defs>')
 path(arc(cx,cy,ri+w/2,a,b),'none',c,w,f'class="red-arc" pathLength="1" data-segment="{name}" data-inner="{ri}" data-start="{a}" data-end="{b}" clip-path="url(#clip-{name})"')
 path(d,'none','#07071f',1.5)
text(911,625,'100.000',32,'#fff','bold','middle');text(911,648,'Total % of VaR',14,'#d5d4df',anchor='middle')
for x,y,ls in [(898,498,['Equities']),(1022,547,['Current','Assets']),(990,721,['Long Term','Assets']),(902,746,['Current','Liabilities']),(785,625,['Long Term','Liabilities'])]:
 for i,s in enumerate(ls):text(x,y+i*19,s,16,'#f7f6fb','bold','middle')
# Risk breakdown rows. Each curve starts at the zero axis and grows upward from its baseline.
text(1189,31,'Risk Breakdown',16,weight='bold');text(1189,50,'% of VaR',13,'#969ab7');text(1676,50,'0',13,'#969ab7',anchor='middle');text(1978,50,'Mean position (GBP)',13,'#969ab7',anchor='end')
rows=[
('31.039','Current Assets','62,400,000',57,38,1818,20,53,'#10285d','#3a6dc5',0),
('19.124','Long Term Assets','22,400,000',104,38,1745,35,22,'#17395e','#55a3cb',0),
('08.234','Current Liabilities','- 12,000,000',152,37,1637,32,27,'#1d435c','#63c6cb',0),
('38.480','Long Term Liabilities','- 66,800,000',199,36,1487,16,78,'#1e494f','#6fcfb7',0),
('22.009','Insurance Provisions','- 48,700,000',238,23,1539,21,13,'#29293f','#6fa3a5',1),
('02.012','Accident & Health','- 6,000,000',264,24,1657,12,4,'#1e1e36','#67b6b3',2),
('05.023','Aviation Liability','- 12,000,000',290,24,1639,15,4,'#1e1e36','#65b3af',2),
('–','Aerospace Product Liability','–',317,24,None,0,0,'#111129','#67b6b3',3),
('01.985','Aircraft Operators & Owners Liability','- 4,000,000',343,24,1662,7,6,'#111129','#67b6b3',3),
('00.601','Airport Owners Contractor Liability','- 500,000',370,24,1670,6,5,'#111129','#67b6b3',3),
('03.034','Aviation Liability','- 7,500,000',396,24,1654,6,5,'#111129','#67b6b3',3),
('–','Space Risk Liability','–',422,24,None,0,0,'#111129','#67b6b3',3),
('03.102','Aviation Physical Loss','- 4,000,000',449,24,1662,7,6,'#1e1e36','#67b6b3',2),
('02.012','Energy','- 6,000,000',475,24,1657,12,3,'#1e1e36','#67b6b3',2),
('00.429','Goods in Transit','- 1,000,000',501,24,1668,6,6,'#1e1e36','#67b6b3',2),
('07.009','Liability','- 17,000,000',527,24,1592,25,2,'#1e1e36','#67b6b3',2),
('00.009','Marine Liability','- 200,000',553,24,1672,6,5,'#1e1e36','#67b6b3',2),
('00.009','Marine Physical Loss','- 500,000',580,24,1669,8,4,'#1e1e36','#67b6b3',2),
('–','Pecuniary Loss','–',606,24,None,0,0,'#1e1e36','#67b6b3',2),
('05.023','Property','- 12,000,000',633,24,1611,11,5,'#1e1e36','#67b6b3',2),
('01.985','Long Term Debt','- 4,000,000',660,23,1662,6,7,'#29293f','#67b6b3',1),
('04.809','Total Creditors','- 10,000,000',685,24,1632,10,5,'#29293f','#67b6b3',1),
('00.041','Deferred Taxes Debit','- 100,000',712,24,1671,6,6,'#29293f','#67b6b3',1),
('–','Total Other Liabilities','–',738,24,None,0,0,'#29293f','#67b6b3',1),
('01.985','Provisions For Risks And Charges','- 4,000,000',765,23,1659,5,39,'#29293f','#67b6b3',1),
('03.123','Equity','6,000,000',800,36,1653,27,19,'#1f4844','#76d79a',0)]
for i,(val,label,mean,y,h,m,peak,spread,bg,col,indent) in enumerate(rows):
 rect(1189,y,781,h,bg);text(1197,y+h/2+5,val,12,'#8c95b2');text(1252+indent*26,y+h/2+5,label,13,'#c3c7d9');text(1962,y+h/2+5,mean,13,'#c3c7d9',anchor='end')
 if indent in [1,2]:
  x=1252+(indent-1)*26; yy=y+h/2
  path(f'M{x},{yy-4} l4,5 -4,5 Z' if i not in [4,6] else f'M{x},{yy} l9,0 -4.5,5 Z','#929ebd')
 line(1676,y,1676,y+h,'#080e2a' if i<4 else '#52536a',1)
 if m:
  baseline=y+h-1
  add(f'<g class="risk-curve" data-x="{m}" data-baseline="{baseline}" data-row="{i}">')
  pts=[]
  for j in range(61):
   x=m-spread+2*spread*j/60; z=(x-m)/(spread/2.6); yy=baseline-peak*math.exp(-z*z/2);pts.append((x,yy))
  d='M'+' L'.join(f'{x:.2f},{yy:.2f}' for x,yy in pts)
  path(d+f' L{m+spread},{baseline} L{m-spread},{baseline} Z',col,extra='opacity=".24"')
  path(d,'none',col,1.4 if i<4 or i==25 else .8,extra='opacity=".85"')
  line(m,y,m,baseline,col,.7,'opacity=".65"');add('</g>')
rect(1978,57,7,731,'#131b39',3)
add('</g>')
static='\n'.join(p)+ '\n</svg>\n'
(ROOT/'media/dashboard-vector.svg').write_text(static)
# Transparent hit areas preserve the artwork while giving every chart one hover target.
for name,label,x,y,w,h in [
 ('solvency','Replay solvency margin',12,12,625,324),
 ('dial','Replay value at risk',654,76,496,260),
 ('donut','Replay volatility breakdown',648,366,503,497),
 ('risk','Replay risk breakdown',1184,12,800,827),
 ('region','Replay region filters',12,457,300,380),
 ('industry','Replay industry filters',326,457,300,418)]:
 rect(x,y,w,h,'transparent',extra=f'class="animation-target" data-animation="{name}" tabindex="0" role="button" aria-label="{label}" style="cursor:pointer;pointer-events:all"')
add('<style>.animation-target:focus{outline:none}.animation-target:focus-visible{stroke:#70d58c;stroke-width:2;rx:6}</style>')
script=r'''<script><![CDATA[
(function(){
const svg=document.documentElement;
const ticks=[...svg.querySelectorAll('.dial-tick')], reds=[...svg.querySelectorAll('.red-arc')], curves=[...svg.querySelectorAll('.risk-curve')];
const filterDots=Object.fromEntries(['region','industry'].map(name=>[name,{dots:[...svg.querySelectorAll('.'+name+'-dot')],halos:[...svg.querySelectorAll('.'+name+'-glow')]}]));
const clamp=v=>Math.max(0,Math.min(1,v));
// Cubic-bezier(.66, 0, .18, 1): controlled wind-up, brisk release, gentle landing.
// Keep the durations unchanged; the acceleration profile supplies the extra snap.
function ease(value){
 const x=clamp(value);if(x===0||x===1)return x;
 let lo=0,hi=1,t=x;
 for(let i=0;i<16;i++){
  t=(lo+hi)/2;
  const u=1-t,bx=3*u*u*t*.66+3*u*t*t*.18+t*t*t;
  if(bx<x)lo=t;else hi=t;
 }
 return 3*(1-t)*t*t+t*t*t;
}
const duration=4600, reduced=matchMedia('(prefers-reduced-motion: reduce)');
const states=Object.fromEntries(['solvency','dial','donut','risk','region','industry'].map(name=>[name,{time:0,start:0,running:false}]));
let frame=0, started=false, active='solvency';
function render(name,time){
 if(name==='dial'){
  const dial=ease((time-250)/2400);
  svg.getElementById('var-value').textContent=(25.710*dial).toFixed(3)+'%';
  ticks.forEach((el,i)=>el.style.opacity=clamp(dial*25.71-i));
  svg.getElementById('dial-glow').style.opacity=.28*dial;
 }else if(name==='solvency'){
  const lp=ease((time-150)/2900);
  svg.getElementById('line-reveal').setAttribute('width',463*lp);
  svg.getElementById('fan-reveal').setAttribute('width',324*ease((time-1100)/2400));
 }else if(name==='donut'){
  const sweep=360*ease((time-450)/3000);
  reds.forEach(el=>{const a=+el.dataset.start,b=+el.dataset.end;el.style.strokeDasharray='1';el.style.strokeDashoffset=1-clamp((sweep-a)/(b-a));});
 }else if(name==='risk'){
  curves.forEach(el=>{const q=ease((time-500-Number(el.dataset.row)*45)/2100),x=+el.dataset.x,y=+el.dataset.baseline;el.setAttribute('transform',`translate(${(1676-x)*(1-q)} ${y*(1-q)}) scale(1 ${q})`);el.style.opacity=clamp(q*4);});
 }else if(filterDots[name]){
  const {dots,halos}=filterDots[name];
  dots.forEach((el,i)=>{
   const t=time-250-i*210;
   const intensity=t<0?0:t<480?.5-.5*Math.cos(Math.PI*t/480):t<1500?.5+.5*Math.cos(Math.PI*(t-480)/1020):0;
   const base=[26,42,80], green=[112,213,140];
   el.setAttribute('fill',`rgb(${base.map((v,j)=>Math.round(v+(green[j]-v)*intensity)).join(',')})`);
   halos[i].setAttribute('opacity',String(.32*intensity));
  });
 }
}
function pause(){cancelAnimationFrame(frame);frame=0;Object.values(states).forEach(s=>s.running=false);}
function tick(now){
 frame=0;
 for(const [name,s] of Object.entries(states))if(s.running){s.time=Math.min(duration,now-s.start);render(name,s.time);if(s.time===duration)s.running=false;}
 if(Object.values(states).some(s=>s.running))frame=requestAnimationFrame(tick);
}
function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
function seek(ms){pause();for(const [name,s] of Object.entries(states)){s.time=Math.max(0,Math.min(duration,ms));render(name,s.time);}}
function play(){
 started=true;
 if(reduced.matches){seek(duration);return;}
 const now=performance.now();
 for(const s of Object.values(states))if(s.time<duration){s.start=now-s.time;s.running=true;}
 schedule();
}
function replay(name){
 started=true;
 if(!name){active='solvency';seek(0);play();return;}
 if(!states[name]||states[name].running)return;
 active=name;
 const s=states[name];s.time=reduced.matches?duration:0;render(name,s.time);
 if(!reduced.matches){s.start=performance.now();s.running=true;schedule();}
}
function firstScroll(){
 if(started)return;
 // On a long page, wait for the first scroll that brings the dashboard into view.
 try{
  const host=window.frameElement;
  if(host){
   const box=host.getBoundingClientRect(),vh=window.parent.innerHeight;
   if(box.top>vh-Math.min(box.height*.2,120)||box.bottom<0)return;
  }
 }catch(e){}
 replay();
}
svg.dashboard={play,pause,replay,seek(ms){started=true;seek(ms);},firstScroll,get time(){return states[active].time;},get playing(){return Object.values(states).some(s=>s.running);},get started(){return started;},duration};
svg.querySelectorAll('.animation-target').forEach(el=>{
 el.addEventListener('pointerenter',e=>{if(started&&e.pointerType!=='touch')replay(el.dataset.animation);});
 el.addEventListener('click',()=>replay(el.dataset.animation));
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay(el.dataset.animation);}});
});
// Same-origin object embeds can respond to the containing page's first scroll.
window.addEventListener('scroll',firstScroll,{passive:true});
try{if(window.parent!==window)window.parent.addEventListener('scroll',firstScroll,{passive:true});}catch(e){}
seek(reduced.matches?duration:0);
try{if(window.frameElement&&window.parent.scrollY>0)firstScroll();}catch(e){}
reduced.addEventListener('change',e=>{if(e.matches)seek(duration);});
})();
]]></script>'''
(ROOT/'media/dashboard-animated.svg').write_text(('\n'.join(p)+'\n'+script+'\n</svg>\n').replace('role="img"', 'role="group"', 1))
print('Created static and animated SVGs')

/* STRIKE VECTOR / Stadium Art System
 * Phase 1: FORT VECTOR. Decorative only: physical collision geometry, goals,
 * multiplayer networking and camera remain owned by the game engine.
 * All ground art is cached at half resolution. Operatives are cached sprites.
 */
(() => {
'use strict';
const TAU=Math.PI*2, cache=new Map();
let floorCache=null,floorWidth=0,floorHeight=0;
const TEAM={cyan:'#60e9f0',orange:'#ffa25e',hostile:'#d98b75',drone:'#bca9f7'};
function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
function line(g,x,y,xx,yy,color,width=1){g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
function round(g,x,y,w,h,r,color,stroke){
 g.beginPath();g.roundRect(x,y,w,h,r);
 if(color){g.fillStyle=color;g.fill();}
 if(stroke){g.strokeStyle=stroke;g.lineWidth=1.5;g.stroke();}
}
function circle(g,x,y,r,color,stroke,width=1){
 g.beginPath();g.arc(x,y,r,0,TAU);
 if(color){g.fillStyle=color;g.fill();}
 if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
}
function stencil(g,text,x,y,size,alpha=.2,color='#dfedef'){
 g.save();g.globalAlpha=alpha;g.textAlign='center';
 g.font='900 '+size+'px Oxanium,system-ui,sans-serif';g.fillStyle=color;g.fillText(text,x,y);g.restore();
}
function hatch(g,x,y,w,h,tone){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.lineWidth=4;g.strokeStyle=tone;
 for(let i=-h;i<w+h;i+=27){g.beginPath();g.moveTo(x+i,y);g.lineTo(x+i+h,y+h);g.stroke();}
 g.restore();
}
function gantry(g,x,y,side,accent){
 g.save();g.translate(x,y);if(side==='right')g.scale(-1,1);
 round(g,-12,-128,75,256,7,'#142735','#74858a');
 rect(g,0,-118,7,236,'#435660');rect(g,15,-110,35,220,'#1a313e');
 for(let k=-97;k<104;k+=31){rect(g,18,k,30,7,'#3a505b');rect(g,19,k+1,6,5,'#8f9993');}
 round(g,43,-108,22,216,3,'#152b37','#7b9699');
 rect(g,56,-94,5,188,accent);rect(g,47,-102,3,204,'#c5f4f1');
 for(let k=-109;k<=110;k+=54)circle(g,17,k,4,'#b5a79a','#303e40',1);
 g.restore();
}
function paintFloor(g,w,h){
 const random=rng(84921);
 const base=g.createLinearGradient(0,0,w,h);
 base.addColorStop(0,'#2d3941');base.addColorStop(.48,'#26343f');base.addColorStop(1,'#1a2c36');
 rect(g,0,0,w,h,base);
 // Ballistic concrete panels: subtle directional wear + inset seams.
 for(let y=61,row=0;y<h-56;y+=96,row++)for(let x=65,col=0;x<w-54;x+=138,col++){
  const v=random(),shade=v<.22?'rgba(176,197,192,.035)':v>.74?'rgba(5,12,21,.085)':'rgba(93,117,123,.028)';
  rect(g,x+2,y+2,134,91,shade);
  line(g,x,y+94,x+137,y+94,'rgba(3,14,23,.35)',2);
  line(g,x+137,y,x+137,y+94,'rgba(5,14,21,.38)',1.5);
  line(g,x+2,y+1,x+134,y+1,'rgba(203,218,209,.13)',1);
  if((col+row)%4===0){for(const dx of [11,124])for(const dy of [11,82])circle(g,x+dx,y+dy,2,'#677980','#192631');}
  if((col+row)%7===0){line(g,x+21,y+48,x+102,y+44,'rgba(9,17,23,.15)',2);}
 }
 // Floor grates: mesh inside framed reinforcement channels.
 for(const yy of [124,h-169]){
  for(let xx=190;xx<w-230;xx+=305){
   rect(g,xx,yy,132,48,'#101f29');rect(g,xx+6,yy+6,120,36,'#253b42');
   for(let k=0;k<10;k++)line(g,xx+10+k*12,yy+7,xx+10+k*12,yy+40,'rgba(7,16,23,.65)',3);
   line(g,xx+7,yy+17,xx+125,yy+17,'rgba(144,160,158,.43)',1);
   line(g,xx+7,yy+31,xx+125,yy+31,'rgba(144,160,158,.43)',1);
   for(const px of [xx+4,xx+127])for(const py of [yy+4,yy+44])circle(g,px,py,2.5,'#81949a');
  }
 }
 // Sport pitch lanes and team warm-up areas.
 g.save();g.lineWidth=3;g.strokeStyle='rgba(202,220,215,.37)';
 g.strokeRect(105,176,w-210,h-352);
 line(g,w/2,173,w/2,h-173,'rgba(210,224,215,.36)',3);
 circle(g,w/2,h/2,178,null,'rgba(197,221,209,.33)',4);
 circle(g,w/2,h/2,38,null,'rgba(209,232,227,.36)',3);
 for(const x of [318,w-318]){
  g.strokeRect(x-90,h/2-260,180,520);
  g.strokeRect(x-54,h/2-110,108,220);
 }
 g.restore();
 rect(g,110,h/2-280,52,560,'rgba(42,199,218,.08)');
 rect(g,w-162,h/2-280,52,560,'rgba(255,147,65,.08)');
 // Physical hard-light goal gantries, positioned around the unchanged physics mouth.
 gantry(g,67,h/2,'left','#50d9f9');gantry(g,w-67,h/2,'right','#ffac63');
 // Industrial caution chevrons near boundaries.
 for(const xx of [104,w-165])for(const yy of [220,h-292]){
  rect(g,xx,yy,60,78,'#2a3337');hatch(g,xx+5,yy+7,50,65,'rgba(255,172,61,.49)');
  g.strokeStyle='rgba(243,191,116,.45)';g.strokeRect(xx,yy,60,78);
 }
 // Full stadium frame with bolted floor plates.
 g.strokeStyle='#5c737c';g.lineWidth=15;g.strokeRect(43,43,w-86,h-86);
 g.strokeStyle='rgba(214,233,229,.48)';g.lineWidth=2;g.strokeRect(55,55,w-110,h-110);
 for(let x=90;x<w-60;x+=150)for(const y of [48,h-48]){circle(g,x,y,4,'#86989a','#142533',1);}
 for(let y=90;y<h-60;y+=130)for(const x of [48,w-48])circle(g,x,y,4,'#86989a','#142533',1);
 // Arena identity: field stencils and numbers, intentionally low contrast.
 stencil(g,'FORT VECTOR',w/2,h/2+233,56,.17);
 stencil(g,'FV',w/2,h/2+42,122,.105,'#d7ffff');
 for(const [name,x,y] of [['A1',422,355],['A2',w-422,355],['B1',422,h-315],['B2',w-422,h-315]]){
  stencil(g,name,x,y,88,.19,'#ebf8ee');line(g,x-75,y+17,x+75,y+17,'rgba(219,229,225,.19)',4);
 }
 // Industrial railings, cooling units, and score displays outside the main play lanes.
 for(const y of [88,h-100])for(let x=265;x<w-300;x+=330){
  round(g,x,y,165,39,4,'#142833','#607782');rect(g,x+9,y+5,147,4,'#517079');
  for(let k=0;k<8;k++)line(g,x+12+k*18,y+14,x+12+k*18,y+32,'rgba(171,208,208,.35)',2);
  for(const p of [x+5,x+160])circle(g,p,y+19,4,'#bca887');
 }
 // Fixed decals: impact scars and directional micro-scrapes (never animated).
 for(let i=0;i<1700;i++){
  const x=78+random()*(w-156),y=78+random()*(h-156),size=.6+random()*4.5;
  if(random()<.35){line(g,x,y,x+size*(1+random()*2),y-.5-size*.3,'rgba(14,21,25,.14)',1);}
  else{circle(g,x,y,size*.35,random()<.5?'rgba(12,20,25,.12)':'rgba(175,184,182,.095)');}
 }
 // Stadium lighting: restrained halos, fixed geometry, no per-frame blur.
 for(const [x,y,color,r] of [[155,130,'90,227,239',420],[w-155,130,'255,176,115',420],[155,h-130,'90,227,239',400],[w-155,h-130,'255,176,115',400]]){
  const light=g.createRadialGradient(x,y,3,x,y,r);light.addColorStop(0,'rgba('+color+',.16)');light.addColorStop(1,'rgba('+color+',0)');
  g.fillStyle=light;g.fillRect(x-r,y-r,2*r,2*r);
  round(g,x-22,y-16,44,29,4,'#102533','#768c92');
  for(let k=-1;k<=1;k++)circle(g,x+k*12,y-2,5,'#b8eaf0','#617982',1);
 }
}
function drawFloor(g,world){
 const w=world.w,h=world.h;
 if(!floorCache||floorWidth!==w||floorHeight!==h){
  floorWidth=w;floorHeight=h;
  floorCache=document.createElement('canvas');
  floorCache.width=Math.ceil(w*.5);floorCache.height=Math.ceil(h*.5);
  const c=floorCache.getContext('2d',{alpha:false});
  c.scale(.5,.5);paintFloor(c,w,h);
 }
 g.drawImage(floorCache,0,0,w,h);
}
function paintCover(o){
 const g=o.texture.getContext('2d'),w=o.w,h=o.h,isBox=o.k==='crate';
 g.clearRect(0,0,w,h);
 const base=g.createLinearGradient(0,0,w,h);
 base.addColorStop(0,isBox?'#617278':'#65777b');
 base.addColorStop(.22,isBox?'#344f54':'#3d5258');
 base.addColorStop(.78,isBox?'#203c45':'#2b3f4c');
 base.addColorStop(1,isBox?'#142934':'#1b303e');
 round(g,.5,.5,w-1,h-1,3,base,'#9fb5b1');
 // Surface shadow, pressure fittings, military polymer panels.
 round(g,8,8,w-16,h-16,2,isBox?'#233f46':'#354850','#7a9295');
 if(isBox){
  round(g,16,16,w-32,h-32,3,'#35565c','#729593');
  line(g,20,20,w-20,h-20,'rgba(165,198,188,.37)',4);
  line(g,w-20,20,20,h-20,'rgba(12,27,31,.63)',5);
  rect(g,16,h/2-7,w-32,14,'rgba(12,27,30,.3)');
 }else{
  rect(g,12,18,w-24,9,'#152c39');
  rect(g,12,h-26,w-24,9,'#162d39');
  for(let x=27;x<w-22;x+=29){rect(g,x,28,9,Math.max(0,h-56),'rgba(133,161,160,.12)');}
  rect(g,17,h/2-3,w-34,6,'rgba(199,207,200,.14)');
 }
 for(let x=11;x<w-6;x+=27){circle(g,x,8,2,'#a5aa9d','#24353e');circle(g,x,h-8,2,'#8c9b9d','#24353e');}
 rect(g,5,5,5,Math.max(0,h-10),'#ad9362');
 for(let y=12;y<h-12;y+=27){line(g,5,y,10,y+8,'#1a2832',3);}
 const d=rng((o.x*139+o.y*239)|0);
 for(let k=0;k<Math.floor(w*h/900);k++){
  const x=10+d()*(w-20),y=10+d()*(h-20);
  rect(g,x,y,.8+d()*3,.5+d()*2,d()<.5?'rgba(12,23,31,.14)':'rgba(173,205,206,.1)');
 }
 // Keep destructibility exact: fully depleted cells have transparent pixels.
 g.save();g.globalCompositeOperation='destination-out';
 for(let row=0;row<o.rows;row++)for(let col=0;col<o.cols;col++)
  if(o.cellHp[row*o.cols+col]<=0)g.fillRect(col*o.cell,row*o.cell,o.cell+.45,o.cell+.45);
 g.restore();
 // Bright ragged edges around holes make chipped barriers legible.
 g.fillStyle='#9daaa3';
 for(let row=0;row<o.rows;row++)for(let col=0;col<o.cols;col++){
  if(o.cellHp[row*o.cols+col]<=0)continue;
  const x=col*o.cell,y=row*o.cell,ww=Math.min(o.cell,w-x),hh=Math.min(o.cell,h-y);
  if(row===0||o.cellHp[(row-1)*o.cols+col]<=0)g.fillRect(x,y,ww,1.7);
  if(col===0||o.cellHp[row*o.cols+col-1]<=0)g.fillRect(x,y,1.7,hh);
 }
 o.dirty=false;
}
function createUnit(kind,team,weapon){
 const canvas=document.createElement('canvas');canvas.width=164;canvas.height=124;
 const g=canvas.getContext('2d');g.translate(67,62);g.scale(2,2);
 const hostile=kind==='hostile',bot=kind==='bot',color=TEAM[hostile?(team==='rusher'?'hostile':'drone'):team]||TEAM.cyan;
 if(bot){
  // AI combat drone: armored chassis, four articulating stabilizers, bright sensor.
  for(const sy of [-1,1]){
   round(g,-19,sy*17-4,24,8,4,'#203743','#899ca8');
   round(g,0,sy*16-3,20,6,2,'#324b54','#7d929a');
  }
  circle(g,-3,0,19,'#24343d','#879a9c',3);
  round(g,-12,-14,21,28,7,'#536168','#a7b6b9');
  circle(g,-3,0,10,'#102f3b',color,3);
  circle(g,-3,0,4,color,'#d0e9e5',1);
 }else{
  const cloth=hostile?'#49404b':'#394a50',armor=hostile?'#776578':'#677b81';
  // Feet, shin guards, gloves and sleeves create a distinct human silhouette.
  for(const y of [-1,1]){
   round(g,-24,y*12-5,22,10,3,'#1b2d37','#718489');
   round(g,-22,y*12-4,9,8,3,hostile?'#504454':'#4f6369');
   round(g,-6,y*19-5,21,10,4,cloth,'#8da19f');
   round(g,14,y*19-5,9,10,3,'#263b43','#9aa6a2');
  }
  round(g,-17,-16,34,32,8,cloth,'#b0b9b1');
  round(g,-14,-14,29,28,6,armor,'#aebabb');
  round(g,-9,-13,16,26,3,hostile?'#473547':'#28454d');
  rect(g,-7,-10,12,3,'#9faeaa');
  for(const y of [-9,7])rect(g,-7,y,12,2,color);
  // Collar/helmet, crown viewed top-down, curved tactical visor.
  circle(g,-5,0,13,hostile?'#4a3c4c':'#475c65','#b8c4c0',2);
  round(g,-9,-10,13,20,6,'#283f4a');
  rect(g,1,-7,6,14,color);
  round(g,-14,-5,6,10,2,'#8fabb0');
  circle(g,-9,-6,2,'rgba(255,255,255,.75)');
 }
 // Team sport marking remains dominant for quick arena recognition.
 rect(g,-20,-5,5,10,color);
 // Real weapon silhouette with stock, rail, receiver and muzzle.
 if(weapon===2){
  line(g,9,-1,36,-1,'#d5e1de',4);round(g,6,-4,13,8,2,'#293740','#9eafb0');
  line(g,29,-4,38,-1,'#f6d9ad',1.7);
 }else{
  round(g,5,-5,32,10,2,'#162b39','#a8b4b5');
  rect(g,14,-7,11,4,'#425760');rect(g,33,-3,14,6,'#6a7e81');rect(g,43,-2,7,4,'#b9ccca');
  round(g,7,5,7,10,2,'#25353b');round(g,2,-3,8,6,2,color);
  rect(g,22,-5,3,2,'#d4deda');
 }
 return canvas;
}
function drawUnit(g,info){
 const kind=info.kind||'human',team=info.team||'cyan',weapon=info.weapon||0;
 const key=kind+':'+team+':'+weapon;let sprite=cache.get(key);
 if(!sprite){sprite=createUnit(kind,team,weapon);cache.set(key,sprite);}
 g.save();g.translate(info.x,info.y);
 if(info.dead)g.globalAlpha=.3;
 // Shadow anchored to world coordinates, even while the operative rotates.
 g.fillStyle='rgba(0,6,11,.45)';g.beginPath();g.ellipse(6,11,25,15,0,0,TAU);g.fill();
 g.rotate(info.a||0);
 if(info.slide){g.scale(1.24,.72);g.translate(-5,0);}
 else if(info.crouch)g.scale(.87,.87);
 g.drawImage(sprite,-33.5,-31,82,62);
 if(info.flash){g.globalCompositeOperation='screen';g.globalAlpha=Math.min(.4,info.flash*3);g.fillStyle='#fff';g.fillRect(-15,-15,34,30);}
 g.restore();
}
function drawPuck(g,r=21){
 g.save();
 g.fillStyle='rgba(0,6,12,.62)';g.beginPath();g.ellipse(5,9,r*1.35,r*.8,0,0,TAU);g.fill();
 const shell=g.createRadialGradient(-8,-8,2,0,0,r+2);
 shell.addColorStop(0,'#6e858b');shell.addColorStop(.45,'#344d58');shell.addColorStop(1,'#101e2b');
 circle(g,0,0,r,shell,'#9ebac0',2.5);
 circle(g,0,0,r*.75,'#152d3a','#5d8189',3);
 g.save();g.shadowColor='#6bffed';g.shadowBlur=13;
 for(let i=0;i<8;i++){
  const a=i*TAU/8+.15;
  g.strokeStyle=i%2?'#ffbd76':'#73fae3';g.lineWidth=3;
  g.beginPath();g.arc(0,0,r*.84,a,a+.42);g.stroke();
 }
 g.restore();
 circle(g,0,0,r*.39,'#1a4651','#bbfdf2',2);
 circle(g,-2,-2,r*.22,'#8ff8e5');
 for(let k=0;k<4;k++){const a=k*Math.PI/2;rect(g,Math.cos(a)*r*.63-2,Math.sin(a)*r*.63-2,4,4,'#b4c7c2');}
 g.restore();
}
window.StrikeVectorArt={version:'fort-vector-1',drawFloor,paintCover,drawUnit,drawPuck};
})();

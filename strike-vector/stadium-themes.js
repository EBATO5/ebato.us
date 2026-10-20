/* STRIKE VECTOR 1.7 / Stadium themes & articulated player art
 * Purely visual. Both arenas share the game's canonical physics and cover slots.
 * Called after arena-art.js and before the main game script.
 */
(() => {
'use strict';
const art=window.StrikeVectorArt;
if(!art)return;
const original={drawFloor:art.drawFloor,paintCover:art.paintCover,drawUnit:art.drawUnit,drawPuck:art.drawPuck};
let stadium='fort',sunsetFloor=null,sunsetWidth=0,sunsetHeight=0;
const TAU=Math.PI*2, TEAM={cyan:'#63eff7',orange:'#ffab62'};
const palettes={
 fort:{name:'FORT VECTOR',subtitle:'TACTICAL TRAINING FACILITY'},
 sunset:{name:'SUNSET CIRCUIT',subtitle:'NEIGHBORHOOD GOLDEN-HOUR COURT'}
};
function setArena(which){stadium=which==='sunset'?'sunset':'fort';art.stadium=stadium;return stadium;}
function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
function line(g,x,y,a,b,color,width=1){g.beginPath();g.moveTo(x,y);g.lineTo(a,b);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
function round(g,x,y,w,h,r,color,stroke,width=2){g.beginPath();g.roundRect(x,y,w,h,r);if(color){g.fillStyle=color;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function circ(g,x,y,r,color,stroke,width=1){g.beginPath();g.arc(x,y,r,0,TAU);if(color){g.fillStyle=color;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
function stencil(g,name,x,y,size,color,alpha=.35,rotation=0){g.save();g.translate(x,y);g.rotate(rotation);g.textAlign='center';g.font='900 '+size+'px Oxanium,system-ui';g.globalAlpha=alpha;g.fillStyle=color;g.fillText(name,0,0);g.restore();}
function diagonal(g,x,y,w,h,color,step=25){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();for(let k=-h;k<w+h;k+=step)line(g,x+k,y,x+k+h,y+h,color,4);g.restore();}
function glow(g,x,y,r,color,alpha){const lg=g.createRadialGradient(x,y,0,x,y,r);lg.addColorStop(0,'rgba('+color+','+alpha+')');lg.addColorStop(1,'rgba('+color+',0)');g.fillStyle=lg;g.fillRect(x-r,y-r,r*2,r*2);}
function graffiti(g,w,h){
 // Stylized geometric street-art emblem: painted head, crown, splashes and rays.
 const x=w/2,y=h/2;
 g.save();g.translate(x,y);g.rotate(-.11);g.globalAlpha=.45;
 const random=rng(5442);
 for(let i=0;i<110;i++){
  let a=random()*TAU,r=70+random()*400;
  circ(g,Math.cos(a)*r,Math.sin(a)*r,2+random()*10,random()<.46?'#21b5d2':random()<.58?'#ef608b':'#faa15a');
 }
 line(g,-330,-210,315,165,'#fa578d',27);
 line(g,-320,210,325,-159,'#3da1c0',24);
 circ(g,0,0,185,'#183847','#f17b9e',10);
 g.beginPath();g.moveTo(-146,-76);g.lineTo(-117,-220);g.lineTo(-46,-160);g.lineTo(0,-262);g.lineTo(61,-157);g.lineTo(143,-220);g.lineTo(155,-64);g.closePath();g.fillStyle='#f7aa6c';g.fill();
 for(let sign of [-1,1]){g.save();g.translate(sign*75,-30);g.rotate(sign*.19);round(g,-50,-11,100,35,9,'#54d7dd');circ(g,-2,5,17,'#1b3a47');g.restore();}
 g.beginPath();g.moveTo(-92,74);g.quadraticCurveTo(0,132,92,74);g.strokeStyle='#f6c3a2';g.lineWidth=17;g.stroke();
 stencil(g,'SC',0,208,74,'#f3b86d',.75);
 g.restore();
}
function storefront(g,x,y,w,label,color){
 round(g,x,y,w,72,4,'#172330','#6d525e',3);
 rect(g,x+6,y+6,w-12,9,'#523b50');
 for(let n=0;n<5;n++){rect(g,x+12+n*(w-24)/5,y+18,(w-40)/5,47,n%2?'#3c223f':'#24394a');rect(g,x+15+n*(w-24)/5,y+21,(w-48)/5,5,'rgba(254,183,94,.29)');}
 round(g,x+w*.12,y+7,w*.75,24,3,'#261b31',color,2);
 stencil(g,label,x+w/2,y+25,18,color,.97);
}
function fence(g,x,y,w,vertical=false){
 g.save();g.translate(x,y);if(vertical)g.rotate(Math.PI/2);
 rect(g,0,-5,w,10,'#334657');
 for(let t=0;t<w;t+=29){line(g,t,-8,t+22,11,'rgba(139,171,182,.35)',1.4);line(g,t,11,t+22,-8,'rgba(139,171,182,.35)',1.4);}
 line(g,0,-8,w,-8,'#83949b',2);line(g,0,12,w,12,'#6c8591',2);
 for(let xx=0;xx<w;xx+=185)round(g,xx,-16,10,32,2,'#5d727e','#9dafb3',1);
 g.restore();
}
function neonGoal(g,x,y,left,accent){
 const p=left?1:-1;
 g.save();g.translate(x,y);g.scale(p,1);
 glow(g,0,0,245,left?'40,206,244':'255,147,75',.23);
 round(g,-4,-125,80,250,10,'#1b2937','#687a84',6);
 round(g,19,-108,35,216,6,'#1b2731',accent,6);
 rect(g,33,-102,6,204,'#ecf5e4');
 for(let yy=-96;yy<110;yy+=38){line(g,23,yy,52,yy,'#617079',2);}
 g.restore();
}
function paintSunset(g,w,h){
 const random=rng(22771),mid=h/2;
 const ground=g.createLinearGradient(0,0,w,h);
 ground.addColorStop(0,'#493f50');ground.addColorStop(.5,'#484052');ground.addColorStop(1,'#342d40');
 rect(g,0,0,w,h,ground);
 // Golden-hour shafts wash in from the upper right, over subdued court asphalt.
 const sun=g.createLinearGradient(w*.9,0,w*.16,h);
 sun.addColorStop(0,'rgba(255,173,88,.39)');sun.addColorStop(.42,'rgba(229,126,90,.11)');sun.addColorStop(1,'rgba(29,16,54,0)');
 rect(g,0,0,w,h,sun);
 for(let y=44;y<h-35;y+=132)for(let x=48;x<w-32;x+=148){
  let variation=random();
  rect(g,x+2,y+3,144,126,variation<.2?'rgba(8,10,26,.12)':variation>.78?'rgba(255,203,150,.035)':'rgba(28,16,30,.045)');
  line(g,x,y+130,x+148,y+130,'rgba(14,16,28,.22)',1.8);
  line(g,x+146,y,x+146,y+132,'rgba(19,15,31,.24)',1.3);
  if((Math.round(x/148)+Math.round(y/132))%5===0){
   line(g,x+random()*80,y+22,x+87,y+37,'rgba(11,15,29,.22)',2);
  }
 }
 // Painted sports lanes: unchanged collision geometry and same 2500 x 1600 pitch.
 g.save();g.strokeStyle='rgba(247,196,157,.53)';g.lineWidth=3;
 g.strokeRect(107,170,w-214,h-340);
 line(g,w/2,170,w/2,h-170,'rgba(255,214,177,.48)',3);
 circ(g,w/2,mid,174,null,'rgba(255,213,185,.53)',5);
 circ(g,w/2,mid,36,null,'rgba(255,211,166,.42)',3);
 for(const x of [305,w-305]){g.strokeRect(x-86,mid-260,172,520);g.strokeRect(x-48,mid-104,96,208);}
 g.restore();
 // Original graffiti emblem is baked under combatants and projectiles.
 graffiti(g,w,h);
 // Neon district balconies and city silhouettes kept at the sidelines.
 for(const y of [42,h-116])for(let x=85;x<w-95;x+=295){
  const bw=Math.min(248,w-x-80);
  storefront(g,x,y,bw,['BYTE MART','SUNSET LEAGUE','NEON MARKET','ARCADE'][Math.floor(x/295)%4],x%3===0?'#fd639d':'#55d5e0');
 }
 for(const y of [135,h-129])fence(g,91,y,w-182);
 for(const x of [77,w-76])fence(g,x,185,h-370,true);
 for(let x=205;x<w-195;x+=318){
  // Outside the critical middle lanes: neighborhood planters and benches.
  for(const y of [178,h-235]){
   round(g,x,y,155,38,5,'#413c3e','#9d7770',3);
   rect(g,x+8,y+8,139,22,'#344b3f');
   for(let k=0;k<11;k++){
    const px=x+16+k*12,py=y+15;
    circ(g,px,py,5+(k%3),'#667b4c');
    line(g,px,py,px+6,py-10,'rgba(172,190,111,.5)',2);
   }
  }
 }
 // Distinctive dusk power cables stretching across the upper court edges.
 for(let j=0;j<4;j++){
  const y=105+j*18;
  g.beginPath();g.moveTo(88,y);g.quadraticCurveTo(w*.48,y+24+j*8,w-89,y+4);
  g.lineWidth=3+j%2;g.strokeStyle='rgba(13,14,30,.43)';g.stroke();
 }
 // Park lighting, directional pavement shadows and neon highlights.
 for(const [x,y,light,r] of [[w*.87,h*.13,'255,167,77',570],[w*.88,h*.77,'255,153,68',500],[w*.13,h*.28,'54,234,255',360],[w*.22,h*.8,'239,66,174',310]]){
  glow(g,x,y,r,light,.19);
 }
 // Crack lines and worn pavement, bounded by gameplay readability.
 for(let i=0;i<360;i++){
  let x=100+random()*(w-200),y=190+random()*(h-380),length=12+random()*45;
  if(Math.hypot(x-w/2,y-mid)<210)continue;
  g.beginPath();g.moveTo(x,y);g.lineTo(x+length*.38,y+length*.19);g.lineTo(x+length*.58,y-length*.32);
  g.lineWidth=1+random()*1.4;g.strokeStyle=random()<.7?'rgba(12,17,33,.18)':'rgba(255,207,166,.14)';g.stroke();
 }
 for(let i=0;i<100;i++){
  const x=120+random()*(w-240),y=196+random()*(h-400),rad=5+random()*24;
  g.save();g.globalAlpha=.15;g.fillStyle='#171f3a';g.beginPath();g.ellipse(x,y,rad*2,rad*.65,-.2,0,TAU);g.fill();
  line(g,x-rad,y-1,x+rad,y-2,random()<.5?'#5c8bb2':'#f6ad94',2);g.restore();
 }
 // Edge rails with rivets and identical hit-free glow goals.
 g.lineWidth=12;g.strokeStyle='#342c43';g.strokeRect(40,40,w-80,h-80);
 g.lineWidth=3;g.strokeStyle='rgba(255,177,142,.48)';g.strokeRect(53,53,w-106,h-106);
 neonGoal(g,58,mid,true,'#56eaff');neonGoal(g,w-58,mid,false,'#ffad6c');
 for(const [text,x,y] of [['SUNSET CIRCUIT',w/2,mid+295],['WEST BLOCK',350,350],['EAST BLOCK',w-350,350]]){
  stencil(g,text,x,y,text==='SUNSET CIRCUIT'?47:25,'#ffe4ba',.3);
 }
}
function drawFloor(g,world){
 if(stadium==='fort'){original.drawFloor(g,world);return;}
 if(!sunsetFloor||sunsetWidth!==world.w||sunsetHeight!==world.h){
  sunsetWidth=world.w;sunsetHeight=world.h;
  sunsetFloor=document.createElement('canvas');sunsetFloor.width=Math.ceil(world.w*.5);sunsetFloor.height=Math.ceil(world.h*.5);
  const sub=sunsetFloor.getContext('2d',{alpha:false});sub.scale(.5,.5);paintSunset(sub,world.w,world.h);
 }
 g.drawImage(sunsetFloor,0,0,world.w,world.h);
}
function paintCover(o){
 if(stadium==='fort'){original.paintCover(o);return;}
 const g=o.texture.getContext('2d'),w=o.w,h=o.h,box=o.k==='crate';
 g.clearRect(0,0,w,h);
 const metal=g.createLinearGradient(0,0,w,h);
 metal.addColorStop(0,box?'#a78965':'#66545c');
 metal.addColorStop(.55,box?'#806a5f':'#483c4c');
 metal.addColorStop(1,box?'#413c48':'#302e42');
 round(g,1,1,w-2,h-2,5,metal,box?'#e5ad77':'#a78891',3);
 round(g,9,9,w-18,h-18,3,box?'#564d51':'#464653',box?'#a58f7b':'#817589',2);
 if(box){
  // Shipping crate / utility generator in same collision footprint.
  for(let x=17;x<w-11;x+=27){rect(g,x,15,11,h-30,'rgba(13,20,34,.21)');rect(g,x+4,15,3,h-30,'rgba(221,192,164,.15)');}
  round(g,20,h*.25,w-40,h*.5,3,'#354353','#a58773',1.5);
  stencil(g,'SC',w/2,h*.61,Math.max(12,Math.min(28,w*.22)),'#edb06c',.7);
 }else{
  // Faded concrete street barrier with striped reflective vinyl.
  rect(g,13,18,w-26,Math.min(h*.23,20),'#302d3b');
  diagonal(g,13,18,w-26,Math.min(h*.23,20),'rgba(255,159,110,.42)',20);
  rect(g,13,h-30,w-26,9,'rgba(11,13,28,.27)');
  for(let x=24;x<w-20;x+=36)rect(g,x,h*.5-2,20,4,'rgba(224,185,143,.35)');
 }
 const random=rng(((o.x*59+o.y*131)|0));
 for(let i=0;i<Math.floor(w*h/1200);i++){
  let x=7+random()*(w-14),y=7+random()*(h-14);
  rect(g,x,y,3+random()*5,1,random()<.5?'rgba(19,20,31,.19)':'rgba(255,222,189,.16)');
 }
 // IMPORTANT: preserve transparent destroyed cells exactly as physics.
 g.save();g.globalCompositeOperation='destination-out';
 for(let row=0;row<o.rows;row++)for(let col=0;col<o.cols;col++)
  if(o.cellHp[row*o.cols+col]<=0)g.fillRect(col*o.cell,row*o.cell,o.cell+.45,o.cell+.45);
 g.restore();
 g.fillStyle='#c39d8e';
 for(let row=0;row<o.rows;row++)for(let col=0;col<o.cols;col++){
  if(o.cellHp[row*o.cols+col]<=0)continue;
  const x=col*o.cell,y=row*o.cell,cw=Math.min(o.cell,w-x),ch=Math.min(o.cell,h-y);
  if(row===0||o.cellHp[(row-1)*o.cols+col]<=0)g.fillRect(x,y,cw,1.7);
  if(col===0||o.cellHp[row*o.cols+col-1]<=0)g.fillRect(x,y,1.7,ch);
 }
 o.dirty=false;
}
const tmpCache=new Map();
function streetUnit(g,info){
 const isBot=info.kind==='bot',hostile=info.kind==='hostile',team=info.team||'cyan',accent=TEAM[team]||'#f39d81';
 // Top-down sportwear/cyberpunk outfit, with sports padding and visor.
 const angle=info.a||0,step=Number.isFinite(info.step)?info.step:0,movement=Math.max(0,Math.min(1,info.move||0));
 const s=Math.sin(step),run=movement>.35&&!info.slide;
 g.save();g.translate(info.x,info.y);
 if(info.dead)g.globalAlpha=.27;
 g.fillStyle='rgba(12,6,19,.53)';g.beginPath();g.ellipse(7,12,27,15,0,0,TAU);g.fill();
 g.rotate(angle);
 if(info.slide){g.rotate(.18);g.scale(1.18,.78);}
 if(info.crouch)g.scale(.91,.91);
 // Articulated sneaker silhouettes: alternating sprint / walking stride.
 for(const sign of [-1,1]){
  const stride=run?s*sign*8:0;
  round(g,-25+stride,sign*12-5,23,10,4,'#242b3d','#738e99',1.8);
  rect(g,-25+stride,sign*12-5,4,10,accent);
  round(g,-18+stride,sign*11-4,10,8,3,'#566675');
 }
 // Jacket arms and protective elbow guards.
 for(const sign of [-1,1]){
  const sway=run?s*sign*5:0;
  g.save();g.translate(-9+sway,sign*21);
  g.rotate(sign*(run?.1+.13*s:0));
  round(g,-18,-7,25,14,6,hostile?'#603b4e':'#414355','#b4a0ae',1.5);
  round(g,-21,-5,8,10,3,accent);
  g.restore();
 }
 round(g,-18,-17,38,34,11,hostile?'#724454':isBot?'#475368':'#45445b','#a6a4a9',2);
 round(g,-9,-13,24,26,7,hostile?'#a56169':isBot?'#52707c':'#637081','#c5b6b4',1);
 rect(g,-12,-14,7,28,accent);rect(g,5,-15,5,30,'rgba(248,222,207,.24)');
 for(const y of [-9,8])rect(g,-8,y,16,3,accent);
 // Top-down athletic helmet/hood, colored visor and headset.
 circ(g,-5,0,13,hostile?'#382c40':'#303b4e','#c8b1b4',2);
 round(g,-14,-8,10,16,5,'#292b3b','#58616b');
 round(g,-8,-10,14,20,6,hostile?'#794a58':'#3d6576',accent,2);
 rect(g,1,-8,7,16,accent);
 round(g,5,-5,31,11,3,'#273746','#9cb0b4',1.5);
 rect(g,32,-3,18,6,'#788f96');
 rect(g,42,-1,8,2,accent);
 if(info.weapon===2){line(g,20,0,48,0,'#e3d7d1',3);}
 if(info.reload){round(g,12,8,14,6,3,'#a8aab4');}
 if(info.flash){g.globalAlpha=.25;rect(g,-20,-17,43,34,'#e4ffff');}
 g.restore();
}
function militaryAnimated(g,info){
 const motion=Math.max(0,Math.min(1,info.move||0));
 const step=Number.isFinite(info.step)?info.step:0;
 // Original cached operative plus small silhouette pose changes.
 const nudge=motion&&!info.slide?Math.sin(step*2.0)*1.4:0;
 original.drawUnit(g,{...info,y:info.y+nudge});
 if(motion>.08&&!info.slide&&!info.dead){
  const color=info.team==='orange'?TEAM.orange:TEAM.cyan;
  g.save();g.translate(info.x,info.y);g.rotate(info.a||0);g.globalAlpha=.85;
  for(let sign of [-1,1]){
   let dx=Math.sin(step)*sign*5;
   round(g,-26+dx,sign*12-4,15,8,3,'#263840',color,1.4);
  }
  g.restore();
 }
}
function drawUnit(g,info){
 if(stadium==='sunset')streetUnit(g,info);else militaryAnimated(g,info);
}
art.setArena=setArena;art.getArena=()=>stadium;art.getArenaInfo=()=>palettes[stadium];
art.drawFloor=drawFloor;art.paintCover=paintCover;art.drawUnit=drawUnit;
art.version='two-stadiums-animated-1';art.stadium=stadium;
})();

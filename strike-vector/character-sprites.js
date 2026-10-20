/* STRIKE VECTOR v1.9.2 — flexible-resolution illustrated stadium sprites.
 * Files: Fort cyan atlas (4 original views, 2 poses), Sunset orange atlas
 * (4 concept-art views, 2 posed frames). Eight AIM sectors select and mirror
 * these views; fully unique hand-painted eight-way animation is a later goal.
 * Physics and network state are untouched. Procedural fallback is mandatory.
 */
(() => {
'use strict';
const art=window.StrikeVectorArt;
if(!art||typeof art.drawUnit!=='function')return;
const originalDraw=art.drawUnit;
const tile={w:112,h:176},pivot={x:56,y:92},scale=.48,PI=Math.PI;
// Frames always form a 4-column by 2-row grid; source files can be 448×352
// or the newer 1415×1112 high-res Sunset sheet. Pixel-aligned crop bounds
// prevent leaking one cell into another when width is not divisible by 4.
function frameBounds(img,col,row){
 const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
 const x=Math.round(col*w/4),x1=Math.round((col+1)*w/4);
 const y=Math.round(row*h/2),y1=Math.round((row+1)*h/2);
 return [x,y,x1-x,y1-y];
}
const variants={
 fort:{path:'./art/characters/fort/fort_vector_cyan_pilot.webp',primary:'cyan',image:null,opposite:null,status:'loading',error:''},
 sunset:{path:'./art/characters/sunset/sunset_circuit_orange_pilot.webp',primary:'orange',image:null,opposite:null,status:'loading',error:''}
};
const options={enabled:true};
function arena(){return art.getArena?.()==='sunset'?'sunset':'fort';}
function variant(){return variants[arena()];}
const expose={
 get state(){return variant().status;}, get error(){return variant().error;},
 get loaded(){return !!variant().image;},
 get enabled(){return options.enabled;},
 get currentArena(){return arena();},
 get arenas(){return {fort:variants.fort.status,sunset:variants.sunset.status};},
 toggle(value){options.enabled=value!==false;return options.enabled;},
 pathFor(a){return variants[a==='sunset'?'sunset':'fort'].path;},
 isUsingSprites(info){
  return !!variant().image&&options.enabled&&(info?.kind==='human'||info?.kind==='bot')&&!info.forceProcedural;
 }
};
window.StrikeVectorSprites=expose;
function notify(name){
 window.dispatchEvent(new CustomEvent('strike-vector-sprite-status',{
  detail:{arena:name,status:variants[name].status,error:variants[name].error}
 }));
}
function recolor(img,to){
 const c=document.createElement('canvas');
 c.width=img.naturalWidth;c.height=img.naturalHeight;
 const g=c.getContext('2d',{willReadFrequently:true});
 g.drawImage(img,0,0);
 const pixels=g.getImageData(0,0,c.width,c.height),d=pixels.data;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],green=d[i+1],b=d[i+2],alpha=d[i+3];
  if(alpha<45)continue;
  if(to==='orange'){
   const cyan=b>r*1.27&&green>r*1.17&&green>57;
   const royal=b>green*1.33&&b>r*1.75&&green>r*.83;
   if(!cyan&&!royal)continue;
   const lum=Math.max(green,b);
   d[i]=Math.min(255,Math.round(lum*1.16));
   d[i+1]=Math.min(255,Math.round(lum*(royal?.51:.59)));
   d[i+2]=Math.min(255,Math.round(lum*.18+12));
  } else {
   // Predominantly orange gear trim becomes cyan; do not change neutral cloth.
   const orange=r>135&&r>green*1.27&&green>b*1.33&&(r-b)>90;
   if(!orange)continue;
   const lum=Math.max(r,green);
   d[i]=Math.round(lum*.20);
   d[i+1]=Math.min(255,Math.round(lum*.86));
   d[i+2]=Math.min(255,Math.round(lum*1.07));
  }
 }
 g.putImageData(pixels,0,0);
 return c;
}
function loadVariant(name){
 const v=variants[name],im=new Image();
 im.decoding='async';
 im.onload=()=>{
  const w=im.naturalWidth,h=im.naturalHeight;
  const expectedSize=(w===448&&h===352)||(w===1415&&h===1112);
  if(!expectedSize){
   v.status='fallback';v.error='Unrecognized sprite grid '+w+'×'+h+'; expected 448×352 or 1415×1112';
  }else{
   v.image=im;
   try{v.opposite=recolor(im,v.primary==='orange'?'cyan':'orange');}catch(e){v.opposite=im;}
   v.status='ready';v.error='';
  }
  notify(name);
 };
 im.onerror=()=>{
  v.status='fallback';v.error='Sprite file missing: '+v.path;notify(name);
 };
 im.src=v.path;
}
function facing(a){
 // World x axis east, y axis south. Eight distinct input headings mapped
 // to four authored concept views + left/right reflections, never rotating
 // the oblique camera art itself.
 const normalized=(((Number.isFinite(a)?a:0)+PI/8)%(PI*2)+PI*2)%(PI*2);
 const dir=Math.floor(normalized/(PI/4));
 return [
  {col:2,flip:false}, // E
  {col:2,flip:false}, // SE
  {col:3,flip:false}, // S
  {col:2,flip:true},  // SW
  {col:2,flip:true},  // W
  {col:1,flip:true},  // NW
  {col:0,flip:false}, // N
  {col:1,flip:false}  // NE
 ][dir];
}
function draw(g,info){
 if(!expose.isUsingSprites(info)||!Number.isFinite(info.x)||!Number.isFinite(info.y)){
  return originalDraw(g,info);
 }
 const v=variant(),atlas=info.team===v.primary?v.image:v.opposite||v.image;
 const {col,flip}=facing(info.a);
 const moving=Math.max(0,Math.min(1,Number(info.move)||0));
 const gait=Number(info.step)||0;
 const row=moving>.13&&Math.sin(gait)>0?1:0;
 const w=tile.w*scale,h=tile.h*scale;
 g.save();g.translate(info.x,info.y);
 if(info.dead)g.globalAlpha=.31;
 g.fillStyle='rgba(0,6,12,.42)';g.beginPath();g.ellipse(2,21,23,11,0,0,PI*2);g.fill();
 if(info.slide){g.translate(-4,11);g.rotate(-.17);g.scale(1.04,.82);}
 else if(info.crouch)g.scale(.93,.9);
 if(flip)g.scale(-1,1);
 g.drawImage(atlas,...frameBounds(v.image,col,row),-pivot.x*scale,-pivot.y*scale,w,h);
 if(info.flash){
  g.globalCompositeOperation='screen';
  g.globalAlpha=Math.min(.21,Math.max(0,Number(info.flash)||0));
  g.fillStyle='#e8feff';g.fillRect(-22,-32,44,55);
 }
 g.restore();
}
// Draw actual atlas portraits into the host's lobby, guest roster, and team draft.
// The preview only reads pixels; it does not alter stadium, physics or network state.
function drawPortrait(canvas,team,venue){
 if(!canvas||typeof canvas.getContext!=='function')return false;
 const g=canvas.getContext('2d');
 if(!g)return false;
 const width=canvas.width||54,height=canvas.height||68;
 const selected=variants[venue==='sunset'?'sunset':'fort'];
 const color=team==='orange'?'#ffa365':'#78ecf4';
 g.clearRect(0,0,width,height);
 g.fillStyle=venue==='sunset'?'#332536':'#142a35';
 g.fillRect(0,0,width,height);
 g.fillStyle=color;g.fillRect(0,height-3,width,3);
 if(!selected.image){
  // Meaningful silhouette placeholder while images are loading.
  g.globalAlpha=.42;
  g.fillStyle=color;
  g.beginPath();g.arc(width*.5,height*.34,9,0,PI*2);g.fill();
  g.beginPath();g.ellipse(width*.5,height*.83,17,20,0,0,PI*2);g.fill();
  g.globalAlpha=1;
  return false;
 }
 const atlas=team===selected.primary?selected.image:selected.opposite||selected.image;
 const ratio=Math.min((width-4)/tile.w,(height-5)/tile.h);
 g.drawImage(atlas,...frameBounds(selected.image,3,0),(width-tile.w*ratio)/2,(height-tile.h*ratio)/2-1,tile.w*ratio,tile.h*ratio);
 return true;
}
art.drawUnit=draw;
expose.draw=draw;
expose.drawPortrait=drawPortrait;
expose.facing=facing;
function load(){for(const name of ['fort','sunset'])loadVariant(name);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
else load();
})();
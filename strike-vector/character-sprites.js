/* STRIKE VECTOR v1.11.1 — Sunset movement clarity; keep Fort gait as before.
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
// The newer Sunset sheet has a few stray pixels from the top-row shoes at
// the beginning of the lower row. Trim 32 *source* pixels from the stride
// cells while preserving destination alignment and the physical pivot.
function paintFrame(g,atlas,source,col,row,x,y,w,h,isSunset){
 const [sx,sy,sw,sh]=frameBounds(source,col,row);
 if(isSunset&&row===1&&(source.naturalHeight||source.height)===1112){
  const trim=32,destTrim=h*trim/sh;
  g.drawImage(atlas,sx,sy+trim,sw,sh-trim,x,y+destTrim,w,h-destTrim);
 }else g.drawImage(atlas,sx,sy,sw,sh,x,y,w,h);
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
// Stabilize close-to-boundary directional aiming for each operative so a small
// mouse jitter never swaps full-body artwork back and forth every frame.
const actorFacing=new Map();
function stableFacing(angle,id){
 const raw=Number.isFinite(angle)?angle:0;
 if(!id)return facing(raw);
 const previous=actorFacing.get(id),next=Math.floor(((((raw+PI/8)%(2*PI))+2*PI)%(2*PI))/(PI/4));
 let choice=next;
 if(previous!==undefined&&previous!==next){
  const center=previous*PI/4,delta=Math.atan2(Math.sin(raw-center),Math.cos(raw-center));
  if(Math.abs(delta)<PI/8+.085)choice=previous;
 }
 actorFacing.set(id,choice);
 const center=choice*PI/4;
 return facing(center);
}
function draw(g,info){
 if(!expose.isUsingSprites(info)||!Number.isFinite(info.x)||!Number.isFinite(info.y)){
  return originalDraw(g,info);
 }
 const v=variant(),atlas=info.team===v.primary?v.image:v.opposite||v.image;
 const {col,flip}=stableFacing(info.a,info.id);
 const moving=Math.max(0,Math.min(1,Number(info.move)||0));
 const gait=Number(info.step)||0;
 const power=Math.max(0,Math.min(1,Number(info.recoil)||0));
 const sweep=Math.max(0,Math.min(1,Number(info.slash)||0));
 // Sunset has distinctive authored movement art that previously stayed mostly
 // transparent under the idle image. Use an OPAQUE running/stride frame for
 // most of each step. No ghosting, extra stretching, or physics changes.
 // Fort Vector keeps its earlier soft two-pose blend.
 const sunset=arena()==='sunset',slide=!!info.slide;
 const walking=moving>.16&&!slide&&!info.crouch&&!info.dead;
 const stridePhase=.5-.5*Math.cos(gait*2);
 const strideMix=Math.max(0,Math.min(1,(stridePhase-.12)*1.3))*moving;
 // 1 full step every PI gait units (~2.9 steps/sec walk, faster sprint).
 // Painted movement row gets ~68% of a walk or 74% of a run cycle.
 const stepPhase=((gait/PI)%1+1)%1;
 const movingRow=sunset&&walking&&stepPhase<(moving>.88?.74:.68)?1:0;
 const w=tile.w*scale,h=tile.h*scale;
 g.save();g.translate(info.x,info.y);
 if(info.dead)g.globalAlpha=.30;
 const baseAlpha=g.globalAlpha;
 g.fillStyle='rgba(0,6,12,.40)';
 g.beginPath();g.ellipse(3,21,slide?31:22,slide?9:12,0,0,PI*2);g.fill();
 // Ground-level kinetic FX in stadium coordinates: no attached / rotating shadows.
 const energy=info.team==='orange'?'#ffa866':'#8bf5f4';
 if(slide){
  const dir=Number.isFinite(info.slideAngle)?info.slideAngle:Number(info.a)||0;
  g.save();g.rotate(dir);
  g.strokeStyle=energy;g.lineCap='round';
  for(let i=-1;i<=1;i++){
   g.globalAlpha=baseAlpha*(.24-.035*Math.abs(i));
   g.lineWidth=2;
   g.beginPath();g.moveTo(-51,i*9+15);g.lineTo(-27,i*6+17);g.stroke();
  }
  g.restore();g.globalAlpha=baseAlpha;
 }else if(moving>.65&&stridePhase>.81){
  g.globalAlpha=baseAlpha*.21;g.fillStyle=energy;
  g.beginPath();g.ellipse(-10,22,14,3,0,0,PI*2);g.fill();
  g.globalAlpha=baseAlpha;
 }
 const baseX=-pivot.x*scale,baseY=-pivot.y*scale;
 if(slide){g.translate(-4,8);g.rotate(-.13);g.scale(1.07,.80);}
 else if(info.crouch)g.scale(.93,.90);
 if(info.reload){g.translate(-1.5,1.5);g.rotate(.018);}
 if(power>0)g.translate(-power*3.1,-power*.6);
 if(flip)g.scale(-1,1);
 paintFrame(g,atlas,v.image,col,movingRow,baseX,baseY,w,h,sunset);
 if(!sunset&&strideMix>.01&&!slide&&!info.crouch){
  g.globalAlpha=baseAlpha*strideMix;
  g.drawImage(atlas,...frameBounds(v.image,col,1),baseX,baseY,w,h);
  g.globalAlpha=baseAlpha;
 }
 // The existing world-space melee slash draws outside this character. Add a
 // brief glint to the weapon hand and a smaller, restrained recoil flash.
 if(power>.06){
  g.save();g.globalCompositeOperation='screen';
  g.globalAlpha=baseAlpha*power*.67;
  g.fillStyle='#ffebc4';
  g.beginPath();g.ellipse(18,-3,3+4*power,2.1,0,0,PI*2);g.fill();
  g.restore();
 }
 if(sweep>.05){
  g.save();g.globalCompositeOperation='screen';
  g.globalAlpha=baseAlpha*sweep*.38;
  g.strokeStyle=energy;g.lineWidth=3.2;g.lineCap='round';
  g.beginPath();g.arc(8,1,26,-.8,.36);g.stroke();
  g.restore();
 }
 if(info.reload){
  g.save();g.globalAlpha=baseAlpha*.36;g.fillStyle=energy;
  g.fillRect(-4,11,10,2);g.restore();
 }
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
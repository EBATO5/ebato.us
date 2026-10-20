/* STRIKE VECTOR v1.8 sprite adapter.
 * Uses the user's Fort Vector cyan pilot atlas when available in /art/characters/fort/.
 * Four authored view sectors + two pose variants: this is a pilot, NOT an 8-way walk cycle.
 * Keeps the stadium-theme painter as fallback. No changes to physics.
 */
(() => {
'use strict';
const art=window.StrikeVectorArt;
if(!art||typeof art.drawUnit!=='function')return;
const originalDraw=art.drawUnit;
const tile={w:112,h:176},pivot={x:56,y:92},pilotPath='./art/characters/fort/fort_vector_cyan_pilot.webp';
const options={source:pilotPath, enabled:true};
let source=null,orange=null,attempted=false,error='',state='loading';
const expose={get state(){return state;},get error(){return error;},get loaded(){return !!source;},get enabled(){return options.enabled;},
 toggle(value){options.enabled=value!==false;return options.enabled;},path:pilotPath,isUsingSprites(info){
  return !!source&&options.enabled&&(art.getArena?.()||'fort')==='fort'&&info.kind==='human'&&!info.forceProcedural;
}};
window.StrikeVectorSprites=expose;
function announce(){window.dispatchEvent(new CustomEvent('strike-vector-sprite-status',{detail:{state,error}}));}
function makeOrange(img){
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
 const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const image=g.getImageData(0,0,c.width,c.height),d=image.data;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],green=d[i+1],blue=d[i+2],a=d[i+3];
  if(a<35||blue<85)continue;
  // Only shift the highly saturated cyan team accents; leave steel/skin intact.
  const high=blue>r*1.3&&green>r*1.16&&green>55;
  const blueEdge=blue>green*1.33&&blue>r*1.9&&green>r*.85;
  if(!high&&!blueEdge)continue;
  const lum=Math.max(green,blue),shade=Math.min(1,lum/205);
  d[i]=Math.min(255,Math.round(lum*1.17));
  d[i+1]=Math.min(255,Math.round(lum*(blueEdge?.51:.59)));
  d[i+2]=Math.min(255,Math.round(lum*.18+12));
 }
 g.putImageData(image,0,0);return c;
}
function load(){
 if(attempted)return;attempted=true;
 const im=new Image();im.decoding='async';
 im.onload=()=>{if(im.naturalWidth!==448||im.naturalHeight!==352){state='fallback';error='Unexpected atlas dimensions';announce();return;}
  source=im;try{orange=makeOrange(im);}catch(e){orange=im;}
  state='ready';announce();
 };
 im.onerror=()=>{state='fallback';error='Atlas not yet installed at '+pilotPath;announce();};
 im.src=pilotPath;
}
function sector(a){
 // The concept sheet provides back, rear 3/4, front 3/4 and front.
 // Facing sectors mirror at screen-left rather than spinning one tilted sprite.
 const x=Math.cos(a||0),y=Math.sin(a||0);
 let col=2,flip=false;
 if(y<-.76){col=0;}
 else if(y<-.23){col=1;flip=x<0;}
 else if(y>.76){col=3;}
 else {col=2;flip=x<0;}
 return {col,flip};
}
function draw(g,info){
 const using=expose.isUsingSprites(info);
 if(!using)return originalDraw(g,info);
 if(!Number.isFinite(info.x)||!Number.isFinite(info.y))return originalDraw(g,info);
 const {col,flip}=sector(info.a);
 const move=Math.max(0,Math.min(1,Number(info.move)||0));
 const stride=move>.15&&Math.sin(Number(info.step)||0)>-.1?1:0;
 const atlas=info.team==='orange'?orange||source:source;
 const worldScale=.48;
 const drawnW=tile.w*worldScale,drawnH=tile.h*worldScale;
 const screenX=-pivot.x*worldScale,screenY=-pivot.y*worldScale;
 g.save();g.translate(info.x,info.y);
 if(info.dead)g.globalAlpha=.32;
 g.fillStyle='rgba(0,6,12,.46)';g.beginPath();g.ellipse(2,21,23,11,0,0,Math.PI*2);g.fill();
 if(info.slide){g.translate(-4,10);g.scale(1.14,.72);}
 else if(info.crouch)g.scale(.9,.85);
 if(flip){g.scale(-1,1);}
 g.drawImage(atlas,col*tile.w,stride*tile.h,tile.w,tile.h,screenX,screenY,drawnW,drawnH);
 if(info.flash){
  g.globalCompositeOperation='screen';
  g.globalAlpha=Math.min(.22,Math.max(0,Number(info.flash)||0));
  g.fillStyle='#e5fcff';g.fillRect(-22,-31,44,55);
 }
 g.restore();
}
art.drawUnit=draw;
expose.draw=draw;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

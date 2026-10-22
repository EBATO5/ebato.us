/* STRIKE VECTOR v1.12.1 — browser Gamepad API input normalization.
 * Works with standard-layout Xbox, PlayStation and compatible controllers.
 * No physics, damage, or DOM changes. An adapter in index.html owns gameplay.
 */
(()=>{
'use strict';
const DEAD=.19,TRIGGER=.43,AXIS_ACTIVATION=.32;
let lastIndex=-1,lastButtons=[],connected=false,lastId='',lastInput=false;
const zero={connected:false,id:'',active:false,index:-1,move:{x:0,y:0},aim:{x:0,y:0},aimActive:false,buttons:[],pressed:[],released:[]};
let latest=zero;
function stick(x,y){
 x=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;
 y=Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0;
 const r=Math.hypot(x,y);
 if(r<=DEAD)return {x:0,y:0};
 const t=Math.min(1,(r-DEAD)/(1-DEAD))/r;
 return {x:x*t,y:y*t};
}
function button(pad,i){
 const b=pad?.buttons?.[i];
 return typeof b==='number'?b>=TRIGGER:!!b&&(!!b.pressed||Number(b.value)>=TRIGGER);
}
function poll(){
 const pads=typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function'?navigator.getGamepads():null;
 let selected=null;
 if(pads){
  if(lastIndex>=0&&pads[lastIndex]?.connected)selected=pads[lastIndex];
  if(!selected)for(const p of pads)if(p?.connected&&p.mapping==='standard'){selected=p;break}
 }
 if(!selected){
  lastIndex=-1;lastButtons=[];connected=false;lastId='';lastInput=false;
  latest=zero;return latest;
 }
 if(selected.index!==lastIndex){lastButtons=[];lastInput=false;lastIndex=selected.index}
 connected=true;lastId=selected.id||'Gamepad';
 const move=stick(selected.axes?.[0],selected.axes?.[1]);
 const aim=stick(selected.axes?.[2],selected.axes?.[3]);
 const buttons=Array.from({length:17},(_,i)=>button(selected,i));
 const pressed=[],released=[];
 buttons.forEach((state,i)=>{if(state&&!lastButtons[i])pressed.push(i);if(!state&&lastButtons[i])released.push(i)});
 lastButtons=buttons;
 const active=buttons.some(Boolean)||Math.hypot(move.x,move.y)>.03||Math.hypot(aim.x,aim.y)>.03;
 lastInput=active;
 latest={
  connected,id:lastId,index:lastIndex,active,move,aim,aimActive:Math.hypot(aim.x,aim.y)>AXIS_ACTIVATION,
  buttons,pressed,released
 };
 return latest;
}
window.StrikeVectorPad={poll,stick,get state(){return latest;},
 get connected(){return connected;},get id(){return lastId;},
 clear(){lastButtons=[];lastInput=false;latest=zero;},
 constants:{DEAD,TRIGGER,AXIS_ACTIVATION}
};
})();

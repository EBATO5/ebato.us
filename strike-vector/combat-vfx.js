/* STRIKE VECTOR v1.11 — Lightweight illustrated combat motion VFX.
 * This is render-only. No impact forces, hit detection, ammo or networking.
 * The existing gun, puck, projectile, and recoil systems remain authoritative.
 */
(()=>{
'use strict';
const active=[],LIMIT=140,TAU=Math.PI*2;
let quality='full';
const colors={cyan:'#8bf8ef',orange:'#ffbb81',hostile:'#ffa06f',neutral:'#ddd5c6'};
const colorFor=team=>colors[team]||colors.neutral;
function valid(...numbers){return numbers.every(Number.isFinite);}
function push(item){if(active.length>=LIMIT)active.splice(0,active.length-LIMIT+1);active.push(item);}
function flash(x,y,a,team='cyan',precision=false){
 if(!valid(x,y,a))return;
 const c=precision?'#defeff':colorFor(team),ca=Math.cos(a),sa=Math.sin(a);
 push({kind:'muzzle',x:x+ca*32,y:y+sa*32,a,life:precision?.18:.095,max:precision?.18:.095,color:c,precision});
 if(quality==='low')return;
 const ex=x-ca*2-sa*13,ey=y-sa*2+ca*13,side=sa,sideY=-ca;
 push({kind:'casing',x:ex,y:ey,vx:ca*-65+side*115+(Math.random()-.5)*40,vy:sa*-65+sideY*115+(Math.random()-.5)*40,
  rot:a+Math.PI*.5,spin:(Math.random()-.5)*19,life:.60,max:.60,color:'#edc69b'});
}
function melee(x,y,a,team='cyan',knife=false){
 if(!valid(x,y,a))return;
 push({kind:'slash',x,y,a,life:.22,max:.22,color:colorFor(team),knife});
 if(quality==='low')return;
 const length=knife?78:65;
 for(let i=0;i<5;i++){
  const t=(i+.2)/5,ang=a-.8+1.6*t,dx=Math.cos(ang),dy=Math.sin(ang);
  push({kind:'spark',x:x+dx*length,y:y+dy*length,vx:dx*(65+Math.random()*95),vy:dy*(65+Math.random()*95),
   life:.21+Math.random()*.16,max:.4,color:i%2?'#ffffff':colorFor(team)});
 }
}
function slide(x,y,a,team='cyan',full=false){
 if(!valid(x,y,a))return;
 const c=colorFor(team),co=Math.cos(a),si=Math.sin(a);
 push({kind:'slide',x:x-co*17,y:y-si*17,a,life:full?.32:.18,max:full?.32:.18,color:c,full});
 if(quality==='low'||!full)return;
 for(let i=0;i<7;i++){
  const side=(Math.random()-.5)*27,back=Math.random()*27;
  push({kind:'dust',x:x-co*(12+back)-si*side,y:y-si*(12+back)+co*side,
   vx:-co*(42+Math.random()*65),vy:-si*(42+Math.random()*65),
   life:.3+Math.random()*.18,max:.48,color:'#b2a8a4'});
 }
}
function impact(x,y,angle,team='neutral'){
 if(!valid(x,y,angle)||quality==='low')return;
 const c=colorFor(team);
 for(let i=0;i<7;i++){
  const a=angle+Math.PI+(Math.random()-.5)*1.8,mag=60+Math.random()*120;
  push({kind:'spark',x,y,vx:Math.cos(a)*mag,vy:Math.sin(a)*mag,life:.12+Math.random()*.23,max:.35,color:i%2?'#ffebb9':c});
 }
}
function update(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 dt=Math.min(dt,.05);
 for(let i=active.length-1;i>=0;i--){
  const v=active[i];v.life-=dt;
  if(v.life<=0){active.splice(i,1);continue;}
  if(v.vx||v.vy){v.x+=v.vx*dt;v.y+=v.vy*dt;}
  if(v.kind==='casing'){v.vx*=Math.exp(-2*dt);v.vy+=85*dt;v.rot+=v.spin*dt;}
 }
}
function drawUnder(g){
 for(const v of active){
  if(v.kind!=='slide'&&v.kind!=='dust')continue;
  const alpha=Math.max(0,v.life/v.max);
  g.save();g.globalAlpha=(v.kind==='dust'?.24:.38)*alpha;
  if(v.kind==='dust'){
   g.fillStyle=v.color;g.beginPath();g.ellipse(v.x,v.y,3+(1-alpha)*7,2+(1-alpha)*3,0,0,TAU);g.fill();
  }else{
   g.translate(v.x,v.y);g.rotate(v.a);
   g.strokeStyle=v.color;g.lineWidth=v.full?3.8:2.3;g.lineCap='round';
   for(const h of [-10,9]){
    g.beginPath();g.moveTo(-18-45*(1-alpha),h);g.lineTo(-1,h*.63);g.stroke();
   }
  }
  g.restore();
 }
}
function drawOver(g){
 for(const v of active){
  if(v.kind==='slide'||v.kind==='dust')continue;
  const ratio=Math.max(0,v.life/v.max);
  g.save();g.globalAlpha=ratio;
  if(v.kind==='muzzle'){
   g.translate(v.x,v.y);g.rotate(v.a);
   const p=v.precision?1.45:1;
   g.globalCompositeOperation='lighter';
   g.fillStyle='#fff9da';
   g.beginPath();g.moveTo(-5,-3);g.lineTo(22*p,0);g.lineTo(-5,3);g.closePath();g.fill();
   g.fillStyle=v.color;g.globalAlpha=ratio*.55;
   g.beginPath();g.moveTo(-4,-9*p);g.lineTo(42*p,0);g.lineTo(-4,9*p);g.closePath();g.fill();
   g.strokeStyle=v.color;g.lineWidth=1.3;g.beginPath();g.moveTo(6,-11*p);g.lineTo(26*p,0);g.lineTo(6,11*p);g.stroke();
  }else if(v.kind==='casing'){
   g.translate(v.x,v.y);g.rotate(v.rot);g.fillStyle=v.color;g.strokeStyle='#6f6453';g.lineWidth=.8;
   g.fillRect(-3,-1,6,2);g.strokeRect(-3,-1,6,2);
  }else if(v.kind==='slash'){
   g.translate(v.x,v.y);g.rotate(v.a);
   const phase=1-ratio,r=v.knife?79:70;
   g.globalCompositeOperation='lighter';
   g.lineCap='round';g.strokeStyle=v.color;g.lineWidth=7*ratio+1;
   g.beginPath();g.arc(0,0,r,-.96+phase*.42,-.96+phase*.42+1.55);g.stroke();
   g.strokeStyle='#f5ffff';g.lineWidth=2.7*ratio+.5;
   g.beginPath();g.arc(0,0,r+1,-.82+phase*.35,-.82+phase*.35+1.2);g.stroke();
  }else if(v.kind==='spark'){
   g.strokeStyle=v.color;g.lineWidth=1.5+ratio;g.lineCap='round';
   g.beginPath();g.moveTo(v.x,v.y);g.lineTo(v.x-v.vx*.025*ratio,v.y-v.vy*.025*ratio);g.stroke();
  }
  g.restore();
 }
}
window.StrikeVectorVFX={
 flash,melee,slide,impact,update,drawUnder,drawOver,clear(){active.length=0;},
 setQuality(v){quality=v==='low'?'low':'full';},
 get quality(){return quality;},get activeCount(){return active.length;},
 _testKinds(){return active.map(v=>v.kind)}
};
})();

import { readFile, writeFile } from 'node:fs/promises';

// Build the proven gameplay + branding first. This pass changes ONLY the
// computer goalkeeper behavior in the generated bundle.
await import('./brand-build.mjs');

let app = await readFile('dist/app.js', 'utf8');

function patch(oldText, newText, label) {
  if (!app.includes(oldText)) throw new Error(`Coin Soccer AI goalie: expected ${label} source was not found`);
  app = app.replace(oldText, newText);
}

// Small, isolated state machine for the computer keeper. The offensive AI is
// intentionally untouched.
patch(
`  let goalieSpeed=75;`,
`  let goalieSpeed=75;
  let aiGoalieReaction=0;
  let aiGoalieThinkTimer=0;
  let aiGoalieTargetX=null;`,
'ai goalie state'
);

patch(
`    goalieDir=Math.random()<.5?-1:1;
  }`,
`    goalieDir=Math.random()<.5?-1:1;
    aiGoalieReaction=0;
    aiGoalieThinkTimer=0;
    aiGoalieTargetX=goalie.x;
  }`,
'ai goalie formation reset'
);

// Every human shot gives the keeper a fresh reaction delay. This prevents the
// keeper from being psychic across multi-shot possessions.
patch(
`    const c=coins[index];
    c.vx=vx;c.vy=vy;`,
`    const c=coins[index];
    c.vx=vx;c.vy=vy;
    if(opponentMode==='ai'&&goalie&&goalie.side===1){
      aiGoalieReaction=0;
      aiGoalieThinkTimer=0;
      aiGoalieTargetX=goalie.x;
    }`,
'ai goalie shot reset'
);

const patrolFunction = `  function shouldAutoPatrol(){
    if(!goalie)return false;
    if(pointer && pointer.mode==='goalie' && canControlKeeperLocal())return false;
    if(onlineActive() && isHost() && goalie.side===1 && remoteKeeperHeld)return false;
    if(opponentMode==='ai'&&goalie.side===1)return true;
    return !!autoGoalie[goalie.side];
  }`;

const smartKeeperFunctions = `${patrolFunction}

  function predictAIGoalieThreatFor(c){
    if(!goalie||!c)return null;
    if(hardMode&&c.type!=='dime')return null;
    if(c.vy>=-16)return null;

    const interceptY=goalie.y+goalie.r+c.r*.92;
    if(c.y<=interceptY)return null;

    let x=c.x,y=c.y,vx=c.vx,vy=c.vy;
    const simDt=1/120;
    const maxTime=2.05;

    for(let t=0;t<maxTime;t+=simDt){
      const speed=Math.hypot(vx,vy);
      if(speed<9)return null;

      const nextSpeed=Math.max(0,speed-COIN_FRICTION_DECEL*simDt);
      const travelSpeed=(speed+nextSpeed)*.5;
      const nx=vx/speed,ny=vy/speed;
      const oldX=x,oldY=y;

      x+=nx*travelSpeed*simDt;
      y+=ny*travelSpeed*simDt;
      vx=nx*nextSpeed;
      vy=ny*nextSpeed;

      // Mirror the real side-wall bounce so bank shots remain readable, while
      // deliberately ignoring future coin collisions. If a collision changes a
      // shot, the keeper will see the new velocity on its next thinking tick.
      if(x-c.r<field.x){x=field.x+c.r;vx=Math.abs(vx)*.72}
      if(x+c.r>field.x+field.w){x=field.x+field.w-c.r;vx=-Math.abs(vx)*.72}

      if(y<=interceptY){
        const span=oldY-y;
        const q=span>0?Math.max(0,Math.min(1,(oldY-interceptY)/span)):1;
        const crossX=oldX+(x-oldX)*q;
        return {x:crossX,t:t+simDt*q,speed};
      }
    }
    return null;
  }

  function chooseAIGoalieThreat(){
    let best=null;
    for(const c of coins){
      const threat=predictAIGoalieThreatFor(c);
      if(!threat)continue;
      if(!best||threat.t<best.t)best=threat;
    }
    return best;
  }

  function stepAIGoalie(dt,left,right){
    aiGoalieReaction+=dt;
    aiGoalieThinkTimer-=dt;

    // Roughly human reaction time. The old keeper moved instantly in a random
    // direction; this one waits, reads the shot, then commits.
    if(aiGoalieReaction<.12)return;

    let threat=null;
    if(aiGoalieThinkTimer<=0){
      aiGoalieThinkTimer=.075;
      threat=chooseAIGoalieThreat();
      const center=field.x+field.w*.5;
      const desired=threat?Math.max(left,Math.min(right,threat.x)):center;

      if(aiGoalieTargetX===null)aiGoalieTargetX=desired;
      else{
        // Smooth target changes so late ricochets can wrong-foot the keeper
        // instead of producing superhuman frame-perfect corrections.
        const blend=threat?.t<.22?.78:.66;
        aiGoalieTargetX+= (desired-aiGoalieTargetX)*blend;
      }
    }else{
      threat=chooseAIGoalieThreat();
    }

    const target=Math.max(left,Math.min(right,aiGoalieTargetX??(field.x+field.w*.5)));
    const dx=target-goalie.x;
    if(Math.abs(dx)<2.5)return;

    // Smart enough to cover a real shot, but deliberately not fast enough to
    // teleport across the whole mouth. Accurate wide shots and late deflections
    // remain legitimate ways to score.
    let speed=108;
    if(threat){
      const available=Math.max(.08,threat.t-.03);
      const needed=Math.abs(dx)/available;
      speed=Math.max(120,Math.min(155,needed*.92));
    }

    const move=Math.sign(dx)*Math.min(Math.abs(dx),speed*dt);
    goalie.x=Math.max(left,Math.min(right,goalie.x+move));
  }`;

patch(patrolFunction, smartKeeperFunctions, 'smart keeper helpers');

patch(
`      if(shouldAutoPatrol()&&(!pointer||pointer.mode!=='goalie')){
        const left=field.x+(field.w-field.goalWidth)/2+goalie.r;
        const right=field.x+(field.w+field.goalWidth)/2-goalie.r;
        goalie.x+=goalieDir*currentGoalieSpeed()*sdt;
        if(goalie.x<=left){goalie.x=left;goalieDir=1}
        else if(goalie.x>=right){goalie.x=right;goalieDir=-1}
      }`,
`      if(shouldAutoPatrol()&&(!pointer||pointer.mode!=='goalie')){
        const left=field.x+(field.w-field.goalWidth)/2+goalie.r;
        const right=field.x+(field.w+field.goalWidth)/2-goalie.r;
        if(opponentMode==='ai'&&goalie.side===1){
          stepAIGoalie(sdt,left,right);
        }else{
          // Human Auto Goalie keeps the established patrol behavior.
          goalie.x+=goalieDir*currentGoalieSpeed()*sdt;
          if(goalie.x<=left){goalie.x=left;goalieDir=1}
          else if(goalie.x>=right){goalie.x=right;goalieDir=-1}
        }
      }`,
'ai goalie movement'
);

await writeFile('dist/app.js', app, 'utf8');

let html = await readFile('dist/index.html', 'utf8');
html = html.replaceAll('v0.6.1', 'v0.7.0');
await writeFile('dist/index.html', html, 'utf8');

console.log('Coin Soccer AI goalkeeper applied: v0.7.0');

import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

let source = '';
for (let i = 0; i < 6; i++) source += await readFile(`j${i}.txt`, 'utf8');

function replaceRequired(oldText, newText, label) {
  if (!source.includes(oldText)) throw new Error(`Coin Soccer build: expected ${label} source was not found`);
  source = source.replace(oldText, newText);
}

// v0.1.2: any coin can finish a legal shot; kickoff is gate-exempt.
replaceRequired(
`  function checkGoal(c){
    if(shotCoinIndex<0||coins[shotCoinIndex]!==c)return false;
    if(!crossedGate)return false;`,
`  function checkGoal(c){
    if(shotCoinIndex<0)return false;
    if(hardMode&&c.type!=='dime')return false;
    if(!kickoffShot&&!crossedGate)return false;`,
'goal-check'
);
replaceRequired(
`      if(shotCoinIndex>=0&&checkGoal(coins[shotCoinIndex])){
        const scorer=attacker;
        const scoringCoin=coins[shotCoinIndex];`,
`      const scoringCoin=shotCoinIndex>=0?coins.find(checkGoal):null;
      if(scoringCoin){
        const scorer=attacker;`,
'scoring trigger'
);

// v0.1.3: goal pocket deep enough for the penny.
replaceRequired(
`    field.goalDepth=Math.max(16,field.h*0.026);`,
`    field.goalDepth=Math.max(16,field.h*0.026,baseRadius()*1.2);`,
'goal-depth'
);

// v0.3.0 + v0.4.0 match state.
replaceRequired(
`  let easyMode=false;`,
`  let easyMode=false;
  let hardMode=false;
  let matchStarter=0;
  let matchOver=false;
  let nextGameReady=[false,false];`,
'match state'
);

replaceRequired(`    const winner=score.findIndex(s=>s>=7);`,`    const winner=score.findIndex(s=>s>=3);`,'HUD winning score');
replaceRequired(`score.every(s=>s<7)`,`score.every(s=>s<3)`,'AI local win lock');
replaceRequired(`score.some(s=>s>=7)`,`score.some(s=>s>=3)`,'global win lock');
replaceRequired(`score[scorer]>=7`,`score[scorer]>=3`,'goal win threshold');

replaceRequired(
`    document.getElementById('legend').textContent=easyMode
      ? 'Easy Mode · 3 pennies · First to 7'
      : 'Pennies = 1 point · Dime = 2 points · First to 7';

    document.getElementById('mode').textContent=easyMode?'Mode: Easy':'Mode: Standard';`,
`    document.getElementById('legend').textContent=easyMode
      ? 'Easy · 3 pennies · First to 3'
      : hardMode
        ? 'Hard · Only the dime can score · First to 3'
        : 'Standard · Pennies = 1 · Dime = 2 · First to 3';

    document.getElementById('mode').textContent=easyMode
      ? 'Difficulty: Easy'
      : hardMode
        ? 'Difficulty: Hard'
        : 'Difficulty: Standard';`,
'difficulty HUD'
);

// Match lifecycle / ready-up helpers.
replaceRequired(
`  function switchPossession(reason='Turnover'){`,
`  function updateNewGamePanel(){
    const panel=document.getElementById('newGamePanel');
    if(!panel)return;
    if(!matchOver){panel.classList.add('hidden');return;}

    panel.classList.remove('hidden');
    const winner=score.findIndex(s=>s>=3);
    const title=document.getElementById('newGameTitle');
    if(onlineActive()) title.textContent=winner===onlineRole?'You win!':'Opponent wins!';
    else if(opponentMode==='ai'&&winner===1) title.textContent='AI wins!';
    else title.textContent=winner>=0?\`Player \${winner+1} wins!\`:'Game over';

    const status=document.getElementById('readyStatus');
    const selfBtn=document.getElementById('readySelf');
    const localButtons=document.getElementById('sameDeviceReady');
    const p1Btn=document.getElementById('readyP1');
    const p2Btn=document.getElementById('readyP2');

    if(opponentMode==='human'){
      selfBtn.classList.add('hidden');
      localButtons.classList.remove('hidden');
      p1Btn.disabled=nextGameReady[0];
      p2Btn.disabled=nextGameReady[1];
      p1Btn.textContent=nextGameReady[0]?'Player 1 Ready ✓':'Player 1 · Play New Game';
      p2Btn.textContent=nextGameReady[1]?'Player 2 Ready ✓':'Player 2 · Play New Game';
      status.textContent=nextGameReady[0]&&nextGameReady[1]
        ? 'Both players ready.'
        : \`P1: \${nextGameReady[0]?'Ready':'Waiting'} · P2: \${nextGameReady[1]?'Ready':'Waiting'}\`;
    }else{
      localButtons.classList.add('hidden');
      selfBtn.classList.remove('hidden');
      const side=onlineActive()?onlineRole:0;
      selfBtn.disabled=!!nextGameReady[side];
      selfBtn.textContent=nextGameReady[side]?'Ready ✓':'Play New Game';
      if(opponentMode==='ai'){
        status.textContent=nextGameReady[0]?'Starting next game…':'AI is ready. Ready up when you are.';
      }else{
        const other=1-side;
        status.textContent=\`You: \${nextGameReady[side]?'Ready':'Waiting'} · Opponent: \${nextGameReady[other]?'Ready':'Waiting'}\`;
      }
    }
  }

  function resetAIForMatch(){
    aiThinking=false;aiTimer=0;aiLastCoin=-1;aiLastProgress=null;aiStallCount=0;aiShotCount=0;aiGateAttempts=0;aiGateMakes=0;
  }

  function beginMatchAtStarter(starter){
    matchStarter=starter;
    matchOver=false;
    nextGameReady=[false,false];
    resetAIForMatch();
    score=[0,0];
    attacker=matchStarter;
    resetFormation();
    updateHUD();
    updateNewGamePanel();
    sendNetworkState(true);
  }

  function startReadyNextGame(){
    beginMatchAtStarter(1-matchStarter);
  }

  function maybeStartReadyNextGame(){
    if(!matchOver)return;
    if(opponentMode==='ai'){
      if(nextGameReady[0])startReadyNextGame();
      return;
    }
    if(opponentMode==='online'){
      if(isHost()&&nextGameReady[0]&&nextGameReady[1])startReadyNextGame();
      return;
    }
    if(nextGameReady[0]&&nextGameReady[1])startReadyNextGame();
  }

  function readyNextGame(side){
    if(!matchOver||side<0||side>1)return;
    nextGameReady[side]=true;
    updateNewGamePanel();
    if(opponentMode==='online'){
      if(isHost()){
        sendNetworkState(true);
        maybeStartReadyNextGame();
      }else{
        sendBroadcast('ready_next',{player:side});
      }
    }else{
      maybeStartReadyNextGame();
    }
  }

  function restartCurrentGame(){
    beginMatchAtStarter(matchStarter);
    toast('Game restarted');
  }

  window.coinSoccerStartMatchMode=async mode=>{
    if(onlineActive())await leaveOnline(false);
    opponentMode=mode==='ai'?'ai':'human';
    beginMatchAtStarter(0);
  };

  window.coinSoccerReturnToMainMenu=async()=>{
    if(onlineActive())await leaveOnline(false);
    opponentMode='human';
    beginMatchAtStarter(0);
    document.getElementById('onlinePanel').classList.add('hidden');
    document.getElementById('startPanel').classList.remove('hidden');
  };

  function switchPossession(reason='Turnover'){`,
'match lifecycle helpers'
);

// Winning a match now opens the ready-up screen. The next completed-match game
// alternates kickoff via matchStarter rather than by winner/loser.
replaceRequired(
`        if(score[scorer]>=3){
          coins.forEach(c=>{c.vx=0;c.vy=0});`,
`        if(score[scorer]>=3){
          matchOver=true;
          nextGameReady=[false,false];
          coins.forEach(c=>{c.vx=0;c.vy=0});`,
'game-over state'
);
replaceRequired(
`          hintEl.textContent=\`\${winnerName} wins with \${score[scorer]} points! Reset Match to play again.\`;`,
`          hintEl.textContent=\`\${winnerName} wins with \${score[scorer]} points! Ready up for the next game.\`;`,
'game-over hint'
);
replaceRequired(
`          sendNetworkState(true);
          return;
        }`,
`          updateNewGamePanel();
          sendNetworkState(true);
          return;
        }`,
'game-over panel trigger'
);

// Keep difficulty and ready-up/match-starter state synchronized online.
replaceRequired(
`      score:[...score],
      easyMode,
      running,`,
`      score:[...score],
      easyMode,
      hardMode,
      matchStarter,
      matchOver,
      nextGameReady:[...nextGameReady],
      running,`,
'network match state'
);
replaceRequired(
`    easyMode=!!s.easyMode;
    running=!!s.running;`,
`    easyMode=!!s.easyMode;
    hardMode=!!s.hardMode;
    matchStarter=Number.isInteger(s.matchStarter)?s.matchStarter:matchStarter;
    matchOver=!!s.matchOver;
    nextGameReady=Array.isArray(s.nextGameReady)?[!!s.nextGameReady[0],!!s.nextGameReady[1]]:[false,false];
    running=!!s.running;`,
'network match apply'
);
replaceRequired(
`    updateHUD();
  }

  function broadcastGameEvent(message){`,
`    updateHUD();
    updateNewGamePanel();
  }

  function broadcastGameEvent(message){`,
'network ready panel apply'
);

// Guest ready signal is collected by the authoritative host.
replaceRequired(
`      .on('broadcast',{event:'keeper_hold'},({payload})=>{
        if(!isHost()||!payload||payload.player!==1)return;
        remoteKeeperHeld=!!payload.held;
      })`,
`      .on('broadcast',{event:'keeper_hold'},({payload})=>{
        if(!isHost()||!payload||payload.player!==1)return;
        remoteKeeperHeld=!!payload.held;
      })
      .on('broadcast',{event:'ready_next'},({payload})=>{
        if(!isHost()||!matchOver||!payload||payload.player!==1)return;
        nextGameReady[1]=true;
        updateNewGamePanel();
        sendNetworkState(true);
        maybeStartReadyNextGame();
      })`,
'online ready event'
);

// Host-created online sessions always begin with Player 1; subsequent completed
// games alternate through the ready-up flow.
replaceRequired(
`    if(role===0){
      score=[0,0];
      attacker=0;
      resetFormation();
    }`,
`    if(role===0){
      matchStarter=0;
      matchOver=false;
      nextGameReady=[false,false];
      score=[0,0];
      attacker=0;
      resetFormation();
    }`,
'online initial starter'
);

// AI should not plan penny shots as scores in Hard.
replaceRequired(
`    const scoringShots=[];
    for(let i=0;i<coins.length;i++){
      const c=coins[i];
      const gate=aiGateFor(i);`,
`    const scoringShots=[];
    for(let i=0;i<coins.length;i++){
      const c=coins[i];
      if(hardMode&&c.type!=='dime')continue;
      const gate=aiGateFor(i);`,
'AI hard scoring eligibility'
);

// Difficulty cycle preserves the current match's kickoff owner when resetting.
replaceRequired(
`  document.getElementById('mode').addEventListener('click',()=>{
    if(onlineActive()&&!isHost()){
      toast('Player 1 controls match rules');
      return;
    }
    easyMode=!easyMode;
    score=[0,0];attacker=0;resetFormation();updateHUD();
    toast(easyMode?'Easy Mode: any coin can score':'Standard Mode: dime scores');
    sendNetworkState(true);
  });`,
`  document.getElementById('mode').addEventListener('click',()=>{
    if(onlineActive()&&!isHost()){
      toast('Player 1 controls match rules');
      return;
    }
    if(!easyMode&&!hardMode)easyMode=true;
    else if(easyMode){easyMode=false;hardMode=true;}
    else hardMode=false;
    beginMatchAtStarter(matchStarter);
    toast(easyMode?'Easy: all pennies can score':hardMode?'Hard: only the dime can score':'Standard: pennies 1, dime 2');
  });`,
'difficulty button handler'
);

// Restart Game replaces Reset Match, while Main Menu and ready buttons drive
// the new lifecycle.
replaceRequired(
`  document.getElementById('reset').addEventListener('click',()=>{
    if(onlineActive()&&!isHost()){toast('Player 1 controls reset');return}
    aiLastCoin=-1;aiLastProgress=null;aiStallCount=0;aiShotCount=0;aiGateAttempts=0;aiGateMakes=0;
    score=[0,0];attacker=0;resetFormation();updateHUD();toast('Match reset');
    sendNetworkState(true);
  });`,
`  document.getElementById('restart').addEventListener('click',()=>{
    if(onlineActive()&&!isHost()){toast('Player 1 controls restart');return}
    restartCurrentGame();
  });

  document.getElementById('mainMenu').addEventListener('click',()=>{
    window.coinSoccerReturnToMainMenu();
  });

  document.getElementById('readySelf').addEventListener('click',()=>{
    readyNextGame(onlineActive()?onlineRole:0);
  });
  document.getElementById('readyP1').addEventListener('click',()=>readyNextGame(0));
  document.getElementById('readyP2').addEventListener('click',()=>readyNextGame(1));`,
'restart and ready handlers'
);

await writeFile('dist/app.js', source, 'utf8');
await copyFile('index.html', 'dist/index.html');
await copyFile('style.css', 'dist/style.css');

console.log(`Coin Soccer bundle built: ${source.length} bytes`);

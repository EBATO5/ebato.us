import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

let source = '';
for (let i = 0; i < 6; i++) {
  source += await readFile(`j${i}.txt`, 'utf8');
}

function replaceRequired(oldText, newText, label) {
  if (!source.includes(oldText)) {
    throw new Error(`Coin Soccer build: expected ${label} source was not found`);
  }
  source = source.replace(oldText, newText);
}

// v0.1.2: a legal shot can score with ANY coin that crosses the attacking
// goal line, not only the coin that was directly flicked. Kickoffs are exempt
// from the gate requirement.
replaceRequired(
`  function checkGoal(c){
    if(shotCoinIndex<0||coins[shotCoinIndex]!==c)return false;
    if(!crossedGate)return false;`,
`  function checkGoal(c){
    if(shotCoinIndex<0)return false;
    // Hard difficulty: pennies may still pass, collide, and set up the dime,
    // but only the dime can actually score.
    if(hardMode&&c.type!=='dime')return false;
    // Kickoffs are gate-exempt; all later goals require the shot to have made its gate.
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

// v0.1.3: the original goal pocket could be shallower than a penny's radius.
replaceRequired(
`    field.goalDepth=Math.max(16,field.h*0.026);`,
`    field.goalDepth=Math.max(16,field.h*0.026,baseRadius()*1.2);`,
'goal-depth'
);

// v0.3.0: add Hard as a third difficulty while keeping Easy/Standard behavior.
replaceRequired(
`  let easyMode=false;`,
`  let easyMode=false;
  let hardMode=false;`,
'difficulty state'
);

replaceRequired(
`    const winner=score.findIndex(s=>s>=7);`,
`    const winner=score.findIndex(s=>s>=3);`,
'HUD winning score'
);

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

replaceRequired(
`score.every(s=>s<7)`,
`score.every(s=>s<3)`,
'AI local win lock'
);
replaceRequired(
`score.some(s=>s>=7)`,
`score.some(s=>s>=3)`,
'global win lock'
);
replaceRequired(
`score[scorer]>=7`,
`score[scorer]>=3`,
'goal win threshold'
);

// Keep Hard difficulty synchronized in online games.
replaceRequired(
`      score:[...score],
      easyMode,
      running,`,
`      score:[...score],
      easyMode,
      hardMode,
      running,`,
'network difficulty state'
);
replaceRequired(
`    easyMode=!!s.easyMode;
    running=!!s.running;`,
`    easyMode=!!s.easyMode;
    hardMode=!!s.hardMode;
    running=!!s.running;`,
'network difficulty apply'
);

// The AI should never mistake a penny goal for a valid scoring plan in Hard.
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

// Cycle Standard -> Easy -> Hard -> Standard. Changing difficulty resets the
// match, matching the previous Easy/Standard toggle behavior.
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
    if(!easyMode&&!hardMode){
      easyMode=true;
    }else if(easyMode){
      easyMode=false;
      hardMode=true;
    }else{
      hardMode=false;
    }
    score=[0,0];attacker=0;resetFormation();updateHUD();
    toast(easyMode
      ? 'Easy: all pennies can score'
      : hardMode
        ? 'Hard: only the dime can score'
        : 'Standard: pennies 1, dime 2');
    sendNetworkState(true);
  });`,
'difficulty button handler'
);

await writeFile('dist/app.js', source, 'utf8');
await copyFile('index.html', 'dist/index.html');
await copyFile('style.css', 'dist/style.css');

console.log(`Coin Soccer bundle built: ${source.length} bytes`);

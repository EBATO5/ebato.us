import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

let source = '';
for (let i = 0; i < 6; i++) {
  source += await readFile(`j${i}.txt`, 'utf8');
}

// The gameplay source is stored in historical chunks. Apply the scoring fix
// while bundling so a legal shot can score with ANY coin that crosses the
// attacking goal line, not only the coin that was directly flicked.
const oldGoalCheck = `  function checkGoal(c){
    if(shotCoinIndex<0||coins[shotCoinIndex]!==c)return false;
    if(!crossedGate)return false;`;
const newGoalCheck = `  function checkGoal(c){
    if(shotCoinIndex<0)return false;
    // Kickoffs are gate-exempt; all later goals require the shot to have made its gate.
    if(!kickoffShot&&!crossedGate)return false;`;

if (!source.includes(oldGoalCheck)) {
  throw new Error('Coin Soccer build: expected goal-check source was not found');
}
source = source.replace(oldGoalCheck, newGoalCheck);

const oldScoringTrigger = `      if(shotCoinIndex>=0&&checkGoal(coins[shotCoinIndex])){
        const scorer=attacker;
        const scoringCoin=coins[shotCoinIndex];`;
const newScoringTrigger = `      const scoringCoin=shotCoinIndex>=0?coins.find(checkGoal):null;
      if(scoringCoin){
        const scorer=attacker;`;

if (!source.includes(oldScoringTrigger)) {
  throw new Error('Coin Soccer build: expected scoring trigger source was not found');
}
source = source.replace(oldScoringTrigger, newScoringTrigger);

// The original goal pocket could be shallower than a penny's radius. In that
// case the back wall stopped the penny before its CENTER ever crossed the goal
// line, so checkGoal() could never fire. Make the pocket deep enough for the
// largest standard coin while preserving the existing center-crossing rule.
const oldGoalDepth = `    field.goalDepth=Math.max(16,field.h*0.026);`;
const newGoalDepth = `    field.goalDepth=Math.max(16,field.h*0.026,baseRadius()*1.2);`;
if (!source.includes(oldGoalDepth)) {
  throw new Error('Coin Soccer build: expected goal-depth source was not found');
}
source = source.replace(oldGoalDepth, newGoalDepth);

await writeFile('dist/app.js', source, 'utf8');
await copyFile('index.html', 'dist/index.html');
await copyFile('style.css', 'dist/style.css');

console.log(`Coin Soccer bundle built: ${source.length} bytes`);

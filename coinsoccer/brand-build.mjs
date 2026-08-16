import { readFile, writeFile, copyFile } from 'node:fs/promises';

// Run the proven gameplay build first. Branding is applied only to the generated
// static output so no AI, physics, scoring, goalie, or online logic is touched.
await import('./build.mjs');

await copyFile('assets/coin-soccer-logo.webp', 'dist/coin-soccer-logo.webp');

let html = await readFile('dist/index.html', 'utf8');

html = html.replaceAll('v0.5.4', 'v0.6.0');

html = html.replace(
  '<title>Coin Soccer</title>',
  '<title>Coin Soccer</title>\n<link rel="icon" type="image/webp" href="coin-soccer-logo.webp"/>\n<link rel="preconnect" href="https://fonts.googleapis.com"/>\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500&display=swap" rel="stylesheet"/>'
);

html = html.replace(
  '<div class="title">⚽ Coin Soccer <span class="version">v0.6.0</span></div>',
  '<div class="title brandTitle"><img class="headerBrandLogo" src="coin-soccer-logo.webp" alt=""/><span class="brandName">Coin Soccer</span><span class="version">v0.6.0</span></div>'
);

html = html.replace(
  '<div class="startKicker">Choose Match</div>\n<h1 id="startTitle">⚽ Coin Soccer <span class="startVersion">v0.6.0</span></h1>',
  '<img class="startBrandLogo" src="coin-soccer-logo.webp" alt="Coin Soccer"/>\n<div class="startKicker">Choose Match</div>\n<h1 id="startTitle">Coin Soccer <span class="startVersion">v0.6.0</span></h1>'
);

const brandStyles = `
<style id="coinSoccerBrandStyles">
html,body,button,input{font-family:"Rajdhani","Arial Narrow","Roboto Condensed","Helvetica Neue",Arial,sans-serif;font-weight:400}
.title,.score,.startCard h1,.startChoice strong,.startKicker,.card h2,button,.roomCode strong,.onlineDivider,.difficultyChoice strong{font-family:"Rajdhani","Arial Narrow","Roboto Condensed","Helvetica Neue",Arial,sans-serif;font-weight:500;letter-spacing:.035em}
.legend,.status,#hint,#toast,.rules,.onlineStatus,.onlineHelp,.startChoice span,.startCard p,.nextKickoffNote,#readyStatus,input,.difficultyChoice span{font-family:"Rajdhani","Arial Narrow","Roboto Condensed","Helvetica Neue",Arial,sans-serif;font-weight:400}
.brandTitle{display:flex;align-items:center;gap:8px;line-height:1}
.headerBrandLogo{width:42px;height:42px;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 2px 5px rgba(0,0,0,.45))}
.brandName{font-size:20px;letter-spacing:.045em;text-transform:uppercase}
.brandTitle .version{margin-left:0}
.startBrandLogo{display:block;width:min(230px,48vw);height:auto;margin:-8px auto 2px;filter:drop-shadow(0 12px 28px rgba(0,0,0,.48))}
.startCard h1{margin-top:2px;font-size:34px;letter-spacing:.045em;text-transform:uppercase}
.startKicker{margin-top:0}
button{text-transform:uppercase}
@media(max-width:600px){
  .headerBrandLogo{width:34px;height:34px}
  .brandName{font-size:17px}
  .startBrandLogo{width:min(180px,46vw);margin:-4px auto 0}
  .startCard h1{font-size:27px}
}
</style>`;

html = html.replace('</head>', `${brandStyles}\n</head>`);

await writeFile('dist/index.html', html, 'utf8');

console.log('Coin Soccer branding applied: v0.6.0');

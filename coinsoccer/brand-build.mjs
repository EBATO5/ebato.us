import { readFile, writeFile } from 'node:fs/promises';

// Run the proven gameplay build first. Branding is applied only to the generated
// static output so no AI, physics, scoring, goalie, or online logic is touched.
await import('./build.mjs');

// Reconstruct the approved logo from build-safe text chunks. Validate the exact
// byte count and WebP signature so a partial asset can never deploy silently.
const logoParts = [
  'logo-00.b64',
  'logo-01.b64',
  'logo-02a.b64',
  'logo-02b.b64',
  'logo-03.b64',
  'logo-04.b64',
  'logo-05.b64',
  'logo-06.b64',
  'logo-07.b64',
  'logo-08.b64'
];
let logoBase64 = '';
for (const part of logoParts) {
  logoBase64 += (await readFile(`assets/${part}`, 'utf8')).trim();
}
const logoBuffer = Buffer.from(logoBase64, 'base64');
const validWebP = logoBuffer.subarray(0, 4).toString() === 'RIFF' && logoBuffer.subarray(8, 12).toString() === 'WEBP';
if (logoBuffer.length !== 30496 || !validWebP) {
  throw new Error(`Coin Soccer branding: invalid reconstructed logo (${logoBuffer.length} bytes)`);
}
const logoFile = 'coin-soccer-logo-v061.webp';
await writeFile(`dist/${logoFile}`, logoBuffer);

let html = await readFile('dist/index.html', 'utf8');

html = html.replace(
  '<title>Coin Soccer</title>',
  `<title>Coin Soccer</title>\n<link rel="icon" type="image/webp" href="${logoFile}"/>\n<link rel="preconnect" href="https://fonts.googleapis.com"/>\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500&display=swap" rel="stylesheet"/>`
);

html = html.replace(
  '<div class="title">⚽ Coin Soccer <span class="version">v0.6.0</span></div>',
  `<div class="title brandTitle"><img class="headerBrandLogo" src="${logoFile}" alt=""/><span class="brandName">Coin Soccer</span><span class="version">v0.6.0</span></div>`
);

html = html.replace(
  '<div class="startKicker">Choose Match</div>\n<h1 id="startTitle">⚽ Coin Soccer <span class="startVersion">v0.6.0</span></h1>',
  `<img class="startBrandLogo" src="${logoFile}" alt="Coin Soccer"/>\n<div class="startKicker">Choose Match</div>\n<h1 id="startTitle">Coin Soccer <span class="startVersion">v0.6.0</span></h1>`
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
.startBrandLogo{display:block;width:min(250px,52vw);height:auto;margin:-10px auto 2px;filter:drop-shadow(0 12px 28px rgba(0,0,0,.48))}
.startCard h1{margin-top:2px;font-size:34px;letter-spacing:.045em;text-transform:uppercase}
.startKicker{margin-top:0}
button{text-transform:uppercase}
@media(max-width:600px){
  .headerBrandLogo{width:34px;height:34px}
  .brandName{font-size:17px}
  .startBrandLogo{width:min(200px,52vw);margin:-4px auto 0}
  .startCard h1{font-size:27px}
}
</style>`;

html = html.replace('</head>', `${brandStyles}\n</head>`);
html = html.replaceAll('v0.6.0', 'v0.6.1');

await writeFile('dist/index.html', html, 'utf8');

console.log(`Coin Soccer branding applied: v0.6.1 (${logoBuffer.length} byte logo)`);

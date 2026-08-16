import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

let source = '';
for (let i = 0; i < 6; i++) {
  source += await readFile(`j${i}.txt`, 'utf8');
}

await writeFile('dist/app.js', source, 'utf8');
await copyFile('index.html', 'dist/index.html');
await copyFile('style.css', 'dist/style.css');

console.log(`Coin Soccer bundle built: ${source.length} bytes`);

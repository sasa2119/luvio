import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const files = [];
async function scan(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'images', 'fonts', 'qa', 'public'].includes(entry.name)) continue;
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await scan(name);
    else if (/\.(mjs|js)$/.test(name)) files.push(name);
  }
}
await scan('.');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}\n${result.stderr}`);
}
console.log(`Syntax checks passed for ${files.length} JavaScript modules.`);

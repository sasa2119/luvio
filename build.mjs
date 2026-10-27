import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from './src/pages.mjs';
import { document } from './src/document.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
// The existing deployable checkout serves static files at its root, not dist/.
// Preserve CSS/WebGL sources and all unrelated page templates on every rebuild.
for (const page of routes) {
  const dir = path.join(root, page.path);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), document(page));
}
await fs.copyFile(path.join(root, '404/index.html'), path.join(root, '404.html'));
console.log(`Built ${routes.length} static pages into the existing project root.`);
if (process.argv.includes('--deploy')) {
  // Publish only browser assets; API handlers and environment files stay server-side.
  const output = path.join(root, 'public');
  if (path.dirname(output) !== root || path.basename(output) !== 'public') throw new Error('Invalid deployment output.');
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  for (const page of routes) {
    const relative = path.join(page.path.replace(/^\//, ''), 'index.html');
    await fs.mkdir(path.dirname(path.join(output, relative)), { recursive: true });
    await fs.copyFile(path.join(root, relative), path.join(output, relative));
  }
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(css|js|svg|ico)$/.test(entry.name)) {
      await fs.copyFile(path.join(root, entry.name), path.join(output, entry.name));
    }
  }
  for (const dir of ['images', 'fonts', 'videos']) await fs.cp(path.join(root, dir), path.join(output, dir), { recursive: true });
  await fs.copyFile(path.join(root, '404.html'), path.join(output, '404.html'));
  console.log('Prepared public/ with static browser assets only.');
}

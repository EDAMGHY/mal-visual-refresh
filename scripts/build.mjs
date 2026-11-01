import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const out = 'dist';

await rm(out, { recursive: true, force: true });
await mkdir(`${out}/popup`, { recursive: true });
await cp('public', out, { recursive: true });
await cp('src/popup/index.html', `${out}/popup/index.html`);
await cp('src/popup/popup.css', `${out}/popup/popup.css`);

// Content scripts are loaded as classic scripts, so every entry is a self-contained IIFE.
const options = {
  entryPoints: [
    { in: 'src/content/index.ts', out: 'content' },
    { in: 'src/styles/content.css', out: 'content' },
    { in: 'src/popup/index.ts', out: 'popup/popup' },
  ],
  outdir: out,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  logLevel: 'info',
};

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}

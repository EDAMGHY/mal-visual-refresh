// Dev helper: node scripts/capture-fixture.mjs <url> <selector> <rowIndexes,comma> <out.html>
// Keeps the header row plus the chosen rows and strips tracking/inline-handler attributes.
import { writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const [url, selector, rowList, out] = process.argv.slice(2);
const html = await (
  await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36' } })
).text();
const doc = new JSDOM(html).window.document;
const node = doc.querySelector(selector);
if (!node) throw new Error(`no ${selector} at ${url}`);
const keep = new Set(rowList.split(',').map(Number));
const table = node.matches('table') ? node : node.querySelector('table');
[...table.rows].forEach((row, i) => i && !keep.has(i) && row.remove());
for (const el of node.querySelectorAll('*')) {
  for (const { name } of [...el.attributes]) {
    if (/^(onclick|style|data-ga|data-l-|srcset$|src$)/.test(name)) el.removeAttribute(name);
  }
}
node.querySelectorAll('img').forEach((img) => (img.className = 'lazyload'));
const note = `<!-- Captured signed out from ${url} on ${new Date().toISOString().slice(0, 10)}; rows ${rowList} kept. -->\n`;
await writeFile(out, note + node.outerHTML.replace(/[ \t]+\n/g, '\n').replace(/\n\s+/g, '\n') + '\n');
console.log(`${out}: ${table.rows.length - 1} rows`);

import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const names = (await readdir(root)).filter(name => name.endsWith('.html'));
const errors = [];

for (const name of names) {
  const filePath = path.join(root, name);
  const html = await readFile(filePath, 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${name}: duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);

  if (name !== 'telegram.html') {
    if (!/<main\b[^>]*id=["']main-content["']/i.test(html)) errors.push(`${name}: missing #main-content`);
    if (!/class=["']skip-link["']/i.test(html)) errors.push(`${name}: missing skip link`);
    if (!/rel=["']icon["']/i.test(html)) errors.push(`${name}: missing favicon`);
    if (!/property=["']og:image["']/i.test(html)) errors.push(`${name}: missing og:image`);
    const configAt = html.indexOf('assets/config.js');
    const mainAt = html.indexOf('assets/main.js');
    if (configAt < 0 || mainAt < 0 || configAt > mainAt) errors.push(`${name}: config.js must load before main.js`);
  }

  if (/href=["']#["']/i.test(html)) errors.push(`${name}: contains placeholder href="#"`);
  if (/zyran_(?:token|role|username|orders|last_order)/i.test(html)) errors.push(`${name}: contains legacy insecure localStorage auth/order key`);

  const links = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(match => match[1]);
  for (const value of links) {
    if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const [relative, fragment] = value.split('#');
    const target = path.resolve(root, path.dirname(name), relative || name);
    try { await access(target); } catch { errors.push(`${name}: missing local target ${value}`); continue; }
    if (fragment && relative.endsWith('.html')) {
      const targetHtml = await readFile(target, 'utf8');
      if (!new RegExp(`\\bid=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(targetHtml)) {
        errors.push(`${name}: missing fragment target ${value}`);
      }
    }
  }
}

const scripts = ['assets/main.js', 'assets/cart.js', 'assets/api.js'];
for (const script of scripts) {
  const source = await readFile(path.join(root, script), 'utf8');
  if (/minecraft:\/\//i.test(source)) errors.push(`${script}: must not launch external applications from the logo`);
  if (/60\s*\+\s*Math\.floor\(Math\.random/i.test(source)) errors.push(`${script}: contains a fake online counter`);
  if (/localStorage\.(?:getItem|setItem)\(["']zyran_(?:token|role|username|orders|feedback)/i.test(source)) {
    errors.push(`${script}: contains a legacy sensitive/fake localStorage key`);
  }
}

if (errors.length) {
  console.error(`Site checks failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Site checks passed for ${names.length} HTML files.`);

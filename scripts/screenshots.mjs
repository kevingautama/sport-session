// Capture light/dark screenshots of the running dev server (http://localhost:5173)
// using the system Edge browser via playwright-core. Output: screenshots/*.png
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const URL = process.env.URL || 'http://localhost:5173';
const screens = [
  { id: 'home', nav: 'Home' },
  { id: 'new-session', nav: 'New Session' },
  { id: 'stats', nav: 'Stats' },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 920 },
    deviceScaleFactor: 2,
    colorScheme: mode,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1', { timeout: 20000 });

  for (const screen of screens) {
    await page.getByRole('navigation').getByRole('button', { name: screen.nav }).click();
    await page.waitForTimeout(300);
    // Force the requested theme on <html> (overrides system/stored choice).
    await page.evaluate((m) => document.documentElement.classList.toggle('dark', m === 'dark'), mode);
    await page.waitForTimeout(700); // let charts/transitions settle
    const file = join(outDir, `${screen.id}-${mode}.png`);
    await page.screenshot({ path: file });
    console.log('saved', file);
  }
  await ctx.close();
}

await browser.close();
console.log('done');

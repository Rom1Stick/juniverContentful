import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

mkdirSync('.audit/screens', { recursive: true });

const mocks = [
  {
    name: 'm1-herbier-desktop',
    file: '.audit/mockups/01-herbier.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm1-herbier-mobile',
    file: '.audit/mockups/01-herbier.html',
    vp: { width: 390, height: 844 },
  },
  {
    name: 'm2-constellation-desktop',
    file: '.audit/mockups/02-constellation.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm2-constellation-mobile',
    file: '.audit/mockups/02-constellation.html',
    vp: { width: 390, height: 844 },
  },
  {
    name: 'm3-praxis-desktop',
    file: '.audit/mockups/03-praxis.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm3-praxis-mobile',
    file: '.audit/mockups/03-praxis.html',
    vp: { width: 390, height: 844 },
  },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
for (const m of mocks) {
  const page = await browser.newPage();
  await page.setViewport({ ...m.vp, deviceScaleFactor: 1 });
  const url = pathToFileURL(resolve(m.file)).href;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('warn', m.name, e.message);
  }
  // wait extra for webfonts + canvas
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `.audit/screens/${m.name}.png`, fullPage: true });
  console.log('captured', m.name);
  await page.close();
}
await browser.close();

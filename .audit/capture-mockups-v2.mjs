import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

mkdirSync('.audit/screens', { recursive: true });

const mocks = [
  {
    name: 'm4-symbiose-desktop',
    file: '.audit/mockups/04-symbiose.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm4-symbiose-mobile',
    file: '.audit/mockups/04-symbiose.html',
    vp: { width: 390, height: 844 },
  },
  {
    name: 'm5-atelier-desktop',
    file: '.audit/mockups/05-atelier.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm5-atelier-mobile',
    file: '.audit/mockups/05-atelier.html',
    vp: { width: 390, height: 844 },
  },
  {
    name: 'm6-riviere-desktop',
    file: '.audit/mockups/06-riviere.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'm6-riviere-mobile',
    file: '.audit/mockups/06-riviere.html',
    vp: { width: 390, height: 844 },
  },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
for (const m of mocks) {
  const page = await browser.newPage();
  await page.setViewport({ ...m.vp, deviceScaleFactor: 1 });
  const url = pathToFileURL(resolve(m.file)).href;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 35000 });
  } catch (e) {
    console.log('warn', m.name, e.message);
  }
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: `.audit/screens/${m.name}.png`, fullPage: true });
  console.log('captured', m.name);
  await page.close();
}
await browser.close();

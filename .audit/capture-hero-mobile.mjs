import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

mkdirSync('.audit/screens', { recursive: true });

const mocks = [
  { name: 'hero-m1-herbier', file: '.audit/mockups/01-herbier.html' },
  { name: 'hero-m2-constellation', file: '.audit/mockups/02-constellation.html' },
  { name: 'hero-m3-praxis', file: '.audit/mockups/03-praxis.html' },
  { name: 'hero-m4-symbiose', file: '.audit/mockups/04-symbiose.html' },
  { name: 'hero-m5-atelier', file: '.audit/mockups/05-atelier.html' },
  { name: 'hero-m6-riviere', file: '.audit/mockups/06-riviere.html' },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
for (const m of mocks) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const url = pathToFileURL(resolve(m.file)).href;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('warn', m.name, e.message);
  }
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `.audit/screens/${m.name}.png`, fullPage: false });
  console.log('captured', m.name);
  await page.close();
}
await browser.close();

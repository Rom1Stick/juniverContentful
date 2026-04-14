import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

mkdirSync('.audit/screens', { recursive: true });

const pages = [
  {
    name: 'index-desktop',
    url: 'http://localhost:3000/public/index.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'index-mobile',
    url: 'http://localhost:3000/public/index.html',
    vp: { width: 390, height: 844 },
  },
  {
    name: 'about',
    url: 'http://localhost:3000/public/views/about.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'calendar',
    url: 'http://localhost:3000/public/views/calendar.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'workshop',
    url: 'http://localhost:3000/public/views/workshop.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'contact',
    url: 'http://localhost:3000/public/views/contact.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'legal',
    url: 'http://localhost:3000/public/views/legal.html',
    vp: { width: 1440, height: 900 },
  },
  {
    name: 'admin',
    url: 'http://localhost:3000/admin/admin.html',
    vp: { width: 1440, height: 900 },
  },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

for (const p of pages) {
  const page = await browser.newPage();
  await page.setViewport(p.vp);
  try {
    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (e) {
    console.log(`warn ${p.name}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: `.audit/screens/${p.name}.png`, fullPage: true });
  console.log(`captured ${p.name}`);
  await page.close();
}

await browser.close();

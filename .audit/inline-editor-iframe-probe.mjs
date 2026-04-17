// Reproduit la situation EXACTE du panneau admin : on charge admin_inline_editor.html,
// on change le <select id="ie-page">, et on observe la liste générée dans #ie-list.
// L'admin requiert en principe l'auth, mais en local admin.js stocke un faux token.
// Si la modale de login bloque tout, on la contourne en posant le token directement.

import puppeteer from 'puppeteer';

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const PAGES = [
  '/public/index.html',
  '/public/views/about.html',
  '/public/views/cycle.html',
  '/public/views/workshop.html',
  '/public/views/calendar.html',
  '/public/views/contact.html',
  '/public/views/legal.html',
  '/public/views/privacy.html',
  '/public/views/succes.html',
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
});

// Pose un faux JWT pour que le chrome admin n'efface pas la page
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('admin_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.fake');
});

await page.goto(`${BASE}/admin/assets/views/admin_inline_editor.html`, {
  waitUntil: 'networkidle2',
  timeout: 15000,
});

// Attendre le montage
await new Promise((r) => setTimeout(r, 1200));

const results = [];
for (const p of PAGES) {
  errors.length = 0;
  await page.evaluate((value) => {
    const select = document.getElementById('ie-page');
    if (!select) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, p);
  // Attendre que l'iframe charge + retries (jusqu'à ~2s)
  await new Promise((r) => setTimeout(r, 2500));
  const info = await page.evaluate(() => {
    const list = document.getElementById('ie-list');
    const items = list ? list.querySelectorAll('.ie-item').length : 0;
    const count = document.getElementById('ie-count')?.textContent || '';
    const status = document.getElementById('ie-status')?.textContent || '';
    const frame = document.getElementById('ie-frame');
    return { items, count, status, src: frame?.src || '' };
  });
  results.push({ page: p, ...info, errors: errors.slice(0, 4) });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

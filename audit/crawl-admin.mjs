// Phase 3 — Crawl admin: status HTTP, erreurs console/network, contenu vide.
// Pré-requis: live-server actif sur :3000 (npm run dev:serve ou audit/server.log).
// Lance: node audit/crawl-admin.mjs

import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const PAGES = [
  { url: `${BASE}/admin/admin.html`, name: 'dashboard', listSel: null },
  {
    url: `${BASE}/admin/assets/views/admin_profiles.html`,
    name: 'profiles',
    listSel: '#profiles-container',
  },
  {
    url: `${BASE}/admin/assets/views/admin_events.html`,
    name: 'events',
    listSel: '#events-container',
  },
  {
    url: `${BASE}/admin/assets/views/admin_articles.html`,
    name: 'articles',
    listSel: '#articles-container',
  },
  {
    url: `${BASE}/admin/assets/views/admin_workshops.html`,
    name: 'workshops',
    listSel: '#workshops-container',
  },
  {
    url: `${BASE}/admin/assets/views/admin_inline_editor.html`,
    name: 'inline_editor',
    listSel: '#ie-list',
  },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

await mkdir('audit/screens', { recursive: true });

const report = [];

for (const { url, name, listSel } of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  const failedRequests = [];
  const status404 = [];
  const status5xx = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (req) =>
    failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`)
  );
  page.on('response', (r) => {
    if (r.status() === 404) status404.push(`${r.request().method()} ${r.url()}`);
    if (r.status() >= 500) status5xx.push(`${r.status()} ${r.url()}`);
  });

  // Seed auth
  await page
    .goto(`${BASE}/admin/admin.html`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    .catch(() => {});
  await page.evaluate(() => {
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('sessionExpiry', String(Date.now() + 1800000));
  });

  let response,
    navError = null;
  try {
    response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (err) {
    navError = err.message;
  }

  // Laisse le temps aux fetch Contentful + render
  await new Promise((r) => setTimeout(r, 1500));

  const dom = await page.evaluate((listSel) => {
    const has = (sel) => !!document.querySelector(sel);
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const main = document.querySelector('main');
    const topbar = document.querySelector('.admin-topbar, .ie-topbar');
    const overlay = document.querySelector('.login-overlay');
    const list = listSel ? document.querySelector(listSel) : null;
    const listChildren = list ? list.children.length : null;
    const listVisibleChildren = list
      ? Array.from(list.children).filter((c) => {
          const cs = getComputedStyle(c);
          return cs.display !== 'none' && cs.visibility !== 'hidden';
        }).length
      : null;
    return {
      title: document.title,
      bodyClasses: document.body.className,
      authenticated: document.body.classList.contains('authenticated'),
      mainVisible: visible(main),
      topbarVisible: visible(topbar),
      overlayPresent: !!overlay,
      listSelectorPresent: listSel ? has(listSel) : null,
      listChildren,
      listVisibleChildren,
      mainTextLength: main ? main.textContent.trim().length : 0,
    };
  }, listSel);

  await page.screenshot({ path: `audit/screens/${name}.png`, fullPage: true });

  let verdict = 'OK';
  const reasons = [];
  if (navError) {
    verdict = 'ERROR';
    reasons.push(`nav: ${navError}`);
  } else if (response && response.status() >= 400) {
    verdict = 'HTTP_ERROR';
    reasons.push(`status ${response.status()}`);
  } else if (!dom.authenticated) {
    verdict = 'AUTH_FAIL';
    reasons.push('body not .authenticated');
  } else if (!dom.mainVisible && !dom.overlayPresent) {
    verdict = 'EMPTY';
    reasons.push('main not visible, no overlay');
  } else if (!dom.topbarVisible && name !== 'inline_editor') {
    verdict = 'NO_CHROME';
    reasons.push('topbar not visible');
  }
  if (consoleErrors.length) reasons.push(`${consoleErrors.length} console error(s)`);
  if (status404.length) reasons.push(`${status404.length} 404(s)`);
  if (status5xx.length) reasons.push(`${status5xx.length} 5xx`);
  if (failedRequests.length) reasons.push(`${failedRequests.length} request failure(s)`);
  if (dom.listSelectorPresent === false) reasons.push(`liste manquante (${listSel})`);
  // Liste vide: noter mais ne pas rejeter (peut être un état vide légitime)
  if (dom.listChildren === 0) reasons.push(`liste ${listSel} vide`);

  report.push({
    name,
    url,
    status: response?.status() ?? '?',
    verdict,
    reasons,
    dom,
    consoleErrors,
    failedRequests,
    status404,
    status5xx,
  });

  await page.close();
}

await browser.close();

// Console summary
console.log('\n=== PHASE 3 — CRAWL ADMIN ===\n');
for (const r of report) {
  const icon = r.verdict === 'OK' ? '✓' : '✗';
  console.log(`${icon} [${r.verdict}] ${r.name} (${r.status})  ${r.url}`);
  if (r.reasons.length) console.log(`    ${r.reasons.join(' · ')}`);
  if (r.consoleErrors.length && r.consoleErrors.length <= 5) {
    r.consoleErrors.forEach((e) => console.log(`    err: ${e.slice(0, 200)}`));
  }
  if (r.status404.length) r.status404.slice(0, 5).forEach((u) => console.log(`    404: ${u}`));
  if (r.failedRequests.length)
    r.failedRequests.slice(0, 5).forEach((u) => console.log(`    fail: ${u}`));
}

await writeFile('audit/crawl-admin.json', JSON.stringify(report, null, 2));
console.log('\nRapport JSON: audit/crawl-admin.json');
console.log('Captures: audit/screens/');

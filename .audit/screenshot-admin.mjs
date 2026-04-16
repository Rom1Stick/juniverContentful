import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';

const PAGES = [
  { url: 'http://localhost:3000/admin/admin.html', name: 'admin-noauth', auth: false },
  { url: 'http://localhost:3000/admin/admin.html', name: 'admin-auth', auth: true },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_profiles.html',
    name: 'profiles-auth',
    auth: true,
  },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_events.html',
    name: 'events-auth',
    auth: true,
  },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_articles.html',
    name: 'articles-auth',
    auth: true,
  },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_workshops.html',
    name: 'workshops-auth',
    auth: true,
  },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_inline_editor.html',
    name: 'inline-editor-auth',
    auth: true,
  },
];

await mkdir('.audit/screens-admin', { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

for (const { url, name, auth } of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (req) =>
    consoleErrors.push('REQFAIL: ' + req.url() + ' ' + req.failure()?.errorText)
  );
  page.on('response', (r) => {
    if (r.status() === 404) consoleErrors.push('404: ' + r.url());
  });

  if (auth) {
    await page.goto('http://localhost:3000/admin/admin.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('sessionExpiry', String(Date.now() + 1800000));
    });
  }
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  const visibility = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'NULL';
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return `display=${cs.display} vis=${cs.visibility} opacity=${cs.opacity} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
    };
    return {
      bodyClasses: document.body.className,
      topbar: get('.admin-topbar'),
      main: get('main'),
      footer: get('.admin-foot'),
      overlay: get('.login-overlay'),
      ieTopbar: get('.ie-topbar'),
      ieLayout: get('.ie-layout'),
      bodyChildren: document.body.children.length,
    };
  });

  await page.screenshot({ path: `.audit/screens-admin/${name}.png`, fullPage: false });
  console.log(`\n══ ${name} (${url}) ══`);
  console.log(`body.className: "${visibility.bodyClasses}"`);
  console.log(`children: ${visibility.bodyChildren}`);
  console.log(`overlay   : ${visibility.overlay}`);
  console.log(`topbar    : ${visibility.topbar}`);
  console.log(`main      : ${visibility.main}`);
  console.log(`footer    : ${visibility.footer}`);
  console.log(`ie-topbar : ${visibility.ieTopbar}`);
  console.log(`ie-layout : ${visibility.ieLayout}`);
  if (consoleErrors.length) {
    console.log('CONSOLE ERRORS:');
    consoleErrors.forEach((e) => console.log('  ' + e));
  }
  await page.close();
}

await browser.close();
console.log('\nScreenshots in .audit/screens-admin/');

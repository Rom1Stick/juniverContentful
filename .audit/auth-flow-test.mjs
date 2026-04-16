// E2E flow auth admin.
// Les tests de login réel (avec identifiants) nécessitent le backend Netlify Functions.
// En l'absence (live-server seul), on skip avec un message clair.

import puppeteer from 'puppeteer';

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const TEST_ID = process.env.TEST_ADMIN_ID;
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function hasFunctions() {
  try {
    const r = await fetch(`${BASE}/api/auth/me`);
    return r.status === 401 || r.status === 200;
  } catch {
    return false;
  }
}
const backendUp = await hasFunctions();

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (err) {
    results.push(`❌ ${name} — ${err.message}`);
  }
}
function skip(name, why) {
  results.push(`⊘ ${name} — skip (${why})`);
}

// 1. admin.html sans session → overlay
await check('admin.html sans session : login overlay affiché', async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  const overlay = await page.$('.login-overlay');
  if (!overlay) throw new Error('login overlay absent');
  const mainVisible = await page.evaluate(() => {
    const m = document.querySelector('main');
    return m && getComputedStyle(m).display !== 'none';
  });
  if (mainVisible) throw new Error('main visible avant login');
  await page.close();
});

// 2. Sous-page admin sans session → overlay aussi
await check('admin/profiles sans session : login overlay affiché', async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/assets/views/admin_profiles.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  const overlay = await page.$('.login-overlay');
  if (!overlay) throw new Error('login overlay absent sur sous-page');
  await page.close();
});

// 3. Login mauvais → erreur (nécessite backend)
if (backendUp) {
  await check('login mauvais : message erreur visible', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
    await page.type('.login-box input[type="text"]', 'wrong-id');
    await page.type('.login-box input[type="password"]', 'wrong-pwd');
    await page.click('.login-box button');
    await new Promise((r) => setTimeout(r, 800));
    const errVisible = await page.evaluate(() => {
      const e = document.querySelector('.login-error');
      return e && getComputedStyle(e).display !== 'none' && e.textContent.length > 0;
    });
    if (!errVisible) throw new Error('erreur non affichée');
    await page.close();
  });
} else {
  skip('login mauvais : message erreur visible', 'backend absent');
}

// 4. Login correct → topbar visible (nécessite backend + TEST_ADMIN_*)
if (backendUp && TEST_ID && TEST_PASSWORD) {
  await check('login correct : topbar + main visibles', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
    await page.type('.login-box input[type="text"]', TEST_ID);
    await page.type('.login-box input[type="password"]', TEST_PASSWORD);
    await page.click('.login-box button');
    await new Promise((r) => setTimeout(r, 1200));
    const auth = await page.evaluate(() => document.body.classList.contains('authenticated'));
    if (!auth) throw new Error('body.authenticated absent après login');
    const topbarVisible = await page.evaluate(() => {
      const tb = document.querySelector('.admin-topbar');
      return tb && getComputedStyle(tb).display !== 'none';
    });
    if (!topbarVisible) throw new Error('topbar non visible après login');
    await page.close();
  });
} else {
  skip(
    'login correct : topbar + main visibles',
    backendUp ? 'TEST_ADMIN_* manquants' : 'backend absent'
  );
}

// 5. Session valide (seed token) → accès direct (fonctionne en mode dégradé sans backend)
await check('session valide (token seedé) : accès direct sans overlay', async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'domcontentloaded' });
  const exp = Date.now() + 1800000;
  await page.evaluate((e) => {
    sessionStorage.setItem('adminToken', 'seeded-fake-jwt');
    sessionStorage.setItem('adminExpiry', String(e));
  }, exp);
  await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  const overlay = await page.$('.login-overlay');
  if (overlay) throw new Error('overlay présent malgré session valide');
  const topbarVisible = await page.evaluate(() => {
    const tb = document.querySelector('.admin-topbar');
    return tb && getComputedStyle(tb).display !== 'none';
  });
  if (!topbarVisible) throw new Error('topbar non visible avec session');
  await page.close();
});

// 6. Déconnexion → session purgée
await check('déconnexion : sessionStorage purgé', async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'domcontentloaded' });
  const exp = Date.now() + 1800000;
  await page.evaluate((e) => {
    sessionStorage.setItem('adminToken', 'seeded-fake-jwt');
    sessionStorage.setItem('adminExpiry', String(e));
  }, exp);
  await page.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  const logoutLink = await page.$('[data-admin-logout]');
  if (!logoutLink) throw new Error('lien déconnexion absent');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
    page.click('[data-admin-logout]'),
  ]);
  await new Promise((r) => setTimeout(r, 400));
  const stillAuth = await page.evaluate(() => sessionStorage.getItem('adminToken'));
  if (stillAuth) throw new Error('token non purgé');
  await page.close();
});

await browser.close();

console.log('\n=== AUTH FLOW E2E ===\n');
results.forEach((r) => console.log(r));
const fails = results.filter((r) => r.startsWith('❌')).length;
const skipped = results.filter((r) => r.startsWith('⊘')).length;
console.log(
  `\n${results.length - fails - skipped}/${results.length - skipped} checks OK${skipped ? ` (${skipped} skippés)` : ''}`
);
process.exit(fails ? 1 : 0);

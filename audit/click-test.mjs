// Test E2E : ouverture des modales et vérification que les boutons cliquent.
// Ne crée PAS de données dans Contentful — vérifie seulement que les boutons ouvrent les écrans attendus.

import puppeteer from 'puppeteer';

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

const results = [];
function record(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? '  · ' + info : ''}`);
}

// Détecte si le backend (Netlify Functions) est joignable.
// Si non (= live-server seul), les tests admin qui dépendent de /api/cma sont skippés.
async function hasFunctionsBackend() {
  try {
    const r = await fetch(`${BASE}/api/auth/me`);
    return r.status === 401 || r.status === 200; // 404 sur live-server
  } catch {
    return false;
  }
}

function skip(name, why) {
  results.push({ name, ok: true, skipped: true, info: why });
  console.log(`⊘ ${name}  · skip (${why})`);
}

async function authPage() {
  const p = await browser.newPage();
  p.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(`${BASE}/admin/admin.html`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    // Nouveau format de session (JWT) + compat ancien format
    const fakeExp = Date.now() + 1800000;
    sessionStorage.setItem('adminToken', 'test-fake-jwt-for-local-dev');
    sessionStorage.setItem('adminExpiry', String(fakeExp));
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('sessionExpiry', String(fakeExp));
  });
  return p;
}

async function plainPage() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  return p;
}

async function testProfilesImages() {
  const p = await authPage();
  await p.goto(`${BASE}/admin/assets/views/admin_profiles.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  const data = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#profiles-container .profile-card'));
    const realPhotos = cards.filter((c) => {
      const src = c.querySelector('img.profile-img')?.src || '';
      return src.startsWith('https:') && !src.includes('default-profile');
    }).length;
    return { total: cards.length, realPhotos };
  });
  record('profils admin — cards rendues', data.total > 0, `${data.total} cards`);
  record(
    'profils admin — photos réelles (≠ default)',
    data.realPhotos > 0,
    `${data.realPhotos}/${data.total} avec vraie photo`
  );

  // New: modal profile
  await p.click('#new-profile-btn');
  await new Promise((r) => setTimeout(r, 400));
  const modalOpen = await p.evaluate(
    () => !!document.querySelector('.admin-modal-overlay.is-visible')
  );
  record('profils admin — modale "Nouveau profil" s\'ouvre', modalOpen);
  await p.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // Edit on first card
  await p.click('.profile-card .edit-profile');
  await new Promise((r) => setTimeout(r, 500));
  const nameVal = await p.evaluate(() => document.getElementById('profile-name')?.value || '');
  record(
    'profils admin — modale "Modifier" préremplit le nom',
    nameVal.length > 0,
    `nom = "${nameVal.slice(0, 40)}"`
  );
  await p.close();
}

async function testArticlesModal() {
  const p = await authPage();
  await p.goto(`${BASE}/admin/assets/views/admin_articles.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await p.click('#new-article-btn');
  await new Promise((r) => setTimeout(r, 400));
  const modalOpen = await p.evaluate(
    () => !!document.querySelector('.admin-modal-overlay.is-visible')
  );
  const editorPresent = await p.evaluate(() => !!document.querySelector('.rich-editor__area'));
  const toolbarBtns = await p.evaluate(
    () => document.querySelectorAll('.rich-editor__toolbar .re-btn').length
  );
  record('articles — modale "Nouvel article" s\'ouvre', modalOpen);
  record('articles — éditeur riche présent', editorPresent);
  record('articles — toolbar peuplée', toolbarBtns >= 8, `${toolbarBtns} boutons`);
  await p.keyboard.press('Escape');
  await p.close();
}

async function testEventsModal() {
  const p = await authPage();
  await p.goto(`${BASE}/admin/assets/views/admin_events.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await p.click('#new-event-btn');
  await new Promise((r) => setTimeout(r, 400));
  const modalOpen = await p.evaluate(
    () => !!document.querySelector('.admin-modal-overlay.is-visible')
  );
  record("événements admin — modale s'ouvre", modalOpen);
  await p.keyboard.press('Escape');
  await p.close();
}

async function testWorkshopsModal() {
  const p = await authPage();
  await p.goto(`${BASE}/admin/assets/views/admin_workshops.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await p.click('#add-workshop');
  await new Promise((r) => setTimeout(r, 500));
  const modalOpen = await p.evaluate(
    () => !!document.querySelector('.admin-modal-overlay.is-visible')
  );
  record("ateliers admin — modale s'ouvre", modalOpen);
  await p.keyboard.press('Escape');
  await p.close();
}

async function testDashboardCounts() {
  const p = await authPage();
  await p.goto(`${BASE}/admin/admin.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  const counts = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('.admin-service-count')).map((el) =>
      el.textContent.trim()
    );
  });
  const allFilled = counts.length === 5 && counts.every((c) => c && c !== '…' && c !== '—');
  record('dashboard — 5 compteurs renseignés', allFilled, counts.join(' | '));
  await p.close();
}

async function testHomeUpcoming() {
  const p = await plainPage();
  await p.goto(`${BASE}/public/index.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  const items = await p.evaluate(() => document.querySelectorAll('.home-upcoming__item').length);
  record('home — section "prochains rendez-vous" peuplée', items > 0, `${items} évènements`);

  if (items > 0) {
    await p.click('.home-upcoming__item');
    await new Promise((r) => setTimeout(r, 400));
    const modalOpen = await p.evaluate(
      () => !!document.querySelector('.public-modal-overlay.is-visible')
    );
    record('home — clic évènement ouvre la modale', modalOpen);
    const hasDate = await p.evaluate(() => !!document.querySelector('.event-detail__when'));
    record('home — modale affiche la date', hasDate);
    await p.keyboard.press('Escape');
  }
  await p.close();
}

async function testHomeCarousel() {
  const p = await plainPage();
  await p.goto(`${BASE}/public/index.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  const data = await p.evaluate(() => {
    const track = document.querySelector('.carousel-track');
    if (!track) return { hasTrack: false };
    const copy = document.querySelector('.carousel-track__copy');
    const cards = track.querySelectorAll('.t-card').length;
    const copyCards = copy?.querySelectorAll('.t-card').length || 0;
    const hasAnim = getComputedStyle(track).animationName !== 'none';
    return { hasTrack: true, cards, copyCards, hasAnim };
  });
  record('home — carousel .carousel-track présent', data.hasTrack);
  record(
    'home — carousel a des cards',
    data.cards > 0,
    `${data.cards} cards (+ ${data.copyCards} en copie)`
  );
  record('home — carousel a une animation CSS', data.hasAnim);
  await p.close();
}

async function testCalendarClickable() {
  const p = await plainPage();
  await p.goto(`${BASE}/public/views/calendar.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  const liItems = await p.evaluate(
    () => document.querySelectorAll('#event-list .ev.is-clickable').length
  );
  record('calendrier — items liste cliquables', liItems > 0, `${liItems} items`);

  if (liItems > 0) {
    await p.click('#event-list .ev.is-clickable');
    await new Promise((r) => setTimeout(r, 400));
    const modalOpen = await p.evaluate(
      () => !!document.querySelector('.public-modal-overlay.is-visible')
    );
    record('calendrier — clic ouvre modale détail', modalOpen);
    await p.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));
  }

  // Calendar grid cell clickable
  const cellHasEvent = await p.evaluate(
    () => !!document.querySelector('#calendar .calendar-cell.has-event')
  );
  record('calendrier — grille a des cases avec évènement', cellHasEvent);
  await p.close();
}

const backendUp = await hasFunctionsBackend();
if (!backendUp) {
  console.log('\nℹ Backend Netlify Functions indisponible sur ' + BASE + ' — tests admin skippés.');
  console.log(
    '  Pour la suite complète : `npm run dev:api` + relancer avec TEST_BASE=http://localhost:8888'
  );
  skip('profils admin — modale', 'backend absent');
  skip('articles — modale', 'backend absent');
  skip('événements admin — modale', 'backend absent');
  skip('ateliers admin — modale', 'backend absent');
  skip('dashboard — compteurs', 'backend absent');
} else {
  await testProfilesImages();
  await testArticlesModal();
  await testEventsModal();
  await testWorkshopsModal();
  await testDashboardCounts();
}
await testHomeUpcoming();
await testHomeCarousel();
await testCalendarClickable();

await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks OK`);
process.exit(fails > 0 ? 1 : 0);

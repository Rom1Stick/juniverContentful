// Test l'édition réelle (typing) dans l'iframe de l'admin inline editor,
// pour chaque page. On simule un focus + change de texte sur un data-editable
// et on vérifie que le bouton "Enregistrer" se débloque.

import puppeteer from 'puppeteer';

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const PAGES = [
  { path: '/public/index.html', label: 'index' },
  { path: '/public/views/about.html', label: 'about' },
  { path: '/public/views/cycle.html', label: 'cycle' },
  { path: '/public/views/workshop.html', label: 'workshop' },
  { path: '/public/views/calendar.html', label: 'calendar' },
  { path: '/public/views/contact.html', label: 'contact' },
  { path: '/public/views/legal.html', label: 'legal' },
  { path: '/public/views/privacy.html', label: 'privacy' },
  { path: '/public/views/succes.html', label: 'succes' },
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

// Stub admin_token pour ne pas être redirigé.
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('admin_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.fake');
});

await page.goto(`${BASE}/admin/assets/views/admin_inline_editor.html`, {
  waitUntil: 'networkidle2',
  timeout: 15000,
});

// Ouvre le panneau (par défaut fermé)
await page.evaluate(() => {
  document.getElementById('ie-panel-toggle')?.click();
});
await new Promise((r) => setTimeout(r, 300));

const results = [];
for (const { path, label } of PAGES) {
  await page.evaluate((value) => {
    const select = document.getElementById('ie-page');
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, path);
  // Attendre que l'iframe charge et que les items soient détectés
  await new Promise((r) => setTimeout(r, 2500));

  // Dans l'iframe, trouver le premier data-editable et simuler une édition
  const editResult = await page.evaluate(() => {
    const frame = document.getElementById('ie-frame');
    const doc = frame.contentDocument;
    if (!doc) return { err: 'no doc' };
    const el = doc.querySelector('[data-editable]');
    if (!el) return { err: 'no data-editable element' };
    const key = el.getAttribute('data-editable');
    const original = el.textContent;
    // Simule une modification via l'event input (édition typique)
    el.focus();
    el.textContent = original + ' [EDITED]';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { key, original, newText: el.textContent };
  });

  await new Promise((r) => setTimeout(r, 500));

  const adminState = await page.evaluate(() => {
    const saveBtn = document.getElementById('ie-save');
    const itemsCount = document.querySelectorAll('#ie-list .ie-item').length;
    const dirtyCount = document.querySelectorAll('#ie-list .ie-item.dirty').length;
    return {
      saveDisabled: saveBtn.disabled,
      saveText: saveBtn.textContent,
      itemsCount,
      dirtyCount,
    };
  });

  results.push({ page: label, path, editResult, adminState });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

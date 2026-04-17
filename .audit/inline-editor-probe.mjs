// Probe: simule l'admin inline editor et loggue ce que chaque page renvoie
// comme `siteCopy:list`. On charge chaque page en iframe (via about:blank + DOM),
// mais plus simple : on charge la page directement avec ?edit=1 et on
// écoute les postMessage qu'elle enverrait à un parent.

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

const results = [];
for (const path of PAGES) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`console.${msg.type()}: ${msg.text()}`);
    }
  });
  // Inject a hook BEFORE any script runs: override window.parent so we can capture
  // postMessage calls.
  await page.evaluateOnNewDocument(() => {
    window.__captured = [];
    // Fake a parent window to capture messages
    const origPostMessage = window.postMessage.bind(window);
    Object.defineProperty(window, 'parent', {
      get() {
        return {
          postMessage: (msg) => {
            window.__captured.push(msg);
          },
          // identity-ish
        };
      },
      configurable: true,
    });
    window.postMessage = origPostMessage;
  });

  try {
    await page.goto(`${BASE}${path}?edit=1`, { waitUntil: 'networkidle2', timeout: 15000 });
    // Wait for editMode to have a chance to run and post the list
    await new Promise((r) => setTimeout(r, 800));
    const captured = await page.evaluate(() => window.__captured || []);
    const listMsg = captured.find((m) => m && m.type === 'siteCopy:list');
    const editableCount = await page.evaluate(
      () =>
        document.querySelectorAll('[data-editable]').length +
        document.querySelectorAll('img[data-editable-image]').length
    );
    const hasEditDirtyStyle = await page.evaluate(() => {
      // editMode.js injects a <style> tag containing "data-editable" CSS rules
      return Array.from(document.querySelectorAll('style')).some((s) =>
        s.textContent.includes('edit-dirty')
      );
    });
    results.push({
      path,
      editableCount,
      listItems: listMsg ? listMsg.items.length : 0,
      editModeRan: hasEditDirtyStyle,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    results.push({ path, error: err.message, errors: errors.slice(0, 5) });
  }
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

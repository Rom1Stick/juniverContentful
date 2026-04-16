import puppeteer from 'puppeteer';

const PAGES = [
  { url: 'http://localhost:3000/public/index.html', name: 'public/index' },
  { url: 'http://localhost:3000/public/details.html?id=test', name: 'public/details' },
  { url: 'http://localhost:3000/public/views/about.html', name: 'public/about' },
  { url: 'http://localhost:3000/public/views/calendar.html', name: 'public/calendar' },
  { url: 'http://localhost:3000/public/views/workshop.html', name: 'public/workshop' },
  { url: 'http://localhost:3000/public/views/contact.html', name: 'public/contact' },
  { url: 'http://localhost:3000/public/views/legal.html', name: 'public/legal' },
  { url: 'http://localhost:3000/public/views/privacy.html', name: 'public/privacy' },
  { url: 'http://localhost:3000/public/views/succes.html', name: 'public/succes' },
  { url: 'http://localhost:3000/admin/admin.html', name: 'admin/dashboard' },
  { url: 'http://localhost:3000/admin/assets/views/admin_profiles.html', name: 'admin/profiles' },
  { url: 'http://localhost:3000/admin/assets/views/admin_events.html', name: 'admin/events' },
  { url: 'http://localhost:3000/admin/assets/views/admin_articles.html', name: 'admin/articles' },
  { url: 'http://localhost:3000/admin/assets/views/admin_workshops.html', name: 'admin/workshops' },
  {
    url: 'http://localhost:3000/admin/assets/views/admin_inline_editor.html',
    name: 'admin/inline_editor',
  },
];

const VW = 390;
const VH = 844;

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];

for (const { url, name } of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({
    width: VW,
    height: VH,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  if (name.startsWith('admin/')) {
    try {
      await page.goto('http://localhost:3000/admin/admin.html', {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.evaluate(() => {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('sessionExpiry', String(Date.now() + 1800000));
      });
    } catch (e) {
      console.log(`(admin auth seed failed for ${name}: ${e.message})`);
    }
  }
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));
    const data = await page.evaluate((vw) => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const overflow = docW - winW;
      const offenders = [];
      if (overflow > 0) {
        const all = document.querySelectorAll('*');
        const seen = new Set();
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > vw + 1) {
            const tag = el.tagName.toLowerCase();
            const cls = (
              el.className && typeof el.className === 'string'
                ? el.className.split(/\s+/).slice(0, 2).join('.')
                : ''
            ).slice(0, 50);
            const sig = `${tag}.${cls}:${Math.round(r.right)}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            offenders.push({
              tag,
              cls,
              id: el.id || '',
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
            if (offenders.length > 8) break;
          }
        }
      }
      return { docW, winW, overflow, offenders };
    }, VW);
    results.push({ name, status: resp?.status() ?? '?', ...data });
  } catch (err) {
    results.push({ name, error: err.message });
  }
  await page.close();
}

await browser.close();

console.log('\n=== AUDIT MOBILE 390x844 (live) ===\n');
let fails = 0;
for (const r of results) {
  if (r.error) {
    console.log(`❌ ${r.name} — ERROR: ${r.error}`);
    fails++;
    continue;
  }
  if (r.overflow <= 0) {
    console.log(`✅ ${r.name} (${r.status}) — ${r.docW}/${r.winW}px`);
  } else {
    fails++;
    console.log(`❌ ${r.name} (${r.status}) — OVERFLOW +${r.overflow}px`);
    for (const o of r.offenders) {
      const idStr = o.id ? `#${o.id}` : '';
      console.log(`   <${o.tag}${idStr} class="${o.cls}"> right=${o.right} w=${o.width}`);
    }
  }
}
console.log(`\n${results.length - fails}/${results.length} pages OK`);
process.exit(fails > 0 ? 1 : 0);

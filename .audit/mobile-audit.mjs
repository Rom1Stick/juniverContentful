import puppeteer from 'puppeteer';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const files = [
  '.audit/mockups/01-herbier.html',
  '.audit/mockups/02-constellation.html',
  '.audit/mockups/03-praxis.html',
  '.audit/mockups/04-symbiose.html',
  '.audit/mockups/05-atelier.html',
  '.audit/mockups/06-riviere.html',
];

const VW = 390,
  VH = 844;
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

for (const f of files) {
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const url = pathToFileURL(resolve(f)).href;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('warn', f, e.message);
  }
  await new Promise((r) => setTimeout(r, 1500));

  const report = await page.evaluate((VW) => {
    const html = document.documentElement;
    const body = document.body;
    const result = {
      htmlScrollW: html.scrollWidth,
      bodyScrollW: body.scrollWidth,
      viewport: VW,
      overflows: [],
    };
    const all = document.querySelectorAll('*');
    const seen = new Set();
    for (const el of all) {
      const r = el.getBoundingClientRect();
      // ignore absolutely tiny / zero-sized
      if (r.width === 0 || r.height === 0) continue;
      // ignore things outside visible stacking for other reasons? keep all
      if (r.right > VW + 0.5 || r.left < -0.5) {
        // dedupe: keep a signature
        const tag = el.tagName.toLowerCase();
        const cls =
          el.className && typeof el.className === 'string'
            ? el.className.split(/\s+/).slice(0, 2).join('.')
            : '';
        const sig = `${tag}.${cls}:${Math.round(r.left)}→${Math.round(r.right)}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        // skip if parent is already listed and same signature
        result.overflows.push({
          tag,
          cls,
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          id: el.id || '',
        });
        if (result.overflows.length > 40) break;
      }
    }
    return result;
  }, VW);

  console.log(`\n══ ${f} ══`);
  console.log(
    `viewport: ${VW}px · html.scrollWidth: ${report.htmlScrollW}px · body.scrollWidth: ${report.bodyScrollW}px`
  );
  if (report.htmlScrollW > VW) console.log(`⚠ OVERFLOW: +${report.htmlScrollW - VW}px`);
  if (report.overflows.length === 0) {
    console.log('✓ Aucun élément ne dépasse du viewport');
  } else {
    console.log(`${report.overflows.length} éléments dépassent :`);
    for (const o of report.overflows.slice(0, 20)) {
      console.log(
        `  <${o.tag}${o.id ? '#' + o.id : ''}${o.cls ? ' class="' + o.cls + '"' : ''}> left=${o.left} right=${o.right} w=${o.width}`
      );
    }
  }

  await page.close();
}

await browser.close();

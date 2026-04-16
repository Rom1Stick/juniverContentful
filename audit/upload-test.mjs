// Test E2E sécurité + upload.
// 1. Vérifie qu'aucun secret CMA n'est présent dans le JS livré au client.
// 2. Si netlify dev tourne sur :8888 avec des env vars valides : teste login + upload + cleanup.
// Sinon : skip la partie dynamique avec un message explicite.

import { readFile } from 'fs/promises';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const results = [];
function record(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? '  · ' + info : ''}`);
}

// ---------- 1. Static secret scan ----------

const FORBIDDEN = [
  { pattern: /CFPAT-[A-Za-z0-9_-]{10,}/g, label: 'Token CMA Contentful (CFPAT-...)' },
  { pattern: /ADMIN_PASSWORD\s*=\s*['"]/g, label: 'ADMIN_PASSWORD hardcodé' },
  { pattern: /ADMIN_ID\s*=\s*['"][A-Za-z]/g, label: 'ADMIN_ID hardcodé' },
];

function walkDir(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        stack.push(full);
      } else if (/\.(js|mjs|html|json)$/.test(entry)) {
        out.push(full);
      }
    }
  }
  return out;
}

async function scanSecrets() {
  const scopes = ['public', 'admin/assets/js', 'admin/assets/views', 'admin'];
  const violations = [];
  for (const scope of scopes) {
    for (const file of walkDir(scope)) {
      // Skip les sourcemaps et assets styles
      if (file.includes('assets/styles') || file.endsWith('.map')) continue;
      const text = await readFile(file, 'utf8');
      for (const { pattern, label } of FORBIDDEN) {
        const m = text.match(pattern);
        if (m) violations.push(`${file} → ${label} (${m.length} match)`);
      }
    }
  }
  record(
    'Aucun secret CMA/admin hardcodé côté client',
    violations.length === 0,
    violations.length ? `${violations.length} fuite(s)` : 'clean'
  );
  if (violations.length) violations.forEach((v) => console.log('  ' + v));
}

// ---------- 2. Dynamic upload cycle ----------

const API_BASE = process.env.API_BASE || 'http://localhost:8888';
const ADMIN_ID = process.env.TEST_ADMIN_ID;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function dynamicTests() {
  // Probe
  let apiUp = false;
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`);
    apiUp = r.status === 401 || r.status === 200; // 401 attendu sans token
  } catch {
    apiUp = false;
  }
  if (!apiUp) {
    console.log("\nℹ Tests dynamiques skippés : netlify dev n'est pas joignable sur " + API_BASE);
    console.log(
      '  Pour lancer : `npm run dev:api` dans un autre terminal + poser TEST_ADMIN_ID / TEST_ADMIN_PASSWORD'
    );
    return;
  }
  if (!ADMIN_ID || !ADMIN_PASSWORD) {
    console.log('\nℹ Tests dynamiques skippés : TEST_ADMIN_ID / TEST_ADMIN_PASSWORD non définis.');
    return;
  }

  // Login
  const loginResp = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: ADMIN_ID, password: ADMIN_PASSWORD }),
  });
  record('Login admin via /api/auth/login', loginResp.ok, `status ${loginResp.status}`);
  if (!loginResp.ok) return;
  const { token } = await loginResp.json();
  record(
    'Token JWT reçu',
    !!token && token.split('.').length === 3,
    token ? `len=${token.length}` : 'absent'
  );
  if (!token) return;

  // Token invalide → 401
  const badResp = await fetch(`${API_BASE}/api/cma/entries?content_type=article&limit=1`, {
    headers: { 'x-admin-token': 'Bearer invalid.jwt.token' },
  });
  record('Token invalide refusé (401)', badResp.status === 401, `status ${badResp.status}`);

  // Requête CMA légitime
  const listResp = await fetch(`${API_BASE}/api/cma/entries?content_type=article&limit=1`, {
    headers: { 'x-admin-token': `Bearer ${token}` },
  });
  record('Fetch CMA avec token valide', listResp.ok, `status ${listResp.status}`);

  // Upload d'un PNG 1×1
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  const uploadResp = await fetch(`${API_BASE}/api/cma/uploads`, {
    method: 'POST',
    headers: {
      'x-admin-token': `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: pngBytes,
  });
  record('Upload PNG via /api/cma/uploads', uploadResp.ok, `status ${uploadResp.status}`);
  if (uploadResp.ok) {
    const data = await uploadResp.json();
    record('Upload retourne un sys.id', !!data?.sys?.id, data?.sys?.id || 'absent');
  } else {
    const txt = await uploadResp.text();
    console.log('  body:', txt.slice(0, 200));
  }
}

await scanSecrets();
await dynamicTests();

const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks OK`);
process.exit(fails > 0 ? 1 : 0);

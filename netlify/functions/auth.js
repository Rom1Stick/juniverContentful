// Auth admin — login + vérification session.
//
// Routes :
//   POST /api/auth/login → { id, password } → { token, expiresAt } ou 401
//   GET  /api/auth/me    → { valid: true, expiresAt } si x-admin-token valide, 401 sinon
//
// Stockage : pas de session DB. Le JWT signé (JWT_SECRET) est self-contained.
// Le mot de passe est hashé avec bcrypt, stocké dans ADMIN_PASSWORD_HASH.
// Génération du hash : `node scripts/hash-password.js <mdp>` → paste dans .env.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL_MINUTES = parseInt(process.env.JWT_TTL_MINUTES || '30', 10);

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!ADMIN_ID || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    return json(500, {
      error:
        'Configuration serveur incomplète. ADMIN_ID, ADMIN_PASSWORD_HASH et JWT_SECRET doivent être définis.',
    });
  }

  const url = new URL(req.url);
  const sub = url.pathname.split('/').pop();

  if (sub === 'login') return handleLogin(req);
  if (sub === 'me') return handleMe(req);
  return json(404, { error: `Route auth inconnue : ${sub}` });
}

async function handleLogin(req) {
  if (req.method !== 'POST') {
    return json(405, { error: 'POST requis sur /login.' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'JSON invalide.' });
  }
  const id = String(body?.id || '').trim();
  const password = String(body?.password || '');

  // Délai minimum pour blinder les attaques par timing
  const minDelay = new Promise((r) => setTimeout(r, 250));

  let ok = false;
  if (id === ADMIN_ID && password) {
    try {
      ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    } catch (e) {
      console.error('[auth] bcrypt.compare error', e);
      ok = false;
    }
  }

  await minDelay;

  if (!ok) {
    return json(401, { error: 'Identifiant ou mot de passe incorrect.' });
  }

  const expiresIn = JWT_TTL_MINUTES * 60;
  const token = jwt.sign({ sub: 'admin' }, JWT_SECRET, { expiresIn });
  const expiresAt = Date.now() + expiresIn * 1000;
  return json(200, { token, expiresAt });
}

async function handleMe(req) {
  if (req.method !== 'GET') {
    return json(405, { error: 'GET requis sur /me.' });
  }
  const authHeader = req.headers.get('x-admin-token') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return json(401, { error: 'Token absent.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return json(200, {
      valid: true,
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    });
  } catch (e) {
    return json(401, { error: 'Token invalide ou expiré.', detail: e.message });
  }
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-admin-token',
  };
}

export const config = {
  path: ['/api/auth', '/api/auth/*'],
};

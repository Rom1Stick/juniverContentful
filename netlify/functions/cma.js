// Proxy CMA Contentful — cache le CMA_TOKEN côté serveur.
// Routes :
//   /api/cma/uploads                → upload.contentful.com/spaces/:id/uploads (binaire)
//   /api/cma/entries[/:id][...]    → api.contentful.com/spaces/:id/environments/:env/entries/...
//   /api/cma/assets[/:id][...]     → api.contentful.com/spaces/:id/environments/:env/assets/...
//
// Auth : JWT dans header `x-admin-token` (Bearer <jwt>). Vérifié avec JWT_SECRET.
//
// Body binaire pour /uploads (octet-stream), JSON pour le reste.

import jwt from 'jsonwebtoken';

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const CMA_TOKEN = process.env.CONTENTFUL_CMA_TOKEN;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const JWT_SECRET = process.env.JWT_SECRET;

// Headers propagés depuis/vers Contentful (whitelist)
const PROPAGATED_REQUEST_HEADERS = [
  'x-contentful-version',
  'x-contentful-content-type',
  'content-type',
];

export default async function handler(req) {
  // CORS preflight (utile pour netlify dev)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (!SPACE_ID || !CMA_TOKEN || !JWT_SECRET) {
    return json(500, {
      error: 'Configuration serveur incomplète (CONTENTFUL_* ou JWT_SECRET manquants).',
    });
  }

  // Auth : JWT requis
  const authHeader = req.headers.get('x-admin-token') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return json(401, { error: 'Token admin manquant.' });
  }
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return json(401, { error: 'Token admin invalide ou expiré.', detail: e.message });
  }

  // Extraction du sous-chemin après /cma/
  const url = new URL(req.url);
  const match = url.pathname.match(/\/cma\/(.*)$/);
  const sub = match ? match[1] : '';

  try {
    if (sub === 'uploads' || sub.startsWith('uploads/')) {
      return await proxyUpload(req, sub);
    }
    return await proxyManagement(req, sub, url.search);
  } catch (err) {
    console.error('[cma proxy] unhandled error', { sub, method: req.method, err });
    return json(502, {
      error: 'Proxy CMA : erreur inattendue.',
      message: err.message,
      detail: err.message,
    });
  }
}

/**
 * Proxy vers api.contentful.com/spaces/:id/environments/:env/*
 */
async function proxyManagement(req, sub, search) {
  const target = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/${sub}${search || ''}`;
  const forwardHeaders = {
    Authorization: `Bearer ${CMA_TOKEN}`,
  };
  for (const h of PROPAGATED_REQUEST_HEADERS) {
    const v = req.headers.get(h);
    if (v) forwardHeaders[h] = v;
  }

  const init = {
    method: req.method,
    headers: forwardHeaders,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
    const body = await req.text();
    // Ne pas passer body:"" sur PUT/POST vides (ex : /files/:locale/process) —
    // Undici peut throw et certains endpoints Contentful rejettent un Content-Length: 0 inattendu.
    if (body) init.body = body;
  }

  const resp = await fetch(target, init);
  return await forwardResponse(resp);
}

/**
 * Proxy vers upload.contentful.com/spaces/:id/uploads (binaire).
 * Netlify Functions supportent jusqu'à ~5 Mo de body synchrone — le client doit clamp en conséquence.
 */
async function proxyUpload(req, sub) {
  if (req.method !== 'POST') {
    return json(405, { error: 'Méthode non supportée sur /uploads (POST uniquement).' });
  }
  const target = `https://upload.contentful.com/spaces/${SPACE_ID}/${sub}`;

  // Lecture complète du body côté serveur (Buffer avec byteLength connu → Content-Length correct côté Contentful)
  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.byteLength === 0) {
    return json(400, { error: 'Corps de requête vide.' });
  }

  const resp = await fetch(target, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CMA_TOKEN}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buffer.byteLength),
    },
    body: buffer,
  });
  return await forwardResponse(resp);
}

// Statuts "null body" selon le Fetch spec — Undici throw si on passe un body (même "").
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

async function forwardResponse(resp) {
  const isNullBody = NULL_BODY_STATUSES.has(resp.status);
  const body = isNullBody ? null : await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: {
      ...corsHeaders(),
      'content-type': resp.headers.get('content-type') || 'application/json',
    },
  });
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
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers':
      'content-type, x-admin-token, x-contentful-version, x-contentful-content-type',
  };
}

export const config = {
  path: ['/api/cma', '/api/cma/*'],
};

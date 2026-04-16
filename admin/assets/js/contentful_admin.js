// Client CMA côté admin — 100 % backend-gated.
// Tous les appels passent par /api/cma (Netlify Function) qui injecte le token CMA serveur.
// Le JWT admin (x-admin-token) est ajouté automatiquement par cmaFetch().
//
// Aucun secret Contentful dans ce fichier. Aucun hardcode.
// Pour connaître SPACE_ID ou ACCESS_TOKEN (CDA public), importer depuis /public/js/contentful.js.

import { SPACE_ID } from '/public/js/contentful.js';

export { SPACE_ID };

/* ───────────────────────── Helpers ───────────────────────── */

const CMA_PREFIX = '/api/cma';

/**
 * Fetch wrapper — injecte le JWT, pointe vers le proxy CMA.
 * `path` peut être un sous-chemin Contentful ("entries", "entries/:id", "assets/:id") — on préfixe /api/cma.
 * Pour uploads binaires, utiliser `cmaUpload(file)` ci-dessous.
 */
export async function cmaFetch(path, init = {}) {
  const token = typeof window !== 'undefined' && window.getAdminToken ? window.getAdminToken() : '';
  const url = path.startsWith('/') ? path : `${CMA_PREFIX}/${path}`;
  const headers = { ...(init.headers || {}) };
  if (token) headers['x-admin-token'] = `Bearer ${token}`;
  if (init.body && !headers['Content-Type'] && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/vnd.contentful.management.v1+json';
  }
  const resp = await fetch(url, { ...init, headers });
  if (resp.status === 401) {
    // Token expiré/invalide — purge session et relance le login.
    if (typeof window !== 'undefined' && window.clearAdminSession) {
      window.clearAdminSession();
    }
    throw new Error('Session expirée — reconnexion nécessaire.');
  }
  return resp;
}

async function cmaJson(path, init) {
  const resp = await cmaFetch(path, init);
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`CMA ${init?.method || 'GET'} ${path} : ${resp.status} ${detail}`);
  }
  return resp.json();
}

async function safeErrorDetail(resp) {
  try {
    const j = await resp.json();
    return j?.message || j?.error || j?.sys?.id || '';
  } catch {
    return '';
  }
}

/* ─────────────────────── Assets / Upload ─────────────────────── */

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_MIME = ['application/pdf'];
const ALLOWED_ASSET_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_DOC_MIME];
// Limite stricte : Netlify Functions classiques ont un cap sync ~5 Mo body
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ASSET_POLL_INTERVAL_MS = 1500;
const ASSET_POLL_MAX_TRIES = 20;

/**
 * Upload d'un fichier (image ou PDF) via le proxy.
 * Retourne { id, url, contentType, fileName }.
 */
export async function uploadAsset(file) {
  validateAssetFile(file);
  const uploadId = await stepUploadRaw(file);
  const created = await stepCreateAsset(file, uploadId);
  await stepTriggerProcess(created.sys.id);
  const ready = await stepWaitForAsset(created.sys.id);
  const published = await stepPublishAsset(ready);
  const fileField = published.fields?.file?.['en-US'];
  const url = fileField?.url ? `https:${fileField.url}` : '';
  return {
    id: published.sys.id,
    url,
    contentType: fileField?.contentType || file.type,
    fileName: fileField?.fileName || file.name,
  };
}

export function isImageMime(mime) {
  return ALLOWED_IMAGE_MIME.includes(mime);
}

export async function publishAsset(assetOrId) {
  const asset = typeof assetOrId === 'string' ? await fetchAssetFresh(assetOrId) : assetOrId;
  return stepPublishAsset(asset);
}

function validateAssetFile(file) {
  if (!file) throw new Error('Aucun fichier sélectionné.');
  if (!ALLOWED_ASSET_MIME.includes(file.type)) {
    throw new Error(
      `Format non supporté (${file.type || 'inconnu'}). Utilisez JPEG, PNG, GIF, WebP ou PDF.`
    );
  }
  if (file.size === 0) throw new Error('Le fichier est vide.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo) — 5 Mo max ` +
        `(limite Netlify Functions).`
    );
  }
}

async function stepUploadRaw(file) {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error('Fichier vide (0 octet).');
  const resp = await cmaFetch(`${CMA_PREFIX}/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Blob([buffer], { type: 'application/octet-stream' }),
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Upload (étape 1/4 — envoi brut) : ${resp.status} ${detail}`);
  }
  const data = await resp.json();
  return data.sys.id;
}

async function stepCreateAsset(file, uploadId) {
  const data = await cmaJson('assets', {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        title: { 'en-US': file.name || 'asset' },
        file: {
          'en-US': {
            contentType: file.type,
            fileName: file.name || 'asset',
            uploadFrom: { sys: { type: 'Link', linkType: 'Upload', id: uploadId } },
          },
        },
      },
    }),
  }).catch((e) => {
    throw new Error(`Upload (étape 2/4 — création asset) : ${e.message}`);
  });
  return data;
}

async function stepTriggerProcess(assetId) {
  const resp = await cmaFetch(`assets/${assetId}/files/en-US/process`, { method: 'PUT' });
  if (!resp.ok && resp.status !== 204) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Upload (étape 3/4 — traitement) : ${resp.status} ${detail}`);
  }
}

async function stepWaitForAsset(assetId) {
  for (let i = 0; i < ASSET_POLL_MAX_TRIES; i += 1) {
    const asset = await fetchAssetFresh(assetId);
    const fileField = asset.fields?.file?.['en-US'];
    if (fileField?.url) return asset;
    await sleep(ASSET_POLL_INTERVAL_MS);
  }
  throw new Error(
    `Upload (étape 4/4 — traitement Contentful trop long) après ${
      (ASSET_POLL_MAX_TRIES * ASSET_POLL_INTERVAL_MS) / 1000
    } s.`
  );
}

async function stepPublishAsset(asset) {
  const resp = await cmaFetch(`assets/${asset.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(asset.sys.version) },
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Publication asset : ${resp.status} ${detail}`);
  }
  return resp.json();
}

async function fetchAssetFresh(assetId) {
  return cmaJson(`assets/${assetId}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ─────────────────────── Profiles ─────────────────────── */

export async function fetchAdminProfiles() {
  const data = await cmaJson('entries?content_type=profile&limit=200');

  // La CMA ne supporte pas include=N → on fetch les assets en lot.
  const assetIds = Array.from(
    new Set(data.items.map((it) => it.fields.image?.['en-US']?.sys?.id).filter(Boolean))
  );
  const assetMap = new Map();
  if (assetIds.length) {
    try {
      const aData = await cmaJson(
        `assets?sys.id[in]=${assetIds.join(',')}&limit=${assetIds.length}`
      );
      (aData.items || []).forEach((a) => {
        const fileField = a.fields?.file?.['en-US'] || a.fields?.file;
        if (fileField?.url) assetMap.set(a.sys.id, `https:${fileField.url}`);
      });
    } catch (e) {
      console.warn('[profiles] asset lookup failed', e);
    }
  }

  return data.items.map((item) => {
    const imageRef = item.fields.image?.['en-US']?.sys?.id || null;
    const imageUrl =
      (imageRef && assetMap.get(imageRef)) || '/admin/assets/views/images/default-profile.jpg';

    const diplomasRaw = item.fields.diplomas?.['en-US'];
    const diplomas = Array.isArray(diplomasRaw)
      ? diplomasRaw
      : typeof diplomasRaw === 'string' && diplomasRaw.trim()
        ? diplomasRaw
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : [];

    return {
      id: item.sys.id,
      name: item.fields.name?.['en-US'] || 'Nom non spécifié',
      job: item.fields.job?.['en-US'] || 'Métier non spécifié',
      email: item.fields.email?.['en-US'] || 'Email non spécifié',
      phone: String(item.fields.phone?.['en-US'] ?? 'Non spécifié'),
      website: item.fields.website?.['en-US'] || 'Non spécifié',
      description: item.fields.description?.['en-US'] || '',
      diplomas,
      imageUrl,
      imageId: imageRef,
    };
  });
}

export async function createAdminProfile(profileData) {
  const data = {
    fields: {
      name: { 'en-US': profileData.name },
      job: { 'en-US': profileData.job },
      email: { 'en-US': profileData.email },
      phone: { 'en-US': parseInt(profileData.phone, 10) || 0 },
      website: { 'en-US': profileData.website || '' },
      description: { 'en-US': profileData.description || '' },
      diplomas: {
        'en-US': Array.isArray(profileData.diplomas)
          ? profileData.diplomas.join(', ')
          : profileData.diplomas || '',
      },
    },
  };
  if (profileData.imageId) {
    data.fields.image = {
      'en-US': { sys: { type: 'Link', linkType: 'Asset', id: profileData.imageId } },
    };
  }
  const created = await cmaJson('entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'profile' },
    body: JSON.stringify(data),
  });
  await publishAdminProfile(created.sys.id);
  return created;
}

export async function publishAdminProfile(profileId) {
  const entry = await cmaJson(`entries/${profileId}`);
  const resp = await cmaFetch(`entries/${profileId}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Publication profil : ${resp.status} ${detail}`);
  }
}

export async function deleteAdminProfile(profileId) {
  const entry = await cmaJson(`entries/${profileId}`);
  if (entry.sys.publishedVersion !== undefined) {
    const unpub = await cmaFetch(`entries/${profileId}/published`, { method: 'DELETE' });
    if (!unpub.ok) throw new Error(`Dépublication profil : ${unpub.status}`);
  }
  const del = await cmaFetch(`entries/${profileId}`, { method: 'DELETE' });
  if (!del.ok) throw new Error(`Suppression profil : ${del.status}`);
}

export async function updateAdminProfile(profileId, profileData) {
  const entry = await cmaJson(`entries/${profileId}`);
  const updateData = {
    fields: {
      name: { 'en-US': profileData.name },
      job: { 'en-US': profileData.job },
      email: { 'en-US': profileData.email },
      phone: { 'en-US': parseInt(profileData.phone, 10) || 0 },
      website: { 'en-US': profileData.website },
      diplomas: {
        'en-US': Array.isArray(profileData.diplomas)
          ? profileData.diplomas.join(', ')
          : profileData.diplomas || '',
      },
      description: { 'en-US': profileData.description || '' },
    },
  };
  if (profileData.imageId) {
    updateData.fields.image = {
      'en-US': { sys: { type: 'Link', linkType: 'Asset', id: profileData.imageId } },
    };
  }
  const resp = await cmaFetch(`entries/${profileId}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
    body: JSON.stringify(updateData),
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Maj profil : ${resp.status} ${detail}`);
  }
  await publishAdminProfile(profileId);
  return resp.json();
}

/* ─────────────────────── Articles ─────────────────────── */

export async function createArticle({ title, summary, content, imageFile }) {
  const data = {
    fields: {
      title: { 'en-US': title },
      summary: { 'en-US': summary },
      content: { 'en-US': content },
    },
  };
  if (imageFile) {
    const { id } = await uploadAsset(imageFile);
    data.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  }
  const created = await cmaJson('entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'article' },
    body: JSON.stringify(data),
  });
  await publishEntry(created.sys.id);
  return created;
}

export async function updateArticle(articleId, updatedData) {
  const entry = await cmaJson(`entries/${articleId}`);
  const data = {
    fields: {
      title: { 'en-US': updatedData.title },
      summary: { 'en-US': updatedData.summary },
      content: { 'en-US': updatedData.content },
    },
  };
  // Préserve image existante si aucune nouvelle n'est fournie
  if (updatedData.imageFile) {
    const { id } = await uploadAsset(updatedData.imageFile);
    data.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  } else if (entry.fields.image) {
    data.fields.image = entry.fields.image;
  }
  const resp = await cmaFetch(`entries/${articleId}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Maj article : ${resp.status} ${detail}`);
  }
  await publishEntry(articleId);
  return resp.json();
}

export async function deleteArticle(articleId) {
  const resp = await cmaFetch(`entries/${articleId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Suppression article : ${resp.status}`);
  return true;
}

export async function unpublishArticle(articleId) {
  const resp = await cmaFetch(`entries/${articleId}/published`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Dépublication article : ${resp.status}`);
}

// Helper partagé — publie n'importe quelle entry
async function publishEntry(entryId) {
  const entry = await cmaJson(`entries/${entryId}`);
  const resp = await cmaFetch(`entries/${entryId}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Publication entrée : ${resp.status} ${detail}`);
  }
}

/* ─────────────────────── Events ─────────────────────── */

export async function fetchEventsAdmin() {
  const data = await cmaJson('entries?content_type=event&limit=200');
  // Enrichir l'image si présente (préservation upload-preserver)
  const assetIds = Array.from(
    new Set(data.items.map((it) => it.fields.image?.['en-US']?.sys?.id).filter(Boolean))
  );
  if (assetIds.length) {
    try {
      const aData = await cmaJson(
        `assets?sys.id[in]=${assetIds.join(',')}&limit=${assetIds.length}`
      );
      const assetMap = new Map();
      (aData.items || []).forEach((a) => {
        const fileField = a.fields?.file?.['en-US'] || a.fields?.file;
        if (fileField?.url) assetMap.set(a.sys.id, `https:${fileField.url}`);
      });
      data.items.forEach((it) => {
        const id = it.fields.image?.['en-US']?.sys?.id;
        if (id) it._imageUrl = assetMap.get(id) || null;
      });
    } catch (e) {
      console.warn('[events] asset lookup failed', e);
    }
  }
  return data.items;
}

export async function createEvent({ title, date, location, description, imageFile }) {
  const data = {
    fields: {
      title: { 'en-US': title },
      date: { 'en-US': date },
      location: { 'en-US': location },
      description: { 'en-US': description },
    },
  };
  if (imageFile) {
    const { id } = await uploadAsset(imageFile);
    data.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  }
  const created = await cmaJson('entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'event' },
    body: JSON.stringify(data),
  });
  await publishEntry(created.sys.id);
  return created;
}

export async function updateEvent(eventId, updatedData) {
  const entry = await cmaJson(`entries/${eventId}`);
  const data = {
    fields: {
      title: { 'en-US': updatedData.title },
      date: { 'en-US': updatedData.date },
      location: { 'en-US': updatedData.location },
      description: { 'en-US': updatedData.description },
    },
  };
  if (updatedData.imageFile) {
    const { id } = await uploadAsset(updatedData.imageFile);
    data.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  } else if (entry.fields.image) {
    data.fields.image = entry.fields.image;
  }
  const resp = await cmaFetch(`entries/${eventId}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Maj évènement : ${resp.status} ${detail}`);
  }
  await publishEntry(eventId);
}

export async function deleteEvent(eventId) {
  const resp = await cmaFetch(`entries/${eventId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Suppression évènement : ${resp.status}`);
  return true;
}

export async function unpublishEvent(eventId) {
  const resp = await cmaFetch(`entries/${eventId}/published`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Dépublication évènement : ${resp.status}`);
}

/* ─────────────────────── Workshops ─────────────────────── */

export async function fetchWorkshopsAdmin() {
  const data = await cmaJson('entries?content_type=workshop&limit=200');
  const assetIds = Array.from(
    new Set(data.items.map((it) => it.fields.image?.['en-US']?.sys?.id).filter(Boolean))
  );
  const assetMap = new Map();
  if (assetIds.length) {
    try {
      const aData = await cmaJson(
        `assets?sys.id[in]=${assetIds.join(',')}&limit=${assetIds.length}`
      );
      (aData.items || []).forEach((a) => {
        const fileField = a.fields?.file?.['en-US'] || a.fields?.file;
        if (fileField?.url) assetMap.set(a.sys.id, `https:${fileField.url}`);
      });
    } catch (e) {
      console.warn('[workshops] asset lookup failed', e);
    }
  }
  return data.items.map((item) => {
    const imageRef = item.fields.image?.['en-US']?.sys?.id || null;
    const imageUrl = (imageRef && assetMap.get(imageRef)) || null;
    return {
      id: item.sys.id,
      title: item.fields.title?.['en-US'] || 'Sans titre',
      description: item.fields.description?.['en-US'] || '',
      recurrence: item.fields.recurrence?.['en-US'] || 'Non spécifiée',
      profiles: item.fields.profiles?.['en-US']?.map((p) => p.sys.id) || [],
      imageUrl,
      imageId: imageRef,
      version: item.sys.version,
    };
  });
}

export async function createWorkshop(workshopData) {
  const recurrenceValue = Array.isArray(workshopData.recurrence)
    ? workshopData.recurrence
    : [workshopData.recurrence];
  const payload = {
    fields: {
      title: { 'en-US': workshopData.title },
      description: { 'en-US': workshopData.description },
      recurrence: { 'en-US': recurrenceValue },
      profiles: {
        'en-US': (workshopData.profiles || []).map((id) => ({
          sys: { type: 'Link', linkType: 'Entry', id },
        })),
      },
    },
  };
  if (workshopData.imageFile) {
    const { id } = await uploadAsset(workshopData.imageFile);
    payload.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  }
  const created = await cmaJson('entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'workshop' },
    body: JSON.stringify(payload),
  });
  await publishEntry(created.sys.id);
  return created;
}

export async function updateWorkshop(workshopId, workshopData) {
  const entry = await cmaJson(`entries/${workshopId}`);
  const recurrenceValue = Array.isArray(workshopData.recurrence)
    ? workshopData.recurrence
    : [workshopData.recurrence];
  const data = {
    fields: {
      title: { 'en-US': workshopData.title },
      description: { 'en-US': workshopData.description },
      recurrence: { 'en-US': recurrenceValue },
      profiles: {
        'en-US': (workshopData.profiles || []).map((id) => ({
          sys: { type: 'Link', linkType: 'Entry', id },
        })),
      },
    },
  };
  if (workshopData.imageFile) {
    const { id } = await uploadAsset(workshopData.imageFile);
    data.fields.image = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id } } };
  } else if (entry.fields.image) {
    data.fields.image = entry.fields.image;
  }
  const resp = await cmaFetch(`entries/${workshopId}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const detail = await safeErrorDetail(resp);
    throw new Error(`Maj atelier : ${resp.status} ${detail}`);
  }
  await publishEntry(workshopId);
  return resp.json();
}

export async function deleteWorkshop(workshopId) {
  // Tente dépublication (ignore l'échec si pas publié)
  await cmaFetch(`entries/${workshopId}/published`, { method: 'DELETE' }).catch(() => {});
  const resp = await cmaFetch(`entries/${workshopId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Suppression atelier : ${resp.status}`);
  return true;
}

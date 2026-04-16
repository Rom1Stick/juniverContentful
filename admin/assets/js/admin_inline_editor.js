import { uploadAsset, cmaFetch } from './contentful_admin.js';

const CONTENT_TYPE_ID = 'siteCopy';

const frame = document.getElementById('ie-frame');
const pageSelect = document.getElementById('ie-page');
const reloadBtn = document.getElementById('ie-reload');
const saveBtn = document.getElementById('ie-save');
const list = document.getElementById('ie-list');
const countEl = document.getElementById('ie-count');
const statusEl = document.getElementById('ie-status');
const layout = document.querySelector('.ie-layout');
const panel = document.getElementById('ie-panel');
const panelToggle = document.getElementById('ie-panel-toggle');
const viewDesktopBtn = document.getElementById('ie-view-desktop');
const viewMobileBtn = document.getElementById('ie-view-mobile');

// État courant : map { key: { value, original, entryId?, version? } }
const state = new Map();
let detected = [];

pageSelect.addEventListener('change', () => {
  frame.src = `${pageSelect.value}?edit=1`;
  clearState();
});

reloadBtn.addEventListener('click', () => {
  frame.src = `${pageSelect.value}?edit=1`;
  clearState();
});

saveBtn.addEventListener('click', () => {
  save().catch((e) => setStatus(`Erreur : ${e.message}`, 'error'));
});

/* Toggle panneau latéral */
panelToggle.addEventListener('click', () => {
  const opening = layout.dataset.panel !== 'open';
  layout.dataset.panel = opening ? 'open' : 'closed';
  panelToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
  panel.setAttribute('aria-hidden', opening ? 'false' : 'true');
});

/* Switcher desktop / mobile */
function setViewport(mode) {
  layout.dataset.viewport = mode;
  viewDesktopBtn.classList.toggle('active', mode === 'desktop');
  viewMobileBtn.classList.toggle('active', mode === 'mobile');
  viewDesktopBtn.setAttribute('aria-pressed', mode === 'desktop' ? 'true' : 'false');
  viewMobileBtn.setAttribute('aria-pressed', mode === 'mobile' ? 'true' : 'false');
}

viewDesktopBtn.addEventListener('click', () => setViewport('desktop'));
viewMobileBtn.addEventListener('click', () => setViewport('mobile'));

window.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.type === 'siteCopy:list') {
    detected = msg.items || [];
    const changed = hydrateFromFrame(detected);
    if (changed) render();
    else refreshSaveBtn();
  }
  if (msg.type === 'siteCopy:change') {
    let entry = state.get(msg.key);
    if (!entry) {
      // Cas défensif : l'iframe a émis un changement pour une clé qu'on n'avait pas
      // encore enregistrée (race au chargement, ou élément injecté tardivement).
      // On crée l'entrée avec original vide pour marquer dirty et déverrouiller "Enregistrer".
      entry = { value: msg.value, original: '', kind: 'text' };
      state.set(msg.key, entry);
      render();
    } else {
      entry.value = msg.value;
      updateDirtyFlag(msg.key);
      refreshItem(msg.key);
    }
    refreshSaveBtn();
  }
  if (msg.type === 'siteCopy:focus') {
    markFocused(msg.key);
  }
  if (msg.type === 'siteCopy:pick-image') {
    triggerImagePick(msg.key);
  }
});

// Input file caché partagé pour le upload d'images depuis l'iframe ou depuis le panneau.
const imagePickInput = document.createElement('input');
imagePickInput.type = 'file';
imagePickInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
imagePickInput.style.display = 'none';
document.body.appendChild(imagePickInput);
let imagePickKey = null;

function triggerImagePick(key) {
  imagePickKey = key;
  imagePickInput.click();
}

imagePickInput.addEventListener('change', async () => {
  const file = imagePickInput.files?.[0];
  const key = imagePickKey;
  imagePickInput.value = '';
  imagePickKey = null;
  if (!file || !key) return;

  // Aperçu immédiat (objet URL temporaire) pendant l'upload
  const tempUrl = URL.createObjectURL(file);
  const entryBefore = state.get(key);
  if (entryBefore) {
    entryBefore.kind = 'image';
    entryBefore.value = tempUrl;
    refreshItem(key);
  } else {
    state.set(key, { value: tempUrl, original: '', kind: 'image' });
    render();
  }
  // Marque l'item comme "en cours d'upload"
  const item = list.querySelector(`.ie-item[data-key="${cssEscapeAttr(key)}"]`);
  item?.classList.add('is-uploading');

  setStatus(`Envoi de l'image pour "${key}"…`);
  try {
    const { url } = await uploadAsset(file);
    URL.revokeObjectURL(tempUrl);
    const entry = state.get(key);
    if (entry) {
      entry.value = url;
      entry.kind = 'image';
      updateDirtyFlag(key);
      refreshItem(key);
      refreshSaveBtn();
    }
    syncToFrame(key, url);
    setStatus(`Image prête pour "${key}". Cliquez "Enregistrer" pour publier.`, 'success');
  } catch (err) {
    URL.revokeObjectURL(tempUrl);
    console.error('[siteCopy] image upload failed', err);
    // Reset à l'ancienne valeur si on en avait une
    if (entryBefore) {
      entryBefore.value = entryBefore.original || '';
      refreshItem(key);
    }
    setStatus(`Échec de l'upload : ${err.message || err}`, 'error');
  } finally {
    item?.classList.remove('is-uploading');
  }
});

function clearState() {
  state.clear();
  list.innerHTML = '';
  countEl.textContent = '0';
  setStatus('');
  refreshSaveBtn();
}

function hydrateFromFrame(items) {
  // Retourne true si l'ensemble des clés a changé (ajout/suppression) — sinon inutile
  // de re-rendre le panneau et on évite de perdre le focus/scroll du textarea actif.
  // On préserve IN PLACE les objets state existants (pas de nouvelle référence)
  // pour que les closures des textareas du panneau pointent toujours sur le bon entry.
  const incomingKeys = new Set();
  let keysChanged = false;

  items.forEach(({ key, value, kind = 'text' }) => {
    incomingKeys.add(key);
    const existing = state.get(key);
    if (existing) {
      // Met à jour le kind si nécessaire, garde value/original intacts.
      if (existing.kind !== kind) existing.kind = kind;
    } else {
      state.set(key, { value, original: value, kind });
      keysChanged = true;
    }
  });

  // Supprimer les clés qui ne sont plus dans la page — en conservant celles dirty
  // (l'utilisateur a peut-être édité puis le DOM s'est remanié, on ne perd pas son travail).
  for (const key of Array.from(state.keys())) {
    if (!incomingKeys.has(key)) {
      const entry = state.get(key);
      if (entry && entry.value === entry.original) {
        state.delete(key);
        keysChanged = true;
      }
    }
  }
  return keysChanged;
}

function render() {
  list.innerHTML = '';
  countEl.textContent = String(state.size);
  state.forEach((entry, key) => {
    const item = document.createElement('div');
    item.className = `ie-item ie-item--${entry.kind || 'text'}`;
    item.dataset.key = key;
    if (entry.kind === 'image') {
      item.innerHTML = `
        <label>${key}</label>
        <div class="ie-image-field">
          ${entry.value ? `<img src="${entry.value}" alt="" class="ie-image-preview">` : '<div class="ie-image-empty">Aucune image</div>'}
          <button type="button" class="ie-btn ghost ie-image-change" data-key="${key}">
            <i class="fas fa-image"></i> Changer l'image
          </button>
        </div>
      `;
      item.querySelector('.ie-image-change').addEventListener('click', () => triggerImagePick(key));
    } else {
      item.innerHTML = `
        <label for="ie-field-${cssEscape(key)}">${key}</label>
        <textarea id="ie-field-${cssEscape(key)}" rows="2"></textarea>
      `;
      const ta = item.querySelector('textarea');
      ta.value = entry.value;
      ta.addEventListener('focus', () => {
        markFocused(key);
      });
      ta.addEventListener('input', () => {
        entry.value = ta.value;
        updateDirtyFlag(key);
        syncToFrame(key, ta.value);
        refreshSaveBtn();
      });
    }
    list.appendChild(item);
    updateDirtyFlag(key);
  });
  refreshSaveBtn();
}

function refreshItem(key) {
  const item = list.querySelector(`.ie-item[data-key="${cssEscapeAttr(key)}"]`);
  if (!item) return;
  const entry = state.get(key);
  if (!entry) return;
  if (entry.kind === 'image') {
    const preview = item.querySelector('.ie-image-preview');
    const empty = item.querySelector('.ie-image-empty');
    if (preview) {
      if (entry.value) preview.src = entry.value;
      else preview.remove();
    } else if (empty && entry.value) {
      const img = document.createElement('img');
      img.src = entry.value;
      img.alt = '';
      img.className = 'ie-image-preview';
      empty.replaceWith(img);
    }
  } else {
    const ta = item.querySelector('textarea');
    if (ta && ta.value !== entry.value) ta.value = entry.value;
  }
}

function updateDirtyFlag(key) {
  const item = list.querySelector(`.ie-item[data-key="${cssEscapeAttr(key)}"]`);
  const entry = state.get(key);
  if (!item || !entry) return;
  const dirty = entry.value !== entry.original;
  item.classList.toggle('dirty', dirty);
}

function markFocused(key) {
  list.querySelectorAll('.ie-item').forEach((i) => i.classList.remove('focused'));
  const item = list.querySelector(`.ie-item[data-key="${cssEscapeAttr(key)}"]`);
  if (item) {
    item.classList.add('focused');
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function syncToFrame(key, value) {
  frame.contentWindow?.postMessage({ type: 'siteCopy:apply', map: { [key]: value } }, '*');
}

function refreshSaveBtn() {
  let dirtyCount = 0;
  state.forEach((entry) => {
    if (entry.value !== entry.original) dirtyCount += 1;
  });
  saveBtn.disabled = dirtyCount === 0;
  saveBtn.textContent = dirtyCount
    ? `Enregistrer (${dirtyCount})`
    : 'Enregistrer les modifications';
}

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className = `ie-status ${kind}`.trim();
}

async function save() {
  setStatus('Sauvegarde en cours…');
  const dirty = [];
  state.forEach((entry, key) => {
    if (entry.value !== entry.original) dirty.push({ key, value: entry.value });
  });
  if (!dirty.length) return;

  // On essaie de récupérer les entrées existantes pour les mettre à jour.
  const existing = await fetchExistingEntries();
  if (!existing) {
    setStatus(
      'Impossible de lister le content type `siteCopy`. Créez-le dans Contentful (champs : key [texte], value [texte long]).',
      'error'
    );
    return;
  }

  const byKey = new Map();
  existing.forEach((e) => {
    const k = e.fields?.key?.['en-US'];
    if (k) byKey.set(k, e);
  });

  let okCount = 0;
  for (const { key, value } of dirty) {
    try {
      if (byKey.has(key)) {
        const entry = byKey.get(key);
        await updateEntry(entry.sys.id, entry.sys.version, key, value);
      } else {
        await createEntry(key, value);
      }
      const stateEntry = state.get(key);
      if (stateEntry) stateEntry.original = value;
      updateDirtyFlag(key);
      okCount += 1;
    } catch (err) {
      console.error('[siteCopy] save failed for', key, err);
    }
  }
  refreshSaveBtn();
  if (okCount === dirty.length) {
    setStatus(`${okCount} modification(s) publiée(s).`, 'success');
  } else {
    setStatus(
      `${okCount} / ${dirty.length} modification(s) publiée(s). Vérifiez la console.`,
      'error'
    );
  }
}

async function fetchExistingEntries() {
  try {
    const resp = await cmaFetch(`entries?content_type=${CONTENT_TYPE_ID}&limit=1000`);
    if (resp.status === 404 || resp.status === 400) return null;
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.items || [];
  } catch (e) {
    console.error('[siteCopy] fetchExisting', e);
    return null;
  }
}

async function readContentfulError(resp) {
  try {
    const data = await resp.json();
    const msg = data?.message || data?.sys?.id || '';
    const details = data?.details?.errors
      ? data.details.errors
          .map((e) => `${e.path?.join('.') || '?'}: ${e.details || e.name}`)
          .join(' | ')
      : '';
    return [msg, details].filter(Boolean).join(' — ');
  } catch {
    return '';
  }
}

async function createEntry(key, value) {
  const resp = await cmaFetch('entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': CONTENT_TYPE_ID },
    body: JSON.stringify({
      fields: { key: { 'en-US': key }, value: { 'en-US': value } },
    }),
  });
  if (!resp.ok) {
    const detail = await readContentfulError(resp);
    throw new Error(`Create ${resp.status} — ${detail || 'réponse vide'}`);
  }
  const created = await resp.json();
  await publish(created.sys.id, created.sys.version);
}

async function updateEntry(id, version, key, value) {
  const resp = await cmaFetch(`entries/${id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(version) },
    body: JSON.stringify({
      fields: { key: { 'en-US': key }, value: { 'en-US': value } },
    }),
  });
  if (!resp.ok) {
    const detail = await readContentfulError(resp);
    throw new Error(`Update ${resp.status} — ${detail || 'réponse vide'}`);
  }
  const updated = await resp.json();
  await publish(updated.sys.id, updated.sys.version);
}

async function publish(id, version) {
  const resp = await cmaFetch(`entries/${id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(version) },
  });
  if (!resp.ok) {
    const detail = await readContentfulError(resp);
    throw new Error(`Publish ${resp.status} — ${detail || 'réponse vide'}`);
  }
}

function cssEscape(s) {
  return s.replace(/[^\w-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
}
function cssEscapeAttr(s) {
  return s.replace(/"/g, '\\"');
}

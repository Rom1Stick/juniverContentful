import { fetchContent } from './contentful.js';

// Récupère les entrées Contentful de type `siteCopy` (champs attendus : key, value)
// et remplace le textContent des éléments [data-editable="<key>"] du DOM.
// Si le type n'existe pas encore côté Contentful (404), on garde le fallback HTML.
//
// Un MutationObserver applique les overrides aussi aux éléments injectés tardivement
// (présentation, articles, profils, ateliers…).

let cache = null;
let observer = null;

export async function fetchSiteCopy() {
  if (cache) return cache;
  try {
    const items = await fetchContent('siteCopy');
    const map = {};
    items.forEach((item) => {
      const k = item?.fields?.key;
      const v = item?.fields?.value;
      if (k && typeof v === 'string') map[k] = v;
    });
    cache = map;
    return map;
  } catch (e) {
    console.warn('[siteCopy] non disponible, fallback sur texte HTML', e);
    cache = {};
    return cache;
  }
}

export function applySiteCopy(map, root = document) {
  if (!map || !Object.keys(map).length) return;
  // Textes éditables
  root.querySelectorAll('[data-editable]').forEach((el) => {
    const key = el.getAttribute('data-editable');
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      if (el.textContent !== map[key]) el.textContent = map[key];
    }
  });
  // Images éditables — on attend une URL (https:// ou /) dans la valeur siteCopy
  root.querySelectorAll('img[data-editable-image]').forEach((img) => {
    const key = img.getAttribute('data-editable-image');
    if (!key) return;
    const value = map[key];
    if (value && /^(https?:\/\/|\/)/.test(value) && img.src !== value) {
      img.src = value;
    }
  });
}

function watchForLateElements() {
  if (observer || !cache) return;
  observer = new MutationObserver((mutations) => {
    if (!cache || !Object.keys(cache).length) return;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('[data-editable], img[data-editable-image]')) {
          applySiteCopy(cache, node.parentNode || document);
        }
        if (node.querySelectorAll) applySiteCopy(cache, node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function runSiteCopy() {
  const map = await fetchSiteCopy();
  applySiteCopy(map);
  watchForLateElements();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    queueMicrotask(runSiteCopy);
  });
} else {
  queueMicrotask(runSiteCopy);
}

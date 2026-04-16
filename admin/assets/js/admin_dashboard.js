// Charge les volumes de chaque content type et les affiche sous chaque tuile.
// Utilise la Delivery API (lecture seule, pas besoin de CMA token).
import { SPACE_ID, ACCESS_TOKEN } from '/public/js/contentful.js';

const COUNTS = [
  {
    type: 'profile',
    selector: '[data-count="profiles"]',
    singular: 'thérapeute',
    plural: 'thérapeutes',
    emptyHint: 'aucun profil — à créer',
  },
  {
    type: 'event',
    selector: '[data-count="events"]',
    singular: 'évènement',
    plural: 'évènements',
    emptyHint: 'aucun évènement — à programmer',
  },
  {
    type: 'article',
    selector: '[data-count="articles"]',
    singular: 'article',
    plural: 'articles',
    emptyHint: 'aucun article — à rédiger',
  },
  {
    type: 'workshop',
    selector: '[data-count="workshops"]',
    singular: 'atelier',
    plural: 'ateliers',
    emptyHint: 'aucun atelier — à créer',
  },
  {
    type: 'cycleDate',
    selector: '[data-count="cycle"]',
    singular: 'étape programmée',
    plural: 'étapes programmées',
    emptyHint: 'aucune étape — à créer',
  },
  {
    type: 'siteCopy',
    selector: '[data-count="copy"]',
    singular: 'texte enregistré',
    plural: 'textes enregistrés',
    emptyHint: 'aucun texte sauvegardé',
  },
];

async function fetchCount(type) {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=${type}&limit=1&select=sys.id`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.total === 'number' ? j.total : null;
  } catch {
    return null;
  }
}

function setLabel(target, total, def) {
  if (total === null) {
    target.textContent = '—';
    return;
  }
  if (total === 0) {
    target.textContent = def.emptyHint;
    target.classList.add('is-empty');
    return;
  }
  const word = total === 1 ? def.singular : def.plural;
  target.textContent = `${total} ${word}`;
}

async function init() {
  await Promise.all(
    COUNTS.map(async (def) => {
      const target = document.querySelector(def.selector);
      if (!target) return;
      const total = await fetchCount(def.type);
      setLabel(target, total, def);
    })
  );
}

if (document.body.classList.contains('authenticated')) {
  init();
} else {
  document.addEventListener('admin:authenticated', init, { once: true });
}

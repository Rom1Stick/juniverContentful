import '../chrome.js';
import '../mycel.js';
import '../siteCopy.js';
import { fetchContent, fetchProfilesWithAssets } from '../contentful.js';
import { openPublicModal } from '../publicModal.js';
import { sanitizeRichHTML, escapeText } from '../contentSanitize.js';

const PREVIEW_CHARS = 140;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const workshops = await fetchWorkshops();
    displayWorkshops(workshops);
  } catch (err) {
    console.error('Erreur chargement ateliers :', err);
  }
});

async function fetchWorkshops() {
  const workshops = await fetchContent('workshop');
  const profiles = await fetchProfilesWithAssets();
  return workshops.map((w) => {
    const refs = w.fields.profiles || [];
    const enriched = refs.map((ref) => profiles.find((p) => p.id === ref.sys.id)).filter(Boolean);
    const assets = w.includes?.Asset || [];
    const imageRef = w.fields.image?.sys?.id;
    const asset = imageRef ? assets.find((a) => a.sys.id === imageRef) : null;
    const imageUrl = asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : null;
    return {
      title: w.fields.title || 'Sans titre',
      description: w.fields.description || '',
      recurrence: Array.isArray(w.fields.recurrence)
        ? w.fields.recurrence.join(' · ')
        : w.fields.recurrence || 'Non spécifiée',
      profiles: enriched,
      imageUrl,
    };
  });
}

function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function displayWorkshops(workshops) {
  const container = document.getElementById('workshop-list');
  if (!container) return;
  if (!workshops.length) {
    container.innerHTML = '<p class="workshop-empty">Aucun atelier pour le moment.</p>';
    return;
  }
  container.innerHTML = workshops
    .map((w, idx) => {
      const plain = stripHTML(w.description);
      const preview =
        plain.length > PREVIEW_CHARS ? `${plain.slice(0, PREVIEW_CHARS).trim()}…` : plain;
      const hasMore = plain.length > PREVIEW_CHARS;

      const profilesHtml = w.profiles
        .map((p) => {
          const img = p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${escapeText(p.name || '')}">`
            : '';
          return `
            <div class="profile-container">
              ${img}
              <div class="profile-details">
                <h5>${escapeText(p.name || '')}</h5>
                <p>${escapeText(p.job || '')}</p>
              </div>
            </div>`;
        })
        .join('');

      return `
        <article class="workshop-card" data-idx="${idx}" tabindex="0" role="button"
                 aria-label="Voir le détail de ${escapeText(w.title)}">
          ${w.imageUrl ? `<div class="workshop-card__cover"><img src="${w.imageUrl}" alt="${escapeText(w.title)}"></div>` : ''}
          <span class="recurrence">◦ ${escapeText(w.recurrence)}</span>
          <h3>${escapeText(w.title)}</h3>
          ${preview ? `<p class="description">${escapeText(preview)}</p>` : ''}
          ${profilesHtml ? `<div class="profiles">${profilesHtml}</div>` : ''}
          ${
            hasMore
              ? '<button type="button" class="workshop-open">Voir le détail →</button>'
              : '<button type="button" class="workshop-open workshop-open--compact">Voir le détail →</button>'
          }
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('.workshop-card').forEach((card) => {
    const idx = Number(card.dataset.idx);
    const w = workshops[idx];
    const open = () => openWorkshopDetail(w);
    card.addEventListener('click', (e) => {
      // Évite de déclencher sur les liens internes éventuels (futur)
      if (e.target.closest('a')) return;
      open();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

function openWorkshopDetail(w) {
  const profilesHtml = w.profiles.length
    ? `<div class="workshop-modal__profiles">${w.profiles
        .map(
          (p) => `
        <div class="workshop-modal__profile">
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${escapeText(p.name || '')}" />` : ''}
          <div>
            <strong>${escapeText(p.name || '')}</strong>
            <span>${escapeText(p.job || '')}</span>
          </div>
        </div>`
        )
        .join('')}</div>`
    : '';

  const body = `
    <div class="workshop-modal">
      ${w.imageUrl ? `<img class="workshop-modal__cover" src="${w.imageUrl}" alt="${escapeText(w.title)}">` : ''}
      <p class="workshop-modal__rec">🔁 ${escapeText(w.recurrence)}</p>
      ${profilesHtml}
      <div class="workshop-modal__body">
        ${sanitizeRichHTML(w.description || '<p><em>Pas de description pour le moment.</em></p>')}
      </div>
      <a class="btn-primary workshop-modal__cta" href="/public/views/contact.html?workshop=${encodeURIComponent(w.title)}">
        S'inscrire à cet atelier →
      </a>
    </div>
  `;
  openPublicModal({ title: w.title, bodyHTML: body });
}

import '../chrome.js';
import '../mycel.js';
import '../siteCopy.js';
import { fetchContent, fetchProfilesWithAssets } from '../contentful.js';
import { openPublicModal } from '../publicModal.js';
import { sanitizeRichHTML, escapeText } from '../contentSanitize.js';

document.addEventListener('DOMContentLoaded', async () => {
  const [dates, profiles] = await Promise.all([
    fetchCycleDates(),
    fetchProfilesWithAssets().catch(() => []),
  ]);
  render(dates, profiles);
});

async function fetchCycleDates() {
  try {
    const items = await fetchContent('cycleDate');
    return items
      .map((item) => ({
        id: item.sys?.id,
        title: item.fields.title || 'Étape',
        order: Number(item.fields.order ?? 0),
        date: item.fields.date || '',
        label: item.fields.label || '',
        description: item.fields.description || '',
        modules: item.fields.modules || '',
        content: item.fields.content || '',
        intervenantIds: (item.fields.intervenants || []).map((r) => r.sys?.id).filter(Boolean),
      }))
      .sort((a, b) => a.order - b.order);
  } catch (err) {
    console.warn('[cycle] Contentful indisponible', err);
    return [];
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function render(dates, profiles) {
  const list = document.getElementById('cycle-list');
  if (!list) return;
  if (!dates.length) {
    list.innerHTML =
      '<p class="cycle-empty">Le programme du cycle se dessine — revenez bientôt.</p>';
    return;
  }

  list.innerHTML = dates
    .map((d, idx) => {
      const dateLabel = formatDate(d.date);
      const intervenants = d.intervenantIds
        .map((id) => profiles.find((p) => p.id === id))
        .filter(Boolean);
      const peopleChips = intervenants.length
        ? `<div class="cycle-step__people">${intervenants
            .map(
              (p) =>
                `<span class="cycle-step__person">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${escapeText(p.name)}">` : ''}${escapeText(p.name)}</span>`
            )
            .join('')}</div>`
        : '';
      return `
        <article class="cycle-step ${idx % 2 === 0 ? 'cycle-step--left' : 'cycle-step--right'}" data-idx="${idx}">
          <div class="cycle-step__marker" aria-hidden="true">
            <span class="cycle-step__dot"></span>
          </div>
          <div class="cycle-step__card">
            ${dateLabel ? `<time class="cycle-step__date">${escapeText(dateLabel)}</time>` : ''}
            ${d.label ? `<span class="cycle-step__label">${escapeText(d.label)}</span>` : ''}
            <h3 class="cycle-step__title">${escapeText(d.title)}</h3>
            ${d.description ? `<p class="cycle-step__desc">${escapeText(d.description)}</p>` : ''}
            ${peopleChips}
            <button type="button" class="cycle-step__cta" data-idx="${idx}">
              Voir les informations →
            </button>
          </div>
        </article>`;
    })
    .join('');

  list.querySelectorAll('.cycle-step__cta').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      openDetail(dates[idx], profiles);
    });
  });
}

function openDetail(d, profiles) {
  const intervenants = d.intervenantIds
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean);

  const modulesHtml = d.modules
    ? `<div class="cycle-modal__modules">
         <h4>Modules abordés</h4>
         <ul>${d.modules
           .split('\n')
           .map((m) => m.trim())
           .filter(Boolean)
           .map((m) => `<li>${escapeText(m)}</li>`)
           .join('')}</ul>
       </div>`
    : '';

  const peopleHtml = intervenants.length
    ? `<div class="cycle-modal__people">
         <h4>Avec</h4>
         ${intervenants
           .map(
             (p) => `
             <div class="cycle-modal__person">
               ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${escapeText(p.name)}">` : ''}
               <div>
                 <strong>${escapeText(p.name)}</strong>
                 <span>${escapeText(p.job || '')}</span>
               </div>
             </div>`
           )
           .join('')}
       </div>`
    : '';

  const dateLabel = formatDate(d.date);
  const body = `
    <div class="cycle-modal">
      ${dateLabel ? `<p class="cycle-modal__date">📅 ${escapeText(dateLabel)}</p>` : ''}
      ${d.label ? `<p class="cycle-modal__label">${escapeText(d.label)}</p>` : ''}
      ${d.description ? `<p class="cycle-modal__lead">${escapeText(d.description)}</p>` : ''}
      ${modulesHtml}
      ${peopleHtml}
      ${d.content ? `<div class="cycle-modal__body">${sanitizeRichHTML(d.content)}</div>` : ''}
      <a class="btn-primary cycle-modal__cta" href="/public/views/contact.html?cycle=${encodeURIComponent(d.title)}">
        S'inscrire à cette étape →
      </a>
    </div>`;

  openPublicModal({ title: d.title, bodyHTML: body });
}

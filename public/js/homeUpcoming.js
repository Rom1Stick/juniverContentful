// Section "Prochains rendez-vous" sur la home.
// Fetch les events, montre les 4 prochains, clic → modale partagée.

import { fetchContent } from './contentful.js';
import { openPublicModal } from './publicModal.js';
import { sanitizeRichHTML, escapeText } from './contentSanitize.js';

const MOIS_COURT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];
const MAX_ITEMS = 4;

export async function renderHomeUpcoming() {
  const list = document.getElementById('home-upcoming-list');
  const section = document.getElementById('home-upcoming');
  if (!list || !section) return;

  let events;
  try {
    const items = await fetchContent('event');
    events = items
      .map((e) => {
        const assets = e.includes?.Asset || [];
        const ref = e.fields.image?.sys?.id;
        const asset = ref ? assets.find((a) => a.sys.id === ref) : null;
        const imageUrl = asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : null;
        return {
          id: e.sys.id,
          title: e.fields.title || 'Sans titre',
          description: e.fields.description || '',
          date: new Date(e.fields.date),
          location: e.fields.location || 'Lieu non précisé',
          imageUrl,
        };
      })
      .filter((e) => e.date >= new Date() && !isNaN(e.date.getTime()))
      .sort((a, b) => a.date - b.date)
      .slice(0, MAX_ITEMS);
  } catch (err) {
    console.error('home upcoming fetch', err);
    section.hidden = true;
    return;
  }

  if (!events.length) {
    list.innerHTML = `<li class="home-upcoming__empty">Pas de rendez-vous programmé pour le moment. Revenez bientôt.</li>`;
    return;
  }

  list.innerHTML = events
    .map((ev) => {
      const day = String(ev.date.getDate()).padStart(2, '0');
      const month = MOIS_COURT[ev.date.getMonth()];
      const timeStr = ev.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `
      <li class="home-upcoming__item" data-id="${ev.id}" tabindex="0" role="button" aria-label="Voir les détails de ${escapeText(ev.title)}">
        <div class="home-upcoming__date">
          <span class="d">${day}</span>
          <span class="m">${month}</span>
        </div>
        <div class="home-upcoming__info">
          <h4>${escapeText(ev.title)}</h4>
          <small>🕑 ${timeStr} · 📍 ${escapeText(ev.location)}</small>
        </div>
        <span class="home-upcoming__chev" aria-hidden="true">›</span>
      </li>`;
    })
    .join('');

  list.querySelectorAll('.home-upcoming__item').forEach((li) => {
    const ev = events.find((e) => e.id === li.dataset.id);
    if (!ev) return;
    const open = () => openEventDetailModal(ev);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

function openEventDetailModal(ev) {
  const dateStr = ev.date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
  const body = `
    <div class="event-detail">
      ${ev.imageUrl ? `<img class="event-detail__cover" src="${ev.imageUrl}" alt="${escapeText(ev.title)}">` : ''}
      <p class="event-detail__when">📅 ${escapeText(dateStr)}</p>
      <p class="event-detail__where">📍 ${escapeText(ev.location || 'Lieu à préciser')}</p>
      ${ev.description ? `<div class="event-detail__body">${sanitizeRichHTML(ev.description)}</div>` : '<p class="event-detail__empty">Plus de détails bientôt disponibles.</p>'}
      <a class="btn-primary event-detail__cta" href="/public/views/contact.html?event=${encodeURIComponent(ev.title)}">
        Je souhaite m'inscrire →
      </a>
    </div>
  `;
  openPublicModal({ title: ev.title, bodyHTML: body });
}

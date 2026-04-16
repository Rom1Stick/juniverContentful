import '../chrome.js';
import '../mycel.js';
import '../siteCopy.js';
import { fetchContent } from '../contentful.js';
import { openPublicModal } from '../publicModal.js';
import { sanitizeRichHTML, escapeText } from '../contentSanitize.js';

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

let pastEvents = [];
let upcomingEvents = [];
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const events = await fetchEvents();
    const now = new Date();
    upcomingEvents = events.filter((e) => e.date >= now).sort((a, b) => a.date - b.date);
    pastEvents = events.filter((e) => e.date < now).sort((a, b) => b.date - a.date);
    allEvents = events;

    renderEvents(upcomingEvents, 'event-list');
    renderCalendar(new Date());
    setupPastToggle();
  } catch (err) {
    console.error('Erreur chargement événements :', err);
  }
});

async function fetchEvents() {
  const items = await fetchContent('event');
  return items.map((e) => {
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
  });
}

function renderEvents(events, containerId) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';
  if (!events.length) {
    list.innerHTML = '<li><p>Aucun événement.</p></li>';
    return;
  }
  events.forEach((ev) => {
    const li = document.createElement('li');
    const day = String(ev.date.getDate()).padStart(2, '0');
    const month = MOIS_COURT[ev.date.getMonth()];
    li.innerHTML = `
      <article class="ev is-clickable" data-id="${ev.id}" tabindex="0" role="button" aria-label="Voir les détails de ${escapeText(ev.title)}">
        <div class="date">
          <div class="d">${day}</div>
          <div class="m">${month}</div>
        </div>
        <div class="info">
          <h5>${escapeText(ev.title)}</h5>
          <div class="loc">${escapeText(ev.location)}</div>
          <div class="see-details">Voir les détails →</div>
        </div>
        <a class="cta" href="/public/views/contact.html?event=${encodeURIComponent(ev.title)}" onclick="event.stopPropagation()">S'inscrire</a>
      </article>
    `;
    const article = li.querySelector('.ev');
    article.addEventListener('click', () => openEventDetail(ev));
    article.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEventDetail(ev);
      }
    });
    list.appendChild(li);
  });
}

export function openEventDetail(ev) {
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const dateStr =
    ev.date instanceof Date && !isNaN(ev.date.getTime())
      ? dateFormatter.format(ev.date)
      : 'Date à préciser';
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

function setupPastToggle() {
  const btn = document.getElementById('toggle-past-events');
  const section = document.getElementById('past-events-section');
  if (!btn || !section) return;
  if (!pastEvents.length) {
    btn.style.display = 'none';
    section.style.display = 'none';
    return;
  }
  section.style.display = 'none';
  btn.style.display = 'inline-flex';
  btn.addEventListener('click', () => {
    const visible = section.style.display !== 'none';
    if (visible) {
      section.style.display = 'none';
      btn.textContent = '← Afficher les événements passés';
    } else {
      section.style.display = 'block';
      renderEvents(pastEvents, 'past-event-list');
      btn.textContent = 'Masquer les événements passés';
    }
  });
}

function renderCalendar(date) {
  const calendar = document.getElementById('calendar');
  if (!calendar) return;
  calendar.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'calendar-header';
  header.textContent = `${date.toLocaleString('fr-FR', { month: 'long' })} ${date.getFullYear()}`;
  calendar.appendChild(header);

  const navigation = document.createElement('div');
  navigation.className = 'calendar-navigation';
  navigation.innerHTML =
    '<button id="prev-month" aria-label="Mois précédent">‹</button><button id="next-month" aria-label="Mois suivant">›</button>';
  calendar.appendChild(navigation);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  const dow = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  dow.forEach((d) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-header-cell';
    cell.textContent = d;
    grid.appendChild(cell);
  });

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDow = firstDay.getDay();

  for (let i = 0; i < startDow; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    grid.appendChild(emptyCell);
  }

  const today = new Date();
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.textContent = day;
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day);

    if (
      cellDate.getFullYear() === today.getFullYear() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getDate() === today.getDate()
    ) {
      cell.classList.add('today');
    }

    const dayEvents = allEvents.filter((e) => e.date.toDateString() === cellDate.toDateString());
    if (dayEvents.length) {
      cell.classList.add('has-event');
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute(
        'aria-label',
        `${dayEvents.length} évènement${dayEvents.length > 1 ? 's' : ''} le ${day}`
      );
      cell.addEventListener('click', () => {
        if (dayEvents.length === 1) openEventDetail(dayEvents[0]);
        else showDayList(dayEvents, cellDate);
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (dayEvents.length === 1) openEventDetail(dayEvents[0]);
          else showDayList(dayEvents, cellDate);
        }
      });
    }

    grid.appendChild(cell);
  }

  calendar.appendChild(grid);
  document.getElementById('prev-month')?.addEventListener('click', () => {
    renderCalendar(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  });
  document.getElementById('next-month')?.addEventListener('click', () => {
    renderCalendar(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  });
}

function showDayList(events, cellDate) {
  const dateStr = cellDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const items = events
    .map(
      (ev) => `
    <li class="day-item" data-id="${ev.id}">
      <strong>${escapeText(ev.title)}</strong>
      <span class="day-item__meta">📍 ${escapeText(ev.location || 'Lieu à préciser')}</span>
      <button type="button" class="btn-ghost day-item__open" data-id="${ev.id}">Voir →</button>
    </li>`
    )
    .join('');
  openPublicModal({
    title: `Évènements du ${dateStr}`,
    bodyHTML: `<ul class="day-list">${items}</ul>`,
  });
  document.querySelectorAll('.day-item__open').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = events.find((e) => e.id === btn.dataset.id);
      if (ev) openEventDetail(ev);
    });
  });
}

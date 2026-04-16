import {
  fetchEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  unpublishEvent,
  uploadAsset,
  cmaFetch,
} from '/admin/assets/js/contentful_admin.js';
import { toastSuccess, toastError, renderEmptyState } from '/admin/assets/js/adminToast.js';
import { openModal } from '/admin/assets/js/adminModal.js';
import { createRichEditor, sanitizeHTML } from '/admin/assets/js/richEditor.js';

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('new-event-btn')?.addEventListener('click', () => openEventModal());
  await loadEvents();
});

async function loadEvents() {
  try {
    const events = await fetchEventsAdmin();
    displayEvents(events);
  } catch (err) {
    console.error('loadEvents', err);
    toastError('Impossible de charger les évènements.');
  }
}

function eventCard(event) {
  const title = event.fields.title?.['en-US'] || 'Sans titre';
  const date = event.fields.date?.['en-US'] || '';
  const loc = event.fields.location?.['en-US'] || '';
  const desc = event.fields.description?.['en-US'] || '';
  const dateObj = date ? new Date(date) : null;
  const dateStr =
    dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Date à préciser';
  const id = event.sys.id;
  const previewText = stripHTML(desc).slice(0, 160);
  return `
    <article class="event-card" data-id="${id}">
      <header class="event-card__head">
        <h3>${escapeHTML(title)}</h3>
        <small class="event-card__when">📅 ${escapeHTML(dateStr)}</small>
      </header>
      <p class="event-card__where">📍 ${escapeHTML(loc || 'Lieu à préciser')}</p>
      ${previewText ? `<p class="event-card__preview">${escapeHTML(previewText)}${previewText.length >= 160 ? '…' : ''}</p>` : ''}
      <footer class="event-card__actions">
        <button type="button" class="btn btn-ghost edit-event" data-id="${id}"><i class="fas fa-pen"></i> Modifier</button>
        <button type="button" class="btn btn-danger delete-event" data-id="${id}"><i class="fas fa-trash"></i> Supprimer</button>
      </footer>
    </article>`;
}

function displayEvents(events) {
  const container = document.getElementById('events-container');
  container.innerHTML = '';
  if (!events || events.length === 0) {
    renderEmptyState(container, {
      icon: '📅',
      title: 'Aucun évènement programmé',
      description: 'Annoncez la prochaine rencontre, conférence ou journée du cercle.',
      ctaLabel: 'Programmer un évènement',
      onCta: () => openEventModal(),
    });
    return;
  }
  container.innerHTML = events.map(eventCard).join('');
  container.querySelectorAll('.edit-event').forEach((btn) => {
    btn.addEventListener('click', () => openEventModal(btn.dataset.id));
  });
  container.querySelectorAll('.delete-event').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteEvent(btn.dataset.id));
  });
}

async function openEventModal(eventId = null) {
  let eventData = null;
  if (eventId) {
    try {
      eventData = await fetchEventByIdCMA(eventId);
    } catch (err) {
      console.error('fetchEventByIdCMA', err);
      toastError("Impossible de charger l'évènement à modifier.");
      return;
    }
  }

  const form = document.createElement('form');
  form.className = 'event-form';
  form.innerHTML = `
    <div>
      <label for="event-title">Titre</label>
      <input type="text" id="event-title" required maxlength="120" />
    </div>
    <div class="form-row">
      <div>
        <label for="event-date">Date et heure</label>
        <input type="datetime-local" id="event-date" required />
      </div>
      <div>
        <label for="event-location">Lieu</label>
        <input type="text" id="event-location" required maxlength="120" />
      </div>
    </div>
    <div>
      <label>Description</label>
      <div id="event-description-host"></div>
    </div>
    <div class="cover-field">
      <label for="event-image">Image de couverture (optionnelle)</label>
      <div class="cover-picker">
        <div class="cover-preview" id="event-cover-preview" hidden>
          <img id="event-cover-img" alt="Aperçu" />
          <button type="button" class="cover-remove" id="event-cover-remove" aria-label="Retirer l'aperçu">×</button>
        </div>
        <input type="file" id="event-image" accept="image/jpeg,image/png,image/gif,image/webp" />
      </div>
      <small class="hint">JPG, PNG, GIF ou WebP · l'image actuelle est conservée si vous laissez ce champ vide.</small>
    </div>
    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> ${eventId ? 'Mettre à jour' : 'Programmer'}</button>
    </div>
  `;

  const editor = createRichEditor({
    initialHTML: eventData ? eventData.fields.description?.['en-US'] || '' : '',
    placeholder: "Décrivez l'évènement : programme, intervenants, public, à apporter…",
  });
  editor.setAssetUploader(async (file) => uploadAsset(file));
  form.querySelector('#event-description-host').appendChild(editor.root);

  if (eventData) {
    form.querySelector('#event-title').value = eventData.fields.title?.['en-US'] || '';
    let date = eventData.fields.date?.['en-US'] || '';
    if (date.length > 16) date = date.slice(0, 16);
    form.querySelector('#event-date').value = date;
    form.querySelector('#event-location').value = eventData.fields.location?.['en-US'] || '';
  }

  // Aperçu immédiat cover
  const coverInput = form.querySelector('#event-image');
  const coverPreview = form.querySelector('#event-cover-preview');
  const coverImg = form.querySelector('#event-cover-img');
  const coverRemove = form.querySelector('#event-cover-remove');
  let coverURL = null;
  const releasePreview = () => {
    if (coverURL) {
      URL.revokeObjectURL(coverURL);
      coverURL = null;
    }
  };
  coverInput.addEventListener('change', () => {
    const file = coverInput.files?.[0];
    releasePreview();
    if (!file) {
      coverPreview.hidden = true;
      return;
    }
    coverURL = URL.createObjectURL(file);
    coverImg.src = coverURL;
    coverPreview.hidden = false;
  });
  coverRemove.addEventListener('click', () => {
    coverInput.value = '';
    releasePreview();
    coverPreview.hidden = true;
  });

  const modal = openModal({
    title: eventId ? 'Modifier un évènement' : 'Nouvel évènement',
    body: form,
    size: 'lg',
    onClose: releasePreview,
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('#event-title').value.trim();
    let date = form.querySelector('#event-date').value.trim();
    const location = form.querySelector('#event-location').value.trim();
    const description = sanitizeHTML(editor.getHTML());

    if (!title || title.length < 3 || !date || !location) {
      toastError('Renseignez un titre (≥ 3 caractères), une date et un lieu.');
      return;
    }
    if (date.includes('T') && date.length === 16) date += ':00';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = eventId ? 'Mise à jour…' : 'Programmation…';

    const imageFile = coverInput.files?.[0] || null;
    try {
      if (eventId) {
        await updateEvent(eventId, { title, date, location, description, imageFile });
        toastSuccess('Évènement mis à jour.');
      } else {
        await createEvent({ title, date, location, description, imageFile });
        toastSuccess('Évènement programmé.');
      }
      modal.close();
      await loadEvents();
    } catch (err) {
      console.error(err);
      toastError(`Échec : ${err.message || err}`);
      submitBtn.disabled = false;
      submitBtn.textContent = eventId ? 'Mettre à jour' : 'Programmer';
    }
  });
}

async function handleDeleteEvent(eventId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet évènement ?')) return;
  try {
    await unpublishEvent(eventId).catch(() => {});
    await deleteEvent(eventId);
    toastSuccess('Évènement supprimé.');
    await loadEvents();
  } catch (err) {
    console.error('handleDeleteEvent', err);
    toastError("Impossible de supprimer l'évènement.");
  }
}

async function fetchEventByIdCMA(eventId) {
  const r = await cmaFetch(`entries/${eventId}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html ?? '';
  return div.textContent || div.innerText || '';
}

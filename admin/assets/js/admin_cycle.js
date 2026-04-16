import {
  fetchCycleDatesAdmin,
  createCycleDate,
  updateCycleDate,
  deleteCycleDate,
  fetchAdminProfiles,
} from './contentful_admin.js';
import { toastSuccess, toastError, renderEmptyState } from './adminToast.js';
import { openModal } from './adminModal.js';
import { createRichEditor, sanitizeHTML } from './richEditor.js';

let allProfiles = [];
let currentDates = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('add-cycle-date')?.addEventListener('click', () => openDateModal());
  showLoading();
  try {
    [allProfiles, currentDates] = await Promise.all([fetchAdminProfiles(), fetchCycleDatesAdmin()]);
    renderDates(currentDates);
  } catch (err) {
    console.error('init cycle', err);
    toastError(`Erreur de chargement : ${err.message}`);
  } finally {
    hideLoading();
  }
});

function formatDate(iso) {
  if (!iso) return 'Date à définir';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function dateCard(d) {
  const names = (d.intervenants || [])
    .map((id) => allProfiles.find((p) => p.id === id)?.name)
    .filter(Boolean);
  const chips = names.length
    ? `<div class="cycle-card__people">${names.map((n) => `<span class="chip">${escapeHTML(n)}</span>`).join('')}</div>`
    : '';
  return `
    <article class="cycle-card" data-id="${d.id}">
      <header class="cycle-card__head">
        <span class="cycle-card__num">${d.order || '?'}</span>
        <div>
          <h3>${escapeHTML(d.title)}</h3>
          <small class="cycle-card__meta">${formatDate(d.date)}${d.label ? ` · ${escapeHTML(d.label)}` : ''}</small>
        </div>
      </header>
      ${d.description ? `<p class="cycle-card__desc">${escapeHTML(truncate(d.description, 160))}</p>` : ''}
      ${chips}
      <footer class="cycle-card__actions">
        <button type="button" class="btn btn-edit" data-id="${d.id}"><i class="fas fa-pen"></i> Modifier</button>
        <button type="button" class="btn btn-danger btn-delete" data-id="${d.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </footer>
    </article>`;
}

function renderDates(dates) {
  const container = document.getElementById('cycle-dates-container');
  if (!dates || dates.length === 0) {
    renderEmptyState(container, {
      icon: '🌿',
      title: 'Aucune date pour le moment',
      description: "Créez la première étape du cycle pour qu'elle apparaisse sur la page publique.",
      ctaLabel: 'Nouvelle date',
      onCta: () => openDateModal(),
    });
    return;
  }
  const sorted = [...dates].sort((a, b) => (a.order || 0) - (b.order || 0));
  container.innerHTML = sorted.map(dateCard).join('');
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openDateModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

function openDateModal(dateId = null) {
  const d = dateId ? currentDates.find((x) => x.id === dateId) : null;

  const form = document.createElement('form');
  form.className = 'cycle-form';
  form.innerHTML = `
    <div class="grid-2">
      <div>
        <label for="cd-order">Ordre (1 à 7)</label>
        <input type="number" id="cd-order" min="1" max="20" required />
      </div>
      <div>
        <label for="cd-date">Date prévue</label>
        <input type="date" id="cd-date" />
      </div>
    </div>
    <div>
      <label for="cd-title">Titre de l'étape</label>
      <input type="text" id="cd-title" required maxlength="120" placeholder="Ex : Écouter le corps" />
    </div>
    <div>
      <label for="cd-label">Étiquette (optionnelle)</label>
      <input type="text" id="cd-label" maxlength="60" placeholder="Ex : Module introductif" />
    </div>
    <div>
      <label for="cd-description">Description courte (résumé affiché sur la carte)</label>
      <textarea id="cd-description" rows="2" maxlength="280" placeholder="Une phrase qui donne envie…"></textarea>
    </div>
    <div>
      <label for="cd-modules">Modules abordés (un par ligne)</label>
      <textarea id="cd-modules" rows="5" placeholder="Respiration consciente
Ancrage corporel
Lecture du paysage"></textarea>
    </div>
    <div>
      <label>Contenu détaillé (modale)</label>
      <div id="cd-content-host"></div>
    </div>
    <div>
      <label>Intervenant·es</label>
      <div id="cd-people" class="checkbox-grid"></div>
    </div>
    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-paper-plane"></i> ${d ? 'Mettre à jour' : 'Créer'}
      </button>
    </div>
  `;

  const editor = createRichEditor({
    initialHTML: d?.content || '',
    placeholder: 'Décrivez en détail : thèmes, intentions, déroulé pédagogique, public visé…',
  });
  form.querySelector('#cd-content-host').appendChild(editor.root);

  // Intervenants
  const peopleList = form.querySelector('#cd-people');
  peopleList.innerHTML = allProfiles
    .map(
      (p) => `
      <label class="checkbox-item">
        <input type="checkbox" value="${p.id}" />
        ${escapeHTML(p.name)}
      </label>`
    )
    .join('');
  if (d) {
    peopleList.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.checked = (d.intervenants || []).includes(cb.value);
    });
    form.querySelector('#cd-order').value = d.order || '';
    form.querySelector('#cd-title').value = d.title;
    form.querySelector('#cd-label').value = d.label || '';
    form.querySelector('#cd-description').value = d.description || '';
    form.querySelector('#cd-modules').value = d.modules || '';
    if (d.date) form.querySelector('#cd-date').value = d.date.slice(0, 10);
  } else {
    // Suggère le prochain ordre libre
    const usedOrders = new Set(currentDates.map((x) => x.order));
    let next = 1;
    while (usedOrders.has(next)) next += 1;
    form.querySelector('#cd-order').value = next;
  }

  const modal = openModal({
    title: d ? 'Modifier une date' : 'Nouvelle date',
    body: form,
    size: 'lg',
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      order: Number(form.querySelector('#cd-order').value),
      title: form.querySelector('#cd-title').value.trim(),
      label: form.querySelector('#cd-label').value.trim(),
      date: form.querySelector('#cd-date').value || '',
      description: form.querySelector('#cd-description').value.trim(),
      modules: form.querySelector('#cd-modules').value.trim(),
      content: sanitizeHTML(editor.getHTML()),
      intervenants: Array.from(peopleList.querySelectorAll('input:checked')).map((cb) => cb.value),
    };

    if (!payload.title || payload.title.length < 3) {
      toastError('Le titre doit contenir au moins 3 caractères.');
      return;
    }
    if (!payload.order || payload.order < 1) {
      toastError("L'ordre doit être un entier positif.");
      return;
    }

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = d ? 'Mise à jour…' : 'Création…';
    showLoading();

    try {
      if (d) {
        await updateCycleDate(d.id, payload);
        toastSuccess('Date mise à jour.');
      } else {
        await createCycleDate(payload);
        toastSuccess('Date créée.');
      }
      modal.close();
      currentDates = await fetchCycleDatesAdmin();
      renderDates(currentDates);
    } catch (err) {
      console.error(err);
      toastError(`Échec : ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = d ? 'Mettre à jour' : 'Créer';
    } finally {
      hideLoading();
    }
  });
}

async function handleDelete(id) {
  if (!confirm('Supprimer cette date du cycle ?')) return;
  showLoading();
  try {
    await deleteCycleDate(id);
    currentDates = currentDates.filter((d) => d.id !== id);
    renderDates(currentDates);
    toastSuccess('Date supprimée.');
  } catch (err) {
    console.error(err);
    toastError(`Échec de suppression : ${err.message}`);
  } finally {
    hideLoading();
  }
}

function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

function truncate(s, n) {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n).trim()}…` : str;
}

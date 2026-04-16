import {
  fetchWorkshopsAdmin,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  fetchAdminProfiles,
  uploadAsset,
} from './contentful_admin.js';
import { toastSuccess, toastError, renderEmptyState } from './adminToast.js';
import { openModal } from './adminModal.js';
import { createRichEditor, sanitizeHTML } from './richEditor.js';

let allProfiles = [];
let currentWorkshops = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('add-workshop')?.addEventListener('click', () => openWorkshopModal());
  showLoading();
  try {
    [allProfiles, currentWorkshops] = await Promise.all([
      fetchAdminProfiles(),
      fetchWorkshopsAdmin(),
    ]);
    renderWorkshops(currentWorkshops);
  } catch (err) {
    console.error('init workshops', err);
    toastError(`Erreur de chargement : ${err.message}`);
  } finally {
    hideLoading();
  }
});

function workshopCard(w) {
  const profilesNames = (w.profiles || [])
    .map((id) => allProfiles.find((p) => p.id === id)?.name)
    .filter(Boolean);
  const animatorChips = profilesNames.length
    ? `<div class="workshop-card__animators">${profilesNames.map((n) => `<span class="chip">${escapeHTML(n)}</span>`).join('')}</div>`
    : '';
  return `
    <article class="workshop-card" data-id="${w.id}">
      <header class="workshop-card__head">
        <h3>${escapeHTML(w.title)}</h3>
        <small class="workshop-card__rec">🔁 ${escapeHTML(w.recurrence)}</small>
      </header>
      ${animatorChips}
      <footer class="workshop-card__actions">
        <button type="button" class="btn btn-ghost view-workshop" data-id="${w.id}"><i class="fas fa-eye"></i> Voir le détail</button>
        <button type="button" class="btn btn-edit" data-id="${w.id}"><i class="fas fa-pen"></i> Modifier</button>
        <button type="button" class="btn btn-danger btn-delete" data-id="${w.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </footer>
    </article>`;
}

function renderWorkshops(workshops) {
  const container = document.getElementById('workshops-container');
  if (!workshops || workshops.length === 0) {
    renderEmptyState(container, {
      icon: '🌿',
      title: 'Aucun atelier pour le moment',
      description:
        "Créez votre premier atelier pour qu'il apparaisse sur le site et soit proposé aux membres du cercle.",
      ctaLabel: 'Créer un atelier',
      onCta: () => openWorkshopModal(),
    });
    return;
  }
  container.innerHTML = workshops.map(workshopCard).join('');
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openWorkshopModal(btn.dataset.id));
  });
  container.querySelectorAll('.view-workshop').forEach((btn) => {
    btn.addEventListener('click', () => openWorkshopDetail(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

function openWorkshopDetail(workshopId) {
  const w = currentWorkshops.find((x) => x.id === workshopId);
  if (!w) return;
  const profilesNames = (w.profiles || [])
    .map((id) => allProfiles.find((p) => p.id === id)?.name)
    .filter(Boolean);
  const body = document.createElement('div');
  body.className = 'workshop-detail';
  body.innerHTML = `
    <p class="workshop-detail__meta"><strong>Récurrence :</strong> ${escapeHTML(w.recurrence)}</p>
    ${profilesNames.length ? `<p class="workshop-detail__meta"><strong>Animateurs :</strong> ${escapeHTML(profilesNames.join(', '))}</p>` : ''}
    <div class="workshop-detail__body">${sanitizeHTML(w.description || '')}</div>
    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Fermer</button>
      <button type="button" class="btn btn-primary" id="detail-edit-btn"><i class="fas fa-pen"></i> Modifier cet atelier</button>
    </div>
  `;
  const modal = openModal({ title: w.title, body, size: 'md' });
  body.querySelector('#detail-edit-btn').addEventListener('click', () => {
    modal.close();
    setTimeout(() => openWorkshopModal(workshopId), 300);
  });
}

function openWorkshopModal(workshopId = null) {
  const workshop = workshopId ? currentWorkshops.find((w) => w.id === workshopId) : null;

  const form = document.createElement('form');
  form.className = 'workshop-form';
  form.innerHTML = `
    <div>
      <label for="workshop-title">Titre</label>
      <input type="text" id="workshop-title" required maxlength="100" />
    </div>
    <div>
      <label for="workshop-recurrence">Récurrence</label>
      <input type="text" id="workshop-recurrence" required placeholder="Ex : tous les mardis · 1er jeudi du mois" />
    </div>
    <div>
      <label>Description</label>
      <div id="workshop-description-host"></div>
    </div>
    <div>
      <label>Animateurs</label>
      <div id="profiles-list" class="checkbox-grid"></div>
    </div>
    <div class="cover-field">
      <label for="workshop-image">Image de couverture (optionnelle)</label>
      <div class="cover-picker">
        <div class="cover-preview" id="workshop-cover-preview" hidden>
          <img id="workshop-cover-img" alt="Aperçu" />
          <button type="button" class="cover-remove" id="workshop-cover-remove" aria-label="Retirer l'aperçu">×</button>
        </div>
        <input type="file" id="workshop-image" accept="image/jpeg,image/png,image/gif,image/webp" />
      </div>
      <small class="hint">JPG, PNG, GIF ou WebP · l'image actuelle est conservée si vide.</small>
    </div>
    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> ${workshop ? 'Mettre à jour' : 'Créer'}</button>
    </div>
  `;

  const editor = createRichEditor({
    initialHTML: workshop?.description || '',
    placeholder: "Décrivez l'atelier : objectif, déroulé, public visé, prérequis…",
  });
  editor.setAssetUploader(async (file) => uploadAsset(file));
  form.querySelector('#workshop-description-host').appendChild(editor.root);

  // Cases à cocher animateurs
  const profilesList = form.querySelector('#profiles-list');
  profilesList.innerHTML = allProfiles
    .map(
      (p) => `
    <label class="checkbox-item">
      <input type="checkbox" value="${p.id}" />
      ${escapeHTML(p.name)}
    </label>`
    )
    .join('');
  if (workshop) {
    profilesList.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.checked = (workshop.profiles || []).includes(cb.value);
    });
  }

  if (workshop) {
    form.querySelector('#workshop-title').value = workshop.title;
    form.querySelector('#workshop-recurrence').value = workshop.recurrence;
  }

  // Aperçu cover
  const coverInput = form.querySelector('#workshop-image');
  const coverPreview = form.querySelector('#workshop-cover-preview');
  const coverImg = form.querySelector('#workshop-cover-img');
  const coverRemove = form.querySelector('#workshop-cover-remove');
  let coverURL = null;
  if (workshop?.imageUrl) {
    coverImg.src = workshop.imageUrl;
    coverPreview.hidden = false;
  }
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
    if (workshop?.imageUrl) {
      coverImg.src = workshop.imageUrl;
      coverPreview.hidden = false;
    } else {
      coverPreview.hidden = true;
    }
  });

  const modal = openModal({
    title: workshop ? 'Modifier un atelier' : 'Nouvel atelier',
    body: form,
    size: 'lg',
    onClose: releasePreview,
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: form.querySelector('#workshop-title').value.trim(),
      recurrence: form.querySelector('#workshop-recurrence').value.trim(),
      description: sanitizeHTML(editor.getHTML()),
      profiles: Array.from(profilesList.querySelectorAll('input:checked')).map((cb) => cb.value),
      imageFile: coverInput.files?.[0] || null,
    };

    try {
      validateWorkshopData(data);
    } catch (err) {
      toastError(err.message);
      return;
    }

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = workshop ? 'Mise à jour…' : 'Création…';
    showLoading();

    try {
      if (workshop) {
        await updateWorkshop(workshop.id, data);
        toastSuccess('Atelier mis à jour.');
      } else {
        await createWorkshop(data);
        toastSuccess('Atelier créé.');
      }
      modal.close();
      currentWorkshops = await fetchWorkshopsAdmin();
      renderWorkshops(currentWorkshops);
    } catch (err) {
      console.error(err);
      toastError(`Échec de l'enregistrement : ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = workshop ? 'Mettre à jour' : 'Créer';
    } finally {
      hideLoading();
    }
  });
}

async function handleDelete(workshopId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet atelier ?')) return;
  showLoading();
  try {
    await deleteWorkshop(workshopId);
    currentWorkshops = currentWorkshops.filter((w) => w.id !== workshopId);
    renderWorkshops(currentWorkshops);
    toastSuccess('Atelier supprimé.');
  } catch (err) {
    console.error('handleDelete workshop', err);
    toastError(`Échec de suppression : ${err.message}`);
  } finally {
    hideLoading();
  }
}

function validateWorkshopData(data) {
  if (!data.title || data.title.length < 3)
    throw new Error('Le titre doit contenir au moins 3 caractères.');
  if (!data.description || stripHTML(data.description).trim().length < 10) {
    throw new Error('La description doit contenir au moins 10 caractères.');
  }
  if (!data.recurrence) throw new Error('Veuillez définir une récurrence.');
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
function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html ?? '';
  return div.textContent || div.innerText || '';
}

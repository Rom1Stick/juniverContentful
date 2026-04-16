import {
  fetchAdminProfiles,
  createAdminProfile,
  updateAdminProfile,
  deleteAdminProfile,
  uploadAsset,
} from './contentful_admin.js';
import { toastSuccess, toastError, renderEmptyState } from './adminToast.js';
import { openModal } from './adminModal.js';

let currentProfiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('new-profile-btn')?.addEventListener('click', () => openProfileModal());
  document.getElementById('back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', toggleBackToTop);
  await loadProfiles();
});

function toggleBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  btn.classList.toggle('visible', window.scrollY > 300);
}

async function loadProfiles() {
  try {
    currentProfiles = await fetchAdminProfiles();
    renderProfiles(currentProfiles);
  } catch (err) {
    console.error('loadProfiles', err);
    toastError('Impossible de charger les profils.');
  }
}

function profileCard(p) {
  const diplomas = Array.isArray(p.diplomas) ? p.diplomas.join(', ') : p.diplomas || '';
  const shortBio = (p.description || '').slice(0, 140);
  return `
    <article class="profile-card" data-id="${p.id}">
      <div class="profile-header">
        <img src="${p.imageUrl}" alt="${escapeAttr(p.name)}" class="profile-img" loading="lazy" />
        <div class="profile-info">
          <h3>${escapeHTML(p.name)}</h3>
          <p>${escapeHTML(p.job)}</p>
        </div>
      </div>

      <div class="profile-content">
        ${p.email ? `<div class="profile-field"><label>Email</label><span>${escapeHTML(p.email)}</span></div>` : ''}
        ${p.phone && p.phone !== 'Non spécifié' ? `<div class="profile-field"><label>Téléphone</label><span>${escapeHTML(p.phone)}</span></div>` : ''}
        ${p.website && p.website !== 'Non spécifié' ? `<div class="profile-field"><label>Site web</label><span>${escapeHTML(p.website)}</span></div>` : ''}
        ${diplomas ? `<div class="profile-field"><label>Diplômes</label><span>${escapeHTML(diplomas)}</span></div>` : ''}
        ${shortBio ? `<div class="profile-field"><label>Description</label><span class="profile-bio">${escapeHTML(shortBio)}${p.description.length > 140 ? '…' : ''}</span></div>` : ''}
      </div>

      <div class="card-actions">
        <button type="button" class="btn btn-edit edit-profile" data-id="${p.id}"><i class="fas fa-pen"></i> Modifier</button>
        <button type="button" class="btn btn-danger delete-profile" data-id="${p.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </div>
    </article>`;
}

function renderProfiles(profiles) {
  const container = document.getElementById('profiles-container');
  if (!profiles || profiles.length === 0) {
    renderEmptyState(container, {
      icon: '👤',
      title: 'Aucun profil enregistré',
      description:
        "Créez la fiche d'un thérapeute du cercle pour la faire apparaître sur le site public.",
      ctaLabel: 'Créer un profil',
      onCta: () => openProfileModal(),
    });
    return;
  }
  container.innerHTML = profiles.map(profileCard).join('');
  container.querySelectorAll('.edit-profile').forEach((btn) => {
    btn.addEventListener('click', () => openProfileModal(btn.dataset.id));
  });
  container.querySelectorAll('.delete-profile').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

function openProfileModal(profileId = null) {
  const profile = profileId ? currentProfiles.find((p) => p.id === profileId) : null;

  const form = document.createElement('form');
  form.className = 'profile-form';
  form.innerHTML = `
    <div class="profile-photo-field">
      <label>Photo de profil</label>
      <div class="profile-photo-preview">
        <img id="photo-preview" src="${profile?.imageUrl || '/admin/assets/views/images/default-profile.jpg'}" alt="" />
        <div class="profile-photo-actions">
          <input type="file" id="profile-image" accept="image/*" hidden />
          <button type="button" class="btn btn-ghost" id="pick-photo"><i class="fas fa-camera"></i> ${profile ? 'Changer' : 'Ajouter'} la photo</button>
          <small class="hint">JPEG, PNG, GIF ou WebP · 20 Mo max</small>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div>
        <label for="profile-name">Nom complet</label>
        <input type="text" id="profile-name" required />
      </div>
      <div>
        <label for="profile-job">Spécialité</label>
        <input type="text" id="profile-job" required />
      </div>
    </div>

    <div class="form-row">
      <div>
        <label for="profile-email">Email</label>
        <input type="email" id="profile-email" required />
      </div>
      <div>
        <label for="profile-phone">Téléphone</label>
        <input type="tel" id="profile-phone" />
      </div>
    </div>

    <div>
      <label for="profile-website">Site web</label>
      <input type="url" id="profile-website" placeholder="https://…" />
    </div>

    <div>
      <label for="profile-diplomas">Diplômes</label>
      <input type="text" id="profile-diplomas" placeholder="Séparés par des virgules" />
    </div>

    <div>
      <label for="profile-description">Description</label>
      <textarea id="profile-description" rows="4" placeholder="Parcours, approche, spécialisation…"></textarea>
    </div>

    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${profile ? 'Enregistrer' : 'Créer le profil'}</button>
    </div>
  `;

  if (profile) {
    form.querySelector('#profile-name').value = profile.name || '';
    form.querySelector('#profile-job').value = profile.job || '';
    form.querySelector('#profile-email').value = profile.email || '';
    form.querySelector('#profile-phone').value =
      profile.phone && profile.phone !== 'Non spécifié' ? profile.phone : '';
    form.querySelector('#profile-website').value =
      profile.website && profile.website !== 'Non spécifié' ? profile.website : '';
    form.querySelector('#profile-diplomas').value = Array.isArray(profile.diplomas)
      ? profile.diplomas.join(', ')
      : profile.diplomas || '';
    form.querySelector('#profile-description').value = profile.description || '';
  }

  const modal = openModal({
    title: profile ? 'Modifier le profil' : 'Nouveau profil',
    body: form,
    size: 'md',
  });

  // Gestion photo
  const fileInput = form.querySelector('#profile-image');
  const pickBtn = form.querySelector('#pick-photo');
  const preview = form.querySelector('#photo-preview');
  // Initialisé sur l'image existante du profil pour ne pas perdre la photo à la mise à jour
  let pendingImageId = profile?.imageId || null;

  pickBtn.addEventListener('click', () => fileInput.click());
  let lastObjectURL = null;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    // Aperçu immédiat (avant l'upload Contentful)
    if (lastObjectURL) URL.revokeObjectURL(lastObjectURL);
    lastObjectURL = URL.createObjectURL(file);
    preview.src = lastObjectURL;
    preview.classList.add('is-uploading');

    const prevLabel = pickBtn.innerHTML;
    pickBtn.disabled = true;
    pickBtn.innerHTML = '<span class="re-spinner" aria-hidden="true"></span> Envoi…';
    try {
      const { id, url } = await uploadAsset(file);
      pendingImageId = id;
      preview.src = url;
      toastSuccess('Photo uploadée.');
    } catch (err) {
      console.error(err);
      toastError(err.message || "Échec de l'upload de la photo.");
    } finally {
      preview.classList.remove('is-uploading');
      pickBtn.disabled = false;
      pickBtn.innerHTML = prevLabel;
      fileInput.value = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.querySelector('#profile-name').value.trim(),
      job: form.querySelector('#profile-job').value.trim(),
      email: form.querySelector('#profile-email').value.trim(),
      phone: form.querySelector('#profile-phone').value.trim(),
      website: form.querySelector('#profile-website').value.trim(),
      diplomas: form.querySelector('#profile-diplomas').value.trim(),
      description: form.querySelector('#profile-description').value.trim(),
      imageId: pendingImageId,
    };
    if (!data.name || !data.job || !data.email) {
      toastError('Nom, spécialité et email sont obligatoires.');
      return;
    }

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    try {
      if (profile) {
        await updateAdminProfile(profile.id, data);
        toastSuccess('Profil mis à jour.');
      } else {
        await createAdminProfile(data);
        toastSuccess('Profil créé.');
      }
      modal.close();
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toastError(`Échec : ${err.message || err}`);
      submitBtn.disabled = false;
      submitBtn.textContent = profile ? 'Enregistrer' : 'Créer le profil';
    }
  });
}

async function handleDelete(profileId) {
  const profile = currentProfiles.find((p) => p.id === profileId);
  if (
    !confirm(
      `Êtes-vous sûr de vouloir supprimer le profil de ${profile?.name || 'ce thérapeute'} ?`
    )
  )
    return;
  try {
    await deleteAdminProfile(profileId);
    toastSuccess('Profil supprimé.');
    await loadProfiles();
  } catch (err) {
    console.error('handleDelete profile', err);
    toastError('Impossible de supprimer le profil.');
  }
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}
function escapeAttr(s) {
  return escapeHTML(s).replace(/"/g, '&quot;');
}

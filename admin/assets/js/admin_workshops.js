import { 
  fetchWorkshopsAdmin, 
  createWorkshop, 
  updateWorkshop, 
  deleteWorkshop, 
  fetchAdminProfiles 
} from './contentful_admin.js';

let allProfiles = [];
let currentWorkshops = [];

// Gestion du chargement
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await Promise.all([loadProfiles(), loadWorkshops()]);
        setupEventListeners();
    } catch (error) {
        showError(`Erreur de chargement: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// 🔹 Chargement des profils des animateurs
async function loadProfiles() {
    try {
        allProfiles = await fetchAdminProfiles();
        renderProfileCheckboxes();
    } catch (error) {
        showError(`Erreur lors du chargement des profils: ${error.message}`);
    }
}

// 🔹 Chargement des ateliers existants
async function loadWorkshops() {
    try {
        currentWorkshops = await fetchWorkshopsAdmin();
        renderWorkshops(currentWorkshops);
    } catch (error) {
        showError(`Erreur lors du chargement des ateliers: ${error.message}`);
    }
}

// 🔹 Affichage des animateurs sous forme de cases à cocher
function renderProfileCheckboxes() {
    const container = document.getElementById('profiles-list');
    container.innerHTML = allProfiles.map(profile => `
        <label class="checkbox-item">
            <input type="checkbox" value="${profile.id}">
            ${profile.name}
        </label>
    `).join('');
}

// 🔹 Affichage des ateliers
function renderWorkshops(workshops) {
    const container = document.getElementById('workshops-container');
    container.innerHTML = workshops.map(workshop => `
        <div class="workshop-card" data-id="${workshop.id}">
            <h3>${workshop.title}</h3>
            <p>${workshop.description}</p>
            <p><strong>Récurrence:</strong> ${workshop.recurrence}</p>
            <button class="btn-edit" data-id="${workshop.id}">Modifier</button>
            <button class="btn-delete" data-id="${workshop.id}">Supprimer</button>
        </div>
    `).join('');
}

// 🔹 Ajout des écouteurs d'événements
function setupEventListeners() {
    document.getElementById('add-workshop').addEventListener('click', () => {
        resetForm();
        document.getElementById('workshop-form').style.display = 'block';
    });

    document.getElementById('cancel-edit').addEventListener('click', () => {
        resetForm();
    });

    document.getElementById('workshops-container').addEventListener('click', async (e) => {
        const target = e.target;
        const workshopId = target.dataset.id;

        if (!workshopId) return;

        if (target.classList.contains('btn-edit')) {
            await handleEdit(workshopId);
        } else if (target.classList.contains('btn-delete')) {
            await handleDelete(workshopId);
        }
    });

    document.getElementById('workshop-editor').addEventListener('submit', handleSubmit);
}

// 🔹 Gestion de l'édition d'un atelier
async function handleEdit(workshopId) {
    showLoading();
    try {
        const workshop = currentWorkshops.find(w => w.id === workshopId);
        if (!workshop) throw new Error("Atelier introuvable");

        populateForm(workshop);
    } catch (error) {
        showError(`Erreur lors de l'édition: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 🔹 Gestion de la suppression d'un atelier
async function handleDelete(workshopId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet atelier ?")) return;

    showLoading();
    try {
        await deleteWorkshop(workshopId);
        currentWorkshops = currentWorkshops.filter(w => w.id !== workshopId);
        renderWorkshops(currentWorkshops);
        showSuccess("Atelier supprimé avec succès !");
    } catch (error) {
        showError(`Échec de suppression: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 🔹 Gestion de la soumission du formulaire (création ou mise à jour)
async function handleSubmit(e) {
    e.preventDefault();
    showLoading();

    const workshopData = {
        title: document.getElementById('workshop-title').value.trim(),
        description: document.getElementById('workshop-description').value.trim(),
        recurrence: document.getElementById('workshop-recurrence').value.trim(),
        profiles: getSelectedProfiles()
    };

    try {
        validateWorkshopData(workshopData);
        
        if (document.getElementById('workshop-id').value) {
            await updateWorkshop(document.getElementById('workshop-id').value, workshopData);
        } else {
            await createWorkshop(workshopData);
        }

        await loadWorkshops();
        resetForm();
        showSuccess("Atelier enregistré avec succès !");
    } catch (error) {
        showError(`Échec de l'enregistrement: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 🔹 Validation des données avant enregistrement
function validateWorkshopData(data) {
    if (!data.title || data.title.length < 3) throw new Error("Le titre doit contenir au moins 3 caractères.");
    if (!data.description || data.description.length < 10) throw new Error("La description doit contenir au moins 10 caractères.");
    if (!data.recurrence) throw new Error("Veuillez définir une récurrence.");
}

// 🔹 Remplissage du formulaire avec les données de l'atelier
function populateForm(workshop) {
    document.getElementById('workshop-id').value = workshop.id;
    document.getElementById('workshop-title').value = workshop.title;
    document.getElementById('workshop-description').value = workshop.description;
    document.getElementById('workshop-recurrence').value = workshop.recurrence;

    document.querySelectorAll('#profiles-list input').forEach(input => {
        input.checked = workshop.profiles.includes(input.value);
    });

    document.getElementById('workshop-form').style.display = 'block';
}

// 🔹 Récupération des profils sélectionnés
function getSelectedProfiles() {
    return Array.from(document.querySelectorAll('#profiles-list input:checked')).map(cb => cb.value);
}

// 🔹 Réinitialisation du formulaire
function resetForm() {
    document.getElementById('workshop-editor').reset();
    document.getElementById('workshop-id').value = "";
    document.getElementById('workshop-form').style.display = 'none';
}

// 🔹 Gestion du chargement
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 🔹 Notifications
function showSuccess(message) {
    alert(`✅ ${message}`);
}

function showError(message) {
    alert(`❌ ${message}`);
    console.error(message);
}

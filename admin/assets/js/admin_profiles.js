import { fetchAdminProfiles, updateAdminProfile, deleteAdminProfile, createAdminProfile, uploadProfileImage } from './contentful_admin.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des profils pour l'administration...");

    try {
        const profiles = await fetchAdminProfiles();

        if (!profiles || profiles.length === 0) {
            console.warn("Aucun profil trouvé.");
            document.getElementById('profiles-table-body').innerHTML = "<tr><td colspan='8'>Aucun profil disponible.</td></tr>";
            return;
        }

        displayProfiles(profiles);
    } catch (error) {
        console.error("Erreur lors du chargement des profils :", error);
    }

    document.getElementById('add-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileCreation();
    });
});

function displayProfiles(profiles) {
  const tableBody = document.getElementById('profiles-table-body');

  if (!tableBody) {
      console.error("Tableau des profils introuvable !");
      return;
  }

  tableBody.innerHTML = profiles.map(profile => {
      // Assurez-vous que l'image a une URL valide ou utilisez une image par défaut
      const imageUrl = profile.imageUrl && profile.imageUrl !== '{imageUrl}'
          ? profile.imageUrl
          : '/admin/assets/images/default-profile.jpg';

      return `
          <tr data-id="${profile.id}">
              <td>
                  <img src="${imageUrl}" alt="Profil" class="profile-img">
                  <input type="file" class="profile-img-input hidden">
              </td>
              <td class="editable">${profile.name}</td>
              <td class="editable">${profile.job}</td>
              <td class="editable">${profile.email}</td>
              <td class="editable">${profile.phone || ''}</td>
              <td class="editable">${profile.website || ''}</td>
              <td class="editable">${Array.isArray(profile.diplomas) ? profile.diplomas.join(', ') : ''}</td>
              <td>
                  <button class="edit-profile-btn">Modifier</button>
                  <button class="delete-profile-btn">Supprimer</button>
              </td>
          </tr>
      `;
  }).join('');

  attachInlineEditEvents();
}


function attachInlineEditEvents() {
    document.querySelectorAll('.edit-profile-btn').forEach(button => {
        const row = button.closest('tr');
        button.addEventListener('click', () => enableInlineEditing(row));
    });

    document.querySelectorAll('.delete-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const profileId = button.closest('tr').dataset.id;
            await handleProfileDelete(profileId);
        });
    });
}

async function handleProfileCreation() {
  const name = document.getElementById('profile-name').value.trim();
  const job = document.getElementById('profile-job').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const website = document.getElementById('profile-website').value.trim();
  const description = document.getElementById('profile-description').value.trim();
  const diplomasInput = document.getElementById('profile-diplomas').value.trim();
  const diplomas = diplomasInput ? diplomasInput.split(',').map(d => d.trim()).join(', ') : 'Aucun'; // Convertir en chaîne unique
  const imageFile = document.getElementById('profile-image').files[0];

  if (!name || !job || !email) {
      alert("Les champs Nom, Métier et Email sont obligatoires !");
      return;
  }

  try {
      let imageId = null;
      if (imageFile) {
          imageId = await uploadProfileImage(imageFile);
      }

      const profileData = {
          name,
          job,
          email,
          phone: phone || '0', // Utiliser '0' si vide
          website: website || '',
          description: description || '',
          diplomas,
          imageId,
      };

      console.log("Données envoyées :", profileData);

      await createAdminProfile(profileData);
      alert("Profil ajouté avec succès !");
      window.location.reload();
  } catch (error) {
      console.error("Erreur lors de la création du profil :", error);
      alert("Erreur lors de l'ajout du profil. Vérifiez les données et réessayez.");
  }
}




async function handleProfileDelete(profileId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) return;

    try {
        await deleteAdminProfile(profileId);
        alert("Profil supprimé avec succès !");
        window.location.reload();
    } catch (error) {
        console.error("Erreur lors de la suppression du profil :", error);
        alert("Une erreur est survenue lors de la suppression du profil.");
    }
}

function enableInlineEditing(row) {
    const cells = row.querySelectorAll('td.editable');
    const profileId = row.dataset.id;

    cells.forEach(cell => {
        cell.contentEditable = true;
        cell.classList.add('editing');
    });

    const imgInput = row.querySelector('.profile-img-input');
    imgInput.classList.remove('hidden');
    imgInput.addEventListener('change', async () => {
        const file = imgInput.files[0];
        if (!file) return;

        try {
            const uploadedAssetId = await uploadProfileImage(file);
            row.querySelector('.profile-img').src = URL.createObjectURL(file);
            row.dataset.imageId = uploadedAssetId;
        } catch (error) {
            console.error("Erreur lors de l'upload de l'image :", error);
            alert("Erreur lors du téléchargement de l'image.");
        }
    });

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Enregistrer';
    saveButton.className = 'save-profile-btn';
    saveButton.addEventListener('click', async () => {
        const updatedData = {
            name: cells[0].textContent.trim(),
            job: cells[1].textContent.trim(),
            email: cells[2].textContent.trim(),
            phone: parseInt(cells[3].textContent.trim(), 10) || 0,
            website: cells[4].textContent.trim(),
            diplomas: cells[5].textContent.split(',').map(d => d.trim()).join(', '),
            imageId: row.dataset.imageId || null,
        };

        console.log("Données envoyées :", updatedData);

        try {
            await updateAdminProfile(profileId, updatedData);
            alert('Profil mis à jour avec succès !');
            window.location.reload();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil :', error);
            alert('Une erreur est survenue lors de la mise à jour.');
        }
    });

    row.querySelector('td:last-child').appendChild(saveButton);
}

export async function publishAdminProfile(profileId) {
  const url = `${BASE_CMA_URL}/${profileId}/published`;
  const entryUrl = `${BASE_CMA_URL}/${profileId}`;
  const headers = {
      'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
  };

  try {
      // Récupérer la version actuelle de l'entrée
      const entryResponse = await fetch(entryUrl, { method: 'GET', headers });
      if (!entryResponse.ok) {
          throw new Error(`Erreur lors de la récupération de l'entrée : ${entryResponse.status}`);
      }
      const entryData = await entryResponse.json();
      const currentVersion = entryData.sys.version;

      // Publier l'entrée
      const response = await fetch(url, {
          method: 'PUT',
          headers: {
              ...headers,
              'X-Contentful-Version': currentVersion,
          },
      });

      if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur lors de la publication détaillée :', errorData);
          throw new Error(`Erreur lors de la publication du profil : ${response.status}`);
      }

      console.log("Profil publié avec succès !");
  } catch (error) {
      console.error("Erreur lors de la publication du profil :", error);
      throw error;
  }
}


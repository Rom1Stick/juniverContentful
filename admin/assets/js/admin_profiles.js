import { fetchAdminProfiles, updateAdminProfile, deleteAdminProfile, createAdminProfile, uploadProfileImage } from './contentful_admin.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des profils pour l'administration...");
    
    // Ajouter un indicateur de chargement
    const container = document.getElementById('profiles-container');
    if (container) {
        container.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                <p>Chargement des profils en cours...</p>
            </div>
        `;
    }

    try {
        // Attendre un court instant pour s'assurer que tous les éléments sont chargés
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const profiles = await fetchAdminProfiles();

        if (!profiles || profiles.length === 0) {
            console.warn("Aucun profil trouvé.");
            if (container) {
                container.innerHTML = `
                    <article class='profile-card empty-state'>
                        <div class='profile-header'>
                            <h3>Aucun profil disponible</h3>
                            <p>Commencez par ajouter un nouveau profil</p>
                        </div>
                    </article>`;
            }
            return;
        }

        // S'assurer que le conteneur existe toujours avant d'afficher les profils
        if (container) {
            displayProfiles(profiles);
        }
    } catch (error) {
        console.error("Erreur lors du chargement des profils :", error);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Une erreur est survenue</h3>
                    <p>Impossible de charger les profils. Veuillez réessayer plus tard.</p>
                    <button onclick="window.location.reload()" class="retry-button">
                        <i class="fas fa-redo"></i> Réessayer
                    </button>
                </div>
            `;
        }
    }

    document.getElementById('add-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileAction(handleProfileCreation);
    });
});

function displayProfiles(profiles) {
    const container = document.getElementById('profiles-container');
    
    if (!container) {
        console.error("Conteneur des profils introuvable !");
        return;
    }

    const defaultImageUrl = '/assets/image/default-profile.png';

    container.innerHTML = profiles.map(profile => {
        const imageUrl = profile.imageUrl || defaultImageUrl;

        return `
            <article class="profile-card" data-id="${profile.id}">
                <div class="profile-header">
                    <div class="profile-image-container">
                        <img src="${imageUrl}" 
                             alt="Photo de ${profile.name || 'profil'}" 
                             class="profile-img"
                             onerror="this.onerror=null; this.src='${defaultImageUrl}';">
                        <div class="profile-image-overlay">
                            <input type="file" 
                                   id="image-upload-${profile.id}" 
                                   class="image-upload" 
                                   accept="image/*"
                                   style="display: none;">
                        </div>
                    </div>
                    <div class="profile-info">
                        <h3 class="editable" data-field="name">${profile.name || 'Sans nom'}</h3>
                        <p class="editable" data-field="job">${profile.job || 'Poste non défini'}</p>
                    </div>
                </div>
                
                <div class="profile-content">
                    <div class="profile-field">
                        <label>Email :</label>
                        <span class="editable" data-field="email">${profile.email || 'Non renseigné'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Téléphone :</label>
                        <span class="editable" data-field="phone">${profile.phone || 'Non renseigné'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Site web :</label>
                        <span class="editable" data-field="website">${profile.website || 'Non renseigné'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Diplômes :</label>
                        <span class="editable" data-field="diplomas">${Array.isArray(profile.diplomas) ? profile.diplomas.join(', ') : (profile.diplomas || 'Non renseigné')}</span>
                    </div>
                    <div class="profile-field">
                        <label>Description :</label>
                        <span class="editable" data-field="description">${profile.description || 'Non renseigné'}</span>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn edit-profile-btn">
                        <i class="fas fa-edit"></i> Éditer
                    </button>
                    <button class="btn delete-profile-btn">
                        <i class="fas fa-trash-alt"></i> Supprimer
                    </button>
                </div>
            </article>
        `;
    }).join('');

    // Ajouter les gestionnaires d'événements pour le téléchargement d'images
    document.querySelectorAll('.image-upload').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const profileId = e.target.closest('.profile-card').dataset.id;
            try {
                const imageUrl = await handleImageUpload(file, profileId);
                if (imageUrl) {
                    e.target.closest('.profile-header').querySelector('.profile-img').src = imageUrl;
                }
            } catch (error) {
                console.error('Erreur lors du téléchargement de l\'image:', error);
                alert('Erreur lors du téléchargement de l\'image');
            }
        });
    });

    attachInlineEditEvents();
}

function attachInlineEditEvents() {
    document.querySelectorAll('.edit-profile-btn').forEach(button => {
        const row = button.closest('article');
        button.addEventListener('click', () => enableInlineEditing(row));
    });

    document.querySelectorAll('.delete-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const profileId = button.closest('article').dataset.id;
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
  const diplomas = diplomasInput ? diplomasInput.trim() : ''; // Garder comme chaîne
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

function enableInlineEditing(card) {
    const fields = card.querySelectorAll('.editable');
    const profileId = card.dataset.id;
    
    // Conserver l'image existante
    const existingImage = card.querySelector('.profile-img');
    const currentImageUrl = existingImage.src;
    let imageId = card.dataset.imageId;
    
    // Activer l'édition
    fields.forEach(field => {
        field.contentEditable = true;
        field.classList.add('editing');
        
        if (field.textContent.trim() === '') {
            field.textContent = '';
        }
        
        field.addEventListener('focus', () => {
            if (field.textContent === ' ') field.textContent = '';
        });
    });

    // Gestion de l'image
    const imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/*';
    imgInput.style.display = 'none';
    imgInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const newImageId = await uploadProfileImage(file);
                existingImage.src = URL.createObjectURL(file);
                imageId = newImageId; // Mettre à jour l'ID de l'image
            } catch (error) {
                console.error("Erreur upload image :", error);
                alert("Échec de l'upload de l'image : " + error.message);
                // Restaurer l'image précédente en cas d'erreur
                existingImage.src = currentImageUrl;
            }
        }
    });
    card.querySelector('.profile-header').appendChild(imgInput);

    // Ajouter un bouton visuel pour déclencher l'upload
    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = '📷 Changer photo';
    uploadBtn.className = 'btn upload-btn';
    uploadBtn.onclick = () => imgInput.click();
    card.querySelector('.card-actions').prepend(uploadBtn);

    // Bouton de sauvegarde
    const saveBtn = card.querySelector('.edit-profile-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '💾 Sauvegarder';
    saveBtn.classList.add('save-mode');

    const saveHandler = async () => {
        try {
            const updatedData = {
                name: card.querySelector('[data-field="name"]').textContent.trim(),
                job: card.querySelector('[data-field="job"]').textContent.trim(),
                email: card.querySelector('[data-field="email"]').textContent.trim(),
                phone: card.querySelector('[data-field="phone"]').textContent.trim(),
                website: card.querySelector('[data-field="website"]').textContent.trim(),
                diplomas: card.querySelector('[data-field="diplomas"]').textContent.split(',').map(d => d.trim()),
                description: card.querySelector('[data-field="description"]').textContent.trim(),
                imageId: imageId // Utiliser l'ID de l'image existante ou nouvelle
            };

            await updateAdminProfile(profileId, updatedData);
            alert('Modifications sauvegardées avec succès !');
            window.location.reload();
        } catch (error) {
            console.error("Échec de la sauvegarde :", error);
            alert("Erreur lors de la sauvegarde : " + error.message);
        }
    };

    saveBtn.replaceWith(saveBtn.cloneNode(true)); // Réinitialise complètement les listeners
    const newSaveBtn = card.querySelector('.edit-profile-btn');
    newSaveBtn.addEventListener('click', saveHandler);
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

// Ajout d'un indicateur de chargement
async function handleProfileAction(action) {
    const loader = document.createElement('div');
    loader.className = 'global-loader';
    document.body.appendChild(loader);
    
    try {
        await action();
    } catch (error) {
        console.error("Erreur :", error);
        alert("Erreur : " + error.message);
    } finally {
        loader.remove();
    }
}

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const backButton = document.getElementById('back-to-top');
    
    if (scrollTop > 300) {
        backButton.classList.add('visible');
    } else {
        backButton.classList.remove('visible');
    }
});

document.getElementById('back-to-top').addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Fonction pour gérer le téléchargement d'image
async function handleImageUpload(file, profileId) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const imageUrl = await uploadProfileImage(formData);
        if (imageUrl) {
            await updateAdminProfile(profileId, { imageUrl });
            return imageUrl;
        }
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        throw error;
    }
}


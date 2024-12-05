import { fetchProfilesWithAssets } from '../../js/contentful.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des profils...");

    try {
        const profiles = await fetchProfilesWithAssets();
        if (profiles && profiles.length > 0) {
            displayAllProfiles(profiles);
        } else {
            document.getElementById('profile-content').innerHTML = "<p>Aucun profil disponible pour le moment.</p>";
        }
    } catch (error) {
        console.error("Erreur lors du chargement des profils :", error);
        document.getElementById('profile-content').innerHTML = "<p>Une erreur est survenue lors du chargement des profils.</p>";
    }
});

function displayAllProfiles(profiles) {
  const container = document.getElementById('profile-content');

  if (!container) {
      console.error("Conteneur introuvable pour afficher les profils.");
      return;
  }

  container.innerHTML = profiles.map(profile => `
      <div class="profile-card">
          <img src="${profile.imageUrl || './images/default-profile.jpg'}" alt="${profile.name}" class="profile-image">
          <h3>${profile.name}</h3>
          <p><strong>Métier :</strong> ${profile.job}</p>
          <p><strong>Email :</strong> <a href="mailto:${profile.email}">${profile.email}</a></p>
          <p><strong>Téléphone :</strong> <a href="tel:${profile.phone}">${profile.phone}</a></p>
          <p><strong>Site web :</strong> <a href="${profile.website}" target="_blank">${profile.website}</a></p>
          <div class="profile-description">
              <strong>Description :</strong>
              <span class="short-description">${truncateDescription(profile.description || '', 200)}</span>
              <span class="full-description hidden">${profile.description || ''}</span>
              ${profile.description && profile.description.length > 200 
                  ? `<div class="description-btn-container">
                      <button class="toggle-description">Lire la suite</button>
                     </div>` 
                  : ''}
          </div>
          ${profile.diplomas.length > 0 
              ? `<div class="degrees">${profile.diplomas.map(degree => `<span class="tag">${degree}</span>`).join('')}</div>` 
              : ''}
      </div>
  `).join('');

  addDescriptionToggle();
}


function truncateDescription(description, maxLength) {
    if (!description || description.length <= maxLength) return description;
    return description.slice(0, maxLength) + '...';
}

function addDescriptionToggle() {
    document.querySelectorAll('.toggle-description').forEach(button => {
        button.addEventListener('click', (e) => {
            const descriptionContainer = e.target.closest('.profile-description');
            const shortDesc = descriptionContainer.querySelector('.short-description');
            const fullDesc = descriptionContainer.querySelector('.full-description');
            const isExpanded = !fullDesc.classList.contains('hidden');

            if (isExpanded) {
                shortDesc.style.display = 'inline';
                fullDesc.classList.add('hidden');
                e.target.textContent = 'Lire la suite';
            } else {
                shortDesc.style.display = 'none';
                fullDesc.classList.remove('hidden');
                e.target.textContent = 'Lire moins';
            }
        });
    });
}

import { fetchContent, fetchProfilesWithAssets } from '../../js/contentful.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const workshops = await fetchWorkshops();
        displayWorkshops(workshops);
    } catch (error) {
        console.error("Erreur lors du chargement des ateliers :", error);
    }
});

// Récupère les ateliers depuis Contentful
async function fetchWorkshops() {
    const workshops = await fetchContent('workshop');
    const profiles = await fetchProfilesWithAssets(); // Récupère les données complètes des profils

    return workshops.map(workshop => {
        const profilesRefs = workshop.fields.profiles || [];
        const enrichedProfiles = profilesRefs.map(profileRef => {
            const fullProfile = profiles.find(profile => profile.id === profileRef.sys.id);
            return fullProfile || null; // Retourne le profil complet ou null s'il n'est pas trouvé
        }).filter(profile => profile !== null); // Filtrer les profils non valides

        return {
            title: workshop.fields.title || 'Sans titre',
            description: workshop.fields.description || 'Pas de description',
            date: new Date(workshop.fields.date || Date.now()),
            recurrence: workshop.fields.recurrence || 'Non spécifiée',
            profiles: enrichedProfiles,
        };
    });
}

function displayWorkshops(workshops) {
    const container = document.getElementById('workshop-list');
    container.innerHTML = workshops.map(workshop => `
        <div class="workshop-card">
            <h3>${workshop.title}</h3>
            <p>${workshop.description}</p>
            <p><strong>Date :</strong> ${workshop.date.toLocaleDateString()}</p>
            <p><strong>Récurrence :</strong> ${workshop.recurrence}</p>
            <div class="profiles">
                ${workshop.profiles.map(profile => `
                    <div class="profile-container">
                        <img src="${profile.imageUrl || '../../assets/image/default-profile.png'}" alt="${profile.name}">
                        <div class="profile-details">
                            <h5>${profile.name}</h5>
                            <p><strong>Métier :</strong> ${profile.job}</p>
                            ${profile.email ? `<p>Email: <a href="mailto:${profile.email}">${profile.email}</a></p>` : ''}
                            ${profile.phone ? `<p>Tél: ${profile.phone}</p>` : ''}
                            ${profile.website ? `<p><a href="${profile.website}" target="_blank">Site Web</a></p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}







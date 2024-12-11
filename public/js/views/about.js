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

    container.innerHTML = profiles.map(profile => {
        const imageUrl = typeof profile.imageUrl === 'string' ? profile.imageUrl.trim() : '';
        const name = typeof profile.name === 'string' ? profile.name.trim() : '';
        const job = typeof profile.job === 'string' ? profile.job.trim() : '';
        const email = typeof profile.email === 'string' ? profile.email.trim() : '';
        const phone = typeof profile.phone === 'string' ? profile.phone.trim() : '';
        const website = typeof profile.website === 'string' ? profile.website.trim() : '';
        const description = typeof profile.description === 'string' ? profile.description.trim() : '';

        // Afficher l'image uniquement s'il existe une URL non vide
        const imageHtml = (imageUrl && imageUrl.length > 0)
            ? `<img src="${imageUrl}" alt="${name}" class="profile-image">`
            : '';

        const nameHtml = name ? `<h3>${name}</h3>` : '';
        const jobHtml = job ? `<p><strong>Métier :</strong> ${job}</p>` : '';
        const emailHtml = email ? `<p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>` : '';
        const phoneHtml = phone ? `<p><strong>Téléphone :</strong> <a href="tel:${phone}">${phone}</a></p>` : '';
        const websiteHtml = website ? `<p><strong>Site web :</strong> <a href="${website}" target="_blank">${website}</a></p>` : '';

        let descriptionHtml = '';
        if (description && description.length > 0) {
            const truncatedDesc = truncateDescription(description, 200);
            const showToggle = description.length > 200;
            descriptionHtml = `
                <div class="profile-description">
                    <strong>Description :</strong>
                    <span class="short-description">${truncatedDesc}</span>
                    <span class="full-description hidden">${description}</span>
                    ${showToggle 
                        ? `<div class="description-btn-container"><button class="toggle-description">Lire la suite</button></div>` 
                        : ''}
                </div>`;
        }

        const diplomasArray = Array.isArray(profile.diplomas)
            ? profile.diplomas.map(d => typeof d === 'string' ? d.trim() : '').filter(d => d !== '')
            : [];

        const diplomasHtml = (diplomasArray.length > 0)
            ? `<div class="degrees">${diplomasArray.map(degree => `<span class="tag">${degree}</span>`).join('')}</div>`
            : '';

        return `
            <div class="profile-card">
                ${imageHtml}
                ${nameHtml}
                ${jobHtml}
                ${emailHtml}
                ${phoneHtml}
                ${websiteHtml}
                ${descriptionHtml}
                ${diplomasHtml}
            </div>
        `;
    }).join('');

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

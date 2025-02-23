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

        const imageHtml = (imageUrl && imageUrl.length > 0)
            ? `<img src="${imageUrl}" alt="${name}" class="profile-image">`
            : '';

        const nameHtml = name ? `<h3>${name}</h3>` : '';
        const jobHtml = job ? `<p><strong>Métier :</strong> ${job}</p>` : '';
        const emailHtml = email ? `<p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>` : '';
        const phoneHtml = phone 
            ? `<p class="profile-phone"><strong>Téléphone :</strong> <a href="tel:${phone.replace(/\s/g, '')}">${formatPhoneNumber(phone)}</a></p>` 
            : '';
        const websiteHtml = website ? `<p><strong>Site web :</strong> <a href="${website}" target="_blank">${website}</a></p>` : '';

        // Simplification de l'affichage de la description
        const descriptionHtml = description 
            ? `<div class="profile-description"><strong>Description :</strong> ${description}</div>`
            : '';

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
}

function formatPhoneNumber(phone) {
    const phoneStr = typeof phone === 'number' ? String(phone) : phone;
    const cleaned = phoneStr.replace(/\D/g, '');
    const withLeadingZero = cleaned.length === 9 ? '0' + cleaned : cleaned;
    
    if (withLeadingZero.length === 10) {
        return withLeadingZero.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    
    return phoneStr;
}

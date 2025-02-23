import { SPACE_ID, ACCESS_TOKEN } from './contentful.js';

export async function fetchProfiles() {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=profile&include=2`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erreur lors de la récupération des profils');
        const data = await response.json();

        return data.items.map(item => {
            // Récupération de l'image depuis includes.Asset
            const imageRef = item.fields.image?.sys?.id;
            const imageAsset = data.includes?.Asset?.find(asset => asset.sys.id === imageRef);
            const imageUrl = imageAsset?.fields?.file?.url
                ? `https:${imageAsset.fields.file.url}`
                : '/assets/image/default-profile.png'; // Chemin corrigé

            return {
                id: item.sys.id,
                name: item.fields.name || 'Sans nom',
                job: item.fields.job || 'Profession non spécifiée',
                imageUrl: imageUrl,
                link: `about.html?id=${item.sys.id}`
            };
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des profils :", error);
        return [];
    }
}

export function displayProfiles(profiles) {
    const container = document.querySelector('.carousel-container');
    if (!container) {
        console.error("Conteneur du carrousel introuvable !");
        return;
    }

    container.innerHTML = profiles.map(profile => {
        return `
            <div class="profile-card">
                <img src="${profile.imageUrl}" alt="${profile.name}" onerror="this.src='/assets/image/default-profile.png'">
                <h3>${profile.name}</h3>
                <p>${profile.job}</p>
                <a href="/public/views/about.html" class="view-profile-btn">Voir le profil</a>
            </div>
        `;
    }).join('');
}

export function initCarousel(profiles) {
    const container = document.querySelector(".carousel-container");
    let currentIndex = 0;
    let autoScroll;

    if (!container) {
        console.error("Conteneur du carrousel introuvable !");
        return;
    }

    const updateCarousel = () => {
        const cards = document.querySelectorAll(".profile-card");
        const totalProfiles = profiles.length;

        cards.forEach((card, index) => {
            card.classList.remove("active", "prev", "next");

            if (index === currentIndex) {
                card.classList.add("active");
            } else if (index === (currentIndex - 1 + totalProfiles) % totalProfiles) {
                card.classList.add("prev");
            } else if (index === (currentIndex + 1) % totalProfiles) {
                card.classList.add("next");
            }
        });
    };

    const nextProfile = () => {
        currentIndex = (currentIndex + 1) % profiles.length;
        updateCarousel();
    };

    const prevProfile = () => {
        currentIndex = (currentIndex - 1 + profiles.length) % profiles.length;
        updateCarousel();
    };

    const startAutoScroll = () => {
        autoScroll = setInterval(nextProfile, 2000);
    };

    const stopAutoScroll = () => {
        clearInterval(autoScroll);
    };

    const prevButton = document.getElementById("prev-profile");
    const nextButton = document.getElementById("next-profile");

    if (prevButton) {
        prevButton.addEventListener("click", () => {
            stopAutoScroll();
            prevProfile();
            startAutoScroll();
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", () => {
            stopAutoScroll();
            nextProfile();
            startAutoScroll();
        });
    }

    updateCarousel();
    startAutoScroll();

    container.addEventListener("mouseover", stopAutoScroll);
    container.addEventListener("mouseout", startAutoScroll);
}

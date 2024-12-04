import { SPACE_ID, ACCESS_TOKEN } from './contentful.js';

export async function fetchProfiles() {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=profile&include=2`;

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors de la récupération des profils');
      const data = await response.json();
      console.log("Données brutes des profils :", data);

      return data.items.map(item => {
          // Récupération de l'image depuis includes.Asset
          const imageRef = item.fields.image?.sys?.id;
          const imageAsset = data.includes?.Asset?.find(asset => asset.sys.id === imageRef);
          const imageUrl = imageAsset?.fields?.file?.url
              ? `https:${imageAsset.fields.file.url}` // URL complète de l'image
              : null;

          if (!imageUrl) {
              console.warn("Image manquante ou mal structurée pour le profil :", item);
          }

          return {
              id: item.sys.id,
              name: item.fields.name,
              job: item.fields.job,
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

  profiles.forEach(profile => {
      const profileCard = document.createElement('div');
      profileCard.classList.add('profile-card');
      profileCard.innerHTML = `
          <img src="${profile.imageUrl || './images/default-profile.jpg'}" alt="${profile.name}">
          <h3>${profile.name}</h3>
          <p>${profile.job}</p>
          <a href="${profile.link}">Voir le profil</a>
      `;
      container.appendChild(profileCard);
  });

  console.log("Profils affichés :", profiles);
}


export function initCarousel(profiles) {
  const container = document.querySelector(".carousel-container");
  let currentIndex = 0; // Index du profil central
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
              card.classList.add("active"); // Profil central
          } else if (index === (currentIndex - 1 + totalProfiles) % totalProfiles) {
              card.classList.add("prev"); // Profil à gauche
          } else if (index === (currentIndex + 1) % totalProfiles) {
              card.classList.add("next"); // Profil à droite
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
      autoScroll = setInterval(nextProfile, 3500); // Défilement automatique toutes les 5 secondes
  };

  const stopAutoScroll = () => {
      clearInterval(autoScroll);
  };

  // Événements sur les boutons de navigation
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

  // Initialisation
  updateCarousel();
  startAutoScroll();

  // Pause au survol
  container.addEventListener("mouseover", stopAutoScroll);
  container.addEventListener("mouseout", startAutoScroll);
}




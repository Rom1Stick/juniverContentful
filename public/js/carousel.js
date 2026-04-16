import { SPACE_ID, ACCESS_TOKEN } from './contentful.js';

export async function fetchProfiles() {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=profile&include=2`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur récupération des profils');
    const data = await response.json();
    return data.items.map((item) => {
      const imageRef = item.fields.image?.sys?.id;
      const imageAsset = data.includes?.Asset?.find((asset) => asset.sys.id === imageRef);
      const imageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : null;
      return {
        id: item.sys.id,
        name: item.fields.name,
        job: item.fields.job,
        description: item.fields.description,
        imageUrl,
        link: `/public/views/about.html?id=${item.sys.id}`,
      };
    });
  } catch (error) {
    console.error('Erreur récupération profils :', error);
    return [];
  }
}

// Rendu Symbiose — cartes `.t-card`
// Le carousel défile automatiquement en boucle (CSS marquee + duplication des cards).
// Pause au hover/focus, pilotage optionnel via les boutons prev/next.
function cardMarkup(p, i) {
  const imageHtml = p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy">` : '';
  const bio = p.description
    ? p.description.substring(0, 110) + (p.description.length > 110 ? '…' : '')
    : '';
  return `
    <a class="t-card" href="${p.link}">
      <div class="portrait">
        ${imageHtml}
        <span class="leaf-tag">◦ ${String(i + 1).padStart(2, '0')}</span>
      </div>
      <h4>${p.name || ''}</h4>
      <div class="role">${p.job || ''}</div>
      ${bio ? `<p class="bio">${bio}</p>` : ''}
      <span class="see">Voir le profil →</span>
    </a>
  `;
}

export function displayProfiles(profiles) {
  const container = document.querySelector('.carousel-container');
  if (!container) return;
  if (!profiles?.length) {
    container.innerHTML = '<p class="carousel-empty">Aucun profil à afficher pour le moment.</p>';
    return;
  }

  // Deux copies à plat pour que translate(-50%) boucle parfaitement.
  // La seconde série est marquée aria-hidden pour éviter la répétition lecteur d'écran.
  const originals = profiles.map((p, i) => cardMarkup(p, i)).join('');
  const copies = profiles
    .map((p, i) => cardMarkup(p, i))
    .join('')
    .replace(/class="t-card"/g, 'class="t-card" aria-hidden="true" tabindex="-1"');
  container.innerHTML = `
    <div class="carousel-track">${originals}${copies}</div>
  `;

  // Durée proportionnelle au nombre de praticiens (≈ 4s/card)
  const track = container.querySelector('.carousel-track');
  const duration = Math.max(20, profiles.length * 4);
  track.style.setProperty('--carousel-duration', `${duration}s`);
}

export function initCarousel(profiles) {
  const container = document.querySelector('.carousel-container');
  if (!container || !profiles?.length) return;
  const track = container.querySelector('.carousel-track');
  if (!track) return;

  // Pause au focus clavier (accessibilité)
  container.addEventListener('focusin', () => track.classList.add('is-paused'));
  container.addEventListener('focusout', () => track.classList.remove('is-paused'));

  // Boutons prev/next : pause et petit nudge en translate
  const prev = document.getElementById('prev-profile');
  const next = document.getElementById('next-profile');
  let nudge = 0;
  const step = () => {
    const first = track.querySelector('.t-card');
    if (!first) return 0;
    return first.getBoundingClientRect().width + 20; // +gap
  };
  const applyNudge = () => {
    track.style.setProperty('--carousel-nudge', `${nudge}px`);
    track.classList.add('is-paused');
    clearTimeout(applyNudge._t);
    applyNudge._t = setTimeout(() => track.classList.remove('is-paused'), 4000);
  };
  prev?.addEventListener('click', () => {
    nudge += step();
    applyNudge();
  });
  next?.addEventListener('click', () => {
    nudge -= step();
    applyNudge();
  });
}

import '../chrome.js';
import '../mycel.js';
import '../siteCopy.js';
import { fetchProfilesWithAssets, asText } from '../contentful.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const profiles = await fetchProfilesWithAssets();
    const container = document.getElementById('profile-content');
    if (!container) return;
    if (!profiles?.length) {
      container.innerHTML = '<p>Aucun profil disponible pour le moment.</p>';
      return;
    }
    renderProfiles(container, profiles);
  } catch (err) {
    console.error('Erreur chargement profils :', err);
  }
});

function truncate(str, n) {
  if (!str || str.length <= n) return str;
  return `${str.slice(0, n)}…`;
}

function renderProfiles(container, profiles) {
  container.innerHTML = profiles
    .map((p) => {
      const name = asText(p.name);
      const job = asText(p.job);
      const email = asText(p.email);
      const phone = asText(p.phone);
      const website = asText(p.website);
      const description = asText(p.description);
      const imageUrl = asText(p.imageUrl);
      const diplomas = Array.isArray(p.diplomas)
        ? p.diplomas.filter(Boolean)
        : typeof p.diplomas === 'string' && p.diplomas.trim()
          ? p.diplomas
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean)
          : [];

      const imgHtml = imageUrl ? `<img src="${imageUrl}" alt="${name}">` : '';
      const hasPhone = phone && phone !== '0' && phone !== 'Non spécifié';
      const hasWebsite = website && website !== 'Non spécifié' && /^https?:\/\//i.test(website);
      const contactHtml = [
        email ? `<span class="contact-line">✉ <a href="mailto:${email}">${email}</a></span>` : '',
        hasPhone ? `<span class="contact-line">☎ <a href="tel:${phone}">${phone}</a></span>` : '',
        hasWebsite
          ? `<span class="contact-line">↗ <a href="${website}" target="_blank" rel="noopener">Site web</a></span>`
          : '',
      ]
        .filter(Boolean)
        .join('');

      const descHtml = description
        ? `
          <div class="profile-description">
            <p class="short-description">${truncate(description, 160)}</p>
            <p class="full-description hidden">${description}</p>
            ${description.length > 160 ? '<button class="toggle-description">Lire la suite</button>' : ''}
          </div>`
        : '';

      const tagsHtml = diplomas.length
        ? `<div class="degrees">${diplomas.map((d) => `<span class="tag">${d}</span>`).join('')}</div>`
        : '';

      return `
        <article class="profile-card">
          ${imgHtml}
          <h3>${name}</h3>
          ${job ? `<div class="role">${job}</div>` : ''}
          ${contactHtml}
          ${descHtml}
          ${tagsHtml}
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('.toggle-description').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const wrap = e.target.closest('.profile-description');
      const shortEl = wrap.querySelector('.short-description');
      const fullEl = wrap.querySelector('.full-description');
      const expanded = !fullEl.classList.contains('hidden');
      if (expanded) {
        shortEl.classList.remove('hidden');
        fullEl.classList.add('hidden');
        e.target.textContent = 'Lire la suite';
      } else {
        shortEl.classList.add('hidden');
        fullEl.classList.remove('hidden');
        e.target.textContent = 'Lire moins';
      }
    });
  });
}

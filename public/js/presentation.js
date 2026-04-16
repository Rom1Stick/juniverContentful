import { fetchContent } from './contentful.js';

export async function fetchPresentation() {
  try {
    const items = await fetchContent('presentation');
    return items.length > 0 ? items[0].fields : null;
  } catch (error) {
    console.error('Erreur récupération présentation :', error);
    return null;
  }
}

// Rend un bloc style Symbiose `.sec-head`-inspiré (title + lede).
// Les éléments sont marqués data-editable pour pouvoir être surchargés via siteCopy
// depuis l'éditeur inline admin (override du contenu Contentful `presentation`).
export function displayPresentation(presentation, containerId = 'presentation') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const fallbackTitle = presentation?.title || '';
  const fallbackText = presentation?.text || '';

  container.innerHTML = `
    <span class="sec-eyebrow" data-editable="presentation.eyebrow">Notre raison d'être</span>
    <h2 data-editable="presentation.title">${fallbackTitle}</h2>
    <p data-editable="presentation.text">${fallbackText}</p>
  `;
}

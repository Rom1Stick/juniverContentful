import { sanitizeRichHTML, escapeText } from './contentSanitize.js';
import { SPACE_ID, ACCESS_TOKEN } from './contentful.js';

const queryParams = new URLSearchParams(window.location.search);
const articleId = queryParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('article-content');
  if (!contentDiv) return;

  if (!articleId) {
    contentDiv.innerHTML = '<p>Article introuvable ou non spécifié.</p>';
    return;
  }
  fetchArticleDetails(articleId);
});

async function fetchArticleDetails(id) {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries/${id}?access_token=${ACCESS_TOKEN}&include=2`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.fields) throw new Error('Article sans champs');

    const title = data.fields.title || 'Titre indisponible';
    const content = data.fields.content || '';
    const summary = data.fields.summary || '';

    let imageUrl = null;
    if (data.fields.image) {
      imageUrl =
        resolveImageUrl(data.fields.image, data.includes) ||
        (await fetchAsset(data.fields.image.sys.id));
    }

    const contentDiv = document.getElementById('article-content');
    contentDiv.innerHTML = `
      <span class="sec-eyebrow">Journal du cercle</span>
      <h2>${escapeText(title)}</h2>
      ${summary ? `<p class="article-lead">${escapeText(summary)}</p>` : ''}
      ${imageUrl ? `<img src="${sanitizeURL(imageUrl)}" alt="${escapeText(title)}">` : ''}
      <div class="article-body">${sanitizeRichHTML(content)}</div>
    `;
  } catch (err) {
    console.error('Erreur détails article :', err);
    const contentDiv = document.getElementById('article-content');
    if (contentDiv) contentDiv.innerHTML = "<p>Impossible de charger l'article.</p>";
  }
}

function resolveImageUrl(imageRef, includes) {
  if (!imageRef?.sys || !includes?.Asset) return null;
  const asset = includes.Asset.find((a) => a.sys.id === imageRef.sys.id);
  return asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : null;
}

async function fetchAsset(assetId) {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/assets/${assetId}?access_token=${ACCESS_TOKEN}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.fields?.file?.url ? `https:${data.fields.file.url}` : null;
  } catch (err) {
    console.error('Erreur asset :', err);
    return null;
  }
}

function sanitizeURL(url) {
  try {
    return new URL(url).href;
  } catch {
    return '#';
  }
}

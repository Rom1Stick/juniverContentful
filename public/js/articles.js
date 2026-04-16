import { fetchContent } from './contentful.js';
import { renderArticleVisual, pickVariantIndex } from './articleVisuals.js';

function resolveArticleImage(article, includes) {
  const ref = article?.fields?.image?.sys?.id;
  if (!ref || !includes?.Asset) return null;
  const asset = includes.Asset.find((a) => a.sys.id === ref);
  const url = asset?.fields?.file?.url;
  return url ? `https:${url}` : null;
}

function resolveCategory(article, includes) {
  const refs = article?.fields?.category || [];
  if (!refs.length || !includes?.Entry) return null;
  const first = refs[0];
  const entry = includes.Entry.find((e) => e.sys.id === first.sys.id);
  return entry?.fields?.name || null;
}

export async function fetchArticles() {
  return fetchContent('article');
}

// Rendu Symbiose — cards `.art`
export function displayArticles(articles, containerId = 'content', includes = null) {
  const contentDiv = document.getElementById(containerId);
  if (!contentDiv) return;
  contentDiv.innerHTML = '';

  if (!articles || articles.length === 0) {
    contentDiv.innerHTML = '<p>Aucun article disponible.</p>';
    return;
  }

  articles.forEach((article) => {
    const { title, summary } = article.fields || {};
    const articleId = article.sys.id;
    if (!title) return;

    const imgUrl = resolveArticleImage(article, includes);
    const cat = resolveCategory(article, includes);
    const coverHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${title}">`
      : renderArticleVisual(articleId);
    const catHtml = cat ? `<span class="cat">${cat}</span>` : '';
    const variantClass = imgUrl
      ? ''
      : ` cover--visual cover--visual-${pickVariantIndex(articleId)}`;

    const el = document.createElement('a');
    el.className = 'art';
    el.href = `details.html?id=${articleId}`;
    el.innerHTML = `
      <div class="cover${variantClass}">${coverHtml}${catHtml}</div>
      <div class="body">
        <h5>${title}</h5>
        <p class="sum">${summary || ''}</p>
        <div class="foot">
          <span>Juniver · lecture courte</span>
          <span class="read">Lire →</span>
        </div>
      </div>
    `;
    contentDiv.appendChild(el);
  });
}

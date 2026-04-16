import './chrome.js';
import './mycel.js';
import './siteCopy.js';
import { fetchArticles, displayArticles } from './articles.js';
import { displayCategories } from './categories.js';
import { fetchPresentation, displayPresentation } from './presentation.js';
import { fetchProfiles, displayProfiles, initCarousel } from './carousel.js';
import { renderHomeUpcoming } from './homeUpcoming.js';
import { renderArticleVisual, pickVariantIndex } from './articleVisuals.js';

const FEATURED_ID = '6GPaVLTj72gg4kuCDFUdMU';

document.addEventListener('DOMContentLoaded', async () => {
  const articles = await fetchArticles();
  const includes = articles?.[0]?.includes || null;

  const featured = articles.find((a) => a.sys.id === FEATURED_ID);
  const others = articles.filter((a) => a.sys.id !== FEATURED_ID);

  displayFeaturedArticle(featured, includes);
  displayArticles(others, 'content', includes);
  displayCategories(others, 'category-list', includes);

  // En parallèle : présentation + profils + prochains évènements
  await Promise.all([
    (async () => {
      const presentation = await fetchPresentation();
      displayPresentation(presentation);
    })(),
    (async () => {
      const profiles = await fetchProfiles();
      displayProfiles(profiles);
      initCarousel(profiles);
    })(),
    renderHomeUpcoming(),
  ]);
});

function displayFeaturedArticle(article, includes) {
  const container = document.getElementById('featured-article');
  if (!container) return;
  if (!article || !article.fields) {
    container.innerHTML = '<p>Aucun article vedette disponible.</p>';
    return;
  }

  const { title, summary, content } = article.fields;
  let imageUrl = null;
  const ref = article.fields.image?.sys?.id;
  if (ref && includes?.Asset) {
    const asset = includes.Asset.find((a) => a.sys.id === ref);
    if (asset?.fields?.file?.url) imageUrl = `https:${asset.fields.file.url}`;
  }

  const bgStyle = imageUrl
    ? `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`
    : '';
  const visualHtml = imageUrl ? '' : renderArticleVisual(article.sys.id);
  const variantClass = imageUrl
    ? ''
    : ` featured-img--visual featured-img--visual-${pickVariantIndex(article.sys.id)}`;

  container.innerHTML = `
    <div class="featured-img${variantClass}" style="${bgStyle}">
      ${visualHtml}
      <span class="badge">Journal du cercle</span>
      <span class="cap">« Ce qu'on appelle <em>la santé</em>, au fond. »</span>
    </div>
    <div class="featured-body">
      <h3>${title}</h3>
      <div class="meta">
        <span>Par le cercle</span>
        <span class="dot"></span>
        <span>Lecture courte</span>
      </div>
      <p>${summary || content || ''}</p>
      <a class="link" href="details.html?id=${article.sys.id}">Lire l'article complet →</a>
    </div>
  `;
}

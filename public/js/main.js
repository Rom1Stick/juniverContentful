import { fetchArticles, displayArticles } from './articles.js';
import { displayCategories } from './categories.js';
import { fetchPresentation, displayPresentation } from './presentation.js';
import { fetchProfiles, displayProfiles, initCarousel } from './carousel.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des données...");

    // Chargement des articles
    const articles = await fetchArticles();

    // Identifier l'article vedette et les autres articles
    const featuredArticleId = '6GPaVLTj72gg4kuCDFUdMU';
    const featuredArticle = articles.find(article => article.sys.id === featuredArticleId);
    const otherArticles = articles.filter(article => article.sys.id !== featuredArticleId);

    // Afficher l'article vedette
    displayFeaturedArticle(featuredArticle);

    // Afficher les autres articles
    displayArticles(otherArticles);

    // Chargement des catégories
    displayCategories(otherArticles);

    // Chargement de la présentation
    const presentation = await fetchPresentation();
    displayPresentation(presentation);

    const profiles = await fetchProfiles();
    displayProfiles(profiles);
    initCarousel(profiles);
});

function displayFeaturedArticle(article) {
    const featuredArticleContainer = document.getElementById('featured-article');
    if (!article || !article.fields) {
        featuredArticleContainer.innerHTML = '<p>Aucun article vedette disponible.</p>';
        return;
    }

    const { title, summary, content } = article.fields;
    featuredArticleContainer.innerHTML = `
        <article>
            <h2>${title}</h2>
            <p>${summary || content}</p>
            <a href="details.html?id=${article.sys.id}">Lire la suite</a>
        </article>
    `;
}

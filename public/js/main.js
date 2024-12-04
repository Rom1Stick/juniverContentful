import { fetchArticles, displayArticles } from './articles.js';
import { displayCategories } from './categories.js';
import { fetchPresentation, displayPresentation } from './presentation.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des données...");

    // Chargement des articles
    const articles = await fetchArticles();
    displayArticles(articles);

    // Chargement des catégories
    displayCategories(articles);

    // Chargement de la présentation
    const presentation = await fetchPresentation();
    displayPresentation(presentation);

    
});
console.log("Main.js chargé !");

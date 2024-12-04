import { fetchContent } from './contentful.js';
import { displayArticles } from './articles.js';

let allArticles = [];

export async function fetchCategories() {
    return await fetchContent('category');
}

export async function displayCategories(articles, containerId = 'category-list') {
    allArticles = articles; // Stocke les articles pour les filtres
    const categories = await fetchCategories();
    const categoryList = document.getElementById(containerId);

    categoryList.innerHTML = "";

    if (categories.length === 0) {
        categoryList.innerHTML = "<p>Aucune catégorie disponible.</p>";
        return;
    }

    categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `
            <button data-category-id="${category.sys.id}">${category.fields.name}</button>
        `;
        categoryList.appendChild(li);
    });

    // Ajoute des événements pour filtrer les articles
    document.querySelectorAll(`#${containerId} button`).forEach(button => {
        button.addEventListener('click', (e) => {
            const categoryId = e.target.getAttribute('data-category-id');
            const filteredArticles = filterArticlesByCategory(categoryId);
            displayArticles(filteredArticles);
        });
    });

    // Bouton pour réinitialiser les filtres
    const resetButton = document.createElement('button');
    resetButton.textContent = "Tous les articles";
    resetButton.addEventListener('click', () => displayArticles(allArticles));
    categoryList.appendChild(resetButton);
}

export function filterArticlesByCategory(categoryId) {
    return allArticles.filter(article => {
        const categories = article.fields.category || [];
        return categories.some(cat => cat.sys.id === categoryId);
    });
}

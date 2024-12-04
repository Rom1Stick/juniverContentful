import { fetchContent } from './contentful.js';

export async function fetchArticles() {
    return await fetchContent('article');
}

export function displayArticles(articles, containerId = 'content') {
    const contentDiv = document.getElementById(containerId);
    contentDiv.innerHTML = "";

    if (articles.length === 0) {
        contentDiv.innerHTML = "<p>Aucun article disponible.</p>";
        return;
    }

    articles.forEach(article => {
        const { title, summary } = article.fields || {};
        const articleId = article.sys.id;

        if (title && summary) {
            const articleEl = document.createElement('article');
            articleEl.innerHTML = `
                <h2>${title}</h2>
                <p>${summary}</p>
                <a href="details.html?id=${articleId}">Lire la suite</a>
            `;
            contentDiv.appendChild(articleEl);
        } else {
            console.warn("Article incomplet ou mal structuré :", article);
        }
    });
}

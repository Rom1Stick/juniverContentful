// Variables globales
let allArticles = []; // Tous les articles récupérés
let currentArticles = []; // Articles actuellement affichés après filtres

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des catégories et des articles...");

    // Charge et affiche les catégories
    await displayCategories();

    // Charge et affiche tous les articles
    const articles = await fetchArticles();
    console.log("Articles récupérés :", JSON.stringify(articles, null, 2));
    allArticles = articles; // Stocke tous les articles pour gérer les filtres
    currentArticles = allArticles; // Initialise la liste affichée avec tous les articles
    displayArticles(currentArticles);
});

// Fonction pour récupérer les articles via Contentful
async function fetchArticles() {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=article&include=2`;

    console.log("URL utilisée pour récupérer les articles :", url);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP lors de la récupération des articles : ${response.status}`);
        }

        const data = await response.json();
        console.log("Données brutes des articles récupérées :", JSON.stringify(data, null, 2));

        return data.items;
    } catch (error) {
        console.error("Erreur lors de la récupération des articles :", error);
        return [];
    }
}

// Fonction pour récupérer les catégories via Contentful
async function fetchCategories() {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=category`;

    console.log("URL utilisée pour récupérer les catégories :", url);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP lors de la récupération des catégories : ${response.status}`);
        }

        const data = await response.json();
        console.log("Données brutes des catégories récupérées :", JSON.stringify(data, null, 2));

        // Retourne les catégories sous forme simplifiée
        return data.items.map(category => ({
            id: category.sys.id,
            name: category.fields.name,
        }));
    } catch (error) {
        console.error("Erreur lors de la récupération des catégories :", error);
        return [];
    }
}

// Fonction pour afficher les catégories dans la barre de filtres
async function displayCategories() {
    const categories = await fetchCategories();
    const categoryList = document.getElementById('category-list');

    if (categories.length === 0) {
        console.warn("Aucune catégorie trouvée !");
        categoryList.innerHTML = "<p>Aucune catégorie disponible.</p>";
        return;
    }

    categories.forEach(category => {
        console.log(`Catégorie affichée : ID = ${category.id}, Nom = ${category.name}`);
        const li = document.createElement('li');
        li.innerHTML = `
            <button data-category-id="${category.id}">${category.name}</button>
        `;
        categoryList.appendChild(li);
    });

    // Ajoute des gestionnaires d'événements pour les filtres
    document.querySelectorAll('#category-list button').forEach(button => {
        button.addEventListener('click', (e) => {
            const categoryId = e.target.getAttribute('data-category-id');
            console.log("Catégorie sélectionnée :", categoryId);
            filterArticlesByCategory(categoryId);
        });
    });

    // Ajoute un bouton pour réinitialiser les filtres
    const resetButton = document.createElement('button');
    resetButton.textContent = "Tous les articles";
    resetButton.addEventListener('click', () => {
        console.log("Réinitialisation des filtres. Affichage de tous les articles.");
        displayArticles(allArticles);
    });
    categoryList.appendChild(resetButton);
}

// Fonction pour filtrer les articles par catégorie
function filterArticlesByCategory(categoryId) {
    console.log(`Filtrage des articles pour la catégorie : ${categoryId}`);
    currentArticles = allArticles.filter(article => {
        const articleCategories = article.fields?.category || []; // Récupère le tableau des catégories
        const hasCategory = articleCategories.some(cat => cat.sys?.id === categoryId); // Vérifie si l'ID correspond
        console.log(`Article : ${article.fields.title}, Catégories associées :`, articleCategories.map(cat => cat.sys?.id));
        return hasCategory;
    });

    console.log(`Articles filtrés pour la catégorie ${categoryId} :`, JSON.stringify(currentArticles, null, 2));

    displayArticles(currentArticles);
}

// Fonction pour afficher les articles dans la page
function displayArticles(articles) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ""; // Efface les anciens articles

    if (articles.length === 0) {
        console.warn("Aucun article trouvé à afficher !");
        contentDiv.innerHTML = "<p>Aucun article correspondant à cette catégorie.</p>";
        return;
    }

    articles.forEach(article => {
        console.log("Article affiché :", JSON.stringify(article, null, 2));

        if (article?.fields?.title && article?.fields?.summary) {
            const articleEl = document.createElement('article');
            articleEl.innerHTML = `
                <h2>${article.fields.title}</h2>
                <p>${article.fields.summary}</p>
                <a href="details.html?id=${article.sys.id}">Lire la suite</a>
            `;
            contentDiv.appendChild(articleEl);
        } else {
            console.warn("Article incomplet ou mal structuré :", article);
        }
    });
}

const queryParams = new URLSearchParams(window.location.search);
const articleId = queryParams.get('id'); // Récupère l'ID de l'article

// Clés sensibles : Remplacez ces valeurs par des variables d'environnement côté serveur si possible.
const SPACE_ID = '2tb1ogfq4qw9'; // ID de ton espace Contentful
const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Clé d'accès de ton API Contentful

document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('article-content');
    
    // Vérifie si l'élément `#article-content` existe
    if (!contentDiv) {
        console.error("L'élément #article-content est introuvable dans le DOM.");
        return;
    }

    if (!articleId) {
        console.error("Aucun ID d'article trouvé dans l'URL.");
        contentDiv.innerHTML = "<p>Article introuvable ou non spécifié.</p>";
    } else {
        console.log("Chargement des détails de l'article...");
        fetchArticleDetails(articleId);
    }
});

async function fetchArticleDetails(articleId) {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries/${articleId}?access_token=${ACCESS_TOKEN}&include=2`;

    try {
        console.log("URL de l'API utilisée :", url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();

        // Log des données reçues pour validation en développement
        console.log("Données reçues de l'API :", JSON.stringify(data, null, 2));

        // Validation des données reçues
        if (!data.fields) {
            throw new Error("L'article ne contient aucun champ 'fields'.");
        }

        // Récupération des détails de l'article
        const title = data.fields.title || "Titre indisponible";
        const content = data.fields.content || "Contenu indisponible";

        // Récupération de l'image
        let imageUrl = null;
        if (data.fields.image) {
            imageUrl = resolveImageUrl(data.fields.image, data.includes) || await fetchAsset(data.fields.image.sys.id);
        }

        console.log("URL de l'image résolue :", imageUrl);

        // Affichage des détails dans la page
        const contentDiv = document.getElementById('article-content');
        contentDiv.innerHTML = `
            <h2>${sanitizeHTML(title)}</h2>
            <div>${sanitizeHTML(content)}</div>
            ${imageUrl ? `<img src="${sanitizeURL(imageUrl)}" alt="${sanitizeHTML(title)}">` : "<p>Aucune image disponible.</p>"}
        `;
    } catch (error) {
        console.error("Erreur lors de la récupération des détails de l'article :", error);
        const contentDiv = document.getElementById('article-content');
        contentDiv.innerHTML = "<p>Impossible de charger l'article. Veuillez réessayer plus tard.</p>";
    }
}

// Résolution d'une image à partir des inclusions
function resolveImageUrl(imageRef, includes) {
    if (!imageRef || !imageRef.sys || !includes || !includes.Asset) {
        console.warn("Image référencée manquante ou incorrecte :", imageRef);
        return null;
    }

    const asset = includes.Asset.find(asset => asset.sys.id === imageRef.sys.id);
    if (!asset || !asset.fields?.file?.url) {
        console.warn("Aucune correspondance trouvée pour l'image référencée :", imageRef.sys.id);
        return null;
    }

    return `https:${asset.fields.file.url}`;
}

// Récupération d'un asset directement via l'API
async function fetchAsset(assetId) {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/assets/${assetId}?access_token=${ACCESS_TOKEN}`;
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP lors de la récupération de l'asset : ${response.status}`);
        }

        const data = await response.json();

        if (!data.fields?.file?.url) {
            throw new Error("L'asset récupéré ne contient pas de champ 'file.url'.");
        }

        console.log("Données de l'asset récupéré :", JSON.stringify(data, null, 2));
        return `https:${data.fields.file.url}`;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'asset :", error);
        return null;
    }
}

// Sécurisation des entrées utilisateur contre les injections HTML
function sanitizeHTML(content) {
    const div = document.createElement('div');
    div.innerText = content;
    return div.innerHTML;
}

// Sécurisation des URL
function sanitizeURL(url) {
    try {
        const sanitizedUrl = new URL(url);
        return sanitizedUrl.href;
    } catch {
        console.warn("URL invalide détectée :", url);
        return "#";
    }
}

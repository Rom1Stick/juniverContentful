import { fetchContent } from './contentful.js';

// Fonction pour récupérer la présentation depuis Contentful
export async function fetchPresentation() {
    try {
        const presentation = await fetchContent('presentation');
        return presentation.length > 0 ? presentation[0].fields : null;
    } catch (error) {
        console.error("Erreur lors de la récupération de la présentation :", error);
        return null;
    }
}

// Fonction pour afficher la présentation sur la page
export function displayPresentation(presentation, containerId = 'presentation') {
    if (!presentation) {
        console.warn("Aucune présentation disponible.");
        document.getElementById(containerId).innerHTML = "<p>Contenu non disponible.</p>";
        return;
    }

    const container = document.getElementById(containerId);
    container.innerHTML = `
        <h2>${presentation.title || "Notre Histoire"}</h2>
        <p>${presentation.text || "Aucune description fournie."}</p>
    `;
}

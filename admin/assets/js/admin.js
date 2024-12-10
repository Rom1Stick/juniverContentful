import { fetchContent, fetchProfilesWithAssets, fetchEventsWithAssets } from '../../public/js/contentful.js';

// Exemple d'utilisation dans le panneau d'administration
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement de l'administration...");
    
    try {
        const profiles = await fetchProfilesWithAssets();
        console.log("Profils chargés :", profiles);

        const events = await fetchEventsWithAssets();
        console.log("Événements chargés :", events);

        // Ajoutez ici vos fonctions pour afficher les données dans le panneau d'administration
    } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
    }
});

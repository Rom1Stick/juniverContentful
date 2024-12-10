document.addEventListener('DOMContentLoaded', () => {
    console.log("Panneau d'administration chargé avec succès !");

    // Vérification de l'état des services pour afficher des notifications si nécessaire
    const checkServiceStatus = async () => {
        const services = [
            { name: "Gestion des profils", url: "profiles.html" },
            { name: "Gestion des événements", url: "events.html" },
            { name: "Paramètres", url: "settings.html" },
            { name: "Statistiques", url: "analytics.html" },
        ];

        for (const service of services) {
            try {
                const response = await fetch(service.url, { method: "HEAD" });
                if (!response.ok) {
                    console.warn(`${service.name} est indisponible.`);
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification de ${service.name} :`, error);
            }
        }
    };

    // Lancer la vérification des services
    checkServiceStatus();
});

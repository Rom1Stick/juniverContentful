export const SPACE_ID = '2tb1ogfq4qw9'; // Remplace par ton Space ID
export const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Remplace par ton Access Token
const BASE_URL = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries`;

// Fonction générique pour récupérer des entrées
export async function fetchContent(contentType) {
    const url = `${BASE_URL}?access_token=${ACCESS_TOKEN}&content_type=${contentType}&include=2`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error(`Erreur lors de la récupération du contenu (${contentType}) :`, error);
        return [];
    }
}

// Fonction pour récupérer des profils avec leurs images (avec compatibilité pour animations)
export async function fetchProfilesWithAssets() {
    const url = `${BASE_URL}?access_token=${ACCESS_TOKEN}&content_type=profile&include=2`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const data = await response.json();

        const assets = data.includes?.Asset || [];
        return data.items.map(item => {
            const imageRef = item.fields.image?.sys?.id;
            const imageAsset = assets.find(asset => asset.sys.id === imageRef);
            const imageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : './images/default-profile.jpg';

            const diplomas = item.fields.diplomas
                ? item.fields.diplomas.split(',').map(degree => degree.trim())
                : []; // Si vide, renvoie un tableau vide

            return {
                id: item.sys.id,
                name: item.fields.name,
                job: item.fields.job,
                email: item.fields.email,
                phone: item.fields.phone,
                website: item.fields.website,
                description: item.fields.description,
                diplomas: diplomas,
                imageUrl: imageUrl,
                // Ajout pour animations
                link: `about.html?id=${item.sys.id}` // Lien utilisé pour les animations de profils
            };
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des profils :", error);
        return [];
    }
}

// Fonction pour récupérer des événements avec leurs assets
export async function fetchEventsWithAssets() {
    const url = `${BASE_URL}?access_token=${ACCESS_TOKEN}&content_type=event&include=2`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const data = await response.json();

        const assets = data.includes?.Asset || [];
        return data.items.map(item => {
            const imageRef = item.fields.image?.sys?.id;
            const imageAsset = assets.find(asset => asset.sys.id === imageRef);
            const imageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : null;

            return {
                id: item.sys.id,
                title: item.fields.title || 'Sans titre',
                description: item.fields.description || 'Pas de description',
                date: item.fields.date || 'Date inconnue',
                location: item.fields.location || 'Lieu non précisé',
                imageUrl: imageUrl,
                link: item.fields.link || null
            };
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des événements :", error);
        return [];
    }
}

const SPACE_ID = '2tb1ogfq4qw9'; // Remplace par ton Space ID
const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Remplace par ton Access Token
const CONTENT_TYPE = 'article'; // Nom du type de contenu

// Fonction pour récupérer les articles
async function fetchArticles() {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items; // Retourne les articles
    } catch (error) {
        console.error('Erreur lors de la récupération des articles :', error);
        return [];
    }
}


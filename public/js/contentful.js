const SPACE_ID = '2tb1ogfq4qw9'; // Remplace par ton Space ID
const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Remplace par ton Access Token
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

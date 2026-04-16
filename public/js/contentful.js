export const SPACE_ID = '2tb1ogfq4qw9'; // Remplace par ton Space ID
export const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Remplace par ton Access Token
const BASE_URL = `https://cdn.contentful.com/spaces/${SPACE_ID}/entries`;

// Fonction générique pour récupérer des entrées
export async function fetchContent(contentType) {
  const url = `${BASE_URL}?access_token=${ACCESS_TOKEN}&content_type=${contentType}&include=2`; // Niveau d'inclusion défini
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
    const data = await response.json();
    return data.items.map((item) => ({
      ...item,
      includes: data.includes || {}, // Inclure les données liées
    }));
  } catch (error) {
    console.error(`Erreur lors de la récupération du contenu (${contentType}) :`, error);
    return [];
  }
}

// Helper partagé : coerce toute valeur Contentful en string trimmed.
// Évite le bug `p.phone` number qui a fait planter about.js.
export function asText(v) {
  return String(v ?? '').trim();
}

// Récupère les profils + leurs images, avec coercion systématique des champs en string.
export async function fetchProfilesWithAssets() {
  const url = `${BASE_URL}?access_token=${ACCESS_TOKEN}&content_type=profile&include=2`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
    const data = await response.json();

    const assets = data.includes?.Asset || [];
    return data.items.map((item) => {
      const imageRef = item.fields.image?.sys?.id;
      const imageAsset = assets.find((asset) => asset.sys.id === imageRef);
      const imageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : '';

      const diplomasRaw = item.fields.diplomas;
      const diplomas = Array.isArray(diplomasRaw)
        ? diplomasRaw
        : typeof diplomasRaw === 'string' && diplomasRaw.trim()
          ? diplomasRaw
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean)
          : [];

      return {
        id: item.sys.id,
        name: asText(item.fields.name),
        job: asText(item.fields.job),
        email: asText(item.fields.email),
        phone: asText(item.fields.phone),
        website: asText(item.fields.website),
        description: asText(item.fields.description),
        diplomas,
        imageUrl,
        link: `about.html?id=${item.sys.id}`,
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des profils :', error);
    return [];
  }
}

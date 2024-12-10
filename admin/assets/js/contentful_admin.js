export const SPACE_ID = '2tb1ogfq4qw9'; // Space ID
export const CMA_ACCESS_TOKEN = 'CFPAT-e33QxYbkITX3yz5GBZTZ_mPokzxgx3Qf8xx9DMCL0cE'; // Content Management API Token
const BASE_CMA_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master/entries`;
const BASE_UPLOAD_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master/assets`;

// Fonction pour récupérer les profils
export async function fetchAdminProfiles() {
    const url = `${BASE_CMA_URL}?access_token=${CMA_ACCESS_TOKEN}&content_type=profile&include=2`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const data = await response.json();

        const assets = data.includes?.Asset || [];
        return data.items.map(item => {
            const imageRef = item.fields.image?.['en-US']?.sys?.id;
            const imageAsset = assets.find(asset => asset.sys.id === imageRef);
            const imageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : './images/default-profile.jpg';

            const diplomas = Array.isArray(item.fields.diplomas?.['en-US'])
                ? item.fields.diplomas['en-US']
                : [];

            return {
                id: item.sys.id,
                name: item.fields.name?.['en-US'] || 'Nom non spécifié',
                job: item.fields.job?.['en-US'] || 'Métier non spécifié',
                email: item.fields.email?.['en-US'] || 'Email non spécifié',
                phone: item.fields.phone?.['en-US'] || 'Non spécifié',
                website: item.fields.website?.['en-US'] || 'Non spécifié',
                description: item.fields.description?.['en-US'] || '',
                diplomas: diplomas,
                imageUrl: imageUrl,
            };
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des profils :", error);
        return [];
    }
}

// Fonction pour créer un profil
export async function createAdminProfile(profileData) {
    const url = BASE_CMA_URL;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        'X-Contentful-Content-Type': 'profile',
    };

    const data = {
        fields: {
            name: { 'en-US': profileData.name },
            job: { 'en-US': profileData.job },
            email: { 'en-US': profileData.email },
            phone: { 'en-US': parseInt(profileData.phone, 10) || 0 }, // Convertir en entier
            website: { 'en-US': profileData.website || '' },
            description: { 'en-US': profileData.description || '' },
            diplomas: { 'en-US': Array.isArray(profileData.diplomas) && profileData.diplomas.length > 0 
                ? profileData.diplomas.join(', ') 
                : '' }, // Toujours envoyer une chaîne
        },
    };

    if (profileData.imageId) {
        data.fields.image = {
            'en-US': {
                sys: { type: 'Link', linkType: 'Asset', id: profileData.imageId },
            },
        };
    }

    try {
        console.log("Données envoyées :", JSON.stringify(data, null, 2)); // Debug
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de la création détaillée :", errorData);
            throw new Error(`Erreur lors de la création du profil : ${response.status}`);
        }

        const createdProfile = await response.json();
        console.log("Profil créé avec succès :", createdProfile);

        await publishAdminProfile(createdProfile.sys.id);
        console.log("Profil publié avec succès !");
    } catch (error) {
        console.error("Erreur lors de la création ou de la publication du profil :", error.message || error);
        throw error;
    }
}

// Fonction pour publier un profil
export async function publishAdminProfile(profileId) {
    const url = `${BASE_CMA_URL}/${profileId}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        const entryResponse = await fetch(`${BASE_CMA_URL}/${profileId}`, { method: 'GET', headers });
        if (!entryResponse.ok) throw new Error(`Erreur lors de la récupération de l'entrée : ${entryResponse.status}`);
        const entryData = await entryResponse.json();
        const currentVersion = entryData.sys.version;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...headers,
                'X-Contentful-Version': currentVersion,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de la publication détaillée :", errorData);
            throw new Error(`Erreur lors de la publication du profil : ${response.status}`);
        }

        console.log("Profil publié avec succès !");
    } catch (error) {
        console.error("Erreur lors de la publication du profil :", error);
        throw error;
    }
}

// Fonction pour télécharger une image avec un titre
export async function uploadProfileImage(file) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) {
        throw new Error("Type de fichier non autorisé. Veuillez utiliser un fichier JPEG, PNG ou GIF.");
    }

    try {
        console.log("Début de l'upload de l'image...");
        const fileId = await uploadFileToContentful(file);

        const createAssetResponse = await fetch(BASE_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
                'Content-Type': 'application/vnd.contentful.management.v1+json',
            },
            body: JSON.stringify({
                fields: {
                    title: { 'en-US': file.name }, // Ajout du titre (nom du fichier)
                    file: {
                        'en-US': {
                            contentType: file.type,
                            fileName: file.name,
                            uploadFrom: {
                                sys: {
                                    type: 'Link',
                                    linkType: 'Upload',
                                    id: fileId,
                                },
                            },
                        },
                    },
                },
            }),
        });

        if (!createAssetResponse.ok) {
            const errorData = await createAssetResponse.json();
            console.error("Erreur lors de la création de l'asset :", errorData);
            throw new Error(`Erreur lors de la création de l'asset : ${createAssetResponse.status}`);
        }

        const assetData = await createAssetResponse.json();
        console.log("Asset créé :", assetData);

        await processAsset(assetData.sys.id);
        await publishAsset(assetData.sys.id);

        console.log("Asset publié avec succès !");
        return assetData.sys.id;
    } catch (error) {
        console.error("Erreur lors de l'upload de l'image :", error.message || error);
        throw error;
    }
}

// Fonction pour télécharger un fichier brut
async function uploadFileToContentful(file) {
    const url = `https://upload.contentful.com/spaces/${SPACE_ID}/uploads`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/octet-stream',
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: file,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de l'upload du fichier :", errorData);
            throw new Error(`Erreur lors de l'upload du fichier : ${response.status}`);
        }

        const data = await response.json();
        console.log("Fichier uploadé :", data);
        return data.sys.id;
    } catch (error) {
        console.error("Erreur lors de l'upload du fichier :", error.message || error);
        throw error;
    }
}

// Fonction pour traiter un asset
async function processAsset(assetId) {
    const url = `${BASE_UPLOAD_URL}/${assetId}/files/en-US/process`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        console.log(`Traitement de l'asset ID : ${assetId}...`);
        const response = await fetch(url, { method: 'PUT', headers });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors du traitement de l'asset :", errorData);
            throw new Error(`Erreur lors du traitement de l'asset : ${response.status}`);
        }

        console.log("Traitement de l'asset en cours...");
        await waitForAssetProcessing(assetId);
    } catch (error) {
        console.error("Erreur lors du traitement de l'asset :", error.message || error);
        throw error;
    }
}

// Fonction pour attendre que l'asset soit traité
async function waitForAssetProcessing(assetId) {
    const url = `${BASE_UPLOAD_URL}/${assetId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
    };

    let retries = 10;
    while (retries > 0) {
        const response = await fetch(url, { method: 'GET', headers });

        if (!response.ok) throw new Error(`Erreur lors de la vérification de l'asset : ${response.status}`);

        const assetData = await response.json();
        const fileDetails = assetData.fields?.file?.['en-US'];

        if (fileDetails && fileDetails.url && fileDetails.details?.image?.width) {
            console.log("L'asset est prêt avec toutes les métadonnées !");
            return;
        }

        console.log(`Asset non prêt. Réessai dans 2 secondes... (${retries} restantes)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries--;
    }

    throw new Error("L'asset n'a pas été complètement traité dans le temps imparti.");
}

// Fonction pour publier un asset
export async function publishAsset(assetId) {
    const assetUrl = `${BASE_UPLOAD_URL}/${assetId}`;
    const publishUrl = `${assetUrl}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        // Récupérer l'asset pour vérifier qu'il est prêt
        const assetResponse = await fetch(assetUrl, { method: 'GET', headers });
        if (!assetResponse.ok) throw new Error(`Erreur lors de la récupération de l'asset : ${assetResponse.status}`);
        const assetData = await assetResponse.json();

        // Vérifiez les métadonnées de l'asset
        const fileDetails = assetData.fields?.file?.['en-US'];
        if (!fileDetails || !fileDetails.url || !fileDetails.contentType || !fileDetails.details?.image) {
            console.error("Métadonnées incomplètes :", fileDetails);
            throw new Error("L'asset n'est pas complètement traité ou manque de métadonnées nécessaires.");
        }

        console.log("Métadonnées de l'asset :", fileDetails);

        const currentVersion = assetData.sys.version;

        // Publier l'asset
        const response = await fetch(publishUrl, {
            method: 'PUT',
            headers: {
                ...headers,
                'X-Contentful-Version': currentVersion,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur détaillée lors de la publication de l'asset :", errorData);
            throw new Error(`Erreur lors de la publication de l'asset : ${response.status}`);
        }

        console.log("Asset publié avec succès !");
    } catch (error) {
        console.error("Erreur lors de la publication de l'asset :", error.message || error);
        throw error;
    }
}

// Fonction pour supprimer un profil
export async function deleteAdminProfile(profileId) {
    const url = `${BASE_CMA_URL}/${profileId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
    };

    try {
        const getEntryResponse = await fetch(url, { headers });

        if (!getEntryResponse.ok) throw new Error(`Erreur lors de la récupération de l'entrée : ${getEntryResponse.status}`);
        const entryData = await getEntryResponse.json();
        const isPublished = entryData.sys.publishedVersion !== undefined;

        if (isPublished) {
            const unpublishUrl = `${url}/published`;
            const unpublishResponse = await fetch(unpublishUrl, {
                method: 'DELETE',
                headers,
            });

            if (!unpublishResponse.ok) throw new Error(`Erreur lors de l'annulation de la publication : ${unpublishResponse.status}`);
        }

        const deleteResponse = await fetch(url, {
            method: 'DELETE',
            headers,
        });

        if (!deleteResponse.ok) throw new Error(`Erreur lors de la suppression de l'entrée : ${deleteResponse.status}`);

        console.log("Profil supprimé avec succès !");
    } catch (error) {
        console.error("Erreur lors de la suppression du profil :", error);
    }
}

// Fonction pour mettre à jour un profil
export async function updateAdminProfile(profileId, profileData) {
    const url = `${BASE_CMA_URL}/${profileId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        const versionResponse = await fetch(url, { method: 'GET', headers });
        if (!versionResponse.ok) throw new Error(`Erreur lors de la récupération de la version : ${versionResponse.status}`);
        const versionData = await versionResponse.json();
        const currentVersion = versionData.sys.version;

        const updateData = {
            fields: {
                name: { 'en-US': profileData.name },
                job: { 'en-US': profileData.job },
                email: { 'en-US': profileData.email },
                phone: { 'en-US': profileData.phone },
                website: { 'en-US': profileData.website },
                diplomas: { 'en-US': profileData.diplomas },
            },
        };

        if (profileData.imageId) {
            updateData.fields.image = {
                'en-US': { sys: { type: 'Link', linkType: 'Asset', id: profileData.imageId } },
            };
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: { ...headers, 'X-Contentful-Version': currentVersion },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur de mise à jour détaillée :', errorData);
            throw new Error(`Erreur lors de la mise à jour : ${response.status}`);
        }

        console.log("Profil mis à jour avec succès !");
        await publishAdminProfile(profileId);
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil :", error);
        throw error;
    }
}
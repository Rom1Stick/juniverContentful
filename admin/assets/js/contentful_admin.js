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


// Articles Page 
// Fonction pour créer un article
export async function createArticle({ title, summary, content, imageFile }) {
    const url = BASE_CMA_URL;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        'X-Contentful-Content-Type': 'article',
    };

    const data = {
        fields: {
            title: { 'en-US': title },
            summary: { 'en-US': summary },
            content: { 'en-US': content },
        },
    };

    try {
        // Étape 1 : Télécharger l'image si elle existe
        if (imageFile) {
            const imageId = await uploadProfileImage(imageFile); // Réutilisation de la fonction pour télécharger une image
            data.fields.image = {
                'en-US': {
                    sys: { type: 'Link', linkType: 'Asset', id: imageId },
                },
            };
        }

        // Étape 2 : Créer l'article
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de la création de l'article :", errorData);
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const createdArticle = await response.json();

        // Étape 3 : Publier l'article immédiatement
        await publishArticle(createdArticle.sys.id);

        return createdArticle;
    } catch (error) {
        console.error("Erreur lors de la création de l'article :", error.message || error);
        throw error;
    }
}



// Fonction pour publier un article
async function publishArticle(articleId) {
    const url = `${BASE_CMA_URL}/${articleId}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        // Récupérer les métadonnées actuelles de l'article
        const entryUrl = `${BASE_CMA_URL}/${articleId}`;
        const entryResponse = await fetch(entryUrl, { method: 'GET', headers });
        if (!entryResponse.ok) {
            const errorData = await entryResponse.json();
            console.error("Erreur lors de la récupération de l'article :", errorData);
            throw new Error(`Erreur lors de la récupération de l'article : ${entryResponse.status}`);
        }

        const entryData = await entryResponse.json();
        const currentVersion = entryData.sys.version; // Obtenir la version actuelle

        // Publier l'article
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...headers,
                'X-Contentful-Version': currentVersion, // Inclure la version correcte
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de la publication de l'article :", errorData);
            throw new Error(`Erreur lors de la publication de l'article : ${response.status}`);
        }

        console.log("Article publié avec succès !");
    } catch (error) {
        console.error("Erreur lors de la publication de l'article :", error.message || error);
        throw error;
    }
}

export async function uploadImage(file) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) {
        throw new Error("Type de fichier non autorisé. Veuillez utiliser un fichier JPEG, PNG ou GIF.");
    }

    try {
        console.log("Début de l'upload de l'image...");

        // Étape 1 : Uploader le fichier brut
        const rawFileUploadResponse = await fetch(`https://upload.contentful.com/spaces/${SPACE_ID}/uploads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
                'Content-Type': 'application/octet-stream',
            },
            body: file,
        });

        if (!rawFileUploadResponse.ok) {
            throw new Error("Erreur lors de l'upload du fichier brut.");
        }

        const uploadData = await rawFileUploadResponse.json();

        // Étape 2 : Créer un asset
        const assetResponse = await fetch(`${BASE_UPLOAD_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
                'Content-Type': 'application/vnd.contentful.management.v1+json',
            },
            body: JSON.stringify({
                fields: {
                    title: { 'en-US': file.name },
                    file: {
                        'en-US': {
                            contentType: file.type,
                            fileName: file.name,
                            uploadFrom: {
                                sys: { type: 'Link', linkType: 'Upload', id: uploadData.sys.id },
                            },
                        },
                    },
                },
            }),
        });

        if (!assetResponse.ok) {
            throw new Error("Erreur lors de la création de l'asset.");
        }

        const assetData = await assetResponse.json();

        // Étape 3 : Attendre que l'asset soit traité
        await waitForImageProcessing(assetData.sys.id);

        // Étape 4 : Publier l'asset
        await publishAsset(assetData.sys.id);

        console.log("Image uploadée et publiée avec succès !");
        return assetData.sys.id;
    } catch (error) {
        console.error("Erreur lors de l'upload de l'image :", error);
        throw error;
    }
}

// Nouvelle fonction dédiée à l'attente du traitement de l'image
async function waitForImageProcessing(assetId) {
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


// Fonction pour mettre à jour un article
export async function updateArticle(articleId, updatedData) {
    const url = `${BASE_CMA_URL}/${articleId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    };

    // 1. Récupérer la version actuelle de l'article
    const versionResponse = await fetch(url, { method: 'GET', headers });
    if (!versionResponse.ok) {
        const errorData = await versionResponse.json();
        console.error("Erreur lors de la récupération de la version de l'article :", errorData);
        throw new Error(`Erreur HTTP : ${versionResponse.status}`);
    }
    const versionData = await versionResponse.json();
    const currentVersion = versionData.sys.version; // La version actuelle

    // Construire l'objet data avec les nouvelles valeurs
    const data = {
        fields: {
            title: { 'en-US': updatedData.title },
            summary: { 'en-US': updatedData.summary },
            content: { 'en-US': updatedData.content },
        },
    };

    if (updatedData.imageFile) {
        // Si on met à jour l'image, il faut d'abord l'upload et obtenir un imageId
        const imageId = await uploadProfileImage(updatedData.imageFile);
        data.fields.image = {
            'en-US': {
                sys: {
                    type: 'Link',
                    linkType: 'Asset',
                    id: imageId,
                },
            },
        };
    }

    // 2. Mettre à jour l'article avec la bonne version
    const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            ...headers,
            'X-Contentful-Version': currentVersion
        },
        body: JSON.stringify(data),
    });

    if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Erreur lors de la mise à jour de l'article :", errorData);
        throw new Error(`Erreur HTTP : ${updateResponse.status}`);
    }

    console.log("Article mis à jour avec succès !");

    // 3. Publier l'article après la mise à jour
    await publishArticle(articleId);

    return updateResponse.json();
}



// Fonction pour supprimer un article
export async function deleteArticle(articleId) {
    const url = `${BASE_CMA_URL}/${articleId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        const response = await fetch(url, { method: 'DELETE', headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null); // Empêche une erreur supplémentaire
            console.error("Erreur lors de la suppression de l'article :", errorData || response.statusText);
            throw new Error(`Erreur lors de la suppression de l'article : ${response.status}`);
        }

        console.log("Article supprimé avec succès !");
        return true; // Retourne une confirmation de succès
    } catch (error) {
        console.error("Erreur lors de la suppression de l'article :", error);
        throw error;
    }
}


// Fonction pour dépublier un article
export async function unpublishArticle(articleId) {
    const url = `${BASE_CMA_URL}/${articleId}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    try {
        const response = await fetch(url, { method: 'DELETE', headers });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur lors de la dépublication de l'article :", errorData);
            throw new Error(`Erreur lors de la dépublication de l'article : ${response.status}`);
        }

        console.log("Article dépublié avec succès !");
    } catch (error) {
        console.error("Erreur lors de la dépublication de l'article :", error);
        throw error;
    }
}

// Page Event 
// Évènements (Events)// Évènements (Events)
export async function fetchEventsAdmin() {
    const url = `${BASE_CMA_URL}?access_token=${CMA_ACCESS_TOKEN}&content_type=event&include=2`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("Erreur lors de la récupération des évènements :", error);
        return [];
    }
}

async function publishEvent(eventId) {
    const url = `${BASE_CMA_URL}/${eventId}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    const entryUrl = `${BASE_CMA_URL}/${eventId}`;
    const entryResponse = await fetch(entryUrl, { method: 'GET', headers });
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
        console.error("Erreur lors de la publication de l'évènement :", errorData);
        throw new Error(`Erreur lors de la publication : ${response.status}`);
    }

    console.log("Évènement publié avec succès !");
}

export async function createEvent({ title, date, location, description }) {
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        'X-Contentful-Content-Type': 'event',
    };

    const data = {
        fields: {
            title: { 'en-US': title },
            date: { 'en-US': date },
            location: { 'en-US': location },
            description: { 'en-US': description },
        },
    };

    console.log("Données envoyées (createEvent) :", JSON.stringify(data, null, 2));
    const response = await fetch(BASE_CMA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur lors de la création de l'évènement :", errorData);
        if (errorData.details) {
            console.log("Détails de l'erreur (createEvent) :", JSON.stringify(errorData.details, null, 2));
        }
        throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const createdEvent = await response.json();
    await publishEvent(createdEvent.sys.id);
    return createdEvent;
}

export async function updateEvent(eventId, updatedData) {
    const entryUrl = `${BASE_CMA_URL}/${eventId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    };

    const versionResponse = await fetch(entryUrl, { method: 'GET', headers });
    if (!versionResponse.ok) throw new Error(`Erreur lors de la récupération de la version : ${versionResponse.status}`);
    const versionData = await versionResponse.json();
    const currentVersion = versionData.sys.version;

    const data = {
        fields: {
            title: { 'en-US': updatedData.title },
            date: { 'en-US': updatedData.date },
            location: { 'en-US': updatedData.location },
            description: { 'en-US': updatedData.description },
        },
    };

    console.log("Données envoyées (updateEvent) :", JSON.stringify(data, null, 2));
    const response = await fetch(entryUrl, {
        method: 'PUT',
        headers: {
            ...headers,
            'X-Contentful-Version': currentVersion
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur lors de la mise à jour de l'évènement :", errorData);
        if (errorData.details) {
            console.log("Détails de l'erreur (updateEvent) :", JSON.stringify(errorData.details, null, 2));
        }
        throw new Error(`Erreur HTTP : ${response.status}`);
    }

    await publishEvent(eventId);
    console.log("Évènement mis à jour et publié avec succès !");
}

export async function deleteEvent(eventId) {
    const url = `${BASE_CMA_URL}/${eventId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Erreur lors de la suppression de l'évènement :", errorData || response.statusText);
        throw new Error(`Erreur lors de la suppression : ${response.status}`);
    }

    console.log("Évènement supprimé avec succès !");
    return true;
}

export async function unpublishEvent(eventId) {
    const url = `${BASE_CMA_URL}/${eventId}/published`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur lors de la dépublication de l'évènement :", errorData);
        throw new Error(`Erreur lors de la dépublication : ${response.status}`);
    }

    console.log("Évènement dépublié avec succès !");
}

// Workshop Management Functions
export async function fetchWorkshopsAdmin() {
    const url = `${BASE_CMA_URL}?content_type=workshop&include=2`;
    try {
        const response = await fetch(url, {
            headers: getCMAHeaders()
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return data.items.map(item => ({
            id: item.sys.id,
            title: item.fields.title?.['en-US'] || 'Sans titre',
            description: item.fields.description?.['en-US'] || '',
            recurrence: item.fields.recurrence?.['en-US'] || 'Non spécifiée',
            profiles: item.fields.profiles?.['en-US']?.map(p => p.sys.id) || [],
            version: item.sys.version
        }));
    } catch (error) {
        console.error('fetchWorkshopsAdmin error:', error);
        throw error;
    }
}




export async function updateWorkshop(workshopId, workshopData) {
    try {
        // 🔹 Récupérer la version actuelle de l'atelier
        const getUrl = `${BASE_CMA_URL}/${workshopId}`;
        const getResponse = await fetch(getUrl, { headers: getCMAHeaders() });

        if (!getResponse.ok) throw new Error(`HTTP GET ${getResponse.status}`);

        const currentData = await getResponse.json();
        const version = currentData.sys.version;

        // Vérifier que recurrence est un tableau
        const recurrenceValue = Array.isArray(workshopData.recurrence) 
            ? workshopData.recurrence 
            : [workshopData.recurrence]; 

        // 🔹 Préparation des nouvelles données
        const updateData = {
            fields: {
                title: { 'en-US': workshopData.title },
                description: { 'en-US': workshopData.description },
                recurrence: { 'en-US': recurrenceValue },
                profiles: {
                    'en-US': workshopData.profiles.map(id => ({
                        sys: { type: 'Link', linkType: 'Entry', id }
                    }))
                }
            }
        };

        // 🔹 Envoyer la mise à jour avec la version correcte
        const updateResponse = await fetch(getUrl, {
            method: 'PUT',
            headers: {
                ...getCMAHeaders(),
                'X-Contentful-Version': version
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Erreur mise à jour:', JSON.stringify(errorData, null, 2));
            throw new Error(`HTTP PUT ${updateResponse.status}: ${errorData.message}`);
        }

        const result = await updateResponse.json();

        // 🔹 Récupérer la dernière version AVANT publication
        await publishEntry(workshopId);

        return result;

    } catch (error) {
        console.error('updateWorkshop error:', error);
        throw error;
    }
}

export async function createWorkshop(workshopData) {
    try {
        // Vérifier que recurrence est un tableau
        const recurrenceValue = Array.isArray(workshopData.recurrence) 
            ? workshopData.recurrence 
            : [workshopData.recurrence];

        const payload = {
            fields: {
                title: { 'en-US': workshopData.title },
                description: { 'en-US': workshopData.description },
                recurrence: { 'en-US': recurrenceValue }, // Correction ici
                profiles: {
                    'en-US': workshopData.profiles?.map(id => ({
                        sys: { type: 'Link', linkType: 'Entry', id: id }
                    })) || []
                }
            }
        };

        const response = await fetch(BASE_CMA_URL, {
            method: 'POST',
            headers: getCMAHeaders('workshop'),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur Contentful:', JSON.stringify(errorData, null, 2));
            throw new Error(`Erreur ${response.status}: ${errorData.message}`);
        }

        const result = await response.json();
        await publishEntry(result.sys.id);
        return result;

    } catch (error) {
        console.error('createWorkshop error:', error);
        throw new Error(`Erreur création: ${error.message}`);
    }
}

export async function deleteWorkshop(workshopId) {
    try {
        // Dépublier d'abord
        await fetch(`${BASE_CMA_URL}/${workshopId}/published`, {
            method: 'DELETE',
            headers: getCMAHeaders()
        });

        // Supprimer l'atelier
        const response = await fetch(`${BASE_CMA_URL}/${workshopId}`, {
            method: 'DELETE',
            headers: getCMAHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${errorData.message}`);
        }

        return true;

    } catch (error) {
        console.error('deleteWorkshop error:', error);
        throw new Error(`Échec suppression: ${error.message}`);
    }
}

async function publishEntry(entryId) {
    try {
        // Récupérer la dernière version de l'entrée
        const getUrl = `${BASE_CMA_URL}/${entryId}`;
        const getResponse = await fetch(getUrl, { headers: getCMAHeaders() });

        if (!getResponse.ok) throw new Error(`HTTP GET ${getResponse.status}`);

        const currentData = await getResponse.json();
        const latestVersion = currentData.sys.version;

        // 🔹 Publier avec la version correcte
        const publishUrl = `${BASE_CMA_URL}/${entryId}/published`;

        const response = await fetch(publishUrl, {
            method: 'PUT',
            headers: {
                ...getCMAHeaders(),
                'X-Contentful-Version': latestVersion
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur publication:', JSON.stringify(errorData, null, 2));
            throw new Error(`Publication failed: HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('publishEntry error:', error);
        throw error;
    }
}

function getCMAHeaders(contentType = null) {
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json'
    };

    if (contentType) headers['X-Contentful-Content-Type'] = contentType;
    return headers;
}
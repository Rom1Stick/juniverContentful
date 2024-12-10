import { fetchArticles } from '/public/js/articles.js'; // Chemin vers votre fichier articles.js
import { createArticle, updateArticle, deleteArticle, unpublishArticle, uploadImage } from '/admin/assets/js/contentful_admin.js'; // Liaison avec contentful_admin.js
import { CMA_ACCESS_TOKEN } from '/admin/assets/js/contentful_admin.js';

const SPACE_ID = '2tb1ogfq4qw9'; // Définissez SPACE_ID ici
const ACCESS_TOKEN = 'WSI_A1lumv7s8y3sSzfEh19QmC-kPTu5_dACrY4qTXM'; // Définissez ACCESS_TOKEN ici

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement de l'administration des articles...");

    try {
        // Charger les articles depuis Contentful
        await loadArticles();
    } catch (error) {
        console.error("Erreur lors du chargement des articles :", error);
    }

    // Event listener pour l'ajout d'article
    document.getElementById('add-article-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      // Récupérer les valeurs des champs
      const title = document.getElementById('article-title').value;
      const summary = document.getElementById('article-summary').value;
      const content = document.getElementById('article-content').value;
      const imageFile = document.getElementById('article-image').files[0]; // Récupérer le fichier image
  
      try {
          // Ajouter l'article
          await addArticle({ title, summary, content, imageFile });
          alert("Article ajouté avec succès !");
  
          // Réinitialiser le formulaire
          e.target.reset();
  
          // Recharger la page pour mettre à jour la liste
          location.reload();
      } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'article:', error);
          alert('Erreur lors de l\'ajout de l\'article.');
      }
  });  
});

// Charger et afficher les articles
async function loadArticles() {
    const articles = await fetchArticles();
    displayArticles(articles);
}

// Fonction pour ajouter un article
async function addArticle({ title, summary, content, imageFile }) {
  try {
      const article = await createArticle({ title, summary, content, imageFile }); // Inclure le fichier image
      return article;
  } catch (error) {
      throw new Error('Erreur lors de l\'ajout de l\'article: ' + error.message);
  }
}


// Fonction pour afficher les articles
function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    container.innerHTML = ""; // Vider le conteneur avant de l'afficher

    if (articles.length === 0) {
        container.innerHTML = "<p>Aucun article disponible.</p>";
        return;
    }

    articles.forEach(article => {
        const { title, summary, content, createdAt } = article.fields;
        const articleId = article.sys.id;

        if (title && content) {
            const articleEl = document.createElement('article');
            articleEl.classList.add('article-item');
            articleEl.innerHTML = `
                <h3>${title}</h3>
                <p><strong>Résumé :</strong> ${summary}</p>
                <p>${content}</p>
                <small>Publié le ${new Date(createdAt).toLocaleDateString()}</small>
                <button class="edit-article" data-id="${articleId}">Modifier</button>
                <button class="delete-article" data-id="${articleId}">Supprimer</button>
            `;
            container.appendChild(articleEl);

            // Event listeners pour les boutons Modifier et Supprimer
            const editButton = articleEl.querySelector('.edit-article');
            const deleteButton = articleEl.querySelector('.delete-article');

            editButton.addEventListener('click', () => handleEditArticle(articleId));
            deleteButton.addEventListener('click', () => handleDeleteArticle(articleId));
        } else {
            console.warn("Article incomplet ou mal structuré :", article);
        }
    });
}

// Fonction pour gérer la modification d'un article
async function handleEditArticle(articleId) {
  console.log("Modification de l'article avec l'ID :", articleId);

  try {
      const article = await fetchArticleById(articleId);
      const titleInput = document.getElementById('edit-article-title');
      const summaryInput = document.getElementById('edit-article-summary');
      const contentInput = document.getElementById('edit-article-content');
      const imageInput = document.getElementById('edit-article-image');

      titleInput.value = article.fields.title['en-US'];
      summaryInput.value = article.fields.summary['en-US'];
      contentInput.value = article.fields.content['en-US'];

      // Afficher le formulaire de modification
      document.getElementById('edit-article-section').style.display = 'block';

      const form = document.getElementById('edit-article-form');
      form.onsubmit = async (e) => {
          e.preventDefault();

          const updatedArticle = {
              title: titleInput.value,
              summary: summaryInput.value,
              content: contentInput.value,
              imageFile: imageInput.files[0], // Inclure le fichier image sélectionné
          };

          try {
              await updateArticle(articleId, updatedArticle);
              alert("Article mis à jour avec succès !");
              location.reload();
          } catch (error) {
              console.error("Erreur lors de la mise à jour de l'article :", error);
              alert("Une erreur est survenue lors de la mise à jour de l'article.");
          }
      };
  } catch (error) {
      console.error("Erreur lors de la récupération de l'article pour modification :", error);
  }
}



// Fonction pour gérer la suppression d'un article
async function handleDeleteArticle(articleId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
        try {
            await unpublishArticle(articleId); // Dépublier l'article avant de le supprimer
            await deleteArticle(articleId); // Appel à la fonction de suppression
            alert("Article supprimé avec succès !");
            location.reload(); // Recharger la page pour mettre à jour la liste des articles
        } catch (error) {
            console.error("Erreur lors de la suppression de l'article :", error);
            alert("Une erreur est survenue lors de la suppression de l'article.");
        }
    }
}

// Fonction pour récupérer un article par son ID
async function fetchArticleById(articleId) {
  const url = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master/entries/${articleId}`;
  const headers = {
      'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`, // Utilise le token importé
      'Content-Type': 'application/vnd.contentful.management.v1+json',
  };

  try {
      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) throw new Error(`Erreur lors de la récupération de l'article : ${response.status}`);

      return response.json();
  } catch (error) {
      console.error("Erreur lors de la récupération de l'article par ID :", error);
      throw error;
  }
}


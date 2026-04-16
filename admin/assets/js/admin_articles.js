import { fetchArticles } from '/public/js/articles.js';
import {
  createArticle,
  updateArticle,
  deleteArticle,
  unpublishArticle,
  uploadAsset,
  cmaFetch,
} from '/admin/assets/js/contentful_admin.js';
import { toastSuccess, toastError, renderEmptyState } from '/admin/assets/js/adminToast.js';
import { openModal } from '/admin/assets/js/adminModal.js';
import { createRichEditor, sanitizeHTML } from '/admin/assets/js/richEditor.js';

let currentArticles = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('new-article-btn')?.addEventListener('click', () => openArticleModal());
  await loadArticles();
});

async function loadArticles() {
  try {
    currentArticles = await fetchArticles();
    displayArticles(currentArticles);
  } catch (error) {
    console.error('Chargement des articles', error);
    toastError('Impossible de charger les articles.');
  }
}

function articleCard(article) {
  const { title, summary, content, createdAt } = article.fields || {};
  const id = article.sys.id;
  const date = createdAt ? new Date(createdAt).toLocaleDateString('fr-FR') : '';
  const previewText = stripHTML(content || summary || '').slice(0, 180);
  return `
    <article class="article-card" data-id="${id}">
      <header class="article-card__head">
        <h3>${escapeHTML(title || 'Sans titre')}</h3>
        ${date ? `<small class="article-card__date">${date}</small>` : ''}
      </header>
      ${summary ? `<p class="article-card__summary">${escapeHTML(summary)}</p>` : ''}
      <p class="article-card__preview">${escapeHTML(previewText)}${previewText.length >= 180 ? '…' : ''}</p>
      <footer class="article-card__actions">
        <button type="button" class="btn btn-ghost edit-article" data-id="${id}"><i class="fas fa-pen"></i> Modifier</button>
        <button type="button" class="btn btn-danger delete-article" data-id="${id}"><i class="fas fa-trash"></i> Supprimer</button>
      </footer>
    </article>`;
}

function displayArticles(articles) {
  const container = document.getElementById('articles-container');
  if (!articles || articles.length === 0) {
    renderEmptyState(container, {
      icon: '📝',
      title: "Pas encore d'article publié",
      description: 'Partagez un article du journal pour nourrir la communauté du cercle.',
      ctaLabel: 'Écrire le premier article',
      onCta: () => openArticleModal(),
    });
    return;
  }

  container.innerHTML = articles.map(articleCard).join('');
  container.querySelectorAll('.edit-article').forEach((btn) => {
    btn.addEventListener('click', () => openArticleModal(btn.dataset.id));
  });
  container.querySelectorAll('.delete-article').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteArticle(btn.dataset.id));
  });
}

async function openArticleModal(articleId = null) {
  let articleData = null;
  if (articleId) {
    try {
      articleData = await fetchArticleByIdCMA(articleId);
    } catch (err) {
      console.error('fetchArticleByIdCMA', err);
      toastError("Impossible de charger l'article à modifier.");
      return;
    }
  }

  const form = document.createElement('form');
  form.className = 'article-form';
  form.innerHTML = `
    <div>
      <label for="article-title">Titre</label>
      <input type="text" id="article-title" required />
    </div>
    <div>
      <label for="article-summary">Résumé court</label>
      <textarea id="article-summary" rows="2" maxlength="240" required></textarea>
    </div>
    <div>
      <label>Contenu</label>
      <div id="article-content-host"></div>
    </div>
    <div class="cover-field">
      <label for="article-image">Image de couverture (optionnelle)</label>
      <div class="cover-picker">
        <div class="cover-preview" id="article-cover-preview" hidden>
          <img id="article-cover-img" alt="Aperçu" />
          <button type="button" class="cover-remove" id="article-cover-remove" aria-label="Retirer l'aperçu">×</button>
        </div>
        <input type="file" id="article-image" accept="image/jpeg,image/png,image/gif,image/webp" />
      </div>
      <small class="hint">JPG, PNG, GIF ou WebP · l'image actuelle est conservée si vous laissez ce champ vide.</small>
    </div>
    <div class="admin-modal__actions">
      <button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> ${articleId ? 'Mettre à jour' : 'Publier'}</button>
    </div>
  `;

  const editor = createRichEditor({
    initialHTML: articleData ? articleData.fields.content?.['en-US'] || '' : '',
    placeholder: "Rédigez votre article — utilisez la barre d'outils pour la mise en forme.",
  });
  // Upload image ou PDF inline dans l'éditeur
  editor.setAssetUploader(async (file) => uploadAsset(file));
  form.querySelector('#article-content-host').appendChild(editor.root);

  if (articleData) {
    form.querySelector('#article-title').value = articleData.fields.title?.['en-US'] || '';
    form.querySelector('#article-summary').value = articleData.fields.summary?.['en-US'] || '';
  }

  // Aperçu immédiat de l'image choisie (avant upload)
  const coverInput = form.querySelector('#article-image');
  const coverPreview = form.querySelector('#article-cover-preview');
  const coverImg = form.querySelector('#article-cover-img');
  const coverRemove = form.querySelector('#article-cover-remove');
  let coverObjectURL = null;
  const releasePreview = () => {
    if (coverObjectURL) {
      URL.revokeObjectURL(coverObjectURL);
      coverObjectURL = null;
    }
  };
  coverInput.addEventListener('change', () => {
    const file = coverInput.files?.[0];
    releasePreview();
    if (!file) {
      coverPreview.hidden = true;
      return;
    }
    coverObjectURL = URL.createObjectURL(file);
    coverImg.src = coverObjectURL;
    coverPreview.hidden = false;
  });
  coverRemove.addEventListener('click', () => {
    coverInput.value = '';
    releasePreview();
    coverPreview.hidden = true;
  });

  const modal = openModal({
    title: articleId ? 'Modifier un article' : 'Nouvel article',
    body: form,
    size: 'lg',
    onClose: releasePreview,
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('#article-title').value.trim();
    const summary = form.querySelector('#article-summary').value.trim();
    const content = sanitizeHTML(editor.getHTML());
    const imageFile = form.querySelector('#article-image').files[0];

    if (!title || !summary || !content || content === '<p><br></p>') {
      toastError('Renseignez le titre, le résumé et un contenu.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = articleId ? 'Mise à jour…' : 'Publication…';

    try {
      if (articleId) {
        await updateArticle(articleId, { title, summary, content, imageFile });
        toastSuccess('Article mis à jour.');
      } else {
        await createArticle({ title, summary, content, imageFile });
        toastSuccess('Article publié.');
      }
      modal.close();
      await loadArticles();
    } catch (err) {
      console.error(err);
      toastError(`Échec : ${err.message || err}`);
      submitBtn.disabled = false;
      submitBtn.textContent = articleId ? 'Mettre à jour' : 'Publier';
    }
  });
}

async function handleDeleteArticle(articleId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
  try {
    await unpublishArticle(articleId).catch(() => {});
    await deleteArticle(articleId);
    toastSuccess('Article supprimé.');
    await loadArticles();
  } catch (error) {
    console.error('handleDeleteArticle', error);
    toastError("Impossible de supprimer l'article.");
  }
}

async function fetchArticleByIdCMA(articleId) {
  const r = await cmaFetch(`entries/${articleId}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html ?? '';
  return div.textContent || div.innerText || '';
}

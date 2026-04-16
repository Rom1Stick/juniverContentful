// Éditeur riche minimal — toolbar + zone contenteditable.
// Le sanitizer est partagé avec le rendu public via /public/js/contentSanitize.js.

import { sanitizeRichHTML as sanitizeHTML } from '/public/js/contentSanitize.js';

// Re-export pour les callers admin_articles/events/workshops (backward compat)
export { sanitizeHTML };

// Couleurs autorisées (palette Symbiose) — référencées par nom dans la toolbar
const PALETTE = [
  { name: 'Mousse', value: '#2e4a2b' },
  { name: 'Feuille', value: '#7ba05b' },
  { name: 'Miel', value: '#e3b84f' },
  { name: 'Argile', value: '#b97a3a' },
  { name: 'Ciel', value: '#8ab0b8' },
  { name: 'Encre', value: '#1e2a1c' },
];

// Crée l'éditeur, retourne { root, getHTML, setHTML, focus }
export function createRichEditor({
  initialHTML = '',
  placeholder = 'Rédigez ici…',
  onChange,
} = {}) {
  const root = document.createElement('div');
  root.className = 'rich-editor';

  const toolbar = document.createElement('div');
  toolbar.className = 'rich-editor__toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.innerHTML = `
    <button type="button" class="re-btn" data-cmd="formatBlock" data-arg="H2" title="Titre">T<sub>1</sub></button>
    <button type="button" class="re-btn" data-cmd="formatBlock" data-arg="H3" title="Sous-titre">T<sub>2</sub></button>
    <button type="button" class="re-btn" data-cmd="formatBlock" data-arg="P" title="Paragraphe">¶</button>
    <span class="re-sep"></span>
    <button type="button" class="re-btn" data-cmd="bold" title="Gras"><b>G</b></button>
    <button type="button" class="re-btn" data-cmd="italic" title="Italique"><i>I</i></button>
    <button type="button" class="re-btn" data-cmd="underline" title="Souligné"><u>U</u></button>
    <span class="re-sep"></span>
    <button type="button" class="re-btn" data-cmd="insertUnorderedList" title="Liste à puces">•</button>
    <button type="button" class="re-btn" data-cmd="insertOrderedList" title="Liste numérotée">1.</button>
    <button type="button" class="re-btn" data-cmd="formatBlock" data-arg="BLOCKQUOTE" title="Citation">❝</button>
    <span class="re-sep"></span>
    <button type="button" class="re-btn re-color" data-action="color" title="Couleur du texte" aria-haspopup="true">🎨</button>
    <button type="button" class="re-btn" data-action="link" title="Lien">🔗</button>
    <button type="button" class="re-btn" data-action="image" title="Insérer une image">🖼️</button>
    <button type="button" class="re-btn" data-action="file" title="Joindre un fichier (PDF)">📎</button>
    <span class="re-sep"></span>
    <button type="button" class="re-btn" data-cmd="removeFormat" title="Retirer la mise en forme">⌫</button>
  `;

  const palette = document.createElement('div');
  palette.className = 'rich-editor__palette';
  palette.hidden = true;
  palette.innerHTML = PALETTE.map(
    (c) =>
      `<button type="button" class="re-color-swatch" data-color="${c.value}" title="${c.name}" style="background:${c.value}" aria-label="${c.name}"></button>`
  ).join('');

  const area = document.createElement('div');
  area.className = 'rich-editor__area';
  area.contentEditable = 'true';
  area.dataset.placeholder = placeholder;
  area.innerHTML = initialHTML || '';

  root.appendChild(toolbar);
  root.appendChild(palette);
  root.appendChild(area);

  // 2 inputs file cachés : un pour les images, un pour les documents (PDF)
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
  imageInput.style.display = 'none';
  root.appendChild(imageInput);

  const docInput = document.createElement('input');
  docInput.type = 'file';
  docInput.accept = 'application/pdf,image/*';
  docInput.style.display = 'none';
  root.appendChild(docInput);

  let savedRange = null;
  area.addEventListener('mouseup', () => {
    savedRange = currentRange();
  });
  area.addEventListener('keyup', () => {
    savedRange = currentRange();
  });
  area.addEventListener('blur', () => {
    savedRange = currentRange();
  });

  function currentRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) return sel.getRangeAt(0).cloneRange();
    return null;
  }
  function restoreRange() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cmd], button[data-action]');
    if (!btn) return;
    e.preventDefault();
    area.focus();
    restoreRange();

    const cmd = btn.dataset.cmd;
    const arg = btn.dataset.arg || null;
    const action = btn.dataset.action;

    if (cmd) {
      document.execCommand(cmd, false, arg);
      fireChange();
      return;
    }
    if (action === 'color') {
      palette.hidden = !palette.hidden;
      return;
    }
    if (action === 'link') {
      const url = prompt('URL du lien (https://…)');
      if (url) {
        document.execCommand('createLink', false, url);
        // Open in new tab
        area.querySelectorAll('a[href]').forEach((a) => {
          if (a.href === url) {
            a.target = '_blank';
            a.rel = 'noopener';
          }
        });
        fireChange();
      }
      return;
    }
    if (action === 'image') {
      imageInput.click();
      return;
    }
    if (action === 'file') {
      docInput.click();
      return;
    }
  });

  palette.addEventListener('click', (e) => {
    const sw = e.target.closest('.re-color-swatch');
    if (!sw) return;
    e.preventDefault();
    area.focus();
    restoreRange();
    document.execCommand('foreColor', false, sw.dataset.color);
    palette.hidden = true;
    fireChange();
  });

  // Uploader commun — retourne { url, fileName, contentType }
  // Compat : setImageUploader accepte un callback qui renvoie juste `url`.
  let assetUploader = null;
  function setAssetUploader(fn) {
    assetUploader = fn;
  }
  function setImageUploader(fn) {
    // wrapping pour compat ascendante
    assetUploader = async (file) => {
      const result = await fn(file);
      if (typeof result === 'string')
        return { url: result, fileName: file.name, contentType: file.type };
      return result;
    };
  }

  async function handleUpload(file, action) {
    if (!file) return;
    if (!assetUploader) {
      alert('Envoi impossible : uploader non configuré.');
      return;
    }
    const selector = action === 'image' ? '[data-action="image"]' : '[data-action="file"]';
    const btn = toolbar.querySelector(selector);
    const prevHTML = btn?.innerHTML;
    if (btn) {
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.innerHTML = '<span class="re-spinner" aria-hidden="true"></span>';
      btn.setAttribute('aria-label', 'Envoi en cours…');
    }
    try {
      const asset = await assetUploader(file);
      if (!asset?.url) throw new Error("URL d'asset vide.");
      area.focus();
      restoreRange();
      const isImage = (asset.contentType || file.type || '').startsWith('image/');
      if (isImage && action === 'image') {
        document.execCommand('insertImage', false, asset.url);
      } else if (isImage && action === 'file') {
        // L'utilisateur a utilisé le bouton fichier avec une image → on l'insère comme image
        document.execCommand('insertImage', false, asset.url);
      } else {
        // PDF ou autre → lien cliquable avec nom de fichier
        const name = asset.fileName || file.name || 'Document';
        const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<a href="${asset.url}" target="_blank" rel="noopener">📎 ${safeName}</a>&nbsp;`;
        document.execCommand('insertHTML', false, html);
      }
      fireChange();
    } catch (err) {
      console.error('Asset upload failed', err);
      alert("Échec de l'envoi :\n\n" + (err.message || err));
    } finally {
      if (btn) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.innerHTML = prevHTML;
        btn.setAttribute(
          'aria-label',
          selector === '[data-action="image"]' ? 'Insérer une image' : 'Joindre un fichier (PDF)'
        );
      }
    }
  }

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    imageInput.value = '';
    await handleUpload(file, 'image');
  });

  docInput.addEventListener('change', async () => {
    const file = docInput.files?.[0];
    docInput.value = '';
    await handleUpload(file, 'file');
  });

  area.addEventListener('input', fireChange);

  function fireChange() {
    if (typeof onChange === 'function') onChange(getHTML());
  }

  function getHTML() {
    return sanitizeHTML(area.innerHTML);
  }

  function setHTML(html) {
    area.innerHTML = sanitizeHTML(html || '');
    fireChange();
  }

  function focus() {
    area.focus();
  }

  return { root, getHTML, setHTML, focus, setImageUploader, setAssetUploader };
}

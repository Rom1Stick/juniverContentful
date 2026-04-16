// Active automatiquement un mode édition visuel quand la page est chargée avec ?edit=1
// Communique avec le parent (iframe admin) via postMessage.
//
// Pour éviter que l'édition ne casse la mise en page, on force un mode plain-text :
// - contenteditable="plaintext-only" (Chrome/Edge/Safari)
// - Pour les navigateurs qui ne le supportent pas (anciens Firefox), on intercepte
//   keydown (Enter) et paste pour ne jamais injecter de markup HTML.

function isEditMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('edit') === '1';
  } catch {
    return false;
  }
}

function supportsPlaintextOnly() {
  const test = document.createElement('div');
  test.setAttribute('contenteditable', 'plaintext-only');
  return test.contentEditable === 'plaintext-only';
}

function collectEditables() {
  const texts = Array.from(document.querySelectorAll('[data-editable]')).map((el) => ({
    key: el.getAttribute('data-editable'),
    value: el.textContent.trim(),
    kind: 'text',
  }));
  const images = Array.from(document.querySelectorAll('img[data-editable-image]')).map((img) => ({
    key: img.getAttribute('data-editable-image'),
    value: img.src || '',
    kind: 'image',
  }));
  return [...texts, ...images];
}

function postEditables() {
  if (!window.parent || window.parent === window) return;
  window.parent.postMessage({ type: 'siteCopy:list', items: collectEditables() }, '*');
}

function setupEditing() {
  const plaintextOnly = supportsPlaintextOnly();

  const style = document.createElement('style');
  style.textContent = `
    [data-editable] {
      outline: 1.5px dashed rgba(185, 122, 58, 0.55);
      outline-offset: 3px;
      border-radius: 6px;
      transition: outline-color 0.2s;
      cursor: text;
    }
    [data-editable]:hover {
      outline-color: rgba(185, 122, 58, 0.9);
    }
    [data-editable]:focus {
      outline: 2px solid #b97a3a;
      outline-offset: 3px;
      background: rgba(227, 184, 79, 0.1);
    }
    [data-editable].edit-dirty {
      background: rgba(227, 184, 79, 0.15);
    }
    img[data-editable-image] {
      outline: 2px dashed rgba(123, 160, 91, 0.7);
      outline-offset: 4px;
      cursor: pointer;
      transition: outline-color 0.2s, filter 0.2s;
    }
    img[data-editable-image]:hover {
      outline-color: rgba(46, 74, 43, 0.9);
      filter: brightness(1.05);
    }
  `;
  document.head.appendChild(style);

  const initialized = new WeakSet();

  const initElement = (el) => {
    if (initialized.has(el)) return;
    initialized.add(el);

    el.setAttribute('contenteditable', plaintextOnly ? 'plaintext-only' : 'true');
    el.setAttribute('spellcheck', 'true');

    // Bloque Enter (pas de nouveau bloc / br dans le texte plat)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });

    // Force coller en plain-text (sinon copie d'autres sites injecte du HTML)
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
      // Insertion via execCommand (déprécié mais largement supporté pour ce cas) ou fallback
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
      } else {
        // Fallback : remplace tout
        el.textContent = el.textContent + text;
      }
    });

    // Sécurité : si malgré tout du HTML est injecté, on le re-flatten au prochain input
    el.addEventListener('input', () => {
      // Si jamais un noeud HTML a été injecté (ex. <br>, <div>), on l'aplatit
      if (!plaintextOnly && el.children.length > 0) {
        const flat = el.textContent;
        el.textContent = flat;
        // Repose le curseur à la fin
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      el.classList.add('edit-dirty');
      window.parent?.postMessage(
        {
          type: 'siteCopy:change',
          key: el.getAttribute('data-editable'),
          value: el.textContent.trim(),
        },
        '*'
      );
    });

    el.addEventListener('focus', () => {
      window.parent?.postMessage(
        { type: 'siteCopy:focus', key: el.getAttribute('data-editable') },
        '*'
      );
    });
  };

  const initImage = (img) => {
    if (initialized.has(img)) return;
    initialized.add(img);
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.parent?.postMessage(
        { type: 'siteCopy:pick-image', key: img.getAttribute('data-editable-image') },
        '*'
      );
    });
  };

  const activate = () => {
    document.querySelectorAll('[data-editable]').forEach(initElement);
    document.querySelectorAll('img[data-editable-image]').forEach(initImage);
    postEditables();
  };

  // Certains éléments data-editable sont injectés tardivement par le chrome.js / les vues.
  // On filtre pour ne réagir qu'aux ajouts/retraits d'éléments éditables réels —
  // sinon chaque frappe clavier dans un contenteditable (qui crée/retire des nœuds texte)
  // déclenche inutilement postEditables et spamme le parent.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          node.matches?.('[data-editable], [data-editable-image]') ||
          node.querySelector?.('[data-editable], [data-editable-image]')
        ) {
          scheduleActivate();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let activateScheduled = false;
  function scheduleActivate() {
    if (activateScheduled) return;
    activateScheduled = true;
    // Un microtask suffit : on regroupe toutes les mutations d'un même tick
    queueMicrotask(() => {
      activateScheduled = false;
      activate();
    });
  }

  activate();

  window.addEventListener('message', (e) => {
    const data = e.data || {};
    if (data.type === 'siteCopy:apply' && data.map) {
      Object.entries(data.map).forEach(([k, v]) => {
        document.querySelectorAll(`[data-editable="${k}"]`).forEach((el) => {
          if (el.textContent.trim() !== v) el.textContent = v;
          el.classList.remove('edit-dirty');
        });
        document.querySelectorAll(`img[data-editable-image="${k}"]`).forEach((img) => {
          if (v && img.src !== v) img.src = v;
        });
      });
    }
    if (data.type === 'siteCopy:list') postEditables();
  });
}

if (isEditMode()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEditing);
  } else {
    setupEditing();
  }
}

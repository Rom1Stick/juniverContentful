import { sanitizeRichHTML } from './contentSanitize.js';

// Active automatiquement un mode édition visuel quand la page est chargée avec ?edit=1
// Communique avec le parent (iframe admin) via postMessage.
//
// Les textes éditables acceptent une mise en forme HTML contrôlée. Toute valeur
// envoyée au parent ou réappliquée dans l'iframe passe par sanitizeRichHTML().

function isEditMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('edit') === '1';
  } catch {
    return false;
  }
}

function collectEditables() {
  const texts = Array.from(document.querySelectorAll('[data-editable]')).map((el) => ({
    key: el.getAttribute('data-editable'),
    value: sanitizeRichHTML(el.innerHTML.trim()),
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
  if (window.__juniverEditModeActive) {
    postEditables();
    return;
  }
  window.__juniverEditModeActive = true;

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
    .edit-rich-toolbar {
      position: absolute;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px;
      background: #f7f1e0;
      border: 1px solid rgba(46, 74, 43, 0.18);
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(30, 42, 28, 0.16);
    }
    .edit-rich-toolbar[hidden] {
      display: none;
    }
    .edit-rich-toolbar button,
    .edit-rich-toolbar select {
      height: 30px;
      min-width: 30px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #1e2a1c;
      font: 600 13px/1 system-ui, sans-serif;
      cursor: pointer;
    }
    .edit-rich-toolbar button:hover,
    .edit-rich-toolbar select:hover {
      background: rgba(123, 160, 91, 0.16);
    }
    .edit-rich-toolbar select {
      min-width: 82px;
      padding: 0 6px;
    }
  `;
  document.head.appendChild(style);

  const initialized = new WeakSet();
  const toolbar = createToolbar();
  document.body.appendChild(toolbar);
  let activeElement = null;
  let savedRange = null;

  const initElement = (el) => {
    if (initialized.has(el)) return;
    initialized.add(el);

    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');

    // Nettoie le collage : HTML autorisé si présent, sinon texte avec retours ligne.
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const data = e.clipboardData || window.clipboardData;
      const html = data?.getData('text/html');
      const text = data?.getData('text/plain') || '';
      const safe = html ? sanitizeRichHTML(html) : plainTextToHTML(text);
      document.execCommand('insertHTML', false, safe);
    });

    el.addEventListener('input', () => {
      el.classList.add('edit-dirty');
      postChange(el);
    });
    el.addEventListener('mouseup', rememberSelection);
    el.addEventListener('keyup', rememberSelection);

    el.addEventListener('focus', () => {
      activeElement = el;
      toolbar.hidden = false;
      positionToolbar(el);
      window.parent?.postMessage(
        { type: 'siteCopy:focus', key: el.getAttribute('data-editable') },
        '*'
      );
    });
    el.addEventListener('blur', () => {
      setTimeout(() => {
        if (!toolbar.matches(':hover') && document.activeElement !== el) toolbar.hidden = true;
      }, 120);
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
          const safe = sanitizeRichHTML(v);
          if (el.innerHTML.trim() !== safe) el.innerHTML = safe;
          el.classList.remove('edit-dirty');
        });
        document.querySelectorAll(`img[data-editable-image="${k}"]`).forEach((img) => {
          if (v && img.src !== v) img.src = v;
        });
      });
    }
    if (data.type === 'siteCopy:list') postEditables();
  });

  window.addEventListener('scroll', () => {
    if (activeElement && !toolbar.hidden) positionToolbar(activeElement);
  });
  document.addEventListener('selectionchange', rememberSelection);

  function createToolbar() {
    const node = document.createElement('div');
    node.className = 'edit-rich-toolbar';
    node.hidden = true;
    node.innerHTML = `
      <button type="button" data-command="bold" title="Gras"><b>G</b></button>
      <button type="button" data-command="italic" title="Italique"><i>I</i></button>
      <button type="button" data-command="underline" title="Souligné"><u>U</u></button>
      <button type="button" data-command="insertLineBreak" title="Retour à la ligne">↵</button>
      <select data-command="fontSize" title="Taille du texte">
        <option value="">Taille</option>
        <option value="0.85rem">Petit</option>
        <option value="1rem">Normal</option>
        <option value="1.15rem">Moyen</option>
        <option value="1.3rem">Grand</option>
        <option value="1.5rem">Très grand</option>
      </select>
      <button type="button" data-command="justifyLeft" title="Aligner à gauche">☰</button>
      <button type="button" data-command="justifyCenter" title="Centrer">≡</button>
      <button type="button" data-command="justifyRight" title="Aligner à droite">☷</button>
      <button type="button" data-command="removeFormat" title="Retirer la mise en forme">⌫</button>
    `;

    let handledPointerCommand = false;
    const handlePointerCommand = (event) => {
      const button = event.target.closest('button[data-command]');
      if (!button) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (handledPointerCommand) return;
      handledPointerCommand = true;
      applyFormat(button.dataset.command);
    };
    node.addEventListener('pointerdown', handlePointerCommand);
    node.addEventListener('mousedown', handlePointerCommand);
    node.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-command]');
      if (!button) return;
      event.preventDefault();
      if (handledPointerCommand) {
        handledPointerCommand = false;
        return;
      }
      applyFormat(button.dataset.command);
    });
    node.querySelector('select[data-command="fontSize"]').addEventListener('change', (event) => {
      if (!event.target.value) return;
      applyFormat('fontSize', event.target.value);
      event.target.value = '';
    });
    return node;
  }

  function applyFormat(command, value = null) {
    if (!activeElement) return;
    activeElement.focus();
    restoreSelection();
    if (command === 'insertLineBreak') {
      document.execCommand('insertHTML', false, '<br>');
    } else if (command === 'fontSize') {
      applyFontSize(activeElement, value);
    } else {
      document.execCommand(command, false, null);
    }
    activeElement.classList.add('edit-dirty');
    postChange(activeElement);
    positionToolbar(activeElement);
  }

  function rememberSelection() {
    if (!activeElement) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !activeElement.contains(selection.anchorNode))
      return;
    savedRange = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    if (!savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  function applyFontSize(el, value) {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !el.contains(selection.anchorNode)) {
      el.innerHTML = `<span style="font-size: ${value}">${sanitizeRichHTML(el.innerHTML)}</span>`;
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      el.innerHTML = `<span style="font-size: ${value}">${sanitizeRichHTML(el.innerHTML)}</span>`;
      return;
    }
    const span = document.createElement('span');
    span.setAttribute('style', `font-size: ${value}`);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    nextRange.collapse(false);
    selection.addRange(nextRange);
  }

  function postChange(el) {
    window.parent?.postMessage(
      {
        type: 'siteCopy:change',
        key: el.getAttribute('data-editable'),
        value: sanitizeRichHTML(el.innerHTML.trim()),
      },
      '*'
    );
  }

  function positionToolbar(el) {
    const rect = el.getBoundingClientRect();
    const top = Math.max(8, window.scrollY + rect.top - toolbar.offsetHeight - 10);
    const left = Math.min(
      window.scrollX + rect.left,
      window.scrollX + document.documentElement.clientWidth - toolbar.offsetWidth - 8
    );
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${Math.max(8, left)}px`;
  }
}

function plainTextToHTML(text) {
  return escapeHTML(text).replace(/\r?\n/g, '<br>');
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

if (isEditMode()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEditing);
  } else {
    setupEditing();
  }
}

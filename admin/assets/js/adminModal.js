// Modale réutilisable pour les formulaires admin.
// Open / close, overlay, Esc, click-outside, focus trap léger.
// Usage:
//   const modal = openModal({ title: '…', body: domNode|html, onClose })
//   modal.close()  /  modal.setTitle(...)
//
// Le content (body) reçoit méthode `.close()` via attribut data-modal-close
// sur n'importe quel bouton intérieur.

let activeModal = null;

function ensureLayer() {
  let layer = document.getElementById('admin-modal-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'admin-modal-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

export function openModal({ title = '', body = '', size = 'md', onClose } = {}) {
  if (activeModal) activeModal.close();

  const layer = ensureLayer();
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = `admin-modal admin-modal--${size}`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (title) dialog.setAttribute('aria-label', title);

  const header = document.createElement('header');
  header.className = 'admin-modal__head';
  header.innerHTML = `
    <h2 class="admin-modal__title">${title}</h2>
    <button type="button" class="admin-modal__close" aria-label="Fermer">×</button>
  `;
  dialog.appendChild(header);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'admin-modal__body';
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  dialog.appendChild(bodyEl);

  overlay.appendChild(dialog);
  layer.appendChild(overlay);

  // Empêche scroll en arrière-plan
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.remove('is-visible');
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = prevOverflow;
      if (activeModal && activeModal._overlay === overlay) activeModal = null;
      if (typeof onClose === 'function') onClose();
    }, 200);
  };

  // Fermeture
  header.querySelector('.admin-modal__close').addEventListener('click', close);
  bodyEl.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', close));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  const wrappedClose = () => {
    document.removeEventListener('keydown', onKey);
    close();
  };

  // Anim in
  requestAnimationFrame(() => overlay.classList.add('is-visible'));

  // Focus le 1er champ ou bouton intérieur
  setTimeout(() => {
    const focusable = dialog.querySelector(
      'input, textarea, select, button:not(.admin-modal__close)'
    );
    if (focusable) focusable.focus();
  }, 50);

  activeModal = {
    _overlay: overlay,
    bodyEl,
    close: wrappedClose,
    setTitle(t) {
      header.querySelector('.admin-modal__title').textContent = t;
    },
  };
  return activeModal;
}

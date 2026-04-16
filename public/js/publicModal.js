// Modale légère côté public — Esc, clic-extérieur, bouton ×, focus trap simple.

let activeModal = null;

function ensureLayer() {
  let layer = document.getElementById('public-modal-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'public-modal-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

export function openPublicModal({ title = '', bodyHTML = '', onClose } = {}) {
  if (activeModal) activeModal.close();
  const layer = ensureLayer();

  const overlay = document.createElement('div');
  overlay.className = 'public-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'public-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `
    <header class="public-modal__head">
      <h2 class="public-modal__title">${title}</h2>
      <button type="button" class="public-modal__close" aria-label="Fermer">×</button>
    </header>
    <div class="public-modal__body">${bodyHTML}</div>
  `;

  overlay.appendChild(dialog);
  layer.appendChild(overlay);

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
      document.removeEventListener('keydown', onKey);
      if (activeModal?._overlay === overlay) activeModal = null;
      if (typeof onClose === 'function') onClose();
    }, 200);
  };

  dialog.querySelector('.public-modal__close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  requestAnimationFrame(() => overlay.classList.add('is-visible'));
  setTimeout(() => dialog.querySelector('.public-modal__close')?.focus(), 50);

  activeModal = { _overlay: overlay, close };
  return activeModal;
}

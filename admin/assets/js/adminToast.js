// Toast + dialogue de confirmation partagés pour l'admin.
// Importé en tant que module ES par les pages CRUD (workshops, events, articles, …).
// Aucune dépendance — injecte les nœuds à la volée et nettoie après animation.

const TOAST_DURATION = 3500;

function ensureLayer() {
  let layer = document.getElementById('admin-toast-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'admin-toast-layer';
    layer.className = 'admin-toast-layer';
    layer.setAttribute('role', 'status');
    layer.setAttribute('aria-live', 'polite');
    document.body.appendChild(layer);
  }
  return layer;
}

export function toast(message, { variant = 'success', duration = TOAST_DURATION } = {}) {
  const layer = ensureLayer();
  const node = document.createElement('div');
  node.className = `admin-toast admin-toast--${variant}`;
  node.textContent = message;
  layer.appendChild(node);
  // Force reflow puis animation in
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 300);
  }, duration);
}

export const toastSuccess = (msg, opts) => toast(msg, { ...opts, variant: 'success' });
export const toastError = (msg, opts) => toast(msg, { ...opts, variant: 'error', duration: 5000 });
export const toastInfo = (msg, opts) => toast(msg, { ...opts, variant: 'info' });

// Empty state injecté dans un container vide.
// Usage: renderEmptyState('#workshops-container', { title, description, ctaLabel, onCta })
export function renderEmptyState(
  container,
  { icon = '🌱', title, description, ctaLabel, onCta } = {}
) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  el.innerHTML = `
    <div class="admin-empty">
      <div class="admin-empty__icon" aria-hidden="true">${icon}</div>
      <h3 class="admin-empty__title">${title}</h3>
      ${description ? `<p class="admin-empty__desc">${description}</p>` : ''}
      ${ctaLabel ? `<button type="button" class="btn btn-primary admin-empty__cta">${ctaLabel}</button>` : ''}
    </div>`;
  if (ctaLabel && typeof onCta === 'function') {
    el.querySelector('.admin-empty__cta')?.addEventListener('click', onCta);
  }
}

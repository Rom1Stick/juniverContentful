import { brandMark } from '/public/js/brandMark.js';

const ADMIN_LINKS = [
  { href: '/admin/admin.html', label: 'Tableau de bord', icon: 'fa-home' },
  { href: '/admin/assets/views/admin_profiles.html', label: 'Profils', icon: 'fa-user-circle' },
  { href: '/admin/assets/views/admin_events.html', label: 'Évènements', icon: 'fa-calendar-alt' },
  { href: '/admin/assets/views/admin_articles.html', label: 'Articles', icon: 'fa-chart-line' },
  { href: '/admin/assets/views/admin_workshops.html', label: 'Ateliers', icon: 'fa-wrench' },
  {
    href: '/admin/assets/views/admin_inline_editor.html',
    label: 'Contenu',
    icon: 'fa-pen-to-square',
  },
];

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '');
}

function renderBreadcrumb() {
  const path = currentPath();
  const current = ADMIN_LINKS.find((l) => l.href === path);
  const label = current?.label ?? 'Administration';
  if (path === '/admin/admin.html' || path.endsWith('/admin.html')) {
    return `<span class="admin-breadcrumb"><span>${label}</span></span>`;
  }
  return `
    <span class="admin-breadcrumb">
      <a href="/admin/admin.html">Tableau de bord</a>
      <span class="sep">›</span>
      <span>${label}</span>
    </span>`;
}

function renderHeader() {
  const navItems = ADMIN_LINKS.filter((l) => !l.href.endsWith('/admin.html'))
    .map((l) => {
      const active = currentPath() === l.href ? ' class="active"' : '';
      return `<li><a href="${l.href}"${active}><i class="fas ${l.icon}"></i> ${l.label}</a></li>`;
    })
    .join('');

  return `
    <header class="admin-topbar">
      <div class="header-container">
        <a href="/admin/admin.html" class="admin-brand">
          ${brandMark()}
          <span>JuniverSanté · Admin</span>
        </a>
        ${renderBreadcrumb()}
        <ul class="admin-nav">
          ${navItems}
          <li><a href="/public/index.html" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Voir le site</a></li>
          <li><a href="#" class="admin-logout" data-admin-logout><i class="fas fa-sign-out-alt"></i> Déconnexion</a></li>
        </ul>
      </div>
    </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="admin-foot">
      <p>© ${year} JuniverSanté · Panneau d'administration</p>
    </footer>`;
}

function renderAmbient() {
  return `
    <div class="blob b1" aria-hidden="true"></div>
    <div class="blob b2" aria-hidden="true"></div>`;
}

function bindLogout() {
  document.querySelectorAll('[data-admin-logout]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      // Nouveau format (JWT) + purge legacy
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminExpiry');
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('sessionExpiry');
      window.location.href = '/admin/admin.html';
    });
  });
}

function injectAdminChrome() {
  const headerSlot = document.querySelector('[data-slot="admin-header"]');
  const footerSlot = document.querySelector('[data-slot="admin-footer"]');
  const ambientSlot = document.querySelector('[data-slot="admin-ambient"]');

  if (ambientSlot) ambientSlot.outerHTML = renderAmbient();
  if (headerSlot) headerSlot.outerHTML = renderHeader();
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  bindLogout();
}

function gatedInject() {
  // Supporte le nouveau format (adminToken + expiry) et, par compat, l'ancien flag.
  const token = sessionStorage.getItem('adminToken');
  const expiry = parseInt(sessionStorage.getItem('adminExpiry') || '0', 10);
  const legacyFlag = sessionStorage.getItem('isAuthenticated') === 'true';
  const ok = (token && expiry > Date.now()) || legacyFlag;
  if (ok) injectAdminChrome();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gatedInject);
} else {
  gatedInject();
}

document.addEventListener('admin:authenticated', injectAdminChrome);

export { injectAdminChrome, renderHeader, renderFooter };

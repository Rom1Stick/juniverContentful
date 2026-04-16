import './editMode.js';
import { brandMark } from './brandMark.js';

const NAV_LINKS = [
  { href: '/public/index.html', label: 'Accueil' },
  { href: '/public/views/about.html', label: 'Le cercle des thérapeutes' },
  { href: '/public/views/cycle.html', label: 'Le cycle, trouver son chemin de santé' },
  { href: '/public/views/calendar.html', label: 'Calendrier' },
  { href: '/public/views/workshop.html', label: 'Ateliers' },
  { href: '/public/views/contact.html', label: 'Contact', cta: true },
];

function renderHeader() {
  const linksHtml = NAV_LINKS.map(
    (l) => `<a href="${l.href}"${l.cta ? ' class="cta"' : ''}>${l.label}</a>`
  ).join('');

  return `
    <header class="site-nav">
      <a class="brand" href="/public/index.html" data-editable="brand.name">
        ${brandMark()}
        <span>JuniverSanté</span>
      </a>
      <nav class="primary" aria-label="Navigation principale">${linksHtml}</nav>
      <button class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-drawer">
        <span class="bar"></span>
      </button>
    </header>`;
}

function renderDrawer() {
  // Le drawer est rendu DEHORS du header et du .wrap : tout ancêtre avec
  // backdrop-filter / filter / transform crée un containing block qui empêche
  // position:fixed de couvrir le viewport, d'où le drawer qui "restait derrière".
  const linksHtml = NAV_LINKS.map(
    (l) => `<a href="${l.href}"${l.cta ? ' class="cta"' : ''}>${l.label}</a>`
  ).join('');
  return `
    <div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
      <button class="nav-close" aria-label="Fermer le menu">×</button>
      ${linksHtml}
    </div>`;
}

function renderFooter() {
  return `
    <footer class="site-foot">
      <div class="col-brand">
        <a class="brand" href="/public/index.html">
          ${brandMark()}
          <span>JuniverSanté</span>
        </a>
        <p data-editable="footer.tagline">
          Un cercle de thérapeutes indépendants, fondé en 2023. Médecines douces, savoirs botaniques, accompagnement du vivant.
        </p>
        <div class="socials" aria-label="Réseaux sociaux">
          <a href="#" aria-label="Instagram">◉</a>
          <a href="#" aria-label="Facebook">◉</a>
          <a href="#" aria-label="Newsletter">✉</a>
        </div>
      </div>
      <div>
        <h4 data-editable="footer.col1.title">Le cercle</h4>
        <ul>
          <li><a href="/public/views/about.html" data-editable="footer.col1.link1">La charte</a></li>
          <li><a href="/public/views/about.html" data-editable="footer.col1.link2">Thérapeutes</a></li>
          <li><a href="/public/views/contact.html" data-editable="footer.col1.link3">Rejoindre</a></li>
        </ul>
      </div>
      <div>
        <h4 data-editable="footer.col2.title">Pratique</h4>
        <ul>
          <li><a href="/public/views/workshop.html" data-editable="footer.col2.link1">Ateliers</a></li>
          <li><a href="/public/views/calendar.html" data-editable="footer.col2.link2">Calendrier</a></li>
          <li><a href="/public/index.html#journal" data-editable="footer.col2.link3">Journal</a></li>
        </ul>
      </div>
      <div>
        <h4 data-editable="footer.col3.title">Contact</h4>
        <ul>
          <li><a href="mailto:contact@juniversante.fr" data-editable="footer.col3.email">contact@juniversante.fr</a></li>
          <li data-editable="footer.col3.location">Bourgogne, FR</li>
        </ul>
      </div>
      <div>
        <h4 data-editable="footer.col4.title">Légal</h4>
        <ul>
          <li><a href="/public/views/legal.html" data-editable="footer.col4.link1">Mentions légales</a></li>
          <li><a href="/public/views/privacy.html" data-editable="footer.col4.link2">Confidentialité</a></li>
        </ul>
      </div>
      <div class="foot-bottom">
        <span data-editable="footer.copyright">© 2026 JuniverSanté · tissé avec soin</span>
        <div class="links">
          <a href="/public/views/legal.html">Mentions légales</a>
          <a href="/public/views/privacy.html">Confidentialité</a>
        </div>
      </div>
    </footer>`;
}

function renderAmbient() {
  return `
    <canvas id="mycel" aria-hidden="true"></canvas>
    <div class="blob b1" aria-hidden="true"></div>
    <div class="blob b2" aria-hidden="true"></div>
    <div class="blob b3" aria-hidden="true"></div>`;
}

function injectChrome() {
  const headerSlot = document.querySelector('[data-slot="header"]');
  const footerSlot = document.querySelector('[data-slot="footer"]');
  const ambientSlot = document.querySelector('[data-slot="ambient"]');

  if (ambientSlot) ambientSlot.outerHTML = renderAmbient();
  else document.body.insertAdjacentHTML('afterbegin', renderAmbient());

  if (headerSlot) headerSlot.outerHTML = renderHeader();
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  // Drawer injecté en dernier enfant du <body>, donc hors de tout ancêtre
  // filtré/transformé — indispensable pour que position:fixed couvre le viewport.
  document.body.insertAdjacentHTML('beforeend', renderDrawer());

  bindNavToggle();
}

function bindNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const close = drawer?.querySelector('.nav-close');
  if (!toggle || !drawer) return;

  const open = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const shut = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', open);
  close?.addEventListener('click', shut);
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', shut));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) shut();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectChrome);
} else {
  injectChrome();
}

export { injectChrome, renderHeader, renderFooter };

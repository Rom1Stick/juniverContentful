// Visuels SVG décoratifs pour les articles sans image de couverture.
// 4 variantes dans la palette Symbiose — sélection déterministe par hash de l'ID article,
// donc un même article garde toujours le même visuel.

const COLORS = {
  moss: '#2e4a2b',
  mossDeep: '#1c2f1c',
  leaf: '#7ba05b',
  leafLight: '#a3c380',
  honey: '#e3b84f',
  clay: '#b97a3a',
  sky: '#8ab0b8',
  cream: '#f7f1e0',
  creamWarm: '#efe6cd',
};

function hashId(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ────────── Variantes ────────── */

// 0 — Feuille vivante : grande feuille leaf + nervure + petite feuille honey en contrepoint
function variantLeaf() {
  return `
    <svg class="article-visual" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="av-leaf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${COLORS.cream}"/>
          <stop offset="100%" stop-color="${COLORS.creamWarm}"/>
        </linearGradient>
        <radialGradient id="av-leaf-glow" cx="0.7" cy="0.2" r="0.6">
          <stop offset="0%" stop-color="${COLORS.honey}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${COLORS.honey}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#av-leaf-bg)"/>
      <rect width="400" height="300" fill="url(#av-leaf-glow)"/>
      <!-- Grande feuille -->
      <g transform="translate(90 40) rotate(-18 110 120)">
        <path d="M110 10 Q200 80 180 180 Q120 240 70 220 Q20 180 30 100 Q50 30 110 10 Z"
              fill="${COLORS.leaf}" opacity="0.9"/>
        <path d="M110 10 Q115 100 120 220" stroke="${COLORS.mossDeep}" stroke-width="1.4" fill="none" opacity="0.55"/>
        <path d="M120 60 Q90 80 60 90" stroke="${COLORS.mossDeep}" stroke-width="1" fill="none" opacity="0.4"/>
        <path d="M120 110 Q85 130 55 140" stroke="${COLORS.mossDeep}" stroke-width="1" fill="none" opacity="0.4"/>
        <path d="M122 160 Q90 175 65 180" stroke="${COLORS.mossDeep}" stroke-width="1" fill="none" opacity="0.4"/>
      </g>
      <!-- Petite feuille honey en haut droite -->
      <g transform="translate(290 30) rotate(25 40 40)">
        <path d="M40 10 Q70 25 65 60 Q50 80 30 75 Q10 60 15 35 Q25 15 40 10 Z"
              fill="${COLORS.honey}" opacity="0.85"/>
        <path d="M40 10 Q42 50 50 75" stroke="${COLORS.clay}" stroke-width="1" fill="none" opacity="0.5"/>
      </g>
      <!-- Petit cercle clay -->
      <circle cx="320" cy="230" r="14" fill="${COLORS.clay}" opacity="0.7"/>
      <circle cx="320" cy="230" r="5" fill="${COLORS.cream}"/>
      <!-- Brindille en bas -->
      <g opacity="0.5">
        <path d="M20 280 Q120 260 240 275" stroke="${COLORS.moss}" stroke-width="1.2" fill="none"/>
        <circle cx="60" cy="273" r="3" fill="${COLORS.leaf}"/>
        <circle cx="140" cy="266" r="3" fill="${COLORS.leaf}"/>
        <circle cx="210" cy="270" r="3" fill="${COLORS.leaf}"/>
      </g>
    </svg>
  `;
}

// 1 — Mycélium : réseau de nœuds organique
function variantMycel() {
  const nodes = [
    [70, 60],
    [150, 90],
    [240, 50],
    [320, 110],
    [100, 170],
    [195, 180],
    [280, 200],
    [60, 240],
    [160, 260],
    [340, 230],
  ];
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [1, 4],
    [1, 5],
    [4, 5],
    [5, 6],
    [3, 6],
    [4, 7],
    [7, 8],
    [5, 8],
    [6, 9],
    [8, 9],
  ];
  const honeyIdx = new Set([1, 5, 9]);
  return `
    <svg class="article-visual" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="av-mycel-bg" cx="0.5" cy="0.4" r="0.9">
          <stop offset="0%" stop-color="${COLORS.creamWarm}"/>
          <stop offset="100%" stop-color="${COLORS.cream}"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#av-mycel-bg)"/>
      <!-- Liens -->
      <g stroke="${COLORS.leaf}" stroke-width="1.2" fill="none" opacity="0.55">
        ${links
          .map(([a, b]) => {
            const [x1, y1] = nodes[a];
            const [x2, y2] = nodes[b];
            const mx = (x1 + x2) / 2 + Math.sin((a + b) * 1.7) * 14;
            const my = (y1 + y2) / 2 + Math.cos((a + b) * 1.3) * 14;
            return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}"/>`;
          })
          .join('')}
      </g>
      <!-- Nœuds -->
      ${nodes
        .map(([x, y], i) => {
          const isHoney = honeyIdx.has(i);
          const r = isHoney ? 7 : 4;
          const color = isHoney ? COLORS.honey : COLORS.moss;
          const glow = isHoney
            ? `<circle cx="${x}" cy="${y}" r="14" fill="${COLORS.honey}" opacity="0.25"/>`
            : '';
          return `${glow}<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
        })
        .join('')}
      <!-- Feuille discrète en coin -->
      <g transform="translate(340 250) rotate(35 25 25)" opacity="0.45">
        <path d="M25 5 Q45 15 42 38 Q30 50 15 47 Q5 35 10 20 Q18 8 25 5 Z" fill="${COLORS.leaf}"/>
      </g>
    </svg>
  `;
}

// 2 — Aube : soleil honey + plante qui pousse
function variantSun() {
  return `
    <svg class="article-visual" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="av-sun-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${COLORS.creamWarm}"/>
          <stop offset="70%" stop-color="${COLORS.cream}"/>
          <stop offset="100%" stop-color="${COLORS.leafLight}" stop-opacity="0.4"/>
        </linearGradient>
        <radialGradient id="av-sun-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="${COLORS.honey}"/>
          <stop offset="70%" stop-color="${COLORS.honey}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="${COLORS.honey}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#av-sun-bg)"/>
      <!-- Halo soleil -->
      <circle cx="260" cy="110" r="120" fill="url(#av-sun-glow)"/>
      <circle cx="260" cy="110" r="44" fill="${COLORS.honey}"/>
      <!-- Rayons -->
      <g stroke="${COLORS.honey}" stroke-width="1.8" stroke-linecap="round" opacity="0.6">
        <line x1="260" y1="30" x2="260" y2="55"/>
        <line x1="320" y1="60" x2="305" y2="75"/>
        <line x1="340" y1="110" x2="320" y2="110"/>
        <line x1="320" y1="160" x2="305" y2="145"/>
        <line x1="200" y1="60" x2="215" y2="75"/>
        <line x1="180" y1="110" x2="200" y2="110"/>
        <line x1="200" y1="160" x2="215" y2="145"/>
      </g>
      <!-- Tige + feuilles (plante qui pousse) -->
      <g transform="translate(90 70)">
        <path d="M45 220 Q40 140 55 60 Q60 30 50 0" stroke="${COLORS.moss}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M50 60 Q20 55 10 35 Q25 30 55 50 Z" fill="${COLORS.leaf}" opacity="0.9"/>
        <path d="M50 110 Q90 105 105 85 Q85 75 50 100 Z" fill="${COLORS.leaf}" opacity="0.9"/>
        <path d="M45 160 Q10 165 0 150 Q15 140 48 150 Z" fill="${COLORS.leafLight}" opacity="0.85"/>
      </g>
      <!-- Sol -->
      <path d="M0 260 Q100 250 200 260 Q300 270 400 258 L400 300 L0 300 Z" fill="${COLORS.moss}" opacity="0.18"/>
      <!-- Petits points clay -->
      <circle cx="30" cy="50" r="4" fill="${COLORS.clay}" opacity="0.7"/>
      <circle cx="370" cy="240" r="3" fill="${COLORS.clay}" opacity="0.6"/>
    </svg>
  `;
}

// 3 — Rivière : courbes ondulantes + pétales dérivants
function variantRiver() {
  return `
    <svg class="article-visual" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="av-river-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${COLORS.cream}"/>
          <stop offset="100%" stop-color="${COLORS.creamWarm}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#av-river-bg)"/>
      <!-- Vagues sky superposées -->
      <g fill="none" stroke-linecap="round">
        <path d="M-20 80 Q80 50 180 85 Q280 120 420 75" stroke="${COLORS.sky}" stroke-width="2.2" opacity="0.55"/>
        <path d="M-20 130 Q90 100 200 135 Q310 170 420 125" stroke="${COLORS.sky}" stroke-width="2.6" opacity="0.65"/>
        <path d="M-20 185 Q110 155 220 190 Q330 220 420 180" stroke="${COLORS.sky}" stroke-width="3" opacity="0.75"/>
        <path d="M-20 240 Q120 215 240 250 Q340 270 420 235" stroke="${COLORS.moss}" stroke-width="3.2" opacity="0.55"/>
      </g>
      <!-- Pétales / feuilles qui flottent -->
      <g>
        <path d="M70 85 Q95 75 105 95 Q95 105 70 100 Z" fill="${COLORS.honey}" opacity="0.85"/>
        <path d="M200 135 Q230 123 242 145 Q226 156 200 150 Z" fill="${COLORS.leaf}" opacity="0.9"/>
        <path d="M310 195 Q333 185 343 208 Q328 218 308 210 Z" fill="${COLORS.clay}" opacity="0.8"/>
      </g>
      <!-- Herbes -->
      <g stroke="${COLORS.moss}" stroke-width="1.5" fill="none" opacity="0.5">
        <path d="M30 290 Q28 270 35 255"/>
        <path d="M45 290 Q48 268 42 250"/>
        <path d="M370 290 Q365 268 375 250"/>
        <path d="M385 290 Q390 270 380 255"/>
      </g>
      <!-- Soleil discret -->
      <circle cx="340" cy="50" r="22" fill="${COLORS.honey}" opacity="0.7"/>
      <circle cx="340" cy="50" r="34" fill="${COLORS.honey}" opacity="0.18"/>
    </svg>
  `;
}

const VARIANTS = [variantLeaf, variantMycel, variantSun, variantRiver];

export function renderArticleVisual(articleId) {
  const idx = hashId(articleId || '') % VARIANTS.length;
  return VARIANTS[idx]();
}

export function pickVariantIndex(articleId) {
  return hashId(articleId || '') % VARIANTS.length;
}

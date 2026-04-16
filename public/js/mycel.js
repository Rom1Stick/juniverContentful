// Mycélium — réseau organique qui respire en arrière-plan.
// Mobile-first : densité, rayon de connexion et DPR adaptés à la taille de l'écran.
// Safari : le shadowBlur est connu pour casser la perf et parfois figer le rendu,
// donc on l'évite sur Safari et on réduit les effets sur petits écrans.

function detectSafari() {
  const ua = navigator.userAgent;
  // Safari desktop ou iOS — exclut Chrome/Edge/Firefox sur Mac (qui contiennent aussi "Safari")
  return /^((?!chrome|android|crios|fxios|edge|edg).)*safari/i.test(ua);
}

function computeProfile() {
  const w = window.innerWidth;
  const isMobile = w < 700;
  const isTablet = w >= 700 && w < 1100;
  const safari = detectSafari();

  // DPR plus bas sur mobile pour soulager le GPU, plafonné sur Safari
  const rawDpr = window.devicePixelRatio || 1;
  const dpr = isMobile
    ? Math.min(rawDpr, 1.25)
    : safari
      ? Math.min(rawDpr, 1.5)
      : Math.min(rawDpr, 2);

  // Nombre de nœuds : scale avec la surface, mais borné
  let nodes;
  if (isMobile) nodes = 28;
  else if (isTablet) nodes = 55;
  else nodes = 85;

  // Distance de connexion : proportionnelle à la plus petite dimension
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  const maxD = Math.round(minSide * (isMobile ? 0.22 : 0.28) * dpr);

  // shadowBlur coûte cher sur Safari et sur mobile — désactivé dans ces cas
  const useShadow = !safari && !isMobile;

  return { dpr, nodes, maxD, useShadow, isMobile };
}

function startMycel() {
  const c = document.getElementById('mycel');
  if (!c) return;
  const ctx = c.getContext('2d');

  let profile = computeProfile();
  let w;
  let h;
  const nodes = [];
  let running = true;
  let rafId = null;

  function resize() {
    w = c.width = Math.round(window.innerWidth * profile.dpr);
    h = c.height = Math.round(window.innerHeight * profile.dpr);
    c.style.width = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
  }

  function build() {
    nodes.length = 0;
    for (let i = 0; i < profile.nodes; i += 1) {
      const t = Math.random();
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.14 * profile.dpr,
        vy: (Math.random() - 0.5) * 0.14 * profile.dpr,
        r: (Math.random() * 1.6 + 0.7) * profile.dpr,
        kind: t > 0.85 ? 'honey' : t > 0.5 ? 'leaf' : 'soft',
        s: Math.random(),
      });
    }
  }

  resize();
  build();

  // Recalculer le profil sur resize (passage portrait/paysage ou redimensionnement fenêtre)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      profile = computeProfile();
      resize();
      build();
    }, 120);
  });

  // Pause quand l'onglet n'est pas visible (économise batterie et évite jank au retour)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    } else if (!running) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  });

  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    const maxD = profile.maxD;

    // Liens
    ctx.lineWidth = 0.75 * profile.dpr;
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 0 || a.y > h) a.vy *= -1;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          const d = Math.sqrt(d2);
          const o = 1 - d / maxD;
          ctx.strokeStyle = `rgba(123,160,91,${(o * 0.55).toFixed(3)})`;
          ctx.beginPath();
          const mx = (a.x + b.x) / 2 + Math.sin(t / 1800 + i) * 6 * profile.dpr;
          const my = (a.y + b.y) / 2 + Math.cos(t / 1800 + j) * 6 * profile.dpr;
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nœuds
    for (const n of nodes) {
      const pulse = 0.7 + 0.4 * Math.sin(t / 1100 + n.s * 6);
      if (n.kind === 'honey') {
        ctx.fillStyle = 'rgba(227,184,79,0.92)';
        if (profile.useShadow) {
          ctx.shadowColor = 'rgba(227,184,79,0.7)';
          ctx.shadowBlur = 14 * profile.dpr;
        }
      } else if (n.kind === 'leaf') {
        ctx.fillStyle = 'rgba(123,160,91,0.82)';
        if (profile.useShadow) {
          ctx.shadowColor = 'rgba(123,160,91,0.4)';
          ctx.shadowBlur = 5 * profile.dpr;
        }
      } else {
        ctx.fillStyle = 'rgba(46,74,43,0.52)';
        if (profile.useShadow) ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    if (profile.useShadow) ctx.shadowBlur = 0;

    rafId = requestAnimationFrame(frame);
  }

  // prefers-reduced-motion : on dessine une image fixe mais lisible,
  // pas de RAF. Sinon on anime systématiquement, y compris sur Safari.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    frame(0);
    running = false;
  } else {
    rafId = requestAnimationFrame(frame);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMycel);
} else {
  startMycel();
}

export { startMycel };

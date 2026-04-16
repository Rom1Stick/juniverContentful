// Mycélium — réseau organique qui respire en arrière-plan.
// Remplace l'ancien canvas #neuro + shaders WebGL.

function startMycel() {
  const c = document.getElementById('mycel');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w;
  let h;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const NODES = 85;
  const nodes = [];

  function resize() {
    w = c.width = window.innerWidth * dpr;
    h = c.height = window.innerHeight * dpr;
    c.style.width = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
  }

  function build() {
    nodes.length = 0;
    for (let i = 0; i < NODES; i += 1) {
      const t = Math.random();
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.14 * dpr,
        vy: (Math.random() - 0.5) * 0.14 * dpr,
        r: (Math.random() * 1.8 + 0.8) * dpr,
        kind: t > 0.85 ? 'honey' : t > 0.5 ? 'leaf' : 'soft',
        s: Math.random(),
      });
    }
  }

  resize();
  build();

  window.addEventListener('resize', () => {
    resize();
    build();
  });

  const maxD = 220 * dpr;

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
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
        const d = Math.hypot(dx, dy);
        if (d < maxD) {
          const o = 1 - d / maxD;
          ctx.strokeStyle = `rgba(123,160,91,${o * 0.65})`;
          ctx.lineWidth = 0.75 * dpr;
          ctx.beginPath();
          const mx = (a.x + b.x) / 2 + Math.sin(t / 1800 + i) * 7 * dpr;
          const my = (a.y + b.y) / 2 + Math.cos(t / 1800 + j) * 7 * dpr;
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const pulse = 0.7 + 0.4 * Math.sin(t / 1100 + n.s * 6);
      if (n.kind === 'honey') {
        ctx.fillStyle = 'rgba(227,184,79,0.95)';
        ctx.shadowColor = 'rgba(227,184,79,0.7)';
        ctx.shadowBlur = 16 * dpr;
      } else if (n.kind === 'leaf') {
        ctx.fillStyle = 'rgba(123,160,91,0.85)';
        ctx.shadowColor = 'rgba(123,160,91,0.4)';
        ctx.shadowBlur = 6 * dpr;
      } else {
        ctx.fillStyle = 'rgba(46,74,43,0.55)';
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(frame);
  }

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(frame);
  } else {
    frame(0);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMycel);
} else {
  startMycel();
}

export { startMycel };

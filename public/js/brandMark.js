/**
 * brandMark — marque JuniverSanté (logo SVG feuille + graine).
 * Source unique partagée entre chrome.js (public) et adminChrome.js (admin).
 */
export function brandMark() {
  return `
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="16" stroke="#2E4A2B" stroke-width="1.2" />
        <path d="M17 6 Q22 13 17 17 Q12 13 17 6Z" fill="#7BA05B" />
        <path d="M17 17 Q22 22 17 28 Q12 22 17 17Z" fill="#E3B84F" />
        <circle cx="17" cy="17" r="2" fill="#2E4A2B" />
      </svg>
    </span>`;
}

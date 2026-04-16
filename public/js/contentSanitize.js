// Whitelist HTML sanitizer partagé (détails article + modale évènement).
// Ne conserve que les tags/attributs utiles à la mise en forme rédactionnelle.

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'A',
  'IMG',
  'SPAN',
  'BLOCKQUOTE',
  'DIV',
]);

const ALLOWED_ATTRS = {
  A: ['href', 'target', 'rel'],
  IMG: ['src', 'alt'],
  SPAN: ['style'],
  P: ['style'],
  H2: ['style'],
  H3: ['style'],
  DIV: ['style'],
};

export function sanitizeRichHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html || '';
  walk(tpl.content);
  return tpl.innerHTML;
}

export function escapeText(s) {
  const div = document.createElement('div');
  div.innerText = s ?? '';
  return div.innerHTML;
}

function walk(node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName;
      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }
      const allowed = ALLOWED_ATTRS[tag] || [];
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!allowed.includes(name)) {
          child.removeAttribute(attr.name);
          return;
        }
        if (name === 'href') {
          const v = attr.value.trim();
          if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) child.removeAttribute('href');
        }
        if (name === 'src') {
          const v = attr.value.trim();
          if (!/^(https?:\/\/|data:image\/)/i.test(v)) child.removeAttribute('src');
        }
        if (name === 'style') {
          const m = attr.value.match(/color\s*:\s*(#[0-9a-fA-F]{3,6})/);
          if (m) child.setAttribute('style', `color: ${m[1]}`);
          else child.removeAttribute('style');
        }
        if (name === 'target' && attr.value !== '_blank') child.removeAttribute('target');
      });
      walk(child);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
    }
  });
}

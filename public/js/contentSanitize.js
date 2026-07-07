// Whitelist HTML sanitizer partagé (détails article + modale évènement + textes éditables).
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
  STRONG: ['style'],
  B: ['style'],
  EM: ['style'],
  I: ['style'],
  U: ['style'],
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
        const fragment = document.createDocumentFragment();
        while (child.firstChild) fragment.appendChild(child.firstChild);
        walk(fragment);
        child.replaceWith(fragment);
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
        if (name === 'style') sanitizeStyle(child, attr.value);
        if (name === 'target' && attr.value !== '_blank') child.removeAttribute('target');
      });
      walk(child);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
    }
  });
}

function sanitizeStyle(el, value) {
  const allowed = [];
  value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const [rawProp, ...rawValueParts] = rule.split(':');
      const prop = rawProp?.trim().toLowerCase();
      const ruleValue = rawValueParts.join(':').trim().toLowerCase();
      if (!prop || !ruleValue) return;

      if (prop === 'color' && /^#[0-9a-f]{3,6}$/i.test(ruleValue)) {
        allowed.push(`color: ${ruleValue}`);
      }
      if (
        prop === 'font-size' &&
        /^(0\.85rem|1rem|1\.15rem|1\.3rem|1\.5rem|12px|14px|16px|18px|20px|24px)$/i.test(ruleValue)
      ) {
        allowed.push(`font-size: ${ruleValue}`);
      }
      if (prop === 'text-align' && /^(left|center|right|justify)$/i.test(ruleValue)) {
        allowed.push(`text-align: ${ruleValue}`);
      }
    });

  if (allowed.length) el.setAttribute('style', allowed.join('; '));
  else el.removeAttribute('style');
}

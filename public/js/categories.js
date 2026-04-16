import { fetchContent } from './contentful.js';
import { displayArticles } from './articles.js';

let allArticles = [];
let lastIncludes = null;

export async function fetchCategories() {
  return fetchContent('category');
}

export async function displayCategories(articles, containerId = 'category-list', includes = null) {
  allArticles = articles;
  lastIncludes = includes;
  const categories = await fetchCategories();
  const list = document.getElementById(containerId);
  if (!list) return;

  list.innerHTML = '';

  // Bouton "Tous"
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'active';
  allBtn.textContent = 'Tous';
  allBtn.addEventListener('click', () => {
    setActive(allBtn);
    displayArticles(allArticles, 'content', lastIncludes);
  });
  list.appendChild(allBtn);

  if (!categories.length) return;

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.categoryId = cat.sys.id;
    btn.textContent = cat.fields.name;
    btn.addEventListener('click', () => {
      setActive(btn);
      displayArticles(filterByCategory(cat.sys.id), 'content', lastIncludes);
    });
    list.appendChild(btn);
  });

  function setActive(target) {
    list.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    target.classList.add('active');
  }
}

export function filterArticlesByCategory(categoryId) {
  return filterByCategory(categoryId);
}

function filterByCategory(categoryId) {
  return allArticles.filter((article) => {
    const cats = article.fields.category || [];
    return cats.some((c) => c.sys.id === categoryId);
  });
}

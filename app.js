
let articles = [];
let activeFilter = 'Wszystkie';
let searchQuery = '';

const grid = document.getElementById('articleGrid');
const readerModal = document.getElementById('readerModal');
const searchInput = document.getElementById('articleSearch');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

function normalizeText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDate(value) {
  if (!value) return 'NOWY ARTYKUŁ';

  return new Intl.DateTimeFormat('pl-PL').format(
    new Date(value)
  );
}

function mapArticle(a) {
  return {
    id: a.id,
    title: a.title,
    category: a.category || 'Inne',
    read: a.read_time || '3 min',
    excerpt: a.excerpt || '',
    body: a.content || '',
    image: a.image_url || '',
    date: formatDate(a.created_at)
  };
}

async function loadArticles() {
  const { data, error } = await window.supabaseClient
    .from('articles')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Błąd pobierania artykułów:', error);
    grid.innerHTML = '<div class="empty-state">Nie udało się pobrać artykułów.</div>';
    return;
  }

  articles = data.map(mapArticle);
  renderArticles();
}

function renderArticles() {
  let visible = articles;

  // Filtrowanie według kategorii
  if (activeFilter !== 'Wszystkie') {
    visible = visible.filter(a => a.category === activeFilter);
  }

  // Wyszukiwanie w tytule, kategorii, opisie i treści
  if (searchQuery.trim()) {
    const query = normalizeText(searchQuery);

    visible = visible.filter(a => {
      const searchableText = normalizeText(
        `${a.title} ${a.category} ${a.excerpt} ${a.body}`
      );

      return searchableText.includes(query);
    });
  }

  grid.innerHTML = visible.length
    ? visible.map(a => `
      <article class="article-card" data-id="${escapeHtml(a.id)}" tabindex="0">
        <div class="article-image" style="background-image:linear-gradient(0deg,#07120a55,#07120a00),url('${escapeHtml(a.image || 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80')}')"></div>
        <div class="article-content">
          <div class="article-category">${escapeHtml(a.category.toUpperCase())}</div>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.excerpt)}</p>
          <div class="article-foot">
            <span>${escapeHtml(a.date)} · ${escapeHtml(a.read)}</span>
            <span class="read-more">CZYTAJ ↗</span>
          </div>
        </div>
      </article>
    `).join('')
    : `<div class="empty-state">${
        searchQuery
          ? 'Nie znaleziono artykułów pasujących do wyszukiwania.'
          : 'Brak artykułów w tej kategorii. Wróć później.'
      }</div>`;

  grid.querySelectorAll('.article-card').forEach(card => {
    const open = () => openReader(card.dataset.id);

    card.addEventListener('click', open);

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') open();
    });
  });
}

function openReader(id) {
  const a = articles.find(item => item.id === id);
  if (!a) return;

  document.getElementById('readerCategory').textContent =
    a.category.toUpperCase();

  const readerHero = document.querySelector('.reader-hero');

  if (readerHero) {
    readerHero.style.backgroundImage =
      'linear-gradient(0deg, rgba(5,17,9,0.95), rgba(5,17,9,0.2)), url("' +
      (a.image || '') + '")';
  }

  document.getElementById('readerTitle').textContent = a.title;
  document.getElementById('readerMeta').textContent =
    `TOUCHLINE • ${a.date} • ${a.read}`;
  document.getElementById('readerExcerpt').textContent = a.excerpt;
  document.getElementById('readerBody').textContent = a.body;

  readerModal.classList.add('open');
  readerModal.setAttribute('aria-hidden', 'false');
}

function closeReader() {
  readerModal.classList.remove('open');
  readerModal.setAttribute('aria-hidden', 'true');
}

// Obsługa wyszukiwarki
if (searchInput) {
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderArticles();
  });
}

// Obsługa kategorii
document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;

  activeFilter = btn.dataset.filter;

  document.querySelectorAll('#filters .filter').forEach(b => {
    b.classList.toggle('active', b === btn);
  });

  renderArticles();
});

document.getElementById('adminOpen').addEventListener('click', () => {
  window.location.href = 'admin.html';
});

document.getElementById('closeReader').addEventListener('click', closeReader);

readerModal.addEventListener('click', e => {
  if (e.target === readerModal) closeReader();
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mainNav').classList.toggle('open');
});

document.querySelectorAll('#mainNav a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('mainNav').classList.remove('open');
  });
});

loadArticles();

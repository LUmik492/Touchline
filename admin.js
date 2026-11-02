
const db = window.supabaseClient;

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const articleForm = document.getElementById('articleForm');
const adminArticles = document.getElementById('adminArticles');

let editingArticleId = null;

function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.color = isError ? '#ff7777' : '#b6ed45';
}

function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

function showDashboard(user) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  document.getElementById('adminEmail').textContent = user.email || '';
  loadAdminArticles();
}

async function checkSession() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showMessage('loginMessage', error.message, true);
    showLogin();
    return;
  }

  if (data.session) {
    showDashboard(data.session.user);
  } else {
    showLogin();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  showMessage('loginMessage', 'Logowanie...');

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage('loginMessage', 'Nie udało się zalogować. Sprawdź dane.', true);
    return;
  }

  loginForm.reset();
  showMessage('loginMessage', '');
  showDashboard(data.user);
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    showMessage('articleMessage', error.message, true);
    return;
  }

  resetArticleForm();
  showLogin();
});

async function loadAdminArticles() {
  adminArticles.textContent = 'Ładowanie artykułów...';

  const { data, error } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    adminArticles.textContent = 'Nie udało się pobrać artykułów: ' + error.message;
    return;
  }

  if (!data.length) {
    adminArticles.textContent = 'Nie ma jeszcze artykułów.';
    return;
  }

  adminArticles.innerHTML = data.map(article => `
    <div class="admin-article">
      <div>
        <strong>${escapeHtml(article.title)}</strong>
        <p>
          ${escapeHtml(article.category || 'Inne')}
          ·
          ${article.published ? 'Opublikowany' : 'Szkic'}
        </p>
      </div>

      <div class="admin-actions">
        <button class="admin-button secondary-button"
          data-edit="${article.id}">
          Edytuj
        </button>

        <button class="admin-button secondary-button"
          data-toggle="${article.id}"
          data-published="${article.published}">
          ${article.published ? 'Ukryj' : 'Opublikuj'}
        </button>

        <button class="admin-button danger-button"
          data-delete="${article.id}">
          Usuń
        </button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

adminArticles.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  const toggleButton = event.target.closest('[data-toggle]');

  if (editButton) {
    await editArticle(editButton.dataset.edit);
  }

  if (deleteButton) {
    await deleteArticle(deleteButton.dataset.delete);
  }

  if (toggleButton) {
    await togglePublished(
      toggleButton.dataset.toggle,
      toggleButton.dataset.published === 'true'
    );
  }
});

async function editArticle(id) {
  const { data, error } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    showMessage('articleMessage', error.message, true);
    return;
  }

  editingArticleId = data.id;

  document.getElementById('articleTitle').value = data.title;
  document.getElementById('articleCategory').value = data.category || 'Analiza';
  document.getElementById('articleRead').value = data.read_time || '3 min';
  document.getElementById('articleExcerpt').value = data.excerpt || '';
  document.getElementById('articleBody').value = data.content || '';
  document.getElementById('articleImage').value = data.image_url || '';
  document.getElementById('articlePublished').checked = data.published;

  document.getElementById('formHeading').textContent = 'Edytuj artykuł';
  document.getElementById('saveArticleButton').textContent = 'Zapisz zmiany';
  document.getElementById('cancelEditButton').classList.remove('hidden');

  articleForm.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

articleForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const article = {
    title: document.getElementById('articleTitle').value.trim(),
    category: document.getElementById('articleCategory').value,
    read_time: document.getElementById('articleRead').value.trim(),
    excerpt: document.getElementById('articleExcerpt').value.trim(),
    content: document.getElementById('articleBody').value.trim(),
    image_url: document.getElementById('articleImage').value.trim() || null,
    published: document.getElementById('articlePublished').checked
  };

  if (!article.title || !article.excerpt || !article.content) {
    showMessage('articleMessage', 'Uzupełnij wymagane pola.', true);
    return;
  }

  const button = document.getElementById('saveArticleButton');
  button.disabled = true;
  showMessage('articleMessage', 'Zapisywanie...');

  try {
    let result;

    if (editingArticleId) {
      result = await db
        .from('articles')
        .update(article)
        .eq('id', editingArticleId);
    } else {
      result = await db
        .from('articles')
        .insert(article);
    }

    if (result.error) throw result.error;

    showMessage(
      'articleMessage',
      editingArticleId ? 'Zmiany zapisane!' : 'Artykuł dodany!'
    );

    resetArticleForm();
    await loadAdminArticles();

  } catch (error) {
    console.error('Błąd zapisywania:', error);
    showMessage('articleMessage', 'Błąd: ' + error.message, true);

  } finally {
    button.disabled = false;
  }
});

async function deleteArticle(id) {
  if (!confirm('Czy na pewno chcesz usunąć ten artykuł?')) {
    return;
  }

  try {
    const { error } = await db
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showMessage('articleMessage', 'Artykuł usunięty.');
    await loadAdminArticles();

  } catch (error) {
    console.error('Błąd usuwania:', error);
    showMessage('articleMessage', 'Błąd: ' + error.message, true);
  }
}

async function togglePublished(id, currentlyPublished) {
  try {
    const { error } = await db
      .from('articles')
      .update({ published: !currentlyPublished })
      .eq('id', id);

    if (error) throw error;

    showMessage(
      'articleMessage',
      currentlyPublished ? 'Artykuł ukryty.' : 'Artykuł opublikowany.'
    );

    await loadAdminArticles();

  } catch (error) {
    console.error('Błąd zmiany publikacji:', error);
    showMessage('articleMessage', 'Błąd: ' + error.message, true);
  }
}

function resetArticleForm() {
  editingArticleId = null;
  articleForm.reset();

  document.getElementById('articleId').value = '';
  document.getElementById('articleRead').value = '3 min';
  document.getElementById('articlePublished').checked = true;
  document.getElementById('formHeading').textContent = 'Dodaj nowy artykuł';
  document.getElementById('saveArticleButton').textContent = 'Opublikuj artykuł';
  document.getElementById('cancelEditButton').classList.add('hidden');
}

document.getElementById('cancelEditButton').addEventListener('click', () => {
  resetArticleForm();
  showMessage('articleMessage', '');
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    showLogin();
  }
});

checkSession();

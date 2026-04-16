// Authentification partagée pour toutes les pages admin.
// Charge avant tous les autres scripts admin.
//
// L'auth est désormais backend-gated via /api/auth/* (Netlify Functions).
// Aucun identifiant ni mot de passe en clair ici — juste le JWT signé par le serveur.

const TOKEN_KEY = 'adminToken';
const EXPIRY_KEY = 'adminExpiry';

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('admin-shell')) {
    document.body.classList.add('admin-shell');
  }
  checkAuthentication();
});

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function isSessionValid() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return false;
  if (Date.now() >= parseInt(expiry, 10)) {
    clearSession();
    return false;
  }
  return true;
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
}

function setSession(token, expiresAt) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRY_KEY, String(expiresAt));
}

// Exposé globalement pour les autres scripts admin (contentful_admin utilise getAdminToken)
window.getAdminToken = getToken;
window.clearAdminSession = () => {
  clearSession();
  window.location.href = '/admin/admin.html';
};

async function checkAuthentication() {
  if (!isSessionValid()) {
    showLoginForm();
    return;
  }
  // Revalidation serveur au boot (évite d'utiliser un JWT manipulé côté client).
  // On ne purge la session qu'en cas de 401/403 explicite — un 404 (live-server sans
  // functions) ou une erreur réseau passe en mode dégradé avec un warn.
  try {
    const resp = await fetch('/api/auth/me', {
      headers: { 'x-admin-token': `Bearer ${getToken()}` },
    });
    if (resp.status === 401 || resp.status === 403) {
      clearSession();
      showLoginForm();
      return;
    }
  } catch {
    console.warn('[admin.js] /api/auth/me injoignable, session locale utilisée');
  }
  markAuthenticated();
}

function markAuthenticated() {
  document.body.classList.add('authenticated');
  document.dispatchEvent(new CustomEvent('admin:authenticated'));
  const mainContent = document.querySelector('.admin-main');
  if (mainContent && mainContent.style.display === 'none') {
    mainContent.style.display = 'block';
  }
}

function showLoginForm() {
  const body = document.body;

  const overlay = document.createElement('div');
  overlay.classList.add('login-overlay');

  const loginBox = document.createElement('div');
  loginBox.classList.add('login-box');

  const title = document.createElement('h2');
  title.textContent = 'Identification requise';
  loginBox.appendChild(title);

  const errorMsg = document.createElement('div');
  errorMsg.classList.add('login-error');
  errorMsg.style.display = 'none';
  loginBox.appendChild(errorMsg);

  const labelID = document.createElement('label');
  labelID.textContent = 'Identifiant';
  loginBox.appendChild(labelID);

  const inputID = document.createElement('input');
  inputID.type = 'text';
  inputID.placeholder = 'Entrez votre ID';
  inputID.autocomplete = 'username';
  loginBox.appendChild(inputID);

  const labelPass = document.createElement('label');
  labelPass.textContent = 'Code';
  loginBox.appendChild(labelPass);

  const inputPass = document.createElement('input');
  inputPass.type = 'password';
  inputPass.placeholder = 'Entrez votre code';
  inputPass.autocomplete = 'current-password';
  loginBox.appendChild(inputPass);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Se connecter';

  const submit = async () => {
    const enteredID = inputID.value.trim();
    const enteredPass = inputPass.value;
    if (!enteredID || !enteredPass) {
      errorMsg.textContent = 'Identifiant et code requis.';
      errorMsg.style.display = 'block';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Vérification…';
    errorMsg.style.display = 'none';

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: enteredID, password: enteredPass }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        errorMsg.textContent = data?.error || `Échec (${resp.status}).`;
        errorMsg.style.display = 'block';
        return;
      }
      const data = await resp.json();
      if (!data?.token || !data?.expiresAt) {
        errorMsg.textContent = 'Réponse serveur invalide.';
        errorMsg.style.display = 'block';
        return;
      }
      setSession(data.token, data.expiresAt);
      body.removeChild(overlay);
      markAuthenticated();
    } catch (e) {
      errorMsg.textContent = `Impossible de contacter le serveur : ${e.message}`;
      errorMsg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  };

  submitBtn.addEventListener('click', submit);
  inputPass.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  inputID.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inputPass.focus();
  });
  loginBox.appendChild(submitBtn);

  overlay.appendChild(loginBox);
  body.appendChild(overlay);
  inputID.focus();
}

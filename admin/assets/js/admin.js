// Identifiants (ID et mot de passe) modifiables facilement
const ADMIN_ID = "Juniv-Admin";      // Changer "admin" par l'identifiant souhaité
const ADMIN_PASSWORD = "v&kQ1n#31s&N"; // Changer "1234" par le mot de passe souhaité

// Durée de la session (en millisecondes), par exemple 1 heure = 3600000 ms
const SESSION_DURATION = 1800000; // Modifier cette valeur si besoin

document.addEventListener('DOMContentLoaded', () => {
    console.log("Panneau d'administration chargé avec succès !");

    checkAuthentication();
});

function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    const sessionExpiry = sessionStorage.getItem('sessionExpiry');

    if (isAuthenticated === 'true' && sessionExpiry) {
        const now = Date.now();
        if (now < parseInt(sessionExpiry, 10)) {
            // Session encore valide
            showAdminContent();
            checkServiceStatus();
            return;
        } else {
            // Session expirée
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('sessionExpiry');
        }
    }
    // Si pas authentifié ou session expirée, montrer login form
    showLoginForm();
}

// Affiche le formulaire de connexion
function showLoginForm() {
    const body = document.querySelector('body');

    const overlay = document.createElement('div');
    overlay.classList.add('login-overlay');

    const loginBox = document.createElement('div');
    loginBox.classList.add('login-box');

    const title = document.createElement('h2');
    title.textContent = "Identification requise";
    loginBox.appendChild(title);

    const errorMsg = document.createElement('div');
    errorMsg.classList.add('login-error');
    errorMsg.style.display = 'none';
    loginBox.appendChild(errorMsg);

    const labelID = document.createElement('label');
    labelID.textContent = "Identifiant";
    loginBox.appendChild(labelID);

    const inputID = document.createElement('input');
    inputID.type = 'text';
    inputID.placeholder = 'Entrez votre ID';
    loginBox.appendChild(inputID);

    const labelPass = document.createElement('label');
    labelPass.textContent = "Code";
    loginBox.appendChild(labelPass);

    const inputPass = document.createElement('input');
    inputPass.type = 'password';
    inputPass.placeholder = 'Entrez votre code';
    loginBox.appendChild(inputPass);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = "Se connecter";
    submitBtn.addEventListener('click', () => {
        const enteredID = inputID.value.trim();
        const enteredPass = inputPass.value.trim();

        if (enteredID === ADMIN_ID && enteredPass === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAuthenticated', 'true');
            const expiryTime = Date.now() + SESSION_DURATION;
            sessionStorage.setItem('sessionExpiry', expiryTime.toString());

            body.removeChild(overlay);
            showAdminContent();
            checkServiceStatus();
        } else {
            errorMsg.textContent = "Identifiant ou code incorrect.";
            errorMsg.style.display = 'block';
        }
    });
    loginBox.appendChild(submitBtn);

    overlay.appendChild(loginBox);
    body.appendChild(overlay);
}

// Affiche le contenu admin après identification
function showAdminContent() {
    const mainContent = document.querySelector('.admin-main');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// Vérification de l'état des services pour afficher des notifications si nécessaire
async function checkServiceStatus() {
    const services = [
        { name: "Gestion des profils", url: "profiles.html" },
        { name: "Gestion des événements", url: "events.html" },
        { name: "Paramètres", url: "settings.html" },
        { name: "Statistiques", url: "analytics.html" },
    ];

    for (const service of services) {
        try {
            const response = await fetch(service.url, { method: "HEAD" });
            if (!response.ok) {
                console.warn(`${service.name} est indisponible.`);
            }
        } catch (error) {
            console.error(`Erreur lors de la vérification de ${service.name} :`, error);
        }
    }
}

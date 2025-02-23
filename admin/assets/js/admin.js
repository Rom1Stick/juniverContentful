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

// Créer un intercepteur d'erreurs console
class ServiceMonitor {
    constructor() {
        this.errors = new Map();
        this.setupConsoleInterceptor();
    }

    setupConsoleInterceptor() {
        // Sauvegarder les fonctions console originales
        const originalConsole = {
            error: console.error,
            warn: console.warn
        };

        // Intercepter console.error
        console.error = (...args) => {
            this.handleError('error', args);
            originalConsole.error.apply(console, args);
        };

        // Intercepter console.warn
        console.warn = (...args) => {
            this.handleError('warning', args);
            originalConsole.warn.apply(console, args);
        };
    }

    handleError(level, args) {
        const errorMessage = args.join(' ');
        const timestamp = Date.now();

        // Analyser l'erreur pour identifier le service concerné
        const service = this.identifyService(errorMessage);
        if (service) {
            if (!this.errors.has(service)) {
                this.errors.set(service, []);
            }
            this.errors.get(service).push({
                level,
                message: errorMessage,
                timestamp
            });
        }
    }

    identifyService(errorMessage) {
        // Définir des mots-clés pour identifier les services
        const serviceKeywords = {
            'profiles': ['profil', 'profile', 'admin_profiles'],
            'articles': ['article', 'admin_articles'],
            'events': ['event', 'événement', 'admin_events'],
            'workshops': ['workshop', 'atelier', 'admin_workshops']
        };

        for (const [service, keywords] of Object.entries(serviceKeywords)) {
            if (keywords.some(keyword => errorMessage.toLowerCase().includes(keyword))) {
                return service;
            }
        }
        return null;
    }

    getServiceStatus(serviceName) {
        const serviceErrors = this.errors.get(serviceName) || [];
        const recentErrors = serviceErrors.filter(error => 
            Date.now() - error.timestamp < 5000 // Erreurs des 5 dernières secondes
        );

        if (recentErrors.length === 0) {
            return { status: 'operational', confidence: 1 };
        }

        const errorCount = recentErrors.length;
        const criticalErrors = recentErrors.filter(e => e.level === 'error').length;

        if (criticalErrors > 0) {
            return { 
                status: 'error', 
                confidence: criticalErrors / errorCount,
                lastError: recentErrors[recentErrors.length - 1].message
            };
        }

        return { 
            status: 'warning', 
            confidence: 0.5,
            lastWarning: recentErrors[recentErrors.length - 1].message
        };
    }

    clearOldErrors() {
        const now = Date.now();
        for (const [service, errors] of this.errors.entries()) {
            this.errors.set(service, errors.filter(error => 
                now - error.timestamp < 300000 // Garder les erreurs des 5 dernières minutes
            ));
        }
    }
}

// Modifier la fonction checkServiceStatus pour le nouvel affichage
const serviceMonitor = new ServiceMonitor();

async function checkServiceStatus() {
    const services = [
        { 
            name: "Gestion des profils", 
            url: "/admin/assets/views/admin_profiles.html",
            icon: '<i class="fas fa-users-cog"></i>'
        },
        { 
            name: "Gestion des événements", 
            url: "/admin/assets/views/admin_events.html",
            icon: '<i class="fas fa-calendar-alt"></i>'
        },
        { 
            name: "Gestion des articles", 
            url: "/admin/assets/views/admin_articles.html",
            icon: '<i class="fas fa-newspaper"></i>'
        },
        { 
            name: "Gestion des ateliers", 
            url: "/admin/assets/views/admin_workshops.html",
            icon: '<i class="fas fa-chalkboard-teacher"></i>'
        },
        { 
            name: "Paramètres", 
            url: "/admin/assets/views/admin_settings.html",
            icon: '<i class="fas fa-cogs"></i>',
            implemented: false
        },
        { 
            name: "Statistiques", 
            url: "/admin/assets/views/admin_analytics.html",
            icon: '<i class="fas fa-chart-line"></i>',
            implemented: false
        }
    ];

    const notifications = document.createElement('div');
    notifications.className = 'admin-notifications minimized';
    
    // Modifier la création du bouton toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-notifications';
    toggleBtn.innerHTML = `
        <div class="toggle-content">
            <span class="toggle-icon"><i class="fas fa-server"></i></span>
            <span class="toggle-text">État des Services</span>
        </div>
        <span class="toggle-arrow"><i class="fas fa-chevron-down"></i></span>
    `;
    notifications.appendChild(toggleBtn);

    // Conteneur pour les indicateurs minimalistes
    const miniIndicators = document.createElement('div');
    miniIndicators.className = 'mini-indicators';
    notifications.appendChild(miniIndicators);

    // Conteneur pour les détails (modal)
    const detailsModal = document.createElement('div');
    detailsModal.className = 'service-details-modal';
    detailsModal.style.display = 'none';
    
    // Créer le conteneur pour la vue étendue
    const expandedView = document.createElement('div');
    expandedView.className = 'expanded-services-view';
    expandedView.style.display = 'none';
    notifications.appendChild(expandedView);

    for (const service of services) {
        const miniIndicator = document.createElement('div');
        miniIndicator.className = 'mini-indicator';
        
        try {
            const status = await checkServiceHealth(service);
            miniIndicator.className = `mini-indicator ${status.state}`;
            miniIndicator.innerHTML = `
                <span class="indicator-icon">${service.icon}</span>
                <span class="indicator-dot"></span>
            `;

            // Créer l'élément pour la vue étendue
            const expandedService = document.createElement('div');
            expandedService.className = `expanded-service ${status.state}`;
            expandedService.innerHTML = `
                <div class="service-brief">
                    <span class="service-icon">${service.icon}</span>
                    <div class="service-info">
                        <h4>${service.name}</h4>
                        <span class="status-badge ${status.state}">${getStatusText(status.state)}</span>
                    </div>
                    <div class="service-metrics">
                        <span class="metric">
                            <i class="fas fa-clock"></i>
                            ${Math.round(status.responseTime)}ms
                        </span>
                        <span class="metric">
                            <i class="fas fa-chart-line"></i>
                            ${status.uptime}% uptime
                        </span>
                    </div>
                    <button class="info-btn" data-service="${service.name}">
                        <i class="fas fa-info-circle"></i>
                        Détails
                    </button>
                </div>
            `;
            expandedView.appendChild(expandedService);

            // Créer la carte détaillée pour le modal
            const detailCard = createDetailCard(service, status);
            detailsModal.appendChild(detailCard);

            // Événement pour le bouton info
            expandedService.querySelector('.info-btn').addEventListener('click', () => {
                showServiceDetails(detailCard);
            });

        } catch (error) {
            miniIndicator.className = 'mini-indicator error';
        }
        
        miniIndicators.appendChild(miniIndicator);
    }

    // Modifier le comportement du toggle
    toggleBtn.addEventListener('click', () => {
        if (notifications.classList.contains('minimized')) {
            notifications.classList.remove('minimized');
            expandedView.classList.remove('hidden');
            expandedView.classList.add('visible');
            expandedView.style.display = 'block';
            miniIndicators.style.display = 'none';
        } else {
            expandedView.classList.remove('visible');
            expandedView.classList.add('hidden');
            // Attendre la fin de l'animation avant de cacher
            setTimeout(() => {
                if (expandedView.classList.contains('hidden')) {
                    expandedView.style.display = 'none';
                    notifications.classList.add('minimized');
                    miniIndicators.style.display = 'flex';
                }
            }, 300); // Correspond à la durée de la transition
        }
    });

    document.body.appendChild(detailsModal);
    
    const mainContent = document.querySelector('.admin-main');
    if (mainContent) {
        mainContent.insertBefore(notifications, mainContent.firstChild);
    }

    // Mise à jour en temps réel
    setInterval(() => updateServiceStatus(services), 30000);
}

async function checkServiceHealth(service) {
    try {
        // Si le service n'est pas implémenté, retourner directement l'état
        if (service.implemented === false) {
            return {
                state: 'pending',
                lastCheck: new Date(),
                responseTime: 0,
                uptime: 0
            };
        }

        const response = await fetch(service.url, { method: "HEAD" });
        const monitorStatus = serviceMonitor.getServiceStatus(service.name.toLowerCase());
        
        return {
            state: !response.ok ? 'error' : 
                   monitorStatus.status === 'warning' ? 'warning' : 
                   'success',
            response: response,
            monitorStatus: monitorStatus,
            lastCheck: new Date(),
            responseTime: performance.now(),
            uptime: calculateUptime(service)
        };
    } catch (error) {
        return {
            state: 'error',
            error: error,
            lastCheck: new Date()
        };
    }
}

function createDetailCard(service, status) {
    const card = document.createElement('div');
    card.className = `service-detail-card ${status.state}`;
    card.dataset.serviceId = service.name;

    const cardContent = `
        <div class="detail-header">
            <span class="detail-icon">${service.icon}</span>
            <h3>${service.name}</h3>
            <span class="status-badge ${status.state}">${getStatusText(status.state)}</span>
        </div>
        <div class="detail-content">
            <div class="metric">
                <span class="metric-label">Temps de réponse</span>
                <span class="metric-value">${Math.round(status.responseTime)}ms</span>
            </div>
            <div class="metric">
                <span class="metric-label">Dernière vérification</span>
                <span class="metric-value">${status.lastCheck.toLocaleTimeString()}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Disponibilité</span>
                <span class="metric-value">${status.uptime}%</span>
            </div>
            ${status.monitorStatus?.lastError ? `
                <div class="error-log">
                    <h4>Dernier incident</h4>
                    <p>${status.monitorStatus.lastError}</p>
                </div>
            ` : ''}
        </div>
    `;
    card.innerHTML = cardContent;
    return card;
}

function showServiceDetails(detailCard) {
    const modal = document.querySelector('.service-details-modal');
    modal.innerHTML = '';
    modal.appendChild(detailCard.cloneNode(true));
    modal.style.display = 'flex';
    
    // Fermeture du modal
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-modal';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => modal.style.display = 'none';
    modal.appendChild(closeBtn);
}

async function updateServiceStatus(services) {
    const miniIndicators = document.querySelectorAll('.mini-indicator');
    
    for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const indicator = miniIndicators[i];
        
        if (!indicator) continue;

        try {
            const status = await checkServiceHealth(service);
            
            // Mettre à jour l'indicateur
            indicator.className = `mini-indicator ${status.state}`;
            
            // Mettre à jour la carte détaillée si elle est affichée
            const modal = document.querySelector('.service-details-modal');
            if (modal.style.display === 'flex') {
                const currentCard = modal.querySelector('.service-detail-card');
                if (currentCard && currentCard.dataset.serviceId === service.name) {
                    const updatedCard = createDetailCard(service, status);
                    modal.replaceChild(updatedCard, currentCard);
                }
            }
        } catch (error) {
            indicator.className = 'mini-indicator error';
        }
    }
}

function getStatusText(state) {
    switch (state) {
        case 'success':
            return 'Opérationnel';
        case 'warning':
            return 'Avertissement';
        case 'error':
            return 'Erreur';
        case 'pending':
            return 'En développement';
        default:
            return 'État inconnu';
    }
}

// Ajouter cette fonction pour calculer l'uptime
function calculateUptime(service) {
    // Pour l'instant, retourner une valeur fixe
    // À implémenter avec un vrai système de suivi
    return 99.9;
}

import { fetchContent } from '../../js/contentful.js';

let pastEvents = [];
let upcomingEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des événements...");

    try {
        const events = await fetchEvents();
        const currentDate = new Date();

        // Séparer les événements passés et futurs
        upcomingEvents = events.filter(event => event.date >= currentDate);
        pastEvents = events.filter(event => event.date < currentDate);

        // Trier les événements par date (ascendant)
        upcomingEvents.sort((a, b) => a.date - b.date);
        pastEvents.sort((a, b) => b.date - a.date); // Passés triés en descendant

        // Afficher les événements à venir
        displayUpcomingEvents(upcomingEvents);

        // Initialiser le calendrier
        displayCalendar(upcomingEvents, currentDate);

        // Ajouter un gestionnaire pour afficher/masquer les événements passés
        setupPastEventsButton();
    } catch (error) {
        console.error("Erreur lors du chargement des événements :", error);
    }
});

// Fonction pour récupérer les événements depuis Contentful
async function fetchEvents() {
    try {
        const events = await fetchContent('event');
        return events.map(event => ({
            id: event.sys.id,
            title: event.fields.title || 'Sans titre',
            description: event.fields.description || '',
            date: new Date(event.fields.date),
            location: event.fields.location || 'Lieu non spécifié'
        }));
    } catch (error) {
        console.error("Erreur lors de la récupération des événements :", error);
        return [];
    }
}

// Fonction pour afficher la liste des événements à venir
function displayUpcomingEvents(events) {
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = '';

    if (events.length === 0) {
        eventList.innerHTML = '<li>Aucun événement à venir.</li>';
        return;
    }

    events.forEach(event => {
        const li = document.createElement('li');
        li.innerHTML = `
            <h3>${event.title}</h3>
            <p><strong>Date :</strong> ${event.date.toLocaleDateString()}</p>
            <p><strong>Lieu :</strong> ${event.location}</p>
            <p>${event.description}</p>
        `;
        eventList.appendChild(li);
    });
}

// Fonction pour configurer le bouton des événements passés
function setupPastEventsButton() {
    const button = document.getElementById('toggle-past-events');
    const pastEventsSection = document.getElementById('past-events-section');
    const pastEventList = document.getElementById('past-event-list');

    // Afficher le bouton uniquement si des événements passés existent
    if (pastEvents.length > 0) {
        button.style.display = 'block';

        button.addEventListener('click', () => {
            if (pastEventsSection.style.display === 'none') {
                pastEventsSection.style.display = 'block';
                button.textContent = 'Masquer les événements passés';

                // Afficher les événements passés
                pastEventList.innerHTML = pastEvents.map(event => `
                    <li>
                        <h3>${event.title}</h3>
                        <p><strong>Date :</strong> ${event.date.toLocaleDateString()}</p>
                        <p><strong>Lieu :</strong> ${event.location}</p>
                        <p>${event.description}</p>
                    </li>
                `).join('');
            } else {
                pastEventsSection.style.display = 'none';
                button.textContent = 'Afficher les événements passés';
            }
        });
    }
}

// Fonction pour afficher le calendrier
function displayCalendar(events, date) {
    const calendar = document.getElementById('calendar');
    if (!calendar) {
        console.error("Conteneur du calendrier introuvable.");
        return;
    }

    // Efface le contenu précédent
    calendar.innerHTML = '';

    // Création de l'en-tête du calendrier
    const header = document.createElement('div');
    header.classList.add('calendar-header');
    header.textContent = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    calendar.appendChild(header);

    // Ajout des boutons de navigation
    const navigation = document.createElement('div');
    navigation.classList.add('calendar-navigation');
    navigation.innerHTML = `
        <button id="prev-month" class="calendar-nav">&lt;</button>
        <button id="next-month" class="calendar-nav">&gt;</button>
    `;
    calendar.appendChild(navigation);

    // Ajout des jours de la semaine
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const grid = document.createElement('div');
    grid.classList.add('calendar-grid');

    daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-cell', 'calendar-header-cell');
        dayEl.textContent = day;
        grid.appendChild(dayEl);
    });

    // Calcul des dates du mois
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Ajout des cellules vides pour les jours avant le début du mois
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('calendar-cell', 'empty');
        grid.appendChild(emptyCell);
    }

    // Ajout des cellules pour les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-cell');
        dayCell.textContent = day;

        // Vérifie s'il y a des événements pour ce jour
        const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
        const eventsForDay = events.filter(event =>
            event.date.toDateString() === dayDate.toDateString()
        );

        if (eventsForDay.length > 0) {
            dayCell.classList.add('has-event');

            // Ajoute une pastille (optionnelle)
            const badge = document.createElement('span');
            badge.classList.add('event-badge');
            dayCell.appendChild(badge);

            // Ajoute un gestionnaire de clic pour afficher les détails des événements
            dayCell.addEventListener('click', () => showEventDetails(eventsForDay));
        }

        grid.appendChild(dayCell);
    }

    // Ajout de la grille au calendrier
    calendar.appendChild(grid);

    // Ajout des événements de navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        displayCalendar(events, prevMonth);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        displayCalendar(events, nextMonth);
    });
}

// Fonction pour afficher les détails d'un ou plusieurs événements
function showEventDetails(eventsForDay) {
    const detailsContainer = document.getElementById('event-details');
    if (!detailsContainer) {
        console.error("Conteneur des détails des événements introuvable.");
        return;
    }

    detailsContainer.innerHTML = eventsForDay.map(event => `
        <div class="event-detail">
            <h3>${event.title}</h3>
            <p><strong>Date :</strong> ${event.date.toLocaleDateString()}</p>
            <p><strong>Lieu :</strong> ${event.location}</p>
            <p>${event.description}</p>
        </div>
    `).join('');

    detailsContainer.classList.remove('hidden');
}

// Gestion de la modal des tarifs
const pricingModal = document.getElementById('pricing-modal');
const togglePricingBtn = document.getElementById('toggle-pricing');
const closeModalBtn = document.querySelector('.close-modal');

togglePricingBtn.addEventListener('click', () => {
    pricingModal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
    pricingModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === pricingModal) {
        pricingModal.style.display = 'none';
    }
});

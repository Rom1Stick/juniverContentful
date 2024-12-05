import { fetchContent } from '../../js/contentful.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement des événements...");
    try {
        const events = await fetchEvents();
        if (events && events.length > 0) {
            const currentDate = new Date();
            displayCalendar(events, currentDate);
        } else {
            console.warn("Aucun événement trouvé.");
        }
    } catch (error) {
        console.error("Erreur lors du chargement des événements :", error);
    }
});

// Fonction pour récupérer les événements depuis Contentful
async function fetchEvents() {
  try {
      const events = await fetchContent('event');
      console.log("Événements récupérés :", events);

      const eventsWithLocation = await Promise.all(
          events.map(async event => {
              let location = 'Lieu non spécifié';

              const locationField = event.fields.location;
              if (locationField && locationField.lat && locationField.lon) {
                  const { lat, lon } = locationField;

                  // Appel à l'API OpenStreetMap pour obtenir une adresse
                  try {
                      const address = await fetchAddressFromCoordinates(lat, lon);
                      location = address || `Latitude: ${lat}, Longitude: ${lon}`;
                  } catch (error) {
                      console.warn("Impossible de récupérer l'adresse :", error);
                      location = `Latitude: ${lat}, Longitude: ${lon}`;
                  }
              }

              return {
                  title: event.fields.title,
                  description: event.fields.description,
                  date: new Date(event.fields.date),
                  location: location
              };
          })
      );

      return eventsWithLocation;
  } catch (error) {
      console.error("Erreur lors de la récupération des événements :", error);
      return [];
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

            // Ajoute une pastille rouge au numéro du jour
            const badge = document.createElement('span');
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

async function fetchAddressFromCoordinates(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
      const data = await response.json();
      console.log("Adresse récupérée :", data);
      return data.display_name; // Retourne une adresse lisible
  } catch (error) {
      console.error("Erreur lors de la récupération de l'adresse :", error);
      return null; // Retourne null si une erreur survient
  }
}

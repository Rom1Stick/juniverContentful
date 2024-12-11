import { SPACE_ID, CMA_ACCESS_TOKEN, fetchEventsAdmin, createEvent, updateEvent, deleteEvent, unpublishEvent } from '/admin/assets/js/contentful_admin.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Chargement de l'administration des évènements...");

    try {
        await loadEvents();
    } catch (error) {
        console.error("Erreur lors du chargement des évènements :", error);
    }

    document.getElementById('add-event-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        let title = document.getElementById('event-title').value.trim();
        let date = document.getElementById('event-date').value.trim();
        let eventLocation = document.getElementById('event-location').value.trim();
        let description = (document.getElementById('event-description').value || '').trim();

        if (title.length < 3) {
            title = "Test Event Long Title"; 
        }

        if (!title || !date || !eventLocation) {
            alert("Veuillez renseigner les champs obligatoires (titre, date, lieu).");
            return;
        }

        // datetime-local => YYYY-MM-DDTHH:mm
        // On rajoute ':00' pour les secondes
        if (date.includes('T') && date.length === 16) { 
            date += ':00';
        }

        try {
            await createEvent({ title, date, location: eventLocation, description });
            alert("Évènement ajouté avec succès !");
            e.target.reset();
            window.location.reload();
        } catch (error) {
            console.error("Erreur lors de l'ajout de l'évènement :", error);
            alert("Erreur lors de l'ajout de l'évènement.");
        }
    });
});

async function loadEvents() {
    const events = await fetchEventsAdmin();
    displayEvents(events);
}

function displayEvents(events) {
    const container = document.getElementById('events-container');
    container.innerHTML = "";

    if (!events || events.length === 0) {
        container.innerHTML = "<p>Aucun évènement disponible.</p>";
        return;
    }

    events.forEach(event => {
        const title = event.fields.title?.['en-US'] || 'Sans titre';
        let date = event.fields.date?.['en-US'] || '2024-01-01T00:00:00';
        const eventLocation = event.fields.location?.['en-US'] || 'Non spécifié';
        const description = event.fields.description?.['en-US'] || '';

        const dateObj = new Date(date);
        const dateStr = isNaN(dateObj.getTime()) ? date : dateObj.toLocaleString();

        const eventId = event.sys.id;

        const eventEl = document.createElement('div');
        eventEl.classList.add('event-item');
        eventEl.innerHTML = `
          <h3>${title}</h3>
          <small>Date : ${dateStr}</small>
          <p><strong>Lieu :</strong> ${eventLocation}</p>
          <p>${description}</p>
          <button class="edit-event" data-id="${eventId}">Modifier</button>
          <button class="delete-event" data-id="${eventId}">Supprimer</button>
        `;
        container.appendChild(eventEl);

        const editButton = eventEl.querySelector('.edit-event');
        const deleteButton = eventEl.querySelector('.delete-event');

        editButton.addEventListener('click', () => handleEditEvent(eventId));
        deleteButton.addEventListener('click', () => handleDeleteEvent(eventId));
    });
}

async function handleEditEvent(eventId) {
    console.log("Modification de l'évènement avec l'ID :", eventId);
    try {
        const event = await fetchEventById(eventId);
        const title = event.fields.title?.['en-US'] || '';
        let date = event.fields.date?.['en-US'] || '';
        const eventLocation = event.fields.location?.['en-US'] || '';
        const description = event.fields.description?.['en-US'] || '';

        if (date && date.length > 16) {
            date = date.slice(0,16); 
        }

        document.getElementById('update-event-title').value = title;
        document.getElementById('update-event-date').value = date;
        document.getElementById('update-event-location').value = eventLocation;
        document.getElementById('update-event-description').value = description;

        document.getElementById('update-event-section').style.display = 'block';

        const form = document.getElementById('update-event-form');
        form.onsubmit = async (e) => {
            e.preventDefault();

            let updatedTitle = document.getElementById('update-event-title').value.trim();
            let updatedDate = document.getElementById('update-event-date').value.trim();
            let updatedLocation = document.getElementById('update-event-location').value.trim();
            let updatedDescription = (document.getElementById('update-event-description').value || '').trim();

            if (updatedTitle.length < 3) {
                updatedTitle = "Updated Test Event Long Title"; 
            }

            if (!updatedTitle || !updatedDate || !updatedLocation) {
                alert("Veuillez renseigner les champs obligatoires.");
                return;
            }

            if (updatedDate.includes('T') && updatedDate.length === 16) {
                updatedDate += ':00';
            }

            try {
                await updateEvent(eventId, { title: updatedTitle, date: updatedDate, location: updatedLocation, description: updatedDescription });
                alert("Évènement mis à jour avec succès !");
                window.location.reload();
            } catch (error) {
                console.error("Erreur lors de la mise à jour de l'évènement :", error);
                alert("Une erreur est survenue lors de la mise à jour de l'évènement.");
            }
        };
    } catch (error) {
        console.error("Erreur lors de la récupération de l'évènement pour modification :", error);
    }
}

async function handleDeleteEvent(eventId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet évènement ?")) {
        try {
            await unpublishEvent(eventId);
            await deleteEvent(eventId);
            alert("Évènement supprimé avec succès !");
            window.location.reload();
        } catch (error) {
            console.error("Erreur lors de la suppression de l'évènement :", error);
            alert("Une erreur est survenue lors de la suppression de l'évènement.");
        }
    }
}

async function fetchEventById(eventId) {
    const url = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master/entries/${eventId}`;
    const headers = {
        'Authorization': `Bearer ${CMA_ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
    };

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error(`Erreur lors de la récupération de l'évènement : ${response.status}`);
    return response.json();
}

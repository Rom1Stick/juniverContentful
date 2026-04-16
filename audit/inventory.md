# Phase 1 — Inventaire du dashboard admin

_Lecture seule, aucun changement appliqué dans cette phase._

## Stack & particularités

- Site statique vanilla ES modules + SCSS Dart Sass.
- Aucun backend ni base de données : la donnée vit dans **Contentful** (Delivery API pour le public, Management API pour l'admin).
- Pas de migrations ni de framework de routage : chaque page est un fichier HTML statique servi par live-server / nginx.
- Auth admin : mot de passe codé en dur dans `admin/assets/js/admin.js` (non négociable côté front pour l'instant), session 30 min en `sessionStorage`.

## Routes admin (6 pages)

| Route                                          | Vue / page                           | Scripts JS chargés                                                                       | Modèle Contentful (CMA)         |
| ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------- |
| `/admin/admin.html`                            | Tableau de bord (grille de services) | `admin.js`, `adminChrome.js`                                                             | —                               |
| `/admin/assets/views/admin_profiles.html`      | Profils thérapeutes                  | `admin.js`, `adminChrome.js`, `admin_profiles.js`                                        | `profile`                       |
| `/admin/assets/views/admin_events.html`        | Évènements                           | `admin.js`, `adminChrome.js`, `admin_events.js`                                          | `event`                         |
| `/admin/assets/views/admin_articles.html`      | Articles du journal                  | `admin.js`, `adminChrome.js`, `admin_articles.js`                                        | `article`                       |
| `/admin/assets/views/admin_workshops.html`     | Ateliers                             | `admin.js`, `adminChrome.js`, `admin_workshops.js`                                       | `workshop` (+ `profile` lookup) |
| `/admin/assets/views/admin_inline_editor.html` | Éditeur inline du contenu site       | `admin.js`, `admin_inline_editor.js` (pas d'`adminChrome.js`, chrome dédié `.ie-topbar`) | `siteCopy`                      |

## Menu(s) d'admin

Il existe **deux entrées de navigation**, partiellement redondantes :

1. **Topbar `.admin-topbar`** injectée par `adminChrome.js` sur 5 pages (toutes sauf l'inline editor) — liens : Profils, Évènements, Articles, Ateliers, Contenu, « Voir le site », Déconnexion.
2. **Grille de services** sur `admin.html` — 5 tuiles redirigeant exactement vers les mêmes 5 pages que la topbar.

→ doublon volontaire (la grille sert d'accueil) mais à confirmer en Phase 4.

## Content types Contentful

| Content type | Entrées (au crawl) | Lecture                                                                    | Écriture                 |
| ------------ | ------------------ | -------------------------------------------------------------------------- | ------------------------ |
| `profile`    | 15                 | `public/js/contentful.js`, `admin/contentful_admin.js`                     | `admin_profiles.js`      |
| `event`      | 30                 | `public/js/contentful.js`, `admin/contentful_admin.js`                     | `admin_events.js`        |
| `article`    | 2                  | `public/js/articles.js` (réutilisé par admin), `admin/contentful_admin.js` | `admin_articles.js`      |
| `workshop`   | 0                  | `admin/contentful_admin.js`                                                | `admin_workshops.js`     |
| `siteCopy`   | 2                  | `public/js/siteCopy.js`                                                    | `admin_inline_editor.js` |

> 61 clés `data-editable` détectées dans l'iframe contre 2 entrées `siteCopy` réellement persistées : c'est nominal — les clés sont créées dans Contentful seulement à la première sauvegarde. Pas une perte de donnée.

## Couplages public ↔ admin

- `adminChrome.js` importe `brandMark` depuis `/public/js/brandMark.js` — couplage anodin, intentionnel.
- `admin_articles.js` importe `fetchArticles` depuis `/public/js/articles.js` — **couplage à surveiller**, à terme à déplacer vers `contentful_admin.js`.

## Inventaire des éléments métier de chaque page admin

### Profils (`admin_profiles.html`)

- Formulaire d'ajout (8 champs : nom, métier, email, téléphone, site, diplômes, description, photo).
- Grille de cartes, chaque carte avec édition inline (`contentEditable`) + bouton « Éditer / Supprimer ».
- Selectors critiques : `#profiles-container`, `#add-profile-form`, `#back-to-top`, `data-id`, `.editable`, `.edit-profile-btn`, `.delete-profile-btn`.

### Évènements (`admin_events.html`)

- Formulaire d'ajout (titre, date+heure, lieu, description).
- Section « Modifier » dupliquée et masquée (`style="display:none"`) — affichée par JS.
- Selectors : `#events-container`, `#add-event-form`, `#update-event-section`.

### Articles (`admin_articles.html`)

- Même pattern qu'évènements : add visible + update masqué.
- Champs : titre, résumé, contenu, image.
- Selectors : `#articles-container`, `#add-article-form`, `#update-article-section`.

### Ateliers (`admin_workshops.html`)

- Formulaire unique add/edit (`#workshop-form` masqué par défaut, ouvert via bouton « Nouvel atelier »).
- Champs : titre, description, récurrence (texte libre), animateurs (cases à cocher peuplées depuis `profile`).
- Pattern le plus propre des 4 (un seul formulaire, un seul handler).

### Éditeur inline (`admin_inline_editor.html`)

- Iframe d'aperçu + sélecteur de page + viewport switch (desktop/mobile) + panneau latéral des textes.
- 8 pages éditables : index, about, workshop, calendar, contact, legal, privacy, succes.
- Communication iframe ↔ parent par `postMessage` (origin `*` — à verrouiller à terme).

## Scripts d'audit déjà disponibles

- `.audit/mobile-audit-live.mjs` — overflow horizontal 390×844 sur les 15 pages public+admin.
- `.audit/auth-flow-test.mjs` — 6 checks E2E sur l'auth (overlay, masquage, login OK/KO, déconnexion).
- `.audit/screenshot-admin.mjs` — captures + erreurs console des 7 vues admin (auth/no-auth).
- **Nouveau** `audit/crawl-admin.mjs` — crawl Phase 3 (status, console, requêtes, contenu listes).

## Conclusion Phase 1

- Aucune route morte côté serveur (toutes répondent 200).
- Périmètre admin : 6 pages, 5 content types, 1 grille de services + 1 topbar (doublon contrôlé).
- Couplage cross-app limité à 2 imports identifiés.
- Le « doute sur la perte de données » est infondé : tous les content types renvoient des entrées (workshops=0 par choix éditorial, à confirmer).

# Phase 3 — Crawl admin (pages cassées / vides)

_Source : `node audit/crawl-admin.mjs` — exécuté le 15/04/2026 sur live-server :3000._
_Captures : `audit/screens/*.png`. Données brutes : `audit/crawl-admin.json`._

## Synthèse

| Page                       | Statut HTTP | Verdict | Erreurs console | 404 | Contenu (texte main) | Items liste |
| -------------------------- | ----------- | ------- | --------------- | --- | -------------------- | ----------- |
| `admin.html` (dashboard)   | 304         | ✅ OK   | 0               | 0   | 418 c.               | n/a         |
| `admin_profiles.html`      | 200         | ✅ OK   | 0               | 0   | 11 760 c.            | 15          |
| `admin_events.html`        | 200         | ✅ OK   | 0               | 0   | 13 916 c.            | 30          |
| `admin_articles.html`      | 200         | ✅ OK   | 0               | 0   | 4 754 c.             | 2           |
| `admin_workshops.html`     | 200         | ✅ OK   | 0               | 0   | 1 408 c.             | **0**       |
| `admin_inline_editor.html` | 200         | ✅ OK   | 0               | 0   | 2 326 c.             | 61          |

## Anomalies identifiées

### 1. Liste « Ateliers » vide sans état UX dédié

- **Symptôme** : la page se charge sans erreur, mais `#workshops-container` est vide → l'utilisateur voit une page « presque blanche » sous le titre.
- **Cause** : aucune entrée `workshop` dans Contentful. C'est un état légitime, pas un bug.
- **Impact** : explique sans doute la « page vide » remontée par l'utilisateur.
- **Action** (Phase 5) : afficher un message explicite + bouton CTA « Créer mon premier atelier » lorsque la liste est vide.

### 2. Échecs de chargement de polices Google (dashboard uniquement)

- Deux requêtes vers `fonts.gstatic.com` (Young Serif, DM Sans) renvoient `net::ERR_ABORTED` depuis le runtime puppeteer headless.
- Comportement vraisemblablement lié à l'environnement headless / réseau de la VM (les polices se chargent normalement dans un Chrome utilisateur — vérifié visuellement).
- **Aucune action requise**, mais à reconfirmer en Phase 6 sur Chrome standard.

### 3. Aucun lien mort, aucune 404, aucune 5xx

Le crawl visite toutes les routes déclarées dans la topbar et la grille de services. Toutes répondent en 200/304 avec contenu.

## Pages public (rappel — pas le scope principal mais utile pour le contraste)

Le script `.audit/mobile-audit-live.mjs` couvre déjà les 9 pages public (index, details, about, calendar, workshop, contact, legal, privacy, succes). Statut au dernier passage : voir `.audit/server4.log`.

## Conclusion Phase 3

**Aucune page admin n'est cassée.** Le sentiment de « page vide » remonté provient vraisemblablement de la page Ateliers (légitimement vide en base) et possiblement du panneau Contenu (61 textes détectés mais seulement 2 sauvegardés — l'utilisateur peut interpréter ça comme une perte). Les deux cas seront traités en Phase 5 par des messages d'état explicites.

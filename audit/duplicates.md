# Phase 4 — Doublons identifiés

_Synthèse issue de la lecture du code admin et confirmée par crawl Phase 3._

## Doublons fonctionnels (code mort à fusionner)

| Fonction dupliquée      | Source canonique à conserver          | Source à supprimer                                         | Action                                                                                           |
| ----------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `publishAdminProfile()` | `admin/assets/js/contentful_admin.js` | `admin/assets/js/admin_profiles.js` (export non utilisé)   | Supprimer la version dans `admin_profiles.js`, importer celle de `contentful_admin.js` si besoin |
| `fetchEventById()`      | (à créer dans `contentful_admin.js`)  | `admin/assets/js/admin_events.js:162-172` (helper local)   | Centraliser dans `contentful_admin.js`, importer dans `admin_events.js`                          |
| `fetchArticleById()`    | (à créer dans `contentful_admin.js`)  | `admin/assets/js/admin_articles.js:158-175` (helper local) | Idem                                                                                             |

## Doublons structurels (patterns copy-pastés)

### Pattern « Add + Update masqué » : Articles ↔ Évènements

Les pages `admin_articles.html` et `admin_events.html` partagent le même schéma copié-collé :

```
<section id="add-X-section">    ← formulaire d'ajout (visible)
<section id="update-X-section" style="display:none">  ← formulaire d'édition (masqué)
<section id="X-list">  ← liste
```

Et côté JS, les handlers `handleEdit` / `handleDelete` / `form.onsubmit` sont structurellement identiques. **Ne pas refactorer prématurément** (le user a explicitement demandé pas de refactor opportuniste), mais à mémoriser : si on touche l'un, harmoniser l'autre.

→ **Décision** : ne PAS factoriser maintenant. Phase 5 va remplacer ce pattern par une UX modale unifiée — la factorisation deviendra naturelle à ce moment-là.

## Doublons de navigation

### Tableau de bord vs topbar

- La grille de services dans `admin.html` propose 5 tuiles vers les mêmes 5 pages que la topbar `.admin-topbar`.
- **Verdict** : doublon volontaire et utile. La topbar permet la navigation latérale en cours d'utilisation, la grille fait office de page d'accueil/landing après login.
- **Action** : conservé tel quel. À enrichir en Phase 5 (résumé d'activité, raccourcis aux actions fréquentes).

## Doublons de fichiers (vues / composants)

Aucun fichier HTML ou SCSS dupliqué dans `admin/`. La structure est saine.

## Doublons de fonctionnalités (workflows redondants)

- **Édition de profil** : il existe **deux** chemins :
  1. Cliquer « Éditer » sur une carte → édition inline `contentEditable` directement dans la grille.
  2. Re-soumettre le formulaire d'ajout (qui ne distingue pas create vs update si on n'a pas selectionné de carte).

  → **Pas vraiment un doublon** : le formulaire ne sert qu'à créer ; l'édition inline est le chemin canonique pour modifier. À clarifier en Phase 5 (libellés, désactivation visuelle).

- **Création d'article / d'évènement / d'atelier** : un seul chemin par entité — pas de doublon.

## Conclusion Phase 4

- **3 fonctions JS à fusionner** (impact code uniquement, zéro impact UX).
- **2 patterns copy-pastés** que la refonte UX Phase 5 va naturellement absorber.
- **0 doublon de page** ou de fichier.
- **0 redirection 301 nécessaire** : aucun URL public n'est supprimé.

→ **Action** : la fusion des 3 fonctions sera intégrée à la PR de la Phase 5 (touche aux mêmes fichiers).

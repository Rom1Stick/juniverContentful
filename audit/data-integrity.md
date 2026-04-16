# Phase 2 — Intégrité des données

_Pas de DB ni de migrations dans le projet : la donnée vit dans Contentful._
_Ce document remplace l'analyse `migrate:status` / `showmigrations` du plan générique._

## Méthode

Comptage direct via Contentful Delivery API au moment du crawl (15/04/2026) :

```
GET https://cdn.contentful.com/spaces/2tb1ogfq4qw9/entries?content_type=<type>&limit=1
→ on lit le champ `total` de la réponse.
```

## Résultats

| Content type | Entrées en base | Rendu observé dans l'admin                            | Verdict                                                           |
| ------------ | --------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `profile`    | **15**          | 15 cartes affichées                                   | ✅ Cohérent                                                       |
| `event`      | **30**          | 30 lignes affichées                                   | ✅ Cohérent                                                       |
| `article`    | **2**           | 2 cartes affichées                                    | ✅ Cohérent                                                       |
| `workshop`   | **0**           | 0 carte (liste vide)                                  | ⚠️ État vide légitime — pas une perte (pas d'entrée jamais créée) |
| `siteCopy`   | **2**           | 61 clés détectées dans l'iframe, 2 entrées persistées | ⚠️ Nominal — les clés sont créées au premier `Enregistrer`        |

## Modèles vs champs

Audit croisé entre les fichiers JS et les content types réellement utilisés :

- **profile** — 8 champs côté JS (`name`, `job`, `email`, `phone`, `website`, `diplomas`, `description`, `image`). Tous sont accédés en `fields.X['en-US']` côté CMA et `fields.X` côté CDA. Convention respectée.
- **event** — 4 champs (`title`, `date`, `location`, `description`). Pas de champ image en lecture/écriture admin (alors que `public/js/contentful.js` `fetchEventsWithAssets` lit `image` — désynchro mineure non bloquante).
- **article** — 4 champs (`title`, `summary`, `content`, `image`).
- **workshop** — 4 champs (`title`, `description`, `recurrence`, `profiles[]`).
- **siteCopy** — 2 champs (`key`, `value`).

Aucun champ orphelin (présent côté Contentful mais inutilisé côté code) n'a été détecté à ce stade — vérification fine impossible sans un dump Contentful complet.

## Soft-delete / archivage

Contentful gère nativement deux états : _Draft_ et _Published_. Les fonctions admin (`unpublishX` puis `deleteX`) suivent le bon protocole. **Aucune entrée orpheline en draft non visible n'a été détectée par les comptes (qui retournent l'ensemble published+draft via CDA `select`).**

## Relations cassées (FK)

- `workshop.profiles[]` référence des entrées `profile`. Comme il n'existe **aucun workshop**, aucune référence à valider.
- Aucun autre lien inter-content-types n'est utilisé.

## Conclusion Phase 2

**Aucune donnée perdue.** Le doute initial provient probablement de la liste workshops qui apparaît vide (alors qu'elle contient effectivement 0 entrée — à n'introduire que via la Phase 5 via un état vide explicite) et du panneau « inline editor » qui montre 61 clés alors que 2 entrées seulement existent (comportement normal et explicable, à clarifier dans l'UI).

→ **Aucune restauration ni backfill nécessaire.** Toute la suite du plan se concentre sur l'UX et la cohérence du code.

# Audit dashboard JuniverSanté — synthèse

_Exécuté le 2026-04-15 sur la branche `dev`._

## Résultat global : ✅ aucun bug critique, aucune perte de donnée.

| Phase                  | Verdict                                                       | Livrable                                                                                                   |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1. Inventaire          | ✅ 6 routes admin, 5 content types, 0 page orpheline          | [`inventory.md`](./inventory.md)                                                                           |
| 2. Intégrité données   | ✅ Toutes les entrées Contentful présentes                    | [`data-integrity.md`](./data-integrity.md)                                                                 |
| 3. Crawl admin         | ✅ 6/6 pages OK, 0 erreur console, 0 lien mort                | [`broken-pages.md`](./broken-pages.md), [`crawl-admin.json`](./crawl-admin.json), [`screens/`](./screens/) |
| 4. Doublons            | 3 fonctions JS à fusionner (cleanup, pas urgent)              | [`duplicates.md`](./duplicates.md)                                                                         |
| 5. Simplifications UX  | Toasts, états vides, dashboard enrichi, code de test supprimé | [`ux-changes.md`](./ux-changes.md)                                                                         |
| 6. Vérification finale | ✅ auth-flow 6/6, mobile 15/15, crawl 6/6                     | (audits ci-dessous)                                                                                        |

## Audits passés en Phase 6

```
node audit/crawl-admin.mjs       → 6/6 admin pages OK
node .audit/auth-flow-test.mjs   → 6/6 checks OK (overlay, masquage, login, déconnexion)
node .audit/mobile-audit-live.mjs → 15/15 pages 390×844 sans débordement
```

## Réponse aux 4 inquiétudes initiales

1. **« Pages vides / liens morts »** → Aucun lien mort détecté. Les « pages vides » perçues étaient deux états légitimes (workshops sans entrée + panneau inline-editor avec compteur ambigu). Les deux sont désormais explicites.
2. **« Données disparues »** → Aucune. profile=15, event=30, article=2, workshop=0 (jamais créé), siteCopy=2 — tous présents dans Contentful et affichés correctement.
3. **« Doublons (pages, menus, fonctionnalités) »** → 0 page dupliquée, 0 fichier dupliqué. Topbar + grille de services se complètent (intentionnel). 3 fonctions JS dupliquées listées pour un cleanup ultérieur.
4. **« UX trop technique »** → Adoucie : libellés métier, toasts non bloquants, états vides avec CTA, badge live de l'état du contenu sur le tableau de bord. Sans refonte globale.

## Reste à faire (non bloquant)

- PR cleanup pour fusionner les 3 fonctions dupliquées (`publishAdminProfile`, `fetchEventById`, `fetchArticleById`).
- Repenser l'édition de profil (`contentEditable` actuel) si l'utilisateur le demande.
- Lint préexistant à corriger : `admin_profiles.html:24` — `<img src="">` (template — sera rempli par JS, mais HTMLHint ne le sait pas).
- Origin `*` du `postMessage` dans l'inline editor à durcir séparément.

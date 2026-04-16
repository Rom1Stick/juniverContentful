# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack overview

Static site — no bundler, no framework. Vanilla ES modules in the browser, SCSS compiled with Dart Sass, content pulled at runtime from Contentful. Deployed on Netlify; locally served either by `live-server` (dev) or nginx in Docker (prod-like).

## Commands

- `npm run dev` — runs SCSS watch + `live-server` in parallel on port 3000. The server mounts `/public`, `/admin`, `/config`, `/assets` as separate URL prefixes (see `package.json`); opens at `/public/index.html`.
- `npm run dev:api` — `netlify dev` on port 8888. Mounts the front + les Netlify Functions (`netlify/functions/*`). **Obligatoire** pour que l'admin fonctionne (auth + CMA proxy).
- `npm run build` / `npm run build:scss` — one-shot compile of `public/scss/main.scss` → `public/assets/styles/main.min.css` (compressed + sourcemap). No JS build step exists.
- `npm run lint` — runs ESLint (JS), Stylelint (SCSS), HTMLHint in parallel. Lint scopes are globs: `public/js/**/*.js`, `admin/assets/js/**/*.js`, `public/scss/**/*.scss`, `public/**/*.html`, `admin/**/*.html`.
- `npm run format` / `format:check` — Prettier over `**/*.{js,scss,css,html,json,md}`.
- `npm run a11y` — pa11y against `http://localhost:3000/public/index.html` (requires dev server running).
- `npm run lighthouse` — `lhci autorun`; config in `.lighthouserc.json` auto-starts `npm run dev:serve`.
- `npm run docker:up` / `docker:down` / `docker:logs` — nginx:alpine container on port 8088, mirroring the Netlify routing.
- `npm test` — placeholder; no test framework is wired up.

Husky runs `lint-staged` on pre-commit and `commitlint` (conventional commits, type enum in `commitlint.config.js`) on commit-msg.

## Architecture

### Two parallel applications

- `public/` — visitor-facing site. Pages: `index.html`, `details.html`, plus `public/views/*.html` (about, blog, calendar, contact, legal, privacy, succes, workshop).
- `admin/` — in-browser CMS UI. Entry `admin/admin.html`, sub-pages under `admin/assets/views/`, scripts under `admin/assets/js/`.

They share no code but share the Contentful space.

### Contentful integration

Deux clients, intentionnellement séparés :

- `public/js/contentful.js` — Contentful **Delivery API** (`cdn.contentful.com`). Read-only. Fields unwrapped (pas de clé locale). Le token CDA est volontairement en clair côté client (pattern Contentful standard). Helper `asText(v)` à utiliser pour tout champ qui doit être une string (évite les crashes si Contentful retourne un Number).
- `admin/assets/js/contentful_admin.js` — proxy `/api/cma/*` via Netlify Functions. **Aucun token CMA côté client.** Le front envoie un JWT dans `x-admin-token`, le serveur forwarde avec `Authorization: Bearer $CONTENTFUL_CMA_TOKEN` (env var). Fields wrappés `{ 'en-US': value }` (exigence CMA).

### Auth admin

Backend-gated via `netlify/functions/auth.js` (bcrypt + JWT). Aucun identifiant côté client. Pour poser les env vars en local :

```bash
cp .env.example .env
node scripts/hash-password.js "<mot-de-passe>"   # copier le hash dans ADMIN_PASSWORD_HASH
```

Variables requises : `CONTENTFUL_SPACE_ID`, `CONTENTFUL_CMA_TOKEN`, `JWT_SECRET`, `ADMIN_ID`, `ADMIN_PASSWORD_HASH`. Sur Netlify : onglet Site settings → Environment variables.

### Netlify Functions

- `netlify/functions/cma.js` → `/api/cma/*` — proxy Contentful CMA (entries/assets/uploads). JWT requis.
- `netlify/functions/auth.js` → `/api/auth/login` + `/api/auth/me` — login bcrypt → JWT.

En dev, **obligatoire de lancer `npm run dev:api`** (netlify dev :8888) pour que l'admin fonctionne. Sans lui, les fetch `/api/cma` retournent 404 et les pages admin affichent des listes vides. Les tests E2E (`audit/click-test.mjs`, `auth-flow-test.mjs`) détectent cette situation et skippent proprement les cas qui en dépendent.

### Cache-busting

Les tags `?v=symbiose-N` sur les scripts/CSS sont uniformisés à chaque release (actuellement `symbiose-7`). Ne plus bumper manuellement sauf release majeure — Ctrl+Shift+R suffit en dev.

### SCSS: 7-1 pattern

`public/scss/main.scss` is the single compilation entry. It `@use`s partials from `abstracts/`, `base/`, `layout/`, `components/`, `pages/`. New page styles must be added both as `_pageName.scss` under `pages/` **and** imported in `main.scss`, or they won't be compiled. The `admin/assets/css/` files are plain CSS, unrelated to the SCSS pipeline.

### Routing (Netlify ↔ local nginx)

Netlify routing is defined in `_redirects` and `netlify.toml` — `/` rewrites to `/public/index.html`, `/*` to `/public/:splat`. The Docker nginx config at `nginx/conf.d/default.conf` mirrors this exactly so local Docker behavior matches production. The `live-server` `--mount` flags in the `dev:serve` script are the third mirror of the same URL layout. If you change URL structure, update all three.

### JS module layout

No bundler — every `<script type="module">` loads directly. `public/js/*.js` are shared modules (articles, carousel, categories, contentful, presentation, main, details, publicModal, contentSanitize, homeUpcoming, articleVisuals, mycel, chrome, siteCopy, editMode); `public/js/views/*.js` are page-specific entry points (about, calendar, workshop). Imports are relative paths — no path aliases. Le sanitizer HTML est **unique** (`public/js/contentSanitize.js`) et importé par le rich editor admin via `/public/js/contentSanitize.js` pour éviter la duplication.

## Conventions

- Commits follow Conventional Commits; allowed types enforced by `commitlint.config.js`: `feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert`. `subject-case` is disabled, so casing is free.
- UI copy and code comments are in French; keep that language when editing existing strings.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack overview

Static site — no bundler, no framework. Vanilla ES modules in the browser, SCSS compiled with Dart Sass, content pulled at runtime from Contentful. Deployed on Netlify; locally served either by `live-server` (dev) or nginx in Docker (prod-like).

## Commands

- `npm run dev` — runs SCSS watch + `live-server` in parallel on port 3000. The server mounts `/public`, `/admin`, `/config`, `/assets` as separate URL prefixes (see `package.json:10`); opens at `/public/index.html`.
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

Two clients, intentionally separate:

- `public/js/contentful.js` — uses the Contentful **Delivery API** (`cdn.contentful.com`). Read-only. Fields are returned unwrapped (no locale key).
- `admin/assets/js/contentful_admin.js` — uses the Contentful **Management API** (`api.contentful.com`). Read/write. Fields are wrapped in `{ 'en-US': value }` — always locale-keyed.

When editing either file, do not cross-port code between them without adjusting for the locale wrapper and auth header differences.

**Secret handling**: Space ID and tokens are currently hardcoded in both `contentful.js` files. `.env.example` documents intent but no build-time env substitution is wired up — touching these files is the only way to change credentials today.

### SCSS: 7-1 pattern

`public/scss/main.scss` is the single compilation entry. It `@use`s partials from `abstracts/`, `base/`, `layout/`, `components/`, `pages/`. New page styles must be added both as `_pageName.scss` under `pages/` **and** imported in `main.scss`, or they won't be compiled. The `admin/assets/css/` files are plain CSS, unrelated to the SCSS pipeline.

### Routing (Netlify ↔ local nginx)

Netlify routing is defined in `_redirects` and `netlify.toml` — `/` rewrites to `/public/index.html`, `/*` to `/public/:splat`. The Docker nginx config at `nginx/conf.d/default.conf` mirrors this exactly so local Docker behavior matches production. The `live-server` `--mount` flags in the `dev:serve` script are the third mirror of the same URL layout. If you change URL structure, update all three.

### JS module layout

No bundler — every `<script type="module">` loads directly. `public/js/*.js` are shared modules (articles, carousel, categories, contentful, presentation, main, details); `public/js/views/*.js` are page-specific entry points (about, calendar, workshop); `public/js/style/` contains WebGL shader effects (`fragmentShader.glsl`, `vertexShader.glsl` loaded by `styleScript.js`). Imports are relative paths — no path aliases.

## Conventions

- Commits follow Conventional Commits; allowed types enforced by `commitlint.config.js`: `feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert`. `subject-case` is disabled, so casing is free.
- UI copy and code comments are in French; keep that language when editing existing strings.

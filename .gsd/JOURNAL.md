# Security validation journal

## 2026-10-07 — OWASP A02 hardening

- `npm test` in `backend/`: 17 passing tests, including authenticated AES-GCM
  credential-vault round-trip, tamper rejection, and legacy-CBC rejection.
- `node --test tests/accessControl.regression.test.mjs` in `backend/`: 9 passing
  access-control regression tests.
- `npm run build` in `frontend/`: passed (Vite production build).
- `npx tsc --noEmit` in `mobile/mobile-app/`: passed after removing duplicate
  translation keys that blocked the mobile type-check.
- Production configuration was exercised with safe dummy values: TLS MongoDB,
  `rediss://`, secure cookie, and HTTPS origins were accepted; a plaintext
  MongoDB URL was rejected. `docker compose -f docker-compose.prod.yml config`
  passed with safe dummy values.
- `git diff --check` passed. Static scans found no tracked default credentials,
  browser auth-token persistence, password URL parameters, or insecure RNG in
  payment/wallet/platform ID generation and OAuth/idempotency code.

Known non-security build hygiene issue found outside this hardening scope:

- `tailwind-frontend` now type-checks and has a Vite entry file, but its Vite
  build stops on a pre-existing missing module:
  `features/amenities/views/AdminSettingsView` referenced by `Router.tsx`.

## 2026-10-09 — Dashboard UI consistency pass

- Targeted ESLint passed for the changed dashboard, header, sidebar-navigation,
  token, and shared UI component files.
- `npm run build` in `frontend/` passed with Vite 8.3.1.
- `curl --fail --head http://localhost:3004/dashboard` returned `HTTP/1.1 200 OK`.
- `git diff --check` passed. Repository-wide lint remains outside this UI-only
  scope: it reports 181 errors and 42 warnings in unrelated legacy files.

## 2026-10-09 — Unit and user page alignment

- Targeted ESLint passed for `AppSidebar`, `PageHeader`, `DataTable`,
  `VillaManagementView`, and `UserList`.
- `npm run build` in `frontend/` passed with Vite 8.3.1.
- `curl --fail --head` returned `HTTP/1.1 200 OK` for both `/villas` and `/users`.
- `AppSidebar` no longer registers an automatic `onVisibleChange` handler;
  the remaining close dispatch is the explicit mobile close button.
- The villa 403 was traced to `backend/src/middlewares/rbac.middleware.js`:
  the active community lacks the `villas` feature in `allowedFeatures`.

## 2026-10-09 — Community Manager alignment and villa authorization fix

- Community Manager now uses the shared content width, spacing, surface, and
  card-alignment rules; the missing community metric icon is also handled.
- Platform navigation uses the canonical navigation order, with Dashboard
  first. The sidebar remains open unless the user explicitly closes it.
- The active organization enables `administration_security`; its documented
  grouped features now include `villas`, preventing the demonstrated villa
  403 without changing data or API contracts.
- Targeted frontend ESLint passed for the sidebar and Community Manager hook
  and view. `npm run build` in `frontend/` passed.
- `node --test tests/rbacFeatureGroups.test.mjs` passed, as did backend syntax
  and formatting checks. `git diff --check` passed.

## 2026-10-09 — Platform-page navigation, alignment, and theme contrast

- Reordered platform navigation: Dashboard, Community Manager, Audit Logs,
  and Issue Reports now appear consecutively before Workspace Settings.
- Replaced the Community Manager page's unavailable utility-CSS reliance with
  scoped CoreUI-compatible layout rules for the hero, metric cards, controls,
  table, image thumbnails, status chips, and pagination.
- Audit Logs and Issue Reports now use shared theme tokens for cards, text,
  inputs, tables, empty states, borders, and primary actions in both themes.
- Targeted ESLint passed and `npm run build` in `frontend/` passed with Vite
  8.3.1. The three affected routes each returned `HTTP/1.1 200 OK`; `git diff
  --check` passed.
- Static token contrast checks: light text 14.14:1, light muted 5.74:1,
  light primary button 5.18:1, dark text 16.04:1, dark muted 9.52:1, dark
  primary button 8.28:1, and dark warning 9.33:1. These exceed WCAG AA for
  normal text. No browser-control tool is available in this environment for a
  live screenshot pass.

## 2026-10-09 — Community Manager graphic text visibility

- Fixed the graphic selector that had collapsed the content wrapper into the
  orange underline. The media card now reserves sufficient height and applies
  the underline only to its decorative child.
- Added the shared `--nahom-on-media` token so image-overlay text remains
  white in both light and dark mode, independent of button foreground tokens.
- Targeted ESLint, Prettier, and the frontend production build passed. The
  Community Manager route returned `HTTP/1.1 200 OK`; `git diff --check`
  passed.
- Static contrast: image text over navy 17.14:1 in each theme; light/dark
  main text and muted text remain 14.14/5.74 and 16.04/9.52 respectively.

## 2026-10-09 — Sidebar brand visibility

- Replaced the undersized stacked full-logo rendering with the existing emblem
  and an accessible NAHOM wordmark in the fixed-height sidebar header.
- The brand link has an accessible name; decorative images and wordmark are
  hidden from duplicate screen-reader announcement. The wordmark is hidden
  only in the intentionally collapsed sidebar state.
- Targeted ESLint and the frontend production build passed. `/dashboard`
  returned `HTTP/1.1 200 OK`; `git diff --check` passed. The white wordmark
  has 15.89:1 contrast against the navy sidebar.

## 2026-10-09 — Header search and organization contact-data audit

- Added a client-side application search that matches page names and common
  terms, displays up to six accessible results, and navigates on click or
  Enter. Removed the nested input radius/focus ring so the header search has
  one clear outline.
- Inspected organization setup without modifying it: `Organization`
  `contactEmail`/`contactPhone` are persisted, and the created or matched
  community-admin `User` also persists verified `email`/`phone`. The setup
  service uses organization contact details first, then falls back to the
  admin's values.
- Targeted ESLint and the frontend production build passed. `/dashboard`
  returned `HTTP/1.1 200 OK`; `git diff --check` passed.

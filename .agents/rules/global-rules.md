---
trigger: always_on
---

# Global Project Rules (AI Agent Directives)

## I. Documentation Protocol
* The files `project-knowledge.md` and `working.md` serve as the absolute source of truth.
* You MUST ONLY update these files when the specific keyword **`hukum`** is provided in the prompt.

## II. Pre-Completion Checklist
* Before finalizing any task, you must silently verify:
  * No cross-feature repository access occurred.
  * The "One Model = One Feature" rule was respected.
  * The "Scope of Use" rule was applied (local logic stays in local feature folders).
  * Services remain agnostic to transport layers (no direct socket code inside `.service.js`; use `.events.js` instead).
  * No values are hardcoded.
  * The implementation is production-ready.

## III. Environment & Configuration (Monorepo Strict Rule)
* **No Root `.env` Files:** Environment variables MUST be strictly isolated per service. You must NEVER create, update, or read from a `.env` file in the root monorepo directory.
* **Service-Level Isolation:** 
  * The backend must maintain its own `backend/.env` file for secure secrets (DB credentials, JWT secrets, port configurations, and `CLIENT_URL`).
  * The frontend must maintain its own `frontend/.env` file for public configurations (e.g., API base URLs), utilizing the appropriate framework prefix (like `VITE_` or `REACT_APP_`).
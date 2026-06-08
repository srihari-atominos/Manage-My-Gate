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
  * No values are hardcoded.
  * The implementation is production-ready.
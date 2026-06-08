---
trigger: always_on
---

# Git Workflow & Commit Rules

## I. Branching Strategy (Feature Branch Workflow)
* **`main` (or `master`):** The production-ready state. Code is only merged here when it is 100% complete, tested, and deployable.
* **`develop`:** The active integration branch. All completed features are merged here first for testing before going to `main`.
* **Feature Branches:** Every new feature MUST be developed in an isolated branch created from `develop`.
  * **Naming Convention:** `type/kebab-case-name`
  * **Examples:** `feature/auth-system`, `feature/dynamic-rbac`, `bugfix/login-crash`, `chore/logger-setup`.

## II. The Feature Lifecycle
1. **Branch:** `git checkout -b feature/auth develop`
2. **Commit:** Make small, logical commits as you build the Model, Service, and Controller.
3. **Merge:** Once the feature is complete and verified against the architectural rules, open a Pull Request (or merge it locally) into `develop`.
4. **Clean up:** Delete the feature branch after a successful merge to keep the repository clean.

## III. Conventional Commits (Strict Naming)
All commit messages must follow the Conventional Commits specification to generate clean, readable history:
* `feat:` A new feature (e.g., `feat: implement dynamic rbac service`)
* `fix:` A bug fix (e.g., `fix: resolve jwt token expiration issue`)
* `chore:` Routine tasks, setups, or dependency updates (e.g., `chore: initialize boilerplate and global rules`)
* `refactor:` Code changes that neither fix a bug nor add a feature
* `docs:` Documentation updates only (e.g., `docs: update project-knowledge.md via hukum trigger`)
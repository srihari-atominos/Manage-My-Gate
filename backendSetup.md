System Task: You are an expert backend architect. This is Phase 2. Build upon the existing structure to implement a strict Feature-Based Modular Architecture.

1. Core Architectural Rules (Acknowledge & Enforce):

Request Flow: Router → Controller → Service → Repository → Database.

Controllers: ONLY call their own feature service. No business logic, no cross-feature service calls, no repository access, no database access.

Services: Contain ALL business logic/orchestration. May call their own repository and other feature services. NEVER call another feature's repository.

Repositories: Solely responsible for DB/ORM operations. Private to their feature.

Documentation: Maintain project-knowledge.md and working.md. ONLY update documentation when the explicit keyword hukum is provided.

2. Core Application Setup (index.js & server.js):

Update index.js to set up Express, CORS (with allowed origins array), Helmet (CSP false), cookie-parser, and static public folder routing.

Mount core API routes to /api and mount a Swagger gateway to / (from a separate src/routes/swagger.routes.js file).

Add global error handling middlewares (pageNotFound and errorHandler).

Update server.js to connect the database FIRST, initialize passport/SSO (from src/features/auth/passport/passport.init.js), and start the app on the designated port.

3. Middleware & Utils Generation:

Generate foundational middlewares in src/middlewares/: auth.middleware.js, rbac.middleware.js, validator.middleware.js, and responseHandler.middleware.js.

Create src/utils/httpError.utils.js for custom error handling.

4. Feature Boilerplate Scaffold:

Inside src/features/sampleFeature, generate boilerplate files strictly following the rules: .model.js, .validateRules.js, .repository.js, .services.js, .controller.js, and .router.js.

Execution Output: Output a summary of the backend tree. Acknowledge that the strict architectural rules and the hukum trigger are now active.
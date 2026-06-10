---
trigger: always_on
---

# Backend Workflow & Architecture Rules

## I. Architectural Boundaries & Feature Isolation
* **One Model, One Feature:** Every database entity or model must be its own independent feature module inside `src/features/`. Do not pack multiple models into a single feature folder.
* **The "Scope of Use" Rule (Encapsulation):**
  * If a middleware or utility is *only* used by one feature, it MUST be placed inside that feature's directory (e.g., `src/features/simahReport/middlewares/`).
  * If a middleware or utility is used by *two or more* features, it must be promoted to the global `src/middlewares/` or `src/utils/` directory.
* **Public API Request Flow:** `Router → Controller → Service → Repository → Database`.
* **Internal Domain Flow:** If a feature does not expose an API (e.g., background workers, audit logs), omit the Router, Controller, and Validator. The flow is strictly: `Other Feature Service → Target Feature Service → Target Feature Repository → Database`.
* **Cross-Feature Communication:** Features must only communicate via Services. The flow is always: `Feature A Service → Feature B Service → Feature B Repository`.
* **Real-Time & Protocol Decoupling:** To keep business logic pure, a feature's `.service.js` must NEVER import `socket.io` or execute direct socket emissions. Instead, use an internal event bus (`.events.js`) to handle asynchronous actions like real-time socket delivery or third-party webhooks.

## II. Layer Responsibilities
* **Controllers (Traffic Cops):**
  * MUST ONLY call their own feature's service.
  * MUST NOT contain business logic.
  * MUST NOT call multiple services, access repositories, or touch ORM models.
* **Services (The Brains):**
  * Contain 100% of the core business logic and workflow orchestration.
  * May call their own feature's repository.
  * May call *other* feature services.
  * **MUST NEVER** call a repository belonging to another feature.
  * **Event Emission:** Upon successful write operations, the service must broadcast internal application events using a native `EventEmitter` (`[featureName].events.js`) to decouple execution.
* **Repositories (The Vaults & Database Optimization):**
  * Responsible for all database and ORM operations.
  * Strictly private to their feature—never imported by other features.
  * **Aggregation Pipelines:** For list/table queries requiring pagination and total counts, use Mongoose Aggregation Pipelines (e.g., `$facet`) to execute them efficiently in a single database round-trip.
  * **Database Transactions:** All database write operations (or read-writes) that require strict data consistency MUST accept a `ClientSession` and be wrapped in Mongoose Transactions (`session.startTransaction()`, `commitTransaction()`, `abortTransaction()`).

## III. Observability & Error Handling
* **Correlation ID:** Every request must be tagged with an `X-Request-ID`. This ID must be injected into all subsequent logs, service calls, and error traces.
* **Structured Logging:** Use environment-aware logging. Output human-readable console text in `development`, and raw, structured JSON in `production`. Local file logging is discouraged; stream logs to stdout/stderr.
* **Error Bubbling:** Do not silently catch errors. Bubble them up to the global `errorHandler.middleware.js` to ensure uniform formatting, logging of the Correlation ID, and sanitized client responses.

## IV. Security & Configuration
* **Zero Hardcoding:** Never hardcode API URLs, credentials, secrets, or tokens. Use environment variables strictly.
* **Validation:** All incoming HTTP data must be validated and sanitized using Express-Validator at the Router level before hitting the Controller. Prevent SQL Injection, XSS, and CSRF vulnerabilities.

## V. Real-Time Communication (Socket.io Architecture)
* **Global Initializer Layer:** Socket.io MUST be initialized alongside the HTTP server using a dedicated infrastructure configuration file (`src/config/socket.js`). This layer acts as a centralized wrapper to instantiate the socket server (`initSocket`) and expose a singleton getter (`getIO`) to fetch the active instance.
* **Feature-Level Event Bus (`.events.js`):** Every feature requiring real-time transport must define a native Node `EventEmitter` file. This file catches internal events emitted by the service layer and delegates them to transport handlers.
* **Feature-Level Socket Dispatcher (`.socket.js`):** Transport-specific logic belongs in a dedicated socket dispatcher file. This file interacts with `getIO()`, handles room-based routing, and swallows transmission errors inside safe `try/catch` blocks so socket network drops never crash the application thread.
* **Room-Based Isolation:** Real-time communications must leverage room-based streaming. Personal messages must stream to a strict room naming convention (e.g., `user:${userId}`), while broader communications must stream to group/tenant rooms (e.g., `role:${roleName}`).
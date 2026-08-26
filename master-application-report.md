# Master Application Architecture & Status Report: Manage My Gate (GatedCommunity)

**Generated Date:** August 25, 2026  
**Application Name:** Manage My Gate (Gated Community Management Platform)  
**Corpus Name:** `srihari-atominos/Manage-My-Gate`  
**Repository Path:** `d:\atominos\GatedCommunity`  

---

## 1. Executive Summary

**Manage My Gate** is a multi-tenant, enterprise-grade gated community and villa management ecosystem built using a modern decoupled architecture. The platform supports gated residential societies, property management companies, security gate operators, and individual residents with real-time visitor management, billing/collections, amenity reservations, complaint workflows, multi-tenant RBAC administration, and platform-level CRM.

The repository encompasses three primary application layers:
1. **Backend REST & WebSocket Engine (`/backend`):** High-throughput Node.js/Express service enforcing strict Domain-Driven Design (DDD) feature encapsulation, MongoDB replica set clustering, Redis caching/adapter, internal event buses, and real-time Socket.io dispatching.
2. **Web Administration & Resident Portal (`/frontend`):** Vite-powered React 19 single-page application utilizing Redux Toolkit, CoreUI 5, dynamic code-splitting, thin controller hooks, and granular Role-Based Access Control (RBAC).
3. **Mobile Native Resident & Guard App (`/mobile/mobile-app`):** Expo 54 / React Native 0.81 cross-platform application utilizing Expo Router v6, NativeWind v4 (Tailwind CSS), hardware integrations (QR/NFC scanning), and component-catalog-first design.

---

## 2. Technology Stack & Infrastructure

```
                                  ┌─────────────────────────────────────────┐
                                  │      Mobile App (Expo 54 / RN 0.81)    │
                                  │   (Resident Portal / Security Guard)    │
                                  └────────────────────┬────────────────────┘
                                                       │ REST / WebSockets
                                                       ▼
┌──────────────────────────┐      ┌─────────────────────────────────────────┐
│  Web Frontend Portal     │─────▶│   Nginx Reverse Proxy & CORS Gateway   │
│  (React 19 / Vite 8)     │ HTTP │               (Port 80/443)             │
└──────────────────────────┘      └────────────────────┬────────────────────┘
                                                       │
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │   Node.js / Express 5 API Server        │
                                  │   Correlation ID | Passport | EventBus  │
                                  └──────┬─────────────┬─────────────┬──────┘
                                         │             │             │
                    ┌────────────────────┘             │             └────────────────────┐
                    ▼                                  ▼                                  ▼
      ┌──────────────────────────┐       ┌──────────────────────────┐       ┌──────────────────────────┐
      │  MongoDB Replica Set     │       │  Redis Cache & Adapter   │       │ External Integrations    │
      │  (Mongoose 9 / RS0)      │       │  (Pub/Sub / Rate Limit)  │       │ (Razorpay, Twilio, OAuth)│
      └──────────────────────────┘       └──────────────────────────┘       └──────────────────────────┘
```

### 2.1 Technology Matrix

| Layer | Core Framework / Technologies | Key Libraries & Tooling |
| :--- | :--- | :--- |
| **Backend API** | Node.js (ESM), Express 5.2, Mongoose 9.6 | Socket.io 4.8, ioredis 5.11, Passport.js, Express-Validator, Winston/Pino, PDFKit, Puppeteer, Razorpay, Twilio, Nodemailer |
| **Web Frontend** | React 19.2, Vite 8.0, Redux Toolkit 2.12 | CoreUI 5.6, React Router 7, Axios, React Hook Form, Yup, Socket.io-client, FullCalendar, Chart.js, i18next |
| **Mobile App** | React Native 0.81, Expo 54.0, Expo Router 6.0 | NativeWind 4.2, Redux Toolkit, Burnt, Expo Camera, Lucide React Native, BottomSheet |
| **Infrastructure** | Docker & Docker Compose, Nginx | MongoDB 7+ Replica Set (`rs0`), Redis 7 Alpine, Mongo Express |

---

## 3. Architecture & Design Rules Compliance

The system strictly enforces clear architectural boundaries defined across backend, frontend, and mobile workflow rules:

### 3.1 Backend Architecture Guidelines
* **Feature Isolation ("One Model, One Feature"):** Over 60 features are encapsulated in self-contained subdirectories in `backend/src/features/`. Each feature isolates its own routes, controller, service, repository, and validator.
* **Request Pipeline:** `Router → Express-Validator → Controller → Service → Repository → Mongoose Model`.
* **Cross-Feature Boundary Enforcement:** Services must never touch another feature's repository directly; cross-module queries are executed strictly via Service-to-Service calls (`Feature A Service → Feature B Service → Feature B Repository`).
* **Decoupled Real-Time Layer:** Feature services never import `socket.io` directly. Write operations emit internal Node.js `EventEmitter` events (`[feature].events.js`), which are consumed by event listeners (`[feature].listeners.js`) and forwarded to dedicated socket dispatchers (`[feature].socket.js`).
* **Observability:** Every incoming request is tagged with an `X-Request-ID` correlation header, propagated across logs, service traces, and standardized response envelopes (`{ success, message, data, meta }`).

### 3.2 Frontend Architecture Guidelines ("Thin View Pattern")
* **Thin Views & Custom Hooks:** Visual components do not invoke API endpoints directly. All side-effects, dispatch operations, and selector mappings are encapsulated in custom hook controllers (e.g., `useUserList`, `useOrganizationManager`).
* **Isolated Redux Slices:** Every feature owns a single slice registered globally in the Redux store (`frontend/src/store/store.js`).
* **Strict Component Modularity:** Single responsibility per file with centralized feature SCSS imports (`styles/_[featureName].scss`).

### 3.3 Mobile Architecture Guidelines (Catalog-First Enforcement)
* **Component Catalog Reusability:** Mobile screens strictly consume reusable UI components from `mobile/mobile-app/components/` (`ScreenShell`, `ListCard`, `StatusBadge`, `Button`, `TextInput`, `EmptyState`, `BottomSheet`, `ConfirmationModal`).
* **RTL & NativeWind Token Usage:** No hardcoded hex values or directional margins (`mr-`, `ml-`). All layouts use NativeWind design tokens and logical spacing classes (`ms-`, `me-`, `ps-`, `pe-`).

---

## 4. Layer Breakdown & Core Feature Inventory

### 4.1 Backend Domain Modules (`backend/src/features/`)

The backend consists of **60 encapsulated feature modules**:

1. **Authentication & Identity (`auth`, `userIdentity`, `session`, `token`, `otp`):** OAuth 2.0 (Google, Azure MSAL), JWT token lifecycles, OTP generation, and session management.
2. **Access Control (`role`, `permission`, `rolePermission`):** Granular permission definitions, Super Admin protection guards, and multi-tenant role assignments.
3. **Organization & Multi-Tenancy (`organization`, `orgMembership`, `workspace`):** Multi-tenant workspace switching, platform-as-a-tenant protection guards (`isPlatform`), and workspace isolation.
4. **Resident & Villa Management (`villa`, `user`, `userPreference`):** Occupant tracking, villa assignments, ownership verification, and user profiles.
5. **Visitor Management (`visitorPass`, `visitorLog`, `visitorPassToken`, `blacklist`):** QR/NFC pass creation, walk-in approvals, entry/exit logs, and blacklist screening.
6. **Billing, Invoicing & Wallet (`invoice`, `invoiceSequence`, `ledger`, `payment`, `wallet`, `adjustment`, `masterPricing`):** Resident billing, automated fee collection, ledger transactions, wallet balances, and Razorpay gateway integration.
7. **Platform & CRM (`platformSubscription`, `platformEntitlement`, `platformInvoice`, `platformOrder`, `platformPayment`, `platformQuote`, `platformCrm`, `crmInquiry`, `crmMeeting`, `crmTask`, `crmThread`):** Platform-level subscription engine, quota entitlement tracking, B2B CRM pipeline, and quote processing.
8. **Community & Services (`amenity`, `amenityBooking`, `amenityDashboard`, `complaint`, `complaintSettings`, `noticeBoard`, `poll`, `technician`):** Facility bookings, SLA complaint resolution, notice broadcasts, resident voting polls, and vendor/technician management.
9. **Observability & Infrastructure (`auditLog`, `securityLog`, `eventStore`, `outbox`, `webhook`, `integrationHub`, `messageTemplate`, `dashboardFeed`, `onboardingWizard`, `assessment`, `adminAnalytics`):** Audit trails, transactional outbox worker, webhook triggers, integration hubs, and dashboard analytics.

### 4.2 Web Frontend Modules (`frontend/src/features/`)

The web administration portal contains **28 specialized feature modules**:
* `auth`, `userManagement`, `roleBuilder`, `organization`, `workspace`
* `visitorManagement`, `villa`, `billing`, `platformBilling`, `pricing`
* `platformSubscription`, `platformCrm`, `platformPayment`, `platformQuote`
* `complaints`, `amenities`, `noticeBoard`, `poll`, `onboardingWizard`
* `dashboard`, `crmWorkspace`, `integrationHub`, `messageTemplate`, `assessment`, `auditLog`

### 4.3 Mobile Native App Modules (`mobile/mobile-app/src/features/`)

The cross-platform mobile application contains **13 resident & guard feature modules**:
* `auth`, `dashboard`, `profile`, `settings`
* `visitor` (QR Scanner, Pass Generation, Walk-in Approval)
* `villa` (Resident Villa Management)
* `billing` (Dues Payment & Payment History)
* `complaints` (Ticket Logging & Photo Uploads)
* `amenities` (Facility Slot Booking)
* `noticeBoard`, `poll`, `notification`, `directory`

---

## 5. Security & System Integrity

1. **Platform Anti-Lockout Guard (`isPlatform`):**
   * Backend services strictly prevent modifying or disabling the primary system platform tenant (`isPlatform === true`), throwing a `403 Forbidden` error if attempted.
   * Frontend and Mobile hooks sanitize organization lists to keep the System Platform context protected from standard tenant administration.
2. **Super Admin Immutability:**
   * Backend controllers reject modifications to the built-in system `'Super Admin'` role.
   * Web UI disables modification CTAs with explanatory tooltips.
3. **Data Sanitization & Rate Limiting:**
   * Incoming HTTP requests pass through `express-validator` and `xss-clean` to prevent XSS and SQL/NoSQL injections.
   * Redis-backed rate limiting protects authentication endpoints against brute-force attacks.
4. **Audit & Security Logging:**
   * Real-time audit logs track sensitive write operations, user role assignments, and workspace switching across the system.

---

## 6. Docker & Deployment Architecture

The application is containerized using `docker-compose.yml` with health-checked service orchestration:

```yaml
services:
  mongodb:           # Mongo 7+ with Replica Set rs0 (Port 27019:27017)
  mongodb-rs-init:   # Automatic Replica Set Initiator
  redis:             # Redis Alpine Cache & Adapter (Port 6379:6379)
  backend:           # Node.js Express Server (Port 5006:5000)
  frontend:          # Vite Production Build / Nginx (Port 3004:80)
  mongo-express:     # Web Admin DB GUI (Port 8081:8081)
```

---

## 7. Operational Status & Recommendations

### Current System Status
* **Backend:** Operational with full REST endpoint mounting, Passport SSO setup, Socket.io event dispatching, and automated background cron jobs (`complaintCron`, `assessmentCron`, `userCron`, `outboxWorker`).
* **Frontend Web:** Fully compiled Vite build with Redux Toolkit integration, lazy-loaded route protection (`AuthGuard`), dynamic role rendering, and responsive CoreUI dashboard.
* **Mobile Native App:** Operational Expo 54 stack with NativeWind design token compliance, hardware camera QR scanner integration, and catalog component reuse.

### Suggested Roadmap & Next Steps
1. **Server-Side Pagination Optimization:** Upgrade remaining in-memory pagination lists across feature repositories to leverage MongoDB `$facet` aggregation pipelines.
2. **Push Notification Delivery:** Extend the mobile socket listener layer to register Expo Push Tokens (`expo-notifications`) for off-app gate arrival alerts.
3. **Automated E2E Suite Expansion:** Integrate Playwright/Cypress end-to-end testing alongside unit/integration coverage for billing and visitor pass lifecycle flows.

---

*Report compiled automatically for GatedCommunity / Manage My Gate.*

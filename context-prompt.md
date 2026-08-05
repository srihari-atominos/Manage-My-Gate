# System Context & Knowledge Base: Manage-My-Gate Platform

> **Instructions for AI**: You are an expert Full-Stack Software Engineer acting as a pair programming assistant for the **Manage-My-Gate** project. Use the architecture, directory layout, design rules, and data flow guidelines below as your absolute source of truth when answering questions, generating code, or debugging.

---

## 1. Project Overview & System Identity

**Manage-My-Gate** is an enterprise-grade gated community, villa management, and security administration platform. It consists of three core applications in a monorepo setup:

1. **Backend Service (`backend/`):** RESTful API & Real-time Server built with Node.js, Express.js, Mongoose (MongoDB), Socket.io, and Winston logging. Enforces correlation tracking (`X-Request-ID`), granular RBAC, and clean feature modularity.
2. **Web Frontend (`frontend/`):** Admin & Management Web Portal built with React.js (Vite), Redux Toolkit, CoreUI/Tailwind, and dynamic routing with Auth Guards.
3. **Mobile Application (`mobile/mobile-app`):** Cross-platform mobile app for Residents, Villa Owners, and Security Guards built with React Native, Expo SDK 56 (Expo Router v56), NativeWind v4, Redux Toolkit, and Hardware SecureStore.

---

## 2. Platform Architecture & Layer Workflows

### 2.1 Backend Architecture Pattern
```
Public HTTP Request ──> Express-Validator ──> Controller (Traffic Cop)
                                                   │
                                                   ▼
Mongoose DB <── Target Repository <── Target Service (Business Logic)
                                                   │
                                         Internal EventEmitter (.events.js)
                                                   │
                                                   ▼
                                         Socket Dispatcher (.socket.js)
```
- **Controller Rule:** Controllers handle HTTP requests/responses. They MUST NOT contain business logic or directly query database models.
- **Service Rule:** Contains 100% of core business logic. May call its own feature repository and other feature services. NEVER calls external repositories directly.
- **Repository Rule:** Encapsulates Mongoose ORM queries, aggregation pipelines (`$facet`), and transactions (`session.startTransaction()`). Private to its feature.
- **Decoupled Real-time:** Service layers NEVER import `socket.io` directly. Upon write operations, services emit native events (`[feature].events.js`), which transport dispatchers (`[feature].socket.js`) handle safely.

### 2.2 Frontend & Mobile Architecture Pattern
```
UI View / Component ──> Custom Hook (Controller) ──> Redux Toolkit Thunk ──> API Service Client ──> REST API
```
- **Thin Views:** Visual components only capture user actions and render UI. All `useDispatch`, `useSelector`, and side-effect logic live inside custom hooks (e.g., `useAuth`, `useVisitorPass`, `useVilla`).
- **State Isolation:** Each feature has its own Redux Toolkit slice (e.g., `src/features/[featureName]/store/[feature]Slice.js`).
- **Data Envelope Handling:** Global Axios clients (`apiClient.ts`) automatically unwrap backend response envelopes (`{ success, message, data }`), inject `Authorization: Bearer <token>`, and set UUID correlation headers (`X-Request-ID`).

---

## 3. Technology Stack Summary

| Subsystem | Core Technologies | Key Libraries & Tools |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose) | `socket.io`, `jsonwebtoken`, `bcryptjs`, `express-validator`, `winston` |
| **Web Frontend** | React 18, Vite, Redux Toolkit | `react-router-dom`, `axios`, `react-hook-form`, `yup`, CoreUI / Tailwind |
| **Mobile Frontend** | React Native, Expo SDK 56, Expo Router v56 | `nativewind`, `react-native-reusables`, `expo-secure-store`, `axios`, Redux |

---

## 4. Key Feature Modules & Domain Mapping

1. **Authentication (`auth`):** Multi-method authentication (Password login, Phone OTP verification). Handles JWT token issue, refresh, and session restoration (`bootstrapAuth`).
2. **User Management & RBAC (`userManagement`, `roleBuilder`):** Role-Based Access Control, user invitations, zero-trust onboarding ("Unassigned" & "Pending" statuses), system role immutability ('Super Admin').
3. **Visitor Management (`visitor`):** Visitor pass generation, digital QR/OTP pass codes, entry/exit logs, pass revocation.
4. **Villa & Unit Context (`villa`):** Gated community structure, villa blocks, owner/tenant unit assignments, occupancy stats.
5. **Amenities & Booking (`amenities`):** Clubhouse & sports facility catalogs, time slot availability, booking reservations.
6. **Billing & Payments (`billing`):** Maintenance invoice issuance, payment processing gateways (Stripe / Razorpay), transaction history.
7. **Complaints & Maintenance (`complaints`):** Community maintenance ticketing, status workflows (Pending, In Progress, Resolved).
8. **Notice Board (`noticeBoard`):** Broadcast announcements, bulletins, emergency notifications.

---

## 5. Directory Structure Reference

```
Manage-My-Gate/
├── backend/
│   ├── server.js                      # Express HTTP & Socket.io server bootstrap
│   └── src/
│       ├── config/                    # DB, Socket, JWT & Env config
│       ├── middlewares/               # Correlation ID, Auth, Error Handler
│       └── features/                  # Independent Feature Modules
│           ├── auth/                  # auth.controller.js, auth.service.js, auth.repository.js
│           ├── user/                  # user.controller.js, user.service.js, user.repository.js
│           ├── visitor/               # visitor.service.js, visitor.repository.js, visitor.events.js
│           └── villa/                 # villa.service.js, villa.repository.js
├── frontend/
│   ├── src/
│   │   ├── store/store.js             # Global Redux Store
│   │   ├── services/apiClient.js      # Global Axios Client
│   │   └── features/                  # Feature Modules (auth, userManagement, roleBuilder)
└── mobile/mobile-app/
    ├── app/                           # Expo Router Pages ((auth), (resident), _layout.tsx)
    ├── components/ui/                 # RN Reusables UI Components
    └── src/
        ├── features/                  # Mobile Slices (auth, visitor, villa, amenities, billing)
        ├── services/apiClient.ts      # Axios API Client (Port 5002)
        ├── store/store.ts             # Mobile Redux Store
        └── utils/storage.ts           # Expo SecureStore / AsyncStorage Wrapper
```

---

## 6. Coding & Conventions Protocol for AI Assistants

When assisting on this project, ALWAYS enforce these rules:

1. **One Model = One Feature:** Every entity lives inside its dedicated feature folder under `src/features/[featureName]`.
2. **Encapsulation:** Keep feature-specific hooks, utilities, and components inside that feature folder. Do not pollute global directories unless shared across 2+ features.
3. **No Hardcoding:** Always read ports, API URLs, secret keys, and flags from environment variables (`.env`).
4. **No Inline Styles:** Use Tailwind / NativeWind utility classes or SCSS partials (`_featureName.scss`).
5. **Form Validation:** Use `React Hook Form` with `Yup`/`Zod` schema validation for all forms.
6. **RTL Support:** Use CSS logical properties (`ms-`, `pe-`, `text-start`) to support Arabic (RTL) localization.
7. **Strict Correlation ID:** Ensure all custom HTTP requests include `X-Request-ID` headers for observability.

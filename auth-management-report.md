# Authentication & Identity Management System Detailed E2E Report

This report provides an end-to-end technical guide to the **Authentication & Identity Management System (Auth Feature)** architecture in ManageMyGate. It details multi-tenant context resolution, authentication methods, role-based access control, real-time security events, database schemas, and comprehensive Mermaid sequence diagrams for all key execution flows.

---

## 1. System Architecture & Multi-Tenant Security Model

The Authentication system follows a decoupled, multi-tenant architecture that isolates credentials, user identities, workspace memberships, and permissions.

- **Dual-Token Session Architecture:** Uses short-lived JWT Access Tokens for API request authorization and long-lived Refresh Tokens (persisted in the `Session` entity) for sliding session extensions.
- **Dynamic Context Resolution (`getScopedTokenPayload`):** Rather than hardcoding user roles, JWT tokens are scoped dynamically to the active organization (`orgId`). Tokens include flattened runtime permissions, active role, `isPlatform` status, and visitor role context (`Admin`, `Guard`, `Resident`, or `None`).
- **Multi-Tenant Workspace Switching:** Users belonging to multiple organizations can seamlessly switch active contexts via `/auth/switch-context` without re-authenticating, generating a freshly scoped JWT token.
- **Event-Driven Integration Architecture:** Decouples core business logic from communication providers. On successful OTP generation, `auth.services.js` emits internal `OTP_SENT` events. The `auth.listeners.js` subscriber picks up these events and routes dispatching dynamically via **IntegrationHub** drivers (Resend, SMTP, Twilio, Message Central).
- **Transactional User Creation:** User registration and invitation acceptance execute inside Mongoose Transactions (`session.startTransaction()`) to guarantee atomic creation across user records and invitation token consumption.
- **Brute-Force & Rate-Limiting Protections:** Protected by Express rate-limiting middleware (`authLimiter` for authentication attempts and `otpLimiter` for OTP requests).

---

## 2. Supported Authentication Capabilities

| Authentication Method | Primary Credential | Secondary Verification | Description |
| :--- | :--- | :--- | :--- |
| **Password Authentication** | Email / Username | Password (Bcrypt) | Standard login returning scoped JWT access token, refresh token, and user workspace list. |
| **Phone OTP Login** | Phone Number | 6-Digit SMS OTP | Passwordless login for mobile users. Sends SMS via Twilio or Message Central. |
| **Email OTP Login** | Email Address | 6-Digit Email OTP | Passwordless login for web users. Sends email via Resend or SMTP integration. |
| **Google SSO** | Google ID Token | OAuth 2.0 Credential | Authenticates via Google. Automatically provisions `UserIdentity` and links to `User`. |
| **Microsoft SSO** | Microsoft ID Token | OAuth 2.0 Credential | Authenticates via Microsoft Azure AD / Entra ID. Provisioned into `UserIdentity`. |
| **Accept Invitation (Standard)**| Invitation Token | Set New Password | Allows invited users to activate their account and set their password via email token. |
| **Accept Invitation (SSO)** | JWT Invite Token | SSO ID Token (Google/MS)| Allows invited users to activate their membership using their existing SSO account. |
| **Password Reset** | Registered Email | 6-Digit OTP + Reset Token| Self-service password recovery flow with temporary reset token authorization. |
| **Token Rotation & Refresh** | Refresh Token | Active Session Check | Issues a fresh access token and updates the session last active timestamp. |
| **Context Switching** | Active JWT | Target Organization ID | Switches active workspace context and returns an updated token with new permissions. |

---

## 3. End-to-End Execution Flows (Sequence Diagrams)

### Flow A: Username / Password Login & Workspace Switch
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Frontend (Auth UI)
    participant Redux as Auth Redux Store
    participant Server as Express API Backend
    participant DB as MongoDB (Mongoose)

    User->>UI: Submits Login Form (email/username + password)
    UI->>Redux: Dispatch loginUser Thunk
    Redux->>Server: POST /api/v1/auth/login { login, password, deviceInfo }
    activate Server
    Server->>DB: Fetch User by Email or Username
    Server->>DB: Verify Bcrypt Password Match
    Server->>DB: Fetch Active OrgMemberships & Roles for User
    Server->>Server: Select Primary Context (Platform Org or 1st Active Workspace)
    Server->>Server: Flatten Role Permissions & Visitor Context (Admin/Guard/Resident)
    Server->>Server: Sign JWT Access Token with Token Payload
    Server->>DB: Create Session & Generate Refresh Token
    Server->>Server: Emit 'LOGIN_SUCCESS' Event
    Server-->>Redux: Return Token, RefreshToken, User Profile, & Available Workspaces
    deactivate Server
    Redux->>UI: Update Auth State & Persist Tokens in LocalStorage
    UI-->>User: Navigate to Dashboard

    Note over User, Server: Context Switching Scenario
    User->>UI: Selects Different Workspace from Dropdown
    UI->>Redux: Dispatch switchContext Thunk
    Redux->>Server: POST /api/v1/auth/switch-context { targetOrgId }
    activate Server
    Server->>DB: Verify User Membership in targetOrgId
    Server->>Server: Generate New Scoped JWT Token with Target Org Permissions
    Server-->>Redux: Return New Access Token & Updated Profile
    deactivate Server
    Redux->>UI: Update Active Workspace & Permissions in Redux
```

### Flow B: Passwordless Phone / Email OTP Login
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Frontend
    participant Server as Express API Backend
    participant EventBus as Internal Event Bus (auth.events)
    participant Listener as Listener (auth.listeners)
    participant IntegrationHub as IntegrationHub (Resend/Twilio)
    participant DB as MongoDB (Mongoose)

    User->>UI: Enters Phone Number or Email
    UI->>Server: POST /api/v1/auth/login/phone (or /email-otp)
    activate Server
    Server->>DB: Find or Verify User Record
    Server->>DB: Upsert OTP Record (Generates 6-digit code, TTL 5 mins)
    Server->>EventBus: Emit 'OTP_SENT' { identifier, code, type }
    Server-->>UI: Return Success ("OTP sent successfully")
    deactivate Server

    EventBus->>Listener: Catch 'OTP_SENT'
    activate Listener
    Listener->>DB: Fetch Active Communication Integration (Resend/SMTP/Twilio/MessageCentral)
    Listener->>IntegrationHub: Dispatch Email / SMS payload via Decrypted API Keys
    IntegrationHub-->>User: Delivers OTP Code via Email/SMS
    deactivate Listener

    User->>UI: Enters 6-Digit OTP Code
    UI->>Server: POST /api/v1/auth/login/phone/verify { phone, otp }
    activate Server
    Server->>DB: Validate OTP (Checks code, expiration, and max attempts)
    Server->>DB: Mark OTP as Verified
    Server->>Server: Resolve Scoped Token Payload
    Server->>DB: Create Session & Generate Refresh Token
    Server-->>UI: Return Access Token, Refresh Token, & User Context
    deactivate Server
    UI-->>User: Authenticated & Directed to Dashboard
```

### Flow C: Single Sign-On (SSO) & Invitation Acceptance
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Provider as OAuth Provider (Google / Microsoft)
    participant UI as React Frontend
    participant Server as Express API Backend
    participant DB as MongoDB (Mongoose)

    User->>UI: Clicks "Sign in with Google / Microsoft"
    UI->>Provider: Authenticate & Obtain ID Token
    Provider-->>UI: Return Provider ID Token / Credential
    UI->>Server: POST /api/v1/auth/google (or /microsoft) { credential }
    activate Server
    Server->>Server: Verify ID Token Signature with OAuth Client
    Server->>DB: Search UserIdentity by Provider & ProviderId
    
    alt UserIdentity Exists
        Server->>DB: Fetch Associated User Record
    else New SSO User
        Server->>DB: Search User by Email
        opt User Does Not Exist
            Server->>DB: Create New User Record (Status Active)
        end
        Server->>DB: Create UserIdentity Record (Link User + ProviderId)
    end
    
    Server->>Server: Build Scoped Token Payload
    Server->>DB: Create Session & Refresh Token
    Server-->>UI: Return Auth Credentials & Workspaces
    deactivate Server
    UI-->>User: Redirect to Portal

    Note over User, Server: Accept Invite with SSO Flow
    User->>UI: Opens Invitation Link containing inviteToken
    UI->>Provider: Authenticates via SSO Provider
    UI->>Server: POST /api/v1/auth/accept-invite/sso { inviteToken, ssoCredential, provider }
    activate Server
    Server->>DB: Validate Invitation Token & Verify SSO Credential
    Server->>DB: Update User Status to Active & Link UserIdentity
    Server->>DB: Delete Used Invitation Token
    Server-->>UI: Return Authenticated Session
    deactivate Server
```

### Flow D: Self-Service Password Reset
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Frontend
    participant Server as Express API Backend
    participant EventBus as Internal Event Bus
    participant DB as MongoDB (Mongoose)

    User->>UI: Requests Password Reset for Email
    UI->>Server: POST /api/v1/auth/forgot-password { email }
    activate Server
    Server->>DB: Fetch User by Email
    Server->>DB: Generate 6-Digit Reset OTP (TTL 5 mins)
    Server->>EventBus: Emit 'OTP_SENT'
    Server-->>UI: Return OTP Sent Confirmation
    deactivate Server

    User->>UI: Inputs 6-Digit Reset OTP
    UI->>Server: POST /api/v1/auth/forgot-password/verify-otp { email, otp }
    activate Server
    Server->>DB: Verify Reset OTP Code
    Server->>DB: Issue Temporary Reset Token (TTL 15 mins)
    Server-->>UI: Return { resetToken }
    deactivate Server

    User->>UI: Inputs New Password
    UI->>Server: POST /api/v1/auth/reset-password { resetToken, newPassword }
    activate Server
    Server->>DB: Validate Reset Token
    Server->>DB: Hash New Password with Bcrypt & Update User
    Server->>DB: Invalidate Active Reset Token & Terminate Existing Sessions
    Server-->>UI: Return Password Reset Success
    deactivate Server
    UI-->>User: Prompt to Login with New Password
```

---

## 4. Database Schema & Entity Relationships

The authentication ecosystem relies on six primary database entities interacting seamlessly across transactions:

```mermaid
erDiagram
    User ||--o{ UserIdentity : "owns"
    User ||--o{ Session : "maintains active"
    User ||--o{ OrgMembership : "belongs to"
    User ||--o{ OTP : "receives"
    User ||--o{ Token : "issued"
    Organization ||--o{ OrgMembership : "contains"
    Role ||--o{ OrgMembership : "assigned to"

    User {
        ObjectId _id
        string email
        string username
        string password
        string phone
        string status
    }

    UserIdentity {
        ObjectId _id
        ObjectId userId
        string provider
        string providerId
        string email
    }

    Session {
        ObjectId _id
        ObjectId userId
        string refreshToken
        object deviceInfo
        boolean isRevoked
        date lastActiveAt
    }

    Token {
        ObjectId _id
        ObjectId userId
        string tokenHash
        string type
        date expiresAt
    }

    OTP {
        ObjectId _id
        string identifier
        string code
        string type
        boolean isVerified
        number attempts
        date expiresAt
    }

    OrgMembership {
        ObjectId _id
        ObjectId userId
        ObjectId orgId
        ObjectId roleId
        ObjectId villaId
        string residentType
    }
```

---

## 5. Security Controls & System Architecture Summary

1. **Zero Password Exposure:** Passwords are never stored in plain text. Hashed using **Bcrypt** with dynamic salting.
2. **Context Integrity & Anti-Lockout:** The System Platform tenant workspace (`isPlatform: true`) is protected from accidental blocking or deletion via explicit backend checks in service layers.
3. **Correlation ID Tracing (`X-Request-ID`):** All incoming HTTP requests and API calls pass an `X-Request-ID` correlation header to track user request trajectories across logs.
4. **Transport Isolation:** Business logic inside `auth.services.js` never imports transport libraries (e.g. Nodemailer, Twilio, Socket.io) directly. Communication is purely event-driven via `auth.events.js`.
5. **Session Revocation:** Users can view active device sessions (`/sessions`) and remotely revoke stolen or lost device sessions, immediately invalidating the associated refresh token.

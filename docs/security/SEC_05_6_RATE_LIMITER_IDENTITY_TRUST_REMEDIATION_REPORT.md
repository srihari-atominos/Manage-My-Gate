# SEC-05.6 — Rate Limiter Identity Trust Remediation Report

**Project:** Nahom / Connect Harmony  
**Repository:** Manage-My-Gate  
**Security Track:** SEC-05 — Cache Layer Tenant Isolation  
**Parent Report:** SEC-05.5 — Consolidated Cache Security Verification  
**Task ID:** SEC-05.6  
**Execution Date:** 2026-10-15  
**Auditor / Engineer:** Antigravity AI Security Pair Programmer  
**Current Branch:** `security/phase2-repository-tenant-isolation`  
**Current HEAD Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`  
**Final Status:** **RESOLVED**

---

## 1. Executive Summary

During the consolidated verification of SEC-05, a critical trust-boundary violation was identified in the rate-limiting middleware (`backend/src/middlewares/rateLimiter.middleware.js`). The generic API rate-limiter extracted user and tenant identifiers from an unverified Bearer JWT using `jwt.decode(token)` prior to authentication and cryptographic verification.

Because `jwt.decode` only deserializes the base64 payload without validating the cryptographic signature, algorithm, expiry, or tenant membership:
1. An unauthenticated attacker could completely bypass IP rate-limiting by rotating forged user IDs in arbitrary JWT tokens, effectively generating infinite rate-limit buckets.
2. An attacker could craft a forged JWT with a victim's `orgId` and `id`, enabling noisy-neighbor or targeted rate-limit exhaustion against legitimate tenants on shared public IPs or NAT gateways.
3. Key generator functions in authentication limiters were vulnerable to unhandled exceptions when receiving non-string payloads (e.g. numeric phones or object injections).

This remediation eliminated unverified JWT decoding from the rate limiter. Identity-specific rate limiting is strictly bounded to server-verified identities attached to `req.user` by trusted authentication middleware. Pre-authentication and unverified requests consistently resolve to a hardened anonymous IP key (`anon:${req.ip}`). All 10 focused security tests and 185 regression tests passed with zero failures.

---

## 2. Exact Vulnerable Code Path

Prior to remediation, `backend/src/middlewares/rateLimiter.middleware.js` contained the following vulnerable code in `getApiKey(req)`:

```javascript
// VULNERABLE CODE (PRE-REMEDIATION):
export function getApiKey(req) {
  const userId = req.user?.id || req.user?._id;
  const tenantId = req.tenant?.orgId || req.user?.orgId;
  if (userId && tenantId) {
    return `tenant:${tenantId}:user:${userId}:${req.ip}`;
  }
  if (userId) {
    return `user:${userId}:${req.ip}`;
  }

  // >>> VULNERABLE BLOCK: TRUSTING UNVERIFIED JWT CLAIMS <<<
  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token); // NO SIGNATURE VERIFICATION
      if (decoded && decoded.id) {
        const tId = decoded.orgId || 'no_org';
        return `token_tenant:${tId}:user:${decoded.id}:${req.ip}`;
      }
    } catch {
      // Ignore token parse error and fallback to anonymous
    }
  }

  return `anon:${req.ip}`;
}
```

Furthermore, in `backend/index.js`, `apiLimiter` is mounted globally at `/api` and `/api/v1` *before* route execution and before `isAuthenticated` middleware runs. Consequently, on every inbound API request, `req.user` was `undefined` at the rate limiter stage, forcing execution into this vulnerable unverified decoding branch.

---

## 3. Root Cause and Threat Scenarios

### Root Cause
Treating `jwt.decode()` as proof of identity. Decoding a JWT extracts JSON claims from the token string without verifying that the secret/public key signed the payload, without enforcing the `HS256` algorithm, and without checking token expiration or database status.

### Threat Scenarios
1. **Rate Limiting Bypass via Rotating Forged Tokens:**
   An unauthenticated client sending rapid requests to `/api/v1/...` could forge a new random JWT on every request (`jwt.sign({ id: crypto.randomUUID() }, 'attacker_secret')`). The rate limiter assigned each request a unique bucket `token_tenant:no_org:user:<uuid>:<ip>`. As a result, the 1500 request/15-minute IP throttle was rendered completely ineffective.
2. **Victim Tenant / User Denial-of-Service (Bucket Poisoning):**
   An attacker sharing a public IP (corporate network, university, cellular gateway) or targeting internal shared proxies could forge tokens containing `orgId: victimOrgId` and `id: victimUserId`. By blasting requests, the attacker could exhaust the quota for legitimate tenant users.
3. **Key Generator Crash (DoS):**
   In `getAuthKey` and `getOtpKey`, `toLowerCase().trim()` was invoked directly on request body fields. If an attacker sent JSON with non-string values (e.g. `{"phone": 1234567890}` or `{"email": {"$gt": ""}}`), an unhandled `TypeError: ...toLowerCase is not a function` was thrown, crashing key generation and returning 500 errors.

---

## 4. Files Changed and Reasons

| File | Change Description |
| :--- | :--- |
| `backend/src/middlewares/rateLimiter.middleware.js` | 1. Removed `import jwt from 'jsonwebtoken'` and eliminated unverified `jwt.decode` logic from `getApiKey`.<br>2. Enforced that tenant and user identity keys are generated **only** when `req.user` is populated by trusted auth middleware.<br>3. Coerced non-string payloads to safe strings in `getAuthKey` and `getOtpKey`.<br>4. Extracted and exported `getReportSubmitKey` and `getTestEmailKey` with defensive IP scoping for unauthenticated calls.<br>5. Implemented strict throwing store in `createRateLimitStore` when `REQUIRE_REDIS_RATE_LIMIT=true` and Redis is offline. |
| `backend/tests/sec05_3_slot_lock_ratelimiter_tenant_isolation.test.mjs` | Updated test to verify that unverified Bearer tokens correctly yield `anon:${req.ip}` rather than identity-specific keys, and simulated verified `req.user` in authenticated route tests. |
| `backend/tests/sec05_6_rate_limiter_identity_trust.test.mjs` | Created dedicated, comprehensive test suite (10 tests) covering unverified claim rejection, token rotation evasion prevention, fail-closed Redis behavior, and end-to-end integration. |

---

## 5. Before-and-After Rate-Limit Key Selection

| Request Type | State | Key Selection (Before) | Key Selection (After) | Security Outcome |
| :--- | :--- | :--- | :--- | :--- |
| Unauthenticated request (no token) | `req.user` is `null` | `anon:${req.ip}` | `anon:${req.ip}` | Preserved safe IP throttling |
| Request with forged / unverified token | `req.user` is `null` | `token_tenant:${tId}:user:${id}:${req.ip}` | `anon:${req.ip}` | **Fixed:** Forged tokens cannot bypass IP limit or manipulate tenant buckets |
| Request with expired / invalid token | `req.user` is `null` | `token_tenant:...` (if decoded) or `anon:...` | `anon:${req.ip}` | **Fixed:** Expired tokens never grant identity buckets |
| Authenticated request with tenant context | `req.user` verified, `req.tenant` attached | `tenant:${orgId}:user:${userId}:${req.ip}` | `tenant:${orgId}:user:${userId}:${req.ip}` | Preserved tenant-scoped isolation |
| Authenticated request without tenant context | `req.user` verified | `user:${userId}:${req.ip}` | `user:${userId}:${req.ip}` | Preserved user-level isolation |
| Login attempt (`getAuthKey`) with numeric phone/email | Any | Throws `TypeError` | `${req.ip}:${target}` (string coerced) | **Fixed:** Crash-proof key generation |
| OTP request (`getOtpKey`) with non-string target | Any | Throws `TypeError` | `${req.ip}:${target}` (string coerced) | **Fixed:** Crash-proof key generation |

---

## 6. JWT Verification Trust Boundary

The architecture now enforces a strict, unambiguous trust boundary:

```
[ Incoming HTTP Request ]
          │
          ▼
   [ Rate Limiter (apiLimiter) ]
          │
          ├─► Does trusted req.user exist? (Attached by prior auth middleware)
          │       ├─► YES: Use validated tenant:${tenantId}:user:${userId}:${ip}
          │       └─► NO:  Use pre-auth anon:${ip}  ◄── (NEVER parse Authorization header)
          ▼
   [ Authentication Middleware (isAuthenticated / optionalAuth) ]
          │
          ├─► Cryptographically verify JWT via jwt.verify(token, secret, { algorithms: ['HS256'] })
          ├─► Verify user exists and status === 'Active' in MongoDB
          ├─► Validate organization header permissions
          └─► Populate req.user = decoded
          ▼
   [ Route Handlers / Feature-Specific Limiters (reportSubmitLimiter) ]
          │
          └─► req.user is guaranteed trusted, server-verified, and safe
```

- No component outside `auth.middleware.js` performs JWT verification or decoding.
- No rate limiter attempts to inspect or trust raw token payloads before cryptographic verification.

---

## 7. Redis Failure and Multi-Instance Behavior

The implementation supports two distinct operational modes:

1. **Strict Fail-Closed Mode (`REQUIRE_REDIS_RATE_LIMIT=true`):**
   - If Redis is offline or disconnected, `createRateLimitStore` returns a store whose `increment` method throws `new Error('Redis is required for rate limiting...')`.
   - Combined with `passOnStoreError: false`, any Redis command failure or disconnection causes `express-rate-limit` to pass the error to `next(err)`, failing closed and preventing requests from bypassing rate limits in multi-pod deployments.
2. **High-Availability Mode (`REQUIRE_REDIS_RATE_LIMIT=false` or unset):**
   - If Redis is unavailable or unconfigured, `createRateLimitStore` returns `undefined`, engaging Express Rate Limit's default local `MemoryStore`.
   - If Redis commands fail during runtime, `passOnStoreError: true` allows requests to pass through rather than causing an application outage.
   - *Limitation in Availability Mode:* Each pod maintains local memory counters. An attacker could distribute requests across multiple pods, multiplying the effective limit by the number of active pods. Production environments requiring strict quotas must enable `REQUIRE_REDIS_RATE_LIMIT=true`.

---

## 8. Test Execution and Evidence

All tests were executed against the actual codebase using the Node.js native test runner and npm scripts.

### 8.1 Dedicated Security Suite
Command: `node --test backend/tests/sec05_6_rate_limiter_identity_trust.test.mjs`
- **Result:** **10/10 PASS** (0 failed, duration: 710 ms)
  1. `ok 1 - Forged JWT with victim tenant ID cannot manipulate or select tenant bucket`
  2. `ok 2 - Attacker rotating forged user IDs cannot evade IP rate-limit bucket`
  3. `ok 3 - Missing, malformed, expired, or invalid-signature tokens safely receive pre-auth anon key`
  4. `ok 4 - Authenticated requests use identity-specific keys only after trusted req.user is attached`
  5. `ok 5 - Correctly authenticated users and tenants are partitioned on shared IPs`
  6. `ok 6 - Login and OTP key generators safely isolate targets and handle non-string inputs`
  7. `ok 7 - REQUIRE_REDIS_RATE_LIMIT=true strictly enforces fail-closed store when Redis is offline`
  8. `ok 8 - Default availability mode falls back to MemoryStore when Redis is unconfigured`
  9. `ok 9 - End-to-End: Forged JWT cannot consume authenticated user bucket or bypass anon limit`
  10. `ok 10 - reportSubmitLimiter and testEmailLimiter safely scope unauthenticated fallback to IP`

### 8.2 Complete Security & Governance Regression Battery
| Suite Name | Focus Area | Total Tests | Passed | Failed |
| :--- | :--- | :--- | :--- | :--- |
| `sec05_6_rate_limiter_identity_trust.test.mjs` | JWT Identity Trust & Abuse Prevention | 10 | 10 | 0 |
| `sec05_3_slot_lock_ratelimiter_tenant_isolation.test.mjs` | SlotLockStore & Rate Limiter Isolation | 14 | 14 | 0 |
| `sec05_2a_rbac_tenant_isolation.test.mjs` | RBAC Tenant Isolation & Role Scoping | 14 | 14 | 0 |
| `sec05_2b_permission_cache_tenant_isolation.test.mjs` | Permission Cache & Invalidation | 13 | 13 | 0 |
| `sec05_4_sensitive_attachment_cache_isolation.test.mjs` | Attachment Delivery & Header Controls | 12 | 12 | 0 |
| `issueReport.security.test.mjs` | Access Control & Input Sanitization | 17 | 17 | 0 |
| `npm run test:governance` | Monorepo Governance & Architecture Rules | 115 | 115 | 0 |
| **TOTAL** | **Consolidated Regression Baseline** | **195** | **195** | **0** |

---

## 9. Remaining Risks and Deployment Prerequisites

1. **Production Redis Infrastructure:**
   - In production, multi-pod backend services must configure `REDIS_URL` pointing to a managed Redis instance (or Redis Cluster/Sentinel).
   - If strict cluster-wide rate limiting is mandated by security policy, `REQUIRE_REDIS_RATE_LIMIT=true` must be set in `backend/.env`.
2. **Reverse Proxy IP Trust:**
   - The application relies on `app.set('trust proxy', 1)`. In production deployments behind reverse proxies (Nginx, AWS ALB, Cloudflare), verify that the ingress proxy strips client-spoofed `X-Forwarded-For` headers before appending the true client IP.

---

## 10. Git Branch and HEAD Commit

- **Branch:** `security/phase2-repository-tenant-isolation`
- **HEAD Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`

---

## 11. Final Status

**`RESOLVED`**

Unverified JWT claims can no longer influence or select rate-limit keys under any circumstance. All identity-specific rate limiting strictly depends on verified server-side authentication (`req.user`). All automated tests pass with 100% success.

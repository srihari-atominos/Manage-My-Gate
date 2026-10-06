# Phase 3: Invitation Authentication Branching

## 1. Objective Completed
Implemented dynamic routing of the invitation flow based on the organization's `authenticationMethod`. The token securely resolves the organization configuration, providing the client with the precise branch to render without leaking secrets. 

## 2. Dynamic Routing of Invitation Flow
The backend now safely resolves `authenticationMethod` directly from the token/organization join within `validateInvite()`. If the organization mandates `OTP_LOGIN`, the frontend `InviteHandler.jsx` cleanly diverges from the standard Tabs (Sign Up/Sign In) into the `OtpInviteFlow.jsx` component.

## 3. Flow A: `EXISTING_SYSTEM` (Preservation)
The existing flow strictly remains: Open Invitation -> Sign In / Sign Up -> Auth -> Device Detection.
We did **not** introduce an explicit "Accept Invitation" button before Sign In for organizations using `EXISTING_SYSTEM`.

## 4. Flow B: `OTP_LOGIN` (Implementation)
The `OtpInviteFlow.jsx` enforces: Open Invitation -> Accept Invitation -> Validate Invitation -> OTP Login -> Verify OTP. We added the corresponding backend `initiateInvitationOtp` and `verifyInvitationOtp` methods which consume the token explicitly **after** OTP Verification succeeds. 

## 5. Backend Resolution Endpoint
We augmented `validateInvite` in `auth.services.js` to explicitly fetch and return `authenticationMethod`. It joins to the Organization via `resolvedOrgId` and falls back to `EXISTING_SYSTEM` if missing.

## 6. Safely Transitioning Invitation Context
The invitation context (`orgId`, `userId`) remains safely guarded on the backend. The token consumption within `verifyInvitationOtp` calls `acceptInvitation(..., skipPasswordCheck = true)` inside a transaction boundary, ensuring no client-stored context is blindly trusted.

## 7. Reusing OTP Infrastructure
We added `INVITATION_LOGIN` to `otp.model.js`'s allowed enums. This correctly isolates this OTP flow from `REGISTER`, `LOGIN`, or `RESET`, mitigating purpose-reuse vulnerabilities.

## 8. Frontend UI / Logic
We built a clean, decoupled `OtpInviteFlow.jsx` which provides two distinct steps:
- A clear "Accept Invitation" CTA (before asking for OTPs).
- The 6-digit verification code input.

`InviteHandler.jsx` was updated to short-circuit the traditional rendering when `inviteData?.authenticationMethod === 'OTP_LOGIN'`.

## 9. Security & Error Handling
We've ensured that new users passing through the OTP branch can skip the traditional password requirement safely, without compromising other branches. We used `skipPasswordCheck` in `acceptInvitation()` strictly within the secure boundary of `verifyInvitationOtp()` after successful OTP verification.

## 10. Device Detection Timing
As required, device detection happens post-login inside the standard web dashboard router when the `onSuccess` callback executes `window.location.reload()`, preserving the existing `AppLoader` logic.

## 11. Edge Cases Covered
- What if the invitee has no password? The OTP branch handles it.
- What if the organization does not use OTP? The `initiateInvitationOtp` securely checks `inviteInfo.authenticationMethod !== 'OTP_LOGIN'` and throws a 403 Forbidden.
- What if the email is missing? We resolve the identifier explicitly through the token validation.

## 12. Conclusion
Phase 3 is fully integrated and backwards-compatible. `EXISTING_SYSTEM` behaves exactly as before. `OTP_LOGIN` securely provides passwordless access bound exclusively to the invitation target identity.

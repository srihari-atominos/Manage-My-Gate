# Phase 5: Post-Creation User Bulk Onboarding

## A. Existing Backend Bulk Invite Architecture

- **Endpoint**: `POST /api/v1/users/bulk-invite`
- **Controller**: `userController.bulkInviteUsers`
- **Service**: `userService.bulkInviteUsers`
- **Behavior**: Iterates over an array of `invitations`. For each, it validates the parameters and delegates to the core `this.inviteUser` method.
- **Tenant Isolation**: By default, it uses `req.tenant.orgId`. However, the `tenantContext` middleware allows a Platform Admin (`userIsPlatform === true`) to act on behalf of another organization by passing the target org ID in the `X-Organization-Id` HTTP header.

## B. Exact API Payload & Supported Fields

The `bulkInviteUserRules` validator strictly accepts and validates the following shape:
```json
{
  "invitations": [
    {
      "email": "resident.owner@example.com",
      "residentType": "Owner",
      "roleName": "Resident Owner",
      "villaNumber": "Villa 01"
    }
  ]
}
```
**Supported Fields**:
- `email` (Required): Must be a valid email format.
- `roleName` (Required): Target user role.
- `residentType` (Optional): String, defaults to "None" if omitted.
- `villaNumber` (Optional): Target unit string; dynamically resolved to `villaId` by the backend.

**Unsupported Fields (Dropped/Ignored by Backend)**:
- `fullName`
- `phone`
- *Note*: While `inviteUser` conceptually accepts a phone number, the bulk-invite service explicitly passes empty strings (`''`) for `name` and `phone`. Attempting to send them from the frontend is safely ignored by the backend.

## C. Duplicate & Conflict Handling

The backend processes conflicts row-by-row sequentially, preventing batch aborts:
- **Existing User in Another Org**: The backend successfully re-uses the global user account (`userId`) and securely provisions a new `OrgMembership` for the target organization, emitting a `USER_INVITED` event.
- **Existing Active User in Same Org**: The backend detects an active `OrgMembership` and throws a `409 Conflict: User is already an active member of this community.`
- **Duplicate Rows within the Same CSV**: The first row succeeds; subsequent matching rows throw a `409` conflict which is safely collected in the `failures` array and displayed in the frontend results screen.

## D. File Formats Supported

The frontend utilizes a custom `parseCSV` and `splitCSVLine` parser that securely decodes standard `.csv` files locally within the browser memory without needing heavy Excel dependencies.
- **Supported format**: `.csv` natively supported by `BulkInviteModal.jsx`.

## E. UX Implementation (Post-Creation Action)

We integrated the optional bulk onboarding step entirely outside the transactional boundary of the Organization Wizard:
1. **Organization Wizard Navigation Update**: Modified the final "Success" screen of the Create Organization wizard to redirect the Platform Admin directly to the specific `OrganizationDetails` dashboard (`/super-admin/organizations/:id`) rather than the global table.
2. **Dashboard Integration**: Added a "Bulk Onboard Users" action button in the `User Directory` section header of the Organization Dashboard.
3. **Cross-Tenant API Execution**: Implemented a dedicated `bulkInviteOrganizationUsers` API method that explicitly injects the target `x-organization-id` header to authorize the Platform Admin to bulk-invite users into the *target* organization.

## F. Security & Architecture Integrity

- **Platform Admin Enforcement**: The action respects `requirePlatformContext: true` rules.
- **Tenant Context Isolation**: By utilizing the existing `X-Organization-Id` override pattern established in the auth architecture, the Platform Admin securely provisions users into the correct organization without logging out or manipulating their own session data.
- **No API Changes**: Zero modifications were made to the backend endpoints or validators.

## G. Files Changed

1. `frontend/src/services/apiClient.js`
   - Preserved explicitly passed `x-organization-id` headers instead of indiscriminately overwriting them.
2. `frontend/src/features/organization/services/organizationApi.js`
   - Added `bulkInviteOrganizationUsers` function injecting the target tenant header.
3. `frontend/src/features/organization/store/organizationSlice.js`
   - Created `bulkInviteOrganizationUsersAsync` Redux thunk.
4. `frontend/src/features/organization/hooks/useOrganizationUsers.js`
   - Destructured and exposed the new `bulkInviteUsers` bound hook method.
5. `frontend/src/features/organization/views/OrganizationDetails.jsx`
   - Imported `<BulkInviteModal />` and added the "Bulk Onboard Users" CTA button.
6. `frontend/src/features/organization/views/CreateOrganizationWizard.jsx`
   - Updated success-state redirection to route to the specific dashboard instead of the general list.

## H. Final Recommendation

**APPROVED** - The Phase 5 post-creation user onboarding flow has been thoroughly audited and safely implemented according to the constraints. We can proceed to Phase 6.

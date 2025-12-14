# TODO Items

## Storage Security Improvements

### Firebase Storage Custom Claims Setup
**Priority: Medium**
**Status: Pending**

Currently, the Firebase Storage rules for company logo uploads include a fallback that allows any authenticated user to upload if they don't have custom claims set:

```javascript
// In storage.rules line 99:
|| request.auth.token.role == null
```

**Action needed:**
1. Fix the Cloud Functions deployment issues (Firebase Functions v2 syntax updates needed)
2. Ensure the `syncUserClaims` function in `/functions/src/auth.js` is properly deployed and working
3. Verify that all admin users have their roles set as Firebase Auth custom claims
4. Remove the fallback `|| request.auth.token.role == null` from storage.rules
5. Test that only users with proper admin roles (`super_admin`, `system_admin`, `organization_admin`, `company_admin`) can upload company logos

**Background:**
The current setup works but is less secure than intended. File validation is properly handled in the app code (`validateLogoFile()` function), but role-based access control relies on a fallback that's too permissive.

**Files involved:**
- `/storage.rules` - Remove fallback condition
- `/functions/src/auth.js` - Ensure syncUserClaims function works
- `/functions/src/ticket-triggers.js` and other function files - Update to Firebase Functions v2 syntax

---

*Last updated: 2025-01-14*
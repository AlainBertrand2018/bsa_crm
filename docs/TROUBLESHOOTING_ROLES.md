# Troubleshooting: User Role Not Recognized

## Issue
User `alain.bertrand.mu@gmail.com` has `role: "Super Admin"` and `onboardingCompleted: true` in Firestore, but:
1. System redirects to onboarding (should skip for Super Admin)
2. System treats user as regular "User" instead of "Super Admin"

## Most Likely Cause

**UID Mismatch**: The Firebase Auth UID doesn't match the Firestore document ID.

### How This Happens
1. User is created in Firebase Auth → Gets UID (e.g., `abc123`)
2. User document is created in Firestore with a **different** ID (e.g., `user_email_based_id`)
3. AuthContext looks for Firestore document at: `users/{Firebase Auth UID}`
4. Document not found → User defaults to role: "User", onboardingCompleted: false

## Diagnostic Steps

### Step 1: Use Auth Diagnostics Page
Navigate to: `http://localhost:9002/auth-diagnostics`

This page will show you:
- ✅ Firebase Auth UID
- ✅ Firestore document ID
- ✅ Whether they match
- ✅ Actual role and onboarding status from Firestore

### Step 2: Check Console Logs
After logging in, check the browser console for:

```
[Auth] Firebase user detected: {UID} {email}
[Auth] Fetching Firestore document for UID: {UID}
[Auth] Firestore user data found: {...}
[Auth] Raw role from Firestore: Super Admin
[Auth] Raw onboardingCompleted from Firestore: true
[Auth] User authenticated with role: Super Admin onboardingCompleted: true
```

OR if there's a mismatch:

```
[Auth] Firebase user detected: {UID} {email}
[Auth] Fetching Firestore document for UID: {UID}
[Auth] No Firestore document for user: {UID}
[Auth] Document path: users/{UID}
```

## Solutions

### Solution 1: Fix Existing Document ID (Recommended)
If the Firestore document exists but with a different ID:

1. Go to `/auth-diagnostics` after logging in
2. Note the **Firebase Auth UID**
3. In Firestore Console:
   - Find the user document by email
   - Copy all the data
   - Create a **new** document with ID = Firebase Auth UID
   - Paste the data
   - Delete the old document

### Solution 2: Recreate User via /setup-users
1. Navigate to `/setup-users`
2. Check existing users
3. Use "Setup All Default Users" to create properly linked users

This will create users with:
- Firebase Auth account
- Firestore document with ID = Firebase Auth UID
- Correct role and onboarding status

### Solution 3: Manual Firestore Update
If you know the Firebase Auth UID:

1. Open Firestore Console
2. Go to `users` collection
3. Create/update document with ID = Firebase Auth UID
4. Set fields:
   ```javascript
   {
     email: "alain.bertrand.mu@gmail.com",
     name: "Alain BERTRAND",
     role: "Super Admin",
     onboardingCompleted: true
   }
   ```

## Expected Data Structure

### Firebase Auth
```
UID: "xYz789AbC123"
Email: "alain.bertrand.mu@gmail.com"
```

### Firestore (users/{UID})
```
Document ID: "xYz789AbC123"  ← Must match Firebase Auth UID
{
  email: "alain.bertrand.mu@gmail.com",
  name: "Alain BERTRAND",
  role: "Super Admin",
  onboardingCompleted: true
}
```

## Verification

After fixing:

1. **Clear auth state**: Visit `/clear-auth`
2. **Log in again**: Use `/login`
3. **Check console logs**: Should show:
   ```
   [Auth] User authenticated with role: Super Admin onboardingCompleted: true
   ```
4. **Verify behavior**: Should go directly to dashboard, not onboarding

## Tools Created

### `/auth-diagnostics`
- Shows Firebase Auth UID
- Shows Firestore document ID  
- Highlights mismatches
- Displays actual role and onboarding status
- Lists all users in Firestore

### Enhanced Logging
Updated `AuthContext.tsx` with detailed console logging:
- Shows UID being looked up
- Shows raw data from Firestore
- Shows final role and onboarding status
- Warns when document not found

### Quick Access
All diagnostic tools accessible from login page footer:
```
User Setup | Clear Auth | Auth Diagnostics | Test Connection
```

## Common Scenarios

### Scenario 1: Document Not Found
```
Console: [Auth] No Firestore document for user: abc123
Issue: No document exists with ID = Firebase Auth UID
Solution: Create Firestore document with correct ID
```

### Scenario 2: UID Mismatch
```
Console: [Auth] No Firestore document for user: abc123
But document exists with ID: "xyz456"
Issue: Document ID doesn't match Firebase Auth UID
Solution: Copy document data to new document with correct ID
```

### Scenario 3: Wrong Role in Firestore
```
Console: [Auth] Raw role from Firestore: User
Issue: Firestore document has wrong role
Solution: Update Firestore document role field
```

## Prevention

When creating new users:
1. ✅ Always use `/users/new` or `/setup-users`
2. ✅ These tools automatically create matching UIDs
3. ✅ Verify in `/auth-diagnostics` after creation

## Related Files
- `/src/app/auth-diagnostics/page.tsx` - Diagnostic tool
- `/src/context/AuthContext.tsx` - Enhanced with detailed logging
- `/src/app/setup-users/page.tsx` - User creation tool
- `/src/app/(app)/users/new/page.tsx` - User creation form

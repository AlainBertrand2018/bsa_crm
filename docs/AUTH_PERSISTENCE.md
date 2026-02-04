# Firebase Auth Persistence Settings

## Issue
Firebase Auth was persisting user sessions across browser sessions and page reloads, even after closing the browser. This caused the webapp to think a user was still logged in when visiting the landing page.

## Root Cause
By default, Firebase Auth uses **LOCAL** persistence, which stores authentication state in localStorage and persists across browser sessions (even after closing and reopening the browser).

## Solution Implemented

### 1. Changed Persistence to SESSION
Updated `/src/lib/firebase.ts` to use **SESSION** persistence instead of **LOCAL**:

```typescript
// Set auth persistence to SESSION (not LOCAL)
// This means users will be logged out when they close the tab/browser
if (typeof window !== 'undefined') {
    import('firebase/auth').then(({ setPersistence, browserSessionPersistence }) => {
        setPersistence(auth, browserSessionPersistence).catch((error) => {
            console.error('[Firebase] Error setting persistence:', error);
        });
    });
}
```

### 2. Added Logout Button to Landing Page
Added a visible logout button in the top-right corner of the landing page when a user is detected:

```typescript
{currentUser && (
  <div className="absolute top-4 right-4">
    <Button variant="outline" onClick={logout} className="gap-2">
      <LogOut className="h-4 w-4" />
      Logout ({currentUser.name})
    </Button>
  </div>
)}
```

## Firebase Auth Persistence Options

### LOCAL (Default - ❌ Not Recommended)
- Persists across browser sessions
- Stored in localStorage
- User stays logged in even after closing browser
- **This was causing the issue**

### SESSION (✅ Now Using)
- Only persists during the current browser session
- Stored in sessionStorage
- User is logged out when tab/window is closed
- **Better for security and development**

### NONE (Most Secure)
- No persistence at all
- User must log in on every page refresh
- Too restrictive for normal use

## Benefits of SESSION Persistence

1. **Better Security**: Users are automatically logged out when they close the browser
2. **Clean State**: Fresh browser sessions start without any logged-in user
3. **Development**: Easier to test login flows without stale sessions
4. **User Control**: Users can simply close the tab to log out

## Current Behavior

### Before Changes (LOCAL persistence)
```
User logs in → Closes browser → Opens browser next day
→ Still logged in ❌
```

### After Changes (SESSION persistence)
```
User logs in → Closes browser tab → Opens new tab
→ Logged out ✓
```

## How to Force Logout Now

### Option 1: Close Browser Tab
Simply close the browser tab and reopen - you'll be logged out

### Option 2: Use Logout Button
Click the "Logout" button in the top-right corner of the landing page

### Option 3: Visit /clear-auth
Navigate to `/clear-auth` to completely clear all auth state

### Option 4: Sign Out in Modal
If the login modal appears, click "Sign in as another user"

## Testing

### Test SESSION Persistence
1. Log in to the application
2. Note your logged-in state
3. **Close the browser tab** (not just refresh)
4. Open a new tab and navigate to the app
5. You should be logged out ✓

### Test Auto-Logout
1. Log in to the application
2. Close the browser tab
3. Reopen - you should see the landing page with NO user logged in

## Developer Notes

### Changing Persistence
To change the persistence mode, edit `/src/lib/firebase.ts`:

```typescript
// For LOCAL persistence (persists across sessions)
import { browserLocalPersistence } from 'firebase/auth';
setPersistence(auth, browserLocalPersistence);

// For SESSION persistence (current - persists only in session)
import { browserSessionPersistence } from 'firebase/auth';
setPersistence(auth, browserSessionPersistence);

// For NO persistence (requires login on every refresh)
import { inMemoryPersistence } from 'firebase/auth';
setPersistence(auth, inMemoryPersistence);
```

## Related Files
- `/src/lib/firebase.ts` - Firebase initialization and persistence settings
- `/src/app/page.tsx` - Landing page with logout button
- `/src/app/clear-auth/page.tsx` - Utility to clear all auth state
- `/src/context/AuthContext.tsx` - Auth state management

## References
- [Firebase Auth Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Firebase Auth State Management](https://firebase.google.com/docs/auth/web/manage-users)

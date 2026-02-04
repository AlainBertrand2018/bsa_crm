# Clearing Authentication State

## Issue
The webapp was showing a persisted user session from a previous login, even after restarting the dev server. This happens because Firebase Auth stores authentication state in browser storage.

## Solution Created

### New Utility Page: `/clear-auth`

Created a dedicated page to completely clear all authentication data from the browser.

**What it clears:**
1. ✅ Firebase Auth session (signs out)
2. ✅ localStorage (all data)
3. ✅ sessionStorage (all data)  
4. ✅ IndexedDB (Firebase's offline storage)

### How to Use

#### Method 1: Navigate directly
```
http://localhost:9002/clear-auth
```

The page will automatically:
1. Sign you out from Firebase
2. Clear all browser storage
3. Redirect you to the login page

#### Method 2: From Login Page
At the bottom of the login page (`/login`), there are now admin utility links:
- **User Setup** - Create Firebase Auth users
- **Clear Auth** ← New! - Clear all auth state
- **Test Connection** - Test Firestore connection

## When to Use This

Use `/clear-auth` when:
- You're seeing a persisted user session you don't want
- You want to test a completely fresh login flow
- You want to ensure no user is logged in
- You're testing authentication from a clean state
- Browser is showing stale user data

## What Happens

```
Visit /clear-auth
    ↓
Auto-runs clearAuth()
    ↓
Signs out from Firebase Auth
    ↓
Clears localStorage
    ↓
Clears sessionStorage
    ↓
Deletes all IndexedDB databases
    ↓
Shows status updates
    ↓
Redirects to /login after 2 seconds
```

## Technical Details

### Storage Cleared

**localStorage**
- Firebase Auth tokens
- Any app-specific data
- User preferences

**sessionStorage**
- Temporary session data

**IndexedDB**
- Firebase offline storage
- Firestore cache
- Auth persistence data

### Code Location
`/src/app/clear-auth/page.tsx`

## Testing Fresh Login

To test a completely clean authentication flow:

1. Navigate to `http://localhost:9002/clear-auth`
2. Wait for the automatic cleanup
3. You'll be redirected to `/login`
4. Now you have a clean slate - no user logged in
5. Test your login flow from scratch

## Alternative: Manual Browser Clear

You can also clear auth state manually:
1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear:
   - Local Storage
   - Session Storage
   - IndexedDB
4. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

## Quick Access

Added to login page footer for easy access during development:
```
Administrator?
User Setup | Clear Auth | Test Connection
```

## Related Files
- `/src/app/clear-auth/page.tsx` - Utility page
- `/src/app/login/page.tsx` - Added link to clear auth
- `/src/context/AuthContext.tsx` - Auth state management

# Auto-Logout & Authentication Security

## Overview
Implemented auto-logout functionality and fixed authentication flow to ensure proper security.

## Changes Made

### 1. Auto-Logout After Inactivity (`AuthContext.tsx`)
✅ **Implemented 10-minute idle timeout**
- Monitors user activity through multiple event types:
  - Mouse movements (`mousedown`, `mousemove`)
  - Keyboard input (`keypress`)
  - Scrolling (`scroll`)
  - Touch events (`touchstart`)
  - Clicks (`click`)
- Automatically logs user out after 10 minutes of no activity
- Dispatches custom `idle-logout` event for notification
- Cleanup properly handled on component unmount

### 2. Idle Logout Notification (`(app)/layout.tsx`)
✅ **Added toast notification for auto-logout**
- Listens for the `idle-logout` custom event
- Shows a destructive toast message: "Session Expired - You have been logged out due to inactivity."
- User is redirected to login page after logout

### 3. Fixed Login Flow
✅ **Landing page (`/`) no longer assumes logged-in user**
- Users start as unauthenticated
- Login modal prompts for credentials
- No default user session

✅ **Updated LoginModal** to use new error messaging format
- Displays specific error messages from authentication system
- Better user experience with detailed feedback

## How It Works

### Auto-Logout Flow
```
User logs in
    ↓
Activity timer starts (10 minutes)
    ↓
User interacts with page → Timer resets
    ↓
No interaction for 10 minutes → Auto-logout
    ↓
Custom event fired → Toast notification
    ↓
User redirected to /login
```

### Activity Detection
The system monitors these user interactions:
- **Mouse**: Any movement or clicks
- **Keyboard**: Any key presses
- **Touch**: Touch events on mobile
- **Scroll**: Scrolling anywhere on the page

Each activity resets the 10-minute countdown.

## Console Messages

When auto-logout occurs, you'll see:
```
[Auth] Auto-logout due to inactivity
```

## Security Benefits

1. **Prevents Unauthorized Access**: If user walks away from computer, session expires automatically
2. **Compliance**: Meets security requirements for idle session timeouts
3. **User Awareness**: Clear notification when auto-logout occurs
4. **Activity-Based**: Only active users remain logged in

## Configuration

To change the idle timeout duration, modify the `IDLE_TIMEOUT` constant in `AuthContext.tsx`:

```typescript
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
```

Examples:
- 5 minutes: `5 * 60 * 1000`
- 15 minutes: `15 * 60 * 1000`
- 30 minutes: `30 * 60 * 1000`

## Testing

To test auto-logout:
1. Log in to the application
2. Don't interact with the page for 10 minutes
3. After 10 minutes, you should see:
   - Toast notification: "Session Expired"
   - Automatic redirect to `/login`
   - Console message about auto-logout

**Quick Test** (for development):
- Change `IDLE_TIMEOUT` to `30 * 1000` (30 seconds)
- Wait 30 seconds without touching the page
- Verify logout occurs

## Landing Page Behavior

### Before Fix
- System assumed a default "user" was logged in
- Landing page could bypass authentication

### After Fix
- Landing page shows as unauthenticated
- "Go to Dashboard" button opens login modal
- Proper authentication required for all protected routes
- No default or assumed user sessions

## Related Files
- `/src/context/AuthContext.tsx` - Auto-logout implementation
- `/src/app/(app)/layout.tsx` - Notification handler
- `/src/components/auth/LoginModal.tsx` - Updated login
- `/src/app/page.tsx` - Landing page

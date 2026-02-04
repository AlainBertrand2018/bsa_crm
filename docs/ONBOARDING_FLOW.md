# Onboarding Flow & Role-Based Configuration

## Overview
Fixed the onboarding logic to properly handle the `onboardingCompleted` field based on user roles.

## Changes Made

### 1. User Creation - Role-Based Onboarding Status

#### `/setup-users/page.tsx` - Setup Tool
✅ **Automatic onboarding status based on role:**
```typescript
const onboardingCompleted = userData.role === 'Super Admin' || userData.role === 'Admin';
```

- **Super Admin**: `onboardingCompleted = true` (no onboarding needed)
- **Admin**: `onboardingCompleted = true` (no onboarding needed)
- **User**: `onboardingCompleted = false` (onboarding required)

#### `/users/new/page.tsx` - Admin User Creation Form
✅ **Same logic applied when Super Admin creates users:**
```typescript
const onboardingCompleted = formData.role === 'Super Admin' || formData.role === 'Admin';
```

### 2. Onboarding Flow Logic

#### `/(app)/layout.tsx` - Route Protection
✅ **Simplified to only check `onboardingCompleted` field:**
- Removed role-based bypass logic
- Now purely based on the `onboardingCompleted` field value
- Users with `onboardingCompleted = true` → Skip onboarding → Go to dashboard
- Users with `onboardingCompleted = false` → Redirected to `/onboarding`

```typescript
const needsOnboarding = !currentUser.onboardingCompleted;

if (needsOnboarding && pathname !== '/onboarding') {
  router.replace('/onboarding');
}
```

### 3. Onboarding Completion

#### `lib/firestore.ts` - Onboarding Service
✅ **Already correctly implemented:**
- After successful onboarding completion, sets `onboardingCompleted: true`
- Stores business data in `businesses` collection
- Stores user products in `user_products` collection

## How It Works

### New User Flow by Role

#### **Super Admin / Admin**
1. User is created with `onboardingCompleted = true`
2. First login → No onboarding screen → Direct to dashboard
3. Business profile and products are managed separately (not via onboarding)

#### **Regular User**
1. User is created with `onboardingCompleted = false`
2. First login → Redirected to `/onboarding`
3. User completes onboarding form (business info + products)
4. System sets `onboardingCompleted = true` in Firestore
5. User redirected to dashboard
6. Future logins → Skip onboarding → Direct to dashboard

### Database Structure

#### Firestore `users` Collection
```javascript
{
  id: "user-uid",
  email: "user@example.com",
  name: "User Name",
  role: "User" | "Admin" | "Super Admin",
  onboardingCompleted: true | false,  // ← Key field
  createdAt: timestamp
}
```

## Field Values by Role

| Role         | onboardingCompleted Default | Onboarding Required? |
|--------------|----------------------------|---------------------|
| Super Admin  | `true`                     | ❌ No               |
| Admin        | `true`                     | ❌ No               |
| User         | `false`                    | ✅ Yes              |

## State Transitions

### For Regular Users
```
User Created (onboardingCompleted = false)
    ↓
First Login → Redirected to /onboarding
    ↓
Completes Onboarding Form
    ↓
System updates: onboardingCompleted = true
    ↓
Redirected to /dashboard
    ↓
Future Logins → Direct to /dashboard
```

### For Admin/Super Admin
```
User Created (onboardingCompleted = true)
    ↓
First Login → Direct to /dashboard
    ↓
All Future Logins → Direct to /dashboard
```

## Benefits of This Approach

1. **Single Source of Truth**: The `onboardingCompleted` field is the only determinant
2. **Flexible**: Can manually set any user's onboarding status in Firestore
3. **Consistent**: All user creation points use the same logic
4. **Clear**: No complex role-based conditions scattered throughout the code

## Testing

### Test Super Admin/Admin Creation
1. Navigate to `/setup-users` or `/users/new`
2. Create a user with role "Admin" or "Super Admin"
3. Log in as that user
4. Should go directly to dashboard (no onboarding)

### Test Regular User Creation
1. Navigate to `/users/new`
2. Create a user with role "User"
3. Log in as that user
4. Should be redirected to `/onboarding`
5. Complete the onboarding form
6. Should be redirected to dashboard
7. Log out and log back in
8. Should now go directly to dashboard

### Verify in Firestore
Check the `users` collection document:
```javascript
{
  role: "User",
  onboardingCompleted: false  // Before onboarding
}

// After completing onboarding:
{
  role: "User",
  onboardingCompleted: true
}
```

## Related Files
- `/src/app/setup-users/page.tsx` - User setup tool
- `/src/app/(app)/users/new/page.tsx` - User creation form
- `/src/app/(app)/layout.tsx` - Onboarding redirect logic
- `/src/lib/firestore.ts` - Onboarding completion service

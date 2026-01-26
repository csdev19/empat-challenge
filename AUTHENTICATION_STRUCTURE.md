# Authentication Structure for SLP Session Access

## Problem
The `join-info` endpoint returns `slpToken` only if:
1. User is authenticated (has valid session cookie)
2. User has an SLP profile
3. SLP profile ID matches the session's SLP ID

## Expected JSON Structures

### 1. User Object (from better-auth session)
```json
{
  "id": "user-uuid-here",
  "email": "slp@example.com",
  "name": "John Doe",
  "emailVerified": true,
  "image": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Key Field**: `id` - This is the user ID that links to the SLP profile

### 2. SLP Profile (from database)
```json
{
  "id": "slp-uuid-here",
  "userId": "user-uuid-here",  // MUST match user.id above
  "name": "Dr. John Doe",
  "phone": "+1234567890",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "deletedAt": null
}
```

**Key Fields**:
- `id` - SLP profile ID (must match `session.slpId`)
- `userId` - MUST match the authenticated user's `id`
- `deletedAt` - MUST be `null` (not soft-deleted)

### 3. Therapy Session (from database)
```json
{
  "id": "session-uuid-here",
  "slpId": "slp-uuid-here",  // MUST match SLP profile id
  "studentId": "student-uuid-here",
  "dailyRoomUrl": "https://csdev19.daily.co/session-xxx",
  "linkToken": "link-token-here",
  "status": "scheduled",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "deletedAt": null
}
```

**Key Field**: `slpId` - MUST match the SLP profile `id`

## Verification Chain

For `slpToken` to be returned, this chain must be true:

```
Authenticated User (user.id)
    ↓
    ├─→ SLP Profile exists (slp.userId === user.id)
    │       ↓
    │       └─→ SLP Profile not deleted (slp.deletedAt === null)
    │               ↓
    │               └─→ SLP Profile ID matches session (slp.id === session.slpId)
    │                       ↓
    │                       └─→ ✅ slpToken returned
```

## How to Verify Your Setup

### Check 1: User Authentication
Open browser console and check:
```javascript
// Check if you have auth cookies
document.cookie
// Should contain session cookies from better-auth
```

### Check 2: Database Verification
Run these queries to verify the relationship:

```sql
-- 1. Get your user ID (from better-auth session)
SELECT id, email FROM "user" WHERE email = 'your-email@example.com';

-- 2. Check if you have an SLP profile
SELECT id, "userId", name, "deletedAt" 
FROM slp 
WHERE "userId" = 'your-user-id-from-step-1';

-- 3. Check the session's SLP ID
SELECT id, "slpId", "studentId", status, "deletedAt"
FROM therapy_session
WHERE id = 'your-session-id' OR "linkToken" = 'your-link-token';

-- 4. Verify the match
-- Your SLP profile id should match the session's slpId
```

### Check 3: API Request Headers
The request to `/api/v1/therapy-sessions/:id/join-info` must include:
- `Cookie` header with session cookies
- `credentials: "include"` in fetch options (already set in client-treaty)

## Common Issues

### Issue 1: "User not authenticated"
**Cause**: Session cookie not being sent with request
**Fix**: 
- Ensure you're logged in
- Check browser cookies for session cookies
- Verify `credentials: "include"` is set (it is in client-treaty.ts)

### Issue 2: "User has no SLP profile"
**Cause**: No SLP profile exists for your user ID
**Fix**: Create SLP profile via `/api/v1/slp` POST endpoint

### Issue 3: "SLP ID doesn't match"
**Cause**: Your SLP profile ID doesn't match the session's `slpId`
**Fix**: 
- Verify you're accessing a session you created
- Check that `slp.id === session.slpId` in database

## Example: Complete Valid Setup

```json
{
  "user": {
    "id": "user-123",
    "email": "slp@example.com"
  },
  "slp": {
    "id": "slp-456",
    "userId": "user-123",  // ✅ Matches user.id
    "deletedAt": null      // ✅ Not deleted
  },
  "session": {
    "id": "session-789",
    "slpId": "slp-456",    // ✅ Matches slp.id
    "deletedAt": null      // ✅ Not deleted
  }
}
```

## Debugging Steps

1. **Check server logs** - Look for:
   - `[therapy-sessions/:id/join-info] User authenticated` - Should show `userId`
   - `[therapy-sessions/:id/join-info] User SLP found` - Should show `userSlpId` and `matches: true`

2. **Check browser console** - Look for:
   - `[SLPSessionView] Join info extracted` - Should show `hasToken: true`

3. **Verify database** - Run the SQL queries above to verify relationships

4. **Check cookies** - Ensure session cookies are present in browser DevTools → Application → Cookies

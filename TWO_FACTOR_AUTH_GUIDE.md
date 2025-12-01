# Two-Factor Authentication & Password Security Guide

## Overview

Users can now enable two-factor authentication (2FA) and change their passwords through the Security Settings page.

## Features Implemented

### 1. Password Change

**Location:** Profile → Account Settings → Change Password

**How it works:**

- User must enter current password
- New password must be at least 6 characters
- Confirmation field to prevent typos
- Server validates current password before updating

**Backend endpoint:** `POST /api/security/change-password`

```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

### 2. Two-Factor Authentication (TOTP)

**Location:** Profile → Account Settings → Two-Factor Auth

**Setup Flow:**

1. Click "Enable Two-Factor Authentication"
2. Server generates a secret and QR code
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. User enters 6-digit code to verify
5. Server provides 10 backup codes (save these!)
6. 2FA is now enabled

**Login Flow with 2FA:**

1. User enters username and password
2. If 2FA is enabled, login modal shows 2FA code input
3. User enters 6-digit code from authenticator app
4. Server verifies code and issues JWT token

**Backup Codes:**

- 10 codes generated on 2FA enable
- Each code can only be used once
- Hashed with bcrypt before storage
- Used if user loses authenticator device

**Disable 2FA:**

- Requires password and current 2FA code
- Removes secret and backup codes from database

## Backend Endpoints

### Change Password

`POST /api/security/change-password` (authenticated)

- Request: `{ currentPassword, newPassword }`
- Response: `{ success: true, message }`

### Setup 2FA

`POST /api/security/2fa/setup` (authenticated)

- Response: `{ secret, qrCode }` (QR code is data URL)

### Enable 2FA

`POST /api/security/2fa/enable` (authenticated)

- Request: `{ token }` (6-digit verification code)
- Response: `{ success: true, backupCodes: [...] }`

### Disable 2FA

`POST /api/security/2fa/disable` (authenticated)

- Request: `{ password, token }` (password + 2FA code)
- Response: `{ success: true, message }`

### Check 2FA Status

`GET /api/security/2fa/status` (authenticated)

- Response: `{ enabled: true/false }`

### Login with 2FA

`POST /login`

- Request: `{ username, password, twoFactorToken? }`
- Response:
  - If 2FA required: `{ requires2FA: true, userId }`
  - If success: `{ token, userId, balance, role }`

## Database Schema Updates

### User Model

```javascript
{
  twoFactorSecret: String,           // TOTP secret (base32)
  twoFactorEnabled: Boolean,         // Whether 2FA is active
  twoFactorBackupCodes: [String]     // Hashed backup codes
}
```

## Frontend Components

### SecuritySettings.jsx

Modal component with two tabs:

- **Change Password:** Form to update password
- **Two-Factor Auth:** Setup/manage 2FA

**State Management:**

- Checks 2FA status on mount
- Handles QR code display
- Manages verification flow
- Shows backup codes (one-time only)

### AuthModal.jsx Updates

- Added `requires2FA` state
- Shows 2FA input field if needed
- Passes `twoFactorToken` to login

### AuthContext Updates

- `login()` now accepts optional `twoFactorToken`
- Returns `{ requires2FA: true }` if 2FA needed
- Throws errors instead of alerting

## Security Considerations

### ✅ What's Secure

- TOTP uses industry-standard speakeasy library
- Backup codes are bcrypt-hashed (10 rounds)
- 2FA tokens have 2-window tolerance (~60 seconds)
- Password validation requires current password
- 2FA disable requires both password AND code

### ⚠️ Recommendations

1. **Rate Limiting:** Add rate limits to prevent brute force
2. **Account Recovery:** Implement email-based 2FA recovery
3. **Audit Logs:** Log 2FA enable/disable events
4. **IP Tracking:** Notify users of 2FA changes from new IPs
5. **Session Management:** Consider invalidating all sessions on password change

## User Experience

### First-Time 2FA Setup

1. Go to Profile page
2. Click "Two-Factor Auth" button
3. Click "Enable Two-Factor Authentication"
4. Scan QR code with phone app
5. Enter 6-digit code to verify
6. **IMPORTANT:** Save the 10 backup codes!
7. 2FA is now active

### Logging In with 2FA

1. Enter username and password
2. Submit form
3. 2FA code input appears
4. Enter 6-digit code from app
5. Submit again
6. Logged in!

### Lost Authenticator Device

- Use one of the 10 backup codes
- Each code works only once
- Contact support if all codes used

### Disabling 2FA

1. Go to Profile → Two-Factor Auth
2. Enter password
3. Enter current 6-digit code
4. Click "Disable Two-Factor Auth"
5. 2FA removed from account

## Testing Checklist

Backend:

- [ ] Password change with correct current password
- [ ] Password change rejects wrong current password
- [ ] 2FA setup generates valid QR code
- [ ] 2FA enable works with valid code
- [ ] 2FA enable rejects invalid code
- [ ] Login requires 2FA when enabled
- [ ] Login accepts valid 2FA code
- [ ] Login rejects invalid 2FA code
- [ ] Backup codes work for login
- [ ] Backup codes are single-use
- [ ] 2FA disable requires password + code

Frontend:

- [ ] Security Settings modal opens from profile
- [ ] Password change form validates inputs
- [ ] Password change shows success/error messages
- [ ] 2FA setup displays QR code
- [ ] 2FA verification input accepts 6 digits only
- [ ] Backup codes display after enable
- [ ] Login shows 2FA input when required
- [ ] 2FA code input formats correctly
- [ ] Disable 2FA requires confirmation

## Troubleshooting

### "Invalid 2FA code" on Login

- Check device time is accurate (TOTP is time-based)
- Try waiting for next code cycle (30 seconds)
- Use a backup code instead

### Can't Disable 2FA

- Ensure password is correct
- Make sure 2FA code hasn't expired
- Contact admin for manual disable

### Lost All Backup Codes

- Currently requires admin intervention
- Future: implement email recovery

## Dependencies

**Backend:**

- `speakeasy` - TOTP generation/verification
- `qrcode` - QR code generation
- `bcrypt` - Backup code hashing (already installed)

**Frontend:**

- No new dependencies
- Uses built-in React state management

## Files Modified

**Backend:**

- `models/User.js` - Added 2FA fields
- `server.js` - Added security endpoints and 2FA login logic

**Frontend:**

- `divide-frontend-fresh/src/components/SecuritySettings.jsx` (NEW)
- `divide-frontend-fresh/src/components/AuthModal.jsx`
- `divide-frontend-fresh/src/context/AuthContext.jsx`
- `divide-frontend-fresh/src/pages/ProfileNew.jsx`

## Next Steps (Optional Enhancements)

1. **Email Notifications**

   - Send email when 2FA is enabled/disabled
   - Alert on password changes
   - Notify on login from new device

2. **Recovery Options**

   - Email-based 2FA recovery
   - Security questions
   - Admin-verified identity recovery

3. **Enhanced Security**

   - SMS 2FA option
   - Hardware key support (WebAuthn)
   - Remember this device (30 days)

4. **Audit Trail**

   - Log all security events
   - Show recent login history
   - Display active sessions

5. **User Education**
   - In-app tutorial for 2FA setup
   - Best practices guide
   - Security tips on profile page

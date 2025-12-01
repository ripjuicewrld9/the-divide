# Google OAuth Troubleshooting Checklist

## Issue

Google login redirects back without logging in, no errors in console or Render logs.

## Environment Variables (Already Set ✅)

```
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://the-divide.onrender.com/auth/google/login/callback
```

## Google Cloud Console Checklist

### 1. Verify OAuth 2.0 Client ID Configuration

Go to: https://console.cloud.google.com/apis/credentials

**Check the following:**

- [ ] **Client ID matches**: `<your-client-id>.apps.googleusercontent.com`
- [ ] **Client Secret matches**: `<your-client-secret>`
- [ ] **Application type**: Web application
- [ ] **Authorized JavaScript origins** includes:
  - `https://betbro.club`
  - `https://www.betbro.club`
  - `https://the-divide.onrender.com`
- [ ] **Authorized redirect URIs** includes (EXACT MATCH REQUIRED):
  - `https://the-divide.onrender.com/auth/google/login/callback`

### 2. Enable Required APIs

Go to: https://console.cloud.google.com/apis/library

**Ensure these are enabled:**

- [ ] Google+ API (or People API)
- [ ] Google Identity Services API

### 3. OAuth Consent Screen

Go to: https://console.cloud.google.com/apis/credentials/consent

**Check:**

- [ ] App name is set
- [ ] User support email is set
- [ ] Developer contact email is set
- [ ] Publishing status: **Testing** or **In Production**
- [ ] If "Testing", add your test user emails to "Test users" list

### 4. Common Issues

#### Issue: "redirect_uri_mismatch" error

**Solution**: The redirect URI in Google Console must EXACTLY match:

```
https://the-divide.onrender.com/auth/google/login/callback
```

No trailing slash, exact protocol (https), exact domain.

#### Issue: "unauthorized_client" error

**Solution**:

- Check OAuth consent screen is configured
- Verify application type is "Web application"
- Ensure app is published or you're added as a test user

#### Issue: Silent failure (redirects without login)

**Solution**:

- Check browser console for errors
- Verify Google APIs are enabled
- Ensure test users are added if app is in "Testing" mode

## Testing Steps

### After verifying Google Cloud Console settings:

1. **Upload new frontend build** to cPanel (with debug logging)
2. **Deploy backend** to Render (with debug logging added)
3. **Clear browser cache** and cookies for betbro.club
4. **Try Google login** and check:
   - Browser console logs (should see 🔵 messages)
   - Render logs (should see Google OAuth flow)
5. **Check URL** after redirect - look for:
   - `?google_login=TOKEN` (success)
   - `?error=...` (failure with reason)

## Debug Commands

### Check Render environment variables:

```bash
# In Render dashboard > Environment > Environment Variables
# Verify all three Google variables are set
```

### Check Render logs:

```bash
# Look for these log messages after clicking "Continue with Google":
🔵 Google OAuth Login initiated
🔵 Google OAuth Callback received
🔵 Exchanging code for access token...
✅ Redirecting to frontend with token
```

### Check browser console:

```javascript
// After redirect, should see:
🔵 OAuthLoginHandler - Query params: { googleToken: true }
✅ Google token received, logging in...
```

## Next Steps

1. ✅ Upload new `dist` folder to cPanel
2. ⚠️ Verify Google Cloud Console settings (checklist above)
3. ⚠️ Ensure env vars are set on Render:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `FRONTEND_URL`
4. ⚠️ Deploy backend changes to Render (push to GitHub)
5. ⚠️ Test and check Render logs + browser console

## If Still Not Working

Share:

- Screenshot of Google Cloud Console OAuth client settings
- Screenshot of Authorized redirect URIs
- Render logs when attempting Google login
- Browser console output when attempting login

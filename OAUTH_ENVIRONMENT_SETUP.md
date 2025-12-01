# OAuth Environment Variables Setup for Render

## Critical Missing Variable

You need to add `FRONTEND_URL` to your Render environment variables!

## Required Environment Variables on Render

Go to: https://dashboard.render.com → Your backend service → Environment

Add these variables:

```
FRONTEND_URL=https://betbro.club
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://the-divide.onrender.com/auth/google/login/callback
DISCORD_CLIENT_ID=<your-discord-client-id>
DISCORD_CLIENT_SECRET=<your-discord-client-secret>
DISCORD_REDIRECT_URI=https://the-divide.onrender.com/auth/discord/callback
```

## Why FRONTEND_URL is Critical

When a user logs in with Google/Discord:

1. ✅ User clicks "Continue with Google" on **betbro.club**
2. ✅ Redirected to Google login
3. ✅ Google redirects back to Render: `https://the-divide.onrender.com/auth/google/login/callback?code=...`
4. ✅ Render backend creates JWT token
5. ❌ **Backend redirects to `http://localhost:5173` instead of `https://betbro.club`** (WRONG!)

## Current Code Logic

```javascript
// server.js line ~1363
res.redirect(
  `${process.env.FRONTEND_URL || "http://localhost:5173"}?google_login=${token}`
);
```

Without `FRONTEND_URL` set, it defaults to localhost, which:

- Doesn't work in production
- User sees blank page or connection refused
- Token is never received by frontend

## After Adding FRONTEND_URL

The flow will work:

1. User clicks "Continue with Google" on **betbro.club**
2. Redirected to Google login
3. Google redirects to Render backend
4. Backend creates JWT token
5. ✅ Backend redirects to: `https://betbro.club?google_login=JWT_TOKEN`
6. ✅ OAuthLoginHandler component processes the token
7. ✅ User is logged in!

## Testing After Fix

1. Add `FRONTEND_URL=https://betbro.club` to Render environment
2. Render will auto-redeploy (or manually redeploy)
3. Wait ~2 minutes for deployment
4. Try Google login from betbro.club
5. Check browser URL bar - should see: `https://betbro.club?google_login=eyJ...`
6. User should be logged in with profile visible in top right

## Same Issue Affects

- ✅ Google OAuth (both login and signup)
- ✅ Discord OAuth (both login and link account)
- ✅ Password reset emails (uses FRONTEND_URL for reset link)

All of these need FRONTEND_URL to work in production!

# Discord OAuth Setup Guide

This guide explains how to set up Discord OAuth for automatic account linking in your app. This allows users to connect their Discord accounts by clicking a button in their profile, enabling automatic mentions in support ticket threads.

## Why Discord OAuth?

- **Automatic Account Linking**: Users click "Connect Discord" in their profile → authorize → automatically linked
- **Support Ticket Integration**: When linked users submit tickets, they're automatically mentioned in the Discord thread
- **User Experience**: No manual Discord ID copying/pasting needed
- **Future Ready**: Can be extended for Discord-based login and role synchronization

---

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "The Divide" or "The Divide Casino")
4. Click **"Create"**

## Step 2: Get OAuth2 Credentials

1. In your application, go to the **"OAuth2"** section in the left sidebar
2. Click **"OAuth2"** → **"General"**
3. You'll see two important values:
   - **CLIENT ID**: Copy this (looks like `1234567890123456789`)
   - **CLIENT SECRET**: Click "Reset Secret" if needed, then copy it (looks like `abcdefghijklmnopqrstuvwxyz123456`)

⚠️ **Keep your CLIENT SECRET safe!** Never commit it to Git or share it publicly.

## Step 3: Add Redirect URLs

Still in the OAuth2 section:

1. Scroll down to **"Redirects"**
2. Click **"Add Redirect"**
3. For **local development**, add:
   ```
   http://localhost:3000/auth/discord/callback
   ```
4. For **production** (Render), add:

   ```
   https://your-app-name.onrender.com/auth/discord/callback
   ```

   Replace `your-app-name` with your actual Render app URL.

5. Click **"Save Changes"**

## Step 4: Configure Local Environment (.env)

Open your `.env` file in the root directory and update these values:

```env
# Discord OAuth2 (for account linking)
DISCORD_CLIENT_ID=your_actual_client_id_here
DISCORD_CLIENT_SECRET=your_actual_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173
```

**Replace the placeholder values with:**

- `DISCORD_CLIENT_ID`: The Client ID from Step 2
- `DISCORD_CLIENT_SECRET`: The Client Secret from Step 2
- Leave `DISCORD_REDIRECT_URI` as `http://localhost:3000/auth/discord/callback` for local development
- Leave `FRONTEND_URL` as `http://localhost:5173` for local Vite dev server

## Step 5: Configure Production Environment (Render)

In your Render dashboard:

1. Go to your backend service
2. Click **"Environment"** in the left sidebar
3. Add these environment variables:

| Key                     | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `DISCORD_CLIENT_ID`     | Your Client ID from Step 2                                     |
| `DISCORD_CLIENT_SECRET` | Your Client Secret from Step 2                                 |
| `DISCORD_REDIRECT_URI`  | `https://your-app-name.onrender.com/auth/discord/callback`     |
| `FRONTEND_URL`          | `https://your-frontend-url.com` (your production frontend URL) |

⚠️ **Important**: The `DISCORD_REDIRECT_URI` in Render **must exactly match** one of the redirect URLs you added in Step 3.

## Step 6: Restart Your Backend

**Local Development:**

```powershell
# Stop your server (Ctrl+C if running)
# Then restart:
npm start
```

**Production (Render):**

- Render will automatically restart when you save environment variables
- Or manually restart from the Render dashboard

## Step 7: Test the OAuth Flow

1. **Start both servers locally:**

   ```powershell
   # Terminal 1 - Backend (root directory)
   npm start

   # Terminal 2 - Frontend (divide-frontend-fresh)
   cd divide-frontend-fresh
   npm run dev
   ```

2. **Navigate to your profile:**

   - Go to `http://localhost:5173`
   - Log in
   - Click "Profile" in the navigation

3. **Connect Discord:**

   - You should see a "Connect Discord" button at the top of Account Settings
   - Click it
   - You'll be redirected to Discord's authorization page
   - Click "Authorize"
   - You'll be redirected back to your profile
   - The button should now show "Connected as YourDiscordUsername" with an Unlink option

4. **Test Support Tickets:**
   - Submit a support ticket
   - Check your Discord server
   - You should see a new thread in your support channel
   - Your Discord account should be mentioned in the thread

---

## How It Works

### OAuth Flow:

1. User clicks "Connect Discord" → redirects to `https://discord.com/oauth2/authorize?client_id=...&redirect_uri=...&response_type=code&scope=identify`
2. User authorizes → Discord redirects back to `/auth/discord/callback?code=ABC123`
3. Backend exchanges code for Discord user data
4. Backend creates a temporary JWT "link token" with the Discord info
5. Backend redirects to frontend: `http://localhost:5173/link-discord?discord_link=JWT_TOKEN`
6. Frontend calls `/api/link-discord` with the token
7. Backend saves `discordId` and `discordUsername` to the user's database record
8. Frontend updates local user state and shows "Connected" status

### Support Ticket Integration:

- When a user submits a ticket, the backend checks if they have a `discordId`
- If linked, the thread message includes `<@DISCORD_USER_ID>` to mention them
- If not linked, the message includes their username without mentioning

---

## Troubleshooting

### "OAuth not configured" error

- Check that `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set in `.env`
- Make sure there's an `=` sign: `DISCORD_CLIENT_ID=value` (not `DISCORD_CLIENT_ID value`)
- Restart your backend after changing `.env`

### "Redirect URI mismatch" error

- The redirect URI in your Discord app settings must **exactly match** the `DISCORD_REDIRECT_URI` in your `.env`
- Check for trailing slashes, http vs https, localhost vs 127.0.0.1

### "Invalid OAuth code" error

- OAuth codes expire after ~10 minutes
- Make sure your system clock is correct
- Try the flow again from the beginning

### Discord link button doesn't show

- Check browser console for errors
- Make sure you're logged in
- Check that `DiscordOAuthButton` is imported in `ProfileNew.jsx`

### User not mentioned in Discord thread

- Check that the user has a `discordId` saved (check MongoDB or `/api/me` response)
- Make sure your bot has permission to mention users
- Test unlinking and re-linking the Discord account

---

## Future Enhancements

This OAuth system can be extended to support:

- **Discord Login**: Let users sign in with Discord instead of username/password
- **Google OAuth**: Similar flow for Google account linking/login
- **Role Sync**: Automatically sync Discord server roles to your app (e.g., VIP users)
- **Activity Feed**: Post user achievements/wins to Discord
- **Two-Factor Auth**: Use Discord as a 2FA method

Let me know if you want help implementing any of these!

---

## Security Notes

- Never commit `.env` to Git (it's in `.gitignore`)
- Keep `DISCORD_CLIENT_SECRET` secret - it's like a password
- Use HTTPS in production (Render does this automatically)
- Link tokens expire after 5 minutes for security
- Users can unlink/re-link their Discord accounts anytime

---

## Need Help?

If something isn't working:

1. Check the backend console logs for errors
2. Check the browser console for errors
3. Verify all environment variables are set correctly
4. Make sure redirect URIs match exactly
5. Try unlinking and re-linking the Discord account

For Discord API issues, see: https://discord.com/developers/docs/topics/oauth2

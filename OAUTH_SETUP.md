# OAuth & Discord Bot Setup Guide

## 🎫 Discord Support Ticket Bot

### 1. Run the Discord Bot

```bash
node discord-bot.js
```

The bot will start and register the `/setup-tickets` slash command.

### 2. Create the Ticket Panel in Discord

1. Go to your Discord server
2. In the support tickets channel, type: `/setup-tickets`
3. A panel will appear with a "Create Support Ticket" button
4. Users can click the button to open a modal form and create tickets

### 3. Bot Permissions Required

Make sure the bot has these permissions in Discord Developer Portal → Bot:
- ✅ Read Messages/View Channels
- ✅ Send Messages
- ✅ Create Public Threads
- ✅ Create Private Threads
- ✅ Manage Threads
- ✅ Use Slash Commands

---

## 🔐 Discord Login Setup

### 1. Add Redirect URI to Discord OAuth App

Go to: https://discord.com/developers/applications/1444200463313666169/oauth2

**Add this redirect URI:**
```
https://the-divide.onrender.com/auth/discord/login/callback
```

### 2. Update Environment Variables in Render

Add to your backend environment variables:
```
DISCORD_REDIRECT_URI_LOGIN=https://the-divide.onrender.com/auth/discord/login/callback
```

### 3. Frontend Integration

Users will access: `https://the-divide.onrender.com/auth/discord/login`

After authorization, they'll be redirected to: `https://betbro.club?discord_login=TOKEN`

The frontend needs to check for `discord_login` query param and log the user in automatically.

---

## 🔐 Google Login Setup

### 1. Create Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → Create Credentials → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://the-divide.onrender.com/auth/google/login/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2. Update Environment Variables

In `.env` and Render:
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=https://the-divide.onrender.com/auth/google/login/callback
```

### 3. Frontend Integration

Users will access: `https://the-divide.onrender.com/auth/google/login`

After authorization, they'll be redirected to: `https://betbro.club?google_login=TOKEN`

---

## 📱 Frontend Button Examples

### Discord Login Button

```jsx
<button
  onClick={() => window.location.href = 'https://the-divide.onrender.com/auth/discord/login'}
  className="bg-[#5865F2] text-white px-6 py-3 rounded-lg flex items-center gap-2"
>
  <DiscordIcon />
  Login with Discord
</button>
```

### Google Login Button

```jsx
<button
  onClick={() => window.location.href = 'https://the-divide.onrender.com/auth/google/login'}
  className="bg-white text-gray-800 border px-6 py-3 rounded-lg flex items-center gap-2"
>
  <GoogleIcon />
  Login with Google
</button>
```

### Handle OAuth Callbacks

```jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  // Discord login
  const discordToken = params.get('discord_login');
  if (discordToken) {
    localStorage.setItem('token', discordToken);
    window.location.href = '/'; // Redirect to home
  }
  
  // Google login
  const googleToken = params.get('google_login');
  if (googleToken) {
    localStorage.setItem('token', googleToken);
    window.location.href = '/'; // Redirect to home
  }
}, []);
```

---

## 🚀 Deployment Checklist

### Backend (Render)
- [ ] Deploy latest code (includes OAuth routes)
- [ ] Set `DISCORD_REDIRECT_URI_LOGIN`
- [ ] Set `GOOGLE_CLIENT_ID`
- [ ] Set `GOOGLE_CLIENT_SECRET`
- [ ] Set `GOOGLE_REDIRECT_URI`

### Discord Bot
- [ ] Run `node discord-bot.js` (or add to Render as background worker)
- [ ] Bot is online in Discord server
- [ ] Run `/setup-tickets` in support channel
- [ ] Test ticket creation

### Frontend
- [ ] Add "Login with Discord" button
- [ ] Add "Login with Google" button
- [ ] Handle `?discord_login=TOKEN` query param
- [ ] Handle `?google_login=TOKEN` query param
- [ ] Upload new build to cPanel

---

## 🐛 Troubleshooting

**Bot won't start:**
- Check `DISCORD_BOT_TOKEN` is set correctly
- Make sure Discord.js is installed: `npm install discord.js`

**Slash command not appearing:**
- Wait a few minutes for Discord to sync
- Try kicking and re-adding the bot

**OAuth redirects fail:**
- Verify redirect URIs match EXACTLY in Discord/Google console and `.env`
- Check CORS settings allow the redirect domain
- Look at Render logs for error messages

**Private threads not working:**
- Make sure bot has "Create Private Threads" permission
- Check that ADMIN_ROLE_ID is set correctly


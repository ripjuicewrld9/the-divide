# Render.com Deployment Guide

This guide explains how to deploy both the backend and frontend to Render.com as a single unified service.

## Overview

Your application is now configured to:
- Build the frontend during deployment
- Serve the frontend from the Express backend
- Use the same domain for both frontend and API calls (no CORS issues)
- Support client-side routing with React Router

## Configuration Changes Made

### 1. Backend (server.js)
- Added static file serving for frontend dist folder
- Added catch-all route to serve index.html for client-side routing
- Serves built files from `divide-frontend-fresh/dist`

### 2. Frontend
- Updated API calls to use same domain in production
- Socket.IO connections now use same domain in production
- Files updated:
  - `src/services/api.js`
  - `src/config.js`
  - `src/hooks/useSocket.js`
  - `src/hooks/useWheelSocket.ts`
  - All component-level API_BASE constants

### 3. Package.json
- Added `build` script: builds the frontend
- Added `postinstall` script: installs frontend dependencies automatically

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd "c:\Users\gotta\OneDrive\Desktop\Divide-PreAlpha"
git add .
git commit -m "Configure for unified Render deployment"
git push origin master
```

### Step 2: Configure Render.com

1. **Log in to Render.com**
   - Go to https://render.com
   - Sign in with your GitHub account

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `ripjuicewrld9/the-divide`
   - Select the `master` branch

3. **Configure the Service**
   ```
   Name: the-divide
   Region: Choose closest to your users
   Branch: master
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<your-jwt-secret>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your-email>
   SMTP_PASS=<your-email-app-password>
   ADMIN_CODE=<optional-admin-registration-code>
   NODE_ENV=production
   ```

5. **Set Instance Type**
   - Free tier is fine for testing
   - Upgrade to paid tier for production (more memory/CPU)

6. **Create Web Service**
   - Click "Create Web Service"
   - Render will automatically:
     1. Clone your repository
     2. Run `npm install` (installs backend deps)
     3. Run `postinstall` script (installs frontend deps)
     4. Run `npm run build` (builds React frontend)
     5. Start the server with `npm start`

### Step 3: Verify Deployment

1. **Check Build Logs**
   - Monitor the deployment in Render dashboard
   - Look for:
     - ✅ Backend dependencies installed
     - ✅ Frontend dependencies installed
     - ✅ Frontend built successfully
     - ✅ Server started

2. **Test Your Application**
   - Visit your Render URL: `https://the-divide-XXXX.onrender.com`
   - Test:
     - ✅ Frontend loads
     - ✅ Can register/login
     - ✅ API calls work
     - ✅ Socket.IO connections work
     - ✅ Client-side routing works (refresh on any page)
     - ✅ All games work (Wheel, Plinko, Blackjack, etc.)

## Important Notes

### Build Time
- First deployment takes 5-10 minutes (installing all dependencies + building)
- Subsequent deployments are faster (cached dependencies)

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid tier ($7/month) for always-on service

### Environment Variables
- Never commit secrets to GitHub
- All sensitive data should be in Render environment variables
- Update environment variables in Render dashboard as needed

### MongoDB Connection
- Use MongoDB Atlas (free tier available)
- Whitelist Render's IP addresses (or use 0.0.0.0/0 for simplicity)
- Get connection string from Atlas dashboard

### Custom Domain (Optional)
1. Go to your Render service → Settings → Custom Domains
2. Add your domain from Namecheap
3. Update DNS records in Namecheap:
   ```
   Type: CNAME
   Host: @ (or subdomain)
   Value: <your-render-url>.onrender.com
   ```

## Troubleshooting

### Build Fails
- Check build logs for specific errors
- Common issues:
  - Missing environment variables
  - Node version mismatch (Render uses Node 20 by default)
  - Dependency installation errors

### Frontend Shows Blank Page
- Check browser console for errors
- Verify `dist` folder was created during build
- Check server logs for 404 errors

### API Calls Fail
- Verify environment variables are set
- Check MongoDB connection string
- Look for CORS errors (shouldn't happen with unified deployment)

### Socket.IO Doesn't Connect
- Check browser console for connection errors
- Verify WebSocket support is enabled (it is by default on Render)
- Check server logs for socket connection messages

## Updating Your App

After making code changes:

```bash
git add .
git commit -m "Your changes"
git push origin master
```

Render will automatically:
1. Detect the push
2. Rebuild the frontend
3. Restart the server
4. Deploy the new version

## Rolling Back

If deployment fails or has issues:
1. Go to Render dashboard → Deploys
2. Find a previous successful deployment
3. Click "Redeploy"

## Cost Estimation

**Free Tier:**
- 750 hours/month free
- Spins down after inactivity
- Good for testing

**Starter ($7/month per service):**
- Always on
- No spin-down
- Better for production

**Pro ($25/month per service):**
- More CPU/memory
- Better performance
- Recommended for high traffic

## Next Steps

1. ✅ Deploy to Render
2. ✅ Test all features
3. ✅ Set up custom domain (optional)
4. ✅ Configure SSL (automatic with Render)
5. ✅ Set up monitoring/alerts
6. ✅ Upgrade to paid tier when ready for production

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Your code: https://github.com/ripjuicewrld9/the-divide

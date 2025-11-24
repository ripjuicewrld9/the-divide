# Deploying to Namecheap Domain - Complete Guide

## Overview
You have two parts to deploy:
1. **Backend** (Node.js + MongoDB) - Needs a server
2. **Frontend** (React build) - Static files

Namecheap provides shared hosting, which **won't work** for Node.js. You'll need to use a combination approach.

---

## 🎯 Recommended Deployment Strategy

### Option 1: Backend on Railway/Render, Frontend on Namecheap (EASIEST)

**Backend → Railway.app (Free tier available)**
**Frontend → Namecheap Shared Hosting**

#### Step 1: Deploy Backend to Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository (or create one)

3. **Configure Environment Variables in Railway**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rafflehub
   JWT_SECRET=U5K2NqfuzlCN2lsuA4TTWZ3QzcCm1zWZNRnXvFuhCANcd5yg+FtqRcgADMgGZ1AUPvRB0pBSchSfWAk6B4PzAA==
   PORT=3000
   NODE_ENV=production
   ADMIN_CODE=2cecffd212391e2699ce831f6b53bab1
   RANDOM_ORG_API_KEY=b452876f-9a5d-401a-aeb7-84f09119fa33
   REMOVE_BG_API_KEY=KDrok4NbBqasn4GfixhhopMq
   ```

4. **Railway will give you a URL like:**
   `https://your-app-production.up.railway.app`

5. **Update CORS in server.js**
   ```javascript
   cors: {
     origin: "https://yourdomain.com",  // Your Namecheap domain
     credentials: true
   }
   ```

#### Step 2: Setup MongoDB Atlas (Cloud Database)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free cluster

2. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database password
   - Add this to Railway environment variables

3. **Whitelist Railway IP**
   - In Atlas: Network Access → Add IP
   - Add `0.0.0.0/0` (allow all) for Railway

#### Step 3: Build and Deploy Frontend to Namecheap

1. **Update Frontend API URL**
   
   Edit `divide-frontend-fresh/.env.production`:
   ```env
   VITE_API_URL=https://your-app-production.up.railway.app
   ```

2. **Build Frontend**
   ```bash
   cd divide-frontend-fresh
   npm run build
   ```

3. **Upload to Namecheap via cPanel**
   - Login to Namecheap cPanel
   - Go to File Manager
   - Navigate to `public_html` folder
   - Upload all files from `divide-frontend-fresh/dist/` folder
   - Create `.htaccess` file (see below)

4. **Create .htaccess in public_html**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>

   # Enable GZIP compression
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
   </IfModule>

   # Cache static assets
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType image/jpg "access plus 1 year"
     ExpiresByType image/jpeg "access plus 1 year"
     ExpiresByType image/gif "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType text/css "access plus 1 month"
     ExpiresByType application/javascript "access plus 1 month"
   </IfModule>
   ```

---

## 🚀 Option 2: Everything on VPS (More Control)

If you have Namecheap VPS or want full control:

### Step 1: Get a VPS
- Namecheap VPS (starts at $10/month)
- Or use DigitalOcean Droplet ($6/month)
- Or Vultr ($5/month)

### Step 2: Setup VPS

1. **Connect via SSH**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install MongoDB**
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. **Install Nginx**
   ```bash
   sudo apt-get install -y nginx
   ```

5. **Upload Your Project**
   ```bash
   # On your local machine:
   scp -r "C:\Users\gotta\OneDrive\Desktop\The Divide" root@your-vps-ip:/var/www/
   ```

6. **Install Dependencies & Build**
   ```bash
   cd /var/www/The\ Divide
   npm install
   cd divide-frontend-fresh
   npm install
   npm run build
   ```

7. **Setup PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "the-divide"
   pm2 startup
   pm2 save
   ```

8. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/yourdomain.com
   ```

   Paste this configuration:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Frontend - Serve React build
       location / {
           root /var/www/The\ Divide/divide-frontend-fresh/dist;
           try_files $uri $uri/ /index.html;
           
           # Enable gzip
           gzip on;
           gzip_types text/css application/javascript application/json;
       }

       # Backend API - Proxy to Node.js
       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Socket.IO
       location /socket.io/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }

       # Cache static assets
       location /assets/ {
           root /var/www/The\ Divide/divide-frontend-fresh/dist;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

9. **Enable Site & Restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Setup SSL with Let's Encrypt**
    ```bash
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```

### Step 3: Point Domain to VPS

In Namecheap:
1. Go to Domain List → Manage
2. Advanced DNS tab
3. Add A Record:
   - Type: `A Record`
   - Host: `@`
   - Value: `Your VPS IP`
   - TTL: `Automatic`
4. Add A Record for www:
   - Type: `A Record`
   - Host: `www`
   - Value: `Your VPS IP`
   - TTL: `Automatic`

---

## 🎯 Quick Setup: Railway + Namecheap (Recommended)

### 1. Setup Backend on Railway (5 minutes)

```bash
# Push your code to GitHub first (if not already)
cd "C:\Users\gotta\OneDrive\Desktop\The Divide"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/the-divide.git
git push -u origin main
```

Then:
- Go to Railway.app
- Click "New Project" → "Deploy from GitHub"
- Add environment variables
- Deploy!

### 2. Build Frontend with Railway URL

```bash
cd divide-frontend-fresh

# Edit .env.production
echo "VITE_API_URL=https://your-railway-url.up.railway.app" > .env.production

# Build
npm run build
```

### 3. Upload to Namecheap

- Login to Namecheap cPanel
- File Manager → public_html
- Upload all files from `dist/` folder
- Create `.htaccess` (from code above)
- Done!

---

## 📋 Pre-Deployment Checklist

- [ ] MongoDB Atlas account created (or VPS MongoDB installed)
- [ ] Backend deployed and tested (Railway/Render/VPS)
- [ ] Backend URL obtained
- [ ] Frontend .env.production updated with backend URL
- [ ] Frontend built (`npm run build`)
- [ ] server.js CORS updated to allow your domain
- [ ] Domain A records point to server
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] All environment variables set
- [ ] Test login/register functionality
- [ ] Test all games
- [ ] Test Socket.IO connections

---

## 🆘 Troubleshooting

### "Cannot connect to backend"
- Check VITE_API_URL in .env.production
- Verify backend is running
- Check CORS settings in server.js
- Verify domain DNS has propagated (use https://dnschecker.org)

### "Socket.IO not connecting"
- Ensure backend allows WebSocket connections
- Check if hosting blocks WebSocket (some shared hosts do)
- Verify Socket.IO path matches in client and server

### "404 on page refresh"
- Add .htaccess file to public_html
- Ensure mod_rewrite is enabled in Apache

### "Mixed content errors (http/https)"
- Ensure both frontend and backend use HTTPS
- Update all URLs to use https://

---

## 💡 My Recommendation

**For fastest deployment:**
1. Use **Railway.app** for backend (free tier, auto-SSL, easy deploy)
2. Use **MongoDB Atlas** for database (free tier, managed)
3. Upload frontend build to **Namecheap cPanel** (you already pay for it)

This gives you:
- ✅ Working site in 30 minutes
- ✅ Free to start (only pay Namecheap domain cost)
- ✅ Automatic SSL on backend
- ✅ Easy updates (git push to deploy)
- ✅ No server management needed

Would you like me to walk you through the Railway deployment step-by-step?

# Production Deployment Guide

## ✅ Build Completed

The production build has been created in: `divide-frontend-fresh/dist/`

## 🚀 Deployment Steps

### 1. Update Environment Variables

Before deploying, edit `.env.production` and set your actual domain:

```bash
# In divide-frontend-fresh/.env.production
VITE_API_URL=https://yourdomain.com
```

Then rebuild:
```bash
cd divide-frontend-fresh
npm run build
```

### 2. Backend Configuration

Make sure your backend (server.js) has the correct CORS settings for your production domain:

```javascript
// In server.js, update the CORS origin:
cors: {
  origin: "https://yourdomain.com",  // Your production frontend URL
  credentials: true
}
```

### 3. Deploy Frontend (Static Files)

The `divide-frontend-fresh/dist/` folder contains all static files. Deploy these to:

**Option A: Vercel / Netlify / Cloudflare Pages**
- Connect your GitHub repo
- Set build command: `cd divide-frontend-fresh && npm run build`
- Set output directory: `divide-frontend-fresh/dist`
- Add environment variable: `VITE_API_URL=https://your-backend-domain.com`

**Option B: Traditional Web Hosting**
- Upload all files from `divide-frontend-fresh/dist/` to your web root
- Configure your web server to:
  - Serve `index.html` for all routes (SPA routing)
  - Enable gzip compression
  - Set proper cache headers

**Option C: Serve from Backend**
Your Express server can serve the static files:

```javascript
// In server.js, add after other routes:
const path = require('path');
app.use(express.static(path.join(__dirname, 'divide-frontend-fresh/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'divide-frontend-fresh/dist/index.html'));
});
```

### 4. Backend Deployment

Deploy your backend to a service that supports Node.js:

**Recommended Services:**
- Railway.app
- Render.com
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Heroku

**Environment Variables Needed:**
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=3000
NODE_ENV=production
ADMIN_CODE=your_admin_code (optional)
```

### 5. DNS Configuration

If serving frontend and backend from different domains:
- Frontend: `yourdomain.com` → Static hosting
- Backend: `api.yourdomain.com` → Node.js server

Make sure to update CORS and `VITE_API_URL` accordingly.

### 6. SSL/HTTPS

**Critical:** Both frontend and backend must use HTTPS in production for Socket.IO to work properly.

Most hosting services (Vercel, Netlify, Railway, Render) provide free SSL certificates automatically.

## 📁 Production File Structure

```
dist/
├── index.html              # Main HTML file (SPA entry)
├── assets/
│   ├── index-[hash].css   # Compiled styles
│   └── index-[hash].js    # Compiled JavaScript bundle
```

## 🔧 Nginx Configuration (if self-hosting)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    root /path/to/dist;
    index index.html;
    
    # Enable gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## ⚠️ Important Notes

1. **Update API URL**: Don't forget to change `VITE_API_URL` in `.env.production` before building
2. **Backend CORS**: Update backend's allowed origins to match your production domain
3. **MongoDB**: Use a production MongoDB instance (MongoDB Atlas recommended)
4. **JWT Secret**: Use a strong, unique secret in production
5. **Environment Variables**: Never commit sensitive credentials to git

## 🧪 Testing Production Build Locally

To test the production build before deploying:

```bash
cd divide-frontend-fresh
npm run build
npm run preview
```

This will serve the production build at `http://localhost:4173`

## 📊 Performance Optimization

The build includes:
- ✅ Minified JavaScript and CSS
- ✅ Tree-shaking (unused code removed)
- ✅ Code splitting ready
- ⚠️  Large bundle warning (864 KB) - consider lazy loading games

To improve load time, you can implement dynamic imports for games:
```javascript
const BlackjackGame = lazy(() => import('./games/blackjack/components/BlackjackGame'));
const PlinkoGame = lazy(() => import('./games/plinko/components/PlinkoGame'));
```

## 🔒 Security Checklist

- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured with specific origins (not "*")
- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB connection uses authentication
- [ ] Rate limiting enabled on backend
- [ ] Input validation on all API endpoints
- [ ] No sensitive data in frontend code
- [ ] Environment variables set correctly

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API URL is correct in Network tab
3. Check backend logs for API errors
4. Ensure MongoDB is accessible from backend server
5. Verify Socket.IO can connect (check ws:// or wss:// in Network tab)

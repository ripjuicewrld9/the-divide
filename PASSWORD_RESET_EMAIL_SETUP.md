# Password Reset Email Configuration

## Overview

The password reset system sends automated emails to users who forget their passwords. You need to configure SMTP email settings in your environment variables.

## Required Environment Variables

Add these to your Render.com environment variables (or `.env` file for local development):

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com           # Gmail SMTP server (or your provider)
SMTP_PORT=587                      # TLS port (use 465 for SSL)
SMTP_USER=your-email@gmail.com     # Your email address
SMTP_PASS=your-app-password        # App-specific password (see below)
SMTP_FROM=noreply@betbro.club      # Optional: "From" email address
```

## Gmail Setup (Recommended for Testing)

### 1. Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"

### 2. Create App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other" (name it "BetBro Server")
4. Click "Generate"
5. Copy the 16-character password
6. Use this as `SMTP_PASS` (without spaces)

### 3. Configure Environment Variables on Render

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  (your app password)
SMTP_FROM=BetBro Support <noreply@betbro.club>
```

## Alternative Email Providers

### SendGrid (Professional)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-mailgun-password
```

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Custom SMTP Server

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=smtp@yourdomain.com
SMTP_PASS=your-password
```

## How It Works

### Forgot Password Flow

1. User clicks "Forgot Password?" in login modal
2. User enters their email address
3. System generates a secure reset token (32 bytes, hashed with SHA-256)
4. Token is saved to database with 1-hour expiration
5. Email sent with reset link: `https://betbro.club/reset-password?token=xxxxx`

### Reset Password Flow

1. User clicks link in email
2. Frontend extracts token from URL
3. User enters new password (minimum 6 characters)
4. Backend validates token and expiration
5. Password is hashed with bcrypt and saved
6. Token is cleared from database
7. User is redirected to login

## Email Template

The email sent looks like this:

```html
Subject: Password Reset Request - BetBro Hi [username], You requested to reset
your password. Click the link below to create a new password: [Reset Password
Button] This link will expire in 1 hour. If you didn't request this, please
ignore this email. ───────────────────── BetBro.club - Online Gaming Platform
```

## Security Features

### ✅ Token Security

- 32-byte random token (256 bits of entropy)
- Hashed with SHA-256 before storage
- Cannot be reverse-engineered from database
- Different from JWT tokens

### ✅ Expiration

- Tokens expire after 1 hour
- Database stores expiration timestamp
- Expired tokens rejected automatically

### ✅ Single-Use Tokens

- Token cleared after successful reset
- Cannot be reused
- Old tokens invalidated on new request

### ✅ Email Enumeration Protection

- Always returns "email sent" message
- Doesn't reveal if email exists
- Prevents user enumeration attacks

### ✅ Password Requirements

- Minimum 6 characters (configurable)
- Bcrypt hashing (10 rounds)
- Password strength validation

## Testing

### Local Testing (No Email)

1. Check server logs for reset URL
2. Look for: `Password reset email sent to user@example.com`
3. Copy the reset URL from logs
4. Open in browser manually

### With Email Configured

1. Go to http://localhost:5173/forgot-password
2. Enter email address
3. Check inbox (may take 10-30 seconds)
4. Click reset link
5. Enter new password

## Troubleshooting

### Email Not Sending

**Check:**

- SMTP environment variables are set correctly
- App password is valid (no spaces)
- Gmail has 2FA enabled
- Server logs for error messages

**Common Errors:**

```
Error: Invalid login
→ Wrong username/password or app password not created

Error: self signed certificate
→ Try SMTP_PORT=465 with SSL

Error: Greeting never received
→ Check SMTP_HOST is correct
```

### Email Goes to Spam

**Solutions:**

- Use a custom domain (not Gmail)
- Add SPF records to your domain
- Use SendGrid/Mailgun for production
- Include unsubscribe link (for marketing emails)

### Token Expired

- Tokens expire after 1 hour
- Request a new reset email
- Check server time is correct

### Reset Link Doesn't Work

**Check:**

- URL has `?token=` parameter
- Token is complete (not truncated)
- Link clicked within 1 hour
- Frontend route exists: `/reset-password`

## Production Recommendations

### 1. Use Professional Email Service

Don't use personal Gmail in production:

- **SendGrid**: 100 emails/day free, scalable
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: Very cheap, reliable

### 2. Custom Domain

Set up email with your domain:

```
noreply@betbro.club
support@betbro.club
security@betbro.club
```

### 3. Email Templates

Consider using template service:

- Better HTML rendering
- Mobile-responsive designs
- Branding and logos
- Track open rates

### 4. Rate Limiting

Add rate limits to prevent abuse:

```javascript
// Example: Max 3 reset emails per hour per IP
const resetAttempts = new Map();

app.post("/api/auth/forgot-password", (req, res, next) => {
  const ip = req.ip;
  const attempts = resetAttempts.get(ip) || 0;

  if (attempts >= 3) {
    return res.status(429).json({ error: "Too many requests" });
  }

  resetAttempts.set(ip, attempts + 1);
  setTimeout(() => resetAttempts.delete(ip), 60 * 60 * 1000);
  next();
});
```

### 5. Monitoring

Track email metrics:

- Delivery rate
- Bounce rate
- Open rate (if using tracking)
- Time to click

## Files Modified

**Backend:**

- `models/User.js` - Added `resetPasswordToken` and `resetPasswordExpires`
- `server.js` - Added email transporter and reset endpoints

**Frontend:**

- `src/pages/ForgotPassword.jsx` (NEW) - Request reset email
- `src/pages/ResetPassword.jsx` (NEW) - Reset password with token
- `src/components/AuthModal.jsx` - Added "Forgot Password?" link
- `src/DesktopApp.jsx` - Added routes
- `src/MobileApp.jsx` - Added routes

## API Endpoints

### POST /api/auth/forgot-password

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "If that email exists, a reset link has been sent"
}
```

### POST /api/auth/reset-password

**Request:**

```json
{
  "token": "abc123...",
  "newPassword": "newpassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## Next Steps

1. **Set up SMTP credentials** on Render.com
2. **Test forgot password flow** end-to-end
3. **Monitor email delivery** in production
4. **Consider professional service** (SendGrid/Mailgun)
5. **Add rate limiting** to prevent abuse
6. **Customize email template** with branding

## Support

If users report issues:

1. Check if email was sent (server logs)
2. Verify token hasn't expired
3. Check spam folder
4. Generate new reset link
5. Manual password reset if needed (admin only)

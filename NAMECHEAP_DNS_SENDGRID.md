# SendGrid DNS Setup Complete ✅

Your domain **betbro.club** is now authenticated with SendGrid and ready to send emails.

## Next Step: Add SMTP Variables to Render

Go to your Render dashboard and add these environment variables to your backend service:

1. Go to https://dashboard.render.com
2. Click on your backend service (the-divide or similar)
3. Go to "Environment" tab
4. Add these 5 variables:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key-here
SMTP_FROM=noreply@betbro.club
```

**Important:** Replace `your-sendgrid-api-key-here` with your actual SendGrid API key (starts with `SG.`).

## After Adding Variables:

1. Render will automatically redeploy your backend
2. Wait ~2 minutes for deployment to complete
3. Test password reset:
   - Go to your site login page
   - Click "Forgot password?"
   - Enter a user's email address
   - Check inbox for reset email from noreply@betbro.club

## Troubleshooting

**Email not arriving?**

- Check spam folder
- Verify SMTP_PASS is correct API key
- Check Render logs for email errors
- Verify email address exists in your database

**"Invalid API key" error?**

- API key must start with `SG.`
- Copy entire key including `SG.` prefix
- No spaces before/after the key

**Email arrives but link doesn't work?**

- Verify frontend is deployed to cPanel
- Check token hasn't expired (1 hour limit)
- Clear browser cache

## Email Rate Limits

SendGrid free tier: **100 emails per day**

- Password resets
- Future marketing campaigns
- Any other system emails

Monitor usage: https://app.sendgrid.com/statistics

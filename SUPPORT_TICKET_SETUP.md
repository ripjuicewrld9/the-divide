# Support Ticket System Setup

## Overview

Users can now submit support tickets directly from the site, which are automatically sent to a Discord channel via webhook.

## Features

- ✅ Support button in header (always visible)
- ✅ Clean modal form with category selection
- ✅ Captures user info (username, user ID) if logged in
- ✅ Optional email field for responses
- ✅ Sends formatted embeds to Discord
- ✅ Works for both authenticated and guest users

## Discord Webhook Setup

### Step 1: Create a Discord Webhook

1. Go to your Discord server
2. Navigate to the channel where you want tickets to appear (e.g., `#support-tickets`)
3. Click the gear icon (Edit Channel)
4. Go to **Integrations** → **Webhooks**
5. Click **New Webhook**
6. Name it "Support Bot" (optional)
7. Click **Copy Webhook URL**

### Step 2: Add Webhook to Environment Variables

Add this line to your `.env` file in the project root:

```env
DISCORD_SUPPORT_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
```

**Important:** Replace `YOUR_WEBHOOK_URL_HERE` with the actual webhook URL you copied.

### Step 3: Restart the Server

```bash
npm start
```

## Testing

1. Click the "Support" button in the header
2. Fill out the form with test data
3. Submit the ticket
4. Check your Discord channel - you should see a formatted embed with:
   - Ticket category
   - Username (or "Guest")
   - User ID
   - Email (if provided)
   - Subject
   - Description
   - Timestamp

## Customization

### Change Embed Colors

Edit `server.js` around line 290:

```javascript
color: category === 'bug' ? 0xff0000 :        // Red for bugs
       category === 'complaint' ? 0xff9900 :  // Orange for complaints
       category === 'payment' ? 0x00ff00 :    // Green for payment
       0x3b82f6,                              // Blue for everything else
```

### Add More Categories

Edit `divide-frontend-fresh/src/components/SupportTicket.jsx` around line 13:

```javascript
const categories = [
  { value: "general", label: "General Question" },
  { value: "account", label: "Account Issue" },
  { value: "payment", label: "Payment/Withdrawal" },
  { value: "technical", label: "Technical Problem" },
  { value: "bug", label: "Bug Report" },
  { value: "complaint", label: "Complaint" },
  // Add more here:
  { value: "feature", label: "Feature Request" },
];
```

### Change Response Time Message

Edit `SupportTicket.jsx` at the bottom of the modal (line ~169):

```jsx
<p className="text-sm text-gray-400">
  📧 Our support team typically responds within 24 hours.
</p>
```

## Troubleshooting

### "Webhook not configured" message

- Make sure `DISCORD_SUPPORT_WEBHOOK_URL` is set in your `.env` file
- Restart the server after adding the variable

### Tickets not appearing in Discord

- Verify the webhook URL is correct
- Check the channel permissions (webhook must have "Send Messages" permission)
- Test the webhook manually at https://discord.com/api/webhooks/YOUR_URL with a POST request

### Server error on submit

- Check the server console for error messages
- Verify MongoDB is running and connected
- Check that all required fields are filled in the form

## Security Notes

- ⚠️ **Never commit your webhook URL to Git** - it's in `.env` which is already in `.gitignore`
- The webhook URL should be treated like a password
- If compromised, regenerate it in Discord settings
- Consider rate limiting if you get spam (Discord has built-in rate limits)

## API Endpoint

**POST** `/api/support/ticket`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**Body:**

```json
{
  "subject": "string (required, max 100 chars)",
  "category": "string (required)",
  "description": "string (required, max 1000 chars)",
  "email": "string (optional)"
}
```

**Response:**

```json
{
  "message": "Ticket submitted successfully!",
  "ticketId": "unique_id"
}
```

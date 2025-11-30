# Marketing Email Collection System

## Overview
Users can now opt-in to receive promotional emails during signup. Admins can easily export the email list for marketing campaigns.

## What Was Implemented

### 1. User Model Updates (`models/User.js`)
Added two new fields:
- `marketingConsent: Boolean` - Whether user agreed to receive marketing emails
- `marketingConsentDate: Date` - When they gave consent (for legal compliance)

### 2. Registration Form (`divide-frontend-fresh/src/components/AuthModal.jsx`)
Added optional checkbox during signup:
```
☐ I agree to receive promotional emails about new features, bonuses, and exclusive offers. 
  You can unsubscribe at any time.
```

### 3. Backend Registration (`server.js`)
Updated `/register` endpoint to:
- Accept `marketingConsent` parameter
- Store consent timestamp when user opts in
- Save both fields to database

### 4. Admin Email Export (`server.js`)
New endpoint: `GET /api/admin/marketing-emails` (admin only)
- Exports all users who opted in to marketing emails
- Returns CSV file with columns:
  - Username
  - Email
  - Consent Date (when they checked the box)
  - Registered Date (account creation)
- Sorted by most recent consent first

### 5. Admin Panel Button (`divide-frontend-fresh/src/components/Admin.jsx`)
Added "📧 Export Emails" button:
- One-click download of marketing email list
- Downloads as `marketing-emails.csv`
- Only visible to admin users
- Located in top navigation bar next to Finance/Ledger/Items/Cases links

## How to Use (Admin)

1. Log in as admin user
2. Go to Admin Panel (`/admin`)
3. Click "📧 Export Emails" button in top right
4. CSV file automatically downloads with all opted-in users
5. Use the CSV with your email marketing platform (Mailchimp, SendGrid, etc.)

## Legal Compliance

### What's Covered
✅ Explicit opt-in checkbox (not pre-checked)
✅ Clear description of what emails they'll receive
✅ Timestamp of consent stored in database
✅ Option to unsubscribe mentioned in checkbox text

### What You Still Need
- Add actual unsubscribe mechanism (preference page or email link)
- Update Terms of Service to mention email marketing
- Add privacy policy explaining data usage
- Include unsubscribe link in all marketing emails
- Consider adding GDPR compliance if you have EU users

## CSV Format Example
```csv
Username,Email,Consent Date,Registered Date
player123,player@example.com,2025-11-29T12:34:56.789Z,2025-11-29T12:34:56.789Z
gambler456,gamer@test.com,2025-11-28T10:20:30.000Z,2025-11-28T10:20:30.000Z
```

## Technical Details

### Database Query
```javascript
User.find({
  marketingConsent: true,
  email: { $exists: true, $ne: '' }
})
.select('username email marketingConsentDate createdAt')
```

### Frontend Integration
- Checkbox is only shown during registration (not login)
- Default state: `unchecked` (user must actively opt-in)
- Passes `marketingConsent: true/false` to backend

### Security
- Admin-only endpoint (requires `auth` + `adminOnly` middleware)
- No personal data exposed beyond email/username
- CSV download doesn't expose passwords or sensitive info

## Next Steps (Recommended)

1. **Add Unsubscribe Feature**
   - User settings page with "Marketing Emails" toggle
   - Update User model when they opt-out
   - Endpoint: `PATCH /api/user/marketing-preference`

2. **Update Legal Documents**
   - Add to Terms of Service
   - Create Privacy Policy
   - Add to registration flow

3. **Email Template System**
   - Create email templates with unsubscribe links
   - Track email opens/clicks (optional)
   - Integration with SendGrid/Mailchimp/etc.

4. **GDPR Compliance (if needed)**
   - Add "Right to be Forgotten" feature
   - Data export for users
   - Cookie consent if tracking emails

## Files Modified

Backend:
- `models/User.js` - Added marketingConsent fields
- `server.js` - Updated /register and added /api/admin/marketing-emails

Frontend:
- `divide-frontend-fresh/src/components/AuthModal.jsx` - Added checkbox
- `divide-frontend-fresh/src/context/AuthContext.jsx` - Updated register function
- `divide-frontend-fresh/src/components/Admin.jsx` - Added export button

## Testing Checklist

- [ ] Register new user WITH marketing consent checked
- [ ] Register new user WITHOUT marketing consent checked
- [ ] Verify marketingConsent=true saved in database
- [ ] Verify marketingConsentDate timestamp is set
- [ ] Admin can download CSV file
- [ ] CSV contains only opted-in users
- [ ] CSV has correct columns and data
- [ ] Non-admin users cannot access /api/admin/marketing-emails

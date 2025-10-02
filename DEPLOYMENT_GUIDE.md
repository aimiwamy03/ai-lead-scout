# Deployment Guide - Vercel

## Quick Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
cd /Users/rienespecial/Dealops
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Choose your account
- Link to existing project? **No**
- Project name? **dealops** (or your choice)
- Directory? **.**
- Override settings? **No**

### 4. Add Environment Variables

After deployment, add your env vars to Vercel:

```bash
# Add each env var to Vercel
vercel env add AIRTABLE_PAT
vercel env add AIRTABLE_BASE_ID
vercel env add SLACK_WEBHOOK_URL
vercel env add OPENAI_API_KEY
# ... add all other env vars from your .env file
```

Or use the Vercel Dashboard:
1. Go to vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add all variables from your `.env` file

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

### 6. Your Production URL
After deployment, Vercel gives you a URL like:
`https://dealops-abc123.vercel.app`

This URL will automatically be available as `VERCEL_URL` in your app!

## Testing

Once deployed:
1. Test the discover endpoint:
```bash
curl -X POST https://your-vercel-url.vercel.app/api/discover \
  -H "Content-Type: application/json" \
  -d '{"limit": 1, "categories": "Payments"}'
```

2. Check Slack for notification
3. Click "Approve & Send" - should now work!

## Automatic Deployments

Every push to your main branch will automatically deploy to Vercel!


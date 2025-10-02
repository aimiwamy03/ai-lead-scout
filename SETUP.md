# Quick Setup Guide

## Step-by-Step Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js & React
- TypeScript
- SendGrid
- RSS Parser
- Axios
- Robots Parser
- Jest (for testing)

### 2. Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Then fill in your credentials in `.env`:

#### Airtable Setup

1. Go to [Airtable](https://airtable.com)
2. Create a new base or use existing
3. Create three tables: `Leads`, `Drafts`, `Actions` (see README.md for field structure)
4. Get your Personal Access Token (PAT) from Account > Developer Hub
5. Get your Base ID from the URL: `airtable.com/[BASE_ID]/...`

Add to `.env`:
```
AIRTABLE_PAT=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

#### Slack Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app or use existing
3. Enable Incoming Webhooks
4. Create a webhook for your channel (e.g., `#demo-intel`)
5. Copy the webhook URL

Add to `.env`:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXX/XXXXX/XXXXX
```

#### SendGrid Setup

1. Go to [SendGrid](https://sendgrid.com)
2. Create account if needed
3. Go to Settings > API Keys
4. Create a new API key with "Mail Send" permissions
5. Verify a sender email in Settings > Sender Authentication

Add to `.env`:
```
SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXXXXXXXX
SEND_FROM_EMAIL=your-verified-email@domain.com
```

#### Calendly Setup

1. Get your Calendly link (e.g., from your Calendly dashboard)

Add to `.env`:
```
CALENDLY_LINK=https://calendly.com/your-name/intro-call
```

#### Optional: Test Email

For testing, you can add a test email recipient:

```
TEST_EMAIL=your-test-email@domain.com
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the app.

### 4. Test Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/healthz
```

Expected: `{"ok":true}`

**Test Ingestion (careful - will fetch real data):**
```bash
curl -X POST http://localhost:3000/api/ingest
```

This will:
- Fetch funding news from configured sources
- Score leads
- Create records in Airtable
- Send Slack notifications for Tier-1 leads

### 5. Run Tests

```bash
npm test
```

This runs the unit tests for the scoring logic.

### 6. Deploy to Vercel

1. Push code to GitHub/GitLab
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

The cron job defined in `vercel.json` will automatically run ingestion twice daily.

## Troubleshooting

### "Cannot find module" errors

Run `npm install` to install dependencies.

### Airtable errors

- Verify your PAT has access to the base
- Check that table names match exactly (case-sensitive)
- Ensure all required fields exist in your tables

### Slack not receiving messages

- Check webhook URL is correct
- Verify channel permissions
- Check Slack app is installed in workspace

### SendGrid errors

- Verify API key has Mail Send permission
- Ensure sender email is verified
- Check SendGrid account is active

### GDELT/RSS feed errors

These are expected if feeds are temporarily unavailable. The system will continue with available data.

## Next Steps

1. **Configure Airtable Views**: Create custom views for Tier-1 Queue, Approved, Emailed
2. **Customize Email Template**: Edit `src/lib/message.ts` to customize email content
3. **Adjust Scoring**: Modify weights in `src/lib/score.ts` based on your criteria
4. **Add More Sources**: Add additional RSS/news sources in `src/lib/fetchers.ts`

## Support

For issues, check:
- README.md for detailed documentation
- Airtable field names match exactly
- Environment variables are set correctly
- All dependencies are installed


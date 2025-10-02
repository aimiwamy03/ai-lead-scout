# Dealops Scout - AI Lead Discovery & Scoring

An automated B2B SaaS lead generation system that discovers, scores, and qualifies prospects for DealOps (deal desk automation platform). Uses AI to evaluate companies based on pricing complexity, ability to pay, and deal ops relevance.

## 🎯 What It Does

```
Lead Discovery (Automated)
    ↓
AI Scoring & Contact Finding (Automated)
    ↓
Airtable Population (Automated)
    ↓
Manual Review & Outreach (You + Airtable AI)
```

## ✨ Features

- **3 Discovery Methods**: Curated list (100 companies), Natural language search, RSS news feeds
- **AI-Powered Scoring**: GPT-4 analyzes complexity, ability to pay, and opportunity fit
- **Automatic Tiering**: Tier-1 (best), Tier-2 (good), Backlog (future)
- **Contact Finding**: Auto-discovers CFO/VP Finance contacts with email addresses
- **Airtable Integration**: Populates Leads, Drafts, and Actions tables
- **Interactive UI**: Real-time streaming discovery at localhost:3000

## 🏗️ Architecture

- **Framework**: Next.js 13 with TypeScript
- **AI**: OpenAI GPT-4 for scoring and contact research
- **Database**: Airtable (Leads, Drafts, Actions tables)
- **Notifications**: Slack webhooks (optional)
- **Email**: Manual or via Airtable AI

## 📊 Current Status

**100 Companies Loaded:**
- 🥇 65 Tier-1 companies (Stripe, Snowflake, Databricks, HubSpot, etc.)
- 🥈 22 Tier-2 companies (Mixpanel, Retool, Hightouch, etc.)
- 📦 12 Backlog companies (Linear, Railway, Chameleon, etc.)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `env-template.txt` to `.env` and fill in:

```bash
# Required
AIRTABLE_PAT=your_airtable_token
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_LEADS=Leads
AIRTABLE_TABLE_DRAFTS=Drafts
AIRTABLE_TABLE_ACTIONS=Actions

# Optional (for AI scoring & contact finding)
OPENAI_API_KEY=your_openai_key

# Optional (for Slack notifications)
SLACK_WEBHOOK_URL=your_slack_webhook

# Optional
CALENDLY_LINK=your_calendly_link
```

### 3. Set Up Airtable

Create a base with three tables:

**Leads Table:**
- Company (text)
- Website (URL)
- Contact Name (text)
- Contact Title (text)
- Contact Email (email)
- Industry (select: AI/ML, Fintech, Data/Analytics, etc.)
- Source Title (text)
- Source URL (URL) - **Unique identifier**
- Top Signals (long text)
- Complexity Score (number 0-5)
- WTP Index (number 0-5)
- Opportunity Score (number 0-10)
- Tier (select: Tier-1, Tier-2, Backlog)
- Status (select: Draft, Ready for Review, Sent, Booked)
- Calendly Link (URL)

**Drafts Table (Optional):**
- Lead (link to Leads)
- Email Subject (text)
- Email Body (long text)
- DM Body (long text)
- PRD Notes (long text)
- Approved? (checkbox)

**Actions Table (Optional):**
- Lead (link to Leads)
- Action (select: Posted to Slack, Approved, Sent Email, etc.)
- Notes (long text)
- Timestamp (created time)

### 4. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

## 📖 Usage

### Discovery Methods

**1. Curated List (Fastest)**
```bash
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

**2. Natural Language Search**
- Go to http://localhost:3000
- Click "Natural Language" tab
- Type: "Find fintech companies with complex pricing"
- Watch results stream in!

**3. News & Funding**
- Go to http://localhost:3000
- Click "News & Funding" tab
- Discovers companies from Crunchbase/TechCrunch RSS feeds

### Review in Airtable

1. Open your Leads table
2. Filter by Tier-1 (highest priority)
3. Review Top Signals for each company
4. Check auto-populated Contact Name/Email
5. Use Airtable AI to generate personalized emails
6. Send manually when ready

## 🧮 Scoring System

### Complexity Score (0-5)
How complex is their pricing?
- 5: Extremely complex (usage-based, multi-SKU, enterprise custom)
- 4: Very complex (tiered with add-ons)
- 3: Moderate (3+ pricing tiers)
- 2: Simple (2-3 plans)
- 1: Basic (single plan or freemium)

### WTP Index (0-5)
Can they afford DealOps?
- Based on funding, employee count, and revenue signals
- 5: $500M+ funding, 1000+ employees
- 4: $100M+ funding, 500+ employees
- 3: $50M+ funding, 200+ employees
- 2: $20M+ funding, 100+ employees
- 1: <$20M funding, <100 employees

### Opportunity Score (0-10)
How relevant are they to DealOps?
- Combines complexity, ability to pay, and industry fit
- 9-10: Perfect fit (Stripe, Snowflake)
- 7-8: Strong fit (most SaaS companies)
- 5-6: Moderate fit (smaller companies)
- <5: Weak fit

### Tiers
- **Tier-1**: Opportunity ≥8, WTP ≥4, Complexity ≥4
- **Tier-2**: Opportunity ≥6, decent WTP/Complexity
- **Backlog**: Everything else

## 🛠️ Useful Scripts

**Fix existing scores:**
```bash
node fix-existing-scores.js
```

**Health check:**
```bash
curl http://localhost:3000/api/healthz
```

## 📁 Project Structure

```
/src
  /lib
    airtable.ts          # Airtable CRUD operations
    discover.ts          # Curated company list (100 companies)
    llm-analyzer.ts      # AI scoring with GPT-4
    contact-finder.ts    # Auto-find CFO contacts
    message.ts           # Slack/email templates
    send.ts              # Email & Slack sending
  /pages
    /api
      discover.ts        # Main discovery endpoint
      discover-natural.ts # Natural language search
      discover-news.ts   # RSS feed discovery
      approve.ts         # Draft creation endpoint
    index.tsx            # Interactive UI
  /types
    index.ts             # TypeScript interfaces
```

## 📚 Documentation

- `SETUP.md` - Detailed setup guide
- `CONTACT_FINDER_GUIDE.md` - How contact finding works
- `ACTIONS_TABLE_GUIDE.md` - Activity logging guide
- `AI_EMAIL_QUICKSTART.md` - Email generation guide
- `RSS_FEEDS.md` - News feed configuration

## 🎯 Recommended Workflow

### Week 1: Tier-1 Blitz
1. Filter Airtable for Tier-1 companies
2. Start with Opportunity Score 9.5+
3. Use Airtable AI to generate emails
4. Send 5-10 per day
5. Track responses

### Ongoing
- Weekly: Run natural language discovery for new niches
- Monthly: Run news discovery for funded companies
- Quarterly: Review Backlog for growth signals

## 🔒 Guardrails

- Human review before any outreach
- Contact info are educated guesses (verify before sending)
- Rate-limited API calls (200ms between requests)
- Idempotent upserts (no duplicates)
- All scores logged to Airtable

## 🧪 Testing

```bash
npm test
```

## 📈 Success Metrics

Track in Airtable:
- Emails sent (Status = "Sent")
- Response rate (manual tracking)
- Meetings booked (Status = "Booked")
- Best performing industries
- Tier-1 vs Tier-2 conversion rates

## 🚢 Deployment

### Vercel (Recommended)
```bash
npx vercel
```

Add environment variables in Vercel dashboard.

### Local Testing with ngrok
```bash
./setup-ngrok.sh
```

## 💡 Pro Tips

1. Always verify AI-generated contacts before sending
2. Customize Top Signals with your own insights
3. Use Airtable Views for custom filters
4. Track responses to refine messaging
5. Focus on Tier-1 first for highest ROI

## 🎉 What You Built

A full-stack B2B lead generation system with:
- ✅ Next.js/TypeScript API
- ✅ OpenAI GPT-4 integration
- ✅ Airtable as CRM
- ✅ Multi-source discovery
- ✅ Intelligent contact finding
- ✅ Real-time streaming UI
- ✅ Automated scoring and tiering

## 📞 Support

Questions? Check the guides in the repo or review the well-commented code!

---

**Built to help DealOps close more deals faster.** 🚀

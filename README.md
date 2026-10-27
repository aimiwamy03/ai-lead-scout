# AI Lead Scout

An automated B2B SaaS lead discovery and scoring system that finds companies with complex pricing models, uses GPT-4 to score them on pricing complexity and ability to pay, discovers finance decision-maker contacts, and populates Airtable for review and outreach. Designed for targeting companies with complex, sales-led pricing that would benefit from deal desk tooling.

## What It Does

```
Lead Discovery (RSS feeds, natural language search, or curated list)
    ↓
AI Scoring & Contact Finding (GPT-4 analyzes pricing, finds CFO/VP Finance contacts)
    ↓
Airtable Population (Leads, Drafts, Actions tables)
    ↓
Manual Review & Outreach (Review scores, send personalized emails)
```

## Features

- **Multi-source discovery**: Curated company list, natural language search, or RSS news feeds (Crunchbase, TechCrunch)
- **AI-powered scoring**: GPT-4 analyzes pricing complexity (0-10), ability to pay (0-10), and overall opportunity fit
- **Automatic tiering**: Tier-1 (best prospects), Tier-2 (good prospects), Backlog (future follow-up)
- **Contact finding**: Automatically discovers CFO and VP Finance contacts with email addresses
- **Airtable integration**: Populates structured Leads, Drafts, and Actions tables
- **Real-time streaming UI**: Watch discovery and scoring happen live at localhost:3000
- **Slack notifications**: Optional webhooks for new Tier-1 leads

## Tech Stack

- **Framework**: Next.js 13 with TypeScript
- **AI**: OpenAI GPT-4 for complexity analysis and scoring
- **Database**: Airtable (Leads, Drafts, Actions tables)
- **Email**: SendGrid (optional)
- **Automation**: n8n workflows (optional)
- **Notifications**: Slack webhooks (optional)

## How Scoring Works

### Complexity Score (0-10)

Evaluates pricing and product complexity based on:
- Pricing model signals (usage-based, tiered, enterprise custom pricing)
- Product surface (number of modules, SKUs, or pricing plans)
- Organizational signals (RevOps, pricing, or deal desk job postings)
- Compliance requirements (SOC2, GDPR, HIPAA keywords)
- Technology stack complexity

Higher scores indicate more complex pricing that requires sophisticated quoting and deal management.

### Ability to Pay (WTP Index, 0-10)

Evaluates capacity to afford deal desk tooling based on:
- Funding stage and amount (Series A/B companies in the $10M-$60M range score well)
- Investor quality (top-tier VCs like Sequoia, a16z, Index)
- Hiring signals (RevOps, pricing, or sales operations roles)
- Recent security milestones (SOC2, ISO certifications)
- Enterprise motion keywords (custom contracts, MSA, security reviews)

### Opportunity Score (0-10)

Weighted combination: `(0.6 × Complexity) + (0.4 × WTP)`

This formula prioritizes pricing complexity while ensuring the company can afford the solution.

### Tiers

- **Tier-1**: Opportunity ≥ 7.5 (highest priority, best fit)
- **Tier-2**: Opportunity ≥ 5.0 (good prospects)
- **Backlog**: Opportunity < 5.0 (revisit later)

The scoring logic is deterministic and documented in `src/lib/score.ts` and `src/lib/llm-analyzer.ts`.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `env-template.txt` to `.env.local` and fill in your API keys:

```bash
# Required
AIRTABLE_PAT=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_LEADS=Leads
AIRTABLE_TABLE_DRAFTS=Drafts
AIRTABLE_TABLE_ACTIONS=Actions

# Required for AI scoring and contact finding
OPENAI_API_KEY=

# Optional
SLACK_WEBHOOK_URL=
SENDGRID_API_KEY=
SEND_FROM_EMAIL=
CALENDLY_LINK=
```

### 3. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 4. Usage

The web UI provides three discovery modes:
- **Curated List**: Fastest way to discover 100+ pre-selected B2B SaaS companies
- **Natural Language**: Describe your ideal customer profile (e.g. "fintech companies with usage-based pricing")
- **News & Funding**: Discover newly funded companies from RSS feeds

Results stream in real-time with scores, reasoning, and contact information populated directly to Airtable.

## Project Structure

```
/src
  /lib
    score.ts              # Deterministic scoring logic
    llm-analyzer.ts       # GPT-4 complexity analysis
    discover.ts           # Curated company list
    contact-finder.ts     # CFO/VP Finance contact discovery
    airtable.ts           # Airtable CRUD operations
    message.ts            # Slack/email templates
    send.ts               # Notification sending
  /pages
    index.tsx             # Interactive discovery UI
    /api
      discover.ts         # Main discovery endpoint
      discover-natural.ts # Natural language search
      discover-news.ts    # RSS feed discovery
      approve.ts          # Draft creation
      healthz.ts          # Health check
  /types
    index.ts              # TypeScript interfaces
  /__tests__
    score.test.ts         # Scoring tests
```

## Tests

Run the test suite:

```bash
npm test
```

## More Documentation

- [SETUP.md](SETUP.md) - Detailed Airtable setup guide
- [CONTACT_FINDER_GUIDE.md](CONTACT_FINDER_GUIDE.md) - How contact discovery works
- [ACTIONS_TABLE_GUIDE.md](ACTIONS_TABLE_GUIDE.md) - Activity logging guide
- [AI_EMAIL_QUICKSTART.md](AI_EMAIL_QUICKSTART.md) - Email generation with Airtable AI
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deploy to Vercel
- [N8N_QUICK_SETUP.md](N8N_QUICK_SETUP.md) - Workflow automation setup
- [RSS_FEEDS.md](RSS_FEEDS.md) - RSS feed configuration
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architecture overview

## Guardrails

- All contacts are AI-generated guesses and should be verified before outreach
- Human review required before sending any emails
- Rate-limited API calls (500ms between OpenAI requests)
- Idempotent upserts prevent duplicate Airtable records
- All scores and reasoning logged to Airtable for transparency

---

Built with Next.js, TypeScript, OpenAI, and Airtable.

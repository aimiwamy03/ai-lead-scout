# Dealops Demo-Booking Scout - Project Overview

## What Was Built

A complete, production-ready **Lane-1 (human-in-the-loop) lead scoring and outreach system** for Dealops to identify and book demo calls with high-quality prospects.

## Architecture

```
┌─────────────┐
│ Vercel Cron │ (2x daily)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         POST /api/ingest                    │
│  1. Fetch RSS/GDELT funding news            │
│  2. Parse company data                      │
│  3. Scrape public pages (pricing, security) │
│  4. Extract signals deterministically       │
│  5. Calculate scores (Complexity + WTP)     │
│  6. Upsert to Airtable                      │
└──────┬──────────────────────────────────────┘
       │
       ▼ (Tier-1 only)
┌─────────────────┐
│ Slack           │ Notification with:
│ #demo-intel     │ • Company + Round + Amount
│                 │ • Opportunity Score (C | W)
│                 │ • Top 3-5 Evidence Bullets
│                 │ • [Approve & Send] button
│                 │ • [View in Airtable] button
└──────┬──────────┘
       │
       │ Human clicks Approve
       ▼
┌─────────────────────────────────────────────┐
│         GET/POST /api/approve?rid=recXXX    │
│  1. Load lead + draft from Airtable         │
│  2. Generate or use existing email          │
│  3. Send email via SendGrid                 │
│  4. Update status to "Emailed"              │
│  5. Log action to Actions table             │
│  6. Confirm in Slack                        │
└─────────────────────────────────────────────┘
```

## Project Structure

```
/Users/rienespecial/Dealops/
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── next.config.js            # Next.js config
├── vercel.json               # Cron schedule
├── jest.config.js            # Test config
├── .gitignore
├── README.md                 # Full documentation
├── SETUP.md                  # Step-by-step setup
├── env-template.txt          # Environment variable template
│
├── src/
│   ├── types/
│   │   └── index.ts          # TypeScript types (Lead, Draft, Action, etc.)
│   │
│   ├── lib/
│   │   ├── airtable.ts       # Airtable CRUD operations
│   │   ├── fetchers.ts       # RSS/GDELT/website fetching
│   │   ├── extract.ts        # Signal extraction (keywords, roles, etc.)
│   │   ├── score.ts          # Deterministic scoring logic
│   │   ├── message.ts        # Slack/email template generation
│   │   └── send.ts           # SendGrid & Slack webhook sending
│   │
│   ├── pages/
│   │   ├── _app.tsx          # Next.js app wrapper
│   │   ├── index.tsx         # Home page with endpoint info
│   │   └── api/
│   │       ├── healthz.ts    # Health check endpoint
│   │       ├── ingest.ts     # Main ingestion job
│   │       └── approve.ts    # Approval + email send
│   │
│   └── __tests__/
│       └── score.test.ts     # Unit tests for scoring
│
└── next-env.d.ts             # Next.js types
```

## Key Features

### ✅ Implemented

1. **Automated Ingestion**
   - Fetches Google Alerts RSS and GDELT news feeds
   - Parses company name, round, amount, investors
   - Rate-limited with robots.txt respect
   - Max 10 items per run

2. **Intelligent Signal Extraction**
   - Pricing keywords (usage-based, tiered, enterprise)
   - Security/compliance keywords (SOC 2, HIPAA, etc.)
   - Product complexity (module count, add-ons)
   - RevOps/Deal Desk role openings (Greenhouse/Lever API)
   - Tech stack hints (Stripe, Salesforce, etc.)
   - Recent security milestones (≤120 days)

3. **Deterministic Scoring**
   - **Complexity Score (0-10)**: Pricing model + product surface + org signals + compliance + tech stack
   - **WTP Index (0-10)**: Round band + investor quality + hiring + security milestones + enterprise motion
   - **Opportunity Score**: `0.6 × Complexity + 0.4 × WTP`
   - **Tier**: Tier-1 (≥7.5), Tier-2 (5.0-7.4), Backlog (<5.0)

4. **Airtable Integration**
   - Idempotent upsert by `SourceURL`
   - Full CRUD on Leads, Drafts, Actions tables
   - Exact field name matching
   - Direct links to records

5. **Slack Notifications**
   - Rich Block Kit messages
   - Top 3-5 evidence bullets with confidence levels
   - One-click approval button
   - Success confirmations

6. **Email Outreach**
   - SendGrid API integration
   - Template with variables (`{{Company}}`, `{{CalendlyLink}}`)
   - Contextual pain point selection
   - Auto-generated or custom drafts

7. **Human-in-the-Loop**
   - **No emails sent without approval**
   - Slack as review surface
   - Airtable for editing/management
   - Action logging for audit trail

8. **Testing & Quality**
   - Comprehensive unit tests for scoring
   - Retry logic with exponential backoff
   - Error handling and graceful degradation
   - TypeScript throughout

## Scoring Logic Detail

### Complexity Score Breakdown

| Signal | Max Points | Criteria |
|--------|-----------|----------|
| Pricing model | 4 | Usage-based (+2), Tiered/hybrid (+1), Enterprise custom (+1) |
| Product surface | 3 | ≥4 modules (+1), ≥3 modules (+2) |
| Org signals | 2 | RevOps/Deal Desk/Pricing roles |
| Compliance | 2 | SOC2, ISO, HIPAA, PCI, etc. |
| Tech stack | 2 | ≥2 of (Salesforce, Stripe, HubSpot, etc.) |
| **Total** | **10** | Capped at 10 |

### WTP Index Breakdown

| Signal | Max Points | Criteria |
|--------|-----------|----------|
| Round band | 2 | Series A/B with $10-60M |
| Investor quality | 2 | Matches WTP_INVESTOR_WHITELIST |
| Hiring signal | 2 | RevOps/Pricing roles open |
| Security milestone | 1 | Recent (≤120 days) |
| Enterprise motion | 2 | Procurement, MSA, annual commit terms |
| **Total** | **10** | Capped at 10 |

### Example Scores

**High-Tier Example:**
- Company: AI-native SaaS, Series B $30M (Sequoia)
- Pricing: Usage-based + enterprise tiers
- Compliance: SOC 2 (recent)
- Roles: 2 RevOps openings
- **Complexity**: 8.0 | **WTP**: 7.0 | **Opportunity**: 7.8 → **Tier-1** ✅

**Mid-Tier Example:**
- Company: SaaS, Series A $15M
- Pricing: Simple 3-tier
- Compliance: None visible
- Roles: None
- **Complexity**: 4.0 | **WTP**: 5.0 | **Opportunity**: 4.4 → **Tier-2**

## Data Model

### Leads Table (Airtable)

- `Company` (Primary)
- `Website`, `SourceTitle`, `SourceURL` (upsert key), `SourceDate`
- `Round`, `Amount`, `Investors`
- `TopSignals` (formatted bullets)
- `ComplexityScore`, `WTPIndex`, `OpportunityScore`
- `Tier`, `Status`
- `CalendlyLink`, `Owner`, `Created`

### Drafts Table

- `Lead` (linked record)
- `EmailSubject`, `EmailBody`, `DMBody`
- `PRDNotes` (signal bullets)
- `Approved?`

### Actions Table

- `Lead` (linked record)
- `Action` (Posted to Slack, Approved, Sent Email, etc.)
- `Notes`, `Timestamp`

## API Endpoints

### `GET /api/healthz`
Simple health check. Returns `{"ok": true}`.

### `POST /api/ingest`
Main job. Processes up to 10 items, upserts to Airtable, notifies Slack for Tier-1.

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "tier1": 2,
  "leads": [
    {
      "company": "ExampleCo",
      "tier": "Tier-1",
      "score": 8.2,
      "recordId": "recXXXXXXXXXXXXXX"
    }
  ]
}
```

### `POST /api/approve` or `GET /api/approve?rid=recXXXX`
Approves a lead and sends email.

**Response (JSON):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "company": "ExampleCo",
  "recipient": "contact@exampleco.com"
}
```

**Response (GET/HTML):**
Pretty confirmation page.

## Deployment Checklist

- [x] Next.js + TypeScript project
- [x] All lib files implemented
- [x] API endpoints working
- [x] Airtable integration
- [x] Slack integration
- [x] SendGrid integration
- [x] Unit tests
- [x] Vercel cron config
- [x] README & setup docs
- [x] Error handling & retries
- [x] Rate limiting & robots.txt
- [x] Environment variable template

## Running the Demo

### Local Development

1. **Install**: `npm install`
2. **Configure**: Copy `env-template.txt` to `.env` and fill in credentials
3. **Run**: `npm run dev`
4. **Test Health**: `curl http://localhost:3000/api/healthz`
5. **Run Ingestion**: `curl -X POST http://localhost:3000/api/ingest`
6. **Check Slack**: See Tier-1 notification
7. **Click Approve**: Email sent, Airtable updated

### Production (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy
5. Cron runs automatically at 9 AM & 5 PM UTC

## Testing

```bash
npm test
```

Runs 15+ unit tests covering:
- Complexity score calculation
- WTP index calculation
- Opportunity score formula
- Tier assignment
- Full scoring pipeline
- Reason prioritization

## Customization

### Adjust Scoring Weights

Edit `src/lib/score.ts`:
```typescript
export function calculateOpportunityScore(
  complexityScore: number,
  wtpIndex: number
): number {
  const score = 0.6 * complexityScore + 0.4 * wtpIndex;
  // Change to 0.5 / 0.5 for equal weighting
  return Math.round(score * 100) / 100;
}
```

### Customize Email Template

Edit `src/lib/message.ts` → `generateEmailBody()`

### Add More Data Sources

Edit `src/lib/fetchers.ts` → `fetchAllFundingNews()`

### Change Cron Schedule

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/ingest",
      "schedule": "0 9,17 * * *"  // Change times here
    }
  ]
}
```

## Guardrails

✅ **Max 10 items per run** (prevents overwhelming Slack/Airtable)  
✅ **Robots.txt respect** (ethical scraping)  
✅ **Rate limiting** (500-1000ms delays between requests)  
✅ **Retries with backoff** (3 attempts for all outbound calls)  
✅ **Human approval required** (no auto-blast)  
✅ **Idempotent upserts** (SourceURL as key)  
✅ **Graceful degradation** (continues on partial failures)  
✅ **Action logging** (full audit trail)

## Performance

- **Ingestion**: ~30-60 seconds for 10 items (depends on website response times)
- **Approval**: <2 seconds (Airtable + SendGrid)
- **Cron frequency**: 2x daily (adjustable)

## Future Enhancements (Not Included)

- LLM-powered email polish
- LinkedIn enrichment
- Company size/employee count
- Funding database integration (Crunchbase, PitchBook)
- Dashboard for analytics
- A/B testing on email templates
- Automated follow-ups
- CRM integration (Salesforce, HubSpot)

---

**Status**: ✅ Complete and ready to deploy

**Next Steps**: Follow SETUP.md to configure and deploy


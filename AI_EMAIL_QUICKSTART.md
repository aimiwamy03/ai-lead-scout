# 🤖 AI Email Quick Start

## ✅ What I Just Built

You now have **AI-powered personalized email generation** integrated into your Dealops system!

### How It Works:

```
You → Click Button in Airtable 
  → AI (GPT-4) analyzes company (complexity, category, scale)
  → AI writes personalized 150-200 word email
  → Sends via SendGrid with Calendly link
  → Updates Airtable status: Draft → Contacted
```

---

## 🚀 Quick Test (5 minutes)

### Step 1: Get a Record ID

1. Open your Airtable: https://airtable.com
2. Go to your **Leads** table
3. Click on any **Tier-1** lead (like Outreach, Stripe, or HubSpot)
4. Copy the **Record ID** from the URL (starts with `rec`)
   - Example: `recXyz123ABC456`

### Step 2: Send Test Email

Run this in your terminal:

```bash
./test-ai-email.sh
```

It will ask for the Record ID, then:
- ✅ Generates AI-personalized email
- ✅ Sends to your TEST_EMAIL
- ✅ Updates Airtable status

**Expected time: ~10 seconds**

### Step 3: Check Results

1. **Check your email** (the one in `.env` TEST_EMAIL)
   - Should see a personalized email about the company
   - Should mention their specific complexity/scale
   - Should include Calendly link

2. **Check Airtable**
   - Lead status changed to "Contacted"
   - Company record shows email was sent

---

## 📧 What the AI Generates

The AI customizes emails based on:

✅ **Company complexity** (1-5 scale)
✅ **Company category** (Sales, Data, Security, etc.)
✅ **Team size** (50, 200, 1000+ employees)
✅ **Funding level** ($10M, $100M, $500M+)
✅ **Opportunity score** (fit for Dealops)

### Example: High Complexity Company (Stripe)

**Subject:** `Automating deal desk workflows at Stripe`

**Body:**
> Hi Stripe team,
>
> At your scale with multiple products and complex pricing models, 
> managing custom quotes and enterprise deals must be incredibly time-consuming.
>
> Dealops automates your entire deal desk—quote generation, approval routing, 
> discount management—so your sales team can focus on closing instead of 
> manual processes. Teams typically save 10+ hours/week.
>
> Quick 15-min call to explore fit?
>
> [Calendly Link]

### Example: Mid Complexity (ClickUp)

**Subject:** `Deal desk automation for ClickUp`

**Body:**
> Hi ClickUp team,
>
> As you scale in the productivity space, maintaining pricing consistency 
> and streamlining quote approvals becomes crucial.
>
> Dealops helps fast-growing companies like yours automate approval workflows, 
> generate quotes instantly, and enforce pricing rules—so your sales team 
> can move faster.
>
> 15 minutes to discuss?
>
> [Calendly Link]

---

## 🔘 Setting Up the Airtable Button

### Option 1: Simple Button (Recommended)

1. Open Airtable → **Leads** table
2. Add new field → **Button**
3. Name: `Send Email`
4. Label: `📧 Send AI Email`
5. Action: **Open URL**
6. URL: `http://localhost:3000/api/approve?rid={recordId}`
7. ✅ Check "Open in new tab"
8. Save

**Now you can click the button on any lead to send!**

### Option 2: Automation (Bulk Sending)

See [AIRTABLE_BUTTON_SETUP.md](./AIRTABLE_BUTTON_SETUP.md) for full automation guide.

---

## 🎯 Usage Workflow

### Daily Workflow:

1. **Morning**: Check Airtable for new Tier-1 leads
2. **Review**: Visit their websites, verify fit
3. **Approve**: Click "📧 Send AI Email" button
4. **Track**: Monitor responses, book demos
5. **Update**: Change status as leads progress

### Status Progression:

```
Draft → Contacted → Meeting → Closed Won/Lost
```

---

## 🧪 Testing Tips

### Test 1: Single Email
```bash
./test-ai-email.sh
```
Enter a record ID, check email quality

### Test 2: Multiple Companies
- Click button on 3-5 different companies
- Compare email personalization
- Verify each is unique and relevant

### Test 3: Different Complexity Levels
- Test high complexity (Score 9+): Stripe, HubSpot
- Test medium complexity (Score 7-8): ClickUp, Notion
- Compare how AI adjusts messaging

---

## 🔧 Customization

### Change AI Tone/Style

Edit: `/src/lib/ai-email-drafter.ts`

```typescript
temperature: 0.7, // 0.3 = conservative, 0.9 = creative
max_tokens: 500,  // Email length
```

Modify the prompt to adjust:
- **Formal** vs **casual** tone
- **Short** (100 words) vs **long** (250 words)
- **Technical** vs **business** language

### Change Email Template (Fallback)

If AI fails or is disabled, it uses template from:

Edit: `/src/lib/message.ts`
- `generateEmailBody()` - Email content
- `generateEmailSubject()` - Subject lines

---

## 🐛 Troubleshooting

### AI Not Generating Emails
- ✅ Check `OPENAI_API_KEY` is in `.env`
- ✅ Verify OpenAI account has credits ($5 minimum)
- ✅ Check logs for "AI email generation failed"

### Emails Not Personalized Enough
- ✅ Increase `temperature` to 0.9 for more creativity
- ✅ Add more context to the AI prompt
- ✅ Ensure lead has complexity scores filled

### Button Not Working
- ✅ Make sure server is running (`npm run dev`)
- ✅ Check button URL is correct (localhost:3000)
- ✅ Look at browser console for errors

### Email Not Received
- ✅ Check `TEST_EMAIL` is set in `.env`
- ✅ Verify SendGrid API key and sender auth
- ✅ Check spam folder
- ✅ Look at server logs for errors

---

## 📊 Performance

- **AI Generation**: ~5 seconds per email
- **Email Sending**: ~2 seconds
- **Total**: ~7-10 seconds per lead
- **Cost**: ~$0.01 per email (OpenAI GPT-4o-mini)

**For 43 Tier-1 leads**: ~$0.50 total cost

---

## 🚀 Next Steps

### Immediate:
1. ✅ Test AI email with 3-5 leads
2. ✅ Review and refine AI prompts if needed
3. ✅ Set up Airtable button for easy access

### This Week:
4. ✅ Send emails to top 10 Tier-1 leads
5. ✅ Track response rates
6. ✅ Set up Calendly webhook (auto-update on booking)

### Next Week:
7. ✅ Deploy to Vercel (make permanent)
8. ✅ Set up daily automation (discover → score → email)
9. ✅ Add Slack notifications for responses

---

## 💡 Pro Tips

- **Start small**: Test with 5 leads before bulk sending
- **Personalize more**: Manually add notes to high-priority leads
- **A/B test**: Try different AI prompts, track which gets more responses
- **Follow up**: Set reminders for non-responders (3-7 days)
- **Track metrics**: Response rate, demo booking rate, close rate

---

## 📚 Documentation

- **Full Setup**: [AIRTABLE_BUTTON_SETUP.md](./AIRTABLE_BUTTON_SETUP.md)
- **Project Overview**: [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
- **Initial Setup**: [SETUP.md](./SETUP.md)

---

**Questions? Check the server logs or ping for help!** 🚀


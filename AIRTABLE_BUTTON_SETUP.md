# 🔘 Airtable Button Setup Guide

## Overview

This guide shows you how to add a **"Send AI Email"** button to your Airtable that:
1. Generates a personalized email using AI (GPT-4)
2. Sends the email via SendGrid
3. Updates the lead status automatically

---

## 📋 Prerequisites

✅ Airtable base with Leads table  
✅ OpenAI API key configured (in `.env`)  
✅ SendGrid API key configured (in `.env`)  
✅ Local server running (`npm run dev`) OR deployed to Vercel  

---

## 🎯 Option A: Airtable Button Field (Simple)

### Step 1: Add Button Field

1. Open your **Leads** table in Airtable
2. Click **+** to add a new field
3. Select **Button** as the field type
4. Name it: `Send Email`

### Step 2: Configure Button Action

1. Click **Customize field**
2. Set **Label**: `📧 Send AI Email`
3. Under **Action**, select **Open URL**
4. Set the URL to:

**For Local Testing:**
```
http://localhost:3000/api/approve?rid={recordId}
```

**For Vercel (after deployment):**
```
https://your-app.vercel.app/api/approve?rid={recordId}
```

5. Check **Open URL in a new tab**
6. Click **Save**

### Step 3: Test It!

1. Go to a **Tier-1** lead in your Airtable
2. Click the **📧 Send AI Email** button
3. Wait 5-10 seconds
4. Check your test email inbox!
5. The lead's status should auto-update to **"Contacted"**

---

## 🚀 Option B: Airtable Automation (Advanced)

This is better for bulk sending or triggered workflows.

### Step 1: Create Automation

1. Click **Automations** (top right in Airtable)
2. Click **Create automation**
3. Name it: `Send AI Email on Button Click`

### Step 2: Set Trigger

1. **Trigger**: When record matches conditions
2. **Conditions**:
   - `Status` = `Draft`
   - `Tier` = `Tier-1`
3. Or use a button field trigger:
   - **Trigger**: When button clicked
   - **Button field**: (create a button field first)

### Step 3: Add Action

1. Click **+ Add action**
2. Select **Send request to URL**
3. Configure:
   - **Method**: POST
   - **URL**: 
     - Local: `http://localhost:3000/api/approve`
     - Vercel: `https://your-app.vercel.app/api/approve`
   - **Content-Type**: `application/json`
   - **Body**:
     ```json
     {
       "airtableRecordId": "{{Record ID}}"
     }
     ```

### Step 4: Test Automation

1. Click **Test automation**
2. Select a test record
3. Click **Run test**
4. Check logs for success

---

## 📧 What the AI Email Looks Like

The AI will generate emails like this:

### Example 1: High Complexity Company (Stripe)

**Subject:** `Streamlining quote generation at Stripe`

**Body:**
```
Hi Stripe team,

At your scale, managing custom pricing configurations and 
enterprise quotes across multiple products must be incredibly complex.

Dealops helps fast-growing companies like yours automate the 
entire deal desk workflow—from quote generation to approval 
routing to contract creation. Teams typically save 10+ hours/week 
and close deals 30% faster.

Would you be open to a quick 15-min call to explore if Dealops 
could help streamline your sales operations?

Book time here: [Your Calendly Link]

Best regards,
The Dealops Team
```

### Example 2: Mid Complexity Company (ClickUp)

**Subject:** `Deal desk automation for ClickUp`

**Body:**
```
Hi ClickUp team,

I noticed you've been growing quickly in the productivity space. 
As your sales team scales, maintaining pricing consistency and 
streamlining quote approvals becomes crucial.

Dealops automates your deal desk workflows—approval routing, 
discount management, and quote generation—so your team can 
focus on closing deals instead of manual processes.

Quick 15-min call to explore fit?

Book here: [Your Calendly Link]

Cheers,
The Dealops Team
```

---

## 🧪 Testing Workflow

### Test 1: Send Email to Yourself

1. Find any **Tier-1** lead in Airtable
2. Make sure `TEST_EMAIL` is set in `.env` (to your email)
3. Click **📧 Send AI Email**
4. Check your inbox (should arrive in ~10 seconds)
5. Verify the email is personalized for that company

### Test 2: Check Airtable Updates

After sending:
- `Status` should change from `Draft` → `Contacted`
- `Actions` table should log: "Sent Email to [email]"

### Test 3: Bulk Send (Careful!)

1. Filter Airtable to show only `Tier = Tier-1` AND `Status = Draft`
2. Click through top 3-5 leads
3. Or use Airtable automation to send in batches

---

## 🔒 Safety Features

The system has built-in safeguards:

✅ **Test Email Mode**: If `TEST_EMAIL` is set, all emails go there (not to companies)  
✅ **Duplicate Prevention**: Won't send if status is already "Contacted"  
✅ **AI Fallback**: If OpenAI fails, uses template emails  
✅ **Approval Required**: Emails only sent when you click the button  

---

## 🎛️ Customization Options

### Change AI Email Style

Edit `/src/lib/ai-email-drafter.ts`:
- Adjust temperature (0.7 = creative, 0.3 = conservative)
- Modify prompt for different tone
- Change word count limits

### Change Email Template (Fallback)

Edit `/src/lib/message.ts`:
- Update `generateEmailBody()` for default template
- Modify `generateEmailSubject()` for subject lines

### Change Airtable Status

Edit `/src/pages/api/approve.ts`:
- Line 77: Change `'Emailed'` to `'Contacted'` or custom status

---

## 🐛 Troubleshooting

### Button Does Nothing
- Check browser console for errors
- Make sure server is running (`npm run dev`)
- Verify URL is correct (localhost or Vercel)

### Email Not Received
- Check `TEST_EMAIL` is set in `.env`
- Verify SendGrid API key is valid
- Check SendGrid sender authentication
- Look at server logs for errors

### Generic (Not Personalized) Emails
- Verify `OPENAI_API_KEY` is set in `.env`
- Check OpenAI account has credits
- Look for "AI email generation failed" in logs

### Status Not Updating
- Verify Airtable API token has write permissions
- Check `AIRTABLE_ACCESS_TOKEN` in `.env`
- Ensure field names match exactly (case-sensitive)

---

## 🚀 Next Steps

1. **Test with 5-10 leads** to validate AI emails
2. **Review email quality** and adjust prompts if needed
3. **Deploy to Vercel** for permanent button functionality
4. **Set up Slack notifications** for when emails are sent
5. **Add Calendly webhook** to auto-update when demos are booked

---

## 💡 Pro Tips

- **Review First**: Generate 5-10 emails and review them before bulk sending
- **A/B Test**: Try different AI prompts and track response rates
- **Personalize More**: Add company-specific research to the AI prompt
- **Follow Up**: Set up automated follow-ups for non-responders
- **Track Opens**: Use SendGrid's tracking features to see who opens emails

---

## 📚 Related Docs

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Full system architecture
- [SETUP.md](./SETUP.md) - Initial setup instructions
- [README.md](./README.md) - Quick start guide

---

**Questions?** Check the logs or reach out for help! 🤝


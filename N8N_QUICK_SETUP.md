# n8n Quick Setup (15 minutes)

## 🚀 **Step 1: Import Workflow (5 min)**

1. Go to your n8n instance
2. Click **"+"** → **"Import from File"**
3. Upload `n8n-approve-workflow.json`
4. Workflow will open with 6 nodes

## 🔧 **Step 2: Configure Credentials (5 min)**

### **Airtable Credential:**
1. Click on any Airtable node
2. Click "Create New Credential"
3. Add your Airtable Personal Access Token
4. Test connection
5. Apply to all Airtable nodes

### **SendGrid Credential:**
1. Click on "Send Email (SendGrid)" node
2. Click "Create New Credential"
3. Add API key: `YOUR_SENDGRID_API_KEY_HERE`
4. Test connection

## ⚙️ **Step 3: Set Environment Variables in n8n (3 min)**

In n8n Settings → Environment Variables, add:

```
AIRTABLE_BASE_ID=appbVgOqNnPtFwzKM
AIRTABLE_TABLE_LEADS=Leads
AIRTABLE_TABLE_DRAFTS=Drafts
SEND_FROM_EMAIL=your-email@domain.com
TEST_EMAIL=aimiw.amy03@gmail.com
CALENDLY_LINK=https://calendly.com/your-link
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

## 🌐 **Step 4: Activate & Get Webhook URL (2 min)**

1. Click **"Webhook - Approve Click"** node
2. Copy the **Production URL**
   - Should look like: `https://your-n8n.app/webhook/approve?rid={recordId}`
3. Click **"Activate"** toggle (top right)
4. Workflow is now live! ✅

## 📝 **Step 5: Update Slack Button (5 min)**

Copy your n8n webhook URL, then run:

```bash
cd /Users/rienespecial/Dealops
# Update the env file
echo "N8N_WEBHOOK_URL=https://your-n8n.app/webhook" >> .env
```

Then restart your dev server.

## ✅ **Test It:**

1. Send a Slack notification: `./test-slack.sh`
2. Click "Approve & Send" button in Slack
3. Check your email: aimiw.amy03@gmail.com
4. Should receive personalized email! 🎉

---

## 🎯 **Workflow Overview:**

```
Slack Button Click
    ↓
Webhook (n8n)
    ↓
Get Lead from Airtable
    ↓
Get Email Draft from Airtable
    ↓
Send Email (SendGrid)
    ↓
Post confirmation to Slack
    ↓
Show success page
```

**Total Processing Time:** ~3-5 seconds


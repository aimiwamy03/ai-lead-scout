# Contact Finder Feature Guide

## 🎯 **What This Does:**

Automatically finds and populates decision maker contact information for every company discovered. This ensures you have the right person to reach out to!

---

## 📋 **New Airtable Columns Required:**

Add these 3 columns to your **Leads** table:

| Field Name | Type | Description |
|------------|------|-------------|
| **Contact Name** | Single line text | Name of decision maker (e.g., "Sarah Johnson") |
| **Contact Title** | Single line text | Their role (e.g., "CFO", "VP of Finance") |
| **Contact Email** | Email | Best-guess email address |

---

## 🤖 **How It Works:**

### **Intelligent Contact Finding:**

For each company, the system:

1. **Uses GPT-4** to research the most likely decision maker
   - Looks for CFO, VP Finance, Head of Revenue Operations
   - Considers company size, industry, funding level
   
2. **Determines Confidence Level:**
   - **High**: Known public information about the person
   - **Medium**: Educated guess based on company profile
   - **Low**: Generic fallback (e.g., "Finance Team")

3. **Generates Email Address:**
   - Uses common patterns: `firstname.lastname@domain.com`
   - Falls back to: `finance@domain.com` if no specific contact found

---

## 📊 **Example Outputs:**

### **Tier-1 Company (Stripe):**
```
Contact Name: "David Singleton"
Contact Title: "CFO"
Contact Email: "david.singleton@stripe.com"
Confidence: High
```

### **Mid-Size Company:**
```
Contact Name: "Finance Team"
Contact Title: "CFO / VP Finance"
Contact Email: "finance@acmesoft.com"
Confidence: Low
```

---

## 🔄 **Integration with Your Workflow:**

### **1. Discovery Phase:**
```
Find Company → Analyze Metrics → Find Contact → Save to Airtable
                                      ↓
                              CFO Name & Email populated!
```

### **2. Email Generation:**
When you click "Approve & Send", the AI uses:
- Company name
- Contact name
- Contact title
- Contact email

To create **personalized outreach**:
```
Subject: Help [Contact Name] streamline pricing at [Company]
To: [Contact Email]

Hi [Contact Name],

I noticed [Company] recently...
```

### **3. Actions Log:**
```
Action: "Sent Email"
Notes: "Email sent to david.singleton@stripe.com - Subject: Help Stripe streamline..."
```

---

## ⚙️ **Configuration:**

### **GPT-4 Mode (Recommended):**
- Requires `OPENAI_API_KEY` in `.env`
- Most accurate contact finding
- Uses company research and patterns

### **Fallback Mode:**
- No API key needed
- Uses generic patterns:
  - `finance@domain.com`
  - `revenue@domain.com`
  - `Contact Name: "Finance Team"`

---

## 🎯 **Who Gets Targeted:**

The system looks for decision makers in this priority order:

1. **CFO** - For companies with complex pricing ($50M+ funding)
2. **VP of Finance** - For mid-size companies ($10-50M funding)
3. **Head of Revenue Operations** - For RevOps-heavy companies
4. **VP of Sales Operations** - For sales-focused companies
5. **Finance Team** - Generic fallback

---

## 💡 **Benefits:**

✅ **No manual research** - Contacts found automatically  
✅ **Personalized outreach** - Right person, right message  
✅ **Higher response rates** - Reaching decision makers directly  
✅ **Audit trail** - Know who was contacted and when  
✅ **Time savings** - Hours of LinkedIn stalking eliminated  

---

## 🚀 **Testing:**

### **Test with Natural Language:**
```
1. Go to http://localhost:3000
2. Click "Natural Language" tab
3. Enter: "fintech companies with complex pricing"
4. Check Airtable Leads table
5. Verify Contact Name, Contact Title, Contact Email are populated!
```

### **Test with News Discovery:**
```
1. Click "News & Funding" tab
2. Click "Discover from News"
3. Check Airtable
4. Verify contacts are populated for all companies
```

---

## 📝 **Current Limitations:**

⚠️ **Without OpenAI Credits:**
- Falls back to generic contacts: "Finance Team" / `finance@domain.com`
- Still functional, just less personalized
- You can manually update contacts in Airtable

⚠️ **Email Accuracy:**
- Best-guess based on common patterns
- Some companies use different formats
- Always verify before sending (or let them bounce)

---

## 🔧 **Future Enhancements:**

Want even better contact finding? You could integrate:

- **Apollo.io API** - Real contact database
- **Hunter.io** - Email verification
- **RocketReach** - B2B contact finder
- **Clearbit** - Company & person enrichment

Just let me know and I can add these integrations!

---

## ✅ **Setup Checklist:**

- [ ] Add 3 columns to Airtable Leads table:
  - Contact Name (Single line text)
  - Contact Title (Single line text)  
  - Contact Email (Email)
- [ ] Ensure `OPENAI_API_KEY` is in `.env` (optional but recommended)
- [ ] Test with natural language or news discovery
- [ ] Verify contacts populate in Airtable
- [ ] Use contacts in email sending workflow

---

Your leads now come with built-in contact information! 🎉


# Actions Table Guide

## 📊 **What is the Actions Table?**

The Actions table is an **audit trail** that tracks every important activity for each lead. It creates a timeline showing what happened and when.

---

## 🎯 **Actions Table Structure:**

### **Fields:**
- **Lead** (Link to Leads) - Which lead this action is for
- **Action** (Single Select) - Type of action
- **Notes** (Long text) - Details about the action
- **Timestamp** (Date/time) - When it happened (auto-filled by Airtable)

### **Action Types:**
- `Posted to Slack` - When Tier-1 notification sent
- `Approved` - When user clicks approve button (future)
- `Sent Email` - When outreach email sent
- `Follow-up` - Manual follow-up notes (future)
- `Booked` - When demo is scheduled (future)

---

## 🔄 **How Actions Are Logged:**

### **1. When Tier-1 Lead is Discovered:**

```
Discovery API → Finds Tier-1 company
              → Posts to Slack
              → Logs Action:
                  - Action: "Posted to Slack"
                  - Notes: "Tier-1 lead: Stripe - Score: 9.5"
```

**Code:** `src/pages/api/discover.ts` line 277

### **2. When Email is Sent:**

```
User clicks "Approve & Send" → Generates email
                             → Sends via SendGrid
                             → Logs Action:
                                 - Action: "Sent Email"
                                 - Notes: "Email sent to contact@stripe.com - Subject: Streamlining Stripe's..."
```

**Code:** `src/pages/api/approve.ts` line 100

### **3. Future Actions (You Can Add):**

**When User Clicks Approve Button:**
```javascript
await appendAction(recordId, 'Approved', `Approved by ${userName}`);
```

**When Demo is Booked:**
```javascript
await appendAction(recordId, 'Booked', `Demo scheduled for ${date} via Calendly`);
```

**Manual Follow-up:**
```javascript
await appendAction(recordId, 'Follow-up', `Called prospect, left voicemail`);
```

---

## 📋 **Example Actions Timeline for Stripe:**

| Timestamp | Action | Notes |
|-----------|--------|-------|
| 2025-10-02 14:30 | Posted to Slack | Tier-1 lead: Stripe - Score: 9.5 |
| 2025-10-02 14:35 | Sent Email | Email sent to contact@stripe.com - Subject: Streamlining Stripe's Quote Management |
| 2025-10-03 10:15 | Follow-up | Received reply, scheduling demo |
| 2025-10-03 15:00 | Booked | Demo scheduled for 2025-10-05 2pm |

---

## 🎯 **How to View Actions in Airtable:**

### **Option 1: In the Lead Record**
1. Open any Lead record
2. Scroll to the "Actions" field (if you added it as a linked field)
3. See all actions related to this lead

### **Option 2: In the Actions Table**
1. Go to the Actions table
2. See all actions across all leads
3. Sort by Timestamp to see recent activity
4. Filter by Action type to see all "Sent Email" actions, etc.

---

## 🔧 **Enable Actions Tracking:**

I've already enabled it in your code! Actions are now logged:

✅ **Enabled:**
- When Tier-1 leads are posted to Slack
- When emails are sent via the approve button

🔮 **Future (You Can Add):**
- When leads are manually approved
- When demos are booked via Calendly
- When follow-up calls/emails are made

---

## 💡 **Benefits:**

1. **Full Audit Trail** - See exactly what happened with each lead
2. **Team Coordination** - Know who did what and when
3. **Follow-up Reminders** - See which leads need attention
4. **Performance Metrics** - Track conversion rates from discovery → email → booking
5. **Compliance** - Document all outreach activities

---

## 📊 **Sample Queries You Can Run:**

**In Airtable, create views like:**

- **Recent Activity** - Sort by Timestamp descending
- **Emails Sent** - Filter: Action = "Sent Email"
- **Tier-1 Notifications** - Filter: Action = "Posted to Slack"
- **By Lead** - Group by Lead to see each lead's timeline

---

## 🚀 **Next Steps:**

1. ✅ Actions table is now being populated automatically
2. Test it: Run discovery and send an email
3. Check Actions table in Airtable
4. Add more action types as needed (follow-ups, bookings, etc.)


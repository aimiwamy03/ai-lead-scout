/**
 * Approval endpoint
 * Loads lead + draft, sends email, updates Airtable
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeadByRecordId,
  updateLeadStatus,
  appendAction,
} from '@/lib/airtable';
import { replaceEmailVariables, buildEmailSentMessage, generateEmailSubject, generateEmailBody } from '@/lib/message';
import { sendEmail, sendSlackText } from '@/lib/send';
import { generatePersonalizedEmail } from '@/lib/ai-email-drafter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Support both GET (for Slack button click) and POST (for API)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle Slack URL verification challenge
    if (req.body?.type === 'url_verification') {
      console.log('✅ Slack URL verification received');
      return res.status(200).json({ challenge: req.body.challenge });
    }

    // Get record ID from query param or body
    const recordId = req.query.rid as string || req.body?.airtableRecordId;

    if (!recordId) {
      return res.status(400).json({ error: 'Missing airtableRecordId or rid parameter' });
    }

    console.log(`Approving lead: ${recordId}`);

    // Load lead
    const lead = await getLeadByRecordId(recordId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Prepare email content (skip draft logic for now, go straight to AI generation)
    let emailSubject: string;
    let emailBody: string;
    
    // Generate AI email directly
    console.log(`🤖 Generating AI-personalized email for ${lead.Company}...`);
    try {
      const aiDraft = await generatePersonalizedEmail(
        lead.Company,
        lead.Website,
        lead['Complexity Score'] || lead.ComplexityScore || 3,
        lead['Opportunity Score'] || lead.OpportunityScore || 5,
        lead['Source Title']?.split('|')[0]?.trim() || lead.SourceTitle?.split('|')[0]?.trim(), // Extract category
        lead['Source Title'] || lead.SourceTitle
      );
      
      emailSubject = aiDraft.subject;
      emailBody = aiDraft.body;
      
      console.log(`✅ AI email generated. Reasoning: ${aiDraft.reasoning}`);
    } catch (error: any) {
      console.error('AI email generation failed, using template:', error.message);
      emailSubject = generateEmailSubject(lead);
      emailBody = generateEmailBody(lead);
    }
    
    // Replace variables
    const calendlyLink = lead['Calendly Link'] || lead.CalendlyLink || process.env.CALENDLY_LINK || '';
    emailBody = replaceEmailVariables(emailBody, lead, calendlyLink);

    // Determine recipient email
    const recipientEmail = lead['Contact Email'] || process.env.TEST_EMAIL || `contact@${new URL(lead.Website).hostname}`;

    console.log(`📝 Creating draft for manual review (recipient: ${recipientEmail})`);
    console.log(`Subject: ${emailSubject}`);

    // Save draft to Drafts table in Airtable
    const draftRecord: Omit<Draft, 'id'> = {
      Lead: [recordId],
      'Email Subject': emailSubject,
      'Email Body': emailBody,
      'DM Body': '', // Optional LinkedIn DM
      'PRD Notes': lead['Top Signals'] || '',
      'Approved?': true, // Mark as approved, ready for manual send
    };

    try {
      const { ensureDraftForLead } = await import('@/lib/airtable');
      await ensureDraftForLead(recordId, lead);
      console.log(`✅ Draft saved to Airtable Drafts table`);
    } catch (error: any) {
      console.error('Failed to save draft:', error.message);
    }

    // Log approval action (not sent yet)
    try {
      await appendAction(recordId, 'Approved', `Draft approved and ready for manual sending - To: ${recipientEmail}`);
      console.log(`📝 Logged action: Approved`);
    } catch (error: any) {
      console.error('Failed to log action:', error.message);
    }

    console.log(`✅ Approval complete for ${lead.Company}`);

    // Create Gmail compose link
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // Send draft preview to Slack
    const draftPreview = `
✅ *Draft Created for ${lead.Company}*

📧 *To:* ${recipientEmail}
✍️ *Contact:* ${lead['Contact Name'] || 'Finance Team'} (${lead['Contact Title'] || 'CFO'})
📝 *Subject:* ${emailSubject}

*Email Preview:*
${emailBody.substring(0, 400)}${emailBody.length > 400 ? '...\n\n_[Full email in Airtable Drafts table]_' : ''}

*Next Steps - Choose One:*
1️⃣ *Quick Send:* <${gmailLink}|Open in Gmail> (pre-filled draft)
2️⃣ *Manual Review:* Check Airtable → Drafts table → Copy & edit → Send when ready

_Note: After you manually send, log it in Actions table or update Status to "Sent"_
`;
    
    await sendSlackText(draftPreview);

    // If called from GET (Slack button), return HTML page with confirmation
    if (req.method === 'GET') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Email Sent</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
              }
              h1 { margin: 0 0 1rem; font-size: 2rem; }
              p { margin: 0.5rem 0; opacity: 0.9; }
              .checkmark {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">📝</div>
              <h1>Draft Created!</h1>
              <p><strong>${lead.Company}</strong></p>
              <p style="font-size: 0.9rem;">To: ${recipientEmail}</p>
              <p style="font-size: 0.9rem;">Contact: ${lead['Contact Name'] || 'Finance Team'}</p>
              <a href="${gmailLink}" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: white; color: #667eea; text-decoration: none; font-weight: bold; border-radius: 0.5rem;">✉️ Open in Gmail</a>
              <p style="margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.8;">Or check Airtable → Drafts table</p>
            </div>
          </body>
        </html>
      `);
    }

    // If POST, return JSON
    return res.status(200).json({
      success: true,
      message: 'Draft created successfully',
      company: lead.Company,
      recipient: recipientEmail,
      gmailLink: gmailLink,
    });
  } catch (error: any) {
    console.error('Approval failed:', error);
    return res.status(500).json({
      error: 'Approval failed',
      message: error.message,
    });
  }
}


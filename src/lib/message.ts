/**
 * Message formatting for Slack notifications and email templates
 */

import { Lead, ScoringReason } from '@/types';
import { getAirtableRecordUrl } from './airtable';

/**
 * Build Slack message payload for Tier-1 lead notification
 */
export interface SlackMessage {
  text: string;
  blocks: any[];
}

export function buildSlackMessage(lead: Lead, recordId: string): SlackMessage {
  // Use n8n webhook if configured, otherwise fall back to local approve endpoint
  const n8nWebhook = process.env.N8N_WEBHOOK_URL;
  const approvalUrl = n8nWebhook 
    ? `${n8nWebhook}/approve?rid=${recordId}`
    : `https://${process.env.VERCEL_URL || 'localhost:3000'}/api/approve?rid=${recordId}`;
  const airtableUrl = getAirtableRecordUrl(recordId);

  // Parse reasons from TopSignals (now called 'Top Signals' with space)
  const topSignals = lead['Top Signals'] || lead.TopSignals || '';
  const reasonLines = topSignals.split('\n').filter((line) => line.trim());
  const reasonsText = reasonLines.slice(0, 3).join('\n');

  // Get metadata from Source Title (e.g., "Sales | $489M | 1000 employees")
  const sourceTitle = lead['Source Title'] || lead.SourceTitle || '';
  
  // Extract industry from Source Title
  const industry = lead.Industry || sourceTitle.split('|')[0]?.trim() || 'SaaS';

  const text = `🚀 Tier-1 Lead: ${lead.Company} — ${industry}`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚀 Tier-1: ${lead.Company}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Industry:*\n${industry}`,
        },
        {
          type: 'mrkdwn',
          text: `*Opportunity Score:*\n${(lead['Opportunity Score'] || lead.OpportunityScore).toFixed(1)} (C:${(lead['Complexity Score'] || lead.ComplexityScore).toFixed(1)} | ATP:${(lead['WTP Index'] || lead.WTPIndex).toFixed(1)})`,
        },
        {
          type: 'mrkdwn',
          text: `*Website:*\n<${lead.Website}|${lead.Website}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Company Info:*\n${sourceTitle}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Top Signals:*\n${reasonsText}`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Approve & Send',
            emoji: true,
          },
          style: 'primary',
          url: approvalUrl,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📋 View in Airtable',
            emoji: true,
          },
          url: airtableUrl,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Tier: ${lead.Tier} | Status: ${lead.Status} | Record ID: ${recordId}`,
        },
      ],
    },
  ];

  return { text, blocks };
}

/**
 * Generate email subject line
 */
export function generateEmailSubject(lead: Lead): string {
  return `${lead.Company} + Dealops: Pricing for Growth`;
}

/**
 * Generate email body with template variables
 * Must include {{Company}} and {{CalendlyLink}} placeholders
 */
export function generateEmailBody(lead: Lead): string {
  const amountText = lead.Amount
    ? ` ($${(lead.Amount / 1000000).toFixed(0)}M)`
    : '';
  const investorText = lead.Investors
    ? ` with ${lead.Investors.split(',')[0]}`
    : '';

  // Pick a relevant pain point based on signals
  let painPoint = 'quote latency and discount policy drift';
  if (lead.TopSignals.toLowerCase().includes('usage')) {
    painPoint = 'usage forecasting noise and billing complexity';
  } else if (lead.TopSignals.toLowerCase().includes('enterprise')) {
    painPoint = 'deal desk bottlenecks and custom pricing workflows';
  } else if (lead.TopSignals.toLowerCase().includes('module')) {
    painPoint = 'SKU sprawl and pricing governance';
  }

  return `Hi {{Company}} team,

Congrats on your recent ${lead.Round} round${amountText}${investorText}!

As you scale, pricing becomes a lever—but also a pain point. Many teams we work with hit ${painPoint} as they move upmarket.

Dealops helps AI-native companies like yours turn pricing into a growth engine rather than a bottleneck. We've helped companies:
• Cut quote turnaround time from days to hours
• Implement usage-based pricing without engineering overhead
• Scale deal desk operations as they move upmarket

Would love to show you a quick demo. Grab time here: {{CalendlyLink}}

Best,
${process.env.SEND_FROM_NAME || 'Dealops Team'}`;
}

/**
 * Replace template variables in email body
 */
export function replaceEmailVariables(
  template: string,
  lead: Lead,
  calendlyLink: string
): string {
  return template
    .replace(/\{\{Company\}\}/g, lead.Company)
    .replace(/\{\{CalendlyLink\}\}/g, calendlyLink);
}

/**
 * Generate Slack confirmation message after email sent
 */
export function buildEmailSentMessage(lead: Lead): string {
  return `✅ Email sent to ${lead.Company}! Status updated to Emailed.`;
}


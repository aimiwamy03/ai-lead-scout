#!/usr/bin/env node
/**
 * Populate Drafts table with AI-generated email content for all leads
 */

const https = require('https');

// Load environment variables
require('dotenv').config();

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LEADS_TABLE = process.env.AIRTABLE_TABLE_LEADS || 'Leads';
const DRAFTS_TABLE = process.env.AIRTABLE_TABLE_DRAFTS || 'Drafts';

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Helper: Make Airtable API request
async function airtableRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}${path}`;
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Airtable error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Helper: Make OpenAI API request
async function openaiRequest(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const req = https.request('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`OpenAI error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed.choices[0].message.content);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Generate personalized email for a lead
async function generateEmail(lead) {
  const complexity = lead.fields['Complexity Score'] || 3;
  const opportunity = lead.fields['Opportunity Score'] || 5;
  const industry = lead.fields['Industry'] || 'SaaS';
  const topSignals = lead.fields['Top Signals'] || '';

  const prompt = `Write a personalized outbound email to ${lead.fields.Company}, a ${industry} company.

Context:
- Complexity Score: ${complexity}/5 (their pricing/product complexity)
- Opportunity Score: ${opportunity}/10 (fit for Dealops, a deal desk automation platform)
- Key Signals: ${topSignals}

Requirements:
1. Subject line: Keep it short, personalized, and value-focused
2. Email body: 
   - Open with a specific observation about their business (use the signals)
   - Explain how Dealops helps companies like them
   - Keep it under 100 words
   - End with a soft CTA to book a demo
   - Use {{Company}} and {{CalendlyLink}} as template variables
   - Professional but conversational tone

Format your response as JSON:
{
  "subject": "...",
  "body": "..."
}`;

  try {
    const response = await openaiRequest([
      { role: 'system', content: 'You are an expert sales email writer for a B2B SaaS deal desk platform.' },
      { role: 'user', content: prompt }
    ]);
    
    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse AI response');
    }
  } catch (error) {
    console.error(`⚠️  AI generation failed for ${lead.fields.Company}, using template`);
    return {
      subject: `${lead.fields.Company} + Dealops: Scaling Your Deal Desk`,
      body: `Hi {{Company}} team,

I noticed you're in the ${industry} space with ${complexity === 5 ? 'complex' : 'growing'} pricing needs.

Dealops helps companies like yours turn deal desk operations from a bottleneck into a growth engine—automating quote generation, approval workflows, and revenue operations.

Would love to show you a quick demo: {{CalendlyLink}}

Best,
The Dealops Team`
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Drafts population...\n');

  // 1. Fetch all leads
  console.log('📋 Fetching leads from Airtable...');
  const leadsResponse = await airtableRequest(`/${LEADS_TABLE}?pageSize=100`);
  const leads = leadsResponse.records;
  console.log(`✅ Found ${leads.length} leads\n`);

  // 2. Check which leads already have drafts
  console.log('🔍 Checking existing drafts...');
  const draftsResponse = await airtableRequest(`/${DRAFTS_TABLE}?pageSize=100`);
  const existingDraftLeadIds = new Set(
    draftsResponse.records
      .filter(d => d.fields.Lead && d.fields.Lead.length > 0)
      .map(d => d.fields.Lead[0])
  );
  console.log(`✅ Found ${existingDraftLeadIds.size} existing drafts\n`);

  // 3. Generate and create drafts for leads without them
  let created = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (existingDraftLeadIds.has(lead.id)) {
      console.log(`⏭️  Skipping ${lead.fields.Company} (already has draft)`);
      skipped++;
      continue;
    }

    try {
      console.log(`\n🤖 Generating email for ${lead.fields.Company}...`);
      const email = await generateEmail(lead);
      
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Body preview: ${email.body.substring(0, 80)}...`);

      // Create draft in Airtable
      const draft = {
        fields: {
          Lead: [lead.id],
          'Email Subject': email.subject,
          'Email Body': email.body,
          'DM Body': '',
          'PRD Notes': lead.fields['Top Signals'] || '',
          'Approved?': false,
        }
      };

      await airtableRequest(`/${DRAFTS_TABLE}`, {
        method: 'POST',
        body: JSON.stringify(draft),
      });

      console.log(`   ✅ Draft created!`);
      created++;

      // Rate limit: Wait 1 second between AI calls
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Error creating draft for ${lead.fields.Company}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete! Created ${created} new drafts, skipped ${skipped}`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


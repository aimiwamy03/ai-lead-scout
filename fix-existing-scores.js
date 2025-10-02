#!/usr/bin/env node
/**
 * Fix existing Airtable records with proper scores and tiers
 * Run this to update all the Backlog records with correct scoring
 */

require('dotenv').config();
const https = require('https');

const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_LEADS || 'Leads';

// Smart scoring based on company data
function calculateScores(company, sourceTitle) {
  // Parse employee count and funding from Source Title
  const employeeMatch = sourceTitle.match(/(\d+)\s+employees/);
  const fundingMatch = sourceTitle.match(/\$(\d+(?:\.\d+)?)M/);
  
  const employees = employeeMatch ? parseInt(employeeMatch[1]) : 100;
  const fundingMil = fundingMatch ? parseFloat(fundingMatch[1]) : 20;
  const funding = fundingMil * 1000000;

  // Complexity Score (0-5)
  let complexity = 2; // Base
  if (employees >= 1000) complexity += 1.5;
  else if (employees >= 500) complexity += 1;
  else if (employees >= 200) complexity += 0.5;
  
  if (funding >= 500000000) complexity += 1.5;
  else if (funding >= 100000000) complexity += 1;
  else if (funding >= 50000000) complexity += 0.5;

  // High-complexity companies (known brands)
  const highComplexCompanies = ['Stripe', 'Snowflake', 'Databricks', 'DataRobot', 'Datadog', 
    'Segment', 'Twilio', 'Auth0', 'Okta', 'GitLab', 'PagerDuty', 'Slack', 'Zoom',
    'Salesforce', 'HubSpot', 'Zendesk', 'Intercom', 'Atlassian', 'ServiceNow'];
  
  if (highComplexCompanies.some(c => company.toLowerCase().includes(c.toLowerCase()))) {
    complexity = Math.max(complexity, 4);
  }

  complexity = Math.min(Math.round(complexity * 10) / 10, 5);

  // WTP Index (0-5) - Ability to Pay
  let wtp = 2; // Base
  if (funding >= 1000000000) wtp = 5;
  else if (funding >= 500000000) wtp = 4.5;
  else if (funding >= 100000000) wtp = 4;
  else if (funding >= 50000000) wtp = 3.5;
  else if (funding >= 20000000) wtp = 3;
  else if (funding >= 10000000) wtp = 2.5;

  if (employees >= 1000) wtp += 0.5;

  wtp = Math.min(Math.round(wtp * 10) / 10, 5);

  // Opportunity Score (0-10) - DealOps Relevance
  let opportunity = 5; // Base
  if (employees >= 500) opportunity += 2;
  else if (employees >= 200) opportunity += 1.5;
  else if (employees >= 100) opportunity += 1;

  if (complexity >= 4) opportunity += 1.5;
  else if (complexity >= 3) opportunity += 1;

  if (funding >= 100000000) opportunity += 1;

  opportunity = Math.min(Math.round(opportunity * 10) / 10, 10);

  // Determine Tier
  let tier = 'Backlog';
  
  // Tier-1: Best of the best
  if (opportunity >= 8 && wtp >= 4 && complexity >= 4) {
    tier = 'Tier-1';
  } else if (complexity === 5 && wtp >= 4 && opportunity >= 7) {
    tier = 'Tier-1';
  }
  // Tier-2: Good prospects
  else if (opportunity >= 7 && wtp >= 3 && complexity >= 3) {
    tier = 'Tier-2';
  } else if (opportunity >= 6 && (complexity >= 4 || wtp >= 4)) {
    tier = 'Tier-2';
  }

  return { complexity, wtp, opportunity, tier };
}

async function airtableRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'api.airtable.com',
      path: `/v0/${BASE_ID}${endpoint}`,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Airtable error: ${res.statusCode} - ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fixAllRecords() {
  console.log('🔧 Fixing existing Airtable records with proper scores...\n');

  // Fetch all records
  const response = await airtableRequest(`/${TABLE_NAME}`);
  const records = response.records;

  console.log(`📊 Found ${records.length} records to fix\n`);

  let tier1Count = 0;
  let tier2Count = 0;
  let backlogCount = 0;
  let updatedCount = 0;

  for (const record of records) {
    const fields = record.fields;
    const company = fields.Company;
    const sourceTitle = fields['Source Title'] || '';

    // Calculate proper scores
    const scores = calculateScores(company, sourceTitle);

    // Check if needs update
    const needsUpdate = 
      fields['Complexity Score'] !== scores.complexity ||
      fields['WTP Index'] !== scores.wtp ||
      fields['Opportunity Score'] !== scores.opportunity ||
      fields.Tier !== scores.tier;

    if (needsUpdate) {
      // Update record
      await airtableRequest(`/${TABLE_NAME}/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            'Complexity Score': scores.complexity,
            'WTP Index': scores.wtp,
            'Opportunity Score': scores.opportunity,
            Tier: scores.tier,
          }
        })
      });

      console.log(`✅ ${company}: ${scores.tier} (C:${scores.complexity} | WTP:${scores.wtp} | Opp:${scores.opportunity})`);
      updatedCount++;

      // Count tiers
      if (scores.tier === 'Tier-1') tier1Count++;
      else if (scores.tier === 'Tier-2') tier2Count++;
      else backlogCount++;

      // Rate limit: 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Updated ${updatedCount} records!`);
  console.log(`\n📊 New Distribution:`);
  console.log(`   🥇 Tier-1: ${tier1Count} companies`);
  console.log(`   🥈 Tier-2: ${tier2Count} companies`);
  console.log(`   📦 Backlog: ${backlogCount} companies`);
}

// Run it!
if (!AIRTABLE_TOKEN || !BASE_ID) {
  console.error('❌ Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID in .env');
  process.exit(1);
}

fixAllRecords().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});


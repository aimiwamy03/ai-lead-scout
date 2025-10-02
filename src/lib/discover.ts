/**
 * Company Discovery Module
 * Finds SaaS companies from various sources (Crunchbase, directories, etc.)
 */

import { CompanyData } from '@/types';

export interface DiscoverySource {
  name: string;
  website: string;
  description?: string;
  estimatedRevenue?: number;
  estimatedEmployees?: number;
  fundingTotal?: number;
  fundingRound?: string;
  category?: string;
}

/**
 * Curated list of high-potential SaaS companies
 * These are real B2B SaaS companies with complex pricing
 */
export const SAAS_COMPANIES: DiscoverySource[] = [
  // Developer Tools & Infrastructure
  { name: 'Vercel', website: 'https://vercel.com', category: 'Developer Tools', estimatedEmployees: 200, fundingTotal: 150000000 },
  { name: 'Netlify', website: 'https://netlify.com', category: 'Developer Tools', estimatedEmployees: 300, fundingTotal: 212000000 },
  { name: 'Render', website: 'https://render.com', category: 'Developer Tools', estimatedEmployees: 50, fundingTotal: 40000000 },
  { name: 'Railway', website: 'https://railway.app', category: 'Developer Tools', estimatedEmployees: 30, fundingTotal: 22000000 },
  { name: 'Supabase', website: 'https://supabase.com', category: 'Developer Tools', estimatedEmployees: 50, fundingTotal: 116000000 },
  { name: 'PlanetScale', website: 'https://planetscale.com', category: 'Developer Tools', estimatedEmployees: 100, fundingTotal: 80000000 },
  { name: 'Neon', website: 'https://neon.tech', category: 'Developer Tools', estimatedEmployees: 40, fundingTotal: 46000000 },
  
  // Sales & Marketing Tools
  { name: 'Outreach', website: 'https://outreach.io', category: 'Sales', estimatedEmployees: 1000, fundingTotal: 489000000 },
  { name: 'Gong', website: 'https://gong.io', category: 'Sales', estimatedEmployees: 800, fundingTotal: 584000000 },
  { name: 'Clari', website: 'https://clari.com', category: 'Sales', estimatedEmployees: 500, fundingTotal: 422000000 },
  { name: 'Mixpanel', website: 'https://mixpanel.com', category: 'Analytics', estimatedEmployees: 300, fundingTotal: 277000000 },
  { name: 'Amplitude', website: 'https://amplitude.com', category: 'Analytics', estimatedEmployees: 600, fundingTotal: 336000000 },
  { name: 'Segment', website: 'https://segment.com', category: 'Analytics', estimatedEmployees: 400, fundingTotal: 284000000 },
  
  // Customer Success & Support
  { name: 'Intercom', website: 'https://intercom.com', category: 'Customer Support', estimatedEmployees: 800, fundingTotal: 241000000 },
  { name: 'Zendesk', website: 'https://zendesk.com', category: 'Customer Support', estimatedEmployees: 5000, fundingTotal: 986000000 },
  { name: 'Freshworks', website: 'https://freshworks.com', category: 'Customer Support', estimatedEmployees: 5000, fundingTotal: 479000000 },
  { name: 'Front', website: 'https://front.com', category: 'Customer Support', estimatedEmployees: 250, fundingTotal: 138000000 },
  { name: 'Chameleon', website: 'https://chameleon.io', category: 'Customer Success', estimatedEmployees: 40, fundingTotal: 10000000 },
  
  // HR & Recruiting
  { name: 'Lattice', website: 'https://lattice.com', category: 'HR', estimatedEmployees: 500, fundingTotal: 328000000 },
  { name: 'Culture Amp', website: 'https://cultureamp.com', category: 'HR', estimatedEmployees: 600, fundingTotal: 297000000 },
  { name: 'Greenhouse', website: 'https://greenhouse.io', category: 'Recruiting', estimatedEmployees: 600, fundingTotal: 225000000 },
  { name: 'Lever', website: 'https://lever.co', category: 'Recruiting', estimatedEmployees: 200, fundingTotal: 73000000 },
  { name: 'BambooHR', website: 'https://bamboohr.com', category: 'HR', estimatedEmployees: 1000, fundingTotal: 122000000 },
  
  // Project Management & Collaboration
  { name: 'Asana', website: 'https://asana.com', category: 'Project Management', estimatedEmployees: 1500, fundingTotal: 635000000 },
  { name: 'Monday.com', website: 'https://monday.com', category: 'Project Management', estimatedEmployees: 2000, fundingTotal: 574000000 },
  { name: 'ClickUp', website: 'https://clickup.com', category: 'Project Management', estimatedEmployees: 800, fundingTotal: 537000000 },
  { name: 'Linear', website: 'https://linear.app', category: 'Project Management', estimatedEmployees: 50, fundingTotal: 52000000 },
  { name: 'Notion', website: 'https://notion.so', category: 'Collaboration', estimatedEmployees: 500, fundingTotal: 343000000 },
  
  // Finance & Billing
  { name: 'Stripe', website: 'https://stripe.com', category: 'Payments', estimatedEmployees: 8000, fundingTotal: 2200000000 },
  { name: 'Chargebee', website: 'https://chargebee.com', category: 'Billing', estimatedEmployees: 600, fundingTotal: 325000000 },
  { name: 'Recurly', website: 'https://recurly.com', category: 'Billing', estimatedEmployees: 300, fundingTotal: 82000000 },
  { name: 'Maxio', website: 'https://maxio.com', category: 'Billing', estimatedEmployees: 200, fundingTotal: 120000000 },
  { name: 'Paddle', website: 'https://paddle.com', category: 'Billing', estimatedEmployees: 400, fundingTotal: 292000000 },
  
  // Security & Compliance
  { name: 'Vanta', website: 'https://vanta.com', category: 'Security', estimatedEmployees: 300, fundingTotal: 203000000 },
  { name: 'Drata', website: 'https://drata.com', category: 'Compliance', estimatedEmployees: 200, fundingTotal: 135000000 },
  { name: 'OneTrust', website: 'https://onetrust.com', category: 'Privacy', estimatedEmployees: 2000, fundingTotal: 920000000 },
  { name: 'Transcend', website: 'https://transcend.io', category: 'Privacy', estimatedEmployees: 50, fundingTotal: 44000000 },
  
  // Data & Analytics
  { name: 'Snowflake', website: 'https://snowflake.com', category: 'Data Warehouse', estimatedEmployees: 6000, fundingTotal: 1400000000 },
  { name: 'Databricks', website: 'https://databricks.com', category: 'Data Platform', estimatedEmployees: 5000, fundingTotal: 3500000000 },
  { name: 'Fivetran', website: 'https://fivetran.com', category: 'Data Integration', estimatedEmployees: 800, fundingTotal: 568000000 },
  { name: 'dbt Labs', website: 'https://getdbt.com', category: 'Data Transformation', estimatedEmployees: 500, fundingTotal: 414000000 },
  { name: 'Looker', website: 'https://looker.com', category: 'BI', estimatedEmployees: 800, fundingTotal: 282000000 },
  
  // Marketing Automation
  { name: 'HubSpot', website: 'https://hubspot.com', category: 'Marketing', estimatedEmployees: 7000, fundingTotal: 100000000 },
  { name: 'Marketo', website: 'https://marketo.com', category: 'Marketing', estimatedEmployees: 2000, fundingTotal: 108000000 },
  { name: 'Iterable', website: 'https://iterable.com', category: 'Marketing', estimatedEmployees: 500, fundingTotal: 334000000 },
  { name: 'Braze', website: 'https://braze.com', category: 'Marketing', estimatedEmployees: 1500, fundingTotal: 586000000 },
  
  // API & Integration Platforms
  { name: 'Zapier', website: 'https://zapier.com', category: 'Integration', estimatedEmployees: 500, fundingTotal: 240000000 },
  { name: 'Workato', website: 'https://workato.com', category: 'Integration', estimatedEmployees: 600, fundingTotal: 420000000 },
  { name: 'Tray.io', website: 'https://tray.io', category: 'Integration', estimatedEmployees: 300, fundingTotal: 172000000 },
  { name: 'MuleSoft', website: 'https://mulesoft.com', category: 'Integration', estimatedEmployees: 2000, fundingTotal: 259000000 },
  
  // Revenue Operations & Sales Tools
  { name: 'Salesloft', website: 'https://salesloft.com', category: 'Sales', estimatedEmployees: 1200, fundingTotal: 534000000 },
  { name: 'Apollo.io', website: 'https://apollo.io', category: 'Sales', estimatedEmployees: 300, fundingTotal: 100000000 },
  { name: 'People.ai', website: 'https://people.ai', category: 'Sales', estimatedEmployees: 400, fundingTotal: 200000000 },
  { name: 'Chorus.ai', website: 'https://chorus.ai', category: 'Sales', estimatedEmployees: 200, fundingTotal: 85000000 },
  { name: 'Drift', website: 'https://drift.com', category: 'Sales', estimatedEmployees: 400, fundingTotal: 107000000 },
  
  // Financial SaaS & Billing
  { name: 'Bill.com', website: 'https://bill.com', category: 'Fintech', estimatedEmployees: 2000, fundingTotal: 740000000 },
  { name: 'Tipalti', website: 'https://tipalti.com', category: 'Fintech', estimatedEmployees: 800, fundingTotal: 565000000 },
  { name: 'Ramp', website: 'https://ramp.com', category: 'Fintech', estimatedEmployees: 600, fundingTotal: 1200000000 },
  { name: 'Brex', website: 'https://brex.com', category: 'Fintech', estimatedEmployees: 1000, fundingTotal: 1500000000 },
  { name: 'Stripe Billing', website: 'https://stripe.com/billing', category: 'Billing', estimatedEmployees: 8000, fundingTotal: 2200000000 },
  
  // CPQ & Deal Desk Tools (Direct Competitors/Partners)
  { name: 'Conga', website: 'https://conga.com', category: 'CPQ', estimatedEmployees: 1500, fundingTotal: 350000000 },
  { name: 'PandaDoc', website: 'https://pandadoc.com', category: 'Sales', estimatedEmployees: 500, fundingTotal: 100000000 },
  { name: 'DealHub', website: 'https://dealhub.io', category: 'CPQ', estimatedEmployees: 300, fundingTotal: 70000000 },
  { name: 'DocuSign', website: 'https://docusign.com', category: 'Sales', estimatedEmployees: 7000, fundingTotal: 518000000 },
  
  // More Data & Analytics
  { name: 'Tableau', website: 'https://tableau.com', category: 'Analytics', estimatedEmployees: 5000, fundingTotal: 254000000 },
  { name: 'Mode', website: 'https://mode.com', category: 'Analytics', estimatedEmployees: 200, fundingTotal: 70000000 },
  { name: 'Hex', website: 'https://hex.tech', category: 'Analytics', estimatedEmployees: 100, fundingTotal: 75000000 },
  { name: 'Sigma Computing', website: 'https://sigmacomputing.com', category: 'Analytics', estimatedEmployees: 300, fundingTotal: 300000000 },
  { name: 'ThoughtSpot', website: 'https://thoughtspot.com', category: 'Analytics', estimatedEmployees: 1000, fundingTotal: 660000000 },
  
  // Product & Experimentation
  { name: 'Pendo', website: 'https://pendo.io', category: 'Product Analytics', estimatedEmployees: 800, fundingTotal: 361000000 },
  { name: 'LaunchDarkly', website: 'https://launchdarkly.com', category: 'Developer Tools', estimatedEmployees: 500, fundingTotal: 320000000 },
  { name: 'Optimizely', website: 'https://optimizely.com', category: 'Marketing', estimatedEmployees: 1200, fundingTotal: 450000000 },
  { name: 'Split.io', website: 'https://split.io', category: 'Developer Tools', estimatedEmployees: 200, fundingTotal: 100000000 },
  
  // Customer Data Platforms
  { name: 'mParticle', website: 'https://mparticle.com', category: 'Data', estimatedEmployees: 300, fundingTotal: 150000000 },
  { name: 'RudderStack', website: 'https://rudderstack.com', category: 'Data', estimatedEmployees: 150, fundingTotal: 76000000 },
  { name: 'Hightouch', website: 'https://hightouch.com', category: 'Data', estimatedEmployees: 200, fundingTotal: 102000000 },
  { name: 'Census', website: 'https://getcensus.com', category: 'Data', estimatedEmployees: 150, fundingTotal: 85000000 },
  
  // Security & Infrastructure
  { name: 'Snyk', website: 'https://snyk.io', category: 'Security', estimatedEmployees: 1000, fundingTotal: 1000000000 },
  { name: 'Lacework', website: 'https://lacework.com', category: 'Security', estimatedEmployees: 800, fundingTotal: 1300000000 },
  { name: 'Wiz', website: 'https://wiz.io', category: 'Security', estimatedEmployees: 900, fundingTotal: 1900000000 },
  { name: 'Orca Security', website: 'https://orca.security', category: 'Security', estimatedEmployees: 500, fundingTotal: 550000000 },
  { name: 'Sysdig', website: 'https://sysdig.com', category: 'Security', estimatedEmployees: 600, fundingTotal: 396000000 },
  
  // Developer Tools & Platforms
  { name: 'Postman', website: 'https://postman.com', category: 'Developer Tools', estimatedEmployees: 600, fundingTotal: 435000000 },
  { name: 'Temporal', website: 'https://temporal.io', category: 'Developer Tools', estimatedEmployees: 150, fundingTotal: 103000000 },
  { name: 'Retool', website: 'https://retool.com', category: 'Developer Tools', estimatedEmployees: 400, fundingTotal: 195000000 },
  { name: 'Confluent', website: 'https://confluent.io', category: 'Data Platform', estimatedEmployees: 2500, fundingTotal: 625000000 },
  { name: 'HashiCorp', website: 'https://hashicorp.com', category: 'Developer Tools', estimatedEmployees: 2000, fundingTotal: 350000000 },
  
  // Communication & Collaboration
  { name: 'Zoom', website: 'https://zoom.us', category: 'Collaboration', estimatedEmployees: 8000, fundingTotal: 146000000 },
  { name: 'Miro', website: 'https://miro.com', category: 'Collaboration', estimatedEmployees: 1500, fundingTotal: 476000000 },
  { name: 'Airtable', website: 'https://airtable.com', category: 'Collaboration', estimatedEmployees: 1000, fundingTotal: 1360000000 },
  { name: 'Coda', website: 'https://coda.io', category: 'Collaboration', estimatedEmployees: 200, fundingTotal: 140000000 },
  { name: 'Figma', website: 'https://figma.com', category: 'Design', estimatedEmployees: 1000, fundingTotal: 333000000 },
  
  // E-commerce & Retail Tech
  { name: 'Shopify', website: 'https://shopify.com', category: 'E-commerce', estimatedEmployees: 10000, fundingTotal: 122000000 },
  { name: 'BigCommerce', website: 'https://bigcommerce.com', category: 'E-commerce', estimatedEmployees: 1000, fundingTotal: 200000000 },
  { name: 'Faire', website: 'https://faire.com', category: 'E-commerce', estimatedEmployees: 1500, fundingTotal: 1200000000 },
  
  // Vertical SaaS
  { name: 'Toast', website: 'https://pos.toasttab.com', category: 'Vertical SaaS', estimatedEmployees: 4000, fundingTotal: 900000000 },
  { name: 'Procore', website: 'https://procore.com', category: 'Vertical SaaS', estimatedEmployees: 3000, fundingTotal: 570000000 },
  { name: 'Veeva', website: 'https://veeva.com', category: 'Vertical SaaS', estimatedEmployees: 5000, fundingTotal: 7000000 },
  
  // Additional High-Value Targets
  { name: 'Gusto', website: 'https://gusto.com', category: 'HR', estimatedEmployees: 2000, fundingTotal: 700000000 },
  { name: 'Rippling', website: 'https://rippling.com', category: 'HR', estimatedEmployees: 1000, fundingTotal: 1200000000 },
];

/**
 * Calculate Ability To Pay score (0-5)
 * Based on funding, team size, and estimated revenue
 */
export function calculateAbilityToPay(company: DiscoverySource): number {
  let score = 0;
  
  // Funding score (0-2 points)
  if (company.fundingTotal) {
    if (company.fundingTotal >= 100000000) score += 2; // $100M+
    else if (company.fundingTotal >= 20000000) score += 1.5; // $20M+
    else if (company.fundingTotal >= 5000000) score += 1; // $5M+
    else score += 0.5; // Any funding
  }
  
  // Team size score (0-2 points)
  if (company.estimatedEmployees) {
    if (company.estimatedEmployees >= 1000) score += 2; // Large company
    else if (company.estimatedEmployees >= 200) score += 1.5; // Medium company
    else if (company.estimatedEmployees >= 50) score += 1; // Growing startup
    else score += 0.5; // Small startup
  }
  
  // Revenue estimate score (0-1 point)
  // Rough heuristic: $100K ARR per employee for SaaS
  if (company.estimatedEmployees) {
    const estimatedARR = company.estimatedEmployees * 100000;
    if (estimatedARR >= 50000000) score += 1; // $50M+ ARR
    else if (estimatedARR >= 10000000) score += 0.7; // $10M+ ARR
    else if (estimatedARR >= 1000000) score += 0.4; // $1M+ ARR
  }
  
  return Math.min(score, 5); // Cap at 5
}

/**
 * Convert discovery source to CompanyData format
 */
export function discoveryToCompanyData(source: DiscoverySource): CompanyData {
  return {
    company: source.name,
    website: source.website,
    round: 'A', // Default, not critical for discovery
    amount: source.fundingTotal || 0,
    investors: '',
  };
}

/**
 * Get companies filtered by criteria
 */
export function getDiscoveryCompanies(options?: {
  minFunding?: number;
  minEmployees?: number;
  categories?: string[];
  limit?: number;
}): DiscoverySource[] {
  console.log(`[getDiscoveryCompanies] Starting with ${SAAS_COMPANIES.length} companies`);
  console.log('[getDiscoveryCompanies] Options:', options);
  
  let filtered = SAAS_COMPANIES;
  
  if (options?.minFunding !== undefined) {
    console.log(`[getDiscoveryCompanies] Filtering by minFunding: ${options.minFunding}`);
    filtered = filtered.filter(c => (c.fundingTotal || 0) >= options.minFunding!);
    console.log(`[getDiscoveryCompanies] After funding filter: ${filtered.length} companies`);
  }
  
  if (options?.minEmployees !== undefined) {
    console.log(`[getDiscoveryCompanies] Filtering by minEmployees: ${options.minEmployees}`);
    filtered = filtered.filter(c => (c.estimatedEmployees || 0) >= options.minEmployees!);
    console.log(`[getDiscoveryCompanies] After employees filter: ${filtered.length} companies`);
  }
  
  if (options?.categories && options.categories.length > 0) {
    console.log(`[getDiscoveryCompanies] Filtering by categories: ${options.categories}`);
    filtered = filtered.filter(c => 
      c.category && options.categories!.includes(c.category)
    );
    console.log(`[getDiscoveryCompanies] After category filter: ${filtered.length} companies`);
  }
  
  // Sort by ability to pay (descending)
  filtered.sort((a, b) => calculateAbilityToPay(b) - calculateAbilityToPay(a));
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  console.log(`[getDiscoveryCompanies] Returning ${filtered.length} companies`);
  return filtered;
}


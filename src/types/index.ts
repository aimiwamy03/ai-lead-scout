// Core data types matching Airtable schema

export type Round = 'Seed' | 'A' | 'B' | 'C';

export type Tier = 'Tier-1' | 'Tier-2' | 'Backlog';

export type Status = 'Draft' | 'Ready for Review' | 'Approved' | 'Sent' | 'Booked' | 'Nurture' | 'Skip';

export type ActionType = 'Posted to Slack' | 'Approved' | 'Sent Email' | 'Follow-up' | 'Booked';

export interface Lead {
  id?: string; // Airtable record ID
  Company: string;
  Website: string;
  'Source Title': string;
  'Source URL': string; // Unique upsert key
  Industry?: string; // AI/ML, SaaS Tools, Data/Analytics, Security/Compliance, DevTools, Fintech, Collaboration, Other
  SourceDate?: string; // ISO date (optional now)
  Round?: Round; // Optional now
  Amount?: number; // Optional now
  Investors?: string; // Optional now
  'Top Signals': string; // 3-5 bullets with evidence
  'Complexity Score': number;
  'WTP Index': number;
  'Opportunity Score': number;
  Tier: Tier;
  Status: Status;
  'Calendly Link': string;
  Owner?: string;
  Created?: string;
  // Contact Information
  'Contact Name'?: string; // CFO, VP Finance, Head of Revenue Operations
  'Contact Title'?: string; // e.g., "CFO", "VP of Finance"
  'Contact Email'?: string; // Best-guess email address
}

export interface Draft {
  id?: string;
  Lead: string[]; // Link to Leads (array of record IDs)
  'Email Subject': string;
  'Email Body': string; // Must contain {{Company}} and {{CalendlyLink}}
  'DM Body'?: string;
  'PRD Notes'?: string; // 3-5 bullets max
  'Approved?': boolean;
  Created?: string;
}

export interface Action {
  id?: string;
  Lead: string[]; // Link to Leads (array of record IDs)
  Action: ActionType;
  Notes?: string;
  Timestamp?: string;
}

// Extraction results
export interface ExtractionResult {
  pricingKeywords: string[];
  securityKeywords: string[];
  enterpriseMotionKeywords: string[];
  moduleCount: number;
  hasRecentSecurity: boolean; // ≤120 days
  revOpsRoleCount: number;
  technographics: string[];
}

// Scoring reason with evidence
export interface ScoringReason {
  label: string;
  evidence: string; // URL
  confidence: 'high' | 'medium' | 'low';
}

// Complete scoring result
export interface ScoringResult {
  complexityScore: number;
  wtpIndex: number;
  opportunityScore: number;
  tier: Tier;
  reasons: ScoringReason[];
}

// Feed item from RSS/GDELT
export interface FeedItem {
  title: string;
  link: string; // SourceURL
  pubDate: Date;
  description?: string;
}

// Parsed company data
export interface CompanyData {
  company: string;
  website: string;
  round: Round;
  amount: number;
  investors: string;
}


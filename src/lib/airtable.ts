/**
 * Airtable integration layer
 * Handles CRUD operations for Leads, Drafts, and Actions tables
 */

import { Lead, Draft, Action } from '@/types';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

interface AirtableRecord<T> {
  id: string;
  fields: T;
  createdTime: string;
}

interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

/**
 * Generic Airtable API call with retries
 */
async function airtableRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const url = `${AIRTABLE_API_BASE}/${process.env.AIRTABLE_BASE_ID}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error('Airtable request failed after retries');
}

/**
 * Upsert lead by SourceURL (unique key)
 * Creates new lead if not found, updates existing lead if found
 */
export async function upsertLeadBySourceUrl(lead: Lead): Promise<string> {
  const tableName = process.env.AIRTABLE_TABLE_LEADS || 'Leads';

  // First, try to find existing lead by Source URL
  const formula = `{Source URL} = '${lead['Source URL'].replace(/'/g, "\\'")}'`;
  const searchResponse = await airtableRequest<AirtableResponse<Lead>>(
    `/${tableName}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`
  );

  const existingRecord = searchResponse.records[0];

  if (existingRecord) {
    // Update existing record
    const updateResponse = await airtableRequest<AirtableRecord<Lead>>(
      `/${tableName}/${existingRecord.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ fields: lead }),
      }
    );
    return updateResponse.id;
  } else {
    // Create new record
    const createResponse = await airtableRequest<AirtableRecord<Lead>>(
      `/${tableName}`,
      {
        method: 'POST',
        body: JSON.stringify({ fields: lead }),
      }
    );
    return createResponse.id;
  }
}

/**
 * Get lead by Airtable record ID
 */
export async function getLeadByRecordId(recordId: string): Promise<Lead | null> {
  const tableName = process.env.AIRTABLE_TABLE_LEADS || 'Leads';

  try {
    const response = await airtableRequest<AirtableRecord<Lead>>(
      `/${tableName}/${recordId}`
    );
    return { ...response.fields, id: response.id };
  } catch (error) {
    console.error(`Failed to get lead ${recordId}:`, error);
    return null;
  }
}

/**
 * Update lead status
 */
export async function updateLeadStatus(
  recordId: string,
  status: Lead['Status']
): Promise<void> {
  const tableName = process.env.AIRTABLE_TABLE_LEADS || 'Leads';

  await airtableRequest<AirtableRecord<Lead>>(
    `/${tableName}/${recordId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields: { Status: status } }),
    }
  );
}

/**
 * Get latest draft for a lead
 */
export async function getLatestDraft(leadRecordId: string): Promise<Draft | null> {
  const tableName = process.env.AIRTABLE_TABLE_DRAFTS || 'Drafts';

  // Filter by linked Lead record and sort by Created descending
  const formula = `FIND('${leadRecordId}', ARRAYJOIN({Lead}, ','))`;
  const response = await airtableRequest<AirtableResponse<Draft>>(
    `/${tableName}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1&sort[0][field]=Created&sort[0][direction]=desc`
  );

  if (response.records.length === 0) return null;

  const record = response.records[0];
  return { ...record.fields, id: record.id };
}

/**
 * Create or ensure draft exists for a lead
 * Returns draft record ID
 */
export async function ensureDraftForLead(
  leadRecordId: string,
  lead: Lead
): Promise<string> {
  const existingDraft = await getLatestDraft(leadRecordId);
  if (existingDraft?.id) return existingDraft.id;

  // Create default draft
  const tableName = process.env.AIRTABLE_TABLE_DRAFTS || 'Drafts';
  const calendlyLink = process.env.CALENDLY_LINK || '';

  // Generate default email template
  const emailSubject = `${lead.Company} + Dealops: Pricing for Growth`;
  const emailBody = `Hi {{Company}} team,

Congrats on your recent ${lead.Round} round${lead.Amount ? ` ($${(lead.Amount / 1000000).toFixed(0)}M)` : ''}! 

As you scale, pricing becomes a lever—but also a pain point. Many teams we work with hit quote latency, discount policy drift, or SKU sprawl as they move upmarket.

Dealops helps AI-native companies like yours turn pricing into a growth engine rather than a bottleneck.

Would love to show you a quick demo. Grab time here: {{CalendlyLink}}

Best,
${process.env.SEND_FROM_NAME || 'Dealops Team'}`;

  const draft: Omit<Draft, 'id'> = {
    Lead: [leadRecordId],
    'Email Subject': emailSubject,
    'Email Body': emailBody,
    'DM Body': '',
    'PRD Notes': lead['Top Signals'],
    'Approved?': false,
  };

  const response = await airtableRequest<AirtableRecord<Draft>>(
    `/${tableName}`,
    {
      method: 'POST',
      body: JSON.stringify({ fields: draft }),
    }
  );

  return response.id;
}

/**
 * Append action to Actions table
 */
export async function appendAction(
  leadRecordId: string,
  action: Action['Action'],
  notes?: string
): Promise<string> {
  const tableName = process.env.AIRTABLE_TABLE_ACTIONS || 'Actions';

  const actionRecord: Omit<Action, 'id' | 'Timestamp'> = {
    Lead: [leadRecordId],
    Action: action,
    Notes: notes,
  };

  const response = await airtableRequest<AirtableRecord<Action>>(
    `/${tableName}`,
    {
      method: 'POST',
      body: JSON.stringify({ fields: actionRecord }),
    }
  );

  return response.id;
}

/**
 * Get Airtable record URL for sharing
 */
export function getAirtableRecordUrl(recordId: string): string {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_LEADS || 'Leads';
  return `https://airtable.com/${baseId}/${tableName}/${recordId}`;
}


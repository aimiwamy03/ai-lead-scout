/**
 * Main ingestion endpoint
 * Fetches feeds, extracts signals, scores, upserts to Airtable, notifies Slack
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchAllFundingNews,
  parseCompanyData,
  resolveWebsite,
  fetchCompanyPages,
} from '@/lib/fetchers';
import { extractSignals } from '@/lib/extract';
import { scoreCompany, formatReasonsForAirtable } from '@/lib/score';
import { upsertLeadBySourceUrl, appendAction } from '@/lib/airtable';
import { buildSlackMessage } from '@/lib/message';
import { sendSlackNotification } from '@/lib/send';
import { Lead } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting ingestion job...');

    // Step 1: Fetch funding news
    const feedItems = await fetchAllFundingNews();
    console.log(`Fetched ${feedItems.length} feed items`);

    if (feedItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new items to process',
        processed: 0,
        tier1: 0,
      });
    }

    const processedLeads: any[] = [];
    let tier1Count = 0;

    // Step 2: Process each feed item
    for (const item of feedItems) {
      try {
        console.log(`Processing: ${item.title}`);

        // Parse company data from news item
        const companyData = parseCompanyData(item);
        if (!companyData) {
          console.log('Could not parse company data, skipping');
          continue;
        }

        // Resolve website
        if (!companyData.website) {
          companyData.website = await resolveWebsite(companyData.company);
        }

        console.log(`Company: ${companyData.company}, Website: ${companyData.website}`);

        // Fetch company pages
        const pages = await fetchCompanyPages(companyData.website);

        // Extract signals
        const extraction = await extractSignals(companyData.website, pages);

        // Score company
        const scoring = scoreCompany(companyData, extraction, companyData.website);

        // Build lead record
        const lead: Lead = {
          Company: companyData.company,
          Website: companyData.website,
          SourceTitle: item.title,
          SourceURL: item.link,
          SourceDate: item.pubDate.toISOString().split('T')[0],
          Round: companyData.round,
          Amount: companyData.amount,
          Investors: companyData.investors,
          TopSignals: formatReasonsForAirtable(scoring.reasons),
          ComplexityScore: scoring.complexityScore,
          WTPIndex: scoring.wtpIndex,
          OpportunityScore: scoring.opportunityScore,
          Tier: scoring.tier,
          Status: scoring.tier === 'Tier-1' ? 'Ready for Review' : 'New',
          CalendlyLink: process.env.CALENDLY_LINK || '',
        };

        // Upsert to Airtable
        const recordId = await upsertLeadBySourceUrl(lead);
        lead.id = recordId;

        console.log(
          `Upserted lead: ${lead.Company} (${lead.Tier}, Score: ${lead.OpportunityScore})`
        );

        processedLeads.push({
          company: lead.Company,
          tier: lead.Tier,
          score: lead.OpportunityScore,
          recordId,
        });

        // Step 3: Notify Slack for Tier-1
        if (scoring.tier === 'Tier-1') {
          tier1Count++;

          const slackMessage = buildSlackMessage(lead, recordId);
          const slackSuccess = await sendSlackNotification(slackMessage);

          if (slackSuccess) {
            await appendAction(recordId, 'Posted to Slack', 'Tier-1 lead notification');
            console.log(`Posted to Slack: ${lead.Company}`);
          } else {
            console.error(`Failed to post to Slack: ${lead.Company}`);
          }
        }
      } catch (error: any) {
        console.error(`Error processing item "${item.title}":`, error.message);
        // Continue with next item
      }
    }

    console.log('Ingestion job complete');

    return res.status(200).json({
      success: true,
      processed: processedLeads.length,
      tier1: tier1Count,
      leads: processedLeads,
    });
  } catch (error: any) {
    console.error('Ingestion job failed:', error);
    return res.status(500).json({
      error: 'Ingestion failed',
      message: error.message,
    });
  }
}


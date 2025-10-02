/**
 * News-based company discovery endpoint
 * Uses RSS feeds (Crunchbase, TechCrunch, etc.) to find companies with recent funding
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAllFundingNews, parseCompanyData } from '@/lib/fetchers';
import { analyzecomplexityWithLLM } from '@/lib/llm-analyzer';
import { upsertLeadBySourceUrl } from '@/lib/airtable';
import { Lead } from '@/types';
import { calculateAbilityToPay } from '@/lib/discover';
import { findDecisionMaker } from '@/lib/contact-finder';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Step 1: Fetch funding news from RSS feeds
    sendEvent({ status: 'Fetching RSS feeds...' });
    console.log('📡 Fetching funding news from RSS feeds...');
    
    const newsItems = await fetchAllFundingNews();
    console.log(`✅ Found ${newsItems.length} news items`);
    sendEvent({ status: `Found ${newsItems.length} news articles` });

    if (newsItems.length === 0) {
      sendEvent({ error: 'No news items found' });
      sendEvent({ done: true });
      return res.end();
    }

    // Step 2: Parse company data from news items
    let processedCount = 0;
    const validCompanies = [];

    for (const item of newsItems) {
      const companyData = parseCompanyData(item);
      if (companyData) {
        validCompanies.push({ ...companyData, sourceUrl: item.link, sourceTitle: item.title });
      }
    }

    console.log(`✅ Parsed ${validCompanies.length} companies with funding data`);
    sendEvent({ status: `Parsed ${validCompanies.length} companies` });

    // Step 2.5: Validate companies (check website availability)
    const https = require('https');
    const http = require('http');
    
    const checkWebsite = async (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          const protocol = url.startsWith('https') ? https : http;
          const req = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (res: any) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => {
            req.destroy();
            resolve(false);
          });
          req.end();
        } catch {
          resolve(false);
        }
      });
    };

    const verifiedCompanies = [];
    for (const company of validCompanies) {
      const isValid = await checkWebsite(company.website);
      if (isValid) {
        verifiedCompanies.push(company);
        console.log(`✅ Verified: ${company.company} - ${company.website}`);
      } else {
        console.log(`⚠️  Skipping ${company.company} - website unreachable: ${company.website}`);
      }
    }

    console.log(`✅ Verified ${verifiedCompanies.length}/${validCompanies.length} companies`);
    sendEvent({ status: `Verified ${verifiedCompanies.length} companies with working websites` });

    if (verifiedCompanies.length === 0) {
      sendEvent({ error: 'No verified companies found with working websites' });
      sendEvent({ done: true });
      return res.end();
    }

    // Step 3: Process each company with AI and add to Airtable
    for (const companyData of verifiedCompanies) {
      try {
        console.log(`\n▶️ Processing: ${companyData.company}`);

        // Estimate employees from funding (rough heuristic)
        const estimatedEmployees = Math.min(
          Math.max(Math.floor(companyData.amount / 100000), 10),
          2000
        );

        // Analyze with LLM
        const llmAnalysis = await analyzecomplexityWithLLM(
          companyData.company,
          companyData.website,
          estimatedEmployees,
          companyData.amount,
          'SaaS' // We'll let the LLM figure out the exact category
        );

        console.log(`✅ LLM analyzed ${companyData.company}: Complexity=${llmAnalysis.complexityScore}, ATP=${calculateAbilityToPay(companyData.amount, estimatedEmployees)}, Fit=${llmAnalysis.dealOpsRelevance}`);

        const abilityToPay = calculateAbilityToPay(
          companyData.amount,
          estimatedEmployees
        );

        const finalScore = llmAnalysis.dealOpsRelevance;
        const complexityScore = llmAnalysis.complexityScore;

        // Determine tier
        let tier: 'Tier-1' | 'Tier-2' | 'Backlog' = 'Backlog';
        if (finalScore >= 8 && abilityToPay >= 4 && complexityScore >= 4) {
          tier = 'Tier-1';
        } else if (complexityScore === 5 && abilityToPay >= 4 && finalScore >= 7) {
          tier = 'Tier-1';
        } else if (finalScore >= 7 && abilityToPay >= 3 && complexityScore >= 3) {
          tier = 'Tier-2';
        } else if (finalScore >= 6 && (complexityScore >= 4 || abilityToPay >= 4)) {
          tier = 'Tier-2';
        }

        // Format top signals
        const topSignals = llmAnalysis.reasoning
          .slice(0, 4)
          .map(r => `• ${r}`)
          .join('\n');

        // Map round to industry (rough guess)
        const industry = llmAnalysis.reasoning.some(r => 
          /fintech|payment|banking/i.test(r)
        ) ? 'Fintech' : llmAnalysis.reasoning.some(r =>
          /data|analytics|ML|AI/i.test(r)
        ) ? 'Data/Analytics' : 'Other';

        // Find decision maker contact
        const contact = await findDecisionMaker(
          companyData.company,
          companyData.website,
          industry,
          companyData.amount
        );

        // Create lead
        const lead: Lead = {
          Company: companyData.company,
          Website: companyData.website,
          'Source Title': companyData.sourceTitle || `${companyData.round} Round | $${(companyData.amount / 1000000).toFixed(1)}M | ${companyData.investors}`,
          'Source URL': companyData.sourceUrl,
          Industry: industry,
          Round: companyData.round,
          Amount: companyData.amount,
          Investors: companyData.investors,
          'Top Signals': topSignals,
          'Complexity Score': complexityScore,
          'WTP Index': abilityToPay,
          'Opportunity Score': finalScore,
          Tier: tier,
          Status: 'Draft',
          'Calendly Link': process.env.CALENDLY_LINK || '',
          // Contact information
          'Contact Name': contact?.name || 'Finance Team',
          'Contact Title': contact?.title || 'CFO / VP Finance',
          'Contact Email': contact?.email || `finance@${companyData.website.replace('https://', '').replace('http://', '').split('/')[0]}`,
        };

        // Upsert to Airtable
        await upsertLeadBySourceUrl(lead);
        console.log(`✅ Upserted lead: ${lead.Company} (${tier}, Score: ${finalScore})`);

        // Stream company name back to frontend
        sendEvent({ 
          company: `${companyData.company} - ${companyData.round} $${(companyData.amount / 1000000).toFixed(1)}M (${tier}, Score: ${finalScore.toFixed(1)})`,
          tier,
          score: finalScore
        });

        processedCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error: any) {
        console.error(`❌ Error processing ${companyData.company}:`, error.message);
        sendEvent({ 
          company: `${companyData.company} (Error: ${error.message})`,
          error: true
        });
      }
    }

    // Send completion event
    console.log(`\n✅ Processing complete: ${processedCount} leads processed`);
    sendEvent({ done: true, total: processedCount });
    res.end();

  } catch (error: any) {
    console.error('News discovery error:', error);
    sendEvent({ error: error.message });
    sendEvent({ done: true });
    res.end();
  }
}


/**
 * Discovery endpoint - Find and score SaaS companies at scale
 * Focuses on complexity + ability to pay, not just funding news
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getDiscoveryCompanies,
  discoveryToCompanyData,
  calculateAbilityToPay,
  DiscoverySource,
} from '@/lib/discover';
import { fetchCompanyPages } from '@/lib/fetchers';
import { extractSignals } from '@/lib/extract';
import { scoreCompany, formatReasonsForAirtable } from '@/lib/score';
import { upsertLeadBySourceUrl, appendAction } from '@/lib/airtable';
import { Lead } from '@/types';
import { analyzecomplexityWithLLM } from '@/lib/llm-analyzer';
import { buildSlackMessage } from '@/lib/message';
import { sendSlackNotification } from '@/lib/send';
import { findDecisionMaker } from '@/lib/contact-finder';

/**
 * Estimate complexity and relevance from company metadata (fallback when LLM unavailable)
 * NOTE: This is a rough estimate. Real complexity should be from LLM or pricing scraper.
 */
function estimateFromMetadata(company: DiscoverySource): {
  complexityScore: number;
  dealOpsRelevance: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let complexityScore = 2; // Start at 2 (assume basic SaaS complexity)
  let dealOpsRelevance = 5; // Start at 5/10 (moderate fit)
  
  const employees = company.estimatedEmployees || 0;
  const funding = company.fundingTotal || 0;
  const category = company.category || '';
  
  // Team size -> complexity & relevance
  if (employees >= 500) {
    complexityScore += 1.5;
    dealOpsRelevance += 2;
    reasons.push('Enterprise-scale team (500+ employees)');
  } else if (employees >= 200) {
    complexityScore += 1;
    dealOpsRelevance += 1.5;
    reasons.push('Large team (200+ employees)');
  } else if (employees >= 100) {
    complexityScore += 0.5;
    dealOpsRelevance += 1;
    reasons.push('Mid-size team (100+ employees)');
  } else {
    reasons.push(`Team: ${employees} employees`);
  }
  
  // Funding -> ability to pay & likely complexity
  if (funding >= 100000000) {
    complexityScore += 1;
    dealOpsRelevance += 1;
    reasons.push(`$${(funding / 1000000).toFixed(0)}M funding (likely complex)`);
  } else if (funding >= 50000000) {
    complexityScore += 0.5;
    dealOpsRelevance += 0.5;
    reasons.push(`$${(funding / 1000000).toFixed(0)}M funding`);
  }
  
  // Category-based complexity (industries with typically complex pricing)
  const highComplexityCategories = [
    'Data', 'Integration', 'Security', 'Infrastructure', 
    'Analytics', 'Platform', 'API', 'CPQ', 'Sales'
  ];
  if (highComplexityCategories.some(c => category.includes(c))) {
    complexityScore += 1;
    dealOpsRelevance += 1;
    reasons.push(`${category} typically has complex pricing`);
  }
  
  // Cap scores
  complexityScore = Math.min(complexityScore, 5);
  dealOpsRelevance = Math.min(dealOpsRelevance, 10);
  
  reasons.push('⚠️ Heuristic estimate (add OpenAI key for accurate scoring)');
  
  return {
    complexityScore: Math.round(complexityScore * 10) / 10,
    dealOpsRelevance: Math.round(dealOpsRelevance * 10) / 10,
    reasons,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting discovery job...');

    // Get filter params from request
    const {
      limit = 50, // Process 50 companies by default
      minFunding = 5000000, // $5M minimum funding
      minEmployees = 30, // 30+ employees
      categories,
      fastMode = true, // Skip page scraping for speed
    } = req.body;

    // Get companies from discovery source
    console.log('Discovery filters:', { limit, minFunding, minEmployees, categories });
    const companies = getDiscoveryCompanies({
      limit: Number(limit),
      minFunding: Number(minFunding),
      minEmployees: Number(minEmployees),
      categories: categories ? String(categories).split(',') : undefined,
    });

    console.log(`Discovered ${companies.length} companies to analyze`);

    if (companies.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No companies match criteria',
        processed: 0,
        leads: [],
      });
    }

    const processedLeads: any[] = [];
    let tier1Count = 0;

    console.log(`🔄 About to process ${companies.length} companies...`);
    
    // Process each company
    for (const companySource of companies) {
      try {
        console.log(`\n▶️ Processing: ${companySource.name} (${companySource.website})`);

        // Convert to CompanyData format
        const companyData = discoveryToCompanyData(companySource);

        let scoring;
        let abilityToPay = 0;
        
        if (fastMode) {
          // Try LLM analysis first (fast & accurate)
          const llmAnalysis = await analyzecomplexityWithLLM(companySource);
          
            if (llmAnalysis) {
              // Use LLM scores (BEST - most accurate)
              scoring = {
                complexityScore: llmAnalysis.complexityScore,
                wtpIndex: llmAnalysis.abilityToPayScore,
                opportunityScore: llmAnalysis.dealOpsRelevance,
                reasons: llmAnalysis.reasoning, // Just the AI reasoning, no prefix
              };
              abilityToPay = llmAnalysis.abilityToPayScore;
            } else {
              // Fallback to heuristic estimation (ROUGH estimate)
              const estimate = estimateFromMetadata(companySource);
              abilityToPay = calculateAbilityToPay(companySource);
              scoring = {
                complexityScore: estimate.complexityScore,
                wtpIndex: abilityToPay,
                opportunityScore: estimate.dealOpsRelevance,
                reasons: estimate.reasons, // Just the reasons, no "heuristic" prefix
              };
            }
        } else {
          // SLOW MODE: Full page scraping and analysis
          const pages = await fetchCompanyPages(companyData.website);
          const extraction = await extractSignals(companyData.website, pages);
          scoring = scoreCompany(companyData, extraction, companyData.website);
          abilityToPay = calculateAbilityToPay(companySource);
        }

        // Use dealOpsRelevance as the primary score (0-10 scale)
        // This already factors in complexity + ability to pay from LLM analysis
        const finalScore = scoring.opportunityScore; // This is dealOpsRelevance

        // Determine tier based on dealOps fit + minimum ability to pay + complexity
        let tier: 'Tier-1' | 'Tier-2' | 'Backlog' = 'Backlog';
        
        // Tier-1: Best of the best - High relevance + can afford + complex enough
        // These are top priority accounts that should be contacted ASAP
        if (finalScore >= 8 && abilityToPay >= 4 && scoring.complexityScore >= 4) {
          tier = 'Tier-1';
          tier1Count++;
        }
        // Also Tier-1: Unicorn complexity (5/5) with strong ability to pay
        else if (scoring.complexityScore === 5 && abilityToPay >= 4 && finalScore >= 7) {
          tier = 'Tier-1';
          tier1Count++;
        }
        // Tier-2: Good fit but slightly lower - solid prospects worth pursuing
        // Option 1: Good relevance (7+) but lower complexity or ability to pay
        else if (finalScore >= 7 && abilityToPay >= 3 && scoring.complexityScore >= 3) {
          tier = 'Tier-2';
        }
        // Option 2: Decent relevance with strong complexity or ability to pay
        else if (finalScore >= 6 && (scoring.complexityScore >= 4 || abilityToPay >= 4)) {
          tier = 'Tier-2';
        }
        // Everything else: Backlog (too small, too simple, or poor fit)

        // Format Top Signals from AI reasoning
        const topSignals = scoring.reasons
          .slice(0, 4) // Top 4 signals
          .map(r => `• ${r}`)
          .join('\n');

        // Map category to Industry
        const categoryToIndustry: Record<string, string> = {
          'Sales': 'SaaS Tools',
          'Marketing': 'SaaS Tools',
          'Analytics': 'Data/Analytics',
          'Data': 'Data/Analytics',
          'Data Warehouse': 'Data/Analytics',
          'Data Platform': 'Data/Analytics',
          'Data Integration': 'Data/Analytics',
          'Data Transformation': 'Data/Analytics',
          'BI': 'Data/Analytics',
          'Product Analytics': 'Data/Analytics',
          'Security': 'Security/Compliance',
          'Compliance': 'Security/Compliance',
          'Privacy': 'Security/Compliance',
          'Developer Tools': 'DevTools',
          'Integration': 'DevTools',
          'API': 'DevTools',
          'Payments': 'Fintech',
          'Billing': 'Fintech',
          'Fintech': 'Fintech',
          'HR': 'SaaS Tools',
          'Recruiting': 'SaaS Tools',
          'Project Management': 'Collaboration',
          'Collaboration': 'Collaboration',
          'Design': 'Collaboration',
          'Customer Support': 'SaaS Tools',
          'Customer Success': 'SaaS Tools',
          'CPQ': 'SaaS Tools',
          'E-commerce': 'E-commerce',
          'Vertical SaaS': 'Vertical SaaS',
        };
        
        const industry = categoryToIndustry[companySource.category || ''] || 'Other';

        // Find decision maker contact
        console.log(`🔍 Finding decision maker for ${companyData.company}...`);
        const contact = await findDecisionMaker(
          companyData.company,
          companyData.website,
          industry,
          companySource.fundingTotal
        );

        // Build lead record (ULTRA-MINIMAL to work with any Airtable schema)
        const lead: any = {
          Company: companyData.company,
          Website: companyData.website,
          'Source URL': companyData.website,
          'Source Title': `${companySource.category || 'SaaS'} | $${((companySource.fundingTotal || 0) / 1000000).toFixed(1)}M | ${companySource.estimatedEmployees ||'?'} employees`,
          Industry: industry,
          'Top Signals': topSignals,
          'Complexity Score': scoring.complexityScore,
          'WTP Index': abilityToPay,
          'Opportunity Score': finalScore,
          Tier: tier,
          Status: 'Draft',
          // Contact information
          'Contact Name': contact?.name || 'Finance Team',
          'Contact Title': contact?.title || 'CFO / VP Finance',
          'Contact Email': contact?.email || `finance@${companyData.website.replace('https://', '').replace('http://', '').split('/')[0]}`,
        };

        // Upsert to Airtable
        const recordId = await upsertLeadBySourceUrl(lead);
        console.log(`✅ Upserted lead: ${lead.Company} (${lead.Tier}, Score: ${lead['Opportunity Score']})`);

        // Send Slack notification for Tier-1 leads only
        if (tier === 'Tier-1') {
          try {
            const slackMessage = buildSlackMessage(lead, recordId);
            const slackSuccess = await sendSlackNotification(slackMessage);
            
            if (slackSuccess) {
              console.log(`📢 Posted to Slack: ${lead.Company}`);
              // Log to Actions table
              await appendAction(recordId, 'Posted to Slack', `Tier-1 lead: ${lead.Company} - Score: ${finalScore.toFixed(1)}`);
            } else {
              console.error(`❌ Failed to post to Slack: ${lead.Company}`);
            }
          } catch (error: any) {
            console.error(`Slack notification error for ${lead.Company}:`, error.message);
            // Continue processing even if Slack fails
          }
        }

        processedLeads.push({
          company: lead.Company,
          website: lead.Website,
          tier: lead.Tier,
          score: lead['Opportunity Score'],
          complexity: lead['Complexity Score'],
          abilityToPay: abilityToPay,
          recordId: recordId,
        });

      } catch (error: any) {
        console.error(`❌ Error processing company "${companySource.name}":`, error.message);
        console.error('Full error:', error);
        continue;
      }
    }
    
    console.log(`✅ Processing complete: ${processedLeads.length} leads processed, ${tier1Count} Tier-1`);

    console.log('Discovery job complete');

    return res.status(200).json({
      success: true,
      processed: processedLeads.length,
      tier1: tier1Count,
      leads: processedLeads,
    });

  } catch (error: any) {
    console.error('Discovery job failed:', error);
    return res.status(500).json({
      error: 'Discovery job failed',
      message: error.message,
    });
  }
}


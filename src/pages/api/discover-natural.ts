/**
 * Natural language company discovery endpoint
 * Uses GPT-4 to interpret user queries and generate matching companies
 */

import type { NextApiRequest, NextApiResponse } from 'next';
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

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Step 1: Use GPT-4 to interpret the query and generate company list
    const prompt = `You are a B2B SaaS company database expert. Given a user's description of companies they want to find, generate a list of 10-15 real, well-known companies that match.

User Query: "${query}"

Requirements:
1. Generate real, existing companies (not fictional)
2. Focus on B2B SaaS companies
3. Include accurate company name, working website URL, category, realistic employee count, and total funding
4. Match the user's criteria as closely as possible
5. Ensure estimatedEmployees is a realistic number (50-5000)
6. Ensure fundingTotal is realistic in USD (minimum $5,000,000)

Return ONLY a JSON array of companies in this EXACT format (no other text):
[
  {
    "name": "Stripe",
    "website": "https://stripe.com",
    "category": "Fintech",
    "estimatedEmployees": 8000,
    "fundingTotal": 2200000000
  },
  {
    "name": "Snowflake",
    "website": "https://snowflake.com",
    "category": "Data/Analytics",
    "estimatedEmployees": 5000,
    "fundingTotal": 1400000000
  }
]

CRITICAL: Return ONLY the JSON array, nothing else. No markdown, no explanation.`;

    const https = require('https');
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      sendEvent({ error: 'OpenAI API key not configured' });
      sendEvent({ done: true });
      return res.end();
    }

    // Call OpenAI to get company list
    const companiesJson = await new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a B2B SaaS company database expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }, (apiRes: any) => {
        let data = '';
        apiRes.on('data', (chunk: any) => data += chunk);
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (apiRes.statusCode >= 400) {
              reject(new Error(`OpenAI error: ${apiRes.statusCode}`));
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

    // Parse the JSON response
    console.log('GPT-4 Response:', companiesJson);
    
    const jsonMatch = companiesJson.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse company list from GPT-4');
    }

    const companies = JSON.parse(jsonMatch[0]);
    console.log(`Parsed ${companies.length} companies:`, companies.map((c: any) => c.name));

    // Step 2: Process each company and add to Airtable
    for (const company of companies) {
      try {
        console.log(`Processing company:`, company);
        
        // Validate and set defaults for company data
        if (!company.name || !company.website) {
          console.error('Invalid company data - missing name or website:', company);
          continue;
        }
        
        // Ensure numeric values with reasonable defaults
        const employees = Math.max(parseInt(company.estimatedEmployees) || 200, 50);
        const funding = Math.max(parseInt(company.fundingTotal) || 20000000, 5000000);
        const category = company.category || 'SaaS';
        
        console.log(`📊 ${company.name}: ${employees} employees, $${(funding/1000000).toFixed(1)}M funding, ${category}`);
        
        // Analyze with LLM
        const llmAnalysis = await analyzecomplexityWithLLM(
          company.name,
          company.website,
          employees,
          funding,
          category
        );
        
        const abilityToPay = calculateAbilityToPay(funding, employees);
        const finalScore = llmAnalysis.dealOpsRelevance;
        const complexityScore = llmAnalysis.complexityScore;
        
        console.log(`✅ ${company.name} scores: Complexity=${complexityScore}, ATP=${abilityToPay}, Opportunity=${finalScore}`);

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

        // Map category to industry
        const categoryToIndustry: Record<string, string> = {
          'Fintech': 'Fintech',
          'Payments': 'Fintech',
          'DevTools': 'DevTools',
          'Data/Analytics': 'Data/Analytics',
          'Security': 'Security/Compliance',
          'Sales': 'SaaS Tools',
          'Marketing': 'SaaS Tools',
          'HR': 'SaaS Tools',
          'Collaboration': 'Collaboration',
        };
        const industry = categoryToIndustry[company.category] || 'Other';

        // Create lead with validated data
        // Find decision maker contact
        const contact = await findDecisionMaker(
          company.name,
          company.website,
          industry,
          funding
        );

        const lead: Lead = {
          Company: company.name,
          Website: company.website,
          'Source Title': `${category} | $${(funding / 1000000).toFixed(0)}M | ${employees} employees`,
          'Source URL': `https://dealops-scout.ai/natural/${company.name.toLowerCase().replace(/\s+/g, '-')}`,
          Industry: industry,
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
          'Contact Email': contact?.email || `finance@${company.website.replace('https://', '').replace('http://', '').split('/')[0]}`,
        };
        
        console.log(`💾 Creating lead: ${company.name} - ${tier} (Opp: ${finalScore}, C: ${complexityScore}, ATP: ${abilityToPay})`);

        // Upsert to Airtable
        await upsertLeadBySourceUrl(lead);

        // Stream company name back to frontend with full details
        sendEvent({ 
          company: `${company.name} - $${(funding/1000000).toFixed(0)}M (${tier} | Opp: ${finalScore.toFixed(1)} | C: ${complexityScore} | ATP: ${abilityToPay.toFixed(1)})`,
          tier,
          score: finalScore,
          complexity: complexityScore,
          atp: abilityToPay
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Error processing ${company.name}:`, error.message);
        sendEvent({ 
          company: `${company.name} (Error: ${error.message})`,
          error: true
        });
      }
    }

    // Send completion event
    sendEvent({ done: true, total: companies.length });
    res.end();

  } catch (error: any) {
    console.error('Natural discovery error:', error);
    sendEvent({ error: error.message });
    sendEvent({ done: true });
    res.end();
  }
}


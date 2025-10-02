/**
 * LLM-based complexity analyzer using OpenAI
 * Estimates product complexity and ability to pay from company metadata
 */

import OpenAI from 'openai';
import { DiscoverySource } from './discover';

interface LLMAnalysis {
  complexityScore: number; // 0-5
  abilityToPayScore: number; // 0-5
  reasoning: string[];
  dealOpsRelevance: number; // 0-10 (how good a fit for Dealops)
}

/**
 * Initialize OpenAI client (only if API key exists)
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('OpenAI API key not found, skipping LLM analysis');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Analyze company complexity using GPT-4
 */
export async function analyzecomplexityWithLLM(
  company: DiscoverySource
): Promise<LLMAnalysis | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const prompt = `Analyze this B2B SaaS company for Dealops (a deal desk automation platform).

Company: ${company.name}
Website: ${company.website}
Category: ${company.category || 'SaaS'}
Team Size: ${company.estimatedEmployees || 'Unknown'} employees
Total Funding: $${((company.fundingTotal || 0) / 1000000).toFixed(1)}M
Description: ${company.description || 'B2B SaaS company'}

CRITICAL: Focus on PRICING & PRODUCT COMPLEXITY:

1. PRICING/PRODUCT COMPLEXITY (0-5 scale):
   How complex is their pricing/quoting process?
   - 5 = Multiple products + 4+ pricing tiers + enterprise custom pricing + usage-based
   - 4 = 3-4 pricing tiers + 2+ products + custom pricing
   - 3 = 2-3 tiers + enterprise pricing or 2+ products
   - 2 = Simple tiered pricing (2-3 tiers) + single product
   - 1 = Flat/simple pricing, single product
   
   Key indicators:
   - Number of distinct products/solutions
   - Pricing tiers (Free, Pro, Business, Enterprise, etc.)
   - Pricing models (per-seat, usage-based, tiered, custom)
   - Add-ons, modules, or customization options
   - Multiple SKUs or configurations

2. ABILITY TO PAY (0-5 scale):
   Can they afford Dealops (~$50K+/year)?
   - 5 = $100M+ funding or 500+ employees (definitely can pay)
   - 4 = $50-100M funding or 200-500 employees
   - 3 = $20-50M or 100-200 employees
   - 2 = $10-20M or 50-100 employees
   - 1 = <$10M or <50 employees
   
3. DEALOPS FIT (0-10 scale):
   Overall fit for deal desk automation
   - 10 = Perfect fit (complex pricing, sales team, enterprise deals)
   - 7-9 = Strong fit (good complexity, growing team)
   - 4-6 = Moderate fit (some complexity)
   - 1-3 = Poor fit (too simple or too small)

Return ONLY valid JSON (no markdown):
{
  "complexityScore": <number 0-5>,
  "abilityToPayScore": <number 0-5>,
  "dealOpsRelevance": <number 0-10>,
  "reasoning": ["<specific pricing/product insight>", "<ability to pay reasoning>", "<why good/bad fit>"]
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Fast & cheap
      messages: [
        {
          role: 'system',
          content: 'You are a B2B SaaS analyst specializing in sales operations and pricing complexity. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Low temperature for consistent scoring
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log(`No response from LLM for ${company.name}`);
      return null;
    }

    // Parse JSON response
    const analysis = JSON.parse(content) as LLMAnalysis;
    
    // Validate scores
    if (
      typeof analysis.complexityScore !== 'number' ||
      typeof analysis.abilityToPayScore !== 'number' ||
      typeof analysis.dealOpsRelevance !== 'number'
    ) {
      console.log(`Invalid LLM response for ${company.name}:`, content);
      return null;
    }

    console.log(`✅ LLM analyzed ${company.name}: Complexity=${analysis.complexityScore}, ATP=${analysis.abilityToPayScore}, Fit=${analysis.dealOpsRelevance}`);
    return analysis;

  } catch (error: any) {
    console.error(`LLM analysis failed for ${company.name}:`, error.message);
    return null;
  }
}

/**
 * Batch analyze multiple companies (with rate limiting)
 */
export async function batchAnalyzeCompanies(
  companies: DiscoverySource[],
  delayMs: number = 500 // 500ms between requests to avoid rate limits
): Promise<Map<string, LLMAnalysis>> {
  const results = new Map<string, LLMAnalysis>();
  
  for (const company of companies) {
    const analysis = await analyzecomplexityWithLLM(company);
    if (analysis) {
      results.set(company.name, analysis);
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  return results;
}


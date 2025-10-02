/**
 * Pricing & Product Complexity Analyzer
 * Scrapes pricing pages to determine actual product/pricing complexity
 */

import * as cheerio from 'cheerio';

export interface PricingComplexity {
  complexityScore: number; // 1-5
  pricingTiers: number;
  products: string[];
  pricingModels: string[]; // ['per-seat', 'usage-based', 'enterprise', 'flat-rate']
  hasEnterpriseCustom: boolean;
  reasoning: string[];
}

/**
 * Analyze pricing page HTML to determine complexity
 */
export function analyzePricingComplexity(html: string, url: string): PricingComplexity {
  const $ = cheerio.load(html);
  const text = $('body').text().toLowerCase();
  
  // Initialize
  const products: Set<string> = new Set();
  const pricingModels: Set<string> = new Set();
  const reasoning: string[] = [];
  
  // 1. Count pricing tiers (look for common patterns)
  const tierPatterns = [
    /\b(starter|basic|free|trial)\b/gi,
    /\b(professional|pro|standard|plus)\b/gi,
    /\b(business|team|premium|advanced)\b/gi,
    /\b(enterprise|unlimited|custom)\b/gi,
  ];
  
  let pricingTiers = 0;
  tierPatterns.forEach(pattern => {
    if (pattern.test(text)) pricingTiers++;
  });
  
  // Also count pricing cards/boxes
  const pricingCards = $('.pricing-card, .price-card, .plan, .tier, [class*="pricing"], [class*="plan"]').length;
  if (pricingCards > pricingTiers) {
    pricingTiers = Math.min(pricingCards, 6); // Cap at 6
  }
  
  reasoning.push(`${pricingTiers} pricing tier${pricingTiers !== 1 ? 's' : ''} detected`);
  
  // 2. Detect pricing models
  if (/per (user|seat|license)/i.test(text)) {
    pricingModels.add('per-seat');
  }
  if (/usage.based|pay.as.you.go|per (api call|request|transaction|message)/i.test(text)) {
    pricingModels.add('usage-based');
  }
  if (/flat (rate|fee)|fixed price|monthly subscription/i.test(text)) {
    pricingModels.add('flat-rate');
  }
  if (/contact (us|sales)|custom pricing|quote/i.test(text)) {
    pricingModels.add('enterprise');
  }
  if (/tiered|volume discount|bulk pricing/i.test(text)) {
    pricingModels.add('tiered-volume');
  }
  if (/freemium|free (plan|tier|forever)/i.test(text)) {
    pricingModels.add('freemium');
  }
  
  const hasEnterpriseCustom = pricingModels.has('enterprise');
  
  if (pricingModels.size > 0) {
    reasoning.push(`Pricing models: ${Array.from(pricingModels).join(', ')}`);
  }
  
  // 3. Detect multiple products (look for product names, tabs, sections)
  const productKeywords = [
    'platform', 'suite', 'product', 'solution', 'module',
    'crm', 'sales', 'marketing', 'service', 'analytics', 'api',
  ];
  
  // Look for product tabs/sections
  const productSections = $('[class*="product"], [class*="solution"], [data-product], nav a, .nav-link').length;
  
  // Count distinct product mentions
  productKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}[\\w\\s]{0,20}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 2) { // Mentioned multiple times = likely a product
      products.add(keyword);
    }
  });
  
  // Check for "products" or "solutions" pages
  const hasProductsPage = /products|solutions|platform/i.test($('nav, header, .navigation').text());
  if (hasProductsPage && products.size < 2) {
    products.add('multiple-products');
  }
  
  if (products.size > 0) {
    reasoning.push(`${products.size} product${products.size !== 1 ? 's' : ''} identified`);
  }
  
  // 4. Look for add-ons, integrations, customization
  let hasAddOns = false;
  if (/add.on|integration|plugin|extension|marketplace/i.test(text)) {
    hasAddOns = true;
    reasoning.push('Offers add-ons/integrations');
  }
  
  // 5. Calculate complexity score (1-5)
  let complexityScore = 1; // Base score
  
  // Pricing tiers (0-2 points)
  if (pricingTiers >= 4) complexityScore += 2;
  else if (pricingTiers >= 3) complexityScore += 1.5;
  else if (pricingTiers >= 2) complexityScore += 1;
  else if (pricingTiers >= 1) complexityScore += 0.5;
  
  // Multiple products (0-1 point)
  if (products.size >= 3) complexityScore += 1;
  else if (products.size >= 2) complexityScore += 0.5;
  
  // Pricing model complexity (0-1 point)
  if (pricingModels.size >= 3) complexityScore += 1;
  else if (pricingModels.size >= 2) complexityScore += 0.5;
  
  // Enterprise/custom pricing (0-0.5 points)
  if (hasEnterpriseCustom) complexityScore += 0.5;
  
  // Add-ons (0-0.5 points)
  if (hasAddOns) complexityScore += 0.5;
  
  // Cap at 5
  complexityScore = Math.min(complexityScore, 5);
  
  reasoning.push(`Overall complexity: ${complexityScore.toFixed(1)}/5`);
  
  return {
    complexityScore: Math.round(complexityScore * 10) / 10,
    pricingTiers,
    products: Array.from(products),
    pricingModels: Array.from(pricingModels),
    hasEnterpriseCustom,
    reasoning,
  };
}

/**
 * Fetch and analyze a company's pricing page
 */
export async function fetchAndAnalyzePricing(
  baseUrl: string
): Promise<PricingComplexity | null> {
  try {
    // Try common pricing page URLs
    const pricingUrls = [
      `${baseUrl}/pricing`,
      `${baseUrl}/plans`,
      `${baseUrl}/products`,
      `${baseUrl}/plans-pricing`,
      baseUrl, // Fallback to homepage
    ];
    
    for (const url of pricingUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        
        if (response.ok) {
          const html = await response.text();
          console.log(`📊 Analyzing pricing from: ${url}`);
          return analyzePricingComplexity(html, url);
        }
      } catch (err) {
        // Try next URL
        continue;
      }
    }
    
    console.log(`⚠️ Could not fetch pricing page for ${baseUrl}`);
    return null;
    
  } catch (error: any) {
    console.error(`❌ Pricing analysis failed for ${baseUrl}:`, error.message);
    return null;
  }
}


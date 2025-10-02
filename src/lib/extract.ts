/**
 * Extraction logic for signals from website content
 * Keyword detection, role counting, technographics, etc.
 */

import { ExtractionResult } from '@/types';
import { fetchJobsAPI } from './fetchers';

// Keyword families (case-insensitive)
const PRICING_KEYWORDS = [
  'usage-based',
  'metered',
  'overage',
  'tier',
  'tiered',
  'enterprise',
  'custom pricing',
  'annual commit',
  'procurement',
  'volume discount',
  'pay as you go',
];

const SECURITY_KEYWORDS = [
  'SOC 2',
  'SOC2',
  'ISO 27001',
  'ISO27001',
  'HIPAA',
  'PCI',
  'PCI-DSS',
  'PII',
  'PHI',
  'GDPR',
  'compliance',
];

const ENTERPRISE_KEYWORDS = [
  'procurement',
  'custom pricing',
  'MSA',
  'master service agreement',
  'enterprise plan',
  'annual commit',
  'volume pricing',
  'dedicated support',
];

const PRODUCT_MODULE_KEYWORDS = [
  'module',
  'add-on',
  'addon',
  'SKU',
  'feature pack',
  'integration',
  'plan',
];

const REVOPS_ROLE_KEYWORDS = [
  'revops',
  'revenue operations',
  'deal desk',
  'pricing',
  'commercial strategy',
  'sales operations',
];

const TECH_STACK_KEYWORDS = [
  'stripe',
  'salesforce',
  'hubspot',
  'netsuite',
  'zuora',
  'chargebee',
];

/**
 * Extract keywords from text (case-insensitive substring match)
 */
function extractKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Count occurrences of module/product keywords
 */
function countModules(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  // Count explicit module mentions
  const moduleMatches = lowerText.match(/\bmodule\b/gi);
  if (moduleMatches) count += moduleMatches.length;

  // Count plan tiers
  const planMatches = lowerText.match(/\b(starter|basic|professional|enterprise|premium|plus)\s+(plan|tier)/gi);
  if (planMatches) count += planMatches.length;

  // Count add-ons
  const addonMatches = lowerText.match(/\badd-on\b/gi);
  if (addonMatches) count += addonMatches.length;

  return Math.min(count, 10); // Cap at 10
}

/**
 * Check if security content is recent (≤120 days)
 * Looks for dates in text or recent blog/news mentions
 */
function hasRecentSecurityUpdate(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Look for recent date mentions near security keywords
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  for (const month of months) {
    // Check for "Month YYYY" pattern near security keywords
    const pattern = new RegExp(`${month}\\s+(${currentYear}|${lastYear})`, 'i');
    const match = lowerText.match(pattern);
    if (match) {
      // Check if within 500 chars of a security keyword
      const matchIndex = lowerText.indexOf(match[0]);
      const contextBefore = lowerText.substring(Math.max(0, matchIndex - 500), matchIndex);
      const contextAfter = lowerText.substring(matchIndex, Math.min(lowerText.length, matchIndex + 500));
      const context = contextBefore + contextAfter;

      if (SECURITY_KEYWORDS.some((kw) => context.includes(kw.toLowerCase()))) {
        // Parse date and check if within 120 days
        const monthIndex = months.indexOf(month);
        const year = parseInt(match[1]);
        const dateFound = new Date(year, monthIndex, 1);
        const daysDiff = (Date.now() - dateFound.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 120) return true;
      }
    }
  }

  // Also check for "recently", "new", "just", "announced" near security keywords
  const recentTerms = ['recently', 'new', 'just achieved', 'announced', 'completed'];
  for (const term of recentTerms) {
    const pattern = new RegExp(`${term}.*?(${SECURITY_KEYWORDS.join('|')})`, 'i');
    if (pattern.test(lowerText)) return true;
  }

  return false;
}

/**
 * Count RevOps/Deal Desk/Pricing roles from jobs
 */
async function countRevOpsRoles(website: string): Promise<number> {
  try {
    const jobs = await fetchJobsAPI(website);
    if (!jobs || jobs.length === 0) return 0;

    let count = 0;
    for (const job of jobs) {
      const title = (job.title || job.text || '').toLowerCase();
      if (REVOPS_ROLE_KEYWORDS.some((kw) => title.includes(kw.toLowerCase()))) {
        count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Extract technographics (tech stack mentions)
 */
function extractTechnographics(text: string): string[] {
  return extractKeywords(text, TECH_STACK_KEYWORDS);
}

/**
 * Main extraction function
 * Analyzes fetched pages and returns structured signals
 */
export async function extractSignals(
  website: string,
  pages: Record<string, string | null>
): Promise<ExtractionResult> {
  const allText = Object.values(pages).filter((p) => p !== null).join('\n');

  // Extract keywords
  const pricingKeywords = extractKeywords(allText, PRICING_KEYWORDS);
  const securityKeywords = extractKeywords(allText, SECURITY_KEYWORDS);
  const enterpriseMotionKeywords = extractKeywords(allText, ENTERPRISE_KEYWORDS);

  // Count modules from pricing/products pages
  const pricingText = pages['/pricing'] || '';
  const productsText = pages['/products'] || pages['/platform'] || '';
  const moduleCount = countModules(pricingText + productsText);

  // Check for recent security updates
  const securityText = pages['/security'] || '';
  const hasRecentSecurity = hasRecentSecurityUpdate(securityText + allText);

  // Count RevOps roles
  const revOpsRoleCount = await countRevOpsRoles(website);

  // Extract technographics
  const technographics = extractTechnographics(allText);

  return {
    pricingKeywords,
    securityKeywords,
    enterpriseMotionKeywords,
    moduleCount,
    hasRecentSecurity,
    revOpsRoleCount,
    technographics,
  };
}

/**
 * Helper: Get evidence URL for a specific signal
 */
export function getEvidenceUrl(
  website: string,
  signalType: 'pricing' | 'security' | 'enterprise' | 'product'
): string {
  const baseUrl = new URL(website).origin;
  switch (signalType) {
    case 'pricing':
      return `${baseUrl}/pricing`;
    case 'security':
      return `${baseUrl}/security`;
    case 'enterprise':
      return `${baseUrl}/pricing`;
    case 'product':
      return `${baseUrl}/products`;
    default:
      return baseUrl;
  }
}


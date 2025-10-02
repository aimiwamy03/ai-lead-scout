/**
 * Deterministic scoring logic
 * ComplexityScore, WTPIndex, OpportunityScore, and reasoning
 */

import { ExtractionResult, ScoringReason, ScoringResult, Tier, CompanyData } from '@/types';
import { getEvidenceUrl } from './extract';

/**
 * Calculate Complexity Score (0-10)
 * Based on pricing model, product surface, org signals, compliance, and tech stack
 */
export function calculateComplexityScore(
  extraction: ExtractionResult,
  website: string
): { score: number; reasons: ScoringReason[] } {
  let score = 0;
  const reasons: ScoringReason[] = [];

  // Pricing model signals (max 4 points)
  if (extraction.pricingKeywords.includes('usage-based')) {
    score += 2;
    reasons.push({
      label: 'Usage-based pricing detected',
      evidence: getEvidenceUrl(website, 'pricing'),
      confidence: 'high',
    });
  }

  const hasHybridTier = extraction.pricingKeywords.some((kw) =>
    ['tier', 'tiered', 'overage', 'metered'].includes(kw)
  );
  if (hasHybridTier) {
    score += 1;
    reasons.push({
      label: 'Hybrid/tiered pricing model',
      evidence: getEvidenceUrl(website, 'pricing'),
      confidence: 'high',
    });
  }

  const hasEnterprise = extraction.pricingKeywords.includes('custom pricing') ||
    extraction.pricingKeywords.includes('enterprise');
  if (hasEnterprise) {
    score += 1;
    reasons.push({
      label: 'Enterprise custom pricing offered',
      evidence: getEvidenceUrl(website, 'pricing'),
      confidence: 'medium',
    });
  }

  // Product surface (max 3 points)
  if (extraction.moduleCount >= 4) {
    score += 1;
    reasons.push({
      label: `${extraction.moduleCount}+ product modules/plans`,
      evidence: getEvidenceUrl(website, 'product'),
      confidence: 'medium',
    });
  }

  if (extraction.moduleCount >= 3) {
    score += 2;
  }

  // Org signals: RevOps/Deal Desk/Pricing roles (max 2 points)
  if (extraction.revOpsRoleCount > 0) {
    score += Math.min(2, extraction.revOpsRoleCount);
    reasons.push({
      label: `${extraction.revOpsRoleCount} RevOps/Pricing role opening(s)`,
      evidence: `${website}/careers`,
      confidence: 'high',
    });
  }

  // Compliance/Sensitive data (max 2 points)
  if (extraction.securityKeywords.length > 0) {
    score += 2;
    const keywords = extraction.securityKeywords.slice(0, 2).join(', ');
    reasons.push({
      label: `Compliance requirements: ${keywords}`,
      evidence: getEvidenceUrl(website, 'security'),
      confidence: 'high',
    });
  }

  // Tech stack hints (max 2 points)
  if (extraction.technographics.length >= 2) {
    score += 2;
    const stack = extraction.technographics.slice(0, 2).join(', ');
    reasons.push({
      label: `Tech stack: ${stack}`,
      evidence: website,
      confidence: 'low',
    });
  }

  return {
    score: Math.min(10, Math.round(score * 10) / 10),
    reasons: reasons.slice(0, 3), // Top 3 reasons
  };
}

/**
 * Calculate WTP Index (0-10)
 * Based on funding round, investor quality, hiring, security milestones, enterprise motion
 */
export function calculateWTPIndex(
  companyData: CompanyData,
  extraction: ExtractionResult,
  website: string
): { score: number; reasons: ScoringReason[] } {
  let score = 0;
  const reasons: ScoringReason[] = [];

  // Round band: Series A/B with $10-60M (2 points)
  if (
    (companyData.round === 'A' || companyData.round === 'B') &&
    companyData.amount >= 10000000 &&
    companyData.amount <= 60000000
  ) {
    score += 2;
    const amountM = (companyData.amount / 1000000).toFixed(0);
    reasons.push({
      label: `Series ${companyData.round} ($${amountM}M) - growth stage`,
      evidence: website,
      confidence: 'high',
    });
  }

  // Investor quality (2 points)
  const investorWhitelist = JSON.parse(
    process.env.WTP_INVESTOR_WHITELIST || '[]'
  ) as string[];

  const hasTopInvestor = investorWhitelist.some((investor) =>
    companyData.investors.toLowerCase().includes(investor.toLowerCase())
  );

  if (hasTopInvestor) {
    score += 2;
    const matchedInvestor = investorWhitelist.find((inv) =>
      companyData.investors.toLowerCase().includes(inv.toLowerCase())
    );
    reasons.push({
      label: `Top-tier investor: ${matchedInvestor}`,
      evidence: website,
      confidence: 'high',
    });
  }

  // Role/hiring signal (2 points)
  if (extraction.revOpsRoleCount > 0) {
    score += 2;
  }

  // Recent security milestone ≤120 days (1 point)
  if (extraction.hasRecentSecurity) {
    score += 1;
    reasons.push({
      label: 'Recent security/compliance milestone',
      evidence: getEvidenceUrl(website, 'security'),
      confidence: 'medium',
    });
  }

  // Enterprise motion terms (2 points)
  const hasEnterpriseMotion = extraction.enterpriseMotionKeywords.length > 0;
  if (hasEnterpriseMotion) {
    score += 2;
    const terms = extraction.enterpriseMotionKeywords.slice(0, 2).join(', ');
    reasons.push({
      label: `Enterprise motion signals: ${terms}`,
      evidence: getEvidenceUrl(website, 'enterprise'),
      confidence: 'medium',
    });
  }

  return {
    score: Math.min(10, Math.round(score * 10) / 10),
    reasons: reasons.slice(0, 3), // Top 3 reasons
  };
}

/**
 * Calculate Opportunity Score
 * Formula: 0.6 × Complexity + 0.4 × WTP
 */
export function calculateOpportunityScore(
  complexityScore: number,
  wtpIndex: number
): number {
  const score = 0.6 * complexityScore + 0.4 * wtpIndex;
  return Math.round(score * 100) / 100; // 2 decimal places
}

/**
 * Determine tier based on opportunity score
 */
export function calculateTier(opportunityScore: number): Tier {
  if (opportunityScore >= 7.5) return 'Tier-1';
  if (opportunityScore >= 5.0) return 'Tier-2';
  return 'Backlog';
}

/**
 * Main scoring function
 * Returns complete scoring result with all metrics and reasons
 */
export function scoreCompany(
  companyData: CompanyData,
  extraction: ExtractionResult,
  website: string
): ScoringResult {
  // Calculate complexity
  const complexityResult = calculateComplexityScore(extraction, website);

  // Calculate WTP
  const wtpResult = calculateWTPIndex(companyData, extraction, website);

  // Calculate opportunity score
  const opportunityScore = calculateOpportunityScore(
    complexityResult.score,
    wtpResult.score
  );

  // Determine tier
  const tier = calculateTier(opportunityScore);

  // Combine reasons from both scores (prioritize highest confidence)
  const allReasons = [...complexityResult.reasons, ...wtpResult.reasons];
  const topReasons = allReasons
    .sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    })
    .slice(0, 5); // Max 5 reasons

  return {
    complexityScore: complexityResult.score,
    wtpIndex: wtpResult.score,
    opportunityScore,
    tier,
    reasons: topReasons,
  };
}

/**
 * Format reasons as bullet list for Airtable
 */
export function formatReasonsForAirtable(reasons: ScoringReason[]): string {
  return reasons
    .map(
      (r) =>
        `• ${r.label} (${r.confidence}) — ${r.evidence}`
    )
    .join('\n');
}


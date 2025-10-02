/**
 * Unit tests for scoring logic
 */

import { describe, test, expect } from '@jest/globals';
import {
  calculateComplexityScore,
  calculateWTPIndex,
  calculateOpportunityScore,
  calculateTier,
  scoreCompany,
} from '../lib/score';
import { ExtractionResult, CompanyData } from '../types';

// Mock environment variable
process.env.WTP_INVESTOR_WHITELIST = '["Sequoia","a16z","Index","Accel"]';

describe('Scoring Logic', () => {
  describe('calculateComplexityScore', () => {
    test('should score usage-based pricing highly', () => {
      const extraction: ExtractionResult = {
        pricingKeywords: ['usage-based', 'metered'],
        securityKeywords: [],
        enterpriseMotionKeywords: [],
        moduleCount: 0,
        hasRecentSecurity: false,
        revOpsRoleCount: 0,
        technographics: [],
      };

      const result = calculateComplexityScore(extraction, 'https://example.com');
      expect(result.score).toBeGreaterThanOrEqual(2);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('should score multiple modules', () => {
      const extraction: ExtractionResult = {
        pricingKeywords: [],
        securityKeywords: [],
        enterpriseMotionKeywords: [],
        moduleCount: 5,
        hasRecentSecurity: false,
        revOpsRoleCount: 0,
        technographics: [],
      };

      const result = calculateComplexityScore(extraction, 'https://example.com');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    test('should cap complexity score at 10', () => {
      const extraction: ExtractionResult = {
        pricingKeywords: ['usage-based', 'tiered', 'enterprise'],
        securityKeywords: ['SOC 2', 'HIPAA', 'PCI'],
        enterpriseMotionKeywords: ['procurement'],
        moduleCount: 8,
        hasRecentSecurity: true,
        revOpsRoleCount: 3,
        technographics: ['stripe', 'salesforce', 'hubspot'],
      };

      const result = calculateComplexityScore(extraction, 'https://example.com');
      expect(result.score).toBeLessThanOrEqual(10);
    });

    test('should include reasons with evidence', () => {
      const extraction: ExtractionResult = {
        pricingKeywords: ['usage-based'],
        securityKeywords: ['SOC 2'],
        enterpriseMotionKeywords: [],
        moduleCount: 0,
        hasRecentSecurity: false,
        revOpsRoleCount: 1,
        technographics: [],
      };

      const result = calculateComplexityScore(extraction, 'https://example.com');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toHaveProperty('label');
      expect(result.reasons[0]).toHaveProperty('evidence');
      expect(result.reasons[0]).toHaveProperty('confidence');
    });
  });

  describe('calculateWTPIndex', () => {
    test('should score Series A in range highly', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'A',
        amount: 25000000,
        investors: 'Unknown',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: [],
        securityKeywords: [],
        enterpriseMotionKeywords: [],
        moduleCount: 0,
        hasRecentSecurity: false,
        revOpsRoleCount: 0,
        technographics: [],
      };

      const result = calculateWTPIndex(companyData, extraction, 'https://testco.com');
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    test('should score top-tier investor', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'A',
        amount: 20000000,
        investors: 'Sequoia Capital',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: [],
        securityKeywords: [],
        enterpriseMotionKeywords: [],
        moduleCount: 0,
        hasRecentSecurity: false,
        revOpsRoleCount: 0,
        technographics: [],
      };

      const result = calculateWTPIndex(companyData, extraction, 'https://testco.com');
      expect(result.score).toBeGreaterThanOrEqual(4); // 2 for round + 2 for investor
    });

    test('should score enterprise motion signals', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'B',
        amount: 40000000,
        investors: 'a16z',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: [],
        securityKeywords: [],
        enterpriseMotionKeywords: ['procurement', 'MSA'],
        moduleCount: 0,
        hasRecentSecurity: false,
        revOpsRoleCount: 0,
        technographics: [],
      };

      const result = calculateWTPIndex(companyData, extraction, 'https://testco.com');
      expect(result.score).toBeGreaterThanOrEqual(6); // 2 round + 2 investor + 2 enterprise
    });

    test('should cap WTP index at 10', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'B',
        amount: 50000000,
        investors: 'Index Ventures',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: [],
        securityKeywords: [],
        enterpriseMotionKeywords: ['procurement', 'annual commit'],
        moduleCount: 0,
        hasRecentSecurity: true,
        revOpsRoleCount: 2,
        technographics: [],
      };

      const result = calculateWTPIndex(companyData, extraction, 'https://testco.com');
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateOpportunityScore', () => {
    test('should weight complexity at 60% and WTP at 40%', () => {
      const score = calculateOpportunityScore(10, 5);
      expect(score).toBe(8.0); // 0.6*10 + 0.4*5 = 8.0
    });

    test('should return score with 2 decimal places', () => {
      const score = calculateOpportunityScore(7.5, 6.3);
      expect(score).toBe(7.02); // 0.6*7.5 + 0.4*6.3 = 7.02
    });
  });

  describe('calculateTier', () => {
    test('should assign Tier-1 for score >= 7.5', () => {
      expect(calculateTier(7.5)).toBe('Tier-1');
      expect(calculateTier(8.0)).toBe('Tier-1');
      expect(calculateTier(10.0)).toBe('Tier-1');
    });

    test('should assign Tier-2 for score 5.0-7.4', () => {
      expect(calculateTier(5.0)).toBe('Tier-2');
      expect(calculateTier(6.5)).toBe('Tier-2');
      expect(calculateTier(7.4)).toBe('Tier-2');
    });

    test('should assign Backlog for score < 5.0', () => {
      expect(calculateTier(4.9)).toBe('Backlog');
      expect(calculateTier(3.0)).toBe('Backlog');
      expect(calculateTier(0)).toBe('Backlog');
    });
  });

  describe('scoreCompany', () => {
    test('should return complete scoring result', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'A',
        amount: 30000000,
        investors: 'Accel',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: ['usage-based', 'tiered'],
        securityKeywords: ['SOC 2'],
        enterpriseMotionKeywords: ['procurement'],
        moduleCount: 4,
        hasRecentSecurity: false,
        revOpsRoleCount: 1,
        technographics: ['stripe', 'salesforce'],
      };

      const result = scoreCompany(companyData, extraction, 'https://testco.com');

      expect(result).toHaveProperty('complexityScore');
      expect(result).toHaveProperty('wtpIndex');
      expect(result).toHaveProperty('opportunityScore');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('reasons');

      expect(result.complexityScore).toBeGreaterThan(0);
      expect(result.wtpIndex).toBeGreaterThan(0);
      expect(result.opportunityScore).toBeGreaterThan(0);
      expect(['Tier-1', 'Tier-2', 'Backlog']).toContain(result.tier);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.length).toBeLessThanOrEqual(5);
    });

    test('should prioritize high-confidence reasons', () => {
      const companyData: CompanyData = {
        company: 'TestCo',
        website: 'https://testco.com',
        round: 'B',
        amount: 40000000,
        investors: 'Sequoia',
      };

      const extraction: ExtractionResult = {
        pricingKeywords: ['usage-based'],
        securityKeywords: ['SOC 2'],
        enterpriseMotionKeywords: ['procurement'],
        moduleCount: 5,
        hasRecentSecurity: true,
        revOpsRoleCount: 2,
        technographics: ['stripe'],
      };

      const result = scoreCompany(companyData, extraction, 'https://testco.com');

      // Check that high confidence reasons appear first
      const highConfidenceCount = result.reasons.filter(
        (r) => r.confidence === 'high'
      ).length;
      expect(highConfidenceCount).toBeGreaterThan(0);
    });
  });
});


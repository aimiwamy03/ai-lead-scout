import type { NextApiRequest, NextApiResponse } from 'next';
import { getDiscoveryCompanies, SAAS_COMPANIES } from '@/lib/discover';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { limit = 5, minFunding = 5000000, minEmployees = 30 } = req.query;

  const companies = getDiscoveryCompanies({
    limit: Number(limit),
    minFunding: Number(minFunding),
    minEmployees: Number(minEmployees),
  });

  return res.status(200).json({
    totalCompaniesInDatabase: SAAS_COMPANIES.length,
    filters: { limit, minFunding, minEmployees },
    matchingCompanies: companies.length,
    companies: companies.map(c => ({
      name: c.name,
      employees: c.estimatedEmployees,
      funding: c.fundingTotal,
    })),
  });
}


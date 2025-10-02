/**
 * Fetchers for RSS feeds, GDELT, and website content
 * Includes rate limiting and robots.txt respect
 */

import Parser from 'rss-parser';
import axios from 'axios';
import robotsParser from 'robots-parser';
import { FeedItem, CompanyData, Round } from '@/types';

const RSS_PARSER = new Parser();
const USER_AGENT = 'DealopsScout/1.0 (+https://dealops.example)';

/**
 * Delay utility for rate limiting
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check robots.txt and cache results
 */
const robotsCache = new Map<string, any>();

async function canFetchUrl(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    if (!robotsCache.has(urlObj.host)) {
      try {
        const response = await axios.get(robotsUrl, {
          timeout: 5000,
          headers: { 'User-Agent': USER_AGENT },
        });
        const robots = robotsParser(robotsUrl, response.data);
        robotsCache.set(urlObj.host, robots);
      } catch {
        // If robots.txt doesn't exist, assume allowed
        robotsCache.set(urlObj.host, null);
      }
    }

    const robots = robotsCache.get(urlObj.host);
    if (!robots) return true;

    return robots.isAllowed(url, USER_AGENT) !== false;
  } catch {
    return true; // Allow on error
  }
}

/**
 * Fetch RSS feed items
 */
export async function fetchRSSFeed(feedUrl: string): Promise<FeedItem[]> {
  try {
    const feed = await RSS_PARSER.parseURL(feedUrl);
    return feed.items.slice(0, 10).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      description: item.contentSnippet || item.description || '',
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Fetch Google Alerts RSS feeds for funding news
 */
export async function fetchGoogleAlertFeeds(): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];
  
  // Define all RSS feed sources (fast & reliable only)
  const feedSources = [
    // Custom Google Alerts (if configured)
    process.env.GOOGLE_ALERTS_SERIES_A,
    process.env.GOOGLE_ALERTS_SERIES_B,
    
    // Google News RSS feeds - SaaS & AI funding (FAST)
    'https://news.google.com/rss/search?q=%22Series+A%22+SaaS+funding+United+States+-India+-China&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=%22Series+B%22+SaaS+funding+United+States+-India+-China&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=%22Series+A%22+%22AI%22+funding+United+States+-India+-China&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=(%22Seed+funding%22+%22SaaS%22)+(United+States)-India-China&hl=en-US&gl=US&ceid=US:en',
    
    // Tech news outlets (FAST & RELIABLE)
    'https://techcrunch.com/tag/funding/feed/',
    'https://techcrunch.com/startups/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://news.crunchbase.com/feed/',
    
    // Press release wires (FAST)
    'https://www.prnewswire.com/rss/news-releases-list.rss',
    
    // REMOVED: VentureBeat (429 rate limiting)
    // REMOVED: BusinessWire (60s timeouts)
  ];
  
  // Fetch all feeds with shorter delays (200ms = 4x faster)
  for (const feedUrl of feedSources) {
    if (!feedUrl) continue; // Skip if env var not set
    
    try {
      const items = await fetchRSSFeed(feedUrl);
      allItems.push(...items);
      await delay(200); // Fast but still respectful
    } catch (error) {
      console.log(`Skipping unavailable feed: ${feedUrl.substring(0, 50)}...`);
    }
  }
  
  // Deduplicate by URL (many sources will have same articles)
  const seenUrls = new Set<string>();
  const uniqueItems = allItems.filter(item => {
    if (seenUrls.has(item.link)) {
      return false; // Skip duplicate
    }
    seenUrls.add(item.link);
    return true;
  });
  
  console.log(`Fetched ${allItems.length} total items, ${uniqueItems.length} unique after deduplication`);
  
  return uniqueItems;
}

/**
 * Fetch GDELT news items for funding announcements
 */
export async function fetchGDELTNews(): Promise<FeedItem[]> {
  try {
    // GDELT API query for funding news in last 72 hours
    const hoursAgo = 72;
    const now = new Date();
    const startDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');

    // Example GDELT query (simplified - real implementation would use GDELT API)
    const query = encodeURIComponent('(funding OR "Series A" OR "Series B") AND (SaaS OR AI)');
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&startdatetime=${startDateStr}000000&format=json`;

    const response = await axios.get(gdeltUrl, {
      timeout: 10000,
      headers: { 'User-Agent': USER_AGENT },
    });

    const articles = response.data?.articles || [];

    return articles.slice(0, 10).map((article: any) => {
      // Parse GDELT date format: YYYYMMDDHHMMSS -> JavaScript Date
      let pubDate = new Date();
      if (article.seendate) {
        try {
          const dateStr = article.seendate.toString();
          // Extract: YYYY-MM-DD HH:MM:SS from YYYYMMDDHHMMSS
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = dateStr.substring(8, 10) || '00';
          const minute = dateStr.substring(10, 12) || '00';
          const second = dateStr.substring(12, 14) || '00';
          pubDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
          
          // Validate the date
          if (isNaN(pubDate.getTime())) {
            pubDate = new Date(); // Fallback to current date if invalid
          }
        } catch {
          pubDate = new Date(); // Fallback on error
        }
      }
      
      return {
        title: article.title || '',
        link: article.url || '',
        pubDate,
        description: article.socialimage || '',
      };
    });
  } catch (error) {
    console.error('Failed to fetch GDELT news:', error);
    return [];
  }
}

/**
 * Fetch all funding news from configured sources
 * Deduplicates and returns top 30 most recent items
 */
export async function fetchAllFundingNews(): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];

  // Google News + Tech outlets (now includes 12+ sources)
  try {
    const googleItems = await fetchGoogleAlertFeeds();
    allItems.push(...googleItems);
  } catch (error) {
    console.error('Google News/Tech feeds failed:', error);
  }

  // GDELT (international coverage)
  try {
    const gdeltItems = await fetchGDELTNews();
    allItems.push(...gdeltItems);
  } catch (error) {
    console.error('GDELT fetch failed:', error);
  }

  // Global deduplication by link (across all sources)
  const uniqueItems = Array.from(
    new Map(allItems.map((item) => [item.link, item])).values()
  );
  
  console.log(`Total: ${allItems.length} items → ${uniqueItems.length} unique → Processing top 30`);

  // Return top 30 most recent items
  return uniqueItems
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);
}

/**
 * Parse company data from news item
 * Extract company name, round, amount, investors from title/description
 */
export function parseCompanyData(item: FeedItem): CompanyData | null {
  const text = `${item.title} ${item.description || ''}`;

  // Must have funding keywords to be relevant
  const hasFundingKeywords = /\b(raises?|raised|secures?|secured|closes?|closed|funding|investment|round|Series|Seed)\b/i.test(text);
  if (!hasFundingKeywords) return null;

  // Extract amount (e.g., $20M, $20 million, ₹137 Cr, $400,000, $100M)
  let amount = 0;
  
  // Try various formats
  const dollarM = text.match(/\$(\d+(?:[,.]?\d+)?)\s*(?:M|million)/i);
  const rupeeCr = text.match(/₹(\d+(?:[,.]?\d+)?)\s*Cr/i);
  const dollarK = text.match(/\$(\d+(?:[,.]?\d+)?)\s*(?:K|,000)/i);
  const dollarB = text.match(/\$(\d+(?:[,.]?\d+)?)\s*(?:B|billion)/i);
  
  if (dollarB) {
    amount = parseFloat(dollarB[1].replace(/,/g, '')) * 1000000000;
  } else if (dollarM) {
    amount = parseFloat(dollarM[1].replace(/,/g, '')) * 1000000;
  } else if (rupeeCr) {
    amount = parseFloat(rupeeCr[1].replace(/,/g, '')) * 10000000 / 83; // Convert INR Cr to USD (approx)
  } else if (dollarK) {
    amount = parseFloat(dollarK[1].replace(/,/g, '')) * 1000;
  }

  // Extract round - flexible patterns
  let round: Round = 'Seed'; // Default
  const roundMatch = text.match(/Series\s+([ABC])/i);
  if (roundMatch) {
    round = roundMatch[1].toUpperCase() as Round;
  } else if (/\bSeed\b/i.test(text)) {
    round = 'Seed';
  } else if (amount >= 20000000) {
    // Infer from amount: >$20M likely Series B, >$10M likely Series A
    round = amount >= 50000000 ? 'B' : 'A';
  }

  // Extract company name - try MANY patterns to catch different formats
  let company = 'Unknown Company';
  
  // Pattern 1: "Location : Company raises..." (e.g., "India : Recur Club raises")
  let match = text.match(/^[A-Z][a-z]+\s*:\s*([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\s+(?:raises?|secures?|closes?|gets)/i);
  if (match) {
    company = match[1].trim();
  } else {
    // Pattern 2: "Company raises/closes/secures" (start of title)
    match = text.match(/^([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\s+(?:raises?|secures?|closes?|gets|announces)/i);
    if (match) {
      company = match[1].trim();
    } else {
      // Pattern 3: "startup Company raises" or "startup called Company"
      match = text.match(/\bstartup\s+(?:called\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+(?:raises?|secures?)/i);
      if (match) {
        company = match[1].trim();
      } else {
        // Pattern 4: "X-backed Company raises"
        match = text.match(/\w+-backed\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+raises?/i);
        if (match) {
          company = match[1].trim();
        } else {
          // Pattern 5: "Company, the [description], raises"
          match = text.match(/^([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}),\s+(?:the|an?)\s+/i);
          if (match) {
            company = match[1].trim();
          } else {
            // Pattern 6: Look for company name before "raises" anywhere in text
            match = text.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+raises?\s+\$/i);
            if (match) {
              company = match[1].trim();
            } else {
              // Pattern 7: Extract first 1-3 capitalized words (fallback)
              match = text.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\b/);
              if (match) {
                company = match[1].trim();
              }
            }
          }
        }
      }
    }
  }

  // Filter out common false positives (articles, prepositions, etc.)
  const stopWords = ['How', 'The', 'What', 'Why', 'When', 'Where', 'This', 'That', 'These', 'Those', 'With', 'From', 'After'];
  if (stopWords.includes(company)) {
    return null;
  }

  // Extract investors (look for "led by" or "from")
  const investorMatch = text.match(/(?:led by|from)\s+([A-Z][^.]+)/i);
  const investors = investorMatch ? investorMatch[1].trim() : '';

  return {
    company,
    website: '', // Will be resolved separately
    round,
    amount,
    investors,
  };
}

/**
 * Resolve company website from company name
 * Simple heuristic: try common patterns
 */
export async function resolveWebsite(companyName: string): Promise<string> {
  const normalized = companyName.toLowerCase().replace(/\s+/g, '');
  const candidates = [
    `https://${normalized}.com`,
    `https://www.${normalized}.com`,
    `https://${normalized}.io`,
    `https://get${normalized}.com`,
  ];

  for (const url of candidates) {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 3,
        headers: { 'User-Agent': USER_AGENT },
      });

      if (response.status === 200) {
        return response.request.res.responseUrl || url;
      }
    } catch {
      continue;
    }
    await delay(500);
  }

  return `https://${normalized}.com`; // Fallback
}

/**
 * Fetch HTML content from URL with retries and robots.txt check
 */
export async function fetchWebsiteContent(
  url: string,
  retries = 3
): Promise<string | null> {
  // Check robots.txt
  const allowed = await canFetchUrl(url);
  if (!allowed) {
    console.log(`Robots.txt disallows fetching ${url}`);
    return null;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html',
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Don't retry 404s
      }

      if (attempt === retries - 1) {
        console.error(`Failed to fetch ${url} after ${retries} attempts`);
        return null;
      }

      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }

  return null;
}

/**
 * Fetch multiple paths from a website (pricing, products, security)
 * Returns map of path -> content (null if not found)
 */
export async function fetchCompanyPages(
  baseUrl: string
): Promise<Record<string, string | null>> {
  const paths = ['/pricing', '/products', '/platform', '/security', '/careers'];
  const results: Record<string, string | null> = {};

  for (const path of paths) {
    try {
      const url = new URL(path, baseUrl).href;
      const content = await fetchWebsiteContent(url);
      results[path] = content;
      await delay(1000); // Rate limit between requests
    } catch (error) {
      results[path] = null;
    }
  }

  return results;
}

/**
 * Fetch Greenhouse or Lever jobs JSON
 */
export async function fetchJobsAPI(website: string): Promise<any[]> {
  const baseUrl = new URL(website).origin;

  // Try Greenhouse
  try {
    const ghUrl = `${baseUrl}/api/v1/jobs`;
    const ghResponse = await axios.get(ghUrl, {
      timeout: 5000,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (Array.isArray(ghResponse.data)) {
      return ghResponse.data;
    }
  } catch {
    // Continue to Lever
  }

  // Try Lever
  try {
    const leverUrl = `https://api.lever.co/v0/postings/${website.split('//')[1].split('.')[0]}?mode=json`;
    const leverResponse = await axios.get(leverUrl, {
      timeout: 5000,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (Array.isArray(leverResponse.data)) {
      return leverResponse.data;
    }
  } catch {
    // Jobs API not available
  }

  return [];
}


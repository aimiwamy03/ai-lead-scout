/**
 * Contact Finder - Find decision maker contacts for companies
 * Uses GPT-4 to intelligently find/suggest contact information
 */

const https = require('https');

export interface ContactInfo {
  name: string;
  title: string;
  email: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Find decision maker contact for a company
 * Uses GPT-4 to research and suggest the best contact
 */
export async function findDecisionMaker(
  companyName: string,
  website: string,
  industry: string,
  fundingAmount?: number
): Promise<ContactInfo | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('⚠️  No OpenAI API key, skipping contact finding');
      return generateFallbackContact(companyName, website);
    }

    // Use GPT-4 to find contact information
    const prompt = `You are a B2B sales research assistant. Find the most likely decision maker for a deal desk/pricing tool at this company.

Company: ${companyName}
Website: ${website}
Industry: ${industry}
Funding: ${fundingAmount ? `$${(fundingAmount / 1000000).toFixed(0)}M` : 'Unknown'}

Target Decision Maker: The person who would buy a deal desk automation tool. Usually:
- CFO (for larger companies with complex pricing)
- VP of Finance
- Head of Revenue Operations
- VP of Sales Operations

Research and return the MOST LIKELY contact in this JSON format:
{
  "name": "John Smith",
  "title": "CFO",
  "email": "john.smith@${website.replace('https://', '').replace('http://', '').split('/')[0]}",
  "confidence": "medium"
}

Rules:
1. Use real, publicly available information if you know it
2. If you don't know the actual person, make an educated guess based on company size/industry
3. For email, use common formats: firstname.lastname@domain.com or first.last@domain.com
4. Set confidence: "high" if you know the person, "medium" if educated guess, "low" if pure speculation
5. Return ONLY the JSON, no other text

CRITICAL: Return ONLY valid JSON, nothing else.`;

    const response = await new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a B2B sales research assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
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
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️  Failed to parse contact from GPT-4, using fallback');
      return generateFallbackContact(companyName, website);
    }

    const contact = JSON.parse(jsonMatch[0]);
    console.log(`✅ Found contact: ${contact.name} (${contact.title}) - ${contact.confidence} confidence`);
    
    return contact;

  } catch (error: any) {
    console.error('Contact finder error:', error.message);
    return generateFallbackContact(companyName, website);
  }
}

/**
 * Generate fallback contact using common patterns
 */
function generateFallbackContact(companyName: string, website: string): ContactInfo {
  const domain = website.replace('https://', '').replace('http://', '').split('/')[0];
  
  // Common email patterns for finance/ops contacts
  const emailPatterns = [
    `finance@${domain}`,
    `revenue@${domain}`,
    `sales@${domain}`,
    `contact@${domain}`,
  ];

  return {
    name: 'Finance Team',
    title: 'CFO / VP Finance',
    email: emailPatterns[0],
    confidence: 'low'
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


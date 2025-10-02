/**
 * AI-powered email drafter using OpenAI
 * Generates personalized outreach emails based on company context
 */

import OpenAI from 'openai';

export interface EmailDraft {
  subject: string;
  body: string;
  reasoning: string;
}

/**
 * Generate personalized email using AI
 */
export async function generatePersonalizedEmail(
  companyName: string,
  website: string,
  complexityScore: number,
  opportunityScore: number,
  category?: string,
  sourceTitle?: string
): Promise<EmailDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });

  // Build context for the AI
  const context = `
Company: ${companyName}
Website: ${website}
Category: ${category || 'B2B SaaS'}
Complexity Score: ${complexityScore}/5 (pricing/product complexity)
Opportunity Score: ${opportunityScore}/10 (fit for Dealops)
Additional Info: ${sourceTitle || 'N/A'}

Target: VP of Sales, Head of Sales Ops, or Revenue Operations
Goal: Book a 15-min demo of Dealops (CPQ/deal desk automation platform)
Tone: Professional, consultative, not salesy
`;

  const prompt = `You are writing a personalized outreach email for Dealops, a modern CPQ and deal desk automation platform.

${context}

Write a SHORT, personalized email (150-200 words max) that:

1. **Opening**: Reference something specific about their company (scale, category, or growth)
2. **Problem**: Mention a pain point relevant to their complexity level:
   - High complexity (4-5): "managing custom pricing, enterprise quotes, multi-product configurations"
   - Medium complexity (3): "streamlining quote approvals and pricing consistency"
   - Lower complexity (1-2): "scaling your sales operations"
3. **Solution**: Briefly mention how Dealops helps (automated quotes, pricing rules, approval workflows)
4. **CTA**: Suggest a quick 15-min call to explore fit
5. **Calendly link**: Include {{CALENDLY_LINK}} placeholder

Guidelines:
- Keep it conversational and specific (not generic)
- No buzzwords or hype ("game-changer", "revolutionary", etc.)
- Focus on their likely pain points based on complexity
- End with a soft CTA (not pushy)

Return ONLY a JSON object:
{
  "subject": "<personalized subject line (5-8 words)>",
  "body": "<email body with {{CALENDLY_LINK}} placeholder>",
  "reasoning": "<1 sentence explaining your approach>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B sales email writer. Write concise, personalized emails that get responses. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Slightly creative for personalization
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const draft = JSON.parse(content) as EmailDraft;

    // Validate
    if (!draft.subject || !draft.body) {
      throw new Error('Invalid email draft structure');
    }

    console.log(`✅ AI drafted email for ${companyName}`);
    console.log(`Subject: ${draft.subject}`);
    console.log(`Reasoning: ${draft.reasoning}`);

    return draft;
  } catch (error: any) {
    console.error('AI email generation failed:', error.message);
    
    // Fallback to template-based email
    return generateFallbackEmail(companyName, website, complexityScore);
  }
}

/**
 * Fallback email template (if AI fails)
 */
function generateFallbackEmail(
  companyName: string,
  website: string,
  complexityScore: number
): EmailDraft {
  const painPoint =
    complexityScore >= 4
      ? 'managing complex pricing configurations and custom enterprise quotes'
      : complexityScore >= 3
      ? 'streamlining quote approvals and maintaining pricing consistency'
      : 'scaling your sales operations';

  const subject = `Dealops for ${companyName}`;
  const body = `Hi there,

I noticed ${companyName} has been growing quickly, and I imagine ${painPoint} is becoming increasingly challenging.

Dealops helps B2B SaaS companies like yours automate deal desk workflows—from quote generation to approval routing to contract creation. Teams typically save 10+ hours/week and close deals faster.

Would you be open to a quick 15-min call to explore if Dealops could help ${companyName}?

Book time here: {{CALENDLY_LINK}}

Best regards,
The Dealops Team`;

  return {
    subject,
    body,
    reasoning: 'Fallback template (AI unavailable)',
  };
}


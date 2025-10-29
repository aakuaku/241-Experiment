import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

let geminiClient: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_API_KEY) {
  geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

// Helper function to format table data as text for AI context
function getTableDataForTask(taskId: string): string {
  switch (taskId) {
    case 'task-1':
      return `CUSTOMER FEEDBACK DATA:

Sample Feedback (10 examples out of 500 total):
- ⭐⭐⭐⭐⭐ "Love the new interface! Much easier to use than before."
- ⭐⭐⭐⭐ "Good product but wish it loaded faster on mobile."
- ⭐⭐ "Customer service response time needs improvement."
- ⭐⭐⭐⭐⭐ "Best tool I've used for this purpose. Highly recommend!"
- ⭐⭐ "Had some bugs with the latest update. Hope they fix it soon."
- ⭐⭐⭐⭐ "Works well overall, but the pricing seems high for what you get."
- ⭐⭐⭐⭐⭐ "Excellent features! The analytics dashboard is exactly what I needed."
- ⭐⭐⭐ "It's okay, but there are better alternatives out there."
- ⭐⭐⭐⭐ "Great product! Just needs better documentation."
- ⭐⭐ "Frustrated with the login issues. Can't access my account sometimes."

Overall Statistics:
- Total responses: 500
- Average rating: 3.4/5
- 5-star: 180 (36%)
- 4-star: 150 (30%)
- 3-star: 80 (16%)
- 2-star: 60 (12%)
- 1-star: 30 (6%)`;

    case 'task-2':
      return `MARKETING STRATEGY COMPARISON:

Strategy A: Social Media Advertising
- Budget: $50,000
- Platforms: Facebook, Instagram, LinkedIn
- Expected reach: 2-3 million impressions
- Target audience: Ages 25-45, professionals
- Duration: 3 months
- Previous campaign results: 3.2% click-through rate, $15 cost per acquisition

Strategy B: Content Marketing & SEO
- Budget: $50,000
- Approach: Blog posts, SEO optimization, email newsletters
- Expected reach: 500K-1M monthly organic visitors
- Target audience: Ages 30-50, decision-makers
- Duration: 6 months (longer-term investment)
- Previous campaign results: 2.1% conversion rate, $8 cost per acquisition

Industry Context:
- Competitors spend 60% on social media, 40% on content
- Content marketing typically takes 3-6 months to show results
- Social media provides faster but shorter-term visibility`;

    case 'task-3':
      return `MARKET RESEARCH DATA:

Preference vs. Behavior Gap by Age:
- Ages 18-25: 52% stated preference, 28% actual purchase (24% gap)
- Ages 25-35: 65% stated preference, 18% actual purchase (47% gap)
- Ages 35-50: 70% stated preference, 25% actual purchase (45% gap)
- Ages 50+: 72% stated preference, 21% actual purchase (51% gap)

Income Factors:
- High income (>$75k): 45% purchase rate
- Middle income ($40-75k): 22% purchase rate
- Lower income (<$40k): 12% purchase rate

Key Findings:
- 68% say they would pay more for eco-friendly products
- Only 23% actually purchased eco-friendly alternatives in the past year
- Price is the main barrier cited by 78% of non-purchasers
- Convenience is the second barrier cited by 45%`;

    case 'task-4':
      return `MARKET EXPANSION DATA:

Sales Data (Similar Launches):
- Market A (similar size): 40% faster growth than expected
- Market B (similar demographics): 15% slower adoption
- Market C (similar competition): Broke even in 8 months

Economic Indicators (Target Market):
- GDP growth: 3.2% (above average)
- Unemployment: 4.1% (low)
- Median household income: $58,000
- Population growth: +2.3% annually

Competitor Analysis:
- 3 major competitors already present
- Market leader has 45% market share
- Average pricing: 15% higher than your current market
- Competitors invest heavily in local marketing

Internal Data:
- Production capacity: Can handle 30% increase
- Current profit margin: 22%
- Marketing budget available: $200,000
- Team capacity: Limited, would need to hire 2-3 people`;

    case 'task-5':
      return `BUSINESS PROPOSAL SUMMARY:

Product Concept: Mobile app connecting local food vendors with nearby customers
- Features: Real-time location-based vendor discovery, order placement and payment, delivery tracking, customer reviews

Market Information:
- Claims to target a $2B market
- Cites 45% year-over-year growth in food delivery apps
- Estimates 500K potential users in target cities

Business Model:
- Commission-based: 15% of each transaction
- Vendor subscription: $99/month optional premium tier
- Projected revenue: $2M in year 1, $8M in year 2

Competition:
- 3 established players (DoorDash, Uber Eats, Grubhub) dominate market
- Combined market share: ~85%
- Newer entrants struggle to gain traction

Funding Ask:
- $500K investment for 20% equity
- Valuation: $2.5M pre-money
- Use of funds: Marketing (60%), development (30%), operations (10%)

Team:
- 2 co-founders with technical backgrounds
- No prior food industry experience
- 1 advisor from a successful delivery startup`;

    case 'task-6':
      return `WEBSITE METRICS COMPARISON (Before vs After Checkout Change):

Traffic:
- Before: 50,000 monthly visitors
- After: 57,500 monthly visitors (+15%)

Engagement:
- Before: Average 2.3 pages per session
- After: Average 3.1 pages per session (+35%)
- Before: Average time on site: 3:45
- After: Average time on site: 5:20 (+42%)

Checkout Metrics:
- Before: 12% checkout completion rate
- After: 11.04% checkout completion rate (-8%)
- Before: Average checkout time: 4:30
- After: Average checkout time: 6:15 (+37%)

Page-Specific Data:
- Product pages: +25% time spent, +18% views
- Cart page: +45% time spent, -12% views
- Checkout page: +60% time spent, -15% completion

Device Breakdown:
- Desktop: -5% checkout completion
- Mobile: -12% checkout completion
- Tablet: -3% checkout completion`;

    case 'task-7':
      return `PRODUCT FEATURE COMPARISON:

Feature A: Advanced Analytics Dashboard
- Development time: 3 months
- Team required: 2 developers, 1 designer
- Expected user adoption: 35%
- Maintenance cost: Low ($5K/year)
- Competitive advantage: Moderate
- User request frequency: High (requested by 42% of enterprise customers)
- Revenue impact: +$50K/year (estimated from premium tier)

Feature B: Mobile App Integration
- Development time: 4 months
- Team required: 3 developers, 1 designer, 1 QA
- Expected user adoption: 55%
- Maintenance cost: Medium ($15K/year)
- Competitive advantage: High
- User request frequency: Very high (requested by 68% of all users)
- Revenue impact: +$120K/year (estimated from increased engagement)

Strategic Context:
- Competitors already have mobile apps
- Enterprise customers are demanding analytics
- Mobile usage is growing 25% year-over-year
- Analytics could differentiate in B2B market

Resource Constraints:
- Can only pursue one feature this quarter
- Limited development capacity
- Must deliver within 4 months`;

    case 'task-8':
      return `SURVEY RESULTS DATA:

Work Arrangement Satisfaction:
- Remote workers: 58% satisfied
- Hybrid workers: 52% satisfied
- Office workers: 32% satisfied

Productivity Metrics:
- Remote workers: 12% higher productivity than office workers
- Collaboration scores: Remote workers 8% lower than office workers
- Employee turnover: 15% lower for remote workers than office workers
- Meeting effectiveness: Office workers 10% higher than remote workers

Survey Responses:
- 72% say work-life balance is "very important"
- 45% report being "satisfied" with their current balance
- 38% work more than 50 hours per week
- 67% say flexible hours would improve satisfaction
- 54% want option to work remotely
- 45% want better time-off policies`;

    default:
      return '';
  }
}

export async function POST(req: NextRequest) {
  let errorDetails: string | null = null;
  
  try {
    const { modelId, messages, taskDescription, taskId } = await req.json();

    if (!modelId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, messages' },
        { status: 400 }
      );
    }

    // Convert messages to format expected by each API
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map((msg: { role: string; content: string }) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

    // Get table data for the task
    const tableData = taskId ? getTableDataForTask(taskId) : '';

    // Include task description and table data in system message if provided
    let systemMessage = '';
    if (taskDescription) {
      systemMessage = `You are helping someone with this analysis task: ${taskDescription}\n\n`;
      if (tableData) {
        systemMessage += `The following data tables are available for this task:\n\n${tableData}\n\n`;
      }
      systemMessage += `Your role is to guide and educate them, helping them understand the problem and work through solutions step by step. Rather than just providing answers, focus on:\n- Explaining concepts and approaches\n- Breaking down the problem into smaller parts\n- Suggesting ways to think about the solution\n- Providing guidance and hints rather than complete solutions\n- Helping them learn and understand the underlying principles\n\nImportant: Even if the user greets you or asks simple questions, acknowledge the task context and offer to help them get started. For example, if they say "hello", respond by acknowledging the task and asking how you can help them begin working on it.\n\nEncourage them to think through the problem themselves while providing helpful guidance and explanations. When answering questions, reference specific data points from the tables above to support your guidance.`;
    } else {
      systemMessage = 'You are a helpful AI assistant focused on teaching and guiding people through analysis tasks. Help them understand problems and work through solutions step by step, rather than just providing answers. Encourage learning and understanding.';
    }

    let response: string = '';

    switch (modelId) {
      case 'model-1': // OpenAI GPT
        try {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
          }
          const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4o', // Using gpt-4o (GPT-4 Omni) which is the latest model
            messages: [
              { role: 'system', content: systemMessage },
              ...conversationMessages,
            ],
            temperature: 0.7,
          });
          response = openaiResponse.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        } catch (error: any) {
          console.error('OpenAI API error:', error);
          errorDetails = error.message || 'Unknown error';
          throw error;
        }
        break;

      case 'model-2': // Anthropic Claude
        try {
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key not configured');
          }
          const anthropicMessages = conversationMessages.map(msg => ({
            role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.content,
          }));
          const claudeResponse = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 1024,
            system: systemMessage,
            messages: anthropicMessages,
          });
          response = claudeResponse.content[0]?.type === 'text'
            ? claudeResponse.content[0].text
            : 'Sorry, I could not generate a response.';
        } catch (error: any) {
          console.error('Anthropic API error:', error);
          errorDetails = error.message || 'Unknown error';
          throw error;
        }
        break;

      case 'model-3': // Google Gemini
        try {
          if (!geminiClient || !process.env.GOOGLE_API_KEY) {
            throw new Error('Google API key not configured');
          }
          
          // Build the full prompt with system message and conversation history
          let fullPrompt = systemMessage + '\n\n';
          for (const msg of conversationMessages) {
            fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
          }
          fullPrompt += 'Assistant:';
          
          // Try different model names in order - using newer Gemini 2.0 models
          const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
          let lastError: any = null;
          
          for (const modelName of modelsToTry) {
            try {
              const geminiModel = geminiClient.getGenerativeModel({ model: modelName });
              const result = await geminiModel.generateContent(fullPrompt);
              const geminiResponse = result.response;
              response = geminiResponse.text() || 'Sorry, I could not generate a response.';
              break; // Success, exit loop
            } catch (err: any) {
              lastError = err;
              // If this is not a model-not-found error, throw immediately
              if (!err.message?.includes('not found') && !err.message?.includes('404') && !err.message?.includes('is not found')) {
                throw err;
              }
              // Otherwise, try next model
              continue;
            }
          }
          
          // If we get here and response is not set, all models failed
          if (!response) {
            throw lastError || new Error('No available Gemini model found. Please check your API key has access to Gemini models.');
          }
        } catch (error: any) {
          console.error('Google Gemini API error:', error);
          errorDetails = error.message || 'Unknown error';
          throw error;
        }
        break;

      case 'model-4': // Grok (xAI)
        try {
          if (!process.env.XAI_API_KEY) {
            throw new Error('xAI API key not configured');
          }
          // Try the correct xAI API endpoint
          const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'grok-3',
              messages: [
                { role: 'system', content: systemMessage },
                ...conversationMessages,
              ],
              temperature: 0.7,
            }),
          });
          
          if (!grokResponse.ok) {
            const errorText = await grokResponse.text();
            console.error('Grok API error response:', errorText);
            throw new Error(`Grok API returned ${grokResponse.status}: ${errorText}`);
          }
          
          const grokData = await grokResponse.json();
          
          if (grokData.error) {
            throw new Error(grokData.error.message || 'Grok API error');
          }
          
          response = grokData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        } catch (error: any) {
          console.error('Grok API error:', error);
          errorDetails = error.message || 'Unknown error';
          throw error;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown model ID' },
          { status: 400 }
        );
    }

    if (!response) {
      throw new Error('No response generated from AI model');
    }

    return NextResponse.json({ response }, { status: 200 });
  } catch (error: any) {
    console.error('Error calling AI model:', error);
    // Ensure errorDetails is available even if it wasn't set in a case block
    const errorMessage = errorDetails || error.message || 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to get AI response', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

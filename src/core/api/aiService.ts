// Sovereign Client-Side AI Intelligence Service (Google Gemini API Integration)
// Preserves client-side privacy with direct browser-to-Gemini REST calls and regulatory guardrails

import { Holding } from '../../data/types';
import { formatINR, formatPercent } from '../math/xirr';
import { VaultStorage } from '../../data/storage';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isInterception?: boolean;
  timestamp?: number;
  source?: 'GEMINI_LIVE' | 'OFFLINE_RULE_ENGINE';
}

export interface AIServiceResponse {
  text: string;
  isInterception?: boolean;
  modelUsed: string;
  source: 'GEMINI_LIVE' | 'OFFLINE_RULE_ENGINE';
  error?: string;
}

class AIService {
  private defaultModel = 'gemini-1.5-flash';

  /**
   * Compact serialization of user's active holdings for LLM context injection
   */
  public serializePortfolioContext(holdings: Holding[]): string {
    if (!holdings || holdings.length === 0) {
      return 'User Portfolio: No holdings currently recorded.';
    }

    const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalGain = totalVal - totalInvested;
    const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Asset allocation breakdown
    const classMap: Record<string, number> = {};
    holdings.forEach(h => {
      classMap[h.assetClass] = (classMap[h.assetClass] || 0) + h.currentValue;
    });

    const classBreakdown = Object.entries(classMap)
      .map(([cls, val]) => `${cls.toUpperCase()}: ${formatINR(val, { compact: true })} (${((val / totalVal) * 100).toFixed(1)}%)`)
      .join(', ');

    // Top holdings summary
    const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const topHoldingsText = sorted.map((h, i) =>
      `${i + 1}. ${h.symbol} (${h.name}) | Class: ${h.assetClass} | Value: ${formatINR(h.currentValue, { compact: true })} (${h.allocationPercent.toFixed(1)}% weight) | P&L: ${formatINR(h.unrealizedGain, { compact: true })} (${formatPercent(h.unrealizedGainPercent, true)})`
    ).join('\n');

    return `=== USER SOVEREIGN VAULT SNAPSHOT ===
Total Portfolio Net Worth: ${formatINR(totalVal)}
Total Invested Capital: ${formatINR(totalInvested)}
Net Unrealized P&L: ${formatINR(totalGain)} (${formatPercent(gainPct, true)})
Total Positions: ${holdings.length}
Asset Class Distribution: ${classBreakdown}

Detailed Positions:
${topHoldingsText}
=====================================`;
  }

  /**
   * SEBI Regulatory System Prompt
   */
  private buildSystemInstruction(portfolioContext: string): string {
    return `You are the KoshQ Sovereign Investment Intelligence Analyst.
You operate as an institutional-grade, private client-side analytics copilot tailored to the Indian financial ecosystem.

${portfolioContext}

REGULATORY MANDATE & OPERATING DIRECTIVES (SEBI COMPLIANCE):
1. STRICT NON-INTERMEDIARY POSTURE: You do NOT provide personalized investment advice, speculative buy/sell calls, target prices, or price guarantees.
2. ADVISORY INTERCEPTION: If the user asks "Should I buy [X]?", "Which stock will give maximum return?", "Recommend a stock", or asks for target prices, you MUST begin your response with:
"[REGULATORY INTENT REDIRECTION]"
Explain that under SEBI regulations you cannot give buy/sell recommendations, then immediately pivot into an objective, fundamental breakdown of the company or asset class (Valuation multiples, Debt-to-Equity, ROE/ROCE, Free Cash Flow, Moat).
3. FACTUAL & CONTEXT-AWARE: Reference the user's actual portfolio holdings, weights, and asset class distributions whenever relevant to their query.
4. INDIAN FINANCIAL ARCHITECTURE: Use Indian market benchmarks and tax laws:
   - LTCG under Section 112A (12.5% on listed equities above ₹1.25 Lakh exemption)
   - STCG under Section 111A (flat 20%)
   - Debt fund taxation at slab rates
   - Indian instruments: G-Secs, SGB (Sovereign Gold Bonds), PPF (7.1% tax-free), EPF (8.25%), NPS (Tier 1 60/40 rule).
5. TONE & STYLE: Analytical, objective, crisp, and pedagogical. Use structured markdown formatting with bold metrics and clear bullet points. Keep answers concise and direct.`;
  }

  /**
   * Main Dispatcher: Queries Gemini API if key is present; otherwise falls back to smart rule engine
   */
  public async generateResponse(
    messages: AIMessage[],
    holdings: Holding[],
    customApiKey?: string
  ): Promise<AIServiceResponse> {
    const apiKey = customApiKey || VaultStorage.getAIApiKey();
    const portfolioContext = this.serializePortfolioContext(holdings);

    // If no API key configured, use intelligent client-side heuristic engine
    if (!apiKey) {
      return this.generateOfflineHeuristicResponse(messages, holdings);
    }

    try {
      const systemInstruction = this.buildSystemInstruction(portfolioContext);

      // Build message contents for Gemini REST API
      const conversationHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: conversationHistory,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          topP: 0.8
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status} from Gemini API`;
        console.warn('Gemini API call failed:', errorMsg);

        // If rate-limited or key invalid, gracefully inform user with offline fallback
        if (response.status === 400 || response.status === 403) {
          return {
            text: `⚠️ **API Key Authentication Issue**: The provided Gemini API Key was rejected (${errorMsg}). Please verify your key in Settings or AI setup.\n\n*Falling back to offline analytics:*\n\n` +
              (await this.generateOfflineHeuristicResponse(messages, holdings)).text,
            isInterception: false,
            modelUsed: 'offline-fallback',
            source: 'OFFLINE_RULE_ENGINE',
            error: errorMsg
          };
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text || 'No response text received from model.';
      const isInterception = replyText.includes('[REGULATORY INTENT REDIRECTION]');

      return {
        text: replyText,
        isInterception,
        modelUsed: this.defaultModel,
        source: 'GEMINI_LIVE'
      };
    } catch (err: any) {
      console.warn('Gemini error, using offline heuristic:', err);
      const fallback = await this.generateOfflineHeuristicResponse(messages, holdings);
      return {
        text: `*(Note: Switched to offline sovereign mode due to connection error)*\n\n` + fallback.text,
        isInterception: fallback.isInterception,
        modelUsed: 'offline-rule-engine',
        source: 'OFFLINE_RULE_ENGINE',
        error: err.message
      };
    }
  }

  /**
   * Offline Deterministic Financial Reasoning Engine (Zero API Key Fallback)
   */
  private async generateOfflineHeuristicResponse(
    messages: AIMessage[],
    holdings: Holding[]
  ): Promise<AIServiceResponse> {
    const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
    const query = (lastUserMessage?.text || '').toLowerCase();

    // 1. Advisory Interception
    const isAdvisory =
      query.includes('should i buy') ||
      query.includes('which stock to buy') ||
      query.includes('target price') ||
      query.includes('best stock') ||
      query.includes('recommend') ||
      query.includes('buy call');

    if (isAdvisory) {
      return {
        text: `[REGULATORY INTENT REDIRECTION]
I cannot provide stock recommendations, price targets, or buy/sell signals under SEBI regulations.

However, I can help you evaluate the company objectively through our 5-pillar fundamental checklist:
• **Valuation Multiples**: Compare Trailing P/E and P/B relative to 5-year historical medians.
• **Balance Sheet Solvency**: Debt-to-Equity ratio (< 1.0) and Interest Coverage (> 4.0x).
• **Return on Capital**: Return on Equity (ROE > 15%) and ROCE consistency across business cycles.
• **Cash Flow Realization**: Free Cash Flow conversion compared to reported accounting Net Profit.
• **Ownership Quality**: Promoter pledging (< 5%) and institutional ownership trends.

You can inspect all these metrics side-by-side in the **Workbench → Comparative Engine** tab.`,
        isInterception: true,
        modelUsed: 'offline-rule-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 2. Concentration / Risk Query
    if (query.includes('concentration') || query.includes('risk') || query.includes('hhi')) {
      const topHolding = [...holdings].sort((a, b) => b.currentValue - a.currentValue)[0];
      return {
        text: `**Portfolio Risk & Concentration Diagnosis**:
• **Active Position Count**: ${holdings.length} Positions across multiple asset classes.
• **Top Weight Concentration**: Your largest position is **${topHolding?.symbol || 'N/A'}** representing **${topHolding?.allocationPercent?.toFixed(1) || 0}%** of your total net worth.
• **Diversification Benchmark**: In institutional risk modeling, keeping individual company holdings under **15%** and single sectors under **25%** significantly dampens idiosyncratic drawdown risk.
• **Actionable Check**: Use **Portfolio Vault → Portfolio X-Ray** to review your calculated Herfindahl-Hirschman Index (HHI) score.`,
        isInterception: false,
        modelUsed: 'offline-rule-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 3. Tax / Capital Gains Query
    if (query.includes('tax') || query.includes('ltcg') || query.includes('stcg') || query.includes('budget')) {
      return {
        text: `**Indian Capital Gains Taxation (FY 2025-26 / Budget 2024 Rules)**:
• **Long-Term Capital Gains (LTCG - Section 112A)**:
  - Holding period: > 12 months for listed equity and equity mutual funds.
  - Exemption: **₹1,25,000** per financial year.
  - Tax Rate: **12.5%** on gains exceeding ₹1.25 Lakh (without indexation).
• **Short-Term Capital Gains (STCG - Section 111A)**:
  - Holding period: ≤ 12 months.
  - Tax Rate: Flat **20%**.
• **Debt Mutual Funds & Bonds**:
  - Taxed at your applicable income tax slab rate.
• **Tax Loss Harvesting**:
  - You can set off STCL against both STCG and LTCG under Section 70. Check the **Research Studio → Tax Loss Harvesting** tab to review harvestable lots.`,
        isInterception: false,
        modelUsed: 'offline-rule-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 4. Asset Allocation / Rebalance Query
    if (query.includes('rebalance') || query.includes('allocation') || query.includes('equity') || query.includes('debt')) {
      return {
        text: `**Asset Allocation & Rebalancing Strategy**:
• **Current Balance**: Your portfolio is deployed across Equity, Mutual Funds, Gold (SGB), Bonds, and Liquid Cash.
• **Tax-Smart SIP Realignment**:
  - Rather than selling overweight assets (which triggers capital gains tax and brokerage), direct your new monthly SIP inflows strictly into underweight assets until target allocation is restored.
• **Rebalance Frequency**: Semi-annual or annual reviews when asset drift exceeds **±5%** prevent unnecessary churn while maintaining risk parity.
• **Model Scenarios**: Check **Portfolio Vault → Rebalance Engine** to see target allocations across Aggressive, Balanced, and All-Weather profiles.`,
        isInterception: false,
        modelUsed: 'offline-rule-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // Generic educational answer
    return {
      text: `Regarding your query:

In sovereign investment management, three core mathematical disciplines protect long-term capital:
1. **Capital Preservation First**: Maintain a 3–6 month liquid cash runway to avoid forced selling during market drawdowns.
2. **Asset Allocation Dominance**: Studies show >85% of long-term portfolio return variation is driven by asset allocation (Equity vs Debt vs Gold) rather than stock picking.
3. **Patience & Low Churn**: Minimizing turnover preserves the compound interest curve by eliminating recurring exit loads, STT, and capital gains tax drag.

*Tip: Connect your free **Google Gemini API Key** in the settings above to ask open-ended questions about corporate filings, macro scenarios, and custom portfolio strategies.*`,
      isInterception: false,
      modelUsed: 'offline-rule-engine',
      source: 'OFFLINE_RULE_ENGINE'
    };
  }
}

export const aiService = new AIService();

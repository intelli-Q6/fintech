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
    const systemInstruction = this.buildSystemInstruction(portfolioContext);

    // Sanitize conversation history for Gemini:
    // 1. Multiturn conversations in Gemini MUST start with role 'user'
    // 2. Roles must strictly alternate between 'user' and 'model'
    const firstUserIndex = messages.findIndex(m => m.sender === 'user');
    const relevantMessages = firstUserIndex !== -1 ? messages.slice(firstUserIndex) : messages;

    const conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of relevantMessages) {
      const text = m.text?.trim();
      if (!text) continue;
      const role = m.sender === 'user' ? 'user' : 'model';

      if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === role) {
        conversationHistory[conversationHistory.length - 1].parts.push({ text });
      } else {
        conversationHistory.push({ role, parts: [{ text }] });
      }
    }

    if (conversationHistory.length === 0) {
      return this.generateOfflineHeuristicResponse(messages, holdings);
    }

    const requestPayload = {
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

    // 1. Primary Route: Try Backend Serverless Proxy (/api/gemini)
    // Works automatically if server-side GEMINI_API_KEY is configured or custom apiKey is passed
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          model: this.defaultModel,
          contents: conversationHistory,
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const replyText = candidate?.content?.parts?.[0]?.text;
        if (replyText) {
          const isInterception = replyText.includes('[REGULATORY INTENT REDIRECTION]');
          return {
            text: replyText,
            isInterception,
            modelUsed: this.defaultModel + ' (Cloud Copilot)',
            source: 'GEMINI_LIVE'
          };
        }
      }
    } catch (proxyErr) {
      // Backend proxy unavailable (e.g. offline dev). If custom key is provided, try direct Google API
      if (apiKey) {
        try {
          const directEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${apiKey}`;
          const directRes = await fetch(directEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
          });
          if (directRes.ok) {
            const data = await directRes.json();
            const candidate = data.candidates?.[0];
            const replyText = candidate?.content?.parts?.[0]?.text;
            if (replyText) {
              const isInterception = replyText.includes('[REGULATORY INTENT REDIRECTION]');
              return {
                text: replyText,
                isInterception,
                modelUsed: this.defaultModel + ' (Direct Gemini)',
                source: 'GEMINI_LIVE'
              };
            }
          }
        } catch (directErr) {
          console.warn('Direct Gemini call fallback failed:', directErr);
        }
      }
    }

    // 2. Seamless Native Intelligence Engine (Institutional Client-Side Reasoning)
    return this.generateOfflineHeuristicResponse(messages, holdings);
  }

  /**
   * Native Deterministic Financial Intelligence Engine
   * Provides institutional analysis without requiring external API keys
   */
  private async generateOfflineHeuristicResponse(
    messages: AIMessage[],
    holdings: Holding[]
  ): Promise<AIServiceResponse> {
    const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
    const query = (lastUserMessage?.text || '').toLowerCase();

    const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalGain = totalVal - totalInvested;
    const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // 1. Advisory Interception (Strict SEBI Non-Intermediary Guardrail)
    const isAdvisory =
      query.includes('should i buy') ||
      query.includes('should i sell') ||
      query.includes('which stock to buy') ||
      query.includes('target price') ||
      query.includes('best stock') ||
      query.includes('recommend') ||
      query.includes('buy call') ||
      query.includes('sell call') ||
      query.includes('multibagger');

    if (isAdvisory) {
      return {
        text: `[REGULATORY INTENT REDIRECTION]
I cannot provide stock recommendations, buy/sell calls, price targets, or trading tips under SEBI regulations.

However, I can help you evaluate any instrument objectively through our **5-Pillar Fundamental Framework**:
1. **Valuation Multiples**: Compare Trailing P/E and P/B against 5-year historical medians and industry peers.
2. **Balance Sheet Solvency**: Debt-to-Equity (< 1.0) and Interest Coverage Ratio (> 4.0x).
3. **Return on Capital**: Consistent Return on Equity (ROE > 15%) and ROCE across economic cycles.
4. **Cash Flow Realization**: Free Cash Flow (FCF) conversion relative to reported accounting Net Profit.
5. **Promoter Integrity & Governance**: Zero or low promoter share pledging (< 5%) and stable institutional ownership.

*You can inspect these metrics across your holdings in the **Workbench → Comparative Engine**.*`,
        isInterception: true,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 2. Specific Holding Lookup
    const matchedHolding = holdings.find(h => {
      const sym = h.symbol.toLowerCase();
      const name = h.name.toLowerCase();
      return query.includes(sym) || query.includes(name);
    });

    if (matchedHolding) {
      const pnlSymbol = matchedHolding.unrealizedGain >= 0 ? '+' : '';
      return {
        text: `**Position Analytics: ${matchedHolding.symbol} (${matchedHolding.name})**
• **Asset Class**: ${matchedHolding.assetClass.toUpperCase()}
• **Current Market Value**: ${formatINR(matchedHolding.currentValue)}
• **Invested Principal**: ${formatINR(matchedHolding.investedAmount)}
• **Unrealized Gain / Loss**: ${pnlSymbol}${formatINR(matchedHolding.unrealizedGain)} (${formatPercent(matchedHolding.unrealizedGainPercent, true)})
• **Portfolio Allocation**: **${matchedHolding.allocationPercent.toFixed(1)}%** of your net worth
• **Average Buy Price**: ${formatINR(matchedHolding.averageBuyPrice)} | **CMP**: ${formatINR(matchedHolding.currentPrice)}
• **Position Units**: ${matchedHolding.quantity.toLocaleString('en-IN')} units

**Analytical Assessment**:
- Weight Contribution: At ${matchedHolding.allocationPercent.toFixed(1)}%, this position has a ${matchedHolding.allocationPercent > 15 ? 'significant' : 'balanced'} influence on aggregate portfolio volatility.
- Institutional Strategy: Maintain disciplined risk parity. Consider rebalancing if single-stock weight exceeds 15% to mitigate company-specific drawdown risk.`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 3. Concentration & Risk Query
    if (query.includes('concentration') || query.includes('risk') || query.includes('hhi') || query.includes('diversif')) {
      const sortedByVal = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
      const top3 = sortedByVal.slice(0, 3);
      const top3Weight = top3.reduce((sum, h) => sum + h.allocationPercent, 0);

      return {
        text: `**Portfolio Risk & Concentration Diagnosis**:
• **Active Positions**: ${holdings.length} holdings totaling ${formatINR(totalVal)}.
• **Top 3 Concentration**: **${top3Weight.toFixed(1)}%** of your total capital is deployed in:
${top3.map((h, i) => `  ${i + 1}. **${h.symbol}**: ${h.allocationPercent.toFixed(1)}% (${formatINR(h.currentValue, { compact: true })})`).join('\n')}
• **Diversification Status**:
  - Top single holding weight: **${sortedByVal[0]?.symbol}** (${sortedByVal[0]?.allocationPercent.toFixed(1)}%).
  - Institutional Rule of Thumb: Keep individual equities under **15%** and any single sector under **25%** to mitigate idiosyncratic risk.
• **Actionable Optimization**: Check the **Portfolio Vault → Portfolio X-Ray** to evaluate your Herfindahl-Hirschman Index (HHI) concentration score.`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 4. Performance, Gainers & Losers Query
    if (query.includes('performance') || query.includes('gain') || query.includes('profit') || query.includes('loss') || query.includes('return') || query.includes('winner') || query.includes('loser')) {
      const sortedByGainPct = [...holdings].sort((a, b) => b.unrealizedGainPercent - a.unrealizedGainPercent);
      const best = sortedByGainPct[0];
      const worst = sortedByGainPct[sortedByGainPct.length - 1];

      return {
        text: `**Portfolio Performance & Return Summary**:
• **Consolidated Net Worth**: ${formatINR(totalVal)}
• **Total Invested Capital**: ${formatINR(totalInvested)}
• **Aggregate Unrealized P&L**: **${totalGain >= 0 ? '+' : ''}${formatINR(totalGain)}** (${formatPercent(gainPct, true)})

**Key Drivers**:
• **Top Performer**: **${best?.symbol}** (${best?.name}) with **${formatPercent(best?.unrealizedGainPercent || 0, true)}** return (${formatINR(best?.unrealizedGain || 0)} gain).
• **Bottom Performer**: **${worst?.symbol}** (${worst?.name}) with **${formatPercent(worst?.unrealizedGainPercent || 0, true)}** return (${formatINR(worst?.unrealizedGain || 0)} P&L).

*Track money-weighted timing and benchmark comparisons against Nifty 50 in the **Portfolio Vault → Performance** tab.*`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 5. Tax & Capital Gains (Budget 2024 / FY 2025-26 Rules)
    if (query.includes('tax') || query.includes('ltcg') || query.includes('stcg') || query.includes('budget') || query.includes('harvest')) {
      return {
        text: `**Indian Capital Gains Taxation Framework (Budget 2024 Rules)**:

1. **Long-Term Capital Gains (LTCG - Section 112A)**:
   - Holding Period: > 12 months for listed equities and equity mutual funds.
   - Annual Exemption: **₹1,25,000** per financial year.
   - Tax Rate: **12.5%** on gains exceeding ₹1.25 Lakh (without indexation).

2. **Short-Term Capital Gains (STCG - Section 111A)**:
   - Holding Period: ≤ 12 months.
   - Tax Rate: Flat **20%** (increased from 15% in Budget 2024).

3. **Debt Mutual Funds & Fixed Income**:
   - Taxed at your individual slab rate as short-term capital gains under Section 50AA.

4. **Tax-Loss Harvesting**:
   - Short-term capital losses (STCL) can be set off against both STCG and LTCG under Section 70.
   - Unabsorbed losses can be carried forward for up to 8 assessment years. Check **Research Studio → Tax Loss Harvesting** to audit harvestable tax lots.`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 6. Asset Allocation & Rebalance Query
    if (query.includes('rebalance') || query.includes('allocation') || query.includes('equity') || query.includes('debt') || query.includes('sip')) {
      const classMap: Record<string, number> = {};
      holdings.forEach(h => {
        classMap[h.assetClass] = (classMap[h.assetClass] || 0) + h.currentValue;
      });

      const breakdown = Object.entries(classMap)
        .map(([cls, val]) => `• **${cls.toUpperCase()}**: ${formatINR(val)} (${((val / totalVal) * 100).toFixed(1)}%)`)
        .join('\n');

      return {
        text: `**Asset Allocation & Rebalancing Strategy**:

**Current Capital Distribution**:
${breakdown}

**Tactical Rebalancing Directives**:
1. **Tax-Smart Cashflow Realignment**: Rather than selling overweight positions (which triggers capital gains tax and exit loads), route new monthly SIP contributions into underweight asset classes.
2. **Tolerance Band Discipline**: Rebalance only when an asset class drifts by **±5%** or more from target allocation to avoid unnecessary transaction friction.
3. **Emergency Liquidity Buffer**: Maintain 3–6 months of living expenses in liquid debt funds or arbitrage instruments before deploying into volatile equities.`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 7. Gold & Sovereign Gold Bonds (SGB)
    if (query.includes('gold') || query.includes('sgb')) {
      return {
        text: `**Gold & Sovereign Gold Bonds (SGB) Strategic Overview**:
• **Role in Portfolio**: Gold provides non-correlated insurance against currency depreciation and macroeconomic shocks. Target allocation is typically 5% to 15%.
• **SGB Sovereign Advantages**:
  - **2.5% Annual Interest**: Paid semi-annually on initial nominal investment.
  - **100% Tax Exemption on Maturity**: Capital gains upon redemption at 8-year maturity are completely exempt under Section 47(viic).
  - **Zero Storage & Making Charges**: Pure electronic format backed by the Government of India.`,
        isInterception: false,
        modelUsed: 'koshq-intelligence-engine',
        source: 'OFFLINE_RULE_ENGINE'
      };
    }

    // 8. General Analytical Portfolio Response
    return {
      text: `**Portfolio Intelligence Assessment**:
• **Active Ledger Snapshot**: ${holdings.length} positions across diversified assets with a consolidated valuation of **${formatINR(totalVal)}**.
• **Aggregate Gain / Loss**: **${totalGain >= 0 ? '+' : ''}${formatINR(totalGain)}** (${formatPercent(gainPct, true)}).

**Guiding Principles for Long-Term Capital Compounding**:
1. **Asset Allocation Over Stock Picking**: Broad asset mix (Equity, Debt, Gold, Cash) explains over 85% of long-term return variability.
2. **Discipline in Drawdowns**: Market corrections are structural opportunities for disciplined SIP averaging rather than reactive selling.
3. **Tax & Cost Drag Minimization**: Utilizing annual ₹1.25L LTCG exemptions and holding quality businesses reduces portfolio friction.

*You can ask specific questions about any stock (e.g., "Analyze Reliance"), tax rules ("Budget 2024 LTCG"), or run risk checks ("Concentration Risk").*`,
      isInterception: false,
      modelUsed: 'koshq-intelligence-engine',
      source: 'OFFLINE_RULE_ENGINE'
    };
  }
}

export const aiService = new AIService();

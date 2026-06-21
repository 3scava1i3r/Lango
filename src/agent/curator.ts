const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface CurationDecision {
  action: 'rebalance' | 'collect_fees' | 'hold'
  poolAddress?: string
  amount?: number
  reason: string
  intentRationale: string
}

const CURATION_PROMPT = `You are a DeFi liquidity curator agent on Hedera. Your goal is to optimize concentrated liquidity positions while respecting spending constraints.

You MUST provide a detailed "intent rationale" for every action explaining WHY the action is justified.
Your intent rationale must be at least 10 characters and explain the financial reasoning.

Given the current state, decide what action to take:
- "rebalance" — move liquidity to a better tick range (include rationale about market conditions)
- "collect_fees" — withdraw earned fees (only if APY > benchmark; include rationale about fee accumulation)
- "hold" — do nothing, current position is optimal (include rationale about stability)

Respond with JSON only: {
  "action": string,
  "poolAddress"?: string,
  "amount"?: number,
  "reason": string,
  "intentRationale": string
}`

export async function getCurationDecision(
  marketData: string,
  positionState: string,
): Promise<CurationDecision> {
  if (!GEMINI_API_KEY) {
    return {
      action: 'hold',
      reason: 'No Gemini API key configured — skipping decision',
      intentRationale: 'Holding position due to lack of market data access. Maintaining current LP allocation as a conservative default.',
    }
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${CURATION_PROMPT}\n\nMarket data:\n${marketData}\n\nPosition state:\n${positionState}`,
          }],
        }],
      }),
    })

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return {
      action: 'hold',
      reason: 'Could not parse Gemini response',
      intentRationale: 'Fallback: unable to parse AI reasoning. Holding position to avoid unvalidated rebalancing.',
    }
  } catch (err) {
    return {
      action: 'hold',
      reason: `Gemini error: ${err}`,
      intentRationale: 'Safety fallback: AI inference failed. Holding all positions until connectivity is restored.',
    }
  }
}

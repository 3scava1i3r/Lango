# Hedera Policy Agent — AI Agent Bounty Submission

## One-Liner

An AI-powered liquidity curation agent on Hedera whose every action is constrained by **10 runtime policies** at the Hedera Agent Kit v4 lifecycle — architecturally incapable of spending your principal.

## Pitch

> Most DeFi agents are all-or-nothing: you give them your wallet keys, they can drain it. This agent uses **10 policies at 4 Hedera lifecycle stages** to constrain every single transaction. A vault physically locks the principal — the AI can only spend yield, at most. If the agent goes rogue, gets hacked, or makes bad decisions, your principal is safe. It's a drop-in architecture: swap the curator, add policies, and any protocol gets insured AI agents.

## Architecture

```
Curator (Gemini) decides: rebalance / collect_fees / hold
        │
        ▼
  Policy Engine — Hedera Agent Kit v4 lifecycle
        │
  ┌──────┼──────────────┬──────────────┐
  │      │              │              │
  ▼      ▼              ▼              ▼
preTool  postParams  postCore  postTool
  │        │            │         │
  │   SlippageGuard  PerfFee   HcsAudit
  │   MaxPosition              (log only)
  │
  ├── PoolWhitelist
  ├── DailySpend
  ├── Cooldown
  ├── ConcentrationLimit
  └── IntentReason
        │
        ▼
  Principal Protection Vault
  ┌──────────────────────┐
  │  Principal (locked)  │ ← AI cannot touch
  │  Yield (spendable)   │ ← AI operating budget
  │  Worst case = yield  │ ← Principal always intact
  └──────────────────────┘
        │
        ▼
  Hedera Testnet — HBAR transfers / HCS audit topic
```

## All 10 Policies

| Policy | Lifecycle Stage | Blocks When |
|--------|:---------------:|-------------|
| `PoolWhitelistPolicy` | preToolExecution | Recipient not in approved pool list |
| `MaxPositionPolicy` | postParamsNormalization | Single tx > 500 HBAR |
| `DailySpendPolicy` | preToolExecution | Rolling 24h spend > 100 HBAR |
| `PerfFeePolicy` | postCoreAction | Fee collection when APY < 5% |
| `SlippageGuardPolicy` | postParamsNormalization | Price impact > 1% |
| `CooldownPolicy` | preToolExecution | Rebalance within 60 min of last |
| `ConcentrationLimitPolicy` | preToolExecution | Single pool > 40% of portfolio |
| `IntentReasonPolicy` | preToolExecution | No reason string or < 10 chars |
| `RejectToolPolicy` (built-in) | preToolExecution | Dangerous tools (delete, freeze) |
| `HcsAuditTrailHook` (built-in) | postToolExecution | (non-blocking) Logs to HCS topic |

Plus **Principal Protection** — enforced at the vault level: agent can only spend yield, never principal.

## Pattern Fusion

This project combines architectural insights from 4 Synthesis winners:

| Pattern | Source | Implementation |
|---------|--------|---------------|
| **Policy engine** | CuratedLP | 8 custom `AbstractPolicy` implementations at 4 Hedera lifecycle stages |
| **Principal protection** | Ringfence | `src/lib/vault.ts` — principal locked, yield-only spend, worst-case display |
| **Intent verification** | Mandate | `IntentReasonPolicy` requires 10+ char rationale; audit trail captures intent alongside every action |
| **Safety guards** | Aegis | `SlippageGuardPolicy` (1%), `CooldownPolicy` (60min), `ConcentrationLimitPolicy` (40%) |

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind v4)
- **Hedera**: `@hashgraph/hedera-agent-kit@4.0.0`, `@hiero-ledger/sdk`
- **AI**: Gemini 2.0 Flash (via fetch API — no ADK dependency)
- **Deployment**: Vercel (serverless)
- **Network**: Hedera Testnet

## How to Demo (60 seconds)

1. **Open the Vercel URL** → dashboard with 10 policy cards, vault status bar, audit trail, and controls
2. **Click "Run Curation Cycle"** → Gemini analyzes market data, returns rebalance/hold/collect_fees with intent rationale
3. **Click "Send 10 HBAR"** → allowed through all policies, audit trail shows policy verdicts + intent
4. **Click "Send 999 HBAR"** → blocked by MaxPositionPolicy, card turns red
5. **Click "To non-whitelist"** → blocked by PoolWhitelistPolicy
6. **Click "Empty reason"** → blocked by IntentReasonPolicy, shows empty intent in audit
7. **Click "Send 2000 HBAR"** → blocked by Principal Protection — principal stayed at 1000 HBAR the whole time
8. **Show vault cards** → principal never changed, only yield was consumed

## Live Demo

**URL**: (add your Vercel URL here)

**Repository**: https://github.com/3scava1i3r/Lango

## Hedera Feedback

See [`HEDERA_FEEDBACK.md`](./HEDERA_FEEDBACK.md) for the required tool feedback submission.

## Environment Variables

```
HEDERA_OPERATOR_ID=       # Hedera testnet account ID
HEDERA_OPERATOR_KEY=      # ECDSA private key
HCS_AUDIT_TOPIC_ID=       # HCS topic for audit trail (optional)
GEMINI_API_KEY=           # Google Gemini API key
```

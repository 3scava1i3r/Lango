# Hedera Policy Agent — Policy-Governed Liquidity Curation Agent

An AI-powered liquidity curation agent built with **Hedera Agent Kit v4** — **10 runtime policies** constrain every HBAR/USDC payment at the Hedera Agent Kit lifecycle level.

## Architecture

```
Curator Agent (Gemini)
  │
  ▼
Hedera Agent Kit v4 Policy Engine
  │
  ├── Principal Protection
  │     └─ Principal locked • Only yield spendable • Worst case = yield lost
  │
  ├── Transfer Policies
  │     ├─ PoolWhitelistPolicy        — only approved pool addresses
  │     ├─ MaxPositionPolicy          — max 500 HBAR per position
  │     ├─ DailySpendPolicy           — rolling 24h cap of 100 HBAR
  │     └─ PerfFeePolicy              — fee release only if APY > 5%
  │
  ├── Safety Policies
  │     ├─ SlippageGuardPolicy         — max 1% price impact
  │     ├─ CooldownPolicy              — 60 min between rebalances
  │     └─ ConcentrationLimitPolicy    — max 40% per pool
  │
  ├── Verification Policy
  │     └─ IntentReasonPolicy          — 10+ char rationale required per tx
  │
  ├── Built-in
  │     ├─ RejectToolPolicy            — blocks dangerous operations
  │     └─ HcsAuditTrailHook           — immutable HCS audit log
  │
  ▼
Hedera Network (Testnet) — HBAR/USDC transfers, HCS topic logging
```

## All 10 Policies

| Policy | Stage | Blocks When |
|--------|-------|-------------|
| `PoolWhitelistPolicy` | `preToolExecution` | Recipient not in approved pool list |
| `MaxPositionPolicy` | `postParamsNormalization` | Single tx > 500 HBAR |
| `DailySpendPolicy` | `preToolExecution` | Rolling 24h spend > 100 HBAR |
| `PerfFeePolicy` | `postCoreAction` | Fee collection when APY < 5% |
| `SlippageGuardPolicy` | `postParamsNormalization` | Price impact > 1% |
| `CooldownPolicy` | `preToolExecution` | Rebalance within 60 min of last |
| `ConcentrationLimitPolicy` | `preToolExecution` | Single pool > 40% of portfolio |
| `IntentReasonPolicy` | `preToolExecution` | No reason string or < 10 chars |
| `RejectToolPolicy` | `preToolExecution` | Dangerous tools (delete, freeze) |
| `HcsAuditTrailHook` | `postToolExecution` | (non-blocking) Logs to HCS topic |

Plus **Principal Protection** — enforced at the vault level via `src/lib/vault.ts`:
- Agent can only spend **yield balance**, never principal
- Every spend is checked against available yield
- Worst case outcome = agent only loses accumulated yield

## Getting Started

```bash
git clone <your-repo-url>
cd hedera-policy-agent
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dashboard Demo

- **Run Curation Cycle** — Gemini agent analyzes market data and decides: rebalance, collect fees, or hold (includes intent rationale)
- **5 Test Transfers** — Each triggers different policy combinations:
  - Allowed (whitelisted, within limits, with reason)
  - Blocked by Max Position (999 HBAR)
  - Blocked by Pool Whitelist (non-approved address)
  - Blocked by Intent Reason (empty rationale)
  - Blocked by Principal Protection (exceeds yield)
- **Vault Status** — Principal (locked) / Yield (available) / Total / Worst Case
- **Audit Trail** — Every action logged with timestamp, policy decision, and intent reason
- **Policy Cards** — Live status showing ALLOWING or BLOCKING state

## Hedera Agent Kit v4 Integration

- **8 custom `AbstractPolicy` implementations** across 4 lifecycle stages
- **2 built-in**: `RejectToolPolicy`, `HcsAuditTrailHook`
- **Plugins**: `allCorePlugins` from `@hashgraph/hedera-agent-kit/plugins`
- **Tool Discovery**: `ToolDiscovery.createFromConfiguration`
- **Stateful policies**: In-memory stores for daily spend, cooldown timestamps, concentration exposures

## Deployment

```bash
npx vercel --prod
```

Set env vars: `HEDERA_OPERATOR_ID`, `HEDERA_OPERATOR_KEY`, `HCS_AUDIT_TOPIC_ID`, `GEMINI_API_KEY`.

## Hedera Feedback

See [`HEDERA_FEEDBACK.md`](./HEDERA_FEEDBACK.md).

## License

MIT

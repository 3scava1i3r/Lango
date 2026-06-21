# Hedera Agent Kit v4 Hooks/Policy System Feedback

## Summary

Built a policy-constrained liquidity curation agent using **Hedera Agent Kit v4** with 8 custom policies (PoolWhitelistPolicy, MaxPositionPolicy, DailySpendPolicy, PerfFeePolicy, SlippageGuardPolicy, CooldownPolicy, ConcentrationLimitPolicy, IntentReasonPolicy) and the built-in RejectToolPolicy + HcsAuditTrailHook. Overall the system is well-architected, but I hit a few friction points.

## Positive

- The AbstractPolicy + lifecycle stages (preToolExecution, postParamsNormalization, postCoreAction) are a clean design. Inspecting params at different stages gives fine-grained control.
- Modular packages (core vs plugins vs hooks vs policies) make dependency management much better than v3.

## Suggestions

### 1. Add DailySpendPolicy and MaxAmountPolicy as built-in policies

Currently only MaxRecipientsPolicy and RejectToolPolicy ship built-in. Spend limits and per-transaction caps are the most common agent governance patterns — having them as first-class exported policies would accelerate adoption.

### 2. Policy relevantTools type safety

relevantTools: string[] is just a string array — no compile-time check that the tool names match actual registered tools. If a developer typoes "transfer_hbar" vs "transfer_hbar_tool", the policy silently never fires. Consider either exporting tool-name constants as the source of truth, or accepting BaseTool class references.

### 3. Docs: example of stateful policy (DailySpendPolicy)

The docs show simple stateless validation patterns. A working example of a stateful policy (tracking spend across calls with a rolling window) would help developers build real-world policies. Happy to contribute this example if helpful.

### 4. AbstractPolicy hook-override confusion

The docs say "do not override native hook methods" on AbstractPolicy — only implement shouldBlock* methods. But AbstractPolicy extends AbstractHook which has preToolExecutionHook etc. as async methods returning any. The error when someone mistakenly overrides the wrong method is not obvious. Consider making shouldBlock* abstract (enforced by compiler) and marking lifecycle methods as @final or using a different pattern to prevent confusion.

## Environment

- @hashgraph/hedera-agent-kit@4.0.0
- Next.js 16.2.9
- Node.js 24
- Project: policy-governed liquidity curation agent

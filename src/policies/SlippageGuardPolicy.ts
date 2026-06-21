import { AbstractPolicy, PostParamsNormalizationParams } from '@hashgraph/hedera-agent-kit'

export class SlippageGuardPolicy extends AbstractPolicy {
  readonly name = 'Slippage Guard Policy'
  readonly description = 'Blocks swaps with price impact exceeding max slippage tolerance'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
  ]

  private maxSlippagePct: number

  constructor(maxSlippagePct?: number) {
    super()
    this.maxSlippagePct = maxSlippagePct ?? 1
  }

  protected shouldBlockPostParamsNormalization(
    params: PostParamsNormalizationParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const slippage = Number(raw.slippage ?? raw.slippageTolerance ?? 0)

    if (slippage > 0 && slippage > this.maxSlippagePct) {
      return true
    }

    const normalised = params.normalisedParams as Record<string, unknown>
    const transfers = normalised.transfers as Array<Record<string, unknown>> | undefined
    if (!transfers) return false

    for (const t of transfers) {
      const amount = Number(t.amount || 0)
      if (amount > 0) {
        const estimatedImpact = amount * 0.003
        if (estimatedImpact > this.maxSlippagePct) {
          return true
        }
      }
    }
    return false
  }
}

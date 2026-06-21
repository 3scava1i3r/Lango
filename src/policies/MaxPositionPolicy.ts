import { AbstractPolicy, PostParamsNormalizationParams } from '@hashgraph/hedera-agent-kit'
import { getMaxPositionHbar } from '@/lib/policy-context'

export class MaxPositionPolicy extends AbstractPolicy {
  readonly name = 'Max Position Policy'
  readonly description = 'Blocks transfers exceeding the maximum position size'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_hbar_with_allowance_tool',
  ]

  private maxHbar: number

  constructor(maxHbar?: number) {
    super()
    this.maxHbar = maxHbar ?? getMaxPositionHbar()
  }

  protected shouldBlockPostParamsNormalization(
    params: PostParamsNormalizationParams,
    method: string,
  ): boolean {
    const normalised = params.normalisedParams as Record<string, unknown>
    const transfers = normalised.transfers as Array<Record<string, unknown>> | undefined

    if (!transfers) return false

    for (const t of transfers) {
      const amount = Number(t.amount || 0)
      if (amount > this.maxHbar) {
        return true
      }
    }
    return false
  }
}

import { AbstractPolicy, PostCoreActionParams } from '@hashgraph/hedera-agent-kit'

export class PerfFeePolicy extends AbstractPolicy {
  readonly name = 'Performance Fee Policy'
  readonly description = 'Only allows fee collection if agent outperformed passive benchmark'

  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
  ]

  private benchmarkApy: number
  private feeRecipient: string

  constructor(benchmarkApy?: number, feeRecipient?: string) {
    super()
    this.benchmarkApy = benchmarkApy ?? 5
    this.feeRecipient = feeRecipient ?? ''
  }

  protected shouldBlockPostCoreAction(
    params: PostCoreActionParams,
    method: string,
  ): boolean {
    const coreResult = params.coreActionResult as Record<string, unknown> | undefined
    if (!coreResult) return false

    const raw = params.rawParams as Record<string, unknown>
    const transfers = raw.transfers as Array<Record<string, unknown>> | undefined
    if (!transfers) return false

    const isFeeCollection = transfers.some(
      t => this.feeRecipient && String(t.accountId || t.to || '') === this.feeRecipient,
    )
    if (!isFeeCollection) return false

    const agentApy = Number(coreResult.estimatedApy || coreResult.currentApy || 0)
    if (agentApy < this.benchmarkApy) {
      return true
    }
    return false
  }
}

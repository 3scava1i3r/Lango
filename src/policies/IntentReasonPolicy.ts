import { AbstractPolicy, PreToolExecutionParams } from '@hashgraph/hedera-agent-kit'

export class IntentReasonPolicy extends AbstractPolicy {
  readonly name = 'Intent Reason Policy'
  readonly description = 'Requires a human-readable reason string before any payment'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
    'transfer_hbar_with_allowance_tool',
  ]

  private minReasonLength: number

  constructor(minReasonLength?: number) {
    super()
    this.minReasonLength = minReasonLength ?? 10
  }

  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const reason = String(raw.reason || '').trim()

    if (!reason || reason.length < this.minReasonLength) {
      return true
    }

    const transfers = raw.transfers as Array<Record<string, unknown>> | undefined
    if (transfers) {
      for (const t of transfers) {
        ;(t as Record<string, unknown>).reason = reason
      }
    }
    return false
  }
}

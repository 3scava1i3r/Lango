import { AbstractPolicy, PreToolExecutionParams } from '@hashgraph/hedera-agent-kit'
import { getAllowedPools } from '@/lib/policy-context'

export class PoolWhitelistPolicy extends AbstractPolicy {
  readonly name = 'Pool Whitelist Policy'
  readonly description = 'Only allows transfers to whitelisted pool addresses'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
  ]

  private allowedPools: string[]

  constructor(customPools?: string[]) {
    super()
    this.allowedPools = customPools ?? getAllowedPools()
  }

  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const rawTransfers = raw.transfers as Array<Record<string, unknown>> | undefined

    if (!rawTransfers) return false

    for (const t of rawTransfers) {
      const recipient = String(t.accountId || t.to || '')
      if (recipient && !this.allowedPools.includes(recipient)) {
        return true
      }
    }
    return false
  }
}

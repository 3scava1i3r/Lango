import { AbstractPolicy, PreToolExecutionParams } from '@hashgraph/hedera-agent-kit'
import { getTodaySpend, getDailySpendLimitHbar } from '@/lib/policy-context'

export class DailySpendPolicy extends AbstractPolicy {
  readonly name = 'Daily Spend Limit Policy'
  readonly description = 'Blocks transfers that would exceed the daily spend cap'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
  ]

  private dailyLimitHbar: number

  constructor(dailyLimitHbar?: number) {
    super()
    this.dailyLimitHbar = dailyLimitHbar ?? getDailySpendLimitHbar()
  }

  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const transfers = raw.transfers as Array<Record<string, unknown>> | undefined

    if (!transfers) return false

    let totalRequested = 0
    for (const t of transfers) {
      totalRequested += Number(t.amount || 0)
    }

    const currentSpend = getTodaySpend()
    return (currentSpend + totalRequested) > this.dailyLimitHbar
  }
}

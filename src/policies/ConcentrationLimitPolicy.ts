import { AbstractPolicy, PreToolExecutionParams } from '@hashgraph/hedera-agent-kit'

const poolExposures = new Map<string, number>()

export class ConcentrationLimitPolicy extends AbstractPolicy {
  readonly name = 'Concentration Limit Policy'
  readonly description = 'Blocks transfers that would concentrate too much in a single pool'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
  ]

  private maxConcentrationPct: number

  constructor(maxConcentrationPct?: number) {
    super()
    this.maxConcentrationPct = maxConcentrationPct ?? 40
  }

  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const transfers = raw.transfers as Array<Record<string, unknown>> | undefined
    if (!transfers) return false

    let totalPortfolio = 0
    let poolAmount = 0
    let targetPool = ''

    for (const t of transfers) {
      const amount = Number(t.amount || 0)
      const addr = String(t.accountId || t.to || '')
      if (addr) {
        poolAmount += amount
        targetPool = addr
      }
    }

    for (const [, exposure] of poolExposures) {
      totalPortfolio += exposure
    }
    totalPortfolio = Math.max(totalPortfolio, poolAmount)

    if (totalPortfolio === 0) return false

    const currentExposure = poolExposures.get(targetPool) || 0
    const newExposure = currentExposure + poolAmount
    const concentrationPct = (newExposure / totalPortfolio) * 100

    if (concentrationPct > this.maxConcentrationPct) {
      return true
    }

    if (targetPool) {
      poolExposures.set(targetPool, newExposure)
    }
    return false
  }

  setExposure(pool: string, amount: number): void {
    poolExposures.set(pool, amount)
  }

  getExposures(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [pool, amount] of poolExposures) {
      result[pool] = amount
    }
    return result
  }

  resetAll(): void {
    poolExposures.clear()
  }
}

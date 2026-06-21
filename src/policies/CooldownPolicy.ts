import { AbstractPolicy, PreToolExecutionParams } from '@hashgraph/hedera-agent-kit'

const lastTxTimestamps = new Map<string, number>()

export class CooldownPolicy extends AbstractPolicy {
  readonly name = 'Cooldown Policy'
  readonly description = 'Prevents rebalancing more than once per cooldown window'
  readonly relevantTools = [
    'transfer_hbar_tool',
    'transfer_fungible_token_with_allowance_tool',
    'transfer_hbar_with_allowance_tool',
  ]

  private cooldownMinutes: number

  constructor(cooldownMinutes?: number) {
    super()
    this.cooldownMinutes = cooldownMinutes ?? 60
  }

  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    const raw = params.rawParams as Record<string, unknown>
    const transfers = raw.transfers as Array<Record<string, unknown>> | undefined
    if (!transfers) return false

    const now = Date.now()
    const cooldownMs = this.cooldownMinutes * 60 * 1000

    for (const t of transfers) {
      const addr = String(t.accountId || t.to || '')
      if (!addr) continue

      const lastTx = lastTxTimestamps.get(addr) || 0
      if (now - lastTx < cooldownMs) {
        return true
      }
    }

    for (const t of transfers) {
      const addr = String(t.accountId || t.to || '')
      if (addr) {
        lastTxTimestamps.set(addr, now)
      }
    }
    return false
  }

  resetCooldown(poolAddress: string): void {
    lastTxTimestamps.delete(poolAddress)
  }

  resetAll(): void {
    lastTxTimestamps.clear()
  }
}

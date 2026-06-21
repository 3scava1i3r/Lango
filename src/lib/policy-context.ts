export function getAllowedPools(): string[] {
  const raw = process.env.ALLOWED_POOLS || ''
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export function getMaxPositionHbar(): number {
  return Number(process.env.MAX_POSITION_HBAR) || 500
}

export function getDailySpendLimitHbar(): number {
  return Number(process.env.DAILY_SPEND_LIMIT_HBAR) || 100
}

export function getMaxSlippagePct(): number {
  return Number(process.env.MAX_SLIPPAGE_PCT) || 1
}

export function getCooldownMinutes(): number {
  return Number(process.env.COOLDOWN_MINUTES) || 60
}

export function getMaxConcentrationPct(): number {
  return Number(process.env.MAX_CONCENTRATION_PCT) || 40
}

const spendStore = new Map<string, number>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getTodaySpend(): number {
  return spendStore.get(todayKey()) || 0
}

export function addTodaySpend(amount: number): void {
  const key = todayKey()
  spendStore.set(key, (spendStore.get(key) || 0) + amount)
}

export function resetDailySpend(): void {
  spendStore.clear()
}

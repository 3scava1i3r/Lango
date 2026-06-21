export class Vault {
  private principalBalance = 1000
  private yieldBalance = 0
  private totalDeposits = 1000

  deposit(amount: number): void {
    this.principalBalance += amount
    this.totalDeposits += amount
  }

  accrueYield(amount: number): void {
    this.yieldBalance += amount
  }

  canSpend(amount: number): boolean {
    return amount <= this.yieldBalance
  }

  spend(amount: number): { allowed: boolean; reason: string } {
    if (amount > this.yieldBalance) {
      return {
        allowed: false,
        reason: `Spend ${amount} exceeds available yield ${this.yieldBalance}`,
      }
    }
    this.yieldBalance -= amount
    this.principalBalance -= 0
    return { allowed: true, reason: 'ok' }
  }

  getPrincipal(): number {
    return this.principalBalance
  }

  getYield(): number {
    return this.yieldBalance
  }

  getTotal(): number {
    return this.principalBalance + this.yieldBalance
  }

  getStatus(): { principal: number; yield: number; total: number; yieldPct: string } {
    const total = this.getTotal()
    return {
      principal: this.principalBalance,
      yield: this.yieldBalance,
      total,
      yieldPct: total > 0 ? ((this.yieldBalance / total) * 100).toFixed(1) : '0.0',
    }
  }
}

export const vault = new Vault()

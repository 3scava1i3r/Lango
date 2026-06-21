'use client'

import { useState, useCallback } from 'react'

interface PolicyState {
  name: string
  description: string
  relevantTools: string[]
  category: string
  status: 'active' | 'blocked'
  lastBlocked?: string
}

interface AuditEntry {
  id: string
  timestamp: string
  tool: string
  params: string
  result: 'allowed' | 'blocked'
  policy?: string
  reason?: string
}

interface AgentDecision {
  action: string
  poolAddress?: string
  amount?: number
  reason: string
  intentRationale: string
}

const INITIAL_POLICIES: PolicyState[] = [
  { name: 'Pool Whitelist Policy', description: 'Only allows transfers to whitelisted pool addresses', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'core', status: 'active' },
  { name: 'Max Position Policy', description: 'Blocks transfers exceeding max position size (500 HBAR)', relevantTools: ['transfer_hbar_tool'], category: 'core', status: 'active' },
  { name: 'Daily Spend Limit Policy', description: 'Blocks transfers exceeding daily cap (100 HBAR)', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'core', status: 'active' },
  { name: 'Performance Fee Policy', description: 'Blocks fee collection if APY < 5% benchmark', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'core', status: 'active' },
  { name: 'Slippage Guard Policy', description: 'Blocks swaps with price impact > 1% tolerance', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'safety', status: 'active' },
  { name: 'Cooldown Policy', description: 'Prevents rebalancing more than once per 60 min', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'safety', status: 'active' },
  { name: 'Concentration Limit Policy', description: 'Blocks if single pool exceeds 40% of portfolio', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'safety', status: 'active' },
  { name: 'Intent Reason Policy', description: 'Requires 10+ char rationale before any payment', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'verification', status: 'active' },
  { name: 'Reject Tool Policy (built-in)', description: 'Blocks dangerous operations (delete, freeze)', relevantTools: ['delete_account_tool', 'delete_token_tool'], category: 'built-in', status: 'active' },
  { name: 'Principal Protection', description: 'Agent can only spend yield — principal locked', relevantTools: ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'], category: 'vault', status: 'active' },
]

export default function Dashboard() {
  const [policies, setPolicies] = useState<PolicyState[]>(INITIAL_POLICIES)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [lastDecision, setLastDecision] = useState<AgentDecision | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [vault, setVault] = useState({ principal: 1000, yield: 50, total: 1050, yieldPct: '4.8' })
  const [worstCase, setWorstCase] = useState('')

  const addAuditEntry = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    }, ...prev.slice(0, 49)])
  }, [])

  const blockPolicy = useCallback((name: string, error: string) => {
    setPolicies(prev => prev.map(p =>
      p.name === name || p.name.startsWith(name)
        ? { ...p, status: 'blocked' as const, lastBlocked: error }
        : p
    ))
  }, [])

  const resetPolicyStates = useCallback(() => {
    setPolicies(prev => prev.map(p => ({ ...p, status: 'active' as const, lastBlocked: undefined })))
    setMessage('All policy states reset')
  }, [])

  const runCuration = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'curate' }),
      })
      const data = await res.json()

      if (!res.ok) {
        addAuditEntry({ tool: 'curate', params: 'auto', result: 'blocked', policy: 'Policy Engine' })
        setMessage(`Blocked: ${data.error}`)
        setLoading(false)
        return
      }

      if (data.vault) setVault(data.vault)
      if (data.worstCase) setWorstCase(data.worstCase)
      setLastDecision(data.decision)

      addAuditEntry({
        tool: 'curate',
        params: `decision: ${data.decision.action} | "${data.decision.reason}"`,
        result: 'allowed',
        reason: data.decision.intentRationale,
      })
      setMessage(`Decision: ${data.decision.action} — ${data.decision.reason}`)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(false)
  }, [addAuditEntry])

  const executeTransfer = useCallback(async (amount: number, toAddress: string, reason: string) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          toolMethod: 'transfer_hbar_tool',
          toolParams: { reason, transfers: [{ accountId: toAddress, amount }] },
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        const err = data.error || ''
        let policyName = 'Policy Engine'
        if (err.toLowerCase().includes('whitelist')) policyName = 'Pool Whitelist Policy'
        else if (err.toLowerCase().includes('position') || err.toLowerCase().includes('500')) policyName = 'Max Position Policy'
        else if (err.toLowerCase().includes('spend') || err.toLowerCase().includes('daily')) policyName = 'Daily Spend Limit Policy'
        else if (err.toLowerCase().includes('slippage')) policyName = 'Slippage Guard Policy'
        else if (err.toLowerCase().includes('cooldown')) policyName = 'Cooldown Policy'
        else if (err.toLowerCase().includes('concentration')) policyName = 'Concentration Limit Policy'
        else if (err.toLowerCase().includes('reason') || err.toLowerCase().includes('intent')) policyName = 'Intent Reason Policy'
        else if (err.toLowerCase().includes('vault') || err.toLowerCase().includes('principal') || err.toLowerCase().includes('yield')) {
          policyName = 'Principal Protection'
          blockPolicy('Principal Protection', err)
        }

        if (policyName !== 'Principal Protection') {
          blockPolicy(policyName, err)
        }

        addAuditEntry({ tool: 'transfer_hbar_tool', params: `${amount} HBAR → ${toAddress}`, result: 'blocked', policy: policyName })
        setMessage(`Blocked by ${policyName}: ${err}`)
        setLoading(false)
        return
      }

      addAuditEntry({ tool: 'transfer_hbar_tool', params: `${amount} HBAR → ${toAddress}`, result: 'allowed', reason })
      if (data.vault) setVault(data.vault)
      setMessage('Transfer succeeded')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(false)
  }, [addAuditEntry, blockPolicy])

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'safety': return 'bg-purple-900/40 text-purple-400'
      case 'verification': return 'bg-amber-900/40 text-amber-400'
      case 'vault': return 'bg-blue-900/40 text-blue-400'
      default: return 'bg-slate-700 text-slate-300'
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hedera Policy Agent</h1>
          <p className="text-sm text-slate-400">Policy-Governed Liquidity Curation Agent</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="status-dot active"></span>
          <span className="text-sm text-slate-300">Agent Online</span>
          <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded">Hedera Testnet</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="policy-card policy-allowed">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Principal (Locked)</p>
          <p className="text-2xl font-bold text-green-400">{vault.principal} HBAR</p>
          <p className="text-xs text-slate-500">Never spendable by agent</p>
        </div>
        <div className="policy-card policy-allowed">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Yield (Available)</p>
          <p className="text-2xl font-bold text-blue-400">{vault.yield} HBAR</p>
          <p className="text-xs text-slate-500">Agent operating budget</p>
        </div>
        <div className="policy-card">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Vault</p>
          <p className="text-2xl font-bold text-white">{vault.total} HBAR</p>
          <p className="text-xs text-slate-500">{vault.yieldPct}% yield ratio</p>
        </div>
        <div className="policy-card" style={{ borderLeft: '3px solid #a855f7' }}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Worst Case</p>
          <p className="text-sm font-medium text-purple-300">Max agent loss: {vault.yield} HBAR</p>
          <p className="text-xs text-slate-500">Principal intact even if agent fails</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Policy Engine <span className="text-xs text-slate-400 font-normal">10 active rules</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {policies.map(p => (
                <div key={p.name} className={`policy-card ${p.status === 'blocked' ? 'policy-blocked' : 'policy-allowed'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm">{p.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryColor(p.category)}`}>
                        {p.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                      }`}>
                        {p.status === 'active' ? 'ALLOWING' : 'BLOCKING'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.relevantTools.map(t => (
                      <span key={t} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  {p.lastBlocked && <p className="text-xs text-red-400 mt-2">{p.lastBlocked}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Audit Trail <span className="text-xs text-slate-400 font-normal">HCS-backed immutable log</span>
            </h2>
            <div className="policy-card max-h-64 overflow-y-auto">
              {auditLog.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No actions yet.</p>
              ) : (
                auditLog.map(entry => (
                  <div key={entry.id} className="audit-entry flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${entry.result === 'allowed' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-300">{entry.tool}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          entry.result === 'allowed' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                        }`}>{entry.result.toUpperCase()}</span>
                        {entry.policy && <span className="text-[10px] text-slate-500">{entry.policy}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{entry.params}</p>
                      {entry.reason && (
                        <p className="text-[10px] text-amber-400/70 italic truncate mt-0.5">
                          Intent: &ldquo;{entry.reason}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Agent Controls</h2>

          <div className="policy-card space-y-3">
            <button onClick={runCuration} disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Processing...' : 'Run Curation Cycle'}
            </button>

            <div className="border-t border-slate-700 pt-3">
              <p className="text-xs text-slate-400 mb-2">Test: Execute Transfer</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => executeTransfer(10, '0.0.1001', 'Rebalancing LP position to optimize yield based on market conditions')} disabled={loading} className="btn btn-primary text-xs">
                  Send 10 HBAR (whitelisted, with reason)
                </button>
                <button onClick={() => executeTransfer(999, '0.0.1001', 'Testing max position policy with large transfer to verify enforcement')} disabled={loading} className="btn text-xs" style={{ background: '#dc2626', color: 'white' }}>
                  Send 999 HBAR (exceeds max position)
                </button>
                <button onClick={() => executeTransfer(50, '0.0.9999', 'Paying for external data API subscription for market analysis')} disabled={loading} className="btn text-xs" style={{ background: '#f59e0b', color: 'white' }}>
                  To non-whitelist (blocked)
                </button>
                <button onClick={() => executeTransfer(30, '0.0.1001', '')} disabled={loading} className="btn text-xs" style={{ background: '#ec4899', color: 'white' }}>
                  Empty reason (IntentReason blocks)
                </button>
                <button onClick={() => executeTransfer(2000, '0.0.1001', 'Major rebalance due to significant market volatility detected')} disabled={loading} className="btn text-xs" style={{ background: '#8b5cf6', color: 'white' }}>
                  Send 2000 HBAR (exceeds vault yield)
                </button>
              </div>
            </div>

            <button onClick={resetPolicyStates} className="btn w-full text-xs" style={{ background: '#334155', color: '#94a3b8' }}>
              Reset Policy States
            </button>

            {lastDecision && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 mb-1">Last Curation Decision</p>
                <p className="text-sm font-medium capitalize">{lastDecision.action}</p>
                <p className="text-xs text-slate-400">{lastDecision.reason}</p>
                {lastDecision.intentRationale && (
                  <p className="text-xs text-amber-400/70 italic mt-1">
                    &ldquo;{lastDecision.intentRationale}&rdquo;
                  </p>
                )}
              </div>
            )}

            {message && (
              <p className={`text-xs mt-2 ${message.includes('Blocked') || message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {message}
              </p>
            )}

            {worstCase && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 mb-1">Worst Case Scenario</p>
                <p className="text-xs text-slate-500">{worstCase}</p>
              </div>
            )}
          </div>

          <div className="policy-card">
            <h3 className="text-sm font-medium mb-2">Configuration</h3>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Max Position: <span className="text-slate-200">500 HBAR</span></p>
              <p>Daily Spend Limit: <span className="text-slate-200">100 HBAR</span></p>
              <p>Max Slippage: <span className="text-slate-200">1%</span></p>
              <p>Cooldown: <span className="text-slate-200">60 min</span></p>
              <p>Max Concentration: <span className="text-slate-200">40%</span></p>
              <p>Min Reason Length: <span className="text-slate-200">10 chars</span></p>
              <p>Benchmark APY: <span className="text-slate-200">5%</span></p>
              <p>Whitelisted: <span className="text-slate-200">0.0.1001, 0.0.1002</span></p>
              <p>Network: <span className="text-slate-200">Hedera Testnet</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

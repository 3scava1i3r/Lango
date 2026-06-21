import { NextRequest, NextResponse } from 'next/server'
import { Client, AccountId, PrivateKey } from '@hiero-ledger/sdk'
import { AgentMode, ToolDiscovery } from '@hashgraph/hedera-agent-kit'
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins'
import { HcsAuditTrailHook } from '@hashgraph/hedera-agent-kit/hooks'
import { RejectToolPolicy } from '@hashgraph/hedera-agent-kit/policies'
import {
  PoolWhitelistPolicy,
  MaxPositionPolicy,
  DailySpendPolicy,
  PerfFeePolicy,
  SlippageGuardPolicy,
  CooldownPolicy,
  ConcentrationLimitPolicy,
  IntentReasonPolicy,
} from '@/policies'
import { getHcsTopicId } from '@/lib/hedera'
import { getAllowedPools } from '@/lib/policy-context'
import { vault } from '@/lib/vault'
import { getCurationDecision } from '@/agent/curator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    const operatorId = process.env.HEDERA_OPERATOR_ID
    const operatorKey = process.env.HEDERA_OPERATOR_KEY

    if (!operatorId || !operatorKey) {
      return NextResponse.json(
        { error: 'Hedera credentials not configured' },
        { status: 400 },
      )
    }

    const client = Client.forTestnet()
    client.setOperator(
      AccountId.fromString(operatorId),
      PrivateKey.fromStringECDSA(operatorKey),
    )

    const allowedPools = getAllowedPools()
    const auditTopicId = getHcsTopicId()

    const policies = [
      new PoolWhitelistPolicy(allowedPools),
      new MaxPositionPolicy(),
      new DailySpendPolicy(),
      new PerfFeePolicy(),
      new SlippageGuardPolicy(),
      new CooldownPolicy(),
      new ConcentrationLimitPolicy(),
      new IntentReasonPolicy(),
      new RejectToolPolicy([
        'delete_account_tool',
        'delete_token_tool',
        'freeze_token_tool',
      ]),
    ]

    const hooks: any[] = [...policies]
    if (auditTopicId) {
      hooks.push(new HcsAuditTrailHook(
        ['transfer_hbar_tool', 'transfer_fungible_token_with_allowance_tool'],
        auditTopicId,
      ))
    }

    const context = {
      mode: AgentMode.AUTONOMOUS,
      hooks,
    }

    const config = { plugins: allCorePlugins, context }
    const discovery = ToolDiscovery.createFromConfiguration(config)
    const tools = discovery.getAllTools(context)

    if (action === 'curate') {
      const vaultStatus = vault.getStatus()
      const decision = await getCurationDecision(
        body.marketData || 'Current HBAR price: $0.089, 24h volume: $36M',
        body.positionState || `Position: HBAR/USDC, Vault: ${vaultStatus.total} HBAR (${vaultStatus.yieldPct}% yield)`,
      )

      const canPay = vault.canSpend(50)
      const spendCheck = vault.spend(50)

      return NextResponse.json({
        success: true,
        decision,
        vault: vaultStatus,
        spendCheck: canPay ? 'Yield sufficient for 50 HBAR spend' : `Yield insufficient: ${vaultStatus.yield} HBAR available`,
        policySummary: policies.map(p => ({
          name: p.name,
          relevantTools: p.relevantTools,
        })),
        toolsAvailable: tools.map(t => t.method),
        worstCase: `Agent CAN spend up to ${vaultStatus.yield} HBAR from yield. Agent CANNOT access ${vaultStatus.principal} HBAR principal. Agent CANNOT transfer to non-whitelisted pools. MAX single tx: 500 HBAR. MAX daily spend: 100 HBAR.`,
      })
    }

    if (action === 'execute') {
      const toolMethod = body.toolMethod as string
      const toolParams = body.toolParams as Record<string, unknown>

      if (!toolMethod || !toolParams) {
        return NextResponse.json(
          { error: 'toolMethod and toolParams required' },
          { status: 400 },
        )
      }

      const tool = tools.find(t => t.method === toolMethod)
      if (!tool) {
        return NextResponse.json(
          { error: `Tool "${toolMethod}" not found` },
          { status: 400 },
        )
      }

      const rawTransfers = toolParams.transfers as Array<Record<string, unknown>> | undefined
      if (rawTransfers) {
        for (const t of rawTransfers) {
          const amount = Number(t.amount || 0)
          if (amount > 0) {
            const check = vault.spend(amount)
            if (!check.allowed) {
              return NextResponse.json(
                { error: `Vault blocked: ${check.reason} (principal protection)` },
                { status: 400 },
              )
            }
          }
        }
      }

      const result = await tool.execute(client, context, toolParams)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    )
  } catch (err: any) {
    const message = err?.message || String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

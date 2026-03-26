import { createPublicClient, createWalletClient, http, formatUnits } from 'viem'
import { DEFAULT_ORIGIN_CHAINS, DEFAULT_RPCS, getQuote, findRoutes, type AcrossRoute, waitForFill } from './across.ts'
import { getErc20Balance, getFundedRouteBalances, getRpc } from './balance.ts'

export type UniversalProtocol = 'mpp' | 'x402' | 'unknown'

export interface AcrossConfig {
  originChainIds?: number[]
  gasBuffer?: bigint
  rpcs?: Record<number, string>
}

export interface FundingRequest {
  protocol: Exclude<UniversalProtocol, 'unknown'>
  destinationChainId: number
  destinationToken: string
  destinationAmount: bigint
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum', 10: 'Optimism', 137: 'Polygon', 4217: 'Tempo',
  8453: 'Base', 42161: 'Arbitrum',
}
function chainName(id: number): string { return CHAIN_NAMES[id] ?? `chain ${id}` }

export function createAcrossFundingController(config: {
  account: any; rawFetch: typeof globalThis.fetch; across?: AcrossConfig
}) {
  const rpcs = { ...DEFAULT_RPCS, ...config.across?.rpcs }
  const originChainIds = config.across?.originChainIds ?? DEFAULT_ORIGIN_CHAINS
  const gasBuffer = config.across?.gasBuffer ?? 10_000n

  async function ensureDestinationFunding(req: FundingRequest): Promise<void> {
    const { destinationChainId, destinationToken, destinationAmount } = req
    const destBalance = await getErc20Balance(config.account.address, destinationToken, getRpc(destinationChainId, rpcs))
    if (destBalance >= destinationAmount) return

    const shortfall = destinationAmount - destBalance + gasBuffer
    console.log(`  Across: need $${formatUnits(shortfall, 6)} USDC on ${chainName(destinationChainId)}, scanning origin chains...`)

    const routes = await findRoutes(destinationChainId, destinationToken, config.rawFetch)
    const candidates = routes.filter(r => r.originChainId !== destinationChainId && originChainIds.includes(r.originChainId))
    const funded = await getFundedRouteBalances(config.account.address, candidates, rpcs)
    if (funded.length === 0) throw new Error(`No funded origin chain found. Send USDC to ${config.account.address} on any Across-supported chain.`)

    console.log(`  Across: found USDC on ${funded.map(f => `${chainName(f.route.originChainId)} ($${formatUnits(f.balance, 6)})`).join(', ')}`)

    // Quote all funded routes, pick cheapest
    const quoted = (await Promise.allSettled(
      funded.map(async c => {
        const q = await getQuote({
          originChainId: c.route.originChainId, destinationChainId,
          inputToken: c.route.originToken, outputToken: destinationToken,
          amount: shortfall.toString(), depositor: config.account.address, recipient: config.account.address,
        }, config.rawFetch)
        return BigInt(q.inputAmount) <= c.balance ? { route: c.route, quote: q, fee: Number(q.fees.total.amountUsd) || Infinity } : null
      }),
    )).filter((r): r is PromiseFulfilledResult<{ route: AcrossRoute; quote: Awaited<ReturnType<typeof getQuote>>; fee: number }> =>
      r.status === 'fulfilled' && r.value !== null,
    ).map(r => r.value).sort((a, b) => a.fee - b.fee)

    if (quoted.length === 0) throw new Error('No origin chain has sufficient balance to cover bridge amount + fees')
    const { route, quote } = quoted[0]

    console.log(`  Across: bridging $${formatUnits(BigInt(quote.inputAmount), 6)} from ${chainName(route.originChainId)} -> ${chainName(destinationChainId)} (fee: $${quote.fees.total.amountUsd})`)

    const wallet = createWalletClient({ account: config.account, transport: http(getRpc(route.originChainId, rpcs)) })
    const pub = createPublicClient({ transport: http(getRpc(route.originChainId, rpcs)) })

    // Check ETH balance for gas
    const ethBalance = await pub.getBalance({ address: config.account.address })
    if (ethBalance === 0n) {
      throw new Error(`No ETH for gas on ${chainName(route.originChainId)}. Send a small amount of ETH to ${config.account.address} on ${chainName(route.originChainId)}.`)
    }

    // Execute approvals
    const approvals = quote.approvalTxns ?? []
    if (approvals.length > 0) {
      console.log(`  Across: approving USDC spend (${approvals.length} tx)...`)
      for (const tx of approvals) {
        const hash = await wallet.sendTransaction({ account: config.account, chain: undefined, to: tx.to as `0x${string}`, data: tx.data as `0x${string}` })
        await pub.waitForTransactionReceipt({ hash })
      }
      console.log(`  Across: approval confirmed.`)
    }

    // Execute deposit
    console.log(`  Across: sending bridge deposit...`)
    const depositHash = await wallet.sendTransaction({
      account: config.account, chain: undefined,
      to: quote.swapTx.to as `0x${string}`, data: quote.swapTx.data as `0x${string}`,
    })
    console.log(`  Across: deposit tx ${depositHash}, waiting for fill...`)
    await pub.waitForTransactionReceipt({ hash: depositHash })
    await waitForFill(depositHash, route.originChainId, config.rawFetch)
    console.log(`  Across: bridge complete!`)
  }

  return { ensureDestinationFunding, rpcs }
}

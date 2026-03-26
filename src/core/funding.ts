import { createPublicClient, createWalletClient, http } from 'viem'
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
    const routes = await findRoutes(destinationChainId, destinationToken, config.rawFetch)
    const candidates = routes.filter(r => r.originChainId !== destinationChainId && originChainIds.includes(r.originChainId))
    const funded = await getFundedRouteBalances(config.account.address, candidates, rpcs)
    if (funded.length === 0) throw new Error(`No funded origin chain found. Send USDC to ${config.account.address} on any Across-supported chain.`)

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

    const wallet = createWalletClient({ account: config.account, transport: http(getRpc(route.originChainId, rpcs)) })
    const pub = createPublicClient({ transport: http(getRpc(route.originChainId, rpcs)) })

    const ethBalance = await pub.getBalance({ address: config.account.address })
    if (ethBalance === 0n) {
      throw new Error(`No ETH for gas on chain ${route.originChainId}. Send ETH to ${config.account.address}.`)
    }

    for (const tx of quote.approvalTxns ?? []) {
      const hash = await wallet.sendTransaction({ account: config.account, chain: undefined, to: tx.to as `0x${string}`, data: tx.data as `0x${string}` })
      await pub.waitForTransactionReceipt({ hash })
    }

    const depositHash = await wallet.sendTransaction({
      account: config.account, chain: undefined,
      to: quote.swapTx.to as `0x${string}`, data: quote.swapTx.data as `0x${string}`,
    })
    await pub.waitForTransactionReceipt({ hash: depositHash })
    await waitForFill(depositHash, route.originChainId, config.rawFetch)
  }

  return { ensureDestinationFunding, rpcs }
}

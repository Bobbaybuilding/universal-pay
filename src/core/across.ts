export const ACROSS_API = 'https://app.across.to/api'

export const DEFAULT_RPCS: Record<number, string> = {
  1: 'https://eth.llamarpc.com', 10: 'https://mainnet.optimism.io',
  56: 'https://bsc-dataseed.binance.org', 130: 'https://mainnet.unichain.org',
  143: 'https://rpc.monad.xyz',
  232: 'https://rpc.lens.xyz', 324: 'https://mainnet.era.zksync.io',
  480: 'https://mainnet.worldchain.io', 999: 'https://rpc.hyperliquid.xyz/evm',
  1135: 'https://rpc.api.lisk.com', 1868: 'https://rpc.soneium.org',
  4217: 'https://rpc.presto.tempo.xyz', 8453: 'https://mainnet.base.org',
  34443: 'https://mainnet.mode.network', 41455: 'https://mainnet.alephzero.org',
  42161: 'https://arb1.arbitrum.io/rpc', 57073: 'https://rpc-gel.inkonchain.com',
  59144: 'https://rpc.linea.build', 81457: 'https://rpc.blast.io',
  534352: 'https://rpc.scroll.io', 7777777: 'https://rpc.zora.energy',
}

export const DEFAULT_ORIGIN_CHAINS = Object.keys(DEFAULT_RPCS).map(Number)

export interface AcrossRoute {
  originChainId: number; originToken: string
  destinationChainId: number; destinationToken: string
}

export interface AcrossQuote {
  inputAmount: string
  approvalTxns: Array<{ to: string; data: string }>
  swapTx: { to: string; data: string }
  fees: { total: { amountUsd: string } }
}

export function parseEip155ChainId(network: string): number {
  const match = network.match(/^eip155:(\d+)$/)
  if (!match) throw new Error(`Unsupported network: ${network}`)
  return Number(match[1])
}

const routeCache = new Map<string, { routes: AcrossRoute[]; ts: number }>()
const ROUTE_CACHE_TTL = 300_000 // 5 min

export async function findRoutes(destChainId: number, outputToken: string, f = globalThis.fetch): Promise<AcrossRoute[]> {
  const key = `${destChainId}:${outputToken.toLowerCase()}`
  const cached = routeCache.get(key)
  if (cached && Date.now() - cached.ts < ROUTE_CACHE_TTL) return cached.routes

  const url = new URL(`${ACROSS_API}/available-routes`)
  url.searchParams.set('destinationChainId', destChainId.toString())
  const res = await f(url.toString())
  if (!res.ok) return []
  const routes = ((await res.json()) as AcrossRoute[]).filter(r => r.destinationToken.toLowerCase() === outputToken.toLowerCase())
  routeCache.set(key, { routes, ts: Date.now() })
  return routes
}

export async function getQuote(params: {
  originChainId: number; destinationChainId: number; inputToken: string
  outputToken: string; amount: string; depositor: string; recipient: string
}, f = globalThis.fetch): Promise<AcrossQuote> {
  const url = new URL(`${ACROSS_API}/swap/approval`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('tradeType', 'exactOutput')
  const res = await f(url.toString())
  if (!res.ok) throw new Error(`Across quote failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as AcrossQuote
}

export async function waitForFill(depositTxHash: string, originChainId: number, f = globalThis.fetch, timeoutMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const url = new URL(`${ACROSS_API}/deposit/status`)
    url.searchParams.set('originChainId', originChainId.toString())
    url.searchParams.set('depositTxHash', depositTxHash)
    const res = await f(url.toString())
    if (res.ok) {
      const s = (await res.json()) as { status: string }
      if (s.status === 'filled') return
      if (s.status === 'expired') throw new Error('Across deposit expired')
    }
    await new Promise(r => setTimeout(r, 2_000))
  }
  throw new Error(`Across fill timed out after ${timeoutMs / 1000}s`)
}

import { ACROSS_API, DEFAULT_RPCS, type AcrossRoute } from './lib/core/across.ts'

export interface ChainInfo {
  id: number
  token: `0x${string}`
  symbol: string
  rpc: string
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum', 10: 'Optimism', 56: 'BSC', 130: 'Unichain', 137: 'Polygon',
  143: 'Monad', 232: 'Lens', 324: 'zkSync', 480: 'World Chain', 999: 'Hyperliquid',
  1135: 'Lisk', 1868: 'Soneium', 4217: 'Tempo', 8453: 'Base', 34443: 'Mode',
  41455: 'Aleph Zero', 42161: 'Arbitrum', 57073: 'Ink', 59144: 'Linea',
  81457: 'Blast', 534352: 'Scroll', 7777777: 'Zora', 34268394551451: 'Solana',
}

function getRpc(chainId: number): string {
  return DEFAULT_RPCS[chainId] ?? `https://lb.drpc.org/ogrpc?network=${chainId}`
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`
}

function isStablecoin(symbol: string): boolean {
  const s = symbol.toUpperCase()
  return s === 'USDC' || s === 'USDC.E' || s === 'USDCE'
}

let cached: ChainInfo[] | null = null
let cacheTime = 0

export async function discoverChains(): Promise<ChainInfo[]> {
  if (cached && Date.now() - cacheTime < 300_000) return cached

  const res = await fetch(`${ACROSS_API}/available-routes`)
  if (!res.ok) throw new Error(`Across routes API failed: ${res.status}`)

  const routes = (await res.json()) as (AcrossRoute & { originTokenSymbol: string; destinationTokenSymbol: string })[]
  const map = new Map<number, ChainInfo>()

  for (const r of routes) {
    if (isStablecoin(r.originTokenSymbol) && !map.has(r.originChainId))
      map.set(r.originChainId, { id: r.originChainId, token: r.originToken as `0x${string}`, symbol: r.originTokenSymbol, rpc: getRpc(r.originChainId) })
    if (isStablecoin(r.destinationTokenSymbol) && !map.has(r.destinationChainId))
      map.set(r.destinationChainId, { id: r.destinationChainId, token: r.destinationToken as `0x${string}`, symbol: r.destinationTokenSymbol, rpc: getRpc(r.destinationChainId) })
  }

  cached = [...map.values()].sort((a, b) => a.id - b.id)
  cacheTime = Date.now()
  return cached
}

export async function discoverOriginChainIds(): Promise<number[]> {
  return (await discoverChains()).map(c => c.id)
}

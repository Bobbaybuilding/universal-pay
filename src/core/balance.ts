import { createPublicClient, erc20Abi, http, type Address } from 'viem'
import { DEFAULT_RPCS, type AcrossRoute } from './across.ts'

export function getRpc(chainId: number, rpcs: Record<number, string> = {}): string {
  return rpcs[chainId] ?? DEFAULT_RPCS[chainId] ?? `https://lb.drpc.org/ogrpc?network=${chainId}`
}

export async function getErc20Balance(address: string, token: string, rpcUrl: string): Promise<bigint> {
  try {
    return await createPublicClient({ transport: http(rpcUrl) }).readContract({ address: token as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address as Address] })
  } catch { return 0n }
}

export async function getFundedRouteBalances(address: string, routes: AcrossRoute[], rpcs: Record<number, string> = {}) {
  const results = await Promise.allSettled(
    routes.map(async route => ({ route, balance: await getErc20Balance(address, route.originToken, getRpc(route.originChainId, rpcs)) })),
  )
  return results.filter((r): r is PromiseFulfilledResult<{ route: AcrossRoute; balance: bigint }> => r.status === 'fulfilled' && r.value.balance > 0n).map(r => r.value)
}

import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { isTempoInstalled, isTempoLoggedIn, getAddress, getTempoWallet } from './wallet.ts'
import { discoverChains, getChainName } from './chains.ts'

if (!isTempoInstalled()) { console.error('Tempo CLI not installed. Run: curl -fsSL https://tempo.xyz/install | bash'); process.exit(1) }
if (!isTempoLoggedIn()) { console.error('Not logged in. Run: tempo wallet login'); process.exit(1) }

const address = getAddress()
const tempoWallet = getTempoWallet()

console.log(`Signing key: ${address}`)
console.log(`Tempo wallet: ${tempoWallet.wallet} ($${tempoWallet.balance.available} ${tempoWallet.balance.symbol})`)
console.log(`\nDiscovering chains...\n`)

const chains = await discoverChains()

let total = 0n
const results = await Promise.allSettled(
  chains.map(async (chain) => {
    const client = createPublicClient({ transport: http(chain.rpc) })
    const balance = await client.readContract({ address: chain.token, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] })
    return { chain, balance }
  }),
)

for (const r of results) {
  if (r.status === 'fulfilled') {
    const { chain, balance } = r.value
    total += balance
    console.log(`${getChainName(chain.id).padEnd(20)}${balance > 0n ? '$' + formatUnits(balance, 6) : '-'}`)
  }
}
console.log(`${'='.repeat(30)}\n${'Total'.padEnd(20)}$${formatUnits(total, 6)}`)
if (total === 0n) console.log(`\nSend USDC to ${address} on any Across-supported chain.`)

import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'
import { execSync } from 'child_process'

import { createAcrossFundingController, type AcrossConfig } from '../core/funding.ts'
import { getErc20Balance, getRpc } from '../core/balance.ts'

const TEMPO_BIN = `${process.env.HOME}/.tempo/bin/tempo`
const TEMPO_CHAIN_ID = 4217
const TEMPO_RPC = 'https://rpc.tempo.xyz'

function transferFromTempoWallet(amount: string, token: string, to: string): void {
  const humanAmount = (Number(amount) / 1e6).toFixed(6)
  console.log(`  Transferring $${humanAmount} USDC from Tempo wallet -> signing key...`)
  execSync(`${TEMPO_BIN} wallet transfer ${humanAmount} ${token} ${to}`, {
    encoding: 'utf-8',
    timeout: 30_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log(`  Transfer complete.`)
}

async function waitForBalance(address: string, token: string, required: bigint, maxWaitMs = 5_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const bal = await getErc20Balance(address, token, TEMPO_RPC)
    if (bal >= required) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

export function createMppAdapter(config: {
  privateKey: `0x${string}`
  rawFetch?: typeof globalThis.fetch
  across?: AcrossConfig
  methods?: any[]
  polyfill?: boolean
}) {
  const rawFetch = config.rawFetch ?? globalThis.fetch
  const account = privateKeyToAccount(config.privateKey)
  const funding = createAcrossFundingController({ account, rawFetch, across: config.across })

  const mppx = Mppx.create({
    fetch: rawFetch,
    methods: config.methods ?? [tempo({ account, autoSwap: true })],
    polyfill: config.polyfill ?? false,
    async onChallenge(challenge) {
      if (challenge.method !== 'tempo' || challenge.intent !== 'charge') return undefined
      const req = challenge.request as { amount: string; currency: string; methodDetails?: { chainId?: number } }
      if (!req.methodDetails?.chainId) return undefined

      const chainId = req.methodDetails.chainId
      const requiredAmount = BigInt(req.amount)

      // Check signing key's on-chain balance
      const rpc = chainId === TEMPO_CHAIN_ID ? TEMPO_RPC : getRpc(chainId)
      const onChainBalance = await getErc20Balance(account.address, req.currency, rpc)
      if (onChainBalance >= requiredAmount) return undefined

      // For Tempo chain: transfer from custodial Tempo wallet to signing key
      if (chainId === TEMPO_CHAIN_ID) {
        try {
          const { getTempoWallet } = await import('../../wallet.ts')
          const wallet = getTempoWallet()
          const tempoAvailable = parseFloat(wallet.balance.available) * 1e6
          const shortfall = Number(requiredAmount - onChainBalance)
          if (tempoAvailable >= shortfall) {
            const transferAmount = Math.ceil(shortfall * 1.05).toString()
            transferFromTempoWallet(transferAmount, req.currency, account.address)
            // Poll until balance appears on-chain (handles race condition)
            await waitForBalance(account.address, req.currency, requiredAmount)
            return undefined
          }
        } catch (e) {
          console.log(`  Tempo wallet transfer failed: ${e instanceof Error ? e.message : e}`)
        }
      }

      // Fallback: crosschain bridging via Across
      await funding.ensureDestinationFunding({
        protocol: 'mpp',
        destinationChainId: chainId,
        destinationToken: req.currency,
        destinationAmount: requiredAmount,
      })
      return undefined
    },
  })

  return {
    fetch: mppx.fetch,
    isPaymentRequired: (r: Response) => r.status === 402 && !r.headers.get('PAYMENT-REQUIRED') && !!r.headers.get('WWW-Authenticate'),
  }
}

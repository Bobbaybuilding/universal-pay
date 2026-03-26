import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

import { createAcrossFundingController, type AcrossConfig } from '../core/funding.ts'

export interface LocalFundingParams {
  chainId: number
  token: string
  amount: bigint
  address: string
}

export function createMppAdapter(config: {
  privateKey: `0x${string}`
  rawFetch?: typeof globalThis.fetch
  across?: AcrossConfig
  methods?: any[]
  polyfill?: boolean
  onLocalFunding?: (params: LocalFundingParams) => Promise<boolean>
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

      // Optional: let consumer handle local funding (e.g. custodial wallet transfer)
      if (config.onLocalFunding) {
        const handled = await config.onLocalFunding({
          chainId, token: req.currency, amount: requiredAmount, address: account.address,
        })
        if (handled) return undefined
      }

      // Crosschain bridging via Across
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

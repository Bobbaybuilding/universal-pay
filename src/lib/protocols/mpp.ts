import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

import { createAcrossFundingController, type AcrossConfig } from '../core/funding.ts'

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
      await funding.ensureDestinationFunding({
        protocol: 'mpp',
        destinationChainId: req.methodDetails.chainId,
        destinationToken: req.currency,
        destinationAmount: BigInt(req.amount),
      })
      return undefined
    },
  })

  return {
    fetch: mppx.fetch,
    isPaymentRequired: (r: Response) => r.status === 402 && !r.headers.get('PAYMENT-REQUIRED') && !!r.headers.get('WWW-Authenticate'),
  }
}

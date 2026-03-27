import { x402Client, x402HTTPClient } from '@x402/core/client'
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm'
import { wrapFetchWithPayment } from '@x402/fetch'
import { privateKeyToAccount } from 'viem/accounts'

import { parseEip155ChainId } from '../core/across.js'
import { createAcrossFundingController, type AcrossConfig } from '../core/funding.js'

export function createX402Adapter(config: {
  privateKey: `0x${string}`
  rawFetch?: typeof globalThis.fetch
  across?: AcrossConfig
}) {
  const rawFetch = config.rawFetch ?? globalThis.fetch
  const account = privateKeyToAccount(config.privateKey)
  const funding = createAcrossFundingController({ account, rawFetch, across: config.across })

  const rpcConfig = Object.fromEntries(
    Object.entries(funding.rpcs ?? {}).map(([id, url]) => [Number(id), { rpcUrl: url }]),
  )

  const client = new x402Client()
    .register('eip155:*', new ExactEvmScheme(toClientEvmSigner(account), rpcConfig))
    .onBeforePaymentCreation(async ({ selectedRequirements }) => {
      if (!selectedRequirements.network.startsWith('eip155:')) return
      await funding.ensureDestinationFunding({
        protocol: 'x402',
        destinationChainId: parseEip155ChainId(selectedRequirements.network),
        destinationToken: selectedRequirements.asset,
        destinationAmount: BigInt(selectedRequirements.amount),
      })
    })

  return {
    fetch: wrapFetchWithPayment(rawFetch, new x402HTTPClient(client)),
    isPaymentRequired: (r: Response) => r.status === 402 && r.headers.get('PAYMENT-REQUIRED') !== null,
    get lastBridge() { return funding.lastBridge },
  }
}

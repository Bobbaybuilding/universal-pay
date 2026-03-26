import { privateKeyToAccount } from 'viem/accounts'

import { type AcrossConfig, type UniversalProtocol } from './core/funding.ts'
import { createMppAdapter } from './protocols/mpp.ts'
import { createX402Adapter } from './protocols/x402.ts'

export interface UniversalFetchConfig {
  privateKey: `0x${string}`
  polyfill?: boolean
  across?: AcrossConfig
  mpp?: { methods?: any[] }
}

async function toReplayableRequest(input: RequestInfo | URL, init?: RequestInit) {
  const request = new Request(input, init)
  const replayInit: RequestInit = {
    method: request.method,
    headers: new Headers(request.headers),
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    const body = await request.clone().arrayBuffer()
    if (body.byteLength > 0) replayInit.body = body.slice(0)
  }
  return { input: request.url, init: replayInit }
}

function cloneInit(init: RequestInit): RequestInit {
  const cloned: RequestInit = { ...init, headers: init.headers ? new Headers(init.headers) : undefined }
  if (init.body instanceof ArrayBuffer) cloned.body = init.body.slice(0)
  return cloned
}

export function createUniversalFetchWithAcross(config: UniversalFetchConfig) {
  const rawFetch = globalThis.fetch
  const account = privateKeyToAccount(config.privateKey)
  let lastProtocol: UniversalProtocol | null = null

  const x402 = createX402Adapter({ privateKey: config.privateKey, across: config.across, rawFetch, polyfill: false })
  const mpp = createMppAdapter({ privateKey: config.privateKey, across: config.across, rawFetch, methods: config.mpp?.methods, polyfill: false })

  async function fetchWithPayment(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = await toReplayableRequest(input, init)
    const probe = await rawFetch(req.input, cloneInit(req.init))

    if (x402.isPaymentRequired(probe)) {
      lastProtocol = 'x402'
      return x402.fetch(req.input, cloneInit(req.init))
    }
    if (mpp.isPaymentRequired(probe)) {
      lastProtocol = 'mpp'
      return mpp.fetch(req.input, cloneInit(req.init))
    }

    lastProtocol = probe.status === 402 ? 'unknown' : null
    return probe
  }

  if (config.polyfill ?? true) globalThis.fetch = fetchWithPayment

  return {
    account,
    fetch: fetchWithPayment,
    get lastProtocol() { return lastProtocol },
    rawFetch,
  }
}

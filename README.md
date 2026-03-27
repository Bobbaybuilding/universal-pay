# universal-pay

Pay any HTTP 402 merchant on any chain. Auto-detects x402 or MPP, bridges funds via [Across](https://across.to/).

## Install

```bash
npm install universal-pay
```

## Usage

```typescript
import { createUniversalFetchWithAcross } from 'universal-pay'

const client = createUniversalFetchWithAcross({
  privateKey: process.env.UNIVERSAL_PAY_KEY as `0x${string}`,
})

// Pays automatically — detects protocol, bridges if needed
const response = await client.fetch('https://merchant.example.com')
```

## How It Works

1. **Probe** — makes the request, gets `402 Payment Required`
2. **Detect** — reads headers: `PAYMENT-REQUIRED` = x402, `WWW-Authenticate` = MPP
3. **Bridge** — if funds are on the wrong chain, bridges via Across
4. **Pay** — replays the request through the native protocol adapter

## Config

```typescript
createUniversalFetchWithAcross({
  privateKey: process.env.UNIVERSAL_PAY_KEY as `0x${string}`,  // required
  polyfill: false,                  // replace globalThis.fetch (default: false)
  across: {
    originChainIds: [42161, 8453],  // chains to scan for funds
    rpcs: { 42161: 'https://...' }, // custom RPCs
  },
})
```

## License

MIT

# Universal Pay

Pay any HTTP 402 API — x402 or MPP — on any chain. Across bridges funds automatically.

## Setup

```bash
npm install universal-pay
```

### Wallet (if not set up)

Install the Tempo CLI and create a wallet:

```bash
curl -fsSL https://tempo.xyz/install | bash
~/.tempo/bin/tempo wallet login
```

Once logged in, set the private key as an environment variable:

```bash
export UNIVERSAL_PAY_KEY=$(~/.tempo/bin/tempo wallet -j whoami | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).key.key))")
```

The signing key address is in `key.address` — fund it with USDC + ETH on any chain (Arbitrum is cheapest).

## Usage

```typescript
import { createUniversalFetchWithAcross } from 'universal-pay'

const client = createUniversalFetchWithAcross({
  privateKey: process.env.UNIVERSAL_PAY_KEY as `0x${string}`,
})

const response = await client.fetch('<URL>')
```

## Verified Endpoints

**MPP — Firecrawl** (scrape any website, $0.002, Tempo chain):
```typescript
const res = await client.fetch('https://firecrawl.mpp.tempo.xyz/v1/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' }),
})
```

**x402 — CoinGecko** (live crypto prices, $0.01, Base chain):
```typescript
const res = await client.fetch('https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol')
```


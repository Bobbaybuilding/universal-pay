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

Once logged in, get the private key:

```bash
~/.tempo/bin/tempo wallet -j whoami
```

The private key is in the `key.key` field. The signing key address is in `key.address` — fund it with USDC + ETH on any chain (Arbitrum is cheapest).

## Usage

```typescript
import { createUniversalFetchWithAcross } from 'universal-pay'

const client = createUniversalFetchWithAcross({
  privateKey: '<key.key from tempo wallet>',
})

const response = await client.fetch('<URL>')
```

## Examples

### x402 — CoinGecko prices (Base chain, ~$0.01)

```typescript
const res = await client.fetch('https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol')
```

### MPP — Firecrawl scraper (Tempo chain, ~$0.01)

```typescript
const res = await client.fetch('https://firecrawl.mpp.tempo.xyz/v1/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://across.to' }),
})
```

### MPP — Exa search (Tempo chain, ~$0.01)

```typescript
const res = await client.fetch('https://exa.mpp.tempo.xyz/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'cross-chain bridges', numResults: 3 }),
})
```

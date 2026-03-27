# Universal Pay

Pay any HTTP 402 API — x402 or MPP — on any chain. Across bridges funds automatically.

## Setup

### 1. Install package

```bash
npm install universal-pay
```

### 2. Tempo wallet

Check if logged in:
```bash
~/.tempo/bin/tempo wallet -j whoami 2>/dev/null && echo "logged in" || echo "not logged in"
```

If not logged in, install Tempo CLI and create a wallet:
```bash
curl -fsSL https://tempo.xyz/install | bash
~/.tempo/bin/tempo wallet login
```

Get the signing key and address:
```bash
~/.tempo/bin/tempo wallet -j whoami | python3 -c "import json,sys; d=json.load(sys.stdin); print('Key:', d['key']['key']); print('Address:', d['key']['address'])"
```

Fund the signing key address with USDC + ETH on any chain (Arbitrum is cheapest).

## Usage

Save as `pay.mjs`:
```js
import { execSync } from 'child_process'
import { createUniversalFetchWithAcross } from 'universal-pay'

const tempo = JSON.parse(execSync('~/.tempo/bin/tempo wallet -j whoami', { encoding: 'utf-8' }))
const client = createUniversalFetchWithAcross({ privateKey: tempo.key.key })

const response = await client.fetch('<URL>')
const text = await response.text()
console.log('Protocol:', client.lastProtocol)
console.log('Bridge:', client.lastBridge)
try { console.log(JSON.stringify(JSON.parse(text), null, 2)) } catch { console.log(text) }
```

Run: `node pay.mjs`

## Verified Endpoints

**MPP — Firecrawl** (scrape any website, ~$0.002, Tempo chain):
```js
const res = await client.fetch('https://firecrawl.mpp.tempo.xyz/v1/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' }),
})
```

**x402 — CoinGecko** (live crypto prices, ~$0.01, Base chain):
```js
const res = await client.fetch('https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol')
```


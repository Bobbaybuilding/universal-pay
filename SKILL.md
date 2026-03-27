# Universal Pay

Pay any HTTP 402 API — x402 or MPP — on any chain. Across bridges funds automatically.

## Setup

### 1. Install package (if not already installed)

Check: `node -e "require.resolve('universal-pay')" 2>/dev/null && echo installed || echo "not installed"`

If not installed:
```bash
npm install universal-pay
```

### 2. Wallet (if UNIVERSAL_PAY_KEY not already set)

If `echo $UNIVERSAL_PAY_KEY` prints a key starting with `0x`, skip this step.

Install Tempo CLI and get your signing key:
```bash
curl -fsSL https://tempo.xyz/install | bash
~/.tempo/bin/tempo wallet login
export UNIVERSAL_PAY_KEY=$(~/.tempo/bin/tempo wallet -j whoami | python3 -c "import json,sys; print(json.load(sys.stdin)['key']['key'])")
```

Fund the signing key address with USDC + ETH on any chain (Arbitrum is cheapest). Get the address:
```bash
~/.tempo/bin/tempo wallet -j whoami | python3 -c "import json,sys; print(json.load(sys.stdin)['key']['address'])"
```

## Usage

Save as `pay.mjs`:
```js
import { createUniversalFetchWithAcross } from 'universal-pay'

const client = createUniversalFetchWithAcross({
  privateKey: process.env.UNIVERSAL_PAY_KEY,
})

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


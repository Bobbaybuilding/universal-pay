# Universal Pay

Pay any HTTP 402 API on any chain. Auto-detects x402 or MPP, bridges funds crosschain via Across.

## When invoked, follow these steps in order:

### Step 1 — Check wallet

Run this to check if Tempo CLI is logged in and get the signing key:

```bash
~/.tempo/bin/tempo wallet -j whoami 2>/dev/null
```

If this fails, install Tempo CLI and create a wallet:

```bash
curl -fsSL https://tempo.xyz/install | bash
~/.tempo/bin/tempo wallet login
```

Then run the whoami command again.

From the JSON output, note the `key.key` (private key) and `key.address` (signing key address). The signing key address is where USDC should be funded.

### Step 2 — Ask what to pay

Ask the user which merchant they want to pay. Suggest these verified options:

- **Firecrawl** — scrape any website (~$0.002, MPP on Tempo chain)
- **CoinGecko** — live crypto prices (~$0.01, x402 on Base chain)
- Or the user can provide any HTTP 402 URL

### Step 3 — Pay

Install the package if needed (`npm install universal-pay`), then run the payment inline using `node --input-type=module -e`:

**Firecrawl (MPP):**
```bash
node --input-type=module -e "
import { execSync } from 'child_process'
import { createUniversalFetchWithAcross } from 'universal-pay'
const tempo = JSON.parse(execSync(process.env.HOME + '/.tempo/bin/tempo wallet -j whoami', { encoding: 'utf-8' }))
const client = createUniversalFetchWithAcross({ privateKey: tempo.key.key })
const res = await client.fetch('https://firecrawl.mpp.tempo.xyz/v1/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'URL_HERE' }),
})
console.log('Status:', res.status, '| Protocol:', client.lastProtocol)
console.log('Bridge:', JSON.stringify(client.lastBridge))
const data = await res.json()
console.log(JSON.stringify(data, null, 2))
"
```

**CoinGecko (x402):**
```bash
node --input-type=module -e "
import { execSync } from 'child_process'
import { createUniversalFetchWithAcross } from 'universal-pay'
const tempo = JSON.parse(execSync(process.env.HOME + '/.tempo/bin/tempo wallet -j whoami', { encoding: 'utf-8' }))
const client = createUniversalFetchWithAcross({ privateKey: tempo.key.key })
const res = await client.fetch('https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol')
console.log('Status:', res.status, '| Protocol:', client.lastProtocol)
console.log('Bridge:', JSON.stringify(client.lastBridge))
const data = await res.json()
console.log(JSON.stringify(data, null, 2))
"
```

Replace `URL_HERE` with whatever URL the user wants to scrape.

### Step 4 — Show results

Display the status code, protocol detected (x402 or MPP), bridge info (if crosschain transfer happened), and the API response data.

# Universal 402 Pay

Pay for any HTTP `402 Payment Required` API — on any chain, using any protocol — with one fetch call.

Auto-detects whether a merchant uses [x402](https://www.x402.org/) or [MPP](https://tempo.xyz/), bridges funds crosschain via [Across Protocol](https://across.to/), and pays using a [Tempo](https://tempo.xyz/) wallet.

## Install

```bash
npx skills add https://github.com/Bobbaybuilding/universal-pay --yes
```

Or clone manually:

```bash
git clone https://github.com/Bobbaybuilding/universal-pay.git
cd universal-pay && npm install
```

## Setup

1. Install the [Tempo CLI](https://tempo.xyz/):

```bash
curl -fsSL https://tempo.xyz/install | bash
```

2. Create or log in to your wallet:

```bash
tempo wallet login
```

3. Fund your wallet with USDC on any chain (Arbitrum, Base, Optimism, Polygon, etc.)

## Usage

```bash
# Check wallet + balances across all chains
node --experimental-strip-types src/wallet.ts
node --experimental-strip-types src/balance-check.ts

# Pay any 402 API
node --experimental-strip-types src/demo.ts <URL> [METHOD] [BODY]
```

## Quick Demos

```bash
# x402 — CoinGecko price API (Base chain, ~$0.01)
node --experimental-strip-types src/demo.ts \
  'https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol'

# MPP — Firecrawl web scraper (Tempo chain, ~$0.01)
node --experimental-strip-types src/demo.ts \
  'https://firecrawl.mpp.tempo.xyz/v1/scrape' POST '{"url":"https://across.to"}'

# MPP — Exa search (Tempo chain, ~$0.01)
node --experimental-strip-types src/demo.ts \
  'https://exa.mpp.tempo.xyz/search' POST '{"query":"cross-chain bridges","numResults":3}'
```

## How It Works

1. **Probe** — Makes the request, gets a `402 Payment Required` response
2. **Detect** — Reads response headers to determine the protocol:
   - `PAYMENT-REQUIRED` header → x402
   - `WWW-Authenticate` header → MPP
3. **Fund** — If the wallet lacks funds on the destination chain, bridges USDC via Across
4. **Pay** — Replays the request through the native protocol adapter
5. **Return** — Returns the paid API response

## Supported Chains

Dynamically discovered via Across API — currently 19+ chains including Arbitrum, Base, Optimism, Polygon, Ethereum, Tempo, Unichain, Linea, Scroll, zkSync, and more.

## License

MIT

---
name: universal-pay
description: Universal 402 payment — pay any x402 or MPP merchant on any chain. Auto-detects protocol (x402 or MPP), bridges funds crosschain via Across, pays with Tempo wallet. Use when an agent needs to pay for an HTTP 402 resource.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
license: MIT
metadata:
  author: Across Protocol
  version: 1.0.0
---

# Universal 402 Pay (Across + Tempo)

Pay for any HTTP `402 Payment Required` API — MPP or x402 — on any chain, with automatic crosschain bridging via Across Protocol and Tempo wallet.

## First-Time Setup

Find where this skill is installed and ensure dependencies are ready:

```bash
SKILL_DIR="$(dirname "$(readlink -f ~/.claude/skills/universal-pay/SKILL.md 2>/dev/null || echo ~/.claude/skills/universal-pay/SKILL.md)")"
cd "$SKILL_DIR" && [ -d node_modules ] || npm install
```

### Install Tempo CLI (if not installed)

```bash
curl -fsSL https://tempo.xyz/install | bash
```

## When Invoked

Follow these steps in order:

### Step 1 — Create or Connect Wallet

Check if a Tempo wallet already exists:

```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/wallet.ts
```

If not logged in, create a new wallet:

```bash
~/.tempo/bin/tempo wallet login
```

This opens a browser to sign up or log in. Once complete, show the user:

1. **Signing key address** — where USDC should be sent for crosschain payments (displayed by `wallet.ts`)
2. **Tempo wallet address** — holds USDC on Tempo chain for MPP payments
3. **Tempo balance** — USDC available on Tempo

Tell the user: **"Send USDC to your signing key address on any chain (Arbitrum, Base, Optimism, etc.) to fund crosschain payments."**

The agent can also fund the Tempo wallet directly using:

```bash
~/.tempo/bin/tempo wallet fund
```

This opens an interactive flow to bridge USDC from any EVM chain into the Tempo wallet.

### Step 2 — Check Balance

```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/balance-check.ts
```

This discovers all 19+ Across-supported chains and checks USDC balance on each. Also shows Tempo wallet balance.

If balance is zero everywhere, tell the user to send USDC to their signing key address. Do NOT proceed to payment.

### Step 3 — Pay

If the user provided a URL, pay it:

```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts "<URL>" [GET|POST] ['{"json":"body"}']
```

If no URL was provided, show the quick demos below and ask what they'd like to try.

### Step 4 — Show Results

Display:
- Protocol detected (x402 or MPP)
- Bridge info (if crosschain transfer was needed)
- API response data
- Status code

## Quick Demos

### x402 — CoinGecko Price API (~$0.01, Base chain)
```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol'
```

### MPP — Firecrawl Web Scraper (~$0.01, Tempo chain)
```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://firecrawl.mpp.tempo.xyz/v1/scrape' POST '{"url":"https://across.to"}'
```

### MPP — Exa Search (~$0.01, Tempo chain)
```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://exa.mpp.tempo.xyz/search' POST '{"query":"best cross-chain bridges","numResults":3}'
```

## How It Works

1. **Wallet** — Tempo CLI manages the wallet. The spending key is extracted for signing crosschain transactions.
2. **Probe** — Makes an unpaid request to detect the 402 response
3. **Detect** — `PAYMENT-REQUIRED` header -> x402 / `WWW-Authenticate` header -> MPP
4. **Fund** — Discovers all Across-supported chains, scans for USDC, bridges via Across if needed
5. **Pay** — Replays the request through the native protocol adapter
6. **Return** — Returns the paid API response

## Supported Chains

Dynamically discovered via Across API — currently 19+ chains including Arbitrum, Base, Optimism, Polygon, Ethereum, Tempo, Unichain, Linea, Scroll, zkSync, Mode, Lisk, Soneium, Ink, and more.

Crosschain bridging is automatic — fund on any chain, pay on any chain.

## Architecture

```
src/
  demo.ts               — CLI entry point
  wallet.ts             — Tempo CLI wallet integration
  balance-check.ts      — Multi-chain USDC balance scanner
  chains.ts             — Across chain discovery
  lib/
    universal.ts        — Protocol dispatch + request replay
    core/
      across.ts         — Across API client (routes, quotes, fill polling)
      funding.ts        — Crosschain funding controller
      balance.ts        — ERC-20 balance checks
    protocols/
      x402.ts           — x402 adapter (EVM signing)
      mpp.ts            — MPP adapter (Tempo charge flow)
```

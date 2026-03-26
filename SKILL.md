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

## When Invoked

### Step 1 — Wallet

Check if Tempo CLI is installed and user is logged in:

```bash
~/.tempo/bin/tempo wallet -j whoami 2>/dev/null && echo "WALLET_OK" || echo "NO_WALLET"
```

**If NO_WALLET:** Ask the user — "You need a Tempo wallet to make payments. Want me to set one up?" If yes:

```bash
curl -fsSL https://tempo.xyz/install | bash
~/.tempo/bin/tempo wallet login
```

This opens a browser to create a wallet. Once done, show the wallet info:

```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/wallet.ts
```

Tell the user their **signing key address** and that they need to **send USDC to it on any chain** (Arbitrum is cheapest for gas). Do NOT proceed until they confirm funding.

**If WALLET_OK:** Show wallet info and proceed directly to Step 2.

### Step 2 — Pay

Ask the user what they want to pay. If they didn't specify a URL, offer these demos:

- **Firecrawl** — scrape any website (~$0.01, MPP on Tempo)
- **Exa** — AI-powered search (~$0.01, MPP on Tempo)
- **CoinGecko** — live crypto prices (~$0.01, x402 on Base)

Then run:

```bash
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts "<URL>" [GET|POST] ['{"json":"body"}']
```

**Demo commands:**

```bash
# Firecrawl
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://firecrawl.mpp.tempo.xyz/v1/scrape' POST '{"url":"https://across.to"}'

# Exa
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://exa.mpp.tempo.xyz/search' POST '{"query":"cross-chain bridges","numResults":3}'

# CoinGecko (x402)
cd "$SKILL_DIR" && node --experimental-strip-types src/demo.ts 'https://pro-api.coingecko.com/api/v3/x402/simple/price?vs_currencies=usd&symbols=btc,eth,sol'
```

### Step 3 — Show Results

Display the status code, protocol detected (x402 or MPP), and the API response.

## How It Works

1. **Wallet** — Tempo CLI manages the wallet. The spending key is extracted for signing.
2. **Probe** — Makes an unpaid request to detect the 402 response
3. **Detect** — `PAYMENT-REQUIRED` header -> x402 / `WWW-Authenticate` header -> MPP
4. **Fund** — If needed, transfers from Tempo wallet or bridges via Across
5. **Pay** — Replays the request through the native protocol adapter

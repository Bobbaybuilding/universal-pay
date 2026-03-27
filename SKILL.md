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

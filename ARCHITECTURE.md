# Architecture

## Flow

```
Agent calls fetch(url)
        |
        v
   +-----------+
   |   Probe   |  Makes unpaid request, gets 402
   +-----------+
        |
        v
   +-----------+
   |  Detect   |  PAYMENT-REQUIRED header -> x402
   |           |  WWW-Authenticate header -> MPP
   +-----------+
        |
   +----+----+
   |         |
   v         v
+------+  +-----+
| x402 |  | MPP |   Protocol adapters (thin wrappers)
+------+  +-----+
   |         |
   +----+----+
        |
        v
   +-----------+
   |  Funding  |  Check destination balance
   |           |  If short: scan origins, quote Across, bridge
   +-----------+
        |
        v
   +-----------+
   |   Replay  |  Resend original request through protocol adapter
   +-----------+
        |
        v
     200 OK
```

## Files

```
src/
  index.ts              Public export: createUniversalFetchWithAcross
  universal.ts          Protocol dispatcher — probe, detect, replay
  core/
    across.ts           Across API — routes, quotes, fill polling
    funding.ts          Bridge controller — balance check, route selection, approve + deposit
    balance.ts          ERC-20 balance reads across chains
  protocols/
    x402.ts             x402 adapter — wraps @x402/fetch with Across pre-funding
    mpp.ts              MPP adapter — wraps mppx with Across pre-funding
```

## Key Decisions

- **Protocol detection from headers.** The merchant's 402 response determines x402 vs MPP. No configuration needed.
- **Agent-side funding only.** The bridge sends USDC to the agent's own address, never directly to the merchant. The native protocol handles merchant settlement.
- **Parallel origin scanning.** All candidate chains are queried simultaneously via `Promise.allSettled`. One flaky RPC doesn't block the rest.
- **Cheapest route wins.** Routes are quoted in parallel and sorted by fee. The cheapest viable route is used.
- **POST body replay.** Request bodies are cloned as ArrayBuffer before the probe, so they survive the retry after bridging.

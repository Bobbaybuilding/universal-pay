import { isTempoInstalled, isTempoLoggedIn, getPrivateKey, getAddress } from './wallet.ts'
import { discoverOriginChainIds } from './chains.ts'
import { createUniversalFetchWithAcross } from './lib/index.ts'

const url = process.argv[2]
if (!url) { console.log('Usage: node demo.ts <url> [method] [body]'); process.exit(0) }

const method = (process.argv[3] || 'GET').toUpperCase()
const body = process.argv[4]

if (!isTempoInstalled()) { console.error('Tempo CLI not installed. Run: curl -fsSL https://tempo.xyz/install | bash'); process.exit(1) }
if (!isTempoLoggedIn()) { console.error('Not logged in. Run: tempo wallet login'); process.exit(1) }

const privateKey = getPrivateKey()
console.log(`Wallet: ${getAddress()}`)

const originChainIds = await discoverOriginChainIds()
const client = createUniversalFetchWithAcross({ privateKey, polyfill: false, across: { originChainIds } })

const opts: RequestInit = { method }
if (body) { opts.body = body; opts.headers = { 'Content-Type': 'application/json' } }

console.log(`\nPaying ${url}...`)
const response = await client.fetch(url, opts)
const text = await response.text()

console.log(`\nStatus: ${response.status}`)
console.log(`Protocol: ${client.lastProtocol || 'none'}`)
try { console.log(JSON.stringify(JSON.parse(text), null, 2)) } catch { console.log(text.slice(0, 500)) }

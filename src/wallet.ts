import { execSync } from 'child_process'
import { privateKeyToAccount } from 'viem/accounts'

const TEMPO_BIN = `${process.env.HOME}/.tempo/bin/tempo`

interface TempoWallet {
  ready: boolean
  wallet: string
  balance: { total: string; available: string; symbol: string }
  key: { address: string; key: string; chain_id: number; spending_limit: { remaining: string } }
}

function runTempo(args: string): string {
  return execSync(`${TEMPO_BIN} ${args}`, { encoding: 'utf-8', timeout: 15_000 }).trim()
}

function getTempoJson(): TempoWallet {
  const out = runTempo('wallet -j whoami')
  return JSON.parse(out) as TempoWallet
}

export function isTempoInstalled(): boolean {
  try { execSync(`${TEMPO_BIN} --version`, { encoding: 'utf-8', timeout: 5_000 }); return true }
  catch { return false }
}

export function isTempoLoggedIn(): boolean {
  try { const data = getTempoJson(); return data.ready === true }
  catch { return false }
}

export function getTempoWallet(): TempoWallet {
  return getTempoJson()
}

export function getPrivateKey(): `0x${string}` {
  const wallet = getTempoWallet()
  const key = wallet.key.key
  if (!key || !key.startsWith('0x')) throw new Error('Could not extract private key from Tempo wallet. Run: tempo wallet login')
  return key as `0x${string}`
}

export function getAddress(): string {
  const pk = getPrivateKey()
  return privateKeyToAccount(pk).address
}

// CLI
if (process.argv[1]?.endsWith('wallet.ts')) {
  const cmd = process.argv[2]

  if (!isTempoInstalled()) {
    console.log('Tempo CLI not installed. Run:\n  curl -fsSL https://tempo.xyz/install | bash')
    process.exit(1)
  }

  if (cmd === 'login') {
    console.log('Opening Tempo login...')
    execSync(`${TEMPO_BIN} wallet login`, { stdio: 'inherit' })
    process.exit(0)
  }

  if (!isTempoLoggedIn()) {
    console.log('Not logged in. Run:\n  tempo wallet login')
    process.exit(1)
  }

  const wallet = getTempoWallet()
  console.log(`Tempo wallet:  ${wallet.wallet}`)
  console.log(`Signing key:   ${wallet.key.address}`)
  console.log(`Balance:       $${wallet.balance.available} ${wallet.balance.symbol}`)
  console.log(`Spend limit:   $${wallet.key.spending_limit.remaining} remaining`)

  if (cmd === 'key') {
    console.log(`Private key:   ${wallet.key.key}`)
  }
}

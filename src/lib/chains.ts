import type { Chain } from '../api/client'
import type { Tx } from '../api/hooks'

// networks-catalog key → block explorer tx URL.
export const EXPLORERS: Record<string, (hash: string) => string> = {
	tron: (h) => `https://tronscan.org/#/transaction/${h}`,
	sol: (h) => `https://solscan.io/tx/${h}`,
	ton: (h) => `https://tonviewer.com/transaction/${h}`,
	sui: (h) => `https://suivision.xyz/txblock/${h}`,
	btc: (h) => `https://mempool.space/tx/${h}`,
	ltc: (h) => `https://litecoinspace.org/tx/${h}`,
	bsc: (h) => `https://bscscan.com/tx/${h}`,
	eth: (h) => `https://etherscan.io/tx/${h}`,
	pol: (h) => `https://polygonscan.com/tx/${h}`,
	arb: (h) => `https://arbiscan.io/tx/${h}`,
	base: (h) => `https://basescan.org/tx/${h}`,
	opt: (h) => `https://optimistic.etherscan.io/tx/${h}`,
	avax: (h) => `https://snowtrace.io/tx/${h}`,
}

const EVM_NETWORKS = new Set(['bsc', 'eth', 'pol', 'arb', 'base', 'opt', 'avax'])

// networks-catalog / recent-feed network key → clients/me route family.
// EVM networks share the un-prefixed family plus a ?network= param.
export function networkToChain(networkKey: string): { chain: Chain; networkParam: string | null } {
	const key = networkKey?.toLowerCase()
	if (EVM_NETWORKS.has(key)) return { chain: 'evm', networkParam: key }
	return { chain: (key as Chain) ?? 'tron', networkParam: null }
}

// Chain-native tx identifier for dedup and lookups (TON needs lt for uniqueness).
export function txKey(tx: Tx): string {
	const base = tx.tx_id ?? tx.tx_signature ?? tx.tx_digest ?? tx.tx_hash ?? ''
	return (tx as any).lt != null ? `${base}:${(tx as any).lt}` : base
}

export function txHashOf(tx: Tx): string {
	return tx.tx_id ?? tx.tx_signature ?? tx.tx_digest ?? tx.tx_hash ?? ''
}

export function shortHash(hash?: string | null): string {
	if (!hash) return '—'
	return hash.length > 16 ? `${hash.slice(0, 6)}…${hash.slice(-6)}` : hash
}

export function shortAddress(addr?: string | null): string {
	if (!addr) return '—'
	return addr.length > 18 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr
}

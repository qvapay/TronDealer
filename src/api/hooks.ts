import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, Chain, mePath } from './client'

// ---- Types (mirrors of the responses in webs/tron-dealer app/api/v2/clients/me/*) ----

export type Client = {
	id: string
	name: string
	webhook_url: string | null
	webhook_secret_masked?: string | null
	has_webhook_secret?: boolean
	notify_confirmation_updates?: boolean
	min_confirmations?: number | null
	sweep_wallet_evm?: string | null
	sweep_wallet_tron?: string | null
	sweep_wallet_sol?: string | null
	sweep_wallet_sui?: string | null
	sweep_wallet_btc?: string | null
	sweep_wallet_ltc?: string | null
	sweep_wallet_ton?: string | null
	payout_method?: string | null
	qvapay_account?: string | null
	zelle_contact?: string | null
	created_at?: string
}

export type Stats = {
	total_wallets: number
	total_transactions: number
	total_by_asset: Record<string, number>
	total_by_network: Record<string, number>
	volume_by_network: Record<string, Record<string, number>>
	tx_count_by_network: Record<string, number>
	transactions_by_status: Record<string, number>
	webhooks: { sent: number; pending: number }
	health: {
		webhook_delivery_rate: number | null
		sweep_success_rate: number | null
		total_sweeps: number
		failed_sweeps: number
	}
	setup_status: Record<string, unknown> & { payout_method?: string }
}

export type RecentTx = {
	network: string
	tx_hash: string
	asset: string
	amount: number | string
	status: string
	created_at: string
	wallet_address: string
	wallet_label: string | null
}

export type Wallet = {
	id: string | number
	address: string
	label: string | null
	status: string
	created_at?: string
	single_use?: boolean
	network?: string | null
}

export type Tx = {
	asset: string
	amount: number | string
	status: string
	network?: string
	confirmations?: number
	tx_hash?: string
	tx_id?: string
	tx_signature?: string
	tx_digest?: string
	created_at?: string
	detected_at?: string
	to_address?: string
	from_address?: string
}

// ---- Queries ----

export function useMe() {
	return useQuery({
		queryKey: ['me'],
		queryFn: () => api<{ client: Client }>('/api/v2/clients/me'),
		select: (d) => d.client,
	})
}

export function useStats() {
	return useQuery({
		queryKey: ['stats'],
		queryFn: () => api<{ stats: Stats }>('/api/v2/clients/me/stats'),
		select: (d) => d.stats,
		staleTime: 30_000,
	})
}

export function useRecent(limit = 20) {
	return useQuery({
		queryKey: ['recent', limit],
		queryFn: () => api<{ transactions: RecentTx[] }>(`/api/v2/clients/me/recent?limit=${limit}`),
		select: (d) => d.transactions,
		staleTime: 15_000,
	})
}

export function useWallets(chain: Chain) {
	return useQuery({
		queryKey: ['wallets', chain],
		queryFn: () => api<{ wallets: Wallet[]; total?: number }>(mePath(chain, 'wallets?limit=100')),
		staleTime: 30_000,
	})
}

export function useTransactions(chain: Chain, params: Record<string, string | number> = {}) {
	const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
	return useQuery({
		queryKey: ['transactions', chain, qs],
		queryFn: () => api<{ transactions: Tx[] }>(mePath(chain, `transactions${qs ? `?${qs}` : ''}`)),
		select: (d) => d.transactions,
	})
}

export function useSweeps(chain: Chain, limit = 20) {
	return useQuery({
		queryKey: ['sweeps', chain, limit],
		queryFn: () => api<{ sweeps: any[] }>(mePath(chain, `sweeps?limit=${limit}`)),
		select: (d) => d.sweeps,
	})
}

export function useWebhookLog(limit = 30) {
	return useQuery({
		queryKey: ['webhook-log', limit],
		queryFn: () => api<any>(`/api/v2/clients/me/webhooks?limit=${limit}`),
		select: (d) => d.webhooks ?? d.deliveries ?? [],
	})
}

// ---- Mutations ----

export function useAssignWallet(chain: Chain) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (label?: string) =>
			api<{ wallet: Wallet }>(mePath(chain, 'wallets/assign'), { method: 'POST', body: label ? { label } : {} }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets', chain] }),
	})
}

// PATCH clients/me/{chain}/wallets/:id — `label` (unique per client, 409 on clash,
// '' clears) and/or `status` ('active'|'inactive'; reactivating past the
// 100-active-per-subsystem cap → 429).
export function usePatchWallet(chain: Chain) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, label, status }: { id: string | number; label?: string; status?: 'active' | 'inactive' }) =>
			api<{ wallet: Wallet }>(mePath(chain, `wallets/${id}`), {
				method: 'PATCH',
				body: { ...(label !== undefined ? { label: label || null } : {}), ...(status ? { status } : {}) },
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets', chain] }),
	})
}

export function usePatchMe() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (patch: Partial<Client> & Record<string, unknown>) =>
			api<{ client: Client }>('/api/v2/clients/me', { method: 'PATCH', body: patch }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
	})
}

export function useRotateKey() {
	return useMutation({
		mutationFn: () => api<{ api_key: string }>('/api/v2/clients/me/rotate-key', { method: 'POST' }),
	})
}

export function useWebhookTest() {
	return useMutation({
		mutationFn: () =>
			api<{
				success?: boolean
				response?: { status: number; statusText?: string; durationMs?: number }
				error?: { kind: string; message: string }
			}>('/api/v2/clients/me/webhook-test', {
				method: 'POST',
				body: { payload: { event: 'webhook.test', data: { message: 'Prueba desde TronDealer Móvil', at: new Date().toISOString() } } },
			}),
	})
}

// Public catalog of networks/assets (same source the WooCommerce plugin uses) —
// the POS selector builds itself from this so new tokens appear automatically.
export type NetworkInfo = {
	key: string
	family: 'tron' | 'evm' | 'sol' | 'sui' | 'btc' | 'ton'
	label: string
	network_param: string | null
	default_min_confirmations: number
	assets: { symbol: string; decimals: number; contract?: string }[]
}

export function useNetworks() {
	return useQuery({
		queryKey: ['networks'],
		queryFn: () => api<{ networks: NetworkInfo[] }>('/api/v2/networks', { auth: false }),
		select: (d) => d.networks,
		staleTime: 60 * 60_000,
	})
}

// USD → stablecoin display rate (CoinGecko, cached 5 min). Display-only — the POS
// charge is denominated in the stablecoin; this mirrors the always-visible-rate promise.
const COINGECKO_IDS: Record<string, string> = {
	USDT: 'tether',
	USDC: 'usd-coin',
	PYUSD: 'paypal-usd',
	BTC: 'bitcoin',
	LTC: 'litecoin',
}

// Assets safe to assume ≈$1 while (or if) CoinGecko hasn't answered.
const STABLE_FALLBACK: Record<string, number> = { USDT: 1, USDC: 1, PYUSD: 1 }

// USD rates for a set of asset symbols, one batched CoinGecko call. Stablecoins
// resolve to 1 immediately (placeholder); natives (BTC/LTC) have no rate until
// the fetch lands — callers should skip assets with no rate rather than assume 1.
export function useUsdRates(symbols: string[]) {
	const ids = [...new Set(symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean))].sort()
	return useQuery({
		queryKey: ['usd-rates', ids.join(',')],
		enabled: ids.length > 0,
		queryFn: async () => {
			const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`)
			const json = await res.json()
			const rates: Record<string, number> = { ...STABLE_FALLBACK }
			for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
				const usd = json?.[id]?.usd
				if (typeof usd === 'number' && usd > 0) rates[symbol] = usd
			}
			return rates
		},
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		placeholderData: STABLE_FALLBACK,
	})
}

export function useStableRate(asset: string) {
	const id = COINGECKO_IDS[asset] ?? 'tether'
	return useQuery({
		queryKey: ['stable-rate', id],
		queryFn: async () => {
			const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
			const json = await res.json()
			const usd = json?.[id]?.usd
			return typeof usd === 'number' && usd > 0 ? usd : 1
		},
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		placeholderData: 1,
	})
}

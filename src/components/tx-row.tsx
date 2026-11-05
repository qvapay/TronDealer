import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { RecentTx } from '../api/hooks'
import { t } from '../i18n'
import { colors, fonts, radius } from '../theme/tokens'
import { Mono, Row, StatusDot } from './ui'

// Lifecycle semantics from the brand: amber = detecting, green = confirmed on-chain,
// muted = settled. Signal red is never a state color.
export function statusColor(status: string): string {
	if (status === 'detected') return colors.pending
	if (status === 'confirmed' || status === 'notified') return colors.settle
	return colors.boneLo
}

export function statusLabel(status: string): string {
	if (status === 'detected') return t('status.detected')
	if (status === 'confirmed' || status === 'notified') return t('status.confirmed')
	if (status === 'swept') return t('status.swept')
	return status.toUpperCase()
}

export function networkTicker(network: string): string {
	const map: Record<string, string> = {
		tron: 'TRX',
		sol: 'SOL',
		sui: 'SUI',
		btc: 'BTC',
		ltc: 'LTC',
		ton: 'TON',
		bsc: 'BSC',
		eth: 'ETH',
		pol: 'POL',
		arb: 'ARB',
		base: 'BASE',
		opt: 'OPT',
		avax: 'AVAX',
	}
	return map[network?.toLowerCase()] ?? (network ?? '?').toUpperCase().slice(0, 4)
}

export function formatAmount(amount: number | string): string {
	const n = typeof amount === 'string' ? parseFloat(amount) : amount
	if (!Number.isFinite(n)) return String(amount)
	return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 6 : 2 })
}

export function timeAgo(iso?: string): string {
	if (!iso) return ''
	const then = new Date(iso).getTime()
	if (!Number.isFinite(then)) return ''
	const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
	if (mins < 1) return 'ahora'
	if (mins < 60) return `hace ${mins} min`
	const hours = Math.round(mins / 60)
	if (hours < 24) return `hace ${hours} h`
	return new Date(iso).toLocaleDateString()
}

export function TxRow({ tx, last }: { tx: RecentTx; last?: boolean }) {
	const router = useRouter()
	const color = statusColor(tx.status)

	function openDetail() {
		if (!tx.tx_hash) return
		router.push({
			pathname: '/tx/[hash]',
			params: {
				hash: tx.tx_hash,
				network: tx.network,
				asset: tx.asset,
				amount: String(tx.amount),
				status: tx.status,
				created_at: tx.created_at ?? '',
				wallet_address: tx.wallet_address ?? '',
				wallet_label: tx.wallet_label ?? '',
			},
		})
	}

	return (
		<Pressable onPress={openDetail} style={({ pressed }) => [styles.row, styles.rowFlex, !last && styles.rowBorder, pressed && { backgroundColor: colors.ink1 }]}>
			<View style={styles.badge}>
				<Text style={styles.badgeText}>{networkTicker(tx.network)}</Text>
			</View>
			<View style={{ flex: 1, gap: 3 }}>
				<Mono style={styles.amount}>
					+{formatAmount(tx.amount)} {tx.asset}
				</Mono>
				<Text style={styles.sub}>
					{tx.wallet_label ?? '—'} · {networkTicker(tx.network)} · {timeAgo(tx.created_at)}
				</Text>
			</View>
			<Row style={{ gap: 6 }}>
				<StatusDot color={color} />
				<Mono style={[styles.status, { color }]}>{statusLabel(tx.status)}</Mono>
			</Row>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { gap: 12, paddingVertical: 12 },
	rowFlex: { flexDirection: 'row', alignItems: 'center' },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	badge: {
		width: 36,
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.ink2,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
	},
	badgeText: { fontFamily: fonts.mono, fontSize: 9, color: colors.bone },
	amount: { fontSize: 13, color: colors.bone, fontFamily: fonts.monoMedium },
	sub: { fontFamily: fonts.body, fontSize: 11, color: colors.boneLo },
	status: { fontSize: 10, letterSpacing: 0.8 },
})

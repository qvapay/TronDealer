import { useQuery } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { api, mePath } from '../../api/client'
import type { Tx } from '../../api/hooks'
import { useNetworks } from '../../api/hooks'
import { IconBack, IconCopy, IconExternal } from '../../components/icons'
import { formatAmount, networkTicker, statusColor, statusLabel } from '../../components/tx-row'
import { Body, Card, Disp, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { t } from '../../i18n'
import { EXPLORERS, networkToChain, shortAddress, shortHash, txHashOf } from '../../lib/chains'
import { colors, fonts, radius } from '../../theme/tokens'

function DetailRow({
	label,
	value,
	valueColor,
	last,
	onPress,
	icon,
}: {
	label: string
	value: string
	valueColor?: string
	last?: boolean
	onPress?: () => void
	icon?: React.ReactNode
}) {
	return (
		<Pressable onPress={onPress} disabled={!onPress} style={[styles.detailRow, !last && styles.rowBorder]}>
			<Body style={styles.detailLabel}>{label}</Body>
			<Row style={{ gap: 8, flexShrink: 1 }}>
				<Mono style={[styles.detailValue, valueColor ? { color: valueColor } : null]} >
					{value}
				</Mono>
				{icon}
			</Row>
		</Pressable>
	)
}

export default function TxDetail() {
	const router = useRouter()
	const params = useLocalSearchParams<{
		hash: string
		network: string
		asset: string
		amount: string
		status: string
		created_at: string
		wallet_address: string
		wallet_label: string
	}>()

	const { chain, networkParam } = networkToChain(params.network ?? 'tron')
	const networks = useNetworks()

	// Enrich the feed row with the full record (confirmations, from_address,
	// webhook state); keeps polling while the deposit is still unconfirmed.
	const detailPath =
		chain === 'evm'
			? mePath('evm', `transactions?network=${networkParam}&limit=50`)
			: mePath(chain, `transactions?address=${params.wallet_address}&limit=50`)

	const detail = useQuery({
		queryKey: ['tx-detail', chain, networkParam, params.wallet_address, params.hash],
		queryFn: () => api<{ transactions: Tx[] }>(detailPath),
		select: (d) => d.transactions.find((x) => txHashOf(x) === params.hash),
		refetchInterval: (query) => {
			const tx = query.state.data?.transactions?.find((x) => txHashOf(x) === params.hash)
			const status = tx?.status ?? params.status
			return status === 'detected' ? 5000 : false
		},
		enabled: !!params.hash && !!params.wallet_address,
	})

	const tx = detail.data
	const status = tx?.status ?? params.status ?? 'detected'
	const color = statusColor(status)
	const amount = tx?.amount ?? params.amount
	const asset = tx?.asset ?? params.asset ?? ''
	const networkKey = (tx?.network ?? params.network ?? '').toLowerCase()
	const catalogEntry = networks.data?.find((n) => n.key === networkKey)
	const targetConfs = catalogEntry?.default_min_confirmations
	const confirmations = tx?.confirmations
	const detectedAt = tx?.detected_at ?? tx?.created_at ?? params.created_at
	const priceUsd = (tx as any)?.price_usd_at_detect
	const webhookSent = (tx as any)?.webhook_sent
	const explorer: ((h: string) => string) | undefined = networkKey ? EXPLORERS[networkKey] : undefined

	async function copy(value?: string | null) {
		if (!value) return
		await Clipboard.setStringAsync(value)
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
	}

	return (
		<Screen>
			<Row style={styles.header}>
				<Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<IconBack size={20} color={colors.boneMid} />
					<Disp style={{ fontSize: 18 }}>{t('tx.title')}</Disp>
				</Pressable>
				<Mono style={{ fontSize: 10, color: colors.boneLo }}>{networkTicker(networkKey)}</Mono>
			</Row>

			<ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
				<View style={styles.hero}>
					<Mono style={[styles.amount, { color: status === 'swept' ? colors.bone : color }]}>
						+{formatAmount(amount)} {asset}
					</Mono>
					<Row style={styles.statusChip}>
						<StatusDot color={color} />
						<Mono style={{ fontSize: 11, letterSpacing: 1, color }}>{statusLabel(status)}</Mono>
					</Row>
					{priceUsd != null ? (
						<Body style={{ fontSize: 11, color: colors.boneLo }}>
							≈ ${formatAmount(Number(priceUsd) * (parseFloat(String(amount)) || 0))} USD
						</Body>
					) : null}
				</View>

				<Card style={styles.details}>
					<DetailRow label={t('paid.network')} value={catalogEntry?.label ?? networkTicker(networkKey)} />
					<DetailRow
						label={t('paid.confs')}
						value={
							confirmations != null
								? `${confirmations}${targetConfs ? ` / ${targetConfs}` : ''}`
								: status === 'detected'
									? `— ${targetConfs ? `/ ${targetConfs}` : ''}`
									: '✓'
						}
						valueColor={color}
					/>
					<DetailRow
						label={t('paid.hash')}
						value={shortHash(params.hash)}
						onPress={() => copy(params.hash)}
						icon={<IconCopy size={14} color={colors.boneLo} />}
					/>
					{tx?.from_address ? (
						<DetailRow
							label={t('tx.from')}
							value={shortAddress(tx.from_address)}
							onPress={() => copy(tx.from_address)}
							icon={<IconCopy size={14} color={colors.boneLo} />}
						/>
					) : null}
					<DetailRow
						label={t('paid.wallet')}
						value={params.wallet_label || shortAddress(params.wallet_address)}
						onPress={() => copy(params.wallet_address)}
						icon={<IconCopy size={14} color={colors.boneLo} />}
					/>
					{webhookSent != null ? (
						<DetailRow
							label={t('tx.webhook')}
							value={webhookSent ? t('tx.webhookSent') : t('tx.webhookPending')}
							valueColor={webhookSent ? colors.settle : colors.pending}
						/>
					) : null}
					<DetailRow label={t('tx.detected')} value={detectedAt ? new Date(detectedAt).toLocaleString() : '—'} last />
				</Card>

				{status === 'swept' ? <Body style={styles.sweptNote}>{t('tx.sweptNote')}</Body> : null}

				{explorer && params.hash ? (
					<Pressable onPress={() => WebBrowser.openBrowserAsync(explorer(params.hash))} style={styles.ghost}>
						<Body style={{ color: colors.boneMid, fontFamily: fonts.bodyMedium }}>{t('paid.viewExplorer')}</Body>
						<IconExternal size={14} color={colors.boneLo} />
					</Pressable>
				) : null}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
	hero: { alignItems: 'center', gap: 10, paddingTop: 26, paddingBottom: 24, paddingHorizontal: 20 },
	amount: { fontSize: 30, fontFamily: fonts.monoSemi },
	statusChip: {
		gap: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
	},
	details: { marginHorizontal: 20, paddingHorizontal: 16, borderRadius: radius.panel },
	detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, minHeight: 48 },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	detailLabel: { fontSize: 12, color: colors.boneLo },
	detailValue: { fontSize: 12, color: colors.bone, flexShrink: 1 },
	sweptNote: { textAlign: 'center', fontSize: 11, color: colors.boneLo, paddingHorizontal: 32, paddingTop: 16, lineHeight: 17 },
	ghost: {
		marginHorizontal: 20,
		marginTop: 18,
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.card,
	},
})

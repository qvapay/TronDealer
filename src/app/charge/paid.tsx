import { useQuery } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'

import { api, Chain, mePath } from '../../api/client'
import type { Tx } from '../../api/hooks'
import { IconCheck, IconClose, IconCopy, IconExternal } from '../../components/icons'
import { Body, Button, Card, Disp, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { formatAmount } from '../../components/tx-row'
import { t } from '../../i18n'
import { EXPLORERS, shortHash, txKey as keyOf } from '../../lib/chains'
import { colors, fonts, radius } from '../../theme/tokens'

export default function Paid() {
	const router = useRouter()
	const params = useLocalSearchParams<{
		address: string
		walletLabel: string
		txKey: string
		txHash: string
		amount: string
		asset: string
		status: string
		confirmations: string
		chain: Chain
		networkKey: string
		networkLabel: string
		minConfs: string
	}>()

	const isEvm = params.chain === 'evm'
	const pollPath = isEvm
		? mePath('evm', `transactions?network=${params.networkKey}&limit=10`)
		: mePath((params.chain as Chain) ?? 'tron', `transactions?address=${params.address}&limit=10`)

	// Keep polling until the deposit is confirmed so the merchant sees the flip
	// from amber (detecting) to green (confirmed on-chain).
	const live = useQuery({
		queryKey: ['pos-paid', params.txKey],
		queryFn: () => api<{ transactions: Tx[] }>(pollPath),
		refetchInterval: (query) => {
			const tx = query.state.data?.transactions?.find((x) => keyOf(x) === params.txKey)
			return tx && tx.status !== 'detected' ? false : 5000
		},
		enabled: !!params.address && !!params.txKey,
	})

	const tx = live.data?.transactions?.find((x) => keyOf(x) === params.txKey)
	const status = tx?.status ?? params.status ?? 'detected'
	const confirmed = status !== 'detected'
	const targetConfs = Number(params.minConfs) || 1
	const confirmations = tx?.confirmations ?? (Number(params.confirmations) || 0)
	const accent = confirmed ? colors.settle : colors.pending
	const amount = tx?.amount ?? params.amount
	const asset = tx?.asset ?? params.asset ?? 'USDT'
	const receivedAt = tx?.detected_at || tx?.created_at ? new Date((tx?.detected_at ?? tx?.created_at)!).toLocaleTimeString() : new Date().toLocaleTimeString()
	const explorer = params.networkKey ? EXPLORERS[params.networkKey] : undefined

	async function copyHash() {
		if (params.txHash) await Clipboard.setStringAsync(params.txHash)
	}

	function closeFlow() {
		// Exit the whole charge modal back to the tabs (never back to the paid QR).
		if (router.canDismiss()) router.dismissAll()
		else router.replace('/')
	}

	return (
		<Screen edges={['top', 'bottom']}>
			<Row style={styles.topBar}>
				<View style={{ width: 36 }} />
				<Pressable onPress={closeFlow} style={styles.closeBtn} hitSlop={8}>
					<IconClose size={16} color={colors.boneMid} />
				</Pressable>
			</Row>
			<View style={styles.hero}>
				<View style={[styles.checkBox, { borderColor: accent }]}>
					{confirmed ? <IconCheck size={40} color={accent} /> : <StatusDot color={accent} size={14} />}
				</View>
				<Disp bold style={{ fontSize: 24 }}>
					{confirmed ? t('paid.title') : t('paid.detected')}
				</Disp>
				<Mono style={[styles.amount, { color: accent }]}>
					+{formatAmount(amount)} {asset}
				</Mono>
			</View>

			<Card style={styles.details}>
				<Row style={[styles.detailRow, styles.rowBorder]}>
					<Body style={styles.detailLabel}>{t('paid.network')}</Body>
					<Mono style={styles.detailValue}>{params.networkLabel?.toUpperCase() ?? '—'}</Mono>
				</Row>
				<Pressable onPress={copyHash}>
					<Row style={[styles.detailRow, styles.rowBorder]}>
						<Body style={styles.detailLabel}>{t('paid.hash')}</Body>
						<Row style={{ gap: 8 }}>
							<Mono style={styles.detailValue}>{shortHash(params.txHash)}</Mono>
							<IconCopy size={14} color={colors.boneLo} />
						</Row>
					</Row>
				</Pressable>
				<Row style={[styles.detailRow, styles.rowBorder]}>
					<Body style={styles.detailLabel}>{t('paid.confs')}</Body>
					<Mono style={[styles.detailValue, { color: accent }]}>
						{confirmed ? `${Math.max(confirmations, targetConfs)} / ${targetConfs}` : `${confirmations} / ${targetConfs}`}
					</Mono>
				</Row>
				<Row style={[styles.detailRow, styles.rowBorder]}>
					<Body style={styles.detailLabel}>{t('paid.wallet')}</Body>
					<Mono style={styles.detailValue}>{params.walletLabel || '—'}</Mono>
				</Row>
				<Row style={styles.detailRow}>
					<Body style={styles.detailLabel}>{t('paid.received')}</Body>
					<Mono style={styles.detailValue}>{receivedAt}</Mono>
				</Row>
			</Card>

			<Body style={styles.note}>{t('paid.note')}</Body>

			<View style={{ flex: 1 }} />

			<View style={styles.buttons}>
				<Button title={t('paid.newCharge')} onPress={() => router.replace('/charge')} />
				{explorer && params.txHash ? (
					<Pressable onPress={() => WebBrowser.openBrowserAsync(explorer(params.txHash))} style={styles.ghost}>
						<Body style={{ color: colors.boneMid, fontFamily: fonts.bodyMedium }}>{t('paid.viewExplorer')}</Body>
						<IconExternal size={14} color={colors.boneLo} />
					</Pressable>
				) : null}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	topBar: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
	closeBtn: {
		width: 36,
		height: 36,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	hero: { alignItems: 'center', gap: 14, paddingTop: 26, paddingBottom: 26, paddingHorizontal: 20 },
	checkBox: {
		width: 84,
		height: 84,
		borderWidth: 1,
		borderRadius: radius.panel,
		backgroundColor: colors.ink1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	amount: { fontSize: 30, fontFamily: fonts.monoSemi },
	details: { marginHorizontal: 20, paddingHorizontal: 16, borderRadius: radius.panel },
	detailRow: { justifyContent: 'space-between', paddingVertical: 13 },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	detailLabel: { fontSize: 12, color: colors.boneLo },
	detailValue: { fontSize: 12, color: colors.bone },
	note: { textAlign: 'center', fontSize: 12, color: colors.boneLo, lineHeight: 18, paddingHorizontal: 32, paddingTop: 18 },
	buttons: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
	ghost: {
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

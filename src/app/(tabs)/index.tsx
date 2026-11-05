import { useRouter } from 'expo-router'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useRecent, useStats, useUsdRates } from '../../api/hooks'
import { IconList, IconQr, IconWallet, LogoTron } from '../../components/icons'
import { formatAmount, networkTicker, TxRow } from '../../components/tx-row'
import { Body, Disp, Eyebrow, Mono, Row, Screen } from '../../components/ui'
import { useSession } from '../../auth/session'
import { t } from '../../i18n'
import { colors, fonts, radius } from '../../theme/tokens'

export default function Home() {
	const router = useRouter()
	const { session } = useSession()
	const stats = useStats()
	const recent = useRecent(8)

	const assets = Object.keys(stats.data?.total_by_asset ?? {})
	const rates = useUsdRates(assets)

	// USD value per network: stables count as ≈$1, natives (BTC/LTC) use their
	// CoinGecko rate and are excluded until it loads — never counted at face value.
	const volumeByNetwork = stats.data?.volume_by_network ?? {}
	const networks = Object.entries(volumeByNetwork)
		.map(([net, byAsset]) => {
			let usd = 0
			for (const [asset, amount] of Object.entries(byAsset)) {
				const rate = rates.data?.[asset]
				if (rate) usd += Number(amount) * rate
			}
			return [net, usd] as const
		})
		.filter(([, usd]) => usd > 0)
		.sort((a, b) => b[1] - a[1])
	const totalVolume = networks.reduce((acc, [, usd]) => acc + usd, 0)

	const refreshing = stats.isRefetching || recent.isRefetching
	function onRefresh() {
		stats.refetch()
		recent.refetch()
	}

	return (
		<Screen>
			<ScrollView
				contentContainerStyle={{ paddingBottom: 24 }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.boneMid} />}
			>
				<Row style={styles.header}>
					<Row style={{ gap: 10 }}>
						<LogoTron size={22} />
						<View>
							<Disp style={{ fontSize: 15 }}>{session?.name || 'TronDealer'}</Disp>
							<Eyebrow style={{ fontSize: 9 }}>TRONDEALER</Eyebrow>
						</View>
					</Row>
				</Row>

				<View style={styles.balanceBlock}>
					<Eyebrow>{t('home.volume')}</Eyebrow>
					<Disp bold style={styles.balance}>
						${formatAmount(totalVolume)}
					</Disp>
					<Body>
						{assets.length ? assets.join(' · ') : '—'} · {networks.length} {t('home.networks')} — {t('home.noncustodial')}
					</Body>
				</View>

				{networks.length > 0 && (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
						{networks.map(([net, vol]) => (
							<View key={net} style={styles.netChip}>
								<Text style={styles.netChipTicker}>{networkTicker(net)}</Text>
								<Mono style={{ fontSize: 11 }}>${formatAmount(vol)}</Mono>
							</View>
						))}
					</ScrollView>
				)}

				<View style={styles.actions}>
					<Pressable style={[styles.action, styles.actionPrimary]} onPress={() => router.push('/charge')}>
						<IconQr size={22} color={colors.bone} />
						<Text style={styles.actionPrimaryLabel}>{t('home.actions.charge')}</Text>
					</Pressable>
					<Pressable style={styles.action} onPress={() => router.push('/wallets')}>
						<IconWallet size={22} color={colors.boneMid} />
						<Text style={styles.actionLabel}>{t('home.actions.wallets')}</Text>
					</Pressable>
					<Pressable style={styles.action} onPress={() => router.push('/activity')}>
						<IconList size={22} color={colors.boneMid} />
						<Text style={styles.actionLabel}>{t('home.actions.activity')}</Text>
					</Pressable>
				</View>

				<Row style={styles.recentHeader}>
					<Eyebrow>{t('home.recent')}</Eyebrow>
					<Pressable onPress={() => router.push('/activity')} hitSlop={8}>
						<Mono style={{ fontSize: 11, color: colors.signalHi }}>{t('home.seeAll')}</Mono>
					</Pressable>
				</Row>

				<View style={styles.list}>
					{recent.data?.length ? (
						recent.data.map((tx, i) => <TxRow key={`${tx.tx_hash}-${i}`} tx={tx} last={i === recent.data!.length - 1} />)
					) : (
						<Body style={{ color: colors.boneLo, paddingVertical: 18 }}>{recent.isLoading ? t('common.loading') : t('home.empty')}</Body>
					)}
				</View>
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
	balanceBlock: { paddingHorizontal: 20, paddingTop: 14, gap: 6 },
	balance: { fontSize: 40, lineHeight: 44 },
	chipsRow: { gap: 8, paddingHorizontal: 20, paddingTop: 14 },
	netChip: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 6,
		paddingVertical: 7,
		paddingHorizontal: 10,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
	},
	netChipTicker: { fontFamily: fonts.monoSemi, fontSize: 11, color: colors.bone },
	actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16 },
	action: {
		flex: 1,
		height: 76,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
	},
	actionPrimary: { backgroundColor: colors.signal, borderColor: colors.signal },
	actionPrimaryLabel: { fontFamily: fonts.disp, fontSize: 12, color: colors.bone },
	actionLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.boneMid },
	recentHeader: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
	list: { paddingHorizontal: 20 },
})

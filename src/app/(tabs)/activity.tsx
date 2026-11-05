import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'

import type { Chain } from '../../api/client'
import { useRecent, useSweeps } from '../../api/hooks'
import { IconSweep } from '../../components/icons'
import { formatAmount, networkTicker, timeAgo, TxRow } from '../../components/tx-row'
import { Body, Chip, Disp, Eyebrow, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { t } from '../../i18n'
import { colors, fonts, radius } from '../../theme/tokens'

type Filter = 'all' | 'deposits' | 'sweeps'
const SWEEP_CHAINS: Chain[] = ['evm', 'tron', 'sol', 'ton', 'btc', 'ltc', 'sui']
type Item = { kind: 'tx'; at: number; tx: any } | { kind: 'sweep'; at: number; sweep: any }

function shortAddress(addr?: string | null): string {
	if (!addr) return '—'
	return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

function SweepRow({ sweep, last }: { sweep: any; last?: boolean }) {
	const amount = sweep.net_amount ?? sweep.amount ?? sweep.gross_amount
	return (
		<Row style={[styles.sweepRow, !last && styles.rowBorder]}>
			<View style={styles.badge}>
				<IconSweep size={16} color={colors.boneLo} />
			</View>
			<View style={{ flex: 1, gap: 3 }}>
				<Mono style={{ fontSize: 13, fontFamily: fonts.monoMedium }}>
					−{formatAmount(amount ?? 0)} {sweep.asset ?? 'USDT'}
				</Mono>
				<Body style={{ fontSize: 11, color: colors.boneLo }}>
					{t('activity.sweepTo')} {shortAddress(sweep.destination ?? sweep.to_address)}{sweep.chain ? ` · ${networkTicker(sweep.network ?? sweep.chain)}` : ''} · {timeAgo(sweep.created_at)}
				</Body>
			</View>
			<Mono style={{ fontSize: 10, letterSpacing: 0.8, color: colors.boneLo }}>{t('status.swept')}</Mono>
		</Row>
	)
}

export default function Activity() {
	const [filter, setFilter] = useState<Filter>('all')
	const recent = useRecent(50)
	// One hook per chain, fixed order — never conditional.
	const evmSweeps = useSweeps('evm')
	const tronSweeps = useSweeps('tron')
	const solSweeps = useSweeps('sol')
	const tonSweeps = useSweeps('ton')
	const btcSweeps = useSweeps('btc')
	const ltcSweeps = useSweeps('ltc')
	const suiSweeps = useSweeps('sui')
	const sweepQueries = [evmSweeps, tronSweeps, solSweeps, tonSweeps, btcSweeps, ltcSweeps, suiSweeps]

	const sweeps = useMemo(() => {
		const all = sweepQueries.flatMap((q, i) => (q.data ?? []).map((s: any) => ({ ...s, chain: SWEEP_CHAINS[i] })))
		return all.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 30)
	}, sweepQueries.map((q) => q.data))

	// "All" = deposits and sweeps interleaved by time, not two stacked sections.
	const merged = useMemo<Item[]>(() => {
		const txs: Item[] = (recent.data ?? []).map((tx) => ({ kind: 'tx', at: new Date(tx.created_at ?? 0).getTime(), tx }))
		const sw: Item[] = sweeps.map((sweep) => ({ kind: 'sweep', at: new Date(sweep.created_at ?? 0).getTime(), sweep }))
		return [...txs, ...sw].sort((a, b) => b.at - a.at)
	}, [recent.data, sweeps])

	const refreshing = recent.isRefetching || sweepQueries.some((q) => q.isRefetching)
	function onRefresh() {
		recent.refetch()
		sweepQueries.forEach((q) => q.refetch())
	}
	const sweepsLoading = sweepQueries.some((q) => q.isLoading)

	return (
		<Screen>
			<Row style={styles.header}>
				<Disp bold style={{ fontSize: 22 }}>
					{t('activity.title')}
				</Disp>
			</Row>
			<Row style={styles.filters}>
				<Chip active={filter === 'all'} onPress={() => setFilter('all')}>
					{t('activity.all')}
				</Chip>
				<Chip active={filter === 'deposits'} onPress={() => setFilter('deposits')}>
					{t('activity.deposits')}
				</Chip>
				<Chip active={filter === 'sweeps'} onPress={() => setFilter('sweeps')}>
					{t('activity.sweeps')}
				</Chip>
			</Row>
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.boneMid} />}
			>
				{filter === 'all' && (
					<View style={{ paddingTop: 6 }}>
						{merged.length ? (
							merged.map((it, i) =>
								it.kind === 'tx' ? (
									<TxRow key={`tx-${it.tx.tx_hash}-${i}`} tx={it.tx} last={i === merged.length - 1} />
								) : (
									<SweepRow key={`sw-${it.sweep.chain}-${it.sweep.id ?? i}`} sweep={it.sweep} last={i === merged.length - 1} />
								),
							)
						) : (
							<Body style={{ color: colors.boneLo, paddingVertical: 14 }}>
								{recent.isLoading || sweepsLoading ? t('common.loading') : t('activity.empty')}
							</Body>
						)}
					</View>
				)}
				{filter === 'deposits' && (
					<View>
						<Eyebrow style={{ paddingTop: 10, paddingBottom: 4 }}>{t('activity.deposits')}</Eyebrow>
						{recent.data?.length ? (
							recent.data.map((tx, i) => <TxRow key={`${tx.tx_hash}-${i}`} tx={tx} last={i === recent.data!.length - 1} />)
						) : (
							<Body style={{ color: colors.boneLo, paddingVertical: 14 }}>
								{recent.isLoading ? t('common.loading') : t('activity.empty')}
							</Body>
						)}
					</View>
				)}
				{filter === 'sweeps' && (
					<View>
						<Eyebrow style={{ paddingTop: 10, paddingBottom: 4 }}>{t('activity.sweeps')}</Eyebrow>
						{sweeps.length ? (
							sweeps.map((s, i) => <SweepRow key={`${s.chain}-${s.id ?? i}`} sweep={s} last={i === sweeps.length - 1} />)
						) : (
							<Body style={{ color: colors.boneLo, paddingVertical: 14 }}>
								{sweepsLoading ? t('common.loading') : t('activity.empty')}
							</Body>
						)}
					</View>
				)}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
	filters: { gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
	sweepRow: { gap: 12, paddingVertical: 12 },
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
})

import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Chain } from '../../api/client'
import { useAssignWallet, useNetworks, usePatchWallet, useWallets, Wallet } from '../../api/hooks'
import { useRouter } from 'expo-router'
import { EditSheet, EditSheetConfig } from '../../components/edit-sheet'
import { networkTicker } from '../../components/tx-row'
import { Disp, Eyebrow, Mono, Row, Screen } from '../../components/ui'
import { t } from '../../i18n'
import { colors, fonts, radius } from '../../theme/tokens'

const SECTIONS: { chain: Chain; title: string; note?: string }[] = [
	{ chain: 'tron', title: 'Tron' },
	{ chain: 'evm', title: 'EVM · 7 redes', note: 'BSC ETH POL ARB BASE OPT AVAX' },
	{ chain: 'sol', title: 'Solana' },
	{ chain: 'ton', title: 'TON' },
	{ chain: 'btc', title: 'Bitcoin' },
	{ chain: 'ltc', title: 'Litecoin' },
	{ chain: 'sui', title: 'SUI' },
]

function shortAddress(addr: string): string {
	if (!addr || addr.length <= 18) return addr
	return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function WalletRow({ wallet, chain, note, onOpen, onRename }: { wallet: Wallet; chain: Chain; note?: string; onOpen: () => void; onRename: () => void }) {
	return (
		<Pressable onPress={onOpen} onLongPress={onRename} delayLongPress={350} style={[styles.walletRow, wallet.status !== 'active' && styles.walletRowInactive]}>
			<View style={styles.badge}>
				<Text style={styles.badgeText}>{networkTicker(chain === 'evm' ? (wallet.network ?? 'evm') : chain)}</Text>
			</View>
			<View style={{ flex: 1, gap: 3 }}>
				<Row style={{ gap: 8 }}>
					<Text style={styles.label}>{wallet.label ?? shortAddress(wallet.address)}</Text>
					{wallet.single_use ? <Text style={styles.singleUse}>{t('wallets.singleUse')}</Text> : null}
				</Row>
				<Mono style={styles.address}>
					{shortAddress(wallet.address)}
					{note ? ` · ${note}` : ''}
				</Mono>
			</View>
			<Mono style={styles.statusText}>{wallet.status === 'active' ? '' : t('wallets.inactive').toUpperCase()}</Mono>
		</Pressable>
	)
}

function Section({ chain, title, note }: { chain: Chain; title: string; note?: string }) {
	const { data, isLoading } = useWallets(chain)
	const assign = useAssignWallet(chain)
	const patch = usePatchWallet(chain)
	const networks = useNetworks()
	const router = useRouter()
	const [sheet, setSheet] = useState<EditSheetConfig | null>(null)
	const wallets = data?.wallets ?? []
	if (!isLoading && wallets.length === 0 && chain !== 'tron' && chain !== 'evm') return null

	function onAssign() {
		setSheet({
			title: `${t('wallets.assign')} · ${title}`,
			hint: t('wallets.labelHint'),
			initial: '',
			placeholder: t('wallets.labelPrompt'),
			onSave: async (label) => {
				const { wallet } = await assign.mutateAsync(label || undefined)
				openQr(wallet)
			},
		})
	}

	// Tap → the POS QR screen in receive mode (no amount, no expiry).
	function openQr(w: Wallet) {
		const key = chain === 'evm' ? (w.network ?? 'bsc') : chain
		const net = networks.data?.find((n) => n.key === key)
		const asset = net?.assets.find((a) => a.symbol === 'USDT')?.symbol ?? net?.assets[0]?.symbol ?? 'USDT'
		router.push({
			pathname: '/charge',
			params: {
				receive: '1',
				address: w.address,
				walletLabel: w.label ?? '',
				usd: '',
				converted: '',
				asset,
				chain,
				networkKey: key,
				networkLabel: net?.label ?? key.toUpperCase(),
				minConfs: String(net?.default_min_confirmations ?? 1),
			},
		})
	}

	function onRename(w: Wallet) {
		setSheet({
			title: t('wallets.rename'),
			hint: shortAddress(w.address),
			initial: w.label ?? '',
			placeholder: t('wallets.labelPrompt'),
			allowClear: true,
			onSave: async (label) => {
				await patch.mutateAsync({ id: w.id, label })
			},
		})
	}

	function setStatus(w: Wallet, status: 'active' | 'inactive') {
		patch.mutate(
			{ id: w.id, status },
			{
				onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
				onError: (e: any) => Alert.alert(t('common.error'), e?.status === 429 ? t('wallets.limitReached') : (e?.message ?? t('wallets.statusError'))),
			},
		)
	}

	function confirmDeactivate(w: Wallet) {
		Alert.alert(t('wallets.deactivate'), t('wallets.deactivateHint'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{ text: t('wallets.deactivate'), style: 'destructive', onPress: () => setStatus(w, 'inactive') },
		])
	}

	function confirmActivate(w: Wallet) {
		Alert.alert(t('wallets.activate'), t('wallets.activateHint'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{ text: t('wallets.activate'), onPress: () => setStatus(w, 'active') },
		])
	}

	// Long-press → actions menu (Alert works on both platforms; no ActionSheetIOS).
	function onMenu(w: Wallet) {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
		const active = w.status === 'active'
		Alert.alert(w.label ?? shortAddress(w.address), shortAddress(w.address), [
			{ text: t('wallets.rename'), onPress: () => onRename(w) },
			active
				? { text: t('wallets.deactivate'), style: 'destructive', onPress: () => confirmDeactivate(w) }
				: { text: t('wallets.activate'), onPress: () => confirmActivate(w) },
			{ text: t('common.cancel'), style: 'cancel' },
		])
	}

	// Tap: active → QR; inactive → offer to reactivate (an inactive wallet is not scanned).
	function onOpen(w: Wallet) {
		if (w.status === 'active') openQr(w)
		else confirmActivate(w)
	}

	return (
		<View style={{ paddingTop: 14 }}>
			<Row style={{ justifyContent: 'space-between', paddingBottom: 8 }}>
				<Eyebrow>{title}</Eyebrow>
				<Pressable onPress={onAssign} hitSlop={8} disabled={assign.isPending}>
					<Mono style={{ fontSize: 11, color: colors.signalHi }}>+ {t('wallets.assign')}</Mono>
				</Pressable>
			</Row>
			<View style={{ gap: 8 }}>
				{wallets.map((w) => (
					<WalletRow key={String(w.id)} wallet={w} chain={chain} note={chain === 'evm' ? note : undefined} onOpen={() => onOpen(w)} onRename={() => onMenu(w)} />
				))}
				{isLoading ? <Mono style={{ fontSize: 11, color: colors.boneLo, paddingVertical: 6 }}>{t('common.loading')}</Mono> : null}
			</View>
			<EditSheet config={sheet} onClose={() => setSheet(null)} />
		</View>
	)
}

export default function Wallets() {
	const [refreshKey, setRefreshKey] = useState(0)
	return (
		<Screen>
			<Row style={styles.header}>
				<View>
					<Disp bold style={{ fontSize: 22 }}>
						{t('wallets.title')}
					</Disp>
					<Eyebrow style={{ marginTop: 3 }}>
						{t('wallets.active').toUpperCase()} · {t('wallets.limit').toUpperCase()} · {t('wallets.holdToRename').toUpperCase()}
					</Eyebrow>
				</View>
			</Row>
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
				refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRefreshKey((k) => k + 1)} tintColor={colors.boneMid} />}
			>
				{SECTIONS.map((s) => (
					<Section key={`${s.chain}-${refreshKey}`} {...s} />
				))}
				<Mono style={{ fontSize: 10, color: colors.boneLo, paddingTop: 18, textAlign: 'center' }}>{t('wallets.autoDeactivate')}</Mono>
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
	walletRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
	},
	walletRowInactive: { opacity: 0.55 },
	badge: {
		width: 34,
		height: 34,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.ink2,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
	},
	badgeText: { fontFamily: fonts.mono, fontSize: 9, color: colors.bone },
	label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.bone },
	singleUse: {
		fontFamily: fonts.mono,
		fontSize: 8,
		letterSpacing: 0.8,
		color: colors.pending,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.chip,
		paddingVertical: 2,
		paddingHorizontal: 5,
	},
	address: { fontSize: 10, color: colors.boneLo },
	statusText: { fontSize: 10, color: colors.boneLo },
})

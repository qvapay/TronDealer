import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Chain } from '../../api/client'
import { NetworkInfo, useAssignWallet, useNetworks, useStableRate } from '../../api/hooks'
import { IconBackspace, IconClose, IconQr } from '../../components/icons'
import { Body, Button, Chip, Disp, Eyebrow, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { t } from '../../i18n'
import { colors, fonts, radius } from '../../theme/tokens'

// POS register label — reusable wallet, label doubles as the backend's idempotency key.
const POS_WALLET_LABEL = 'caja-1'
// The backend ignores deposits under DUST_THRESHOLD (0.50 USDT) — don't create invisible charges.
const MIN_CHARGE_USD = 0.5

// POS accepts stablecoins only (fiat keypad prices 1:1 with USD). BTC/LTC are
// excluded: volatile pricing + slow confirmation don't fit an in-person charge.
const POS_STABLES = new Set(['USDT', 'USDC', 'PYUSD'])
// TRON first (default), then deterministic-finality chains, then EVM by adoption.
const NETWORK_ORDER = ['tron', 'ton', 'sol', 'bsc', 'base', 'pol', 'arb', 'eth', 'opt', 'avax', 'sui']

// family → wallet subsystem for clients/me routes.
const FAMILY_TO_CHAIN: Record<string, Chain> = { tron: 'tron', evm: 'evm', sol: 'sol', sui: 'sui', ton: 'ton' }

const KEY_ROWS = [
	['1', '2', '3'],
	['4', '5', '6'],
	['7', '8', '9'],
	['.', '0', 'back'],
] as const

type Key = (typeof KEY_ROWS)[number][number]

export default function Charge() {
	const router = useRouter()
	// Receive mode (Wallets tab): the modal must be entered through this root
	// screen — pushing `charge/qr` straight from the tabs mounted it without the
	// modal's safe-area insets. Swap ourselves for the QR before painting.
	const receive = useLocalSearchParams<{ receive?: string; address?: string }>()
	const receiveMode = receive.receive === '1' && !!receive.address
	useEffect(() => {
		if (!receiveMode) return
		const { receive: _r, ...params } = receive as Record<string, string>
		router.replace({ pathname: '/charge/qr', params })
	}, [receiveMode]) // eslint-disable-line react-hooks/exhaustive-deps
	const [amount, setAmount] = useState('')
	const networks = useNetworks()
	const assign = useAssignWallet

	const posNetworks = useMemo(() => {
		const list = (networks.data ?? [])
			.map((n) => ({ ...n, assets: n.assets.filter((a) => POS_STABLES.has(a.symbol)) }))
			.filter((n) => n.assets.length > 0 && FAMILY_TO_CHAIN[n.family])
		return list.sort((a, b) => {
			const ia = NETWORK_ORDER.indexOf(a.key)
			const ib = NETWORK_ORDER.indexOf(b.key)
			return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
		})
	}, [networks.data])

	const [selectedKey, setSelectedKey] = useState('tron')
	const [selectedAsset, setSelectedAsset] = useState('USDT')

	const network: NetworkInfo | undefined = posNetworks.find((n) => n.key === selectedKey) ?? posNetworks[0]
	const asset = network?.assets.some((a) => a.symbol === selectedAsset) ? selectedAsset : (network?.assets[0]?.symbol ?? 'USDT')
	const chain = network ? FAMILY_TO_CHAIN[network.family] : 'tron'
	const assignWallet = assign(chain)
	const rate = useStableRate(asset)

	const usd = parseFloat(amount) || 0
	const perUsd = rate.data && rate.data > 0 ? 1 / rate.data : 1
	const converted = usd * perUsd

	function selectNetwork(key: string) {
		Haptics.selectionAsync()
		setSelectedKey(key)
	}

	function press(key: Key) {
		Haptics.selectionAsync()
		setAmount((prev) => {
			if (key === 'back') return prev.slice(0, -1)
			if (key === '.') {
				if (prev.includes('.')) return prev
				return prev === '' ? '0.' : `${prev}.`
			}
			if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
			if (!prev.includes('.') && prev.replace('.', '').length >= 6) return prev
			if (prev === '0') return key
			return prev + key
		})
	}

	function generate() {
		if (usd < MIN_CHARGE_USD || !network) return
		assignWallet.mutate(POS_WALLET_LABEL, {
			onSuccess: ({ wallet }) => {
				router.push({
					pathname: '/charge/qr',
					params: {
						address: wallet.address,
						walletLabel: wallet.label ?? POS_WALLET_LABEL,
						usd: usd.toFixed(2),
						converted: converted.toFixed(2),
						asset,
						chain,
						networkKey: network.key,
						networkLabel: network.label,
						minConfs: String(network.default_min_confirmations),
					},
				})
			},
			onError: (e: any) => Alert.alert(t('common.error'), e?.message ?? ''),
		})
	}

	if (receiveMode) return <Screen edges={['top', 'bottom']}>{null}</Screen>

	return (
		<Screen edges={['top', 'bottom']}>
			<Row style={styles.header}>
				<View style={{ gap: 2 }}>
					<Disp bold style={{ fontSize: 22 }}>
						{t('charge.title')}
					</Disp>
					<Body style={{ fontSize: 12, color: colors.boneLo }}>{t('charge.subtitle')}</Body>
				</View>
				<Pressable onPress={() => router.back()} style={styles.close} hitSlop={8}>
					<IconClose size={16} color={colors.boneMid} />
				</Pressable>
			</Row>

			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.networkRow} style={{ flexGrow: 0 }}>
				{posNetworks.map((n) => (
					<Chip key={n.key} active={n.key === network?.key} onPress={() => selectNetwork(n.key)}>
						{n.label.toUpperCase()}
					</Chip>
				))}
				{networks.isLoading ? (
					<Mono style={{ fontSize: 11, color: colors.boneLo, alignSelf: 'center' }}>{t('common.loading')}</Mono>
				) : null}
			</ScrollView>

			{network && network.assets.length > 1 ? (
				<Row style={styles.assetRow}>
					{network.assets.map((a) => (
						<Chip key={a.symbol} active={a.symbol === asset} onPress={() => setSelectedAsset(a.symbol)}>
							{a.symbol}
						</Chip>
					))}
				</Row>
			) : null}

			<View style={styles.amountArea}>
				<Eyebrow>{t('charge.amountLabel')}</Eyebrow>
				<Mono style={styles.amount}>{amount === '' ? '0' : amount}</Mono>
				<Mono style={{ fontSize: 15 }}>
					≈ {converted ? converted.toFixed(2) : '0.00'} {asset}
				</Mono>
				<Row style={styles.rateChip}>
					<StatusDot color={colors.settle} size={5} />
					<Mono style={styles.rateText}>
						{t('charge.rate')} 1 USD = {perUsd.toFixed(4)} {asset}
						{rate.isFetching ? ` · ${t('common.loading').toUpperCase()}` : ''}
					</Mono>
				</Row>
			</View>

			<View style={styles.keypad}>
				{KEY_ROWS.map((row) => (
					<View key={row.join('')} style={styles.keyRow}>
						{row.map((key) => (
							<Pressable key={key} onPress={() => press(key)} style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.ink2 }]}>
								{key === 'back' ? <IconBackspace size={22} color={colors.boneMid} /> : <Text style={styles.keyText}>{key}</Text>}
							</Pressable>
						))}
					</View>
				))}
			</View>

			<View style={styles.cta}>
				<Button
					title={`${t('charge.cta')} · ${asset} ${network?.label ?? ''}`}
					onPress={generate}
					loading={assignWallet.isPending}
					disabled={usd < MIN_CHARGE_USD || !network}
					icon={<IconQr size={20} color={colors.bone} />}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
	close: {
		width: 36,
		height: 36,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	networkRow: { gap: 8, paddingHorizontal: 20, paddingTop: 8 },
	assetRow: { gap: 8, paddingHorizontal: 20, paddingTop: 8 },
	amountArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
	amount: { fontSize: 58, lineHeight: 64, color: colors.bone, fontFamily: fonts.monoMedium },
	rateChip: {
		gap: 8,
		marginTop: 2,
		paddingVertical: 6,
		paddingHorizontal: 10,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
	},
	rateText: { fontSize: 10, color: colors.boneLo },
	keypad: { gap: 10, paddingHorizontal: 20 },
	keyRow: { flexDirection: 'row', gap: 10 },
	key: {
		flex: 1,
		height: 60,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
	},
	keyText: { fontFamily: fonts.mono, fontSize: 20, color: colors.bone },
	cta: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
})

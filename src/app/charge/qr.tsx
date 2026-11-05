import { useQuery } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Share, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { api, Chain, mePath } from '../../api/client'
import type { Tx } from '../../api/hooks'
import { IconBack, IconCopy, IconShare } from '../../components/icons'
import { Body, Card, Disp, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { t } from '../../i18n'
import { shortAddress, txHashOf, txKey } from '../../lib/chains'
import { colors, fonts, radius } from '../../theme/tokens'

const POLL_MS = 4000
const EXPIRY_MS = 30 * 60_000

export default function ChargeQr() {
	const router = useRouter()
	const { address, walletLabel, usd, converted, asset, chain, networkKey, networkLabel, minConfs } = useLocalSearchParams<{
		address: string
		walletLabel: string
		usd: string
		converted: string
		asset: string
		chain: Chain
		networkKey: string
		networkLabel: string
		minConfs: string
	}>()

	// Opened from the Wallets tab without an amount: "receive" mode — no expiry,
	// the wallet label replaces the big amount, detection keeps polling.
	const openMode = !usd
	const [expiresAt] = useState(() => Date.now() + EXPIRY_MS)
	const [now, setNow] = useState(Date.now())
	const baseline = useRef<Set<string> | null>(null)

	// No push infra yet (backend Fase 0) — the register polls the transactions
	// endpoint; a tx not present at mount is the incoming payment. The EVM route
	// has no ?address= filter, so there we filter by to_address client-side.
	const isEvm = chain === 'evm'
	const pollPath = isEvm
		? mePath('evm', `transactions?network=${networkKey}&asset=${asset}&limit=10`)
		: mePath(chain as Chain, `transactions?address=${address}&limit=10`)

	const poll = useQuery({
		queryKey: ['pos-poll', chain, networkKey, address],
		queryFn: () => api<{ transactions: Tx[] }>(pollPath),
		refetchInterval: POLL_MS,
		enabled: !!address && !!chain,
	})

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		let txs = poll.data?.transactions
		if (!txs) return
		if (isEvm && address) {
			txs = txs.filter((tx) => tx.to_address?.toLowerCase() === address.toLowerCase())
		}
		if (baseline.current === null) {
			baseline.current = new Set(txs.map(txKey).filter(Boolean))
			return
		}
		const incoming = txs.find((tx) => txKey(tx) && !baseline.current!.has(txKey(tx)))
		if (incoming) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			router.replace({
				pathname: '/charge/paid',
				params: {
					address,
					walletLabel: walletLabel ?? '',
					txKey: txKey(incoming),
					txHash: txHashOf(incoming),
					amount: String(incoming.amount ?? ''),
					asset: incoming.asset ?? asset ?? 'USDT',
					status: incoming.status ?? 'detected',
					confirmations: String(incoming.confirmations ?? 0),
					chain,
					networkKey,
					networkLabel,
					minConfs,
				},
			})
		}
	}, [poll.data, address, walletLabel, router, isEvm, asset, chain, networkKey, networkLabel, minConfs])

	const remaining = openMode ? Infinity : Math.max(0, expiresAt - now)
	const expired = remaining === 0
	const mm = openMode ? '' : String(Math.floor(remaining / 60000)).padStart(2, '0')
	const ss = openMode ? '' : String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
	const confs = Number(minConfs) || 1

	function close() {
		if (!openMode) return router.back()
		// Receive mode: the QR is the modal's root screen — back closes the modal.
		if (router.canGoBack()) router.back()
		else router.replace('/(tabs)/wallets')
	}

	async function copyAddress() {
		if (!address) return
		await Clipboard.setStringAsync(address)
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
	}

	function share() {
		if (!address) return
		Share.share({ message: openMode ? `${asset} (${networkLabel}) → ${address}` : `${converted} ${asset} (${networkLabel}) → ${address}` })
	}

	return (
		<Screen edges={['top', 'bottom']}>
			<Row style={styles.header}>
				<Pressable onPress={close} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<IconBack size={20} color={colors.boneMid} />
					<Disp style={{ fontSize: 18 }}>{openMode ? t('charge.receive') : t('charge.inProgress')}</Disp>
				</Pressable>
				{openMode ? null : <Mono style={{ fontSize: 11, color: colors.boneLo }}>${usd}</Mono>}
			</Row>

			<Card style={styles.panel}>
				<View style={styles.qrTile}>{address ? <QRCode value={address} size={216} backgroundColor={colors.bone} color={colors.ink0} /> : null}</View>
				<View style={{ alignItems: 'center', gap: 8 }}>
					<Mono style={styles.bigAmount}>{openMode ? (walletLabel || asset) : `${converted} ${asset}`}</Mono>
					<View style={styles.netChip}>
						<Mono style={styles.netChipText}>
							{t('charge.networkPrefix')} {networkLabel?.toUpperCase()}
						</Mono>
					</View>
				</View>
				<Pressable onPress={copyAddress} style={styles.addressRow}>
					<Mono style={{ fontSize: 12 }}>{address ? shortAddress(address) : '—'}</Mono>
					<IconCopy size={15} color={colors.boneLo} />
				</Pressable>
				<Row style={{ gap: 10, width: '100%' }}>
					<Pressable onPress={share} style={styles.secondaryBtn}>
						<IconShare size={16} color={colors.boneMid} />
						<Body style={styles.secondaryText}>{t('charge.share')}</Body>
					</Pressable>
					<Pressable onPress={copyAddress} style={styles.secondaryBtn}>
						<IconCopy size={16} color={colors.boneMid} />
						<Body style={styles.secondaryText}>{t('charge.copy')}</Body>
					</Pressable>
				</Row>
			</Card>

			<Card style={styles.statusStrip}>
				<Row style={{ gap: 10, flex: 1 }}>
					<StatusDot color={expired ? colors.boneLo : colors.pending} size={8} />
					<View style={{ gap: 2, flex: 1 }}>
						<Mono style={{ fontSize: 12, color: expired ? colors.boneLo : colors.pending, letterSpacing: 0.5 }}>
							{expired ? t('charge.expired').toUpperCase() : t('charge.waiting')}
						</Mono>
						<Body style={{ fontSize: 11, color: colors.boneLo }}>{t('charge.waitingSub').replace('{n}', String(confs))}</Body>
					</View>
				</Row>
				{openMode ? null : (
					<Mono style={{ fontSize: 11, color: colors.boneLo }}>
						{mm}:{ss}
					</Mono>
				)}
			</Card>

			<View style={{ flex: 1 }} />
			<Body style={styles.footer}>{t('charge.nonCustodial')}</Body>
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
	panel: { marginHorizontal: 20, borderRadius: radius.panel, padding: 20, alignItems: 'center', gap: 16 },
	qrTile: { backgroundColor: colors.bone, borderRadius: radius.card, padding: 14 },
	bigAmount: { fontSize: 26, color: colors.bone, fontFamily: fonts.monoSemi },
	netChip: {
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
		backgroundColor: colors.ink2,
	},
	netChipText: { fontSize: 10, letterSpacing: 1, color: colors.boneMid },
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: colors.ink2,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		width: '100%',
	},
	secondaryBtn: {
		flex: 1,
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.card,
	},
	secondaryText: { fontSize: 13, color: colors.bone, fontFamily: fonts.bodyMedium },
	statusStrip: {
		marginHorizontal: 20,
		marginTop: 14,
		padding: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	footer: { textAlign: 'center', fontSize: 11, color: colors.boneLo, paddingHorizontal: 32, paddingBottom: 12 },
})

import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

import { Client, useMe, usePatchMe, useRotateKey, useStats, useWebhookTest } from '../../api/hooks'
import { useSession } from '../../auth/session'
import { EditSheet, EditSheetConfig } from '../../components/edit-sheet'
import { IconChevron, IconExternal, LogoTron } from '../../components/icons'
import { Body, Card, Chip, Disp, Eyebrow, Mono, Row, Screen, StatusDot } from '../../components/ui'
import { appLocale, t } from '../../i18n'
import { shortAddress } from '../../lib/chains'
import { authenticateBiometric, biometricsAvailable, isLockEnabled, setLockEnabled } from '../../lib/biometrics'
import { colors, fonts, radius } from '../../theme/tokens'

const SWEEP_FIELDS = [
	{ field: 'sweep_wallet_evm', label: 'EVM' },
	{ field: 'sweep_wallet_tron', label: 'TRON' },
	{ field: 'sweep_wallet_sol', label: 'SOL' },
	{ field: 'sweep_wallet_sui', label: 'SUI' },
	{ field: 'sweep_wallet_btc', label: 'BTC' },
	{ field: 'sweep_wallet_ltc', label: 'LTC' },
	{ field: 'sweep_wallet_ton', label: 'TON' },
] as const

function SettingRow({
	label,
	value,
	valueColor,
	last,
	onPress,
	right,
}: {
	label: string
	value?: string
	valueColor?: string
	last?: boolean
	onPress?: () => void
	right?: React.ReactNode
}) {
	return (
		<Pressable onPress={onPress} disabled={!onPress} style={[styles.settingRow, !last && styles.rowBorder]}>
			<Text style={styles.settingLabel}>{label}</Text>
			<Row style={{ gap: 8, flexShrink: 1 }}>
				{value ? <Mono style={[{ fontSize: 11, flexShrink: 1 }, valueColor ? { color: valueColor } : null]}>{value}</Mono> : null}
				{right}
				{onPress && !right ? <IconChevron size={14} color={colors.boneLo} /> : null}
			</Row>
		</Pressable>
	)
}

export default function Settings() {
	const { session, logout } = useSession()
	const me = useMe()
	const stats = useStats()
	const patch = usePatchMe()
	const webhookTest = useWebhookTest()
	const rotateKey = useRotateKey()
	const { updateApiKey } = useSession()
	const [sheet, setSheet] = useState<EditSheetConfig | null>(null)
	const [bioAvailable, setBioAvailable] = useState(false)
	const [bioOn, setBioOn] = useState(false)

	useEffect(() => {
		biometricsAvailable().then(setBioAvailable)
		isLockEnabled().then(setBioOn)
	}, [])

	async function toggleBiometric(value: boolean) {
		if (value) {
			// Prove it works before trusting it as the lock.
			const ok = await authenticateBiometric(t('lock.prompt'))
			if (!ok) return
			await setLockEnabled(true)
			setBioOn(true)
		} else {
			await setLockEnabled(false)
			setBioOn(false)
		}
	}

	function confirmRotate() {
		Alert.alert(t('settings.rotateTitle'), t('settings.rotateWarn'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('settings.rotate'),
				style: 'destructive',
				onPress: () =>
					rotateKey.mutate(undefined, {
						onSuccess: async ({ api_key }) => {
							await updateApiKey(api_key)
							Alert.alert(t('settings.rotated'), `${api_key}\n\n${t('settings.rotatedNote')}`, [
								{ text: t('reg.copyKey'), onPress: () => Clipboard.setStringAsync(api_key) },
								{ text: 'OK' },
							])
						},
						onError: (e: any) => Alert.alert(t('common.error'), e?.message ?? ''),
					}),
			},
		])
	}

	const client = me.data
	const deliveryRate = stats.data?.health?.webhook_delivery_rate
	const payout = client?.payout_method ?? 'wallet'

	// mutateAsync rejects with the backend's exact validation message — the
	// sheet shows it inline and stays open.
	const save = (body: Record<string, unknown>) => patch.mutateAsync(body as Partial<Client>).then(() => undefined)

	function editText(cfg: Omit<EditSheetConfig, 'onSave'> & { body: (v: string) => Record<string, unknown> }) {
		const { body, ...rest } = cfg
		setSheet({ ...rest, onSave: (v) => save(body(v)) })
	}

	function selectMethod(method: 'wallet' | 'qvapay' | 'zelle') {
		if (method === payout) return
		Alert.alert(t('settings.methodWarnTitle'), t('settings.methodWarn'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.save'),
				style: 'destructive',
				onPress: () => {
					if (method === 'wallet') {
						save({ payout_method: 'wallet' }).catch((e) => Alert.alert(t('common.error'), e?.message ?? ''))
					} else if (method === 'qvapay') {
						editText({
							title: t('settings.qvapayAccount'),
							hint: t('settings.qvapayHint'),
							initial: client?.qvapay_account ?? '',
							placeholder: 'usuario@qvapay',
							body: (v) => ({ payout_method: 'qvapay', qvapay_account: v }),
						})
					} else {
						editText({
							title: t('settings.zelleContact'),
							hint: t('settings.zelleHint'),
							initial: client?.zelle_contact ?? '',
							placeholder: 'email o teléfono',
							keyboardType: 'email-address',
							body: (v) => ({ payout_method: 'zelle', zelle_contact: v }),
						})
					}
				},
			},
		])
	}

	function runWebhookTest() {
		webhookTest.mutate(undefined, {
			onSuccess: (r) => {
				const status = r.response?.status
				const ms = r.response?.durationMs
				Alert.alert(t('settings.testOk'), `HTTP ${status ?? '—'}${ms != null ? ` · ${ms} ms` : ''}`)
			},
			onError: (e: any) => Alert.alert(t('settings.testFail'), e?.message ?? ''),
		})
	}

	function toggleConfUpdates(value: boolean) {
		patch.mutate({ notify_confirmation_updates: value }, { onError: (e: any) => Alert.alert(t('common.error'), e?.message ?? '') })
	}

	function confirmLogout() {
		Alert.alert(t('settings.logout'), session?.name ?? '', [
			{ text: t('common.cancel'), style: 'cancel' },
			{ text: t('settings.logout'), style: 'destructive', onPress: () => logout() },
		])
	}

	return (
		<Screen>
			<View style={styles.header}>
				<Disp bold style={{ fontSize: 22 }}>
					{t('settings.title')}
				</Disp>
			</View>
			<ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}>
				<Card style={styles.account}>
					<LogoTron size={38} />
					<View style={{ flex: 1, gap: 3 }}>
						<Disp style={{ fontSize: 15 }}>{client?.name ?? session?.name ?? '—'}</Disp>
						<Mono style={{ fontSize: 10, color: colors.boneLo }}>
							ID {session?.clientId?.slice(0, 8)}…{session?.clientId?.slice(-6)}
						</Mono>
					</View>
				</Card>

				<Eyebrow style={styles.sectionTitle}>{t('settings.settlement')}</Eyebrow>
				<Card style={styles.section}>
					<View style={[styles.methodBlock, styles.rowBorder]}>
						<Text style={styles.settingLabel}>{t('settings.method')}</Text>
						<Row style={{ gap: 8, flexWrap: 'wrap' }}>
							<Chip active={payout === 'wallet'} onPress={() => selectMethod('wallet')}>
								{t('settings.methodWallet')}
							</Chip>
							<Chip active={payout === 'qvapay'} onPress={() => selectMethod('qvapay')}>
								{t('settings.methodQvapay')}
							</Chip>
							<Chip active={payout === 'zelle'} onPress={() => selectMethod('zelle')}>
								{t('settings.methodZelle')}
							</Chip>
						</Row>
					</View>

					{payout === 'qvapay' ? (
						<SettingRow
							label={t('settings.qvapayAccount')}
							value={client?.qvapay_account ?? t('settings.notSet')}
							onPress={() =>
								editText({
									title: t('settings.qvapayAccount'),
									hint: t('settings.qvapayHint'),
									initial: client?.qvapay_account ?? '',
									body: (v) => ({ qvapay_account: v }),
								})
							}
						/>
					) : null}
					{payout === 'zelle' ? (
						<SettingRow
							label={t('settings.zelleContact')}
							value={client?.zelle_contact ?? t('settings.notSet')}
							onPress={() =>
								editText({
									title: t('settings.zelleContact'),
									hint: t('settings.zelleHint'),
									initial: client?.zelle_contact ?? '',
									keyboardType: 'email-address',
									body: (v) => ({ zelle_contact: v }),
								})
							}
						/>
					) : null}

					<SettingRow label={t('settings.fee')} value={t('settings.feeValue')} last={payout !== 'wallet'} />

					{payout === 'wallet' ? (
						<View>
							<Eyebrow style={{ paddingTop: 12, paddingBottom: 4 }}>{t('settings.sweepWallets')}</Eyebrow>
							{SWEEP_FIELDS.map(({ field, label }, i) => {
								const current = (client?.[field] as string | null) ?? null
								return (
									<SettingRow
										key={field}
										label={label}
										value={current ? shortAddress(current) : t('settings.notSet')}
										valueColor={current ? colors.bone : colors.boneLo}
										last={i === SWEEP_FIELDS.length - 1}
										onPress={() =>
											editText({
												title: `${t('settings.sweepWallets')} · ${label}`,
												hint: t('settings.sweepWalletHint'),
												initial: current ?? '',
												allowClear: true,
												body: (v) => ({ [field]: v }),
											})
										}
									/>
								)
							})}
						</View>
					) : null}
				</Card>

				<Eyebrow style={styles.sectionTitle}>{t('settings.deposits')}</Eyebrow>
				<Card style={styles.section}>
					<SettingRow
						label={t('settings.minConfs')}
						value={client?.min_confirmations != null ? String(client.min_confirmations) : t('settings.default')}
						last
						onPress={() =>
							editText({
								title: t('settings.minConfs'),
								hint: t('settings.minConfsHint'),
								initial: client?.min_confirmations != null ? String(client.min_confirmations) : '',
								keyboardType: 'number-pad',
								body: (v) => ({ min_confirmations: Number(v) }),
							})
						}
					/>
				</Card>

				<Eyebrow style={styles.sectionTitle}>{t('settings.notifications')}</Eyebrow>
				<Card style={styles.section}>
					<SettingRow
						label={t('settings.confUpdates')}
						last
						right={
							<Switch
								value={!!client?.notify_confirmation_updates}
								onValueChange={toggleConfUpdates}
								trackColor={{ false: colors.ink2, true: colors.signal }}
								thumbColor={colors.bone}
							/>
						}
					/>
				</Card>

				<Eyebrow style={styles.sectionTitle}>{t('settings.developer')}</Eyebrow>
				<Card style={styles.section}>
					<SettingRow
						label={t('settings.webhookUrl')}
						value={client?.webhook_url ? client.webhook_url.replace(/^https:\/\//, '').slice(0, 26) : t('settings.notSet')}
						valueColor={client?.webhook_url ? colors.bone : colors.boneLo}
						onPress={() =>
							editText({
								title: t('settings.webhookUrl'),
								hint: t('settings.webhookUrlHint'),
								initial: client?.webhook_url ?? '',
								placeholder: 'https://…',
								keyboardType: 'url',
								allowClear: true,
								body: (v) => ({ webhook_url: v }),
							})
						}
					/>
					<SettingRow
						label={t('settings.webhookSecret')}
						value={client?.has_webhook_secret ? (client?.webhook_secret_masked ?? t('settings.secretSet')) : t('settings.notSet')}
						valueColor={client?.has_webhook_secret ? colors.bone : colors.boneLo}
						onPress={() =>
							editText({
								title: t('settings.webhookSecret'),
								hint: t('settings.webhookSecretHint'),
								initial: '',
								placeholder: '••••••••',
								allowClear: true,
								body: (v) => ({ webhook_secret: v }),
							})
						}
					/>
					<SettingRow
						label={t('settings.testWebhook')}
						onPress={client?.webhook_url && !webhookTest.isPending ? runWebhookTest : undefined}
						valueColor={colors.boneLo}
						value={client?.webhook_url ? undefined : t('settings.notSet')}
						right={webhookTest.isPending ? <ActivityIndicator size="small" color={colors.boneMid} /> : undefined}
					/>
					<SettingRow
						label={t('settings.webhooks')}
						value={deliveryRate != null ? `${t('settings.delivery')} ${(deliveryRate * 100).toFixed(1)}%` : '—'}
						right={deliveryRate != null && deliveryRate >= 0.95 ? <StatusDot color={colors.settle} /> : undefined}
					/>
					<SettingRow
						label={t('settings.docs')}
						onPress={() => WebBrowser.openBrowserAsync(`https://trondealer.com/${appLocale}/docs`)}
						right={<IconExternal size={14} color={colors.boneLo} />}
					/>
					<SettingRow
						label={t('settings.privacy')}
						onPress={() => WebBrowser.openBrowserAsync(`https://trondealer.com/${appLocale}/privacy`)}
						right={<IconExternal size={14} color={colors.boneLo} />}
					/>
					<SettingRow
						label={t('settings.terms')}
						last
						onPress={() => WebBrowser.openBrowserAsync(`https://trondealer.com/${appLocale}/terms`)}
						right={<IconExternal size={14} color={colors.boneLo} />}
					/>
				</Card>

				<Eyebrow style={styles.sectionTitle}>{t('settings.security')}</Eyebrow>
				<Card style={styles.section}>
					<SettingRow
						label={bioAvailable ? t('settings.faceId') : `${t('settings.faceId')} (${t('settings.biometricUnavailable')})`}
						right={
							<Switch
								value={bioOn}
								disabled={!bioAvailable}
								onValueChange={toggleBiometric}
								trackColor={{ false: colors.ink2, true: colors.signal }}
								thumbColor={colors.bone}
							/>
						}
					/>
					<SettingRow
						label={`${t('settings.apiKey')} · ${t('settings.rotate')}`}
						last
						onPress={rotateKey.isPending ? undefined : confirmRotate}
						right={rotateKey.isPending ? <ActivityIndicator size="small" color={colors.boneMid} /> : undefined}
					/>
				</Card>

				<Pressable onPress={confirmLogout} style={styles.logout}>
					<Text style={styles.logoutText}>{t('settings.logout')}</Text>
				</Pressable>

				<Mono style={styles.version}>{t('settings.version')}</Mono>
			</ScrollView>

			<EditSheet config={sheet} onClose={() => setSheet(null)} />
		</Screen>
	)
}

const styles = StyleSheet.create({
	header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
	account: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.panel },
	sectionTitle: { paddingTop: 18, paddingBottom: 8 },
	section: { paddingHorizontal: 14 },
	methodBlock: { gap: 10, paddingVertical: 13 },
	settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, minHeight: 48 },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	settingLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.bone, flexShrink: 1, paddingRight: 10 },
	logout: {
		marginTop: 22,
		height: 48,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.bone },
	version: { textAlign: 'center', fontSize: 10, color: colors.boneLo, paddingTop: 18, letterSpacing: 0.8 },
})

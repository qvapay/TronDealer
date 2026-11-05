import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { api } from '../api/client'
import { useSession } from '../auth/session'
import { LogoTron } from '../components/icons'
import { Body, Button, Card, Chip, Disp, Eyebrow, Row, Screen } from '../components/ui'
import { t } from '../i18n'
import { colors, fonts, radius } from '../theme/tokens'

// register-open contract: name + payout_method are required; 'wallet' needs at
// least one of sweep_wallet_tron / sweep_wallet_evm; qvapay/zelle need their
// contact. Returns the td_ api_key EXACTLY ONCE — hence the mandatory backup
// step before signing in. Server rate limit: 1 registration per IP per hour.

type Method = 'tron' | 'evm' | 'qvapay' | 'zelle'

const TARGET_META: Record<Method, { labelKey: 'reg.tronAddress' | 'reg.evmAddress' | 'settings.qvapayAccount' | 'settings.zelleContact'; placeholder: string }> = {
	tron: { labelKey: 'reg.tronAddress', placeholder: 'T…' },
	evm: { labelKey: 'reg.evmAddress', placeholder: '0x…' },
	qvapay: { labelKey: 'settings.qvapayAccount', placeholder: 'usuario@qvapay' },
	zelle: { labelKey: 'settings.zelleContact', placeholder: 'email o teléfono' },
}

export default function Register() {
	const router = useRouter()
	const { login } = useSession()
	const [name, setName] = useState('')
	const [method, setMethod] = useState<Method>('tron')
	const [target, setTarget] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [apiKey, setApiKey] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)

	const canSubmit = name.trim().length >= 2 && target.trim().length >= 2

	async function pasteTarget() {
		const text = await Clipboard.getStringAsync()
		if (text) setTarget(text.trim())
	}

	async function submit() {
		if (!canSubmit || busy) return
		setBusy(true)
		setError(null)
		const body: Record<string, string> =
			method === 'tron'
				? { name: name.trim(), payout_method: 'wallet', sweep_wallet_tron: target.trim() }
				: method === 'evm'
					? { name: name.trim(), payout_method: 'wallet', sweep_wallet_evm: target.trim() }
					: method === 'qvapay'
						? { name: name.trim(), payout_method: 'qvapay', qvapay_account: target.trim() }
						: { name: name.trim(), payout_method: 'zelle', zelle_contact: target.trim() }
		try {
			const res = await api<{ client: { api_key: string } }>('/api/v2/clients/register-open', {
				method: 'POST',
				body,
				auth: false,
			})
			setApiKey(res.client.api_key)
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
		} catch (e: any) {
			setError(e?.status === 429 ? t('reg.rateLimited') : (e?.message ?? t('common.error')))
		} finally {
			setBusy(false)
		}
	}

	async function copyKey() {
		if (!apiKey) return
		await Clipboard.setStringAsync(apiKey)
		setCopied(true)
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
	}

	async function finish() {
		if (!apiKey) return
		setBusy(true)
		try {
			await login(apiKey)
			// AuthGate routes to the tabs on session change.
		} catch (e: any) {
			setError(e?.message ?? t('common.error'))
			setBusy(false)
		}
	}

	// Step 2 — the one-time key backup gate.
	if (apiKey) {
		return (
			<Screen>
				<View style={styles.container}>
					<View style={styles.brand}>
						<LogoTron size={56} />
					</View>
					<Disp bold style={styles.title}>
						{t('reg.keyTitle')}
					</Disp>
					<Body style={styles.warning}>{t('reg.keyWarning')}</Body>
					<Card style={styles.keyCard}>
						<Text selectable style={styles.keyText}>
							{apiKey}
						</Text>
					</Card>
					<View style={{ gap: 10 }}>
						<Button title={copied ? t('reg.keyCopied') : t('reg.copyKey')} variant="ghost" onPress={copyKey} />
						<Button title={t('reg.keySaved')} onPress={finish} loading={busy} disabled={!copied} />
					</View>
					{error ? <Body style={styles.error}>{error}</Body> : null}
				</View>
			</Screen>
		)
	}

	return (
		<Screen>
			<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
					<View style={styles.brand}>
						<LogoTron size={56} />
						<Eyebrow style={{ marginTop: 12 }}>TRONDEALER</Eyebrow>
					</View>

					<Disp bold style={styles.title}>
						{t('reg.title')}
					</Disp>
					<Body style={styles.subtitle}>{t('reg.subtitle')}</Body>

					<Eyebrow style={styles.fieldLabel}>{t('reg.name')}</Eyebrow>
					<TextInput
						value={name}
						onChangeText={setName}
						placeholder={t('reg.namePlaceholder')}
						placeholderTextColor={colors.boneLo}
						style={styles.input}
						maxLength={100}
					/>

					<Eyebrow style={styles.fieldLabel}>{t('reg.payout')}</Eyebrow>
					<Row style={{ gap: 8, flexWrap: 'wrap' }}>
						<Chip active={method === 'tron'} onPress={() => setMethod('tron')}>
							{t('reg.walletTron')}
						</Chip>
						<Chip active={method === 'evm'} onPress={() => setMethod('evm')}>
							{t('reg.walletEvm')}
						</Chip>
						<Chip active={method === 'qvapay'} onPress={() => setMethod('qvapay')}>
							{t('settings.methodQvapay')}
						</Chip>
						<Chip active={method === 'zelle'} onPress={() => setMethod('zelle')}>
							{t('settings.methodZelle')}
						</Chip>
					</Row>

					<Eyebrow style={styles.fieldLabel}>{t(TARGET_META[method].labelKey)}</Eyebrow>
					<View style={styles.inputRow}>
						<TextInput
							value={target}
							onChangeText={(v) => {
								setTarget(v)
								setError(null)
							}}
							placeholder={TARGET_META[method].placeholder}
							placeholderTextColor={colors.boneLo}
							autoCapitalize="none"
							autoCorrect={false}
							style={[styles.input, { flex: 1, marginBottom: 0, fontFamily: fonts.mono, fontSize: 13 }]}
						/>
						<Pressable onPress={pasteTarget} style={styles.pasteBtn} hitSlop={8}>
							<Text style={styles.pasteText}>{t('login.paste')}</Text>
						</Pressable>
					</View>

					{error ? <Body style={styles.error}>{error}</Body> : null}

					<View style={{ marginTop: 16 }}>
						<Button title={t('reg.cta')} onPress={submit} loading={busy} disabled={!canSubmit} />
					</View>

					<Pressable onPress={() => router.back()} hitSlop={8} style={{ alignItems: 'center', marginTop: 18 }}>
						<Body style={{ color: colors.signalHi }}>{t('reg.haveAccount')}</Body>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, justifyContent: 'center' },
	brand: { alignItems: 'center', marginBottom: 20 },
	title: { fontSize: 24, textAlign: 'center', marginBottom: 8 },
	subtitle: { textAlign: 'center', color: colors.boneLo, marginBottom: 20, lineHeight: 19 },
	fieldLabel: { marginTop: 14, marginBottom: 8 },
	input: {
		height: 52,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		paddingHorizontal: 14,
		color: colors.bone,
		fontFamily: fonts.body,
		fontSize: 14,
		marginBottom: 2,
	},
	inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
	pasteBtn: {
		height: 52,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pasteText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.bone },
	error: { color: colors.pending, marginTop: 10, textAlign: 'center' },
	warning: { color: colors.boneMid, lineHeight: 19, textAlign: 'center', marginBottom: 18 },
	keyCard: { padding: 16, marginBottom: 14, borderColor: colors.lineHi },
	keyText: { fontFamily: fonts.mono, fontSize: 13, color: colors.bone, lineHeight: 20 },
})

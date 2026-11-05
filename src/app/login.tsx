import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useSession } from '../auth/session'
import { LogoTron } from '../components/icons'
import { Body, Button, Disp, Eyebrow, Screen } from '../components/ui'
import { t } from '../i18n'
import { colors, fonts, radius } from '../theme/tokens'

export default function Login() {

	const router = useRouter()
	const { login } = useSession()
	const [apiKey, setApiKeyInput] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function onSubmit() {
		if (!apiKey.trim()) return
		setBusy(true)
		setError(null)
		try {
			await login(apiKey)
			// AuthGate redirects to the tabs on session change.
		} catch (e: any) {
			setError(e?.message === 'Failed to fetch' || e?.message?.includes('Network') ? t('login.error') : e?.message ?? t('login.error'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<Screen>
			<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
				<View style={styles.container}>
					<View style={styles.brand}>
						<LogoTron size={64} />
						<Eyebrow style={{ marginTop: 14 }}>TRONDEALER</Eyebrow>
					</View>

					<Disp bold style={styles.title}>
						{t('login.title')}
					</Disp>
					<Body style={styles.subtitle}>{t('login.subtitle')}</Body>

					<TextInput
						value={apiKey}
						onChangeText={(v) => {
							setApiKeyInput(v)
							setError(null)
						}}
						placeholder={t('login.placeholder')}
						placeholderTextColor={colors.boneLo}
						autoCapitalize="none"
						autoCorrect={false}
						secureTextEntry
						style={[styles.input, { marginBottom: 4 }]}
						onSubmitEditing={onSubmit}
					/>

					{error ? <Body style={styles.error}>{error}</Body> : null}

					<Button title={t('login.cta')} onPress={onSubmit} loading={busy} disabled={!apiKey.trim()} />

					<Pressable onPress={() => router.push('/register')} hitSlop={8} style={{ alignItems: 'center', marginTop: 16 }}>
						<Body style={{ color: colors.signalHi }}>{t('login.noAccount')}</Body>
					</Pressable>

					<Body style={styles.footer}>{t('charge.nonCustodial')}</Body>
				</View>
			</KeyboardAvoidingView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 },
	brand: { alignItems: 'center', marginBottom: 26 },
	title: { fontSize: 26, textAlign: 'center' },
	subtitle: { textAlign: 'center', color: colors.boneLo, marginBottom: 16, lineHeight: 19 },
	input: {
		height: 46,
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		paddingHorizontal: 14,
		color: colors.bone,
		fontFamily: fonts.mono,
		fontSize: 13,
	},
	error: { color: colors.pending, marginBottom: 4 },
	footer: { textAlign: 'center', color: colors.boneLo, fontSize: 11, marginTop: 22 },
})

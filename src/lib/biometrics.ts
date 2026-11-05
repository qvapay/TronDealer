import * as SecureStore from 'expo-secure-store'

// Biometric app lock (Face ID / fingerprint). Guarded require like push.ts:
// the native module only exists after a native rebuild — until then (and on
// any binary without it) everything here reports unavailable instead of
// crashing the running build via hot reload.

let LocalAuthentication: any = null
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	LocalAuthentication = require('expo-local-authentication')
} catch {
	LocalAuthentication = null
}

const PREF_KEY = 'td_biometric_lock'

export async function biometricsAvailable(): Promise<boolean> {
	if (!LocalAuthentication) return false
	try {
		const [hasHardware, enrolled] = await Promise.all([
			LocalAuthentication.hasHardwareAsync(),
			LocalAuthentication.isEnrolledAsync(),
		])
		return !!hasHardware && !!enrolled
	} catch {
		return false
	}
}

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
	if (!LocalAuthentication) return false
	try {
		const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false })
		return !!result?.success
	} catch {
		return false
	}
}

export async function isLockEnabled(): Promise<boolean> {
	try {
		return (await SecureStore.getItemAsync(PREF_KEY)) === '1'
	} catch {
		return false
	}
}

export async function setLockEnabled(value: boolean): Promise<void> {
	try {
		if (value) await SecureStore.setItemAsync(PREF_KEY, '1')
		else await SecureStore.deleteItemAsync(PREF_KEY)
	} catch {}
}

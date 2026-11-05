// OneSignal wrapper, safe in every environment.
//
// The native module only exists in a development/EAS build (the config plugin
// injects it) — in Expo Go the require() throws and every function here
// no-ops, so the rest of the app keeps working there. The backend targets
// devices by OneSignal external id = client_id (see webs/tron-dealer
// app/utils/push.js): pushLogin/pushLogout keep that mapping in sync.

let OneSignal: any = null
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	OneSignal = require('react-native-onesignal').OneSignal
} catch {
	OneSignal = null
}

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID

export const pushAvailable = !!(OneSignal && APP_ID)

let initialized = false

export function initPush() {
	if (!pushAvailable || initialized) return
	initialized = true
	OneSignal.initialize(APP_ID)
}

export function pushLogin(clientId: string) {
	if (!pushAvailable) return
	try {
		OneSignal.login(clientId)
	} catch {}
}

export function pushLogout() {
	if (!pushAvailable) return
	try {
		OneSignal.logout()
	} catch {}
}

// Returns whether the device ended up subscribed.
export async function enablePush(): Promise<boolean> {
	if (!pushAvailable) return false
	try {
		const granted = await OneSignal.Notifications.requestPermission(true)
		OneSignal.User.pushSubscription.optIn()
		return !!granted
	} catch {
		return false
	}
}

export function disablePush() {
	if (!pushAvailable) return
	try {
		OneSignal.User.pushSubscription.optOut()
	} catch {}
}

export async function isPushOptedIn(): Promise<boolean> {
	if (!pushAvailable) return false
	try {
		return !!(await OneSignal.User.pushSubscription.getOptedInAsync())
	} catch {
		return false
	}
}

// data payload from the backend push cron: {type:'tx', tx_hash, network, ...}
export function onNotificationClick(handler: (data: Record<string, string>) => void): () => void {
	if (!pushAvailable) return () => {}
	const listener = (event: any) => {
		const data = event?.notification?.additionalData
		if (data && typeof data === 'object') handler(data as Record<string, string>)
	}
	OneSignal.Notifications.addEventListener('click', listener)
	return () => {
		try {
			OneSignal.Notifications.removeEventListener('click', listener)
		} catch {}
	}
}

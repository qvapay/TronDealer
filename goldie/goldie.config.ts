/**
 * goldie config for TronDealer — App Store assets for the merchant app.
 *
 * Run from the repo root with GOLDIE_CONFIG pointing here:
 *   GOLDIE_CONFIG=goldie/goldie.config.ts npx -y goldie@0 doctor
 *
 * The flows live in .argent/flows and authenticate with the argent secret
 * TRONDEALER_API_KEY (see .argent/secrets.env, gitignored). No key in git.
 */

const APP_ROOT = process.cwd();

const config = {
	appRoot: APP_ROOT,
	appPath: `${process.env.HOME}/Library/Developer/Xcode/DerivedData/TronDealer-goldie/Build/Products/Release-iphonesimulator/TronDealer.app`,
	bundleId: "com.trondealer.app",

	devices: ["iphone-6.9"],
	locales: ["es-ES"],
	// The app hardcodes userInterfaceStyle "dark", so light captures are impossible.
	appearance: "dark",

	// Silver reads cleanly against the near-black tiles; the brand red stays the
	// only accent, per the token rules in src/theme/tokens.ts.
	frame: { variant: "17-pro-silver" },

	theme: {
		background: "linear-gradient(165deg, #141413 0%, #0C0C0B 58%, #1A0E10 100%)",
		headlineColor: "#EDEAE4", // colors.bone
		subheadColor: "#A8A49C", // colors.boneMid
		fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
		template: "editorial",
	},

	store: {
		name: "TronDealer",
		subtitle: { "es-ES": "Cobra USDT sin custodia" },
		developer: "TronDealer",
		category: "Finanzas",
		rating: 4.8,
		ratingCount: "1.2 K valoraciones",
		ageRating: "4+",
		price: "Gratis",
		description: {
			"es-ES":
				"TronDealer convierte tu teléfono en un datáfono cripto. Marca el importe, enseña el QR y cobra en USDT sobre TRON, Solana, Sui, Bitcoin, Litecoin, TON o cualquiera de las 7 redes EVM.\n\nEl pago llega directo a tu wallet: TronDealer nunca custodia tus fondos ni te pide depositar nada. Cada cobro se detecta on-chain de forma automática y lo ves confirmado en la app en cuanto la red lo valida.\n\nAsigna una wallet por caja o por sucursal con la etiqueta que quieras, hasta 100 activas por red, y sigue el volumen de tu negocio desde la pantalla de inicio.",
		},
	},

	scenes: [
		{
			kind: "screenshot",
			id: "home",
			flow: "store-01-home",
			headline: { "es-ES": "Tu negocio, en una pantalla" },
			subhead: { "es-ES": "Volumen recibido y actividad reciente, red por red." },
		},
		{
			kind: "screenshot",
			id: "charge",
			flow: "store-02-charge",
			headline: { "es-ES": "Cobra en tres segundos" },
			subhead: { "es-ES": "Marca el importe en USD y genera el cobro. Sin terminal." },
		},
		{
			kind: "screenshot",
			id: "qr",
			flow: "store-03-qr",
			headline: { "es-ES": "Un QR y ya está" },
			subhead: { "es-ES": "El cliente escanea y paga. Detección on-chain automática." },
		},
		{
			kind: "screenshot",
			id: "paid",
			flow: "store-04-paid",
			headline: { "es-ES": "Confirmado on-chain" },
			subhead: { "es-ES": "Lo ves cobrado en cuanto la red lo confirma." },
		},
		{
			kind: "screenshot",
			id: "wallets",
			flow: "store-05-wallets",
			headline: { "es-ES": "Una wallet por caja" },
			subhead: { "es-ES": "Etiquétalas como quieras. Hasta 100 activas por red." },
		},
		{
			kind: "preview",
			id: "preview",
			segments: [
				{ id: "home", flow: "store-preview-01-home" },
				{ id: "amount", flow: "store-preview-02-amount" },
				{ id: "qr", flow: "store-preview-03-qr", holdSeconds: 2 },
			],
		},
	],
};

export default config;

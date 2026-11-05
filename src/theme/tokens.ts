// "The Dealer" design tokens — ported 1:1 from webs/tron-dealer/app/styles/tokens.css
// Rule from the source: if a component fights the tokens, adapt the component — never the tokens.

export const colors = {
	// surfaces
	ink0: '#0C0C0B', // base background — warm graphite ink
	ink1: '#141413', // cards / elevated surfaces
	ink2: '#1D1D1B', // overlays / hover
	line: '#262624', // hairlines
	lineHi: '#3A3A36', // hover/focus borders

	// text
	bone: '#EDEAE4', // headlines
	boneMid: '#A8A49C', // body
	boneLo: '#6B6862', // labels / captions

	// accents
	signal: '#E5484D', // brand red — CTAs, glyph, seal. NEVER an error state.
	signalHi: '#FF6B6E',
	settle: '#46C28E', // semantic ONLY: confirmed on-chain
	pending: '#E8B33C', // semantic ONLY: detecting
} as const

export const radius = {
	chip: 2,
	card: 6,
	panel: 10,
} as const

// motion — ease "dealt" cubic-bezier(0.16, 1, 0.3, 1)
export const motion = {
	ease: [0.16, 1, 0.3, 1] as const,
	micro: 140,
	comp: 380,
	scene: 800,
} as const

export const fonts = {
	disp: 'Archivo-Expanded-SemiBold',
	dispBold: 'Archivo-Expanded-Bold',
	body: 'InstrumentSans_400Regular',
	bodyMedium: 'InstrumentSans_500Medium',
	bodySemi: 'InstrumentSans_600SemiBold',
	mono: 'IBMPlexMono_400Regular',
	monoMedium: 'IBMPlexMono_500Medium',
	monoSemi: 'IBMPlexMono_600SemiBold',
} as const

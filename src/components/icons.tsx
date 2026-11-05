import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'

// Stroke icon set from the design canvas: 24px grid, stroke 1.6-1.7, square caps.

type IconProps = { size?: number; color: string; strokeWidth?: number }

function Frame({ size = 20, children }: { size?: number; children: React.ReactNode }) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			{children}
		</Svg>
	)
}

export function Glyph({ size = 20 }: { size?: number }) {
	return (
		<Svg width={size} height={size} viewBox="0 0 64 64">
			<Path fill="#E5484D" d="M0 0h46l18 18v46H0z" />
		</Svg>
	)
}

// Classic TronDealer mark — from webs/tron-dealer public/assets/trondealer.svg.
export function LogoTron({ size = 48 }: { size?: number }) {
	return (
		<Svg width={size} height={size * (521 / 501)} viewBox="0 0 501 521" fill="none">
			<Defs>
				<LinearGradient id="tdBolt" x1="232.86" y1="379.56" x2="286.22" y2="42.12" gradientUnits="userSpaceOnUse">
					<Stop offset="0" stopColor="#0078FF" />
					<Stop offset="1" stopColor="#00FF6F" />
				</LinearGradient>
			</Defs>
			<Path
				stroke="#FF004F"
				strokeWidth={25}
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M326.59 105.36h106.81c29.2 0 46.92 32.22 31.27 56.88L280.94 451.87c-14.54 22.93-48 22.93-62.55 0L34.66 162.24c-15.64-24.66 2.07-56.88 31.27-56.88h128.83"
			/>
			<Path
				fill="url(#tdBolt)"
				d="M352.16 205.24 237.27 383.32c-3.01 4.66-10.23 2.53-10.23-3.01V232.73c0-4.58-3.72-8.3-8.31-8.3h-46.82c-4.4 0-7.06-4.88-4.67-8.58L282.13 37.77c3.01-4.66 10.23-2.53 10.23 3.02v147.57c0 4.59 3.72 8.31 8.31 8.31h46.82c4.4 0 7.06 4.87 4.67 8.57Z"
			/>
		</Svg>
	)
}

export function IconHome({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M4 10l8-7 8 7v10h-5v-6h-6v6H4z" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconWallet({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Rect x="3" y="6" width="18" height="13" rx="1" stroke={color} strokeWidth={strokeWidth} />
			<Path d="M3 10h18M16 15h2" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconQr({ size, color, strokeWidth = 1.7 }: IconProps) {
	return (
		<Frame size={size}>
			<Rect x="4" y="4" width="6" height="6" stroke={color} strokeWidth={strokeWidth} />
			<Rect x="14" y="4" width="6" height="6" stroke={color} strokeWidth={strokeWidth} />
			<Rect x="4" y="14" width="6" height="6" stroke={color} strokeWidth={strokeWidth} />
			<Path d="M14 14h3v3h-3zM20 17v3h-3" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconList({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M4 6h16M4 12h16M4 18h10" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconGear({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
			<Path
				d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
				stroke={color}
				strokeWidth={strokeWidth}
			/>
		</Frame>
	)
}

export function IconBell({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M6 10a6 6 0 0 1 12 0v5l2 3H4l2-3z" stroke={color} strokeWidth={strokeWidth} />
			<Path d="M10 20h4" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconSweep({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M7 17 17 7M9 7h8v8" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconSettle({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M4 12h12M12 6l6 6-6 6M20 4v16" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconCopy({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Rect x="8" y="8" width="12" height="12" stroke={color} strokeWidth={strokeWidth} />
			<Path d="M4 16V4h12" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconShare({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M12 15V4M8 8l4-4 4 4M5 15v5h14v-5" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconCheck({ size, color, strokeWidth = 2 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M4 12.5 9.5 18 20 6.5" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconBack({ size, color, strokeWidth = 1.7 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconClose({ size, color, strokeWidth = 1.7 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconChevron({ size, color, strokeWidth = 1.7 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconBackspace({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M9 5h11v14H9l-6-7zM12 9l6 6M18 9l-6 6" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconExternal({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M9 5h10v10M19 5 5 19" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

export function IconRetry({ size, color, strokeWidth = 1.6 }: IconProps) {
	return (
		<Frame size={size}>
			<Path d="M4 12a8 8 0 1 1 2.3 5.7M4 12V7M4 12h5" stroke={color} strokeWidth={strokeWidth} />
		</Frame>
	)
}

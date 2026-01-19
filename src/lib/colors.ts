// Available color keys for users
export const USER_COLOR_KEYS = [
	"red",
	"orange",
	"amber",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
]

// Neutral color for the current user (always the same)
export const CURRENT_USER_COLOR_KEY = "slate"

// Tailwind CSS class mappings to ensure classes are detected
const avatarColorClasses: Record<string, string> = {
	red: "bg-red-500 dark:bg-red-600",
	orange: "bg-orange-500 dark:bg-orange-600",
	amber: "bg-amber-500 dark:bg-amber-600",
	yellow: "bg-yellow-500 dark:bg-yellow-600",
	lime: "bg-lime-500 dark:bg-lime-600",
	green: "bg-green-500 dark:bg-green-600",
	emerald: "bg-emerald-500 dark:bg-emerald-600",
	teal: "bg-teal-500 dark:bg-teal-600",
	cyan: "bg-cyan-500 dark:bg-cyan-600",
	sky: "bg-sky-500 dark:bg-sky-600",
	blue: "bg-blue-500 dark:bg-blue-600",
	indigo: "bg-indigo-500 dark:bg-indigo-600",
	violet: "bg-violet-500 dark:bg-violet-600",
	purple: "bg-purple-500 dark:bg-purple-600",
	fuchsia: "bg-fuchsia-500 dark:bg-fuchsia-600",
	pink: "bg-pink-500 dark:bg-pink-600",
	rose: "bg-rose-500 dark:bg-rose-600",
	slate: "bg-slate-500 dark:bg-slate-600",
}

const textColorClasses: Record<string, string> = {
	red: "text-red-500 dark:text-red-400",
	orange: "text-orange-500 dark:text-orange-400",
	amber: "text-amber-500 dark:text-amber-400",
	yellow: "text-yellow-500 dark:text-yellow-400",
	lime: "text-lime-500 dark:text-lime-400",
	green: "text-green-500 dark:text-green-400",
	emerald: "text-emerald-500 dark:text-emerald-400",
	teal: "text-teal-500 dark:text-teal-400",
	cyan: "text-cyan-500 dark:text-cyan-400",
	sky: "text-sky-500 dark:text-sky-400",
	blue: "text-blue-500 dark:text-blue-400",
	indigo: "text-indigo-500 dark:text-indigo-400",
	violet: "text-violet-500 dark:text-violet-400",
	purple: "text-purple-500 dark:text-purple-400",
	fuchsia: "text-fuchsia-500 dark:text-fuchsia-400",
	pink: "text-pink-500 dark:text-pink-400",
	rose: "text-rose-500 dark:text-rose-400",
	slate: "text-slate-500 dark:text-slate-400",
}

const borderColorClasses: Record<string, string> = {
	red: "border-red-500 dark:border-red-400",
	orange: "border-orange-500 dark:border-orange-400",
	amber: "border-amber-500 dark:border-amber-400",
	yellow: "border-yellow-500 dark:border-yellow-400",
	lime: "border-lime-500 dark:border-lime-400",
	green: "border-green-500 dark:border-green-400",
	emerald: "border-emerald-500 dark:border-emerald-400",
	teal: "border-teal-500 dark:border-teal-400",
	cyan: "border-cyan-500 dark:border-cyan-400",
	sky: "border-sky-500 dark:border-sky-400",
	blue: "border-blue-500 dark:border-blue-400",
	indigo: "border-indigo-500 dark:border-indigo-400",
	violet: "border-violet-500 dark:border-violet-400",
	purple: "border-purple-500 dark:border-purple-400",
	fuchsia: "border-fuchsia-500 dark:border-fuchsia-400",
	pink: "border-pink-500 dark:border-pink-400",
	rose: "border-rose-500 dark:border-rose-400",
	slate: "border-slate-500 dark:border-slate-400", // For current user
}

// --- HSL Value Mapping for mIRC Theme Nicknames --- //
const mircNicknameHslColors: Record<string, string> = {
	red: "hsl(0 100% 70%)", // Bright Red
	orange: "hsl(30 100% 65%)", // Bright Orange
	amber: "hsl(45 100% 60%)", // Bright Amber
	yellow: "hsl(60 100% 70%)", // Bright Yellow
	lime: "hsl(90 100% 60%)", // Bright Lime
	green: "hsl(120 100% 60%)", // Bright Green
	emerald: "hsl(150 100% 60%)", // Bright Emerald
	teal: "hsl(170 100% 55%)", // Bright Teal
	cyan: "hsl(190 100% 65%)", // Bright Cyan
	sky: "hsl(205 100% 70%)", // Bright Sky Blue
	blue: "hsl(220 100% 70%)", // Bright Blue
	indigo: "hsl(240 100% 75%)", // Bright Indigo
	violet: "hsl(260 100% 75%)", // Bright Violet
	purple: "hsl(280 100% 75%)", // Bright Purple
	fuchsia: "hsl(310 100% 70%)", // Bright Fuchsia
	pink: "hsl(330 100% 75%)", // Bright Pink
	rose: "hsl(350 100% 75%)", // Bright Rose
	slate: "hsl(210 15% 80%)", // Light Gray (for current user fallback, less bright)
}

/**
 * Function to deterministically get a color key based on user ID.
 * This ensures the same user always gets the same color.
 * @param userId The user's unique identifier.
 * @returns A color key string (e.g., "red", "blue").
 */
export function getColorKeyForUser(userId: string): string {
	// Simple string hash function to get a deterministic number from a string
	let hash = 0
	for (let i = 0; i < userId.length; i++) {
		hash = (hash << 5) - hash + userId.charCodeAt(i)
		hash = hash & hash // Convert to 32bit integer
	}
	// Make the hash positive and mod it to get an index in our color array
	const colorIndex = Math.abs(hash) % USER_COLOR_KEYS.length
	return USER_COLOR_KEYS[colorIndex]
}

/**
 * Gets the Tailwind CSS classes for an avatar background based on a color key.
 * @param colorKey The color key string.
 * @returns Tailwind CSS class string for background color.
 */
export function getAvatarClass(colorKey: string): string {
	return avatarColorClasses[colorKey] || avatarColorClasses.slate // Fallback to slate
}

/**
 * Gets the Tailwind CSS classes for text color based on a color key.
 * @param colorKey The color key string.
 * @returns Tailwind CSS class string for text color.
 */
export function getTextClass(colorKey: string): string {
	return textColorClasses[colorKey] || textColorClasses.slate // Fallback to slate
}

/**
 * Gets the Tailwind CSS classes for border color based on a color key.
 * @param colorKey The color key string.
 * @returns Tailwind CSS class string for border color.
 */
export function getBorderClass(colorKey: string): string {
	return borderColorClasses[colorKey] || borderColorClasses.slate // Fallback to slate
}

/**
 * Gets the HSL color string for mIRC nickname text based on a color key.
 * @param colorKey The color key string.
 * @returns HSL color string (e.g., "hsl(120 100% 60%)").
 */
export function getMircNicknameColor(colorKey: string): string {
	return mircNicknameHslColors[colorKey] || mircNicknameHslColors.slate // Fallback to slate
}

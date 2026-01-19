// Available theme names
export type ThemeName = "light" | "dark" | "mirc"

// Default theme
export const DEFAULT_THEME_NAME: ThemeName = "light"

// Local storage key for theme
export const LOCAL_STORAGE_KEY = "chatroom-theme"

// Themes metadata
export const themes: Record<ThemeName, { name: string; description: string }> =
	{
		light: {
			name: "Light",
			description: "Default light theme",
		},
		dark: {
			name: "Dark",
			description: "Dark theme for low-light environments",
		},
		mirc: {
			name: "mIRC",
			description: "Classic mIRC-inspired theme",
		},
	}

// Helper to validate theme names
export function isValidThemeName(theme: string | null): theme is ThemeName {
	return theme !== null && Object.keys(themes).includes(theme)
}

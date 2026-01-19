type Theme = {
	name: string
}

export type ThemeName = "light" | "dark" | "mirc"

export const themes: Record<ThemeName, Theme> = {
	light: {
		name: "light",
	},
	dark: {
		name: "dark",
	},
	mirc: {
		name: "mirc",
	},
}

export const DEFAULT_THEME_NAME: ThemeName = "light"

export const isValidThemeName = (
	themeName: string | null,
): themeName is ThemeName => {
	return themeName !== null && Object.keys(themes).includes(themeName)
}

export const LOCAL_STORAGE_KEY = "theme"

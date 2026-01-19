import { createContext, useContext } from "react"

import { DEFAULT_THEME_NAME, ThemeName } from "@/styles/themes"

interface ThemeContextState {
	theme: ThemeName
	setTheme: (theme: ThemeName) => void
}

const initialState: ThemeContextState = {
	theme: DEFAULT_THEME_NAME,
	setTheme: () => null,
}

const ThemeContext = createContext<ThemeContextState>(initialState)

export const useTheme = () => {
	const context = useContext(ThemeContext)

	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider")
	}

	return context
}

// Export the context for other hooks
export { ThemeContext }

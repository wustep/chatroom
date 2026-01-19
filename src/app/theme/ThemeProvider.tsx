import React, { useCallback, useEffect, useMemo, useState } from "react"

// Use new path for themes/types metadata
import {
	DEFAULT_THEME_NAME,
	isValidThemeName,
	LOCAL_STORAGE_KEY,
	ThemeName,
	themes,
} from "@/styles/themes"
import { ThemeContext } from "@/styles/themes/ThemeContext"

interface ThemeProviderProps {
	children: React.ReactNode
	defaultTheme?: ThemeName
	storageKey?: string
}

const applyThemeCss = async (themeName: ThemeName) => {
	document.documentElement.classList.remove(
		...Object.keys(themes).map(name => `theme-${name}`),
	)

	document.documentElement.classList.add(`theme-${themeName}`)

	try {
		switch (themeName) {
			case "light":
				// Light is applied by default.
				break
			case "dark":
				await import("@/styles/themes/dark.css")
				break
			case "mirc":
				await import("@/styles/themes/mirc.css")
				break
			default:
				console.warn(`Unsupported theme for CSS import: ${themeName}`)
		}
		console.log(`Applied theme CSS for: ${themeName}`)
	} catch (error) {
		console.error(`Failed to load CSS for theme ${themeName}:`, error)
	}
}

export function ThemeProvider({
	children,
	defaultTheme = DEFAULT_THEME_NAME,
	storageKey = LOCAL_STORAGE_KEY,
}: ThemeProviderProps) {
	const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(() => {
		const initialTheme = defaultTheme

		try {
			const storedTheme = window.localStorage.getItem(storageKey)
			if (isValidThemeName(storedTheme)) {
				return storedTheme
			}
		} catch (e) {
			console.error("Failed to read theme from localStorage", e)
		}

		try {
			const urlParams = new URLSearchParams(window.location.search)
			const urlTheme = urlParams.get("theme")
			if (isValidThemeName(urlTheme)) {
				return urlTheme
			}
		} catch (e) {
			console.error("Failed to read theme from URL", e)
		}

		try {
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches
			if (prefersDark) {
				return "dark"
			}
			return "light"
		} catch (e) {
			console.error("Failed to detect system theme preference", e)
		}

		return initialTheme
	})

	useEffect(() => {
		applyThemeCss(currentThemeName)
	}, [currentThemeName])

	useEffect(() => {
		const handlePopState = () => {
			try {
				const urlParams = new URLSearchParams(window.location.search)
				const urlTheme = urlParams.get("theme")
				const validUrlTheme = isValidThemeName(urlTheme) ? urlTheme : null

				if (validUrlTheme && validUrlTheme !== currentThemeName) {
					setCurrentThemeName(validUrlTheme)
				} else if (!validUrlTheme && currentThemeName !== defaultTheme) {
					setCurrentThemeName(defaultTheme)
				}
			} catch (e) {
				console.error("Failed to read theme from URL on popstate", e)
			}
		}

		window.addEventListener("popstate", handlePopState)
		return () => {
			window.removeEventListener("popstate", handlePopState)
		}
	}, [currentThemeName, defaultTheme])

	const setTheme = useCallback(
		(themeName: ThemeName) => {
			// Type guard already ensures themeName is valid ThemeName here,
			// but double-check doesn't hurt if called externally somehow.
			if (!isValidThemeName(themeName)) {
				console.warn(`Invalid theme name provided: ${themeName}`)
				return
			}
			try {
				window.localStorage.setItem(storageKey, themeName)
			} catch (e) {
				console.error("Failed to save theme to localStorage", e)
			}

			setCurrentThemeName(themeName) // Update state, triggers effect to apply CSS
		},
		[storageKey],
	)

	const value = useMemo(
		() => ({
			theme: currentThemeName,
			setTheme,
		}),
		[currentThemeName, setTheme],
	)

	// Apply initial theme class synchronously before first render
	useMemo(() => {
		document.documentElement.classList.remove(
			...Object.keys(themes).map(name => `theme-${name}`),
		)
		document.documentElement.classList.add(`theme-${currentThemeName}`)
	}, [currentThemeName])

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

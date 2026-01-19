import { useEffect, useState } from "react"

import { useTheme } from "@/styles/themes/ThemeContext"

/**
 * Hook to check if the current theme is fully loaded
 * @returns boolean indicating if theme CSS is ready
 */
export function useThemeLoaded() {
	const { theme } = useTheme()
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		let isMounted = true

		// Function to check if theme CSS is loaded
		const checkThemeLoaded = () => {
			// For themes that require dynamic CSS imports, we'll check for its class
			const themeClass = `theme-${theme}`
			const hasThemeClass =
				document.documentElement.classList.contains(themeClass)

			// If mounted and theme class is applied, set as loaded
			if (isMounted && hasThemeClass) {
				// Short timeout to ensure CSS has been processed
				setTimeout(() => {
					if (isMounted) {
						setIsLoaded(true)
					}
				}, 50)
			}
		}

		// Reset loaded state when theme changes
		setIsLoaded(false)

		// Check immediately and after a short delay
		checkThemeLoaded()

		// For theme changes that need more time to load
		const timeoutId = setTimeout(checkThemeLoaded, 100)

		return () => {
			isMounted = false
			clearTimeout(timeoutId)
		}
	}, [theme])

	return isLoaded
}

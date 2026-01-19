import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

/**
 * Vite config for both app & storybook.
 *
 * If at some point, we need to split the config,
 * we can make vite.storybook.config.ts and edit src/storybook/main.ts accordingly.
 *
 * https://vite.dev/config/
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
})

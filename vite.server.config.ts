// eslint-disable-next-line no-restricted-imports
import { aliasConfig, sharedPlugins } from "./vite.config"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: sharedPlugins,
	resolve: {
		alias: aliasConfig,
	},
	build: {
		target: "node18",
		outDir: "dist",
		rollupOptions: {
			input: "src/server/server.ts",
			output: {
				entryFileNames: "server.js",
			},
		},
	},
})

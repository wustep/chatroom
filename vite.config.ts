import path from "path"
import tsconfigPaths from "vite-tsconfig-paths"

export const aliasConfig = {
	"@": path.resolve(__dirname, "./src"),
}

export const sharedPlugins = [tsconfigPaths()]

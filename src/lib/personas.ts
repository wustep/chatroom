/**
 * Collection of predefined personas for AI chatbots
 * Personas are loaded from individual markdown files in src/lib/personas/
 */

export interface Persona {
	/** Display name (e.g. Alex) */
	name: string
	/** Username to show in chat instead of name. Currently using lowercase version of name. */
	username: string
	profile: string
	personality: {
		traits: string[]
		communicationStyle: string
		interests: string[]
		background: string
		typingPatterns: string
		commonPhrases: string[]
		emojiUsage: string
	}
	/** Settings related to game participation (legacy, kept for compatibility) */
	gameSettings: {
		enabled: boolean
		autoInvite: boolean
		strategy: string
	}
	/** Settings related to chat participation */
	chatSettings: {
		enabled: boolean
		autoInvite: boolean
		webSearch?: boolean
	}
	/** Optional custom template files */
	templates?: {
		game?: string
		chat?: string
		starter?: string
	}
	/** Allow any additional fields for flexible JSON support */
	[key: string]: unknown
}

// Import all persona markdown files
// Using Vite's glob import for build-time loading
const personaFiles = import.meta.glob("./personas/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
})

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
	frontmatter: Record<string, unknown>
	body: string
} {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
	if (!match) {
		return { frontmatter: {}, body: content }
	}

	const [, yamlStr, body] = match
	const frontmatter: Record<string, unknown> = {}

	// Simple YAML parser for our specific format
	let currentKey = ""
	let currentIndent = 0
	let nestedObj: Record<string, unknown> = {}

	for (const line of yamlStr.split("\n")) {
		if (!line.trim()) continue

		const indentMatch = line.match(/^(\s*)/)
		const indent = indentMatch ? indentMatch[1].length : 0

		if (indent === 0) {
			// Top-level key
			if (currentKey && Object.keys(nestedObj).length > 0) {
				frontmatter[currentKey] = nestedObj
				nestedObj = {}
			}

			const colonIdx = line.indexOf(":")
			if (colonIdx !== -1) {
				const key = line.slice(0, colonIdx).trim()
				const value = line.slice(colonIdx + 1).trim()
				if (value) {
					// Remove quotes
					frontmatter[key] = value.replace(/^["']|["']$/g, "")
				} else {
					currentKey = key
					currentIndent = 2 // Expect nested at 2 spaces
				}
			}
		} else if (indent >= currentIndent && currentKey) {
			// Nested key
			const colonIdx = line.indexOf(":")
			if (colonIdx !== -1) {
				const key = line.slice(0, colonIdx).trim()
				const value = line.slice(colonIdx + 1).trim()
				if (value === "true") {
					nestedObj[key] = true
				} else if (value === "false") {
					nestedObj[key] = false
				} else {
					nestedObj[key] = value.replace(/^["']|["']$/g, "")
				}
			}
		}
	}

	// Don't forget the last nested object
	if (currentKey && Object.keys(nestedObj).length > 0) {
		frontmatter[currentKey] = nestedObj
	}

	return { frontmatter, body }
}

/**
 * Parse a section from markdown body
 */
function parseSection(body: string, heading: string): string {
	const regex = new RegExp(`### ${heading}\\n\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`)
	const match = body.match(regex)
	return match ? match[1].trim() : ""
}

/**
 * Parse a list section from markdown body
 */
function parseListSection(body: string, heading: string): string[] {
	const content = parseSection(body, heading)
	if (!content) return []

	return content
		.split("\n")
		.filter(line => line.startsWith("- "))
		.map(line => line.slice(2).replace(/^["']|["']$/g, "").trim())
}

/**
 * Parse the Profile section from markdown body
 */
function parseProfile(body: string): string {
	const match = body.match(/## Profile\n\n([\s\S]*?)(?=\n## |$)/)
	return match ? match[1].trim() : ""
}

/**
 * Parse a markdown persona file into a Persona object
 */
function parsePersonaMarkdown(content: string): Persona {
	const { frontmatter, body } = parseFrontmatter(content)
	const chatSettings = (frontmatter.chatSettings as Record<string, unknown>) || {}

	return {
		name: (frontmatter.name as string) || "",
		username: (frontmatter.username as string) || "",
		profile: parseProfile(body),
		personality: {
			traits: parseListSection(body, "Traits"),
			communicationStyle: parseSection(body, "Communication Style"),
			interests: parseListSection(body, "Interests"),
			background: parseSection(body, "Background"),
			typingPatterns: parseSection(body, "Typing Patterns"),
			commonPhrases: parseListSection(body, "Common Phrases"),
			emojiUsage: parseSection(body, "Emoji Usage"),
		},
		gameSettings: {
			enabled: false,
			autoInvite: false,
			strategy: "",
		},
		chatSettings: {
			enabled: chatSettings.enabled === true,
			autoInvite: chatSettings.autoInvite === true,
			webSearch: chatSettings.webSearch === true,
		},
	}
}

// Parse all persona files
export const personas: Persona[] = Object.values(personaFiles)
	.map(content => parsePersonaMarkdown(content as string))
	.filter(p => p.name) // Filter out any invalid personas
	.sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name

/**
 * Get a persona by name or username (case-insensitive)
 */
export function getPersonaByName(nameOrUsername: string): Persona | undefined {
	const searchTerm = nameOrUsername.toLowerCase()
	return personas.find(
		p =>
			p.name.toLowerCase() === searchTerm ||
			p.username.toLowerCase() === searchTerm,
	)
}

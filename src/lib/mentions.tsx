import React from "react"

interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	isAI?: boolean
}

/**
 * Processes text to identify valid mentions and returns JSX with mentions styled
 * @param text The message text to process
 * @param players Array of players in the current room
 * @returns JSX with mentions bolded
 */
export function processMentions(
	text: string,
	players: Player[],
): React.ReactNode {
	// Create a set of valid player names (case-insensitive)
	const validPlayerNames = new Set(
		players.map(player => player.name.toLowerCase()),
	)

	// Regular expression to find @mentions
	const mentionRegex = /@(\w+)/g

	// Track processed content
	const parts: React.ReactNode[] = []
	let lastIndex = 0
	let match

	// Find all @mentions
	while ((match = mentionRegex.exec(text)) !== null) {
		const fullMatch = match[0] // @username
		const username = match[1] // username without @
		const startIndex = match.index

		// Add text before this mention
		if (startIndex > lastIndex) {
			parts.push(text.slice(lastIndex, startIndex))
		}

		// Check if this is a valid mention
		if (validPlayerNames.has(username.toLowerCase())) {
			// Valid mention - render in bold
			parts.push(
				<strong key={`mention-${startIndex}`} className="font-semibold">
					{fullMatch}
				</strong>,
			)
		} else {
			// Invalid mention - render normally
			parts.push(fullMatch)
		}

		lastIndex = startIndex + fullMatch.length
	}

	// Add any remaining text
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex))
	}

	// If no mentions were found, return the original text
	if (parts.length === 0) {
		return text
	}

	return <>{parts}</>
}

/**
 * Simple check to see if text contains any mentions
 * @param text The text to check
 * @returns true if text contains @mentions
 */
export function containsMentions(text: string): boolean {
	return /@\w+/.test(text)
}

import * as fs from "fs"

import { AIPersona } from "@/server/ai/PersonaManager"
import { PromptTemplateEngine } from "@/server/ai/PromptTemplateEngine"
import type { ChatMessage } from "@/server/types"

// Template file paths
const CHAT_RESPONSE_TEMPLATE = "src/server/ai/templates/chat-response.hbs"

/**
 * Generates a prompt for AI chat responses.
 */
export function generateChatResponsePrompt(
	persona: AIPersona,
	conversationHistory: ChatMessage[],
	customTemplate?: string,
): string {
	const templateData = {
		persona,
		name: persona.name,
		conversationHistory: formatConversationHistory(conversationHistory),
	}

	// Get the template with priority: custom > persona-specific > default
	const personaTemplates = persona.templates as { chat?: string } | undefined
	const template = PromptTemplateEngine.getTemplate(
		getDefaultChatTemplate(),
		customTemplate,
		personaTemplates?.chat,
	)

	return PromptTemplateEngine.render(template, templateData)
}

/**
 * Get the default chat response template content
 */
function getDefaultChatTemplate(): string {
	try {
		return fs.readFileSync(CHAT_RESPONSE_TEMPLATE, "utf8")
	} catch {
		// Fallback template if file doesn't exist
		return `You are engaging in a chat as your persona.

### Your Persona: {{name}}
{{#if persona.profile}}
{{persona.profile}}
{{/if}}

### Conversation History
{{{conversationHistory}}}

{{name}}: `
	}
}

/**
 * Formats the conversation history into a readable string with enhanced timestamp formatting.
 */
function formatConversationHistory(messages: ChatMessage[]): string {
	if (messages.length === 0) return "No conversation history yet."

	// Format timestamps to include hours:minutes:seconds
	return messages
		.map(msg => {
			const time = msg.timestamp ? new Date(msg.timestamp) : new Date()
			const timeFormatted = `${time
				.getHours()
				.toString()
				.padStart(2, "0")}:${time
				.getMinutes()
				.toString()
				.padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}`
			return `[${timeFormatted}] ${msg.sender}: ${msg.text}`
		})
		.join("\n")
}

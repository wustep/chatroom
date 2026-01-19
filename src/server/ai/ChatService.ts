import { ModelProvider } from "@/server/ai/ModelProvider"
import { AIPersona, PersonaManager } from "@/server/ai/PersonaManager"
import { generateChatResponsePrompt } from "@/server/ai/prompts"
import { ChatMessage } from "@/server/types"

export class ChatService {
	private static instance: ChatService
	private modelProvider: ModelProvider
	private personaManager: PersonaManager

	private constructor() {
		this.modelProvider = ModelProvider.getInstance()
		this.personaManager = PersonaManager.getInstance()
	}

	/**
	 * Get singleton instance of the chat service
	 */
	public static getInstance(): ChatService {
		if (!ChatService.instance) {
			ChatService.instance = new ChatService()
		}
		return ChatService.instance
	}

	/**
	 * Generate an AI response with conversation context
	 * @param responderName The name of the AI responding
	 * @param conversationHistory Previous messages in the conversation
	 * @param customTemplate Optional custom template to override defaults
	 * @returns A promise resolving to the AI's response text
	 */
	public async generateResponseWithContext(
		responderName: string,
		conversationHistory: ChatMessage[] = [],
		customTemplate?: string,
		settings?: { model?: string; temperature?: number; maxTokens?: number },
	): Promise<string> {
		// Find the responder ID from conversation history or assign a temporary one
		let responderId = conversationHistory.find(
			msg => msg.sender === responderName,
		)?.senderId
		if (!responderId) {
			console.warn(
				`Could not find ID for responder ${responderName}, assigning temporary.`,
			)
			// Use consistent ID format for temporary fallback
			responderId = `${responderName}_${Date.now()}`
		}

		// Get or create the AI persona using PersonaManager
		const persona = await this.personaManager.getOrCreatePersona(
			responderName,
			responderId,
		)

		// Generate the prompt
		const prompt = generateChatResponsePrompt(
			persona,
			conversationHistory,
			customTemplate,
		)

		// Extract webSearch setting safely
		const webSearchEnabled =
			persona?.chatSettings &&
			typeof persona.chatSettings === "object" &&
			persona.chatSettings !== null &&
			"webSearch" in persona.chatSettings
				? Boolean((persona.chatSettings as { webSearch?: boolean }).webSearch)
				: false

		// Generate completion using the model provider
		return await this.modelProvider.generateCompletion(prompt, {
			webSearch: webSearchEnabled,
			...settings,
		})
	}

	/**
	 * Update an existing persona for an AI player
	 * @param aiId The AI player's ID
	 * @param personaData The updated persona data
	 * @returns A promise that resolves when the persona is updated
	 */
	public async updatePersona(
		aiId: string,
		personaData: Partial<AIPersona>,
	): Promise<AIPersona> {
		return this.personaManager.updatePersona(aiId, personaData)
	}

	/**
	 * Generate a response using a custom prompt
	 * @param customPrompt A fully formed custom prompt
	 * @returns A promise resolving to the AI's response text
	 */
	public async generateCustomResponse(
		customPrompt: string,
		settings?: {
			model?: string
			temperature?: number
			maxTokens?: number
			webSearch?: boolean
		},
	): Promise<string> {
		// Pass directly to the modelProvider for completion
		return await this.modelProvider.generateCompletion(customPrompt, settings)
	}
}

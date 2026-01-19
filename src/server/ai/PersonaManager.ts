import { getPersonaByName, personas } from "@/lib/personas"

// Flexible AI persona interface - allows any JSON structure
export interface AIPersona {
	name: string
	id: string
	// Allow any additional fields for flexible JSON support
	[key: string]: unknown
}

export class PersonaManager {
	private static instance: PersonaManager
	private personas: Map<string, AIPersona> = new Map()
	private aiTypingSpeeds: Map<string, number> = new Map() // Typing speed in ms per character
	private aiResponseRates: Map<string, number> = new Map() // Probability of responding to another AI (0-1)
	private aiActivityLevels: Map<string, number> = new Map() // How active an AI is (0-1)

	private constructor() {}

	public static getInstance(): PersonaManager {
		if (!PersonaManager.instance) {
			PersonaManager.instance = new PersonaManager()
		}
		return PersonaManager.instance
	}

	/**
	 * Create a dynamic persona by combining traits from multiple preset personas
	 * @param name The AI player's name
	 * @param id The AI player's ID
	 * @returns The dynamically created AI persona
	 */
	private createDynamicPersona(name: string, id: string): AIPersona {
		// Select 2-4 random personas to combine traits from
		const numPersonas = Math.floor(Math.random() * 3) + 2 // 2-4 personas
		const selectedPersonas = []

		// Create a copy of the personas array to avoid modifying the original
		const availablePersonas = [...personas]

		// Select random personas
		for (let i = 0; i < numPersonas; i++) {
			const randomIndex = Math.floor(Math.random() * availablePersonas.length)
			selectedPersonas.push(availablePersonas[randomIndex])
			// Remove the selected persona to avoid duplicates
			availablePersonas.splice(randomIndex, 1)
		}

		// Use the first persona as the base for the profile
		const basePersona = selectedPersonas[0]

		// Combine traits from all selected personas
		const combinedTraits = new Set<string>()
		const combinedInterests = new Set<string>()
		const combinedCommonPhrases = new Set<string>()

		// Combine traits, interests, and common phrases from all selected personas
		selectedPersonas.forEach(persona => {
			persona.personality.traits.forEach(trait => combinedTraits.add(trait))
			persona.personality.interests.forEach(interest =>
				combinedInterests.add(interest),
			)
			persona.personality.commonPhrases.forEach(phrase =>
				combinedCommonPhrases.add(phrase),
			)
		})

		// Convert Sets back to arrays
		const traits = Array.from(combinedTraits)
		const interests = Array.from(combinedInterests)
		const commonPhrases = Array.from(combinedCommonPhrases)

		// Randomly select a communication style, background, typing patterns, and emoji usage
		const communicationStyle =
			selectedPersonas[Math.floor(Math.random() * selectedPersonas.length)]
				.personality.communicationStyle
		const background =
			selectedPersonas[Math.floor(Math.random() * selectedPersonas.length)]
				.personality.background
		const typingPatterns =
			selectedPersonas[Math.floor(Math.random() * selectedPersonas.length)]
				.personality.typingPatterns
		const emojiUsage =
			selectedPersonas[Math.floor(Math.random() * selectedPersonas.length)]
				.personality.emojiUsage

		// Combine game strategies
		const gameStrategies = selectedPersonas.map(p => p.gameSettings.strategy)
		const combinedGameStrategy = gameStrategies.join(" Additionally, ")

		// Create a dynamic profile based on the combined traits
		const dynamicProfile = `I am ${name}, a unique individual with a blend of characteristics. ${
			basePersona.profile
				.split("I am " + basePersona.name + ", ")[1]
				.split(". I'm")[0]
		}. I'm a complex personality with traits from multiple personas.`

		// Create the dynamic persona
		const dynamicPersona: AIPersona = {
			name,
			id,
			profile: dynamicProfile,
			personality: {
				traits,
				communicationStyle,
				interests,
				background,
				typingPatterns,
				commonPhrases,
				emojiUsage,
			},
			gameSettings: {
				// Include gameSettings
				enabled: true, // Assuming dynamically created personas are enabled for games
				autoInvite: true, // Assuming dynamically created personas are auto-invited
				strategy: combinedGameStrategy,
			},
			chatSettings: {
				// Include chatSettings
				enabled: true, // Assuming dynamically created personas are enabled for chat
				autoInvite: true, // Assuming dynamically created personas are auto-invited
			},
		}

		// Store the dynamic persona - already stored in the getOrCreate call
		// this.personas.set(id, dynamicPersona) // Stored by caller

		return dynamicPersona
	}

	/**
	 * Initialize AI personality traits for a new AI player
	 * @param id The AI player's ID
	 * @param persona The AI persona
	 */
	private initializeAITraits(id: string, persona: AIPersona): void {
		// Set typing speed based on persona's typing patterns
		let baseTypingSpeed = 100 // Default ms per character (reduced from 120 for faster typing)

		// Apply more nuanced typing speed patterns
		const personality = persona.personality as
			| { typingPatterns?: string; traits?: string[] }
			| undefined
		if (personality?.typingPatterns) {
			const patterns = String(personality.typingPatterns).toLowerCase()

			if (patterns.includes("fast")) {
				baseTypingSpeed = 60 + Math.random() * 20 // 60-80ms per character (faster)
			} else if (patterns.includes("slow")) {
				baseTypingSpeed = 130 + Math.random() * 40 // 130-170ms per character (faster)
			} else if (patterns.includes("moderate")) {
				baseTypingSpeed = 80 + Math.random() * 30 // 80-110ms per character (faster)
			} else if (patterns.includes("erratic")) {
				// Erratic typers have a wider range of base speeds
				baseTypingSpeed = 70 + Math.random() * 70 // 70-140ms per character (faster)
			} else if (patterns.includes("careful")) {
				baseTypingSpeed = 110 + Math.random() * 30 // 110-140ms per character (faster)
			}

			// Apply additional factors based on other personality traits
			const traits = personality?.traits as string[] | undefined
			if (traits) {
				if (traits.includes("meticulous") || traits.includes("perfectionist")) {
					baseTypingSpeed *= 1.05 // 5% slower for careful typing (reduced from 10%)
				}

				if (traits.includes("impulsive") || traits.includes("energetic")) {
					baseTypingSpeed *= 0.85 // 15% faster for impulsive typing (increased from 10%)
				}
			}
		}

		// Add some natural variation to typing speed during initialization
		const typingSpeed = baseTypingSpeed * (0.9 + Math.random() * 0.2) // 90-110% variation
		this.aiTypingSpeeds.set(id, typingSpeed)

		// Set response rate based on personality traits
		let baseResponseRate = 0.8 // Default 80% chance to respond (increased from 70%)
		const traits = personality?.traits as string[] | undefined

		if (traits) {
			if (
				traits.includes("social") ||
				traits.includes("outgoing") ||
				traits.includes("enthusiastic")
			) {
				baseResponseRate = 0.95 // Increased from 0.9 to 0.95
			} else if (
				traits.includes("reserved") ||
				traits.includes("introverted") ||
				traits.includes("analytical")
			) {
				baseResponseRate = 0.65 // Increased from 0.5 to 0.65
			}
		}

		// Add some randomness to response rate
		const responseRate = baseResponseRate * (0.9 + Math.random() * 0.2) // 90-110% variation
		this.aiResponseRates.set(id, responseRate)

		// Set activity level based on personality
		let baseActivityLevel = 0.8 // Default activity level (increased from 0.7)

		if (traits) {
			if (
				traits.includes("energetic") ||
				traits.includes("enthusiastic") ||
				traits.includes("social")
			) {
				baseActivityLevel = 0.95 // Increased from 0.9 to 0.95
			} else if (
				traits.includes("reserved") ||
				traits.includes("introverted") ||
				traits.includes("analytical")
			) {
				baseActivityLevel = 0.65 // Increased from 0.5 to 0.65
			}
		}

		// Add some randomness to activity level
		const activityLevel = baseActivityLevel * (0.9 + Math.random() * 0.2) // 90-110% variation
		this.aiActivityLevels.set(id, activityLevel)
	}

	/**
	 * Get or create a persona for an AI player
	 * @param name The AI player's name
	 * @param id The AI player's ID
	 * @returns The AI persona
	 */
	public async getOrCreatePersona(
		name: string,
		id: string,
	): Promise<AIPersona> {
		// Check if we already have a persona for this AI
		if (this.personas.has(id)) {
			return this.personas.get(id)!
		}

		// Try to find a matching predefined persona by name
		const predefinedPersona = getPersonaByName(name)

		if (predefinedPersona) {
			// Use the predefined persona
			const persona: AIPersona = {
				name: predefinedPersona.name,
				id,
				profile: predefinedPersona.profile,
				personality: predefinedPersona.personality,
				gameSettings: predefinedPersona.gameSettings, // Include gameSettings
				chatSettings: predefinedPersona.chatSettings, // Include chatSettings
			}

			this.personas.set(id, persona)
			this.initializeAITraits(id, persona)
			return persona
		}

		// If no predefined persona, create a dynamic one
		const dynamicPersona = this.createDynamicPersona(name, id)
		this.personas.set(id, dynamicPersona)
		this.initializeAITraits(id, dynamicPersona)
		return dynamicPersona
	}

	/**
	 * Get a persona by AI player ID
	 * @param aiId The AI player's ID
	 * @returns The AI persona or undefined if not found
	 */
	public getPersona(aiId: string): AIPersona | undefined {
		return this.personas.get(aiId)
	}

	/**
	 * Update a persona's data
	 * @param aiId The AI player's ID
	 * @param personaData The partial persona data to update
	 * @returns The updated AI persona
	 */
	public async updatePersona(
		aiId: string,
		personaData: Partial<AIPersona>,
	): Promise<AIPersona> {
		const persona = this.personas.get(aiId)
		if (!persona) {
			throw new Error(`Persona with id ${aiId} not found`)
		}
		// Merge the existing persona data with the new data
		const updatedPersona = { ...persona, ...personaData }
		this.personas.set(aiId, updatedPersona)
		return updatedPersona
	}

	/**
	 * Get the typing speed for an AI player
	 * @param aiId The AI player's ID
	 * @returns The typing speed in ms per character or undefined if not found
	 */
	public getTypingSpeed(aiId: string): number | undefined {
		return this.aiTypingSpeeds.get(aiId)
	}

	/**
	 * Get the response rate for an AI player
	 * @param aiId The AI player's ID
	 * @returns The response rate (0-1) or undefined if not found
	 */
	public getResponseRate(aiId: string): number | undefined {
		return this.aiResponseRates.get(aiId)
	}

	/**
	 * Get the activity level for an AI player
	 * @param aiId The AI player's ID
	 * @returns The activity level (0-1) or undefined if not found
	 */
	public getActivityLevel(aiId: string): number | undefined {
		return this.aiActivityLevels.get(aiId)
	}

	/**
	 * Set custom template for a persona
	 */
	public setPersonaTemplate(
		personaName: string,
		templateType: "game" | "chat" | "starter",
		templatePath: string,
	): void {
		const persona = getPersonaByName(personaName)
		if (persona) {
			// Initialize templates object if it doesn't exist
			if (!persona.templates) {
				;(persona as { templates?: Record<string, string> }).templates = {}
			}
			// Set the template path
			;(persona.templates as Record<string, string>)[templateType] =
				templatePath
			console.log(
				`Set ${templateType} template for ${personaName}: ${templatePath}`,
			)
		} else {
			console.warn(`Persona ${personaName} not found`)
		}
	}

	/**
	 * Get persona template path for a specific type
	 */
	public getPersonaTemplate(
		personaName: string,
		templateType: "game" | "chat" | "starter",
	): string | undefined {
		const persona = getPersonaByName(personaName)
		const templates = persona?.templates as
			| { [key: string]: string }
			| undefined
		return templates?.[templateType]
	}
}

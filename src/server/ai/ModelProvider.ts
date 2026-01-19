import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

import {
	DEFAULT_MODEL_FALLBACK,
	ModelType,
	ProviderType,
	SUPPORTED_MODELS,
} from "@/server/ai/models"
import { getContextualResponse } from "@/server/ai/predefinedMessages"

const DEFAULT_TEMPERATURE = 0.85
const DEFAULT_MAX_TOKENS = 200

export class ModelProvider {
	private static instance: ModelProvider
	private openaiClient?: OpenAI
	private anthropicClient?: Anthropic
	private modelType: ModelType = "gpt-4.1-nano"
	private providerType: ProviderType = "openai"

	private constructor() {
		const modelArg = this.getModelFromArgs()
		const envModel = process.env.DEFAULT_MODEL as ModelType | undefined

		this.modelType = modelArg || envModel || DEFAULT_MODEL_FALLBACK
		this.providerType = this.getProviderForModel(this.modelType)

		console.log(
			`ModelProvider initialized with model: ${this.modelType} (provider: ${this.providerType})`,
		)

		this.initializeClients()
	}

	private initializeClients(): void {
		this.openaiClient = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})

		this.anthropicClient = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY || "",
		})
	}

	public getModelType(): ModelType {
		return this.modelType
	}

	public getProviderType(): ProviderType {
		return this.providerType
	}

	public getModelInfo(): { model: ModelType; provider: ProviderType } {
		return {
			model: this.modelType,
			provider: this.providerType,
		}
	}

	public setModelType(model: ModelType): void {
		this.modelType = model
		this.providerType = this.getProviderForModel(model)
	}

	private getProviderForModel(model: ModelType): ProviderType {
		if (model === "none") {
			return "none"
		}

		if (model.startsWith("claude")) {
			return "anthropic"
		}

		return "openai"
	}

	private getModelFromArgs(): ModelType | null {
		const args = process.argv
		const modelIndex = args.indexOf("--model")

		if (modelIndex !== -1 && modelIndex < args.length - 1) {
			const modelValue = args[modelIndex + 1]
			if (SUPPORTED_MODELS.includes(modelValue)) {
				return modelValue as ModelType
			}
			console.error(
				`ERROR: Unknown model type from args: ${modelValue}. Supported models: ${SUPPORTED_MODELS.join(
					", ",
				)}`,
			)
		}
		return null
	}

	public static getInstance(): ModelProvider {
		if (!ModelProvider.instance) {
			ModelProvider.instance = new ModelProvider()
		}
		return ModelProvider.instance
	}

	public async generateCompletion(
		prompt: string,
		settings?: {
			model?: string
			temperature?: number
			maxTokens?: number
			webSearch?: boolean
		},
	): Promise<string> {
		const modelToUse = settings?.model || this.modelType
		const temperature = settings?.temperature ?? DEFAULT_TEMPERATURE
		const maxTokens = settings?.maxTokens ?? DEFAULT_MAX_TOKENS

		if (this.modelType === "none") {
			let persona = "default"
			if (temperature > 0.8) {
				persona = "social"
			} else if (temperature < 0.4) {
				persona = "intellectual"
			}
			return getContextualResponse(prompt, persona)
		}

		try {
			const response = await this.create({
				messages: [{ role: "user", content: prompt }],
				model: modelToUse,
				temperature,
				maxTokens,
				webSearch: settings?.webSearch,
			})
			return response || "I'm not sure how to respond to that."
		} catch (error) {
			console.error(`Error generating completion:`, error)
			return getContextualResponse(prompt)
		}
	}

	private create = async (settings?: {
		messages?: Array<ChatMessages>
		systemPrompt?: string
		model?: ModelType
		temperature?: number
		maxTokens?: number
		webSearch?: boolean
	}) => {
		const modelToUse = settings?.model || this.modelType
		const providerType = this.getProviderForModel(modelToUse)
		const temperature = settings?.temperature ?? DEFAULT_TEMPERATURE
		const maxTokens = settings?.maxTokens ?? DEFAULT_MAX_TOKENS
		const systemPrompt = settings?.systemPrompt || ""
		const isWebSearchEnabled =
			(settings?.webSearch && isWebSearchEnabledForModel(modelToUse)) ?? false

		if (providerType === "anthropic" && this.anthropicClient) {
			const anthropicMessages = toAnthropicMessages(settings?.messages || [])
			return await this.anthropicClient.messages
				.create({
					model: modelToUse,
					max_tokens: maxTokens,
					temperature,
					system: systemPrompt,
					messages: anthropicMessages,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				tools: isWebSearchEnabled
						? ([
								{
									type: "web_search_20250305",
									name: "web_search",
									max_uses: 5,
								},
							] as any)
						: undefined,
				})
				.then(response =>
					response.content
						.map(block => (block.type === "text" ? block.text : ""))
						.join(""),
				)
		} else if (providerType === "openai" && this.openaiClient) {
			const openaiMessages = systemPrompt
				? [
						{ role: "system" as const, content: systemPrompt },
						...toOpenAIMessages(settings?.messages || []),
					]
				: toOpenAIMessages(settings?.messages || [])
			return await this.openaiClient.chat.completions
				.create({
					model: modelToUse,
					messages: openaiMessages,
					temperature,
					max_tokens: maxTokens,
					store: true,
					n: 1,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					tools: isWebSearchEnabled
						? ([{ type: "web_search_preview" }] as any)
						: undefined,
				})
				.then(response => response.choices[0]?.message?.content)
		} else {
			throw new Error(`No client available for provider: ${providerType}`)
		}
	}
}

type ChatMessages = {
	role: "user" | "assistant" | "system"
	name?: string
	content: string
}

function isWebSearchEnabledForModel(model: ModelType): boolean {
	// Claude 4.5 family supports web search
	if (model.startsWith("claude-opus-4-5") || model.startsWith("claude-sonnet-4-5") || model.startsWith("claude-haiku-4-5")) {
		return true
	}
	// Claude 4.x legacy supports web search
	if (model.startsWith("claude-opus-4") || model.startsWith("claude-sonnet-4")) {
		return true
	}
	// Claude 3.7 Sonnet supports web search
	if (model.startsWith("claude-3-7-sonnet")) {
		return true
	}
	// GPT-4.1 supports web search
	if (model === "gpt-4.1") {
		return true
	}
	return false
}

function toAnthropicMessages(
	messages: Array<ChatMessages>,
): Anthropic.MessageParam[] {
	return messages.map(message => ({
		role: message.role === "system" ? "user" : message.role,
		content:
			message.role === "system"
				? "[System] " + message.content
				: message.content,
	}))
}

function toOpenAIMessages(
	messages: Array<ChatMessages>,
): OpenAI.Chat.ChatCompletionMessageParam[] {
	return messages.map(message => ({
		role: message.role,
		content: message.content,
		name: message.name,
	}))
}

export async function getAnthropicModels(): Promise<string[]> {
	const apiKey = process.env.ANTHROPIC_API_KEY || ""
	if (!apiKey) {
		console.warn("No Anthropic API key set")
		return []
	}
	const client = new Anthropic({ apiKey })
	try {
		const response = await client.models.list()
		if (Array.isArray(response.data)) {
			return response.data.map(model => model.id)
		}
		return []
	} catch (err) {
		console.error("Error fetching Anthropic models:", err)
		return []
	}
}

export async function getOpenAIModels(): Promise<string[]> {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		console.warn("No OpenAI API key set")
		return []
	}
	const client = new OpenAI({ apiKey })
	try {
		const response = await client.models.list()
		if (Array.isArray(response.data)) {
			return response.data.map(model => model.id)
		}
		return []
	} catch (err) {
		console.error("Error fetching OpenAI models:", err)
		return []
	}
}

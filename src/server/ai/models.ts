/**
 * Supported Claude models
 */
export const SUPPORTED_CLAUDE_MODELS = [
	"claude-sonnet-4-20250514",
	"claude-opus-4-20250514",
	"claude-3-7-sonnet-latest",
	"claude-3-5-sonnet-latest",
	"claude-3-5-haiku-latest",
	"claude-3-5-haiku-20241022",
	"claude-3-5-opus-latest",
]

/**
 * Supported OpenAI models
 */
export const SUPPORTED_OPENAI_MODELS = [
	"gpt-4-turbo",
	"gpt-4o",
	"gpt-4o-mini",
	"gpt-4",
	"gpt-4.1",
	"gpt-4.1-nano",
	"gpt-4.1-mini",
	"o1",
	"o1-pro",
	"o3-mini",
	"o4-mini",
	"chatgpt-4o-latest",
]

/**
 * Default model to use if no model is specified in either args or env file.
 */
export const DEFAULT_MODEL_FALLBACK = "gpt-4.1-nano"

/**
 * All supported models, including "none" for debugging.
 */
export const SUPPORTED_MODELS = [
	...SUPPORTED_CLAUDE_MODELS,
	...SUPPORTED_OPENAI_MODELS,
	"none",
]

/**
 * Supported model types
 */
export type ModelType = (typeof SUPPORTED_MODELS)[number]

// Provider type
export type ProviderType = "openai" | "anthropic" | "none"

/**
 * Supported Claude models (Anthropic)
 * Updated January 2026 with latest model IDs from platform.claude.com
 *
 * Current models (4.5 family):
 * - claude-opus-4-5: Premium model with maximum intelligence
 * - claude-sonnet-4-5: Best balance of intelligence, speed, cost (recommended)
 * - claude-haiku-4-5: Fastest model with near-frontier intelligence
 *
 * Legacy models (still available):
 * - claude-opus-4-1, claude-opus-4-0: Previous Opus versions
 * - claude-sonnet-4-0: Previous Sonnet version
 * - claude-3-7-sonnet: Claude 3.7 Sonnet
 * - claude-3-haiku: Fast, affordable model
 */
export const SUPPORTED_CLAUDE_MODELS = [
	// Claude 4.5 family (current)
	"claude-opus-4-5-20251101",
	"claude-opus-4-5", // alias
	"claude-sonnet-4-5-20250929",
	"claude-sonnet-4-5", // alias
	"claude-haiku-4-5-20251001",
	"claude-haiku-4-5", // alias
	// Claude 4.x legacy
	"claude-opus-4-1-20250805",
	"claude-opus-4-1", // alias
	"claude-sonnet-4-20250514",
	"claude-sonnet-4-0", // alias
	"claude-opus-4-20250514",
	"claude-opus-4-0", // alias
	// Claude 3.x legacy
	"claude-3-7-sonnet-20250219",
	"claude-3-7-sonnet-latest", // alias
	"claude-3-haiku-20240307",
]

/**
 * Supported OpenAI models
 * Updated January 2026 with latest model IDs from platform.openai.com
 *
 * GPT-5.2 family (latest):
 * - gpt-5.2: Best general-purpose model
 * - gpt-5.2-pro: More compute for harder problems
 * - gpt-5.2-codex: Optimized for agentic coding
 *
 * GPT-5 family:
 * - gpt-5, gpt-5-mini, gpt-5-nano: Previous flagship models
 *
 * GPT-4.1 family:
 * - gpt-4.1: Best instruction following, 1M context window
 * - gpt-4.1-mini, gpt-4.1-nano: Smaller, faster versions
 *
 * Reasoning models (o-series):
 * - o4-mini: Latest small reasoning model, 100K max output
 * - o3, o3-mini, o3-pro: Previous reasoning models
 * - o1, o1-pro, o1-mini: Original reasoning models
 *
 * GPT-4o family:
 * - gpt-4o, gpt-4o-mini: Multimodal models
 */
export const SUPPORTED_OPENAI_MODELS = [
	// GPT-5.2 family (latest)
	"gpt-5.2",
	"gpt-5.2-pro",
	"gpt-5.2-codex",
	"gpt-5.2-2025-12-11",
	// GPT-5 family
	"gpt-5",
	"gpt-5-mini",
	"gpt-5-nano",
	// GPT-4.1 family
	"gpt-4.1",
	"gpt-4.1-mini",
	"gpt-4.1-nano",
	// Reasoning models (o-series)
	"o4-mini",
	"o3",
	"o3-mini",
	"o3-pro",
	"o1",
	"o1-pro",
	"o1-mini",
	// GPT-4o family
	"gpt-4o",
	"gpt-4o-mini",
	"chatgpt-4o-latest",
	// Legacy GPT-4
	"gpt-4-turbo",
	"gpt-4",
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

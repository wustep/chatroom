/**
 * Configuration constants
 */

// Room settings
export const DEFAULT_ROOM = "chat_general"
export const MAX_AI_PLAYERS_IN_CHAT = 10
export const MAX_CHAT_ROOM_TOTAL_PLAYERS = 25
export const MAX_HISTORY_MESSAGES = 15
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000
export const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000 // Check room activity every 60 seconds
export const LOG_STATS_INTERVAL_MS = 2 * 60 * 1000 // Log room stats every 2 minutes

// AI chat settings
export const AI_CHAT_PROBABILITY = 0.85
export const MIN_AI_CHAT_INTERVAL = 5_000
export const MAX_AI_RESPONSES_PER_CHAIN = 6

// Ambient chat settings
export const AI_AMBIENT_CHAT_MIN_INTERVAL = 2 * 60 * 1000
export const AI_AMBIENT_CHAT_MAX_INTERVAL = 5 * 60 * 1000
export const AI_AMBIENT_CHAT_PROBABILITY = 0.5

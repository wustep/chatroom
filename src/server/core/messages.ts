/**
 * Message handling functionality
 */
import * as config from "@/server/config/config"
import { getRoom } from "@/server/core/rooms"
import { ChatMessage } from "@/server/types"

/**
 * Add a message to the room history and trim if needed
 */
export function addMessageToRoomHistory(
	roomId: string,
	message: ChatMessage,
): void {
	const room = getRoom(roomId)
	room.messages.push(message) // Keep full history; context will be sliced when needed

	// If we exceed the maximum history size, truncate
	if (room.messages.length > config.MAX_HISTORY_MESSAGES) {
		room.messages = room.messages.slice(-config.MAX_HISTORY_MESSAGES)
	}
}

/**
 * Get the last N messages from the room for context
 */
export function getRecentMessages(
	roomId: string,
	limit: number = config.MAX_HISTORY_MESSAGES,
): ChatMessage[] {
	const room = getRoom(roomId)
	return room.messages.slice(-limit)
}

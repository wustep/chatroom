/**
 * Room management functionality
 */
import * as config from "@/server/config/config"
import { getSocketIo, rooms } from "@/server/core/state"
import { ChatMessage, Room } from "@/server/types"
import { debugLog } from "@/server/utils/logger"

/**
 * Get or create a room by ID
 */
export function getRoom(roomId: string): Room {
	if (!rooms.has(roomId)) {
		rooms.set(roomId, {
			players: new Map(),
			messages: [],
			lastHumanActivity: Date.now(), // Initialize on creation
		})

		// Room creation callbacks will be handled separately to avoid circular dependencies
	}
	return rooms.get(roomId)!
}

/**
 * Initialize a new room with AI players
 */
export function initializeRoom(
	roomId: string,
	addAiPlayerFn: (roomId: string) => void,
): void {
	// Just use getRoom to ensure the room exists
	getRoom(roomId)

	// Immediately populate with 3-5 AI players when a room is created
	const initialAiCount = Math.floor(Math.random() * 3) + 3 // 3-5 AI players
	for (let i = 0; i < initialAiCount; i++) {
		addAiPlayerFn(roomId)
	}

	// Schedule system prompts for the new room
	scheduleSystemPrompts(roomId)
}

/**
 * Terminate a room and notify all clients
 */
export function terminateRoom(
	roomId: string | undefined,
	reason: string,
): void {
	if (!roomId) {
		debugLog("TERMINATE_ROOM_FAIL", `Room id is undefined for termination.`)
		return
	}

	const room = rooms.get(roomId)
	if (!room) {
		debugLog("TERMINATE_ROOM_FAIL", `Room ${roomId} not found for termination.`)
		return
	}

	debugLog("TERMINATE_ROOM", `Terminating room ${roomId} due to: ${reason}`)

	const io = getSocketIo()
	if (!io) {
		console.error("Socket.IO not initialized")
		return
	}

	// Notify players in the room
	io.to(roomId).emit("newMessage", {
		id: Date.now(),
		sender: "System",
		senderId: "system",
		text: `Chat is closing due to: ${reason}.`,
		timestamp: Date.now(),
	})

	// Send a specific roomClosed event to all clients in the room
	console.log(
		`Sending roomClosed event to all clients in room ${roomId} with reason: ${reason}`,
	)
	io.to(roomId).emit("roomClosed", { reason, roomId })

	// Clean up sockets
	rooms.forEach((roomItem, id) => {
		if (id === roomId) {
			for (const player of roomItem.players.values()) {
				if (!player.isAI) {
					const playerSocket = io.sockets.sockets.get(player.id)
					if (playerSocket) {
						debugLog(
							"TERMINATE_ROOM",
							`Disconnecting player ${player.name} (${player.id}) from room ${roomId}`,
						)
						playerSocket.disconnect(true)
					}
				}
			}
		}
	})

	// Delete the room from the server after a short delay to allow messages/disconnects to send
	setTimeout(() => {
		rooms.delete(roomId)
		debugLog(
			"TERMINATE_ROOM",
			`Room ${roomId} terminated and removed. Rooms left: ${rooms.size}`,
		)
	}, 500) // 500ms delay

	// Clear timers if room is being deleted
	if (room.promptTimers) {
		room.promptTimers.forEach(t => clearTimeout(t))
	}
}

/**
 * Check for inactive rooms and terminate them if needed
 */
export function checkRoomInactivity(): void {
	const now = Date.now()
	debugLog("INACTIVITY_CHECK", `Checking ${rooms.size} rooms for inactivity...`)

	rooms.forEach((room, roomId) => {
		// Skip inactivity checks for playground rooms and main chat rooms
		if (
			isPlaygroundRoom(roomId) ||
			["chat_gaming", "chat_general", "chat_music", "chat_philosophy"].includes(
				roomId,
			)
		) {
			return // Go to the next room
		}

		// Check if the room has any human players
		const hasHumans = Array.from(room.players.values()).some(p => !p.isAI)

		// Debug the room activity status
		if (room.lastHumanActivity) {
			const inactiveTime = now - room.lastHumanActivity
			debugLog(
				"ROOM_ACTIVITY",
				`Room ${roomId}: Last activity ${inactiveTime}ms ago, timeout is ${config.INACTIVITY_TIMEOUT_MS}ms, has humans: ${hasHumans}`,
			)
		}

		// Only terminate rooms that have had human players but are now inactive
		if (
			room.lastHumanActivity &&
			now - room.lastHumanActivity > config.INACTIVITY_TIMEOUT_MS
		) {
			// If the room still has humans, it means they haven't acted in time
			if (hasHumans) {
				console.log(
					`Terminating room ${roomId} due to human inactivity after ${
						now - room.lastHumanActivity
					}ms`,
				)
				terminateRoom(roomId, "Inactivity")
			} else {
				// If no humans are left, but the room persists (only AI), clean it up after timeout
				console.log(
					`Terminating room ${roomId} with no humans after ${
						now - room.lastHumanActivity
					}ms of inactivity`,
				)
				terminateRoom(roomId, "No human players remaining")
			}
		}
	})
}

/**
 * Schedule system prompts for a room (no-op for chat rooms)
 */
export function scheduleSystemPrompts(_roomId: string): void {
	// No system prompts for chat rooms
}

/**
 * Send a system prompt message to a room
 */
export function sendSystemPrompt(roomId: string, text: string): void {
	const io = getSocketIo()
	if (!io) {
		console.error("Socket.IO not initialized")
		return
	}

	const message: ChatMessage & { type?: "system" } = {
		id: Date.now(),
		sender: "System",
		senderId: "system",
		text,
		type: "system",
		timestamp: Date.now(),
	}

	// Add to room history
	const room = getRoom(roomId)
	room.messages.push(message)

	// Send to all clients in the room
	io.to(roomId).emit("newMessage", message)
}

export function isGameRoom(roomId: string): boolean {
	return roomId.startsWith("game_") || roomId.startsWith("playground_game_")
}

export function isPlaygroundRoom(roomId: string): boolean {
	return roomId.startsWith("playground_")
}

export function isChatRoom(roomId: string): boolean {
	return roomId.startsWith("chat_") || roomId.startsWith("playground_chat_")
}

export function getRoomMode(roomId: string): "game" | "chat" {
	if (isGameRoom(roomId)) {
		return "game"
	} else if (isChatRoom(roomId)) {
		return "chat"
	}
	return "chat"
}

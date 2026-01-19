/**
 * Socket room-related handlers
 */
import { Server, Socket } from "socket.io"

import * as config from "@/server/config/config"
import {
	addAiPlayerToRoom,
	addRealPlayerToRoom,
	playerToPublic,
} from "@/server/core/players"
import { getRoom, initializeRoom } from "@/server/core/rooms"
import { rooms } from "@/server/core/state"
import { debugLog } from "@/server/utils/logger"
import { ClientEvents, ServerEvents } from "@/shared/events"

/**
 * Set up room-related socket handlers
 */
export function setupRoomHandlers(io: Server, socket: Socket): void {
	// Handle joining a standard room
	socket.on(
		ClientEvents.JOIN_ROOM,
		(data: { roomId?: string; username?: string }) => {
			debugLog("JOIN_ROOM", `[${socket.id}] Joining room`, data)
			try {
				const { roomId } = data
				// Use provided roomId or fallback to DEFAULT_ROOM
				const resolvedRoomId = roomId || config.DEFAULT_ROOM

				// Check if room exists before getting/creating it
				const isNewRoom = !rooms.has(resolvedRoomId)

				const room = getRoom(resolvedRoomId)
				room.lastHumanActivity = Date.now()
				const player = addRealPlayerToRoom(
					socket,
					resolvedRoomId,
					data.username,
				)

				if (!player) {
					socket.emit(ServerEvents.ERROR, {
						message: "Failed to join room",
						details: "Username already taken or other conflict",
					})
					return
				}

				debugLog(
					"PLAYER_ADDED",
					`Added player ${player.name} (${player.id}) to room ${resolvedRoomId}`,
				)

				// Initialize room with AI players if it's newly created
				if (isNewRoom) {
					debugLog(
						"INIT_ROOM",
						`Initializing new room ${resolvedRoomId} with AI players`,
					)
					initializeRoom(resolvedRoomId, addAiPlayerToRoom)
				}

				socket.join(resolvedRoomId)
				// Get the potentially updated player list AFTER initializing AI
				const playerDTOs = Array.from(room.players.values()).map(p =>
					playerToPublic(p, resolvedRoomId),
				)

				socket.emit(ServerEvents.JOINED_ROOM, {
					userId: player.id,
					username: player.name,
					players: playerDTOs,
					roomId: resolvedRoomId,
					history: room.messages,
				})

				// Notify other clients in the room about the new player
				socket.to(resolvedRoomId).emit(ServerEvents.PLAYER_JOINED, {
					...playerToPublic(player, resolvedRoomId),
					roomId: resolvedRoomId, // Include roomId in the event for multi-channel support
				})

				// Update player list for all clients
				io.to(resolvedRoomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
					players: playerDTOs,
					roomId: resolvedRoomId, // Include roomId for multi-channel support
				})
			} catch (error) {
				console.error("Error joining room:", error)
				socket.emit(ServerEvents.ERROR, {
					message: "Failed to join room",
					details: error instanceof Error ? error.message : "Unknown error",
				})
			}
		},
	)
}

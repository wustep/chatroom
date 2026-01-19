/**
 * Socket channel subscription handlers
 * Implements multi-channel support for clients to subscribe to multiple chat channels
 */
import { Server, Socket } from "socket.io"

import { getPersonaByName } from "@/lib/personas"
import {
	addAiPlayerToRoom,
	addRealPlayerToRoom,
	playerToPublic,
} from "@/server/core/players"
import {
	getDMParticipants,
	getRoom,
	initializeRoom,
	isDMRoom,
} from "@/server/core/rooms"
import { activeUsernames, rooms } from "@/server/core/state"
import type { ChatMessage, Player, PublicPlayer } from "@/server/types"
import { debugLog } from "@/server/utils/logger"
import { ServerEvents } from "@/shared/events"
// Consolidated import for Player and PublicPlayer

// Define the payload for JOINED_ROOM
interface JoinedRoomServerPayload {
	userId: string
	username: string
	players: PublicPlayer[]
	roomId: string
	history: ChatMessage[]
	isReconnection?: boolean
	isDebounced?: boolean
}

// Our new custom events
const ClientSocketEvents = {
	SUBSCRIBE_TO_CHANNEL: "subscribe_to_channel",
	UNSUBSCRIBE_FROM_CHANNEL: "unsubscribe_from_channel",
}

// Keep track of recent subscriptions to prevent rapid cycles
// Map of socketId -> channelId -> timestamp
const recentSubscriptions = new Map<string, Map<string, number>>()

// How long to wait before allowing resubscription to the same channel (in ms)
const SUBSCRIPTION_DEBOUNCE_TIME = 2000

/**
 * Set up channel subscription handlers for multi-channel support
 */
export function setupChannelHandlers(io: Server, socket: Socket): void {
	// Handle subscription to a channel
	socket.on(
		ClientSocketEvents.SUBSCRIBE_TO_CHANNEL,
		(data: { roomId: string; username?: string }) => {
			debugLog(
				"SUBSCRIBE_TO_CHANNEL",
				`[${socket.id}] Subscribing to channel`,
				data,
			)
			try {
				const { roomId } = data
				if (!roomId) {
					socket.emit(ServerEvents.ERROR, {
						message: "Missing roomId",
						details: "A roomId is required to subscribe to a channel",
					})
					return
				}

				// Check for subscription debounce to prevent rapid resubscription loops
				const now = Date.now()
				let socketSubscriptions = recentSubscriptions.get(socket.id)
				if (!socketSubscriptions) {
					socketSubscriptions = new Map<string, number>()
					recentSubscriptions.set(socket.id, socketSubscriptions)
				}

				const lastSubscriptionTime = socketSubscriptions.get(roomId) || 0
				const timeSinceLastSubscription = now - lastSubscriptionTime

				if (timeSinceLastSubscription < SUBSCRIPTION_DEBOUNCE_TIME) {
					debugLog(
						"SUBSCRIPTION_DEBOUNCED",
						`Debouncing subscription from ${socket.id} to ${roomId}, last subscription was ${timeSinceLastSubscription}ms ago`,
					)

					// Still confirm the subscription to avoid client retries, but don't actually process it
					const room = rooms.get(roomId)
					if (room) {
						const player = room.players.get(socket.id) as Player | undefined
						if (player) {
							const playerDTOs = Array.from(room.players.values()).map(p =>
								playerToPublic(p as Player, roomId),
							)
							const joinedRoomPayload: JoinedRoomServerPayload = {
								userId: player.id,
								username: player.name,
								players: playerDTOs,
								roomId: roomId,
								history: room.messages, // Explicitly type history, assuming room.messages is ChatMessage[]
								isReconnection: true,
								isDebounced: true,
							}
							socket.emit(ServerEvents.JOINED_ROOM, joinedRoomPayload)
						}
					}
					return
				}

				// Update subscription timestamp
				socketSubscriptions.set(roomId, now)

				// Detect if this is a brand-new room (no entry in rooms map yet)
				const isNewRoom = !rooms.has(roomId)
				// Get or create the room
				const room = getRoom(roomId)

				// If the room was just created, populate it with some AI players
				if (isNewRoom) {
					// For DM rooms, check if one of the participants is an AI persona
					if (isDMRoom(roomId)) {
						const participants = getDMParticipants(roomId)
						for (const participantName of participants) {
							// Check if this participant is a known AI persona
							const persona = getPersonaByName(participantName)
							if (persona) {
								debugLog(
									"DM_ADD_AI",
									`Adding AI persona ${participantName} to DM room ${roomId}`,
								)
								addAiPlayerToRoom(roomId, participantName)
							}
						}
					} else {
						// Regular room - use normal initialization
						initializeRoom(roomId, addAiPlayerToRoom)
					}
				}

				room.lastHumanActivity = Date.now()

				// Check if player is already in the room - this prevents re-subscription loops
				const existingPlayerInRoomData = room.players.get(socket.id) as
					| Player
					| undefined
				const playerAlreadyInRoom = !!existingPlayerInRoomData

				// If both player is in the room data structure AND socket is in the room, we can skip
				const isInSocketIORoom = socket.rooms.has(roomId)

				// If both player is in the room data structure AND socket is in the room, we can skip
				if (playerAlreadyInRoom && isInSocketIORoom) {
					debugLog(
						"ALREADY_SUBSCRIBED",
						`Player ${socket.id} already subscribed to channel ${roomId}, skipping`,
					)

					// Store the updated persona
					if (existingPlayerInRoomData) {
						const playerDTOs = Array.from(room.players.values()).map(p =>
							playerToPublic(p as Player, roomId),
						)

						const joinedRoomPayload: JoinedRoomServerPayload = {
							userId: existingPlayerInRoomData.id,
							username: existingPlayerInRoomData.name,
							players: playerDTOs,
							roomId: roomId,
							history: room.messages || [],
							isReconnection: true,
							isDebounced: true,
						}
						socket.emit(ServerEvents.JOINED_ROOM, joinedRoomPayload)
					}
					return
				}

				// Check if the username is already taken server-wide (case-insensitive)
				const requestedUsername = data.username?.trim()
				const lowerCaseRequestedUsername = requestedUsername?.toLowerCase()

				if (
					lowerCaseRequestedUsername &&
					activeUsernames.has(lowerCaseRequestedUsername)
				) {
					let isSelf = false
					// Check if the current socket is already associated with this username globally
					// by looking through all rooms to see if this socket.id is a player with that name.
					for (const roomEntry of rooms.values()) {
						const playerInOtherRoom = roomEntry.players.get(socket.id) as
							| Player
							| undefined
						if (
							playerInOtherRoom &&
							playerInOtherRoom.name.toLowerCase() ===
								lowerCaseRequestedUsername
						) {
							isSelf = true
							debugLog(
								"USERNAME_CHECK_SELF",
								`User ${socket.id} with name ${requestedUsername} is trying to join a new room. Allowed.`,
							)
							break
						}
					}

					if (!isSelf) {
						// If the name is globally taken, and it's not by this socket
						socket.emit(ServerEvents.ERROR, {
							message: "Username already taken",
							details: `The username "${requestedUsername}" is already in use on the server. Please choose a different username.`,
						})
						debugLog(
							"USERNAME_TAKEN_GLOBAL",
							`Username "${requestedUsername}" requested by ${socket.id} for room ${roomId} is already taken globally by another user.`,
						)
						return // Prevent joining
					}
					// If isSelf is true, the global check is bypassed for this socket. Proceed to room-specific logic.
				}

				// Add player to room (or get existing player if already in room)
				const player = addRealPlayerToRoom(
					socket,
					roomId,
					data.username,
				) as Player | null

				// Handle duplicate username error (this is now a room-specific check, but global check above is primary)
				if (!player) {
					socket.emit(ServerEvents.ERROR, {
						message: "Username already taken in room", // Or a more generic error if the global check failed it
						details: `The username "${data.username}" is already taken in this channel or globally. Please choose a different username.`,
					})
					return
				}

				// If successfully added to room and username was provided, add to global set
				if (player && player.name) {
					// player.name would be the successfully assigned name
					activeUsernames.add(player.name.toLowerCase())
					debugLog(
						"USERNAME_ADDED_GLOBAL",
						`Username "${player.name}" added to global set.`,
					)
				}

				debugLog(
					"PLAYER_SUBSCRIBED",
					`Player ${player.name} (${player.id}) subscribed to channel ${roomId}`,
				)

				// Join the Socket.IO room
				socket.join(roomId)

				// Get the current player list
				const playerDTOs = Array.from(room.players.values()).map(p =>
					playerToPublic(p as Player, roomId),
				)

				// Send join confirmation to the client
				const joinedRoomPayload: JoinedRoomServerPayload = {
					userId: player.id,
					username: player.name,
					players: playerDTOs,
					roomId: roomId,
					history: room.messages || [],
					isReconnection: false,
				}
				socket.emit(ServerEvents.JOINED_ROOM, joinedRoomPayload)

				// Only notify others if this is a new subscription
				if (!playerAlreadyInRoom) {
					// Notify other clients in the room
					socket.to(roomId).emit(ServerEvents.PLAYER_JOINED, {
						...playerToPublic(player as Player, roomId),
						roomId, // Include roomId in the event so client knows which channel this is for
					} as PublicPlayer & { roomId: string }) // Ensure type for emit

					// Update all clients with the new player list
					io.to(roomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
						players: playerDTOs,
						roomId, // Include roomId in the event
					})
				}
			} catch (error) {
				console.error("Error handling channel subscription:", error)
				socket.emit(ServerEvents.ERROR, {
					message: "Subscription error",
					details: (error as Error).message || "An unexpected error occurred",
				})
			}
		},
	)

	// Cleanup subscription tracking when socket disconnects
	socket.on("disconnect", () => {
		recentSubscriptions.delete(socket.id)
	})

	// Handle unsubscription from a channel
	socket.on(
		ClientSocketEvents.UNSUBSCRIBE_FROM_CHANNEL,
		(data: { roomId: string }) => {
			debugLog(
				"UNSUBSCRIBE_FROM_CHANNEL",
				`[${socket.id}] Unsubscribing from channel`,
				data,
			)
			try {
				const { roomId } = data
				if (!roomId) {
					socket.emit(ServerEvents.ERROR, {
						message: "Missing roomId",
						details: "A roomId is required to unsubscribe from a channel",
					})
					return
				}

				// Check if room exists
				const room = rooms.get(roomId)
				if (!room) {
					socket.emit(ServerEvents.ERROR, {
						message: "Unknown channel",
						details: `Channel ${roomId} does not exist`,
					})
					return
				}

				// Get player before removing from room
				const player = room.players.get(socket.id)
				if (!player) {
					// Player already not in room, silently succeed
					debugLog(
						"NOT_SUBSCRIBED",
						`Player ${socket.id} not subscribed to channel ${roomId}, silently succeed`,
					)
					return
				}

				// Remove player from room
				room.players.delete(socket.id)

				// Notify other clients in the room
				socket.to(roomId).emit(ServerEvents.PLAYER_LEFT, {
					...playerToPublic(player, roomId),
					roomId,
				})

				// Update all clients with the new player list
				io.to(roomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
					players: Array.from(room.players.values()).map(p =>
						playerToPublic(p, roomId),
					),
					roomId,
				})
			} catch (error) {
				console.error("Error handling channel unsubscription:", error)
				socket.emit(ServerEvents.ERROR, {
					message: "Unsubscription error",
					details: error instanceof Error ? error.message : String(error),
				})
			}
		},
	)
}

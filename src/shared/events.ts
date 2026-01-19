/**
 * Type definitions for Socket.IO events in Chatroom
 */
import { ChatMessage, PublicPlayer } from "@/server/types"

/**
 * Socket event name constants
 */

// Client -> Server events
export const ClientEvents = {
	// Connection events
	PING: "ping",
	DISCONNECT: "disconnect",

	// Room events
	JOIN_ROOM: "joinRoom",

	// Message events
	SEND_MESSAGE: "sendMessage",

	// User management events
	CHECK_USERNAME_AVAILABILITY: "checkUsernameAvailability",
} as const

// Server -> Client events
export const ServerEvents = {
	// Connection events
	PONG: "pong",
	ERROR: "error",

	// Room events
	JOINED_ROOM: "joinedRoom",
	PLAYER_JOINED: "playerJoined",
	PLAYER_LEFT: "playerLeft",
	PLAYER_LIST_UPDATE: "playerListUpdate",
	ROOM_CLOSED: "roomClosed",

	// Message events
	NEW_MESSAGE: "newMessage",

	// User management events
	USERNAME_AVAILABILITY_STATUS: "usernameAvailabilityStatus",

	// Channel events
	CHANNEL_JOIN_COMMAND: "CHANNEL_JOIN_COMMAND",
} as const

// Inter-server events
export const InterServerEvents = {
	PING: "ping",
} as const

/**
 * Client to Server Events - Events sent from clients to the server
 */
export interface ClientToServerEvents {
	/**
	 * Simple ping event to check connection
	 */
	[ClientEvents.PING]: () => void

	/**
	 * Join a room
	 * @param data.roomId Optional room ID
	 */
	[ClientEvents.JOIN_ROOM]: (data: { roomId?: string }) => void

	/**
	 * Send a chat message to the current room
	 * @param message.text The message content
	 * @param message.senderId Optional custom sender ID
	 * @param message.chatId Optional chat ID
	 */
	[ClientEvents.SEND_MESSAGE]: (message: {
		text: string
		senderId?: string
		chatId?: string
	}) => void

	/**
	 * Check if a username is available server-wide.
	 * @param data.username The username to check.
	 */
	[ClientEvents.CHECK_USERNAME_AVAILABILITY]: (data: {
		username: string
	}) => void
}

/**
 * Server to Client Events - Events sent from server to clients
 */
export interface ServerToClientEvents {
	/**
	 * Response to a ping event with timestamp
	 * @param data.time Current server timestamp
	 */
	[ServerEvents.PONG]: (data: { time: number }) => void

	/**
	 * General error event
	 * @param data.message Error message
	 * @param data.details Additional error details
	 */
	[ServerEvents.ERROR]: (data: { message: string; details: string }) => void

	/**
	 * Event sent when a player successfully joins a room
	 * @param data Room and player information
	 */
	[ServerEvents.JOINED_ROOM]: (data: {
		userId: string
		username: string
		players: PublicPlayer[]
		roomId: string
		history: ChatMessage[]
	}) => void

	/**
	 * Event sent when the player list changes
	 * @param data.players Updated list of players
	 * @param data.roomId Identifier of the channel/room
	 */
	[ServerEvents.PLAYER_LIST_UPDATE]: (data: {
		players: PublicPlayer[]
		roomId: string
	}) => void

	/**
	 * Event sent when a new player joins
	 * @param player Player information including roomId
	 */
	[ServerEvents.PLAYER_JOINED]: (
		player: PublicPlayer & { roomId: string },
	) => void

	/**
	 * Event sent when a player leaves
	 * @param player Player information including roomId
	 */
	[ServerEvents.PLAYER_LEFT]: (
		player: PublicPlayer & { roomId: string },
	) => void

	/**
	 * Event sent when a room/channel is closed
	 * @param data.reason The reason for closing the room
	 * @param data.roomId The identifier of the room that was closed
	 */
	[ServerEvents.ROOM_CLOSED]: (data: { reason: string; roomId: string }) => void

	/**
	 * Event sent when a new message is received
	 * @param message The chat message
	 */
	[ServerEvents.NEW_MESSAGE]: (message: ChatMessage) => void

	/**
	 * Response from the server indicating if a username is available.
	 * @param data.username The username that was checked.
	 * @param data.isAvailable True if the username is available.
	 * @param data.error Optional error message.
	 */
	[ServerEvents.USERNAME_AVAILABILITY_STATUS]: (data: {
		username: string
		isAvailable: boolean
		error?: string
	}) => void

	/**
	 * Event sent when a player joins a channel via the /join command
	 * @param data.channelId The ID of the channel that was joined
	 * @param data.channelName The name of the channel that was joined
	 */
	[ServerEvents.CHANNEL_JOIN_COMMAND]: (data: {
		channelId: string
		channelName: string
	}) => void
}

/**
 * Inter-server events - For server-to-server communication
 */
export interface InterServerEvents {
	/**
	 * Simple ping event for health checks between servers
	 */
	[InterServerEvents.PING]: () => void
}

/**
 * Socket data - Data that can be attached to a socket
 */
export interface SocketData {
	/**
	 * The current user's ID
	 */
	userId: string

	/**
	 * The room ID the user is currently in
	 */
	roomId?: string
}

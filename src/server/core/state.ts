/**
 * Shared state across server modules
 */
import { Server } from "socket.io"

import { Room } from "@/server/types"
import {
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "@/shared/events"

// Define typed Server
type TypedServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>

// Store for all rooms
export const rooms = new Map<string, Room>()

// Reference to Socket.IO server
let io: TypedServer | null = null

// Store for all active usernames (case-insensitive for checking)
export const activeUsernames = new Set<string>()

/**
 * Set the Socket.IO server instance
 */
export function setSocketIo(socketIo: TypedServer): void {
	io = socketIo
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketIo(): TypedServer | null {
	return io
}

// AI chat state
export const lastAiInitiatedChat = 0
export const currentAiChainLength = 0

/**
 * Socket connection handlers
 */
import { Server, Socket } from "socket.io"

import { debugLog } from "@/server/utils/logger"
import {
	ClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	ServerEvents,
	ServerToClientEvents,
	SocketData,
} from "@/shared/events"

/**
 * Set up connection-related socket handlers
 */
export function setupConnectionHandlers(
	_io: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>,
	socket: Socket<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>,
): void {
	// Implement a simple ping handler
	socket.on(ClientEvents.PING, () => {
		debugLog("PING", `Ping received from ${socket.id}`)
		socket.emit(ServerEvents.PONG, { time: Date.now() })
	})
}

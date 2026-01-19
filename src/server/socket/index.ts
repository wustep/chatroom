/**
 * Socket.IO setup and configuration
 */
import http from "http"
import { Server } from "socket.io"

import { setSocketIo } from "@/server/core/state"
import { setupHandlers } from "@/server/socket/handlers"
import { debugLog } from "@/server/utils/logger"
import {
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "@/shared/events"

/**
 * Configure and initialize Socket.IO
 */
export function setupSocketIO(
	server: http.Server,
): Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
> {
	const io = new Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>(server, {
		cors: {
			origin:
				process.env.APP_URL && process.env.STORYBOOK_URL
					? [process.env.APP_URL, process.env.STORYBOOK_URL]
					: true,
			methods: ["GET", "POST"],
			credentials: true,
			allowedHeaders: ["my-custom-header"],
		},
		allowEIO3: true, // Allow Engine.IO v3 client (older clients)
		connectTimeout: 45000, // Increase connection timeout to 45 seconds
	})

	// Store IO reference in shared state
	setSocketIo(io)

	// Set up event handlers
	setupHandlers(io)

	debugLog("SOCKET", "Socket.IO server initialized")

	return io
}

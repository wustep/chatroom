/**
 * Socket disconnect handlers
 */
import { Server, Socket } from "socket.io"

import { handlePlayerLeft } from "@/server/core/players"
import { debugLog } from "@/server/utils/logger"
import { ClientEvents } from "@/shared/events"

/**
 * Set up disconnect-related socket handlers
 */
export function setupDisconnectHandlers(_io: Server, socket: Socket): void {
	socket.on(ClientEvents.DISCONNECT, (reason: string) => {
		debugLog("DISCONNECT", `Client ${socket.id} disconnected: ${reason}`)

		// Handle player leaving due to disconnect
		handlePlayerLeft(socket.id)
	})
}

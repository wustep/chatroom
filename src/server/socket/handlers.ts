/**
 * Socket event handlers - Main entry point
 */

import { Server, Socket } from "socket.io"

import { setupChannelHandlers } from "@/server/socket/handlers/channels"
import { setupConnectionHandlers } from "@/server/socket/handlers/connection"
import { setupDisconnectHandlers } from "@/server/socket/handlers/disconnect"
import { setupMessageHandlers } from "@/server/socket/handlers/messages"
import { setupRoomHandlers } from "@/server/socket/handlers/rooms"
import { setupUserManagementHandlers } from "@/server/socket/handlers/userManagement"
import { debugLog } from "@/server/utils/logger"
import {
	ClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "@/shared/events"

/**
 * Main function to set up all socket event handlers.
 * This function is called once per connecting socket.
 */
export function setupHandlers(
	io: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>,
): void {
	io.on(
		"connection",
		(
			socket: Socket<
				ClientToServerEvents,
				ServerToClientEvents,
				InterServerEvents,
				SocketData
			>,
		) => {
			console.log(`User connected: ${socket.id}`)
			debugLog(
				"CONNECTION",
				`Socket ${socket.id} connected from ${socket.handshake.address}`,
			)

			setupConnectionHandlers(io, socket)
			setupRoomHandlers(io, socket)
			setupMessageHandlers(io, socket)
			setupDisconnectHandlers(io, socket)
			setupChannelHandlers(io, socket)
			setupUserManagementHandlers(socket)

			socket.on(ClientEvents.DISCONNECT, (reason: string) => {
				setupDisconnectHandlers(io, socket)
				debugLog(
					"DISCONNECT",
					`Socket ${socket.id} disconnected. Reason: ${reason}`,
				)
			})
		},
	)
}

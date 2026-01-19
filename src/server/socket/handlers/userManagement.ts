import { Socket } from "socket.io"

import { activeUsernames } from "@/server/core/state"
import { debugLog } from "@/server/utils/logger"
import { ClientEvents, ServerEvents } from "@/shared/events"

// Define the type for the data expected from the client
interface CheckUsernamePayload {
	username: string
}

// Define the type for the data sent back to the client
interface UsernameAvailabilityStatusPayload {
	username: string
	isAvailable: boolean
	error?: string
}

export function setupUserManagementHandlers(socket: Socket): void {
	socket.on(
		ClientEvents.CHECK_USERNAME_AVAILABILITY,
		(data: CheckUsernamePayload) => {
			const { username } = data
			let isAvailable = false
			let error: string | undefined

			debugLog(
				"CHECK_USERNAME",
				`Checking username availability for: ${username} (requested by ${socket.id})`,
			)

			if (!username || username.trim().length === 0) {
				error = "Username cannot be empty."
			} else if (username.length > 20) {
				// Example validation: length
				error = "Username cannot exceed 20 characters."
			} else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
				// Corrected regex: removed unnecessary escape for hyphen
				error =
					"Username can only contain letters, numbers, underscores, and hyphens."
			} else {
				// Check against activeUsernames (case-insensitive)
				if (activeUsernames.has(username.toLowerCase())) {
					error = `Username "${username}" is already taken.`
				} else {
					isAvailable = true
				}
			}

			const response: UsernameAvailabilityStatusPayload = {
				username,
				isAvailable,
				error,
			}

			socket.emit(ServerEvents.USERNAME_AVAILABILITY_STATUS, response)
			debugLog(
				"USERNAME_STATUS",
				`Sent status for ${username}: ${JSON.stringify(response)} to ${
					socket.id
				}`,
			)
		},
	)
}

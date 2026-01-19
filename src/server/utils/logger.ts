/**
 * Logging utilities
 */
import { rooms } from "@/server/core/state"
import { Player } from "@/server/types"

/**
 * Debug logger with timestamps and prefixes
 */
export function debugLog(prefix: string, ...args: unknown[]): void {
	console.log(`[${prefix}]`, ...args)
}

/**
 * Log room statistics for monitoring
 */
export function logRoomStats(): void {
	debugLog("ROOMS_STATS", `Active rooms: ${rooms.size}`)

	rooms.forEach((room, roomId) => {
		const playerCount = room.players.size
		const humanCount = Array.from(room.players.values()).filter(
			(p: Player) => !p.isAI,
		).length
		const aiCount = playerCount - humanCount

		debugLog(
			"ROOM",
			`${roomId}: ${playerCount} players (${humanCount} humans, ${aiCount} AI)`,
		)

		if (roomId.startsWith("playground_")) {
			debugLog(
				"PLAYGROUND",
				`${roomId} players:`,
				Array.from(room.players.values()).map(
					(p: Player) =>
						`${p.name} (${p.id.substring(0, 8)}...)${
							p.isAI ? " [AI]" : " [Human]"
						}`,
				),
			)
		}
	})
}

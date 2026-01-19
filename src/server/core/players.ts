/**
 * Player management functionality
 */
import { Socket } from "socket.io"

import { generatePlayerId } from "@/lib/names"
import { getPersonaByName, Persona, personas } from "@/lib/personas"
import { PersonaManager } from "@/server/ai/PersonaManager"
import * as config from "@/server/config/config"
import { getRoom, isChatRoom, isPlaygroundRoom } from "@/server/core/rooms"
import { activeUsernames, getSocketIo, rooms } from "@/server/core/state"
import { Player, PublicPlayer } from "@/server/types"
import { generateSillyName as generateServerSillyName } from "@/server/utils/nameGenerator"
import { ServerEvents } from "@/shared/events"

/**
 * Convert a server Player object to a client-safe PublicPlayer
 */
export function playerToPublic(player: Player, roomId: string): PublicPlayer {
	const isPlay = isPlaygroundRoom(roomId)

	const publicPlayer: PublicPlayer = {
		id: player.id,
		name: player.name,
		bio: player.bio,
	}

	// Include isAI flag and persona details only in playground mode
	if (isPlay) {
		publicPlayer.isAI = player.isAI
		if (player.isAI) {
			const personaManager = PersonaManager.getInstance()
			const persona = personaManager.getPersona(player.id)
			if (persona) {
				publicPlayer.persona = {
					profile: persona.profile as string,
					personality: persona.personality as
						| {
								traits: string[]
								communicationStyle: string
								interests: string[]
								background: string
								typingPatterns: string
								commonPhrases: string[]
								emojiUsage: string
						  }
						| undefined,
					gameSettings: persona.gameSettings as
						| {
								enabled: boolean
								autoInvite: boolean
								strategy: string
						  }
						| undefined,
					chatSettings: persona.chatSettings as
						| {
								enabled: boolean
								autoInvite: boolean
						  }
						| undefined,
				}
			}
		}
	}
	return publicPlayer
}

/**
 * Add a real player (human) to a room
 */
export function addRealPlayerToRoom(
	socket: Socket,
	roomId: string | undefined,
	providedName?: string,
): Player | null {
	if (!roomId) {
		throw new Error("Cannot add player: roomId is undefined")
	}

	const name = providedName?.trim() || generateServerSillyName()
	console.log(
		`Attempting to add real player ${name} (${socket.id}) to room ${roomId}`,
	)
	const room = getRoom(roomId)

	if (room.players.has(socket.id)) {
		console.log(
			`Player ${name} (${socket.id}) already exists in room ${roomId}`,
		)
		return room.players.get(socket.id)!
	}

	const existingPlayerWithSameName = Array.from(room.players.values()).find(
		p => p.name.toLowerCase() === name.toLowerCase() && p.id !== socket.id,
	)

	if (existingPlayerWithSameName) {
		console.log(
			`Username "${name}" is already taken in room ${roomId} by player ${existingPlayerWithSameName.id}`,
		)
		return null
	}

	const player: Player = { id: socket.id, name, isAI: false }

	room.players.set(socket.id, player)
	socket.join(roomId)
	console.log(
		`Player ${player.name} (${socket.id}) joined room ${roomId}, room now has ${room.players.size} players`,
	)

	const allPlayers = Array.from(room.players.values())
	console.log(
		`Room ${roomId} now has players:`,
		allPlayers.map(
			p =>
				`${p.anonymizedName || p.name} (${p.id})${
					p.isAI ? " [AI]" : "[Human]"
				}`,
		),
	)

	return player
}

/**
 * Create an AI player
 */
export function createAiPlayer(
	existingNames: Set<string> = new Set(),
	customName?: string,
	persona?: Persona,
): Player {
	let name: string
	let chosenPersona: Persona | undefined = persona

	if (chosenPersona) {
		name = chosenPersona.username || chosenPersona.name.toLowerCase()
		if (existingNames.has(name)) {
			console.warn(
				`Persona name "${name}" (from provided Persona object) is already in use in this context. This might lead to issues.`,
			)
		}
	} else if (customName) {
		name = customName
		if (existingNames.has(name)) {
			console.warn(`Custom name "${name}" is already in use in this context.`)
		}
	} else {
		const availablePersonas = personas.filter(
			p => !existingNames.has(p.username || p.name.toLowerCase()),
		)
		if (availablePersonas.length > 0) {
			chosenPersona =
				availablePersonas[Math.floor(Math.random() * availablePersonas.length)]
			name = chosenPersona.username || chosenPersona.name.toLowerCase()
		} else {
			console.log("No available predefined personas, generating silly name.")
			name = generateServerSillyName()
			let attempt = 0
			const maxNameAttempts = 10
			while (existingNames.has(name) && attempt < maxNameAttempts) {
				name = generateServerSillyName()
				attempt++
			}
			if (existingNames.has(name)) {
				console.warn(
					`Could not generate a unique silly name after ${maxNameAttempts} attempts.`,
				)
				name = `${name}_${generatePlayerId()}`
			}
			chosenPersona = undefined
		}
	}

	const aiId = generatePlayerId()
	const player: Player = {
		id: aiId,
		name,
		isAI: true,
		bio: chosenPersona?.bio,
	}

	if (chosenPersona) {
		console.log(
			`AI Player ${name} (${aiId}) created based on persona: ${chosenPersona.name}`,
		)
	} else {
		console.log(
			`AI Player ${name} (${aiId}) created (no specific predefined persona).`,
		)
	}
	return player
}

/**
 * Add an AI player to a room
 */
export function addAiPlayerToRoom(
	roomId: string,
	customName?: string,
): Player | undefined {
	const room = getRoom(roomId)
	const aiCount = Array.from(room.players.values()).filter(p => p.isAI).length

	if (aiCount >= config.MAX_AI_PLAYERS_IN_CHAT) {
		console.log(
			`Room ${roomId} already has maximum AI players (${aiCount}/${config.MAX_AI_PLAYERS_IN_CHAT}). Cannot add more.`,
		)
		return undefined
	}

	const currentIsPlaygroundRoom = isPlaygroundRoom(roomId)
	const currentIsChatRoom = isChatRoom(roomId)

	let personaToCreate: Persona | undefined
	const existingPlayerNamesInRoom = new Set(
		Array.from(room.players.values()).map(p => (p.name || "").toLowerCase()),
	)

	let aiPlayer: Player

	if (customName) {
		const potentialPersona = getPersonaByName(customName)
		if (!potentialPersona) {
			console.warn(
				`Persona with name/username "${customName}" not found in personas.ts. Cannot add AI.`,
			)
			return undefined
		}

		const personaIdentifier = (
			potentialPersona.username || potentialPersona.name
		).toLowerCase()
		if (existingPlayerNamesInRoom.has(personaIdentifier)) {
			console.warn(
				`Persona "${potentialPersona.name}" (identifier: ${personaIdentifier}) is already in room ${roomId}. Cannot add duplicate.`,
			)
			return undefined
		}

		if (currentIsChatRoom && !potentialPersona.chatSettings?.enabled) {
			console.warn(
				`Persona "${potentialPersona.name}" is not enabled for chat rooms. Cannot add AI.`,
			)
			return undefined
		}
		// Playgrounds allow any existing persona regardless of chat enabled flags

		personaToCreate = potentialPersona
		aiPlayer = createAiPlayer(
			existingPlayerNamesInRoom,
			undefined,
			personaToCreate,
		)
		console.log(
			`Attempting to add specific persona "${personaToCreate.name}" as AI player ${aiPlayer.name} to room ${roomId}.`,
		)
	} else if (currentIsChatRoom) {
		// Auto-invite logic for chat rooms if no customName provided
		const autoInvitablePersonas = personas.filter((p: Persona) => {
			const isEnabledForRoom = p.chatSettings?.autoInvite
			const notInRoom = !existingPlayerNamesInRoom.has(
				(p.username || p.name).toLowerCase(),
			)
			return isEnabledForRoom && notInRoom
		})

		if (autoInvitablePersonas.length > 0) {
			const randomIndex = Math.floor(
				Math.random() * autoInvitablePersonas.length,
			)
			personaToCreate = autoInvitablePersonas[randomIndex]
			aiPlayer = createAiPlayer(
				existingPlayerNamesInRoom,
				undefined,
				personaToCreate,
			)
			console.log(
				`Auto-inviting persona "${personaToCreate.name}" as AI player ${aiPlayer.name} to room ${roomId}.`,
			)
		} else {
			console.log(
				`No auto-invitable and available personas found for chat room. Creating a generic AI.`,
			)
			aiPlayer = createAiPlayer(existingPlayerNamesInRoom)
		}
	} else if (currentIsPlaygroundRoom) {
		// Playground allows generic AI if no customName
		console.log(`Playground room ${roomId}: Creating a generic AI player.`)
		aiPlayer = createAiPlayer(existingPlayerNamesInRoom)
	} else {
		console.warn(
			`Cannot add AI to room ${roomId}: Unknown room type or configuration.`,
		)
		return undefined
	}

	if (!aiPlayer) {
		// Should not happen if logic above is correct
		console.error(`Failed to create AI player for room ${roomId}`)
		return undefined
	}

	room.players.set(aiPlayer.id, aiPlayer)

	console.log(
		`AI Player ${aiPlayer.name} (${aiPlayer.id}) added to room ${roomId}, room now has ${room.players.size} players`,
	)

	const io = getSocketIo()
	if (io) {
		const publicAiPlayer = playerToPublic(aiPlayer, roomId)
		io.to(roomId).emit(ServerEvents.PLAYER_JOINED, {
			...publicAiPlayer,
			roomId, // Include roomId for client context
		} as PublicPlayer & { roomId: string })
	}

	return aiPlayer
}

/**
 * Remove a player from a room
 */
export function removePlayerFromRoom(
	socketId: string,
	roomId: string,
): Player | undefined {
	const room = getRoom(roomId)
	const player = room.players.get(socketId)
	if (player) {
		room.players.delete(socketId)

		// Remove username from global set upon leaving a room
		// This assumes a player is only "active" with a username when in at least one room.
		// If a player could exist server-wide without being in a room, this logic might need adjustment.
		if (player.name) {
			const lowerCaseName = player.name.toLowerCase()
			if (activeUsernames.has(lowerCaseName)) {
				activeUsernames.delete(lowerCaseName)
				console.log(
					"USERNAME_REMOVED_GLOBAL",
					`Username "${player.name}" removed from global set.`,
				)
			}
		}

		// Find the actual socket to make it leave the room if it's not an AI
		const io = getSocketIo()
		if (io) {
			const actualSocket = io.sockets.sockets.get(socketId)
			if (actualSocket) {
				actualSocket.leave(roomId)
			}
		}
		console.log(`Player ${player.name} (${socketId}) left room ${roomId}`)

		// Clean up room timers if room is being deleted
		if (room.promptTimers) {
			room.promptTimers.forEach(t => clearTimeout(t))
		}
	}
	return player
}

/**
 * Handle player leaving (primarily used for disconnect events)
 * This is a wrapper around finding which room a player is in and removing them
 */
export function handlePlayerLeft(socketId: string): Player | undefined {
	let playerRoomId: string | undefined

	// Find which room this player is in
	rooms.forEach((roomData, roomId) => {
		if (roomData.players.has(socketId)) {
			playerRoomId = roomId
		}
	})

	if (playerRoomId) {
		const removedPlayer = removePlayerFromRoom(socketId, playerRoomId)
		// The actual removal from activeUsernames is now handled within removePlayerFromRoom
		return removedPlayer
	}

	return undefined
}

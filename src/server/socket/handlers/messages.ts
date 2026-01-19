/**
 * Socket message-related handlers
 */
import { Server, Socket } from "socket.io"

// import { generateSillyName } from "@/lib/names"
import { getPersonaByName } from "@/lib/personas"
import { ChatService } from "@/server/ai/ChatService"
import { generateAiResponse } from "@/server/ai/chatHandlers"
import * as config from "@/server/config/config"
import {
	addMessageToRoomHistory,
	getRecentMessages,
} from "@/server/core/messages"
import {
	addAiPlayerToRoom,
	addRealPlayerToRoom,
	playerToPublic,
	removePlayerFromRoom,
} from "@/server/core/players"
import { getRoom, getRoomMode } from "@/server/core/rooms"
import { getSocketIo, rooms } from "@/server/core/state"
import { Player, PlaygroundRoom, Room } from "@/server/types"
import { debugLog } from "@/server/utils/logger"
import { ClientEvents, ServerEvents } from "@/shared/events"

// Socket.IO events for messages and room handling

/**
 * Set up message-related socket handlers
 */
export function setupMessageHandlers(io: Server, socket: Socket): void {
	// Handle sending a message
	socket.on(
		ClientEvents.SEND_MESSAGE,
		// Updated to include roomId in the message payload
		(message: {
			text: string
			senderId?: string
			chatId?: string
			roomId?: string
		}) => {
			// For multi-channel support: if roomId is provided, use it directly
			// Otherwise, fall back to finding which room the player is in (legacy behavior)
			const playerRoomId = message.roomId || message.chatId

			if (playerRoomId) {
				// Direct channel/room provided - check if socket is actually in this room
				if (!socket.rooms.has(playerRoomId)) {
					socket.emit(ServerEvents.ERROR, {
						message: "Not subscribed to channel",
						details: `You cannot send messages to a channel you're not subscribed to: ${playerRoomId}`,
					})
					return
				}

				// Get the room data
				const playerRoom = rooms.get(playerRoomId)
				if (!playerRoom) {
					socket.emit(ServerEvents.ERROR, {
						message: "Channel not found",
						details: `The specified channel does not exist: ${playerRoomId}`,
					})
					return
				}

				// Get the player
				const connectedPlayer = playerRoom.players.get(socket.id)
				if (!connectedPlayer) {
					socket.emit(ServerEvents.ERROR, {
						message: "Not a member of channel",
						details: `You are not a member of channel: ${playerRoomId}`,
					})
					return
				}

				// Process message
				processMessage(
					io,
					socket,
					message,
					connectedPlayer,
					playerRoom,
					playerRoomId,
				)
			} else {
				// Legacy behavior - find the player's room
				let connectedPlayer: Player | undefined
				let playerRoomId: string | undefined
				let playerRoom: Room | undefined

				// Find which room this player is in
				rooms.forEach((roomData, roomId) => {
					const player = roomData.players.get(socket.id)
					if (player) {
						connectedPlayer = player
						playerRoomId = roomId
						playerRoom = roomData
					}
				})

				if (connectedPlayer && playerRoomId && playerRoom) {
					// Process message
					processMessage(
						io,
						socket,
						message,
						connectedPlayer,
						playerRoom,
						playerRoomId,
					)
				} else {
					console.log(`Received message from unknown user: ${socket.id}`)
					socket.emit(ServerEvents.ERROR, {
						message: "Not in a channel",
						details: "You are not in any channel. Please join a channel first.",
					})
				}
			}
		},
	)
}

/**
 * Helper function to process a message
 */
function processMessage(
	io: Server,
	socket: Socket,
	message: {
		text: string
		senderId?: string
		chatId?: string
		roomId?: string
	},
	connectedPlayer: Player,
	playerRoom: Room,
	playerRoomId: string,
) {
	const isPlayground = playerRoomId.startsWith("playground_")

	// Check if this is a command message (starts with /)
	if (message.text.startsWith("/")) {
		// Process commands
		handleChatCommand(io, socket, message.text, connectedPlayer, playerRoomId)
		return
	}

	// Regular message processing (existing code)
	// ... existing code ...

	// Check if this is a playground room and if a custom senderId was provided
	let senderId = connectedPlayer.id
	let senderName = connectedPlayer.name
	let isAi = connectedPlayer.isAI

	// If this is a playground and a custom senderId was provided, validate it
	if (
		isPlayground &&
		message.senderId &&
		message.senderId !== connectedPlayer.id
	) {
		// Ensure the senderId corresponds to a real player in this room
		const customSender = playerRoom.players.get(message.senderId)
		if (customSender) {
			// Use the custom sender's information for the message
			senderId = customSender.id
			senderName = customSender.name
			isAi = customSender.isAI

			console.log(
				`Playground: ${connectedPlayer.name} is sending a message as ${senderName}`,
			)
		} else {
			// Invalid senderId, default back to the connected player
			console.log(
				`Invalid sender ID ${message.senderId} provided, defaulting to actual user`,
			)
		}
	}

	// Create the message with the appropriate sender - include roomId in payload
	const chatMessage = {
		id: Date.now(),
		sender: senderName,
		senderId: senderId,
		text: message.text,
		roomId: playerRoomId, // Add roomId to the message payload
		timestamp: Date.now(), // Record the exact millisecond time
		type: "normal" as const,
	}

	console.log(
		`Message in room ${playerRoomId} from ${senderName}: ${message.text}`,
	)

	io.to(playerRoomId).emit(ServerEvents.NEW_MESSAGE, chatMessage)

	// Store the message in history
	addMessageToRoomHistory(playerRoomId, chatMessage)

	// Only trigger AI responses if the original player is human and not impersonating someone
	if (!connectedPlayer.isAI && !isPlayground) {
		// Generate AI response using chat handlers
		generateAiResponse(playerRoomId)
	}
	// For playground, generate AI response if the effective sender is not an AI
	else if (isPlayground && !isAi) {
		debugLog(
			"PLAYGROUND_RESPOND",
			`Playground message from non-AI ${senderName}. Generating AI response.`,
		)

		// Ensure we have a PlaygroundRoom type to access settings
		const playgroundRoom = playerRoom as PlaygroundRoom
		const aiPlayers = Array.from(playgroundRoom.players.values()).filter(
			(p: Player) => p.isAI,
		)

		if (aiPlayers.length > 0) {
			// Select a random AI to respond
			const respondingAI =
				aiPlayers[Math.floor(Math.random() * aiPlayers.length)]
			if (!respondingAI) {
				return
			}
			const mode = getRoomMode(playerRoomId)
			const chatService = ChatService.getInstance()
			const recentMessages = getRecentMessages(playerRoomId)

			// Simple typing delay for playground
			const typingDelay = 500 + Math.random() * 1000

			setTimeout(async () => {
				try {
					const aiMessageText = await chatService.generateResponseWithContext(
						senderName, // The sender of the trigger message
						recentMessages, // History
						mode,
						undefined,
						playgroundRoom.settings, // Playground-specific settings
					)

					const aiResponse = {
						id: Date.now() + 1,
						sender: respondingAI.name,
						senderId: respondingAI.id,
						text: aiMessageText,
						roomId: playerRoomId, // Add roomId to the AI response
						timestamp: Date.now(), // Record timestamp for AI response
					}

					const io = getSocketIo()
					if (io) {
						io.to(playerRoomId).emit(ServerEvents.NEW_MESSAGE, aiResponse)
						addMessageToRoomHistory(playerRoomId, aiResponse)
					}
				} catch (error) {
					console.error("Error generating playground AI response:", error)
					// Optional: Send error message to room
				}
			}, typingDelay)
		}
	}

	// Update last human activity if the original message sender was human, regardless of impersonation
	if (!connectedPlayer.isAI) {
		playerRoom.lastHumanActivity = Date.now()
	}
}

/**
 * Process chat commands like /join and /topic
 */
function handleChatCommand(
	io: Server,
	socket: Socket,
	commandText: string,
	player: Player,
	currentRoomId: string,
): void {
	// Split the command into parts, preserving quoted strings
	const parts = commandText.match(/[^\s"]+|"([^"]*)"/g) || []
	const command = parts[0]?.toLowerCase() || ""

	// Process different commands
	switch (command) {
		case "/join": {
			// Format: /join #channel
			if (parts.length < 2) {
				// Just return silently on error
				return
			}

			// Extract channel name (remove # if present)
			const channelName = parts[1].replace(/^#/, "")
			const roomId = `chat_${channelName}`

			// Check if already in this room
			if (socket.rooms.has(roomId)) {
				sendSystemMessage(socket, `You are already in channel #${channelName}`)
				return
			}

			// Directly add the user to the room instead of using socket emit
			console.log(`Attempting to join channel: ${roomId} as ${player.name}`)

			// Add user to new room directly using the channel handlers logic
			try {
				// Get or create the room
				const room = getRoom(roomId)
				room.lastHumanActivity = Date.now()

				// Add player to room
				const newRoomPlayer = addRealPlayerToRoom(socket, roomId, player.name)

				// Handle username conflict
				if (!newRoomPlayer) {
					return
				}

				// Join socket to the room
				socket.join(roomId)

				// Get player list
				const playerDTOs = Array.from(room.players.values()).map(p =>
					playerToPublic(p, roomId),
				)

				// Send join confirmation to the client
				socket.emit(ServerEvents.JOINED_ROOM, {
					userId: newRoomPlayer.id,
					username: newRoomPlayer.name,
					players: playerDTOs,
					roomId: roomId,
					history: room.messages || [],
					isReconnection: false,
				})

				// Notify other clients in the new room
				socket.to(roomId).emit(ServerEvents.PLAYER_JOINED, {
					...playerToPublic(newRoomPlayer, roomId),
					roomId,
				})

				// Update all clients with the new player list
				io.to(roomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
					players: playerDTOs,
					roomId,
				})

				// Let the user know they've joined
				const joinMessage = {
					id: Date.now(),
					sender: "System",
					senderId: "system",
					text: `You have joined #${channelName}`,
					timestamp: Date.now(),
					type: "system" as const,
				}
				socket.emit(ServerEvents.NEW_MESSAGE, joinMessage)

				// Send a special event to tell the client this was a join command
				// This helps ensure the UI switches to this tab
				socket.emit(ServerEvents.CHANNEL_JOIN_COMMAND, {
					channelId: roomId,
					channelName,
				})
			} catch (error) {
				console.error("Error joining channel:", error)
				// Silent fail on error
			}

			break
		}

		case "/topic": {
			// Format: /topic "New topic description"
			// The topic might be in quotes if it contains spaces
			if (parts.length < 2) {
				return
			}

			// Get the topic text (remove quotes if present)
			const topic = parts
				.slice(1)
				.join(" ")
				.replace(/^"(.*)"$/, "$1")

			// Get the room and update its topic
			const room = rooms.get(currentRoomId)
			if (!room) {
				return
			}

			// Update the room topic
			room.topic = topic

			// Send a system message to the room about the topic change
			sendSystemMessage(
				socket,
				`Topic set by ${player.name}: ${topic}`,
				currentRoomId,
			)

			break
		}

		case "/invite": {
			// Format: /invite AiName or /invite @AiName or /invite AiName,OtherAi or /invite AiName@server.ts
			if (parts.length < 2) {
				return
			}

			// Get the room first
			const room = rooms.get(currentRoomId)
			if (!room) {
				return
			}

			// Parse usernames - join all parts after the command and split by commas
			const allNamesString = parts.slice(1).join(" ")
			const rawNames = allNamesString.split(",").map(name => name.trim())

			// Clean each name - handle @ syntax and @server.ts suffix
			const cleanNames = rawNames
				.map(name => {
					let cleanName = name

					// Remove @ prefix if present
					if (cleanName.startsWith("@")) {
						cleanName = cleanName.substring(1)
					}

					// Remove @server.ts suffix if present
					if (cleanName.endsWith("@server.ts")) {
						cleanName = cleanName.replace("@server.ts", "")
					}

					return cleanName.trim()
				})
				.filter(name => name.length > 0) // Remove empty names

			if (cleanNames.length === 0) {
				return
			}

			const successfulInvites: string[] = []
			const failedInvites: { name: string; reason: string }[] = []

			// Process each name
			for (const aiName of cleanNames) {
				// Check if this name is already in use in the room
				const existingPlayer = Array.from(room.players.values()).find(
					p => p.name.toLowerCase() === aiName.toLowerCase(),
				)

				if (existingPlayer) {
					failedInvites.push({ name: aiName, reason: "already in room" })
					continue
				}

				// Check if the persona exists
				const persona = getPersonaByName(aiName)

				if (!persona) {
					failedInvites.push({ name: aiName, reason: "persona not found" })
					continue
				}

				const playerCount = room.players.size

				// Check room capacity
				if (playerCount >= config.MAX_CHAT_ROOM_TOTAL_PLAYERS) {
					failedInvites.push({
						name: aiName,
						reason: `room at capacity (${playerCount}/${config.MAX_CHAT_ROOM_TOTAL_PLAYERS})`,
					})
					continue
				}

				const addedAI = addAiPlayerToRoom(currentRoomId, aiName)

				if (!addedAI || addedAI.id === "dummy") {
					failedInvites.push({ name: aiName, reason: "failed to add" })
					continue
				}

				successfulInvites.push(aiName)

				// Explicitly emit player joined event
				io.to(currentRoomId).emit(ServerEvents.PLAYER_JOINED, {
					id: addedAI.id,
					name: addedAI.name,
					isAI: true,
					roomId: currentRoomId,
				})
			}

			// Send system messages for successful invites
			if (successfulInvites.length > 0) {
				const inviteText =
					successfulInvites.length === 1
						? `${player.name} has invited ${successfulInvites[0]} to the channel`
						: `${player.name} has invited ${successfulInvites.join(
								", ",
						  )} to the channel`

				const inviteMessage = {
					id: Date.now(),
					sender: "System",
					senderId: "system",
					text: inviteText,
					roomId: currentRoomId,
					timestamp: Date.now(),
					type: "system" as const,
				}

				// Send to everyone in the room
				io.to(currentRoomId).emit(ServerEvents.NEW_MESSAGE, inviteMessage)
				addMessageToRoomHistory(currentRoomId, inviteMessage)

				// Send user confirmation (private)
				const confirmText =
					successfulInvites.length === 1
						? `Successfully invited ${successfulInvites[0]} to the channel`
						: `Successfully invited ${successfulInvites.join(
								", ",
						  )} to the channel`
				sendSystemMessage(socket, confirmText)
			}

			// Send private error messages for failed invites
			if (failedInvites.length > 0) {
				const errorMessages = failedInvites.map(
					({ name, reason }) => `Failed to invite ${name}: ${reason}`,
				)
				for (const errorMsg of errorMessages) {
					sendSystemMessage(socket, errorMsg)
				}
			}

			// Update player list if any successful invites
			if (successfulInvites.length > 0) {
				const allPlayers = Array.from(room.players.values()).map(p => ({
					id: p.id,
					name: p.name,
					isAI: p.isAI,
					roomId: currentRoomId,
				}))

				io.to(currentRoomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
					players: allPlayers,
					roomId: currentRoomId,
				})
			}

			break
		}

		case "/kick": {
			// Format: /kick AiName
			if (parts.length < 2) {
				return
			}

			// Get the AI name
			const aiName = parts[1]

			// Check if this name is already in use in the room
			const room = rooms.get(currentRoomId)
			if (!room) {
				return
			}

			// Check if this name is already taken in the room
			const existingPlayer = Array.from(room.players.values()).find(
				p => p.name.toLowerCase() === aiName.toLowerCase(),
			)

			if (existingPlayer) {
				// Remove the player from the room using the imported function
				removePlayerFromRoom(existingPlayer.id, currentRoomId)

				// Send a system message that the AI has been kicked (only on success)
				const kickMessage = {
					id: Date.now(),
					sender: "System",
					senderId: "system",
					text: `${player.name} has kicked ${aiName} from the channel`,
					roomId: currentRoomId,
					timestamp: Date.now(),
					type: "system" as const,
				}

				// Send to everyone in the room
				io.to(currentRoomId).emit(ServerEvents.NEW_MESSAGE, kickMessage)
				addMessageToRoomHistory(currentRoomId, kickMessage)

				// Send user confirmation (private)
				sendSystemMessage(
					socket,
					`Successfully kicked ${aiName} from the channel`,
				)

				// Explicitly emit player left event
				io.to(currentRoomId).emit(ServerEvents.PLAYER_LEFT, {
					id: existingPlayer.id,
					name: existingPlayer.name,
					isAI: existingPlayer.isAI,
					roomId: currentRoomId,
				})

				// Update player list
				const allPlayers = Array.from(room.players.values()).map(p => ({
					id: p.id,
					name: p.name,
					isAI: p.isAI,
					roomId: currentRoomId,
				}))

				io.to(currentRoomId).emit(ServerEvents.PLAYER_LIST_UPDATE, {
					players: allPlayers,
					roomId: currentRoomId,
				})
			}

			break
		}

		default:
			// Silently ignore unknown commands
			break
	}
}

/**
 * Helper to send a system message to a specific socket (private) or room (public)
 */
function sendSystemMessage(
	socket: Socket,
	message: string,
	roomId?: string,
	isError: boolean = false,
): void {
	const systemMessage = {
		id: Date.now(),
		sender: isError ? "Error" : "System",
		senderId: "system",
		text: message,
		timestamp: Date.now(),
		type: isError ? ("error" as const) : ("system" as const),
		roomId: roomId, // Include roomId if provided
	}

	if (roomId) {
		// Send to all clients in the room (public message)
		socket.to(roomId).emit(ServerEvents.NEW_MESSAGE, systemMessage)
		// Also send to the sender to ensure they see it
		socket.emit(ServerEvents.NEW_MESSAGE, systemMessage)
		// Store in room history
		addMessageToRoomHistory(roomId, systemMessage)
	} else {
		// Send only to the specific socket (private message)
		socket.emit(ServerEvents.NEW_MESSAGE, systemMessage)
	}
}

/**
 * AI chat generation handlers
 */
import { ChatService } from "@/server/ai/ChatService"
import * as config from "@/server/config/config"
import { getRecentMessages } from "@/server/core/messages"
import {
	getDMParticipants,
	getRoom,
	isChatRoom,
	isDMRoom,
	isPlaygroundRoom,
} from "@/server/core/rooms"
import { getSocketIo, rooms } from "@/server/core/state"
import { Player, Room } from "@/server/types"

// AI chat variables for tracking response chains
let lastAiInitiatedChat = 0
let currentAiChainLength = 0

/**
 * Process AI response text to filter out the decision prefix
 */
function processAiResponseText(text: string): string | null {
	// If the response is empty (after trim), return null to indicate no response should be sent
	const trimmedText = text.trim()
	if (trimmedText === "") {
		console.log(`AI decided not to respond (empty output)`)
		return null
	}

	// Otherwise, return the message text as is
	return trimmedText
}

/**
 * Generate an AI response to a human message
 */
export async function generateAiResponse(
	roomId: string,
	customTemplate?: string,
): Promise<void> {
	const room = getRoom(roomId)
	const aiInRoom = Array.from(room.players.values()).filter(p => p.isAI)

	if (aiInRoom.length > 0) {
		// Select a random AI to respond (or the only one in a DM)
		const respondingAI = aiInRoom[Math.floor(Math.random() * aiInRoom.length)]
		const chatService = ChatService.getInstance()

		// Get recent conversation history for context and add topic context
		const recentMessages = [...getRecentMessages(roomId)]

		// Add context based on room type
		if (isDMRoom(roomId)) {
			// For DMs, add context about it being a private conversation
			const participants = getDMParticipants(roomId)
			const otherParticipant = participants.find(
				p => p.toLowerCase() !== respondingAI.name.toLowerCase(),
			)
			recentMessages.unshift({
				id: Date.now() - 1,
				sender: "System",
				senderId: "system",
				text: `This is a private direct message conversation with ${otherParticipant || "a user"}. Respond naturally and personally. Be engaging and conversational. You can be more casual and direct since this is a one-on-one chat.`,
				type: "system",
				timestamp: Date.now() - 1,
			})
		}
		// Check for explicit room topic first
		else if (room.topic) {
			recentMessages.unshift({
				id: Date.now() - 1,
				sender: "System",
				senderId: "system",
				text: `Channel topic: ${room.topic}. Keep the conversation related to ${room.topic}. If the conversation drifts, gently redirect it back to discussing ${room.topic}. Share relevant information, opinions or experiences specifically about ${room.topic}.`,
				type: "system",
				timestamp: Date.now() - 1,
			})
		}
		// Otherwise infer from channel name
		else if (roomId.startsWith("chat_")) {
			const inferredTopic = roomId.replace("chat_", "")
			recentMessages.unshift({
				id: Date.now() - 1,
				sender: "System",
				senderId: "system",
				text: `You are in the #${inferredTopic} channel. Keep the conversation related to ${inferredTopic}. Your responses should focus on this topic, and if the conversation drifts, gently redirect it back to discussing ${inferredTopic}. Share relevant information, opinions or experiences specifically about ${inferredTopic}.`,
				type: "system",
				timestamp: Date.now() - 1,
			})
		}

		// Add typing delay for realism (800-2000ms)
		const typingDelay = 800 + Math.random() * 1200

		setTimeout(async () => {
			try {
				// Generate response from LLM with conversation context
				const rawAiMessageText = await chatService.generateResponseWithContext(
					respondingAI.name,
					recentMessages,
					customTemplate,
				)

				// Process the response to remove decision prefix
				const processedMessageText = processAiResponseText(rawAiMessageText)

				// If the AI decided not to respond, exit early
				if (processedMessageText === null) {
					console.log(`${respondingAI.name} decided not to respond`)
					return
				}

				// Create and send the message
				const aiResponse = {
					id: Date.now() + 1,
					sender: respondingAI.name,
					senderId: respondingAI.id,
					text: processedMessageText,
					roomId,
					timestamp: Date.now(),
					type: "normal" as const,
				}

				// Get Socket.IO to emit the message
				const io = getSocketIo()
				if (io) {
					io.to(roomId).emit("newMessage", aiResponse)
					// Store the AI message in history
					room.messages.push(aiResponse)
				}

				currentAiChainLength = 1 // Reset AI chain counter when human gets a response

				// Occasionally have AIs respond to other AIs, but with constraints
				scheduleAiToAiResponse(roomId, respondingAI)
			} catch (error) {
				console.error("Error generating AI response:", error)

				// Fallback to generic response in case of error
				const fallbackResponse = {
					id: Date.now() + 1,
					sender: respondingAI.name,
					senderId: respondingAI.id,
					text: `That's interesting! Tell me more about that.`,
					roomId,
					timestamp: Date.now(),
					type: "normal" as const,
				}

				const io = getSocketIo()
				if (io) {
					io.to(roomId).emit("newMessage", fallbackResponse)
					// Store the fallback message in history
					room.messages.push(fallbackResponse)
				}
			}
		}, typingDelay)
	}
}

/**
 * Schedule AI-to-AI conversations
 */
function scheduleAiToAiResponse(roomId: string, sourceAiPlayer: Player): void {
	const currentTime = Date.now()

	// Check if we should allow AI-to-AI chat
	if (
		// Random chance based on probability
		Math.random() > config.AI_CHAT_PROBABILITY ||
		// Don't allow AI to respond too frequently
		currentTime - lastAiInitiatedChat < config.MIN_AI_CHAT_INTERVAL ||
		// Limit chain length to avoid infinite loops
		currentAiChainLength >= config.MAX_AI_RESPONSES_PER_CHAIN
	) {
		return
	}

	const room = getRoom(roomId)
	const otherAiPlayers = Array.from(room.players.values()).filter(
		p => p.isAI && p.id !== sourceAiPlayer.id,
	)

	// Only continue if there are other AIs to respond
	if (otherAiPlayers.length === 0) return

	// Select a random different AI to respond
	const respondingAI =
		otherAiPlayers[Math.floor(Math.random() * otherAiPlayers.length)]
	const chatService = ChatService.getInstance()

	// Get recent conversation history for context
	const recentMessages = getRecentMessages(roomId)

	// Longer delay for AI-to-AI responses (2-5 seconds)
	const responseDelay = 2000 + Math.random() * 3000

	setTimeout(async () => {
		try {
			// Generate AI-to-AI response with context
			const rawAiMessageText = await chatService.generateResponseWithContext(
				respondingAI.name,
				recentMessages,
			)

			// Process the response to remove decision prefix
			const processedMessageText = processAiResponseText(rawAiMessageText)

			// If the AI decided not to respond, exit early
			if (processedMessageText === null) {
				console.log(
					`${respondingAI.name} decided not to respond to ${sourceAiPlayer.name}`,
				)
				return
			}

			// Create and send the message
			const aiResponse = {
				id: Date.now() + 1,
				sender: respondingAI.name,
				senderId: respondingAI.id,
				text: processedMessageText,
				roomId,
				timestamp: Date.now(),
				type: "normal" as const,
			}

			const io = getSocketIo()
			if (io) {
				io.to(roomId).emit("newMessage", aiResponse)
				// Store the AI message in history
				room.messages.push(aiResponse)
			}

			// Update tracking variables
			lastAiInitiatedChat = Date.now()
			currentAiChainLength++
		} catch (error) {
			console.error("Error generating AI-to-AI response:", error)
		}
	}, responseDelay)
}

/**
 * Schedule ambient AI conversations
 */
export function scheduleAmbientAiChat(): void {
	// Schedule the next check
	const nextInterval =
		config.AI_AMBIENT_CHAT_MIN_INTERVAL +
		Math.random() *
			(config.AI_AMBIENT_CHAT_MAX_INTERVAL -
				config.AI_AMBIENT_CHAT_MIN_INTERVAL)

	setTimeout(() => {
		// For each room, maybe start a conversation
		rooms.forEach((room: Room, roomId: string) => {
			// Only start conversations if:
			// 1. There are human players present (don't waste API calls if no one's there)
			// 2. Random chance hits
			const humanPlayers = Array.from(room.players.values()).filter(
				(p: Player) => !p.isAI,
			)
			const aiPlayers = Array.from(room.players.values()).filter(
				(p: Player) => p.isAI,
			)

			// Determine if the room is a playground
			const isPlayground = isPlaygroundRoom(roomId)

			if (
				// Allow in playground even with no humans if autoRespond is on
				// Simplify condition: Allow if playground OR humans are present
				(isPlayground || humanPlayers.length > 0) &&
				aiPlayers.length > 0 &&
				Math.random() < config.AI_AMBIENT_CHAT_PROBABILITY
			) {
				// Select a random AI to start the conversation
				const initiatingAI =
					aiPlayers[Math.floor(Math.random() * aiPlayers.length)]

				// Generate a conversation starter - we no longer need player names
				startAiConversation(roomId, initiatingAI)
			}
		})

		// Schedule the next check
		scheduleAmbientAiChat()
	}, nextInterval)
}

/**
 * Start a conversation from an AI
 */
export async function startAiConversation(
	roomId: string,
	aiPlayer: Player,
): Promise<void> {
	const chatService = ChatService.getInstance()
	const room = getRoom(roomId)

	// Get recent conversation history for context and add topic context
	const recentMessages = [...getRecentMessages(roomId)]

	// Check for explicit room topic first
	if (room.topic) {
		recentMessages.unshift({
			id: Date.now() - 1,
			sender: "System",
			senderId: "system",
			text: `Channel topic: ${room.topic}. Keep the conversation related to ${room.topic}. If the conversation drifts, gently redirect it back to discussing ${room.topic}. Share relevant information, opinions or experiences specifically about ${room.topic}.`,
			type: "system",
			timestamp: Date.now() - 1,
		})
	}
	// Otherwise infer from channel name
	else if (isChatRoom(roomId)) {
		const inferredTopic = roomId.replace("chat_", "")
		recentMessages.unshift({
			id: Date.now() - 1,
			sender: "System",
			senderId: "system",
			text: `You are in the #${inferredTopic} channel. Keep the conversation related to ${inferredTopic}. Your responses should focus on this topic, and if the conversation drifts, gently redirect it back to discussing ${inferredTopic}. Share relevant information, opinions or experiences specifically about ${inferredTopic}.`,
			type: "system",
			timestamp: Date.now() - 1,
		})
	} else if (!isPlaygroundRoom(roomId)) {
		// treat raw room id as topic for standard chat channels
		recentMessages.unshift({
			id: Date.now() - 1,
			sender: "System",
			senderId: "system",
			text: `You are in the #${roomId} channel. Keep the conversation related to ${roomId}. Your responses should focus on this topic, and if the conversation drifts, gently redirect it back to discussing ${roomId}. Share relevant information, opinions or experiences specifically about ${roomId}.`,
			type: "system",
			timestamp: Date.now() - 1,
		})
	}

	try {
		// Generate a conversation starter with context
		const rawMessageText = await chatService.generateResponseWithContext(
			aiPlayer.name,
			recentMessages,
		)

		// Process the response to remove decision prefix
		const processedMessageText = processAiResponseText(rawMessageText)

		// If somehow there's no message to send (shouldn't happen for starters), exit
		if (processedMessageText === null) {
			console.log(`${aiPlayer.name} decided not to start a conversation`)
			return
		}

		// Create and send the message
		const message = {
			id: Date.now(),
			sender: aiPlayer.name,
			senderId: aiPlayer.id,
			text: processedMessageText,
			roomId,
			timestamp: Date.now(),
			type: "normal" as const,
		}

		const io = getSocketIo()
		if (io) {
			io.to(roomId).emit("newMessage", message)
			// Store the message in history
			room.messages.push(message)
		}

		// Reset AI chain information
		lastAiInitiatedChat = Date.now()
		currentAiChainLength = 1
	} catch (error) {
		console.error("Error starting AI conversation:", error)
	}
}

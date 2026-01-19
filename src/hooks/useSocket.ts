import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"

import { CURRENT_USER_COLOR_KEY, getColorKeyForUser } from "@/lib/colors"
import { ClientEvents, ServerEvents } from "@/shared/events"

export interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	timestamp?: number
}

export interface ServerChatMessage {
	id: number | string
	sender: string
	senderId: string
	text: string
	type?: "normal" | "system"
	timestamp?: number
}

export interface DisplayChatMessage extends ServerChatMessage {
	isSelf: boolean
}

const ClientSocketEvents = {
	...ClientEvents,
	SUBSCRIBE_TO_CHANNEL: "subscribe_to_channel",
	UNSUBSCRIBE_FROM_CHANNEL: "unsubscribe_from_channel",
}

const SERVER_URL = import.meta.env.VITE_API_BASE_URL

interface UseSocketProps {
	onRoomClosed: (reason: string, roomId?: string) => void
	onDisconnected: () => void
}

export const useSocket = ({ onRoomClosed, onDisconnected }: UseSocketProps) => {
	const [messagesByChannel, setMessagesByChannel] = useState<
		Record<string, DisplayChatMessage[]>
	>({})
	const [playersByChannel, setPlayersByChannel] = useState<
		Record<string, Player[]>
	>({})
	const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(
		new Set(),
	)

	const [currentUserId, setCurrentUserId] = useState<string | null>(null)
	const [username, setUsername] = useState<string>(() => {
		return localStorage.getItem("chatroom_username") || ""
	})
	const [isConnected, setIsConnected] = useState(false)

	const socketRef = useRef<Socket | null>(null)
	const isSubscribingRef = useRef<Record<string, boolean>>({})

	const onDisconnectedRef = useRef<(() => void) | undefined>(onDisconnected)

	useEffect(() => {
		if (socketRef.current) return

		console.log(
			"[SOCKET] Creating new Socket.IO instance (persistent connection)",
		)

		const connectionAttempts = { count: 0 }
		const lastResubscribeTime = { time: 0 }

		const newSocket = io(SERVER_URL, {
			reconnectionAttempts: 5,
			timeout: 10000,
			reconnection: true,
			reconnectionDelay: 2000,
		})
		socketRef.current = newSocket

		const handleConnect = () => {
			connectionAttempts.count++
			const now = Date.now()

			console.log(
				`[SOCKET] Connected, ID: ${newSocket.id}, Connection attempt: ${connectionAttempts.count}`,
			)
			setIsConnected(true)

			if (
				now - lastResubscribeTime.time > 5000 &&
				subscribedChannels.size > 0
			) {
				console.log(
					`[SOCKET] Resubscribing to ${subscribedChannels.size} channels after reconnection`,
				)
				lastResubscribeTime.time = now

				setTimeout(() => {
					const channels = Array.from(subscribedChannels)

					console.log(
						`[SOCKET] Channels to resubscribe: ${JSON.stringify(channels)}`,
					)

					channels.forEach(channelId => {
						console.log(`[SOCKET] Resubscribing to channel: ${channelId}`)
						newSocket.emit(ClientSocketEvents.SUBSCRIBE_TO_CHANNEL, {
							roomId: channelId,
							username,
						})
					})
				}, 1000)
			} else if (subscribedChannels.size > 0) {
				console.log(
					`[SOCKET] Skipping resubscribe - too recent (${
						now - lastResubscribeTime.time
					}ms)`,
				)
			}
		}

		const handleDisconnect = (reason: Socket.DisconnectReason) => {
			console.log(`[SOCKET] Disconnected. Reason: ${reason}`)
			setIsConnected(false)

			if (reason !== "io client disconnect") {
				toast.error(`Disconnected: ${reason}`)
				onDisconnectedRef.current?.()
			}
		}

		const handleConnectError = (error: Error) => {
			console.error(`[SOCKET] Connection error: ${error.message}`)
			toast.error(`Connection failed: ${error.message}`)
			setIsConnected(false)
			onDisconnectedRef.current?.()
		}

		newSocket.on("connect", handleConnect)
		newSocket.on("disconnect", handleDisconnect)
		newSocket.on("connect_error", handleConnectError)

		return () => {
			console.log("[SOCKET] Cleaning up main socket connection effect...")
			newSocket.off("connect", handleConnect)
			newSocket.off("disconnect", handleDisconnect)
			newSocket.off("connect_error", handleConnectError)
			if (newSocket.connected) {
				newSocket.disconnect()
			}
			socketRef.current = null
			setIsConnected(false)
		}
	}, [])

	useEffect(() => {
		const socket = socketRef.current
		if (!socket || !isConnected) return

		const handleJoinedRoom = (data: {
			userId: string
			username: string
			players: Player[]
			roomId: string
			history: ServerChatMessage[]
			isReconnection?: boolean
			isDebounced?: boolean
		}) => {
			console.log(
				`[SOCKET] Joined room: ${data.roomId}, as user: ${data.username} (${data.userId})`,
				data.isReconnection
					? "(reconnection)"
					: data.isDebounced
						? "(debounced)"
						: "(new subscription)",
			)

			isSubscribingRef.current[data.roomId] = false

			if (data.isReconnection || data.isDebounced) {
				console.log(
					`[SOCKET] Room ${data.roomId} confirmed: no state update needed`,
				)
				return
			}

			if (!currentUserId) {
				console.log(`[SOCKET] Setting currentUserId: ${data.userId}`)
				setCurrentUserId(data.userId)
			}

			if (!username && data.username) {
				console.log(`[SOCKET] Setting username: ${data.username}`)
				setUsername(data.username)
			}

			const enhancedPlayers = data.players.map(p => ({
				...p,
				isCurrentUser: p.id === data.userId,
				colorKey:
					p.id === data.userId
						? CURRENT_USER_COLOR_KEY
						: getColorKeyForUser(p.id),
			}))

			console.log(
				`[SOCKET] Updating players for channel ${data.roomId}: ${data.players.length} players`,
			)
			setPlayersByChannel(prev => ({
				...prev,
				[data.roomId]: enhancedPlayers,
			}))

			const histMsgs: DisplayChatMessage[] = data.history.map(m => ({
				...m,
				isSelf: m.senderId === data.userId,
				timestamp:
					m.timestamp !== undefined
						? m.timestamp
						: typeof m.id === "number" && m.id > 1e11
							? m.id
							: Date.now(),
			}))

			console.log(
				`[SOCKET] Updating messages for channel ${data.roomId}: ${data.history.length} messages`,
			)
			setMessagesByChannel(prev => ({
				...prev,
				[data.roomId]: histMsgs,
			}))

			console.log(
				`[SOCKET] Adding channel ${data.roomId} to subscribedChannels`,
			)
			setSubscribedChannels(prev => {
				if (!prev.has(data.roomId)) {
					const newSet = new Set(prev)
					newSet.add(data.roomId)
					return newSet
				}
				return prev
			})

			const event = new CustomEvent("channelJoined", {
				detail: {
					channelId: data.roomId,
					isInitialJoin: !subscribedChannels.has(data.roomId),
				},
			})
			window.dispatchEvent(event)
		}

		const handleNewMessage = (
			newMessage: ServerChatMessage & { roomId: string },
		) => {
			console.log(
				`[SOCKET] New message for channel ${newMessage.roomId}: "${newMessage.text}" from ${newMessage.sender}`,
			)
			const displayMsg: DisplayChatMessage = {
				...newMessage,
				isSelf: newMessage.senderId === currentUserId,
			}
			setMessagesByChannel(prev => ({
				...prev,
				[newMessage.roomId]: [...(prev[newMessage.roomId] || []), displayMsg],
			}))
		}

		const handlePlayerJoined = (
			player: Player & { roomId: string; username?: string },
		) => {
			console.log(
				`[SOCKET] Player ${player.name} (${player.id}) joined channel ${player.roomId}`,
			)
			setPlayersByChannel(prev => {
				const currentPlayers = prev[player.roomId] || []
				if (currentPlayers.find(p => p.id === player.id)) return prev
				return {
					...prev,
					[player.roomId]: [
						...currentPlayers,
						{
							...player,
							isCurrentUser: player.id === currentUserId,
							colorKey: getColorKeyForUser(player.id),
						},
					],
				}
			})
		}

		const handlePlayerLeft = (
			player: Player & { roomId: string; username?: string },
		) => {
			console.log(
				`[SOCKET] Player ${player.name} (${player.id}) left channel ${player.roomId}`,
			)
			setPlayersByChannel(prev => {
				const currentPlayers = prev[player.roomId] || []
				return {
					...prev,
					[player.roomId]: currentPlayers.filter(p => p.id !== player.id),
				}
			})
		}

		const handlePlayerListUpdate = (data: {
			players: Player[]
			roomId: string
		}) => {
			console.log(
				`[SOCKET] Player list update for channel ${data.roomId}: ${data.players.length} players`,
			)
			const enhancedPlayers = data.players.map(p => ({
				...p,
				isCurrentUser: p.id === currentUserId,
				colorKey:
					p.id === currentUserId
						? CURRENT_USER_COLOR_KEY
						: getColorKeyForUser(p.id),
			}))
			setPlayersByChannel(prev => ({
				...prev,
				[data.roomId]: enhancedPlayers,
			}))
		}

		const handleRoomClosed = (data: { reason: string; roomId: string }) => {
			console.log(
				`Room closed event for ${data.roomId}! Reason: ${data.reason}`,
			)
			toast.warning(`Chat in ${data.roomId} closed: ${data.reason}`)
			setMessagesByChannel(prev => {
				const newState = { ...prev }
				delete newState[data.roomId]
				return newState
			})
			setPlayersByChannel(prev => {
				const newState = { ...prev }
				delete newState[data.roomId]
				return newState
			})
			setSubscribedChannels(prev => {
				const newSet = new Set(prev)
				newSet.delete(data.roomId)
				return newSet
			})
			onRoomClosed?.(data.reason, data.roomId)
		}

		const handleError = (error: { message: string; details: string }) => {
			toast.error(`${error.message}: ${error.details}`)
			console.error("Server error:", error)
		}

		const handleChannelJoinCommand = (data: {
			channelId: string
			channelName: string
		}) => {
			console.log(
				`[SOCKET] Join command for channel: ${data.channelName} (${data.channelId})`,
			)

			const event = new CustomEvent("channelJoined", {
				detail: {
					channelId: data.channelId,
					isInitialJoin: true,
				},
			})
			window.dispatchEvent(event)
		}

		socket.on(ServerEvents.JOINED_ROOM, handleJoinedRoom)
		socket.on(ServerEvents.NEW_MESSAGE, handleNewMessage)
		socket.on(ServerEvents.PLAYER_JOINED, handlePlayerJoined)
		socket.on(ServerEvents.PLAYER_LEFT, handlePlayerLeft)
		socket.on(ServerEvents.PLAYER_LIST_UPDATE, handlePlayerListUpdate)
		socket.on(ServerEvents.ROOM_CLOSED, handleRoomClosed)
		socket.on(ServerEvents.ERROR, handleError)
		socket.on(ServerEvents.CHANNEL_JOIN_COMMAND, handleChannelJoinCommand)

		return () => {
			console.log("Cleaning up per-channel event listeners...")
			socket.off(ServerEvents.JOINED_ROOM, handleJoinedRoom)
			socket.off(ServerEvents.NEW_MESSAGE, handleNewMessage)
			socket.off(ServerEvents.PLAYER_JOINED, handlePlayerJoined)
			socket.off(ServerEvents.PLAYER_LEFT, handlePlayerLeft)
			socket.off(ServerEvents.PLAYER_LIST_UPDATE, handlePlayerListUpdate)
			socket.off(ServerEvents.ROOM_CLOSED, handleRoomClosed)
			socket.off(ServerEvents.ERROR, handleError)
			socket.off(ServerEvents.CHANNEL_JOIN_COMMAND, handleChannelJoinCommand)
		}
	}, [isConnected, currentUserId, username, onRoomClosed])

	const subscribeToChannel = useCallback(
		(channelId: string, clientUsername?: string) => {
			const socket = socketRef.current
			if (!socket || !isConnected) {
				console.warn(
					`[SOCKET] Cannot subscribe to ${channelId}: Socket not connected.`,
				)
				return
			}

			if (
				isSubscribingRef.current[channelId] ||
				subscribedChannels.has(channelId)
			) {
				console.log(
					`[SOCKET] Already subscribed or subscribing to channel: ${channelId}`,
				)
				return
			}

			console.log(`[SOCKET] Subscribing to channel: ${channelId}`)
			isSubscribingRef.current[channelId] = true

			if (clientUsername && !username) {
				setUsername(clientUsername)
			}

			socket.emit(ClientSocketEvents.SUBSCRIBE_TO_CHANNEL, {
				roomId: channelId,
				username: clientUsername || username,
			})

			setSubscribedChannels(prev => new Set(prev).add(channelId))
		},
		[isConnected, username, subscribedChannels],
	)

	const unsubscribeFromChannel = useCallback(
		(channelId: string) => {
			const socket = socketRef.current
			if (!socket || !isConnected) {
				console.warn(
					`[SOCKET] Cannot unsubscribe from ${channelId}: Socket not connected.`,
				)
				return
			}

			if (!subscribedChannels.has(channelId)) {
				console.log(
					`[SOCKET] Not subscribed to channel: ${channelId}, cannot unsubscribe`,
				)
				return
			}

			console.log(`[SOCKET] Unsubscribing from channel: ${channelId}`)
			socket.emit(ClientSocketEvents.UNSUBSCRIBE_FROM_CHANNEL, {
				roomId: channelId,
			})

			setSubscribedChannels(prev => {
				const newChannels = new Set(prev)
				newChannels.delete(channelId)
				return newChannels
			})
		},
		[isConnected, subscribedChannels],
	)

	const sendMessage = useCallback(
		(channelId: string, text: string) => {
			const socket = socketRef.current
			if (!socket || !isConnected || !text.trim()) return
			if (!subscribedChannels.has(channelId)) {
				console.error(`Cannot send message to ${channelId}, not subscribed.`)
				return
			}
			socket.emit(ClientEvents.SEND_MESSAGE, {
				text,
				roomId: channelId,
			})
		},
		[isConnected, subscribedChannels],
	)

	return {
		isConnected,
		messagesByChannel,
		playersByChannel,
		username,
		currentUserId,
		subscribedChannels,
		subscribeToChannel,
		unsubscribeFromChannel,
		sendMessage,
		socketId: socketRef.current?.id || null,
	}
}

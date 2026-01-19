import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"

import { ClientEvents, ServerEvents } from "@/shared/events"

export interface Player {
	id: string
	name: string
}

const SERVER_URL = import.meta.env.VITE_API_BASE_URL

const ClientSocketEvents = {
	...ClientEvents,
	SUBSCRIBE_TO_CHANNEL: "subscribe_to_channel",
	UNSUBSCRIBE_FROM_CHANNEL: "unsubscribe_from_channel",
}

interface UsernameAvailability {
	status: "idle" | "checking" | "checked"
	isAvailable?: boolean
	error?: string
}

export const useSplashSocket = () => {
	const [isConnected, setIsConnected] = useState(false)
	const [playersByChannel, setPlayersByChannel] = useState<
		Record<string, Player[]>
	>({})
	const socketRef = useRef<Socket | null>(null)
	const [usernameAvailability, setUsernameAvailability] = useState<
		Record<string, UsernameAvailability>
	>({})

	useEffect(() => {
		if (socketRef.current) return

		console.log("[SPLASH-SOCKET] Creating Socket.IO instance for splash screen")

		const newSocket = io(SERVER_URL, {
			reconnectionAttempts: 5,
			timeout: 10000,
			reconnection: true,
			reconnectionDelay: 2000,
		})
		socketRef.current = newSocket

		const handleConnect = () => {
			console.log(`[SPLASH-SOCKET] Connected, ID: ${newSocket.id}`)
			setIsConnected(true)
		}

		const handleDisconnect = (reason: Socket.DisconnectReason) => {
			console.log(`[SPLASH-SOCKET] Disconnected. Reason: ${reason}`)
			setIsConnected(false)
		}

		const handleConnectError = (error: Error) => {
			console.error(`[SPLASH-SOCKET] Connection error: ${error.message}`)
			setIsConnected(false)
		}

		newSocket.on("connect", handleConnect)
		newSocket.on("disconnect", handleDisconnect)
		newSocket.on("connect_error", handleConnectError)

		return () => {
			console.log("[SPLASH-SOCKET] Cleaning up splash socket connection...")
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

		const handleJoinedRoom = (data: { players: Player[]; roomId: string }) => {
			console.log(
				`[SPLASH-SOCKET] Received player list for channel ${data.roomId}`,
			)

			setPlayersByChannel(prev => ({
				...prev,
				[data.roomId]: data.players,
			}))
		}

		const handlePlayerListUpdate = (data: {
			players: Player[]
			roomId: string
		}) => {
			setPlayersByChannel(prev => ({
				...prev,
				[data.roomId]: data.players,
			}))
		}

		const handleUsernameAvailabilityStatus = (data: {
			username: string
			isAvailable: boolean
			error?: string
		}) => {
			console.log(
				`[SPLASH-SOCKET] Received username availability for ${data.username}: ${data.isAvailable}`,
			)
			setUsernameAvailability(prev => ({
				...prev,
				[data.username]: {
					status: "checked",
					isAvailable: data.isAvailable,
					error: data.error,
				},
			}))
		}

		socket.on(ServerEvents.JOINED_ROOM, handleJoinedRoom)
		socket.on(ServerEvents.PLAYER_LIST_UPDATE, handlePlayerListUpdate)
		socket.on(
			ServerEvents.USERNAME_AVAILABILITY_STATUS,
			handleUsernameAvailabilityStatus,
		)

		return () => {
			console.log("[SPLASH-SOCKET] Cleaning up event listeners...")
			socket.off(ServerEvents.JOINED_ROOM, handleJoinedRoom)
			socket.off(ServerEvents.PLAYER_LIST_UPDATE, handlePlayerListUpdate)
			socket.off(
				ServerEvents.USERNAME_AVAILABILITY_STATUS,
				handleUsernameAvailabilityStatus,
			)
		}
	}, [isConnected])

	const subscribeToChannel = useCallback(
		(channelId: string) => {
			if (!socketRef.current || !isConnected) {
				console.warn(
					"[SPLASH-SOCKET] Socket not connected, cannot subscribe to channel.",
				)
				return
			}

			console.log(
				`[SPLASH-SOCKET] Subscribing to channel: ${channelId} for player list`,
			)
			socketRef.current.emit(ClientSocketEvents.SUBSCRIBE_TO_CHANNEL, {
				roomId: channelId,
				username: "visitor",
			})
		},
		[isConnected],
	)

	const checkUsernameAvailability = useCallback(
		(username: string) => {
			if (!socketRef.current || !isConnected) {
				console.warn(
					"[SPLASH-SOCKET] Socket not connected, cannot check username availability.",
				)
				setUsernameAvailability(prev => ({
					...prev,
					[username]: {
						status: "checked",
						isAvailable: false,
						error: "Not connected to server.",
					},
				}))
				return
			}

			console.log(
				`[SPLASH-SOCKET] Checking username availability for: ${username}`,
			)
			setUsernameAvailability(prev => ({
				...prev,
				[username]: { status: "checking" },
			}))
			socketRef.current.emit(ClientSocketEvents.CHECK_USERNAME_AVAILABILITY, {
				username,
			})
		},
		[isConnected],
	)

	return {
		isConnected,
		playersByChannel,
		subscribeToChannel,
		checkUsernameAvailability,
		usernameAvailability,
	}
}

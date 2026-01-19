import { ChevronLeft, Menu, MessageSquare, Hash } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Chat } from "@/app/pages/Chat"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"

const DEFAULT_CHANNELS = ["general", "tech", "philosophy"]

export function ChatChannels() {
	const [selectedChannel, setSelectedChannel] = useState<string>("general")
	const [pinned, setPinned] = useState(() => {
		const stored = localStorage.getItem("chatroom_sidebar_pinned")
		return stored === null ? true : stored === "true"
	})

	const {
		isConnected,
		messagesByChannel,
		playersByChannel,
		subscribedChannels,
		subscribeToChannel,
		sendMessage,
		username,
	} = useSocket({
		onRoomClosed: (reason, roomId) => {
			console.log(`ChatChannels: Room ${roomId} closed, reason: ${reason}`)
		},
		onDisconnected: () => {
			console.log("ChatChannels: Socket disconnected")
		},
	})

	// Track DM channels separately
	const dmChannels = useMemo(() => {
		const dms: { id: string; displayName: string }[] = []
		if (subscribedChannels) {
			subscribedChannels.forEach(channel => {
				if (channel.startsWith("dm_")) {
					// Extract the other user's name from dm_user1_user2 format
					const parts = channel.substring(3).split("_")
					const otherUser = parts.find(
						p => p.toLowerCase() !== username?.toLowerCase(),
					)
					dms.push({
						id: channel,
						displayName: otherUser || parts.join(" & "),
					})
				}
			})
		}
		return dms
	}, [subscribedChannels, username])

	const availableChannels = useMemo(() => {
		const joinedChannels = new Set<string>()

		if (subscribedChannels) {
			subscribedChannels.forEach(channel => {
				// Skip DM channels - they're shown separately
				if (channel.startsWith("dm_")) return

				const normalizedChannel = channel.startsWith("chat_")
					? channel.substring(5)
					: channel
				joinedChannels.add(normalizedChannel)
			})
		}

		DEFAULT_CHANNELS.forEach(channel => joinedChannels.add(channel))

		return Array.from(joinedChannels).sort()
	}, [subscribedChannels])

	useEffect(() => {
		if (isConnected && selectedChannel) {
			// Determine the full channel ID
			let channelId: string
			if (selectedChannel.startsWith("dm_")) {
				channelId = selectedChannel
			} else if (selectedChannel.startsWith("chat_")) {
				channelId = selectedChannel
			} else {
				channelId = `chat_${selectedChannel}`
			}
			subscribeToChannel(channelId)
		}
	}, [isConnected, selectedChannel, subscribeToChannel])

	useEffect(() => {
		const handleChannelJoined = (
			event: CustomEvent<{ channelId: string; isInitialJoin: boolean }>,
		) => {
			const { channelId, isInitialJoin } = event.detail

			if (isInitialJoin) {
				// For DMs, keep the full channel ID; for chat, extract the name
				if (channelId.startsWith("dm_")) {
					setSelectedChannel(channelId)
				} else {
					const cleanChannelName = channelId.startsWith("chat_")
						? channelId.substring(5)
						: channelId
					setSelectedChannel(cleanChannelName)
				}
			}
		}

		window.addEventListener(
			"channelJoined",
			handleChannelJoined as EventListener,
		)

		return () => {
			window.removeEventListener(
				"channelJoined",
				handleChannelJoined as EventListener,
			)
		}
	}, [])

	useEffect(() => {
		console.log("Subscribed channels:", Array.from(subscribedChannels || []))
		console.log("Available channels:", availableChannels)
	}, [subscribedChannels, availableChannels])

	const setPinnedState = (val: boolean) => {
		setPinned(val)
		localStorage.setItem("chatroom_sidebar_pinned", val ? "true" : "false")
	}

	const handleChannelSelect = (channel: string) => {
		if (channel === selectedChannel) return

		setSelectedChannel(channel)

		if (isConnected) {
			let channelId: string
			if (channel.startsWith("dm_")) {
				channelId = channel
			} else if (channel.startsWith("chat_")) {
				channelId = channel
			} else {
				channelId = `chat_${channel}`
			}
			subscribeToChannel(channelId)
		}
	}

	const getChannelId = (channelName: string) => {
		if (channelName.startsWith("dm_")) return channelName
		return channelName.startsWith("chat_") ? channelName : `chat_${channelName}`
	}

	// Start a DM with another user/bot
	const handleStartDM = useCallback(
		(_playerId: string, playerName: string) => {
			if (!username || !isConnected) return

			// Create a consistent DM channel ID by sorting names alphabetically
			const names = [username, playerName].sort()
			const dmChannelId = `dm_${names[0]}_${names[1]}`

			console.log(`Starting DM with ${playerName}, channel: ${dmChannelId}`)

			// Subscribe to the DM channel
			subscribeToChannel(dmChannelId)

			// Select the DM channel
			setSelectedChannel(dmChannelId)
		},
		[username, isConnected, subscribeToChannel],
	)

	// Handle nickname change via /nick command
	const handleEditNickname = useCallback(
		(newNickname: string) => {
			if (!isConnected) return

			// Send a /nick command to the server
			const currentChannelId = getChannelId(selectedChannel)
			sendMessage(currentChannelId, `/nick ${newNickname}`)
		},
		[isConnected, selectedChannel, sendMessage],
	)

	const ChannelSelect = (
		<div className="flex flex-col gap-1 p-4">
			{/* Channels section */}
			<div className="text-xs font-medium text-muted-foreground mb-1">
				Channels
			</div>
			{availableChannels.map(channel => (
				<Button
					key={channel}
					variant={selectedChannel === channel ? "default" : "ghost"}
					className="justify-start h-8"
					onClick={() => {
						handleChannelSelect(channel)
					}}
				>
					<Hash className="size-4 mr-1" />
					{channel}
				</Button>
			))}

			{/* DMs section */}
			{dmChannels.length > 0 && (
				<>
					<div className="text-xs font-medium text-muted-foreground mt-3 mb-1">
						Direct Messages
					</div>
					{dmChannels.map(dm => (
						<Button
							key={dm.id}
							variant={selectedChannel === dm.id ? "default" : "ghost"}
							className="justify-start h-8"
							onClick={() => {
								handleChannelSelect(dm.id)
							}}
						>
							<MessageSquare className="size-4 mr-1" />
							{dm.displayName}
						</Button>
					))}
				</>
			)}
		</div>
	)

	const handleSendMessage = (text: string, channelId: string) => {
		console.log(`Sending message to channel ${channelId}: ${text}`)
		sendMessage(channelId, text)
	}

	if (pinned) {
		return (
			<div className="flex h-screen w-full overflow-hidden">
				<aside className="w-64 border-r shrink-0 flex flex-col">
					<div className="flex items-center justify-between p-4 border-b">
						<h2 className="text-lg font-semibold">Channels</h2>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setPinnedState(false)}
							className="size-6"
						>
							<ChevronLeft className="size-4" />
						</Button>
					</div>
					{ChannelSelect}
				</aside>
				<div className="flex-1 h-full">
					<Chat
						padForMenu={false}
						messages={messagesByChannel[getChannelId(selectedChannel)] || []}
						players={playersByChannel[getChannelId(selectedChannel)] || []}
						onSendMessage={(text: string) =>
							handleSendMessage(text, getChannelId(selectedChannel))
						}
						usernameFromHook={username || ""}
						isConnected={isConnected}
						onStartDM={handleStartDM}
						onEditNickname={handleEditNickname}
					/>
				</div>
			</div>
		)
	}

	if (!selectedChannel) {
		return (
			<div className="flex flex-col items-center justify-center h-screen w-screen gap-4 bg-background text-foreground">
				<h1 className="text-3xl font-bold">Select a Channel</h1>
				{ChannelSelect}
			</div>
		)
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="absolute top-3.5 left-3 z-20"
				onClick={() => setPinnedState(true)}
			>
				<Menu className="size-5" />
				<span className="sr-only">Open sidebar</span>
			</Button>

			<Chat
				padForMenu={true}
				messages={messagesByChannel[getChannelId(selectedChannel)] || []}
				players={playersByChannel[getChannelId(selectedChannel)] || []}
				onSendMessage={(text: string) =>
					handleSendMessage(text, getChannelId(selectedChannel))
				}
				usernameFromHook={username || ""}
				isConnected={isConnected}
				onStartDM={handleStartDM}
				onEditNickname={handleEditNickname}
			/>
		</>
	)
}

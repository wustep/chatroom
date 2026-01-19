import { ChevronLeft, Menu } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Chat } from "@/app/pages/Chat"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"

interface ChatChannelsProps {
	handleReturnToSplash: () => void
}

const DEFAULT_CHANNELS = ["general", "tech", "philosophy"]

export function ChatChannels({ handleReturnToSplash }: ChatChannelsProps) {
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

	const availableChannels = useMemo(() => {
		const joinedChannels = new Set<string>()

		if (subscribedChannels) {
			subscribedChannels.forEach(channel => {
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
			const channelId = selectedChannel.startsWith("chat_")
				? selectedChannel
				: `chat_${selectedChannel}`
			subscribeToChannel(channelId)
		}
	}, [isConnected, selectedChannel, subscribeToChannel])

	useEffect(() => {
		const handleChannelJoined = (
			event: CustomEvent<{ channelId: string; isInitialJoin: boolean }>,
		) => {
			const { channelId, isInitialJoin } = event.detail

			if (isInitialJoin) {
				const cleanChannelName = channelId.startsWith("chat_")
					? channelId.substring(5)
					: channelId

				setSelectedChannel(cleanChannelName)
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
			const channelId = channel.startsWith("chat_")
				? channel
				: `chat_${channel}`
			subscribeToChannel(channelId)
		}
	}

	const getChannelId = (channelName: string) => {
		return channelName.startsWith("chat_") ? channelName : `chat_${channelName}`
	}

	const ChannelSelect = (
		<div className="flex flex-col gap-2 p-4">
			{availableChannels.map(channel => (
				<Button
					key={channel}
					variant={selectedChannel === channel ? "default" : "ghost"}
					className="justify-start"
					onClick={() => {
						handleChannelSelect(channel)
					}}
				>
					#{channel}
				</Button>
			))}
			<hr className="my-2" />
			<Button variant="secondary" onClick={handleReturnToSplash}>
				Back
			</Button>
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
			/>
		</>
	)
}

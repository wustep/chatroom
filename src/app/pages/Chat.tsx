import { useCallback, useEffect, useRef, useState } from "react"

import { ChatContainer } from "@/components/chat/ChatContainer"
import { ChatInputBox } from "@/components/chat/ChatInputBox"
import { PlayersContainer } from "@/components/chat/PlayersContainer"
import { DisplayChatMessage, Player } from "@/hooks/useSocket"
import { getColorKeyForUser } from "@/lib/colors"

interface ChatProps {
	padForMenu?: boolean

	// Props passed from parent (e.g., ChatChannels)
	isConnected?: boolean
	usernameFromHook?: string
	currentUserIdFromHook?: string | null
	messages?: DisplayChatMessage[]
	players?: Player[]
	onSendMessage?: (text: string) => void
}

export function Chat({
	padForMenu = false,

	// Props from parent
	isConnected = false,
	usernameFromHook = "",
	currentUserIdFromHook = null,
	messages = [],
	players = [],
	onSendMessage,
}: ChatProps) {
	// Local UI state
	const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({})
	const showPlayers = true
	const [scrollToBottom, setScrollToBottom] = useState(true)
	const scrollAreaRef = useRef<HTMLDivElement | null>(null)

	const username = usernameFromHook

	const handleSendMessage = (text: string) => {
		if (onSendMessage) {
			onSendMessage(text)
			setScrollToBottom(true) // Auto-scroll when user sends a message
		}
	}

	// Detect when user scrolls up to disable auto-scroll
	const handleScroll = () => {
		if (scrollAreaRef.current) {
			const viewport =
				scrollAreaRef.current.querySelector<HTMLDivElement>(
					"div[data-radix-scroll-area-viewport]",
				) || scrollAreaRef.current
			if (viewport) {
				const { scrollTop, scrollHeight, clientHeight } = viewport
				// If user scrolls up more than 100px from bottom, disable auto-scroll
				setScrollToBottom(scrollHeight - scrollTop - clientHeight < 100)
			}
		}
	}

	// Scroll to bottom when messages change, but only if autoScroll is enabled
	useEffect(() => {
		if (scrollAreaRef.current && scrollToBottom) {
			const viewport =
				scrollAreaRef.current.querySelector<HTMLDivElement>(
					"div[data-radix-scroll-area-viewport]",
				) || scrollAreaRef.current
			if (viewport) {
				viewport.scrollTop = viewport.scrollHeight
			}
		}
	}, [messages, scrollToBottom])

	const handlePlayerNoteChange = (playerId: string, note: string) => {
		setPlayerNotes(prev => ({
			...prev,
			[playerId]: note,
		}))
	}

	// Update player notes when players list changes (e.g., player leaves)
	useEffect(() => {
		const currentPlayerIds = new Set(players.map(p => p.id))
		setPlayerNotes(prevNotes => {
			const newNotes: Record<string, string> = {}
			for (const playerId in prevNotes) {
				if (currentPlayerIds.has(playerId)) {
					newNotes[playerId] = prevNotes[playerId]
				}
			}
			return newNotes
		})
	}, [players])

	// Get the player object for a message sender if available
	const getPlayerForMessage = useCallback(
		(senderId: string): Player => {
			const player = players.find(p => p.id === senderId)
			if (player) return player

			if (senderId === "system") {
				return {
					id: "system",
					name: "System",
					colorKey: "slate", // Consistent color for system messages
				}
			}

			// Fallback for unknown/left players
			return {
				id: senderId,
				name: "Unknown", // Indicate unknown sender
				colorKey: getColorKeyForUser(senderId),
			}
		},
		[players],
	)

	return (
		<div className="flex h-full w-full flex-col bg-card">
			<div className="flex flex-1 overflow-hidden">
				{/* Main Chat Area */}
				<div className="flex-1 relative z-0 overflow-hidden">
					<ChatContainer
						messages={messages || []}
						username={username}
						isConnected={isConnected}
						players={players || []}
						scrollAreaRef={scrollAreaRef}
						onScroll={handleScroll}
						getPlayerForMessage={getPlayerForMessage}
						disabled={!isConnected}
						padForMenu={padForMenu}
					>
						<ChatInputBox
							onSendMessage={handleSendMessage}
							disabled={!isConnected}
						/>
					</ChatContainer>
				</div>

				{/* Player List Sidebar */}
				{showPlayers && (
					<div className="relative z-10">
						<PlayersContainer
							players={players}
							playerNotes={playerNotes}
							onNoteChange={handlePlayerNoteChange}
							disabled={!isConnected}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

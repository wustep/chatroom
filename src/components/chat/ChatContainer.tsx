import { ChatMessage } from "./ChatMessage"
import { ReactNode, RefObject } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"

interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	isAI?: boolean
}

interface Message {
	id: number | string
	sender: string
	senderId: string
	text: string
	type?: "normal" | "system"
	isSelf: boolean
}

interface ChatContainerProps {
	messages: Message[]
	username?: string
	isConnected: boolean
	players: Player[]
	scrollAreaRef: RefObject<HTMLDivElement | null>
	onScroll: () => void
	getPlayerForMessage: (senderId: string) => Player
	disabled?: boolean
	children?: ReactNode
	headerRightContent?: ReactNode
	padForMenu?: boolean
}

export function ChatContainer({
	messages,
	username,
	isConnected: _isConnected,
	players,
	scrollAreaRef,
	onScroll,
	getPlayerForMessage,
	disabled = false,
	children,
	headerRightContent,
	padForMenu = false,
}: ChatContainerProps) {
	return (
		<div
			className={`flex flex-col flex-1 h-full overflow-hidden ${
				disabled ? "opacity-75" : ""
			}`}
		>
			<header
				className={`p-4 border-b flex justify-between items-center shrink-0 ${
					padForMenu ? "pl-13" : "pl-4"
				}`}
			>
				<h2 className="text-lg font-semibold">Chat</h2>
				<div className="flex items-center space-x-2">
					{username && (
						<span className="text-sm text-muted-foreground">
							You are: <strong>{username}</strong>
						</span>
					)}
					{headerRightContent}
				</div>
			</header>

			{/* Message Display Area - Fixed height with scroll */}
			<div className="flex-1 overflow-hidden flex flex-col relative">
				<ScrollArea
					className="flex-1 p-4 absolute inset-0 h-full pb-0"
					ref={scrollAreaRef}
					onScroll={onScroll}
				>
					<style>
						{`
        [data-radix-scroll-area-viewport] > div {
            display:block !important;
        }
        `}
					</style>
					<div className="space-y-4 pb-2 min-h-full">
						{messages.map(msg => (
							<ChatMessage
								key={msg.id}
								message={msg}
								isSelf={msg.isSelf}
								player={getPlayerForMessage(msg.senderId)}
								players={players}
							/>
						))}
					</div>
				</ScrollArea>
			</div>

			{/* Input area - passed as children */}
			{children}
		</div>
	)
}

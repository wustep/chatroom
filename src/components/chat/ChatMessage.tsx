import { format, isToday, isYesterday } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import {
	getAvatarClass,
	getBorderClass,
	getMircNicknameColor,
	getTextClass,
} from "@/lib/colors"
import { processMentions } from "@/lib/mentions"
import { cn } from "@/lib/utils"
import { useTheme } from "@/styles/themes/ThemeContext"

interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	isAI?: boolean
	bio?: string
}

interface ChatMessageProps {
	message: {
		id: number | string
		sender: string
		senderId: string
		text: string
		type?: "normal" | "system" | "error"
		timestamp?: number | Date // Unix timestamp or Date object
	}
	isSelf: boolean
	player: Player
	players: Player[] // All players in the room for mention validation
}

export function ChatMessage({
	message,
	isSelf,
	player,
	players,
}: ChatMessageProps) {
	const { theme } = useTheme()

	// Special handling for system messages
	if (message.type === "system") {
		// Display all system messages with special styling
		return (
			<div className="flex justify-center my-2 opacity-80 text-sm">
				<div className="px-3 py-1 bg-muted rounded-md max-w-[85%] text-center break-words wrap-anywhere">
					{processMentions(message.text, players)}
				</div>
			</div>
		)
	}

	// Special handling for error messages
	if (message.type === "error") {
		// Display all error messages with special styling
		return (
			<div className="flex justify-center my-2 text-sm">
				<div className="px-3 py-1 bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md max-w-[85%] text-center font-medium break-words wrap-anywhere">
					{processMentions(message.text, players)}
				</div>
			</div>
		)
	}

	const avatarClass = getAvatarClass(player.colorKey)
	const textClass = getTextClass(player.colorKey)
	const borderClass = getBorderClass(player.colorKey)

	if (theme === "mirc") {
		const timeString = formatTimestamp(message.timestamp, "HH:mm")
		const nicknameColor = getMircNicknameColor(player.colorKey)
		return (
			<div className="flex flex-row gap-2 overflow-hidden">
				<span className="shrink-0">[{timeString}]</span>
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							className="shrink-0 cursor-pointer hover:underline"
							style={{ color: nicknameColor }}
						>{`<${message.sender}>`}</span>
					</TooltipTrigger>
					{player.bio && (
						<TooltipContent side="top" className="max-w-[200px]">
							<p className="text-sm">{player.bio}</p>
						</TooltipContent>
					)}
				</Tooltip>
				<span className="break-words wrap-anywhere overflow-hidden">
					{processMentions(message.text, players)}
				</span>
			</div>
		)
	}

	return (
		<div
			className={`flex ${
				isSelf ? "justify-end items-end" : "justify-start items-end"
			} gap-2 group w-full overflow-hidden min-w-0`}
		>
			{!isSelf && (
				<Avatar className="h-8 w-8 flex items-center justify-center shrink-0">
					<AvatarFallback
						className={cn(
							"text-white h-full w-full flex items-center justify-center",
							avatarClass,
						)}
					>
						{message.sender.substring(0, 2)}
					</AvatarFallback>
				</Avatar>
			)}
			<div
				className={cn(
					"rounded-lg px-3 py-2 max-w-[66.67%] relative break-words overflow-hidden min-w-0",
					isSelf ? "bg-primary text-primary-foreground" : "bg-muted border-l-2",
					!isSelf && borderClass,
				)}
			>
				{!isSelf && (
					<Tooltip>
						<TooltipTrigger asChild>
							<p
								className={cn(
									"text-xs font-medium mb-1 cursor-pointer hover:underline w-fit",
									textClass,
								)}
							>
								{message.sender}
							</p>
						</TooltipTrigger>
						{player.bio && (
							<TooltipContent side="top" className="max-w-[200px]">
								<p className="text-sm">{player.bio}</p>
							</TooltipContent>
						)}
					</Tooltip>
				)}
				<p className="text-sm break-words wrap-anywhere whitespace-pre-wrap overflow-hidden">
					{processMentions(message.text, players)}
				</p>

				{message.timestamp && (
					<span
						className={cn(
							"absolute opacity-0 group-hover:opacity-100 text-xs text-muted-foreground px-2 transition-opacity top-1/2 -translate-y-1/2",
							isSelf ? "left-0 -translate-x-full" : "right-0 translate-x-full",
						)}
					>
						{formatMessageTime(message.timestamp)}
					</span>
				)}
			</div>
			{isSelf && (
				<Avatar className="h-8 w-8 flex items-center justify-center shrink-0">
					<AvatarFallback
						className={cn(
							"text-white h-full w-full flex items-center justify-center",
							avatarClass,
						)}
					>
						{message.sender.substring(0, 2)}
					</AvatarFallback>
				</Avatar>
			)}
		</div>
	)
}

function formatTimestamp(
	timestamp: number | Date | undefined,
	formatString: string,
): string {
	if (!timestamp) return ""
	const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp
	try {
		return format(date, formatString)
	} catch (error) {
		console.error("Error formatting date:", error)
		return "??:??" // Fallback
	}
}

/**
 * Formats a timestamp in a user-friendly way:
 * - Today: "Today 7:39 PM"
 * - Yesterday: "Yesterday 3:12 PM"
 * - Within a week: "Tuesday 3:12 PM"
 * - Older: "Jan 5, 2023 3:12 PM"
 */
function formatMessageTime(timestamp: number | Date | undefined): string {
	if (!timestamp) return ""

	const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp

	if (isToday(date)) {
		return `Today ${format(date, "h:mm a")}`
	} else if (isYesterday(date)) {
		return `Yesterday ${format(date, "h:mm a")}`
	} else if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
		// Within last 7 days
		return format(date, "EEEE h:mm a") // e.g. "Tuesday 3:12 PM"
	} else {
		return format(date, "MMM d, yyyy h:mm a") // e.g. "Jan 5, 2023 3:12 PM"
	}
}

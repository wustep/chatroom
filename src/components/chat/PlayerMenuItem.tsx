import { Bot, User } from "lucide-react"
import React from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getAvatarClass, getTextClass } from "@/lib/colors"
import { cn } from "@/lib/utils"
import { useTheme } from "@/styles/themes/ThemeContext"

interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	isAI?: boolean
}

interface PlayerMenuItemProps {
	player: Player
	disabled?: boolean
	showAIIndicator?: boolean
	rightAddons?: React.ReactNode
}

export const PlayerMenuItem: React.FC<PlayerMenuItemProps> = ({
	player,
	disabled = false,
	showAIIndicator = false,
	rightAddons,
}) => {
	const { theme } = useTheme()

	const avatarClass = getAvatarClass(player.colorKey)
	const textClass = getTextClass(player.colorKey)
	const isAI = showAIIndicator && player.isAI

	const shouldShowAvatar = theme !== "mirc"
	return (
		<Button
			variant="ghost"
			className="w-full flex items-center justify-start gap-3 text-sm text-muted-foreground h-auto p-2"
			disabled={disabled}
		>
			{shouldShowAvatar && (
				<Avatar className="h-8 w-8 flex items-center justify-center shrink-0">
					<AvatarFallback
						className={cn(
							"text-white h-full w-full flex items-center justify-center",
							avatarClass,
						)}
					>
						{player.name.substring(0, 2)}
					</AvatarFallback>
				</Avatar>
			)}
			<div className="flex items-center gap-1">
				<span className={textClass}>{player.name}</span>
				{isAI ? (
					<Bot size={14} className="ml-1 text-amber-500" />
				) : (
					<User size={14} className="ml-1 text-muted-foreground" />
				)}
			</div>

			{/* Render right addons if provided */}
			{rightAddons && <div className="ml-auto">{rightAddons}</div>}
		</Button>
	)
}

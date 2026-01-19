import { Label } from "@radix-ui/react-label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@radix-ui/react-popover"
import React from "react"

import { PlayerMenuItem } from "@/components/chat/PlayerMenuItem"
import { Textarea } from "@/components/ui/textarea"

interface Player {
	id: string
	name: string
	isCurrentUser?: boolean
	colorKey: string
	isAI?: boolean
	bio?: string
	persona?: {
		profile: string
		personality?: {
			traits: string[]
			communicationStyle: string
			interests: string[]
			background: string
			typingPatterns: string
			commonPhrases: string[]
			emojiUsage: string
			gameStrategy: string
		}
	}
}

interface PlayersContainerProps {
	players: Player[]
	playerNotes: Record<string, string>
	onNoteChange: (playerName: string, note: string) => void
	disabled?: boolean
	isPlayground?: boolean
	onAddSimulatedPlayer?: () => void
	showAIIndicators?: boolean
	onAddHumanPlayer?: () => void
	renderItem?: (player: Player) => React.ReactNode
	right?: React.ReactNode
}

export function PlayersContainer({
	players,
	playerNotes,
	onNoteChange,
	disabled = false,
	isPlayground = false,
	showAIIndicators = false,
	renderItem,
	right,
}: PlayersContainerProps) {
	return (
		<div className="w-64 flex flex-col border-l h-full shrink-0">
			<div className="border-b shrink-0 flex flex-row items-center h-12 justify-between">
				<h3 className="text-sm font-medium p-3">Players ({players.length})</h3>
				{right}
			</div>
			<div className="flex-1 overflow-auto">
				<div className="p-4">
					<ul className="space-y-1">
						{players.map(player => (
							<li key={player.id}>
								{renderItem ? (
									renderItem(player)
								) : (
									<Popover>
										<PopoverTrigger asChild>
											{/* Button now just contains the main player info */}
											<PlayerMenuItem
												player={player}
												disabled={disabled}
												showAIIndicator={isPlayground || showAIIndicators}
											/>
										</PopoverTrigger>
										{/* Popover content with bio and notes */}
										<PopoverContent className="w-64 p-3">
											<div className="grid gap-3">
												<div className="font-medium text-sm">
													{player.name}
												</div>
												{player.bio && (
													<div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
														{player.bio}
													</div>
												)}
												{!player.bio && !player.isAI && (
													<div className="text-xs text-muted-foreground italic">
														No bio set. Use /bio to set one.
													</div>
												)}
												<div className="border-t pt-2">
													<Label
														htmlFor={`notes-${player.id}`}
														className="text-xs font-medium"
													>
														Your notes
													</Label>
													<Textarea
														id={`notes-${player.id}`}
														placeholder={`Private notes on ${player.name}...`}
														value={playerNotes[player.name] || ""}
														onChange={e =>
															onNoteChange(player.name, e.target.value)
														}
														className="h-20 text-sm resize-none mt-1"
														disabled={disabled}
													/>
												</div>
											</div>
										</PopoverContent>
									</Popover>
								)}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}

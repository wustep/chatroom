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
										{/* Popover content remains the same */}
										<PopoverContent className="w-56 p-3">
											<div className="grid gap-2">
												<div className="flex items-center justify-between">
													<Label
														htmlFor={`notes-${player.id}`}
														className="text-xs font-medium"
													>
														Notes on {player.name}
													</Label>
												</div>
												<Textarea
													id={`notes-${player.id}`}
													placeholder={`What are your thoughts on ${player.name}?`}
													value={playerNotes[player.name] || ""}
													onChange={e =>
														onNoteChange(player.name, e.target.value)
													}
													className="h-24 text-sm resize-none"
													disabled={disabled}
												/>
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

import { Label } from "@radix-ui/react-label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@radix-ui/react-popover"
import { MessageSquare, Pencil } from "lucide-react"
import React, { useState } from "react"

import { PlayerMenuItem } from "@/components/chat/PlayerMenuItem"
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
	onStartDM?: (playerId: string, playerName: string) => void
	onEditNickname?: (newNickname: string) => void
	currentUsername?: string
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
	onStartDM,
	onEditNickname,
	currentUsername,
}: PlayersContainerProps) {
	const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
	const [newNickname, setNewNickname] = useState(currentUsername || "")

	const handleEditNickname = () => {
		if (newNickname.trim() && onEditNickname) {
			onEditNickname(newNickname.trim())
			setNicknameDialogOpen(false)
		}
	}

	const PlayerPopoverContent = ({ player }: { player: Player }) => (
		<div className="grid gap-3">
			<div className="font-medium text-sm">{player.name}</div>
			{player.bio && (
				<div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
					{player.bio}
				</div>
			)}
			{!player.bio && player.isCurrentUser && (
				<div className="text-xs text-muted-foreground italic">
					No bio set. Use /bio to set one.
				</div>
			)}

			{/* Action buttons for mobile */}
			<div className="flex gap-2 border-t pt-2">
				{player.isCurrentUser ? (
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => {
							setNewNickname(currentUsername || player.name)
							setNicknameDialogOpen(true)
						}}
					>
						<Pencil className="size-4 mr-1" />
						Edit Nickname
					</Button>
				) : (
					<Button
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={() => onStartDM?.(player.id, player.name)}
					>
						<MessageSquare className="size-4 mr-1" />
						Send DM
					</Button>
				)}
			</div>

			<div className="border-t pt-2">
				<Label htmlFor={`notes-${player.id}`} className="text-xs font-medium">
					Your notes
				</Label>
				<Textarea
					id={`notes-${player.id}`}
					placeholder={`Private notes on ${player.name}...`}
					value={playerNotes[player.name] || ""}
					onChange={e => onNoteChange(player.name, e.target.value)}
					className="h-20 text-sm resize-none mt-1"
					disabled={disabled}
				/>
			</div>
		</div>
	)

	return (
		<>
			<div className="w-64 flex flex-col border-l h-full shrink-0">
				<div className="border-b shrink-0 flex flex-row items-center h-12 justify-between">
					<h3 className="text-sm font-medium p-3">
						Players ({players.length})
					</h3>
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
										<ContextMenu>
											<Popover>
												<ContextMenuTrigger asChild>
													<PopoverTrigger asChild>
														<PlayerMenuItem
															player={player}
															disabled={disabled}
															showAIIndicator={isPlayground || showAIIndicators}
														/>
													</PopoverTrigger>
												</ContextMenuTrigger>
												{/* Popover content for mobile/touch */}
												<PopoverContent className="w-64 p-3">
													<PlayerPopoverContent player={player} />
												</PopoverContent>
											</Popover>
											{/* Context menu for desktop right-click */}
											<ContextMenuContent className="w-48">
												<div className="px-2 py-1.5 text-sm font-medium">
													{player.name}
												</div>
												<ContextMenuSeparator />
												{player.isCurrentUser ? (
													<ContextMenuItem
														onClick={() => {
															setNewNickname(currentUsername || player.name)
															setNicknameDialogOpen(true)
														}}
													>
														<Pencil className="size-4 mr-2" />
														Edit Nickname
													</ContextMenuItem>
												) : (
													<ContextMenuItem
														onClick={() => onStartDM?.(player.id, player.name)}
													>
														<MessageSquare className="size-4 mr-2" />
														Send DM
													</ContextMenuItem>
												)}
											</ContextMenuContent>
										</ContextMenu>
									)}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			{/* Nickname edit dialog */}
			<Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Nickname</DialogTitle>
						<DialogDescription>
							Change your display name in the chat. This will update how others
							see you.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={newNickname}
						onChange={e => setNewNickname(e.target.value)}
						placeholder="Enter new nickname"
						onKeyDown={e => {
							if (e.key === "Enter") {
								handleEditNickname()
							}
						}}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setNicknameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleEditNickname}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

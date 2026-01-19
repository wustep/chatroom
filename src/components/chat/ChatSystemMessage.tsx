interface ChatSystemMessageProps {
	text: string
}

export function ChatSystemMessage({ text }: ChatSystemMessageProps) {
	return (
		<div className="flex justify-center">
			<p className="text-xs text-muted-foreground py-1">{text}</p>
		</div>
	)
}

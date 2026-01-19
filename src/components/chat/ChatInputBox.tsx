import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatInputBoxProps {
	disabled?: boolean
	onSendMessage: (message: string) => void
}

export function ChatInputBox({
	disabled = false,
	onSendMessage,
}: ChatInputBoxProps) {
	const [currentMessage, setCurrentMessage] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	const handleSendMessage = () => {
		const trimmedMessage = currentMessage.trim()
		if (!trimmedMessage) return

		onSendMessage(trimmedMessage)
		setCurrentMessage("")
	}

	useEffect(() => {
		if (!disabled && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus()
			}, 0)
		}
	}, [disabled])

	return (
		<div className="p-4 flex gap-2 shrink-0 border-t bg-background z-10">
			<Input
				placeholder={disabled ? "Connecting..." : "Type your message..."}
				value={currentMessage}
				onChange={e => setCurrentMessage(e.target.value)}
				onKeyPress={e => {
					if (e.key === "Enter") {
						handleSendMessage()
					}
				}}
				ref={inputRef}
				disabled={disabled}
				className="flex-1"
			/>
			<Button
				onClick={handleSendMessage}
				disabled={!currentMessage.trim() || disabled}
			>
				Send
			</Button>
		</div>
	)
}

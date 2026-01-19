import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 10000 // 10 seconds
const MAX_MESSAGES_PER_WINDOW = 5 // 5 messages per window

interface ChatInputBoxProps {
	disabled?: boolean
	onSendMessage: (message: string) => void
}

export function ChatInputBox({
	disabled = false,
	onSendMessage,
}: ChatInputBoxProps) {
	const [currentMessage, setCurrentMessage] = useState("")
	const [isRateLimited, setIsRateLimited] = useState(false)
	const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const messageTimestampsRef = useRef<number[]>([])
	const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	)

	// Clean up old timestamps and check rate limit
	const checkRateLimit = useCallback(() => {
		const now = Date.now()
		const windowStart = now - RATE_LIMIT_WINDOW_MS

		// Remove timestamps outside the current window
		messageTimestampsRef.current = messageTimestampsRef.current.filter(
			ts => ts > windowStart,
		)

		// Check if we're at the limit
		return messageTimestampsRef.current.length >= MAX_MESSAGES_PER_WINDOW
	}, [])

	const handleSendMessage = () => {
		const trimmedMessage = currentMessage.trim()
		if (!trimmedMessage) return

		// Check rate limit (but allow commands to bypass)
		if (!trimmedMessage.startsWith("/") && checkRateLimit()) {
			// Calculate time until the oldest message expires
			const oldestTimestamp = messageTimestampsRef.current[0]
			const timeUntilExpiry = oldestTimestamp + RATE_LIMIT_WINDOW_MS - Date.now()
			const secondsRemaining = Math.ceil(timeUntilExpiry / 1000)

			setIsRateLimited(true)
			setRateLimitCountdown(secondsRemaining)

			toast.warning(`Slow down! You can send another message in ${secondsRemaining}s`, {
				duration: 2000,
			})

			// Start countdown
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current)
			}
			countdownIntervalRef.current = setInterval(() => {
				setRateLimitCountdown(prev => {
					if (prev <= 1) {
						setIsRateLimited(false)
						if (countdownIntervalRef.current) {
							clearInterval(countdownIntervalRef.current)
							countdownIntervalRef.current = null
						}
						return 0
					}
					return prev - 1
				})
			}, 1000)

			return
		}

		// Record this message timestamp (only for non-commands)
		if (!trimmedMessage.startsWith("/")) {
			messageTimestampsRef.current.push(Date.now())
		}

		onSendMessage(trimmedMessage)
		setCurrentMessage("")
	}

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current)
			}
		}
	}, [])

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
				disabled={!currentMessage.trim() || disabled || isRateLimited}
			>
				{isRateLimited ? `Wait ${rateLimitCountdown}s` : "Send"}
			</Button>
		</div>
	)
}

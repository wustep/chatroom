import { AlertCircle, Bot, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSplashSocket } from "@/hooks/useSplashSocket"

export interface SplashProps {
	onJoinChat: () => void
}

export function Splash({ onJoinChat }: SplashProps) {
	const [name, setName] = useState<string>("")
	const [error, setError] = useState<string | null>(null)
	const [checkingName, setCheckingName] = useState(false)
	const [isConnectingOrJustConnected, setIsConnectingOrJustConnected] =
		useState(true)

	const { isConnected, checkUsernameAvailability, usernameAvailability } =
		useSplashSocket()

	useEffect(() => {
		const stored = localStorage.getItem("chatroom_username") || ""
		setName(stored)
		if (isConnected) {
			const timer = setTimeout(
				() => setIsConnectingOrJustConnected(false),
				1000,
			)
			return () => clearTimeout(timer)
		}
	}, [])

	useEffect(() => {
		if (isConnected) {
			const timer = setTimeout(
				() => setIsConnectingOrJustConnected(false),
				1000,
			)
			return () => clearTimeout(timer)
		} else {
			setIsConnectingOrJustConnected(true)
		}
	}, [isConnected])

	useEffect(() => {
		if (name.trim().length === 0) {
			setError(null)
			setCheckingName(false)
			return
		}

		if (!isConnected) {
			setCheckingName(false)
			return
		}

		setError(null)
		setCheckingName(true)

		const handler = setTimeout(() => {
			checkUsernameAvailability(name)
		}, 500)

		return () => {
			clearTimeout(handler)
		}
	}, [name, isConnected, checkUsernameAvailability])

	useEffect(() => {
		const currentAvailability = usernameAvailability[name]

		if (currentAvailability) {
			if (currentAvailability.status === "checking") {
				setCheckingName(true)
				setError(null)
			} else if (currentAvailability.status === "checked") {
				setCheckingName(false)
				if (!currentAvailability.isAvailable) {
					setError(
						currentAvailability.error ||
							`Username "${name}" is unavailable. Please choose another.`,
					)
				} else {
					setError(null)
				}
			}
		} else if (!isConnected) {
			setError(null)
		}
	}, [name, usernameAvailability, isConnected])

	const handleAttemptJoin = () => {
		if (name.trim().length === 0) {
			setError("Username cannot be empty.")
			return
		}

		if (!isConnected) {
			return
		}

		if (checkingName) {
			return
		}

		if (error) {
			return
		}

		const currentStatus = usernameAvailability[name]
		if (
			currentStatus &&
			currentStatus.status === "checked" &&
			currentStatus.isAvailable
		) {
			onJoinChat()
		} else {
			setCheckingName(true)
			setError(null)
			checkUsernameAvailability(name)
		}
	}

	const handleJoinChat = () => handleAttemptJoin()

	const showButtonSpinner = !isConnected && name.trim().length > 0

	const buttonsActuallyDisabled =
		name.trim().length === 0 || !isConnected || !!error

	return (
		<div className="flex flex-col items-center w-full max-w-sm mx-auto text-center p-8 rounded-xl gap-6 border shadow-md bg-card">
			<Bot
				className={`h-16 w-16 transition-colors ${
					error
						? "text-destructive animate-pulse"
						: !isConnected || isConnectingOrJustConnected
							? "text-muted-foreground animate-bounce"
							: "text-primary animate-bounce"
				}`}
			/>
			<h1 className="text-4xl font-bold">Chatroom</h1>

			<form
				className="w-full space-y-5"
				onSubmit={e => {
					e.preventDefault()
					handleJoinChat()
				}}
			>
				<div className="space-y-2 text-left">
					<Label htmlFor="username" className="text-sm font-medium">
						Username
					</Label>
					<Input
						id="username"
						placeholder="Enter your username"
						value={name}
						onChange={e => {
							setName(e.target.value)
							setError(null)
							localStorage.setItem("chatroom_username", e.target.value)
						}}
						className={
							error ? "border-destructive ring-destructive/30 ring-2" : ""
						}
						aria-invalid={!!error}
						autoComplete="off"
					/>
				</div>

				<div className="space-y-3 pt-2">
					<Button
						className="w-full"
						size="lg"
						disabled={buttonsActuallyDisabled}
						type="submit"
					>
						{showButtonSpinner ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							"Join"
						)}
					</Button>

					{error && (
						<Alert
							variant="destructive"
							className="py-2 px-3 mt-3 bg-destructive/10 border-destructive"
						>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription className="text-sm break-words">
								{error}
							</AlertDescription>
						</Alert>
					)}
				</div>
			</form>
		</div>
	)
}

import { useState } from "react"
import { Toaster } from "sonner"

import { ChatChannels } from "@/app/pages/ChatChannels"
import { Splash } from "@/app/pages/Splash"
import { ThemeProvider } from "@/app/theme/ThemeProvider"
import { useThemeLoaded } from "@/app/theme/useThemeLoaded"

enum Page {
	Splash,
	Chat,
}

function AppContent() {
	const [page, setPage] = useState<Page>(Page.Splash)
	const themeLoaded = useThemeLoaded()

	if (!themeLoaded) {
		return <div className="h-screen w-screen bg-background" />
	}

	const handleJoinChat = () => {
		setPage(Page.Chat)
	}

	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
			{page === Page.Splash && <Splash onJoinChat={handleJoinChat} />}
			{page === Page.Chat && <ChatChannels />}
		</div>
	)
}

function App() {
	return (
		<ThemeProvider>
			<AppContent />
			<Toaster />
		</ThemeProvider>
	)
}

export default App

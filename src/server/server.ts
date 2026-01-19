/**
 * Main entry point for the Chatroom server
 */
import cors from "cors"
import express from "express"
import http from "http"

import { personas as allPersonas } from "@/lib/personas"
import { ModelProvider } from "@/server/ai/ModelProvider"
import { checkRoomInactivity } from "@/server/core/rooms"
import { activeUsernames, rooms } from "@/server/core/state"
import usageRouter from "@/server/routes/usage"
import { setupSocketIO } from "@/server/socket"
import { debugLog, logRoomStats } from "@/server/utils/logger"

const app = express()
const server = http.createServer(app)

const corsOptions = {
	origin: function (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void,
	) {
		const APP_URL = process.env.APP_URL
		const allowedOrigins = [APP_URL]

		if (!origin) return callback(null, true)
		if (allowedOrigins.indexOf(origin) === -1) {
			const msg =
				"The CORS policy for this site does not allow access from the specified Origin."
			return callback(new Error(msg), false)
		}
		return callback(null, true)
	},
	credentials: true,
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	allowedHeaders:
		"Origin, X-Requested-With, Content-Type, Accept, Authorization",
}

app.use(cors(corsOptions))

app.use("/api/usage", usageRouter)

app.get("/health", (req, res) => {
	const status = {
		status: "up",
		timestamp: new Date().toISOString(),
		rooms: rooms.size,
		players: Array.from(rooms.values()).reduce(
			(count, room) => count + room.players.size,
			0,
		),
	}
	debugLog("HEALTH_CHECK", `Health check requested from ${req.ip}`)
	res.json(status)
})

app.get("/", (_, res) => {
	res.send(`
		<h1>Chatroom Server</h1>
		<p>Server is running</p>
		<p><a href="/health">Health Check</a></p>
	`)
})

setupSocketIO(server)

// Populate activeUsernames with persona usernames
allPersonas.forEach(persona => {
	if (persona.username) {
		activeUsernames.add(persona.username.toLowerCase())
		debugLog(
			"STARTUP",
			`Added persona username to activeUsernames: ${persona.username.toLowerCase()}`,
		)
	}
})

const modelProvider = ModelProvider.getInstance()
const modelType = modelProvider.getModelType()
const providerType = modelProvider.getProviderType()

if (modelType === "none") {
	console.log("SERVER RUNNING IN NO-MODEL MODE - USING PREDEFINED RESPONSES")
} else {
	console.log(`SERVER USING ${providerType.toUpperCase()} MODEL: ${modelType}`)
}

const SERVER_PORT = process.env.SERVER_PORT
if (!SERVER_PORT) {
	throw new Error("SERVER_PORT is not set in environment variables")
}

server.listen(SERVER_PORT, () => {
	console.log(`Server listening on port ${SERVER_PORT}`)
	console.log(`Allowed origins: ${process.env.APP_URL}`)

	setInterval(checkRoomInactivity, 30000)
	setInterval(logRoomStats, 60000)
})

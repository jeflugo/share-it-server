import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const server = createServer(app)
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

// Configure CORS to allow requests from your Vite dev server and future frontend
const io = new Server(server, {
	cors: {
		origin: [clientUrl], // Vite's default port
		methods: ['GET', 'POST'],
	},
})

// In-memory store for simplicity (replace with DB for persistence)
const roomCodeMap = new Map() // Key: roomId, Value: code content

io.on('connection', socket => {
	console.log('User connected:', socket.id)

	// Handle a user joining a room
	socket.on('join_room', roomId => {
		socket.join(roomId)
		console.log(`User ${socket.id} joined room ${roomId}`)

		// Send the existing code to the new user
		if (roomCodeMap.has(roomId)) {
			socket.emit('load_code', roomCodeMap.get(roomId))
		} else {
			// Initialize the room if it doesn't exist
			roomCodeMap.set(
				roomId,
				'// Welcome to CollabCode! Start coding together.\n'
			)
			socket.emit('load_code', roomCodeMap.get(roomId))
		}
	})

	// Handle code changes from a client
	socket.on('send_code_change', data => {
		// Update the server's copy of the code
		roomCodeMap.set(data.roomId, data.code)
		// Broadcast the change to EVERYONE in the room except the sender
		socket.to(data.roomId).emit('receive_code_change', data.code)
	})

	// Handle disconnection
	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id)
	})
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})

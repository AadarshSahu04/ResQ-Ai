import { registerSocketIO } from '../services/notificationService.js';

export function initializeSockets(io) {
  registerSocketIO(io);

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Join room based on role or team
    socket.on('join:room', (room) => {
      socket.join(room);
      console.log(`📡 [Socket.io] Client ${socket.id} joined room: ${room}`);
    });

    // Rescue team live GPS coordinate broadcast
    socket.on('rescueTeam:locationUpdate', (data) => {
      // Broadcast to authorities and map
      io.emit('rescueTeam:moved', {
        teamId: data.teamId,
        teamName: data.teamName,
        coordinates: data.coordinates, // [lon, lat]
        timestamp: new Date().toISOString(),
      });
    });

    // Client heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}

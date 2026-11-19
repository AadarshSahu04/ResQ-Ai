import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDatabase, isPostgresAvailable } from './config/db.js';
import { initFirebase } from './config/firebase.js';
import { initializeSockets } from './sockets/socketHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import hazardRoutes from './routes/hazardRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import officeRoutes from './routes/officeRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const DEFAULT_PORT = parseInt(process.env.PORT || '5001', 10);
let currentPort = DEFAULT_PORT;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/offices', officeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'RESQ-AI Core Engine',
    timestamp: new Date().toISOString(),
    postgresConnected: isPostgresAvailable(),
    spatialEngine: isPostgresAvailable() ? 'PostgreSQL PostGIS' : 'In-Memory Spatial PostGIS Emulator',
    activeProtocols: ['REST', 'Socket.io', 'OSRM', 'HuggingFace', 'Open-Meteo'],
  });
});

// Serve frontend production build if available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  console.log(`📦 [Static Assets] Serving compiled React frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal Emergency System Error',
    message: err.message,
  });
});

function listenOnPort(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🟢 RESQ-AI Server listening on port ${port}`);
    console.log(`📡 Real-Time WebSockets: ENABLED`);
    console.log(`🗺️  OSRM Routing & Hazard Avoidance: READY`);
    console.log(`🤖 AI Zero-Shot Classifier: READY`);
    console.log(`=======================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ [Port Conflict] Port ${currentPort} is currently occupied (e.g. macOS AirPlay Receiver).`);
    currentPort += 1;
    console.log(`🔄 Attempting automatic bind to port ${currentPort}...`);
    listenOnPort(currentPort);
  } else {
    console.error('[Unhandled Server Socket Error]:', err);
  }
});

// Startup sequence
async function startServer() {
  console.log('🚀 Initializing RESQ-AI Emergency Response Platform...');
  
  // 1. Initialize DB and PostGIS
  await initDatabase();

  // 2. Initialize Firebase
  initFirebase();

  // 3. Initialize Socket.io real-time layer
  initializeSockets(io);

  // 4. Start HTTP Server with automatic port fallback
  listenOnPort(currentPort);
}

startServer();

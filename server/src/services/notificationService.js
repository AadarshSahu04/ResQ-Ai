import { firebaseAdmin, isFirebaseReady } from '../config/firebase.js';

let ioInstance = null;

export function registerSocketIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

/**
 * Dispatch Push Notification & Socket Broadcast
 * @param {string} title - Alert title
 * @param {string} message - Alert details
 * @param {object} payload - Incident/hazard payload
 * @param {string} channel - Target channel ('incident:created', 'hazard:blocked', 'alert:push')
 */
export async function sendEmergencyAlert(title, message, payload = {}, channel = 'alert:push') {
  console.log(`🚨 [Emergency Notification] [${channel.toUpperCase()}] ${title}: ${message}`);

  // 1. Instantly push state changes to the frontend via Socket.io
  if (ioInstance) {
    ioInstance.emit(channel, {
      title,
      message,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Dispatch FCM Web Push Notification if Firebase Admin is configured
  if (isFirebaseReady()) {
    try {
      const fcmMessage = {
        notification: {
          title,
          body: message,
        },
        data: {
          incidentId: payload.id ? String(payload.id) : '',
          type: payload.predicted_category || payload.type || 'EMERGENCY',
          timestamp: new Date().toISOString(),
        },
        topic: 'emergency-alerts',
      };

      await firebaseAdmin.messaging().send(fcmMessage);
      console.log('📡 [FCM] Dispatched push notification to topic: emergency-alerts');
    } catch (err) {
      console.warn(`[FCM Push Warning] Error sending push notification: ${err.message}`);
    }
  }
}

import express from 'express';
import { fetchWeatherRisk } from '../services/weatherService.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/forecast', authenticateJWT, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude query params required.' });
    }
    const weather = await fetchWeatherRisk(parseFloat(lat), parseFloat(lon));
    res.json(weather);
  } catch (err) {
    res.status(500).json({ error: 'Weather lookup failed.', details: err.message });
  }
});

export default router;

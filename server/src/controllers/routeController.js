import { calculateRouteWithHazardAvoidance } from '../services/routingService.js';
import { executeQuery } from '../config/db.js';

export async function calculateRoute(req, res) {
  try {
    let { origin, destination, incidentId } = req.body;

    // If incidentId is provided, look up incident coordinates
    if (incidentId && !destination) {
      const incRes = await executeQuery('SELECT * FROM incidents WHERE id = $1', [incidentId]);
      const inc = incRes.rows && incRes.rows[0];
      if (inc && inc.location) {
        destination = inc.location.coordinates;
      }
    }

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Origin coordinates [lon, lat] and destination coordinates [lon, lat] are required.'
      });
    }

    const routeData = await calculateRouteWithHazardAvoidance(origin, destination);
    res.json({ ...routeData, incidentId: incidentId || null });
  } catch (err) {
    console.error('[Calculate Route Error]:', err);
    res.status(500).json({ error: 'Failed to compute route.', details: err.message });
  }
}

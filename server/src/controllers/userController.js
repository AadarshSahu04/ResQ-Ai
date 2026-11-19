import { executeQuery, isPostgresAvailable } from '../config/db.js';
import { sendEmergencyAlert } from '../services/notificationService.js';

export async function getAllUsers(req, res) {
  try {
    const result = await executeQuery('SELECT id, name, email, role, phone, station_base, current_location, created_at FROM users ORDER BY id ASC');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('[Get Users Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export async function getRescueTeams(req, res) {
  try {
    const result = await executeQuery("SELECT id, name, email, role, phone, station_base, current_location FROM users WHERE role = 'Rescue Team' ORDER BY id ASC");
    res.json({ rescueTeams: result.rows });
  } catch (err) {
    console.error('[Get Rescue Teams Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve rescue teams.' });
  }
}

export async function updateSquadLocation(req, res) {
  try {
    const { id } = req.params;
    const { coordinates, station_base } = req.body; // coordinates: [lon, lat]

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: 'Valid [longitude, latitude] coordinates are required.' });
    }

    const [lon, lat] = coordinates;
    const locationObj = { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] };

    const sql = isPostgresAvailable()
      ? 'UPDATE users SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), station_base = COALESCE($3, station_base) WHERE id = $4 RETURNING id, name, email, role, phone, station_base, ST_AsGeoJSON(current_location) as location_geojson;'
      : 'UPDATE users SET current_location = $1, station_base = COALESCE($2, station_base) WHERE id = $3 RETURNING *;';

    const params = isPostgresAvailable()
      ? [parseFloat(lon), parseFloat(lat), station_base || null, parseInt(id, 10)]
      : [locationObj, station_base || null, parseInt(id, 10)];

    const result = await executeQuery(sql, params);
    const updated = result.rows && result.rows[0];

    if (!updated) {
      return res.status(404).json({ error: 'Squad not found to update location.' });
    }

    // Broadcast location update to WebSocket
    await sendEmergencyAlert(
      `Squad Position Updated`,
      `${updated.name} updated live coordinates.`,
      {
        teamId: updated.id,
        teamName: updated.name,
        coordinates: [parseFloat(lon), parseFloat(lat)],
      },
      'rescueTeam:moved'
    );

    res.json({ message: 'Squad location updated successfully.', squad: updated });
  } catch (err) {
    console.error('[Update Squad Location Error]:', err);
    res.status(500).json({ error: 'Failed to update squad location.' });
  }
}

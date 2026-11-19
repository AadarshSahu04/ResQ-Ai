import { executeQuery, isPostgresAvailable } from '../config/db.js';
import { sendEmergencyAlert } from '../services/notificationService.js';

export async function createHazard(req, res) {
  try {
    const { type, area, coordinates, notes } = req.body;

    if (!type || (!area && !coordinates)) {
      return res.status(400).json({ error: 'Hazard type (Flood, Blockage) and polygon coordinates are required.' });
    }

    if (!['Flood', 'Blockage'].includes(type)) {
      return res.status(400).json({ error: 'Hazard type must be either "Flood" or "Blockage".' });
    }

    // Standardize to GeoJSON Polygon structure
    let polygonGeoJSON = area;
    if (!polygonGeoJSON && Array.isArray(coordinates)) {
      // Ensure outer ring is closed
      let ring = [...coordinates];
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]]);
      }
      polygonGeoJSON = {
        type: 'Polygon',
        coordinates: [ring],
      };
    }

    const reporterId = req.user ? req.user.id : null;
    let hazard;

    if (isPostgresAvailable()) {
      const sql = `
        INSERT INTO hazards (type, area, reported_by, notes, is_active)
        VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4, true)
        RETURNING id, type, ST_AsGeoJSON(area) as area_geojson, reported_by, notes, is_active, created_at;
      `;
      const result = await executeQuery(sql, [
        type,
        JSON.stringify(polygonGeoJSON),
        reporterId,
        notes || null,
      ]);
      const row = result.rows[0];
      hazard = {
        ...row,
        area: JSON.parse(row.area_geojson),
      };
    } else {
      const result = await executeQuery(
        'INSERT INTO hazards VALUES ($1, $2, $3, $4, $5)',
        [type, JSON.stringify(polygonGeoJSON), reporterId, notes || null, true]
      );
      hazard = result.rows[0];
    }

    // Broadcast new hazard zone to all connected maps and rescue teams
    await sendEmergencyAlert(
      `⚠️ New Hazard Declared: ${hazard.type}`,
      `Authority flagged new ${hazard.type} zone. Routes traversing this sector will be rerouted.`,
      hazard,
      'hazard:created'
    );

    res.status(201).json({
      message: 'Hazard zone registered successfully.',
      hazard,
    });
  } catch (err) {
    console.error('[Create Hazard Error]:', err);
    res.status(500).json({ error: 'Failed to create hazard zone.', details: err.message });
  }
}

export async function getAllHazards(req, res) {
  try {
    const { active_only } = req.query;

    if (isPostgresAvailable()) {
      let sql = `
        SELECT h.id, h.type, ST_AsGeoJSON(h.area) as area_geojson, h.reported_by,
               u.name as reported_by_name, h.notes, h.is_active, h.created_at
        FROM hazards h
        LEFT JOIN users u ON h.reported_by = u.id
      `;
      if (active_only === 'true') {
        sql += ' WHERE h.is_active = true';
      }
      sql += ' ORDER BY h.created_at DESC;';

      const result = await executeQuery(sql);
      const hazards = result.rows.map(row => ({
        ...row,
        area: JSON.parse(row.area_geojson),
      }));

      return res.json({ hazards });
    }

    // In-Memory Storage
    const result = await executeQuery('SELECT * FROM hazards');
    let list = result.rows;
    if (active_only === 'true') {
      list = list.filter(h => h.is_active);
    }
    res.json({ hazards: list });
  } catch (err) {
    console.error('[Get All Hazards Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve hazards.' });
  }
}

export async function toggleHazardStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    let hazard;
    if (isPostgresAvailable()) {
      const sql = `
        UPDATE hazards 
        SET is_active = $1 
        WHERE id = $2 
        RETURNING id, type, ST_AsGeoJSON(area) as area_geojson, reported_by, notes, is_active, created_at;
      `;
      const result = await executeQuery(sql, [Boolean(is_active), parseInt(id, 10)]);
      const row = result.rows && result.rows[0];
      if (!row) {
        return res.status(404).json({ error: 'Hazard not found.' });
      }
      hazard = {
        ...row,
        area: JSON.parse(row.area_geojson),
      };
    } else {
      const sql = 'UPDATE hazards SET is_active = $1 WHERE id = $2 RETURNING *;';
      const result = await executeQuery(sql, [Boolean(is_active), parseInt(id, 10)]);
      hazard = result.rows && result.rows[0];
      if (!hazard) {
        return res.status(404).json({ error: 'Hazard not found.' });
      }
      if (typeof hazard.area === 'string') {
        try {
          hazard.area = JSON.parse(hazard.area);
        } catch (e) {}
      }
    }

    await sendEmergencyAlert(
      `Hazard Zone #${id} ${hazard.is_active ? 'Reactivated' : 'Cleared'}`,
      `Hazard status updated. Navigational corridors refreshed.`,
      hazard,
      'hazard:updated'
    );

    res.json({ message: 'Hazard status updated.', hazard });
  } catch (err) {
    console.error('[Toggle Hazard Error]:', err);
    res.status(500).json({ error: 'Failed to update hazard.' });
  }
}

export async function deleteHazard(req, res) {
  try {
    const { id } = req.params;
    const result = await executeQuery('DELETE FROM hazards WHERE id = $1', [parseInt(id, 10)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hazard not found to delete.' });
    }

    await sendEmergencyAlert(
      `Hazard #${id} Removed`,
      `Authority removed hazard boundary.`,
      { id: parseInt(id, 10) },
      'hazard:deleted'
    );

    res.json({ message: 'Hazard removed successfully.' });
  } catch (err) {
    console.error('[Delete Hazard Error]:', err);
    res.status(500).json({ error: 'Failed to delete hazard.' });
  }
}

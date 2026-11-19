import {
  getCentralOfficesStore,
  getActiveCentralOfficeStore,
  setActiveCentralOfficeStore,
  updateCentralOfficeStore,
  resetSquadsToActiveOfficeStore,
  isPostgresAvailable,
  executeQuery,
} from '../config/db.js';
import { getIO } from '../services/notificationService.js';

export async function getOffices(req, res) {
  try {
    if (isPostgresAvailable()) {
      const sql = 'SELECT id, name, city, state, region, ST_AsGeoJSON(location) as location_geojson, address, description, is_active FROM central_offices ORDER BY id ASC;';
      const result = await executeQuery(sql);
      if (result.rows && result.rows.length > 0) {
        const offices = result.rows.map(r => ({ ...r, location: JSON.parse(r.location_geojson) }));
        const activeOffice = offices.find(o => o.is_active) || offices[0];
        return res.json({ offices, activeOffice });
      }
    }
    const offices = getCentralOfficesStore();
    const activeOffice = getActiveCentralOfficeStore();
    res.json({ offices, activeOffice });
  } catch (err) {
    console.error('[Get Offices Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve central regional offices.' });
  }
}

export async function getActiveOffice(req, res) {
  try {
    if (isPostgresAvailable()) {
      const sql = 'SELECT id, name, city, state, region, ST_AsGeoJSON(location) as location_geojson, address, description, is_active FROM central_offices WHERE is_active = true LIMIT 1;';
      const result = await executeQuery(sql);
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return res.json({ activeOffice: { ...row, location: JSON.parse(row.location_geojson) } });
      }
    }
    const activeOffice = getActiveCentralOfficeStore();
    res.json({ activeOffice });
  } catch (err) {
    console.error('[Get Active Office Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve active central office.' });
  }
}

export async function setActiveOffice(req, res) {
  try {
    const { officeId } = req.body;
    if (!officeId) {
      return res.status(400).json({ error: 'officeId is required.' });
    }

    const updated = setActiveCentralOfficeStore(officeId);
    if (!updated) {
      return res.status(404).json({ error: `Central office '${officeId}' not found.` });
    }

    // Automatically set squads to rest at new Central HQ
    const resetResult = resetSquadsToActiveOfficeStore();

    if (isPostgresAvailable()) {
      try {
        await executeQuery('UPDATE central_offices SET is_active = (id = $1);', [officeId]);
        const coords = updated.location.coordinates;
        const restingBase = `${updated.name} (Resting Base)`;
        await executeQuery(
          "UPDATE users SET station_base = $1, current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326) WHERE role = 'Rescue Team';",
          [restingBase, coords[0], coords[1]]
        );
      } catch (pgErr) {
        console.warn('[Postgres Sync Warning]:', pgErr.message);
      }
    }

    try {
      const io = getIO();
      if (io) {
        io.emit('office:activeChanged', { activeOffice: updated });
        resetResult.updatedSquads.forEach(squad => {
          io.emit('rescueTeam:moved', {
            teamId: squad.id,
            teamName: squad.name,
            coordinates: squad.current_location.coordinates,
            station_base: squad.station_base,
          });
        });
      }
    } catch (sockErr) {
      console.warn('[Socket Broadcast Warning]:', sockErr.message);
    }

    res.json({
      message: `Active Central Command switched to ${updated.name}`,
      activeOffice: updated,
      updatedSquads: resetResult.updatedSquads,
    });
  } catch (err) {
    console.error('[Set Active Office Error]:', err);
    res.status(500).json({ error: 'Failed to set active central office.' });
  }
}

export async function updateOffice(req, res) {
  try {
    const { id } = req.params;
    const { name, city, address, coordinates } = req.body;

    const updated = updateCentralOfficeStore(id, { name, city, address, coordinates });
    if (!updated) {
      return res.status(404).json({ error: `Central office '${id}' not found.` });
    }

    if (isPostgresAvailable()) {
      try {
        const coords = coordinates && Array.isArray(coordinates) ? coordinates : null;
        const sql = `
          UPDATE central_offices
          SET name = COALESCE($1, name),
              city = COALESCE($2, city),
              address = COALESCE($3, address),
              location = CASE WHEN $4::numeric IS NOT NULL THEN ST_SetSRID(ST_MakePoint($4, $5), 4326) ELSE location END
          WHERE id = $6;
        `;
        await executeQuery(sql, [
          name || null,
          city || null,
          address || null,
          coords ? coords[0] : null,
          coords ? coords[1] : null,
          id,
        ]);
      } catch (pgErr) {
        console.warn('[Postgres Sync Warning]:', pgErr.message);
      }
    }

    try {
      const io = getIO();
      if (io) {
        io.emit('office:updated', { office: updated });
      }
    } catch (sockErr) {
      console.warn('[Socket Warning]:', sockErr.message);
    }

    res.json({
      message: `Central office ${updated.name} updated successfully.`,
      office: updated,
    });
  } catch (err) {
    console.error('[Update Office Error]:', err);
    res.status(500).json({ error: 'Failed to update central office.' });
  }
}

export async function resetSquadsToOffice(req, res) {
  try {
    const result = resetSquadsToActiveOfficeStore();

    if (isPostgresAvailable()) {
      try {
        const coords = result.activeOffice.location.coordinates;
        const restingBase = `${result.activeOffice.name} (Resting Base)`;
        await executeQuery(
          "UPDATE users SET station_base = $1, current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326) WHERE role = 'Rescue Team';",
          [restingBase, coords[0], coords[1]]
        );
      } catch (pgErr) {
        console.warn('[Postgres Sync Warning]:', pgErr.message);
      }
    }

    try {
      const io = getIO();
      if (io) {
        result.updatedSquads.forEach(squad => {
          io.emit('rescueTeam:moved', {
            teamId: squad.id,
            teamName: squad.name,
            coordinates: squad.current_location.coordinates,
            station_base: squad.station_base,
          });
        });
      }
    } catch (sockErr) {
      console.warn('[Socket Warning]:', sockErr.message);
    }

    res.json({
      message: `All rescue squads recalled to resting quarters at ${result.activeOffice.name}`,
      activeOffice: result.activeOffice,
      updatedSquads: result.updatedSquads,
    });
  } catch (err) {
    console.error('[Reset Squads Error]:', err);
    res.status(500).json({ error: 'Failed to reset squads to central office.' });
  }
}

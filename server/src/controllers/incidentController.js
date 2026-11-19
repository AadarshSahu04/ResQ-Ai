import { executeQuery, isPostgresAvailable } from '../config/db.js';
import { classifyIncident } from '../services/huggingFaceService.js';
import { fetchWeatherRisk } from '../services/weatherService.js';
import { sendEmergencyAlert } from '../services/notificationService.js';

export async function createIncident(req, res) {
  try {
    const { description, latitude, longitude, reported_by_name, manual_category, manual_severity } = req.body;

    if (!description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Description, latitude, and longitude are required.' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid geographic latitude and longitude coordinates are required.' });
    }

    // 1. Hugging Face AI Zero-Shot Classification & Human-in-the-Loop Evaluation
    let aiClassification = await classifyIncident(description);

    // If caller explicitly provided manual category/severity (fallback mode / override)
    if (manual_category) {
      aiClassification.category = manual_category;
      aiClassification.requiresManualVerification = false;
    }
    if (manual_severity !== undefined) {
      aiClassification.severityScore = parseFloat(manual_severity);
    }

    // 2. Open-Meteo Weather Risk Assessment
    const weatherData = await fetchWeatherRisk(lat, lon);

    // 3. Prepare Point geometry
    const pointGeoJSON = {
      type: 'Point',
      coordinates: [lon, lat],
    };

    const reporter = req.user ? req.user.name : (reported_by_name || 'Anonymous Citizen');
    const initialStatus = aiClassification.requiresManualVerification ? 'Reported' : 'Verified';

    let incident;

    if (isPostgresAvailable()) {
      const sql = `
        INSERT INTO incidents (
          description, location, predicted_category, severity_score, confidence_score,
          requires_manual_verification, status, assigned_team_id, reported_by_name, weather_risk_summary
        )
        VALUES (
          $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING id, description, ST_AsGeoJSON(location) as location_geojson,
                  predicted_category, severity_score, confidence_score,
                  requires_manual_verification, status, assigned_team_id,
                  reported_by_name, weather_risk_summary, created_at;
      `;
      const values = [
        description,
        lon,
        lat,
        aiClassification.category,
        aiClassification.severityScore,
        aiClassification.confidenceScore,
        aiClassification.requiresManualVerification,
        initialStatus,
        null,
        reporter,
        weatherData.summary,
      ];
      const result = await executeQuery(sql, values);
      const row = result.rows[0];
      incident = {
        ...row,
        location: JSON.parse(row.location_geojson),
      };
    } else {
      // In-Memory Storage Fallback
      const values = [
        description,
        JSON.stringify(pointGeoJSON),
        aiClassification.category,
        aiClassification.severityScore,
        aiClassification.confidenceScore,
        aiClassification.requiresManualVerification,
        initialStatus,
        null,
        reporter,
        weatherData.summary,
      ];
      const result = await executeQuery('INSERT INTO incidents VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', values);
      incident = result.rows[0];
    }

    // 4. Real-time broadcast and FCM alert
    const alertTitle = `🚨 New SOS: ${incident.predicted_category} (Severity ${Math.round(incident.severity_score * 100)}%)`;
    const alertMsg = incident.requires_manual_verification
      ? `⚠️ AI Confidence < 60% (${(incident.confidence_score * 100).toFixed(1)}%). Requires Manual Verification!`
      : `${incident.description.substring(0, 100)}...`;

    await sendEmergencyAlert(alertTitle, alertMsg, incident, 'incident:created');

    res.status(201).json({
      message: 'Incident reported successfully.',
      incident,
      aiAnalysis: aiClassification,
      weatherAnalysis: weatherData,
    });
  } catch (err) {
    console.error('[Create Incident Error]:', err);
    res.status(500).json({ error: 'Failed to create incident report.', details: err.message });
  }
}

export async function getAllIncidents(req, res) {
  try {
    const { status, requires_manual_verification, category } = req.query;

    if (isPostgresAvailable()) {
      let query = `
        SELECT i.id, i.description, ST_AsGeoJSON(i.location) as location_geojson,
               i.predicted_category, i.severity_score, i.confidence_score,
               i.requires_manual_verification, i.status, i.assigned_team_id,
               u.name as assigned_team_name, i.reported_by_name, i.weather_risk_summary, i.created_at
        FROM incidents i
        LEFT JOIN users u ON i.assigned_team_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND i.status = $${params.length}`;
      }
      if (requires_manual_verification !== undefined) {
        params.push(requires_manual_verification === 'true');
        query += ` AND i.requires_manual_verification = $${params.length}`;
      }
      if (category) {
        params.push(category);
        query += ` AND i.predicted_category = $${params.length}`;
      }

      query += ` ORDER BY i.created_at DESC;`;
      const result = await executeQuery(query, params);
      const incidents = result.rows.map(row => ({
        ...row,
        location: JSON.parse(row.location_geojson),
      }));

      return res.json({ incidents });
    }

    // In-Memory Storage
    const result = await executeQuery('SELECT * FROM incidents');
    let list = result.rows;

    if (status) list = list.filter(i => i.status === status);
    if (requires_manual_verification !== undefined) {
      list = list.filter(i => String(i.requires_manual_verification) === requires_manual_verification);
    }
    if (category) list = list.filter(i => i.predicted_category === category);

    res.json({ incidents: list });
  } catch (err) {
    console.error('[Get All Incidents Error]:', err);
    res.status(500).json({ error: 'Failed to fetch incidents.' });
  }
}

export async function getIncidentById(req, res) {
  try {
    const { id } = req.params;
    const result = await executeQuery('SELECT * FROM incidents WHERE id = $1', [id]);
    const incident = result.rows && result.rows[0];

    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found.' });
    }

    res.json({ incident });
  } catch (err) {
    console.error('[Get Incident By ID Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve incident details.' });
  }
}

export async function updateIncidentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, assigned_team_id } = req.body;

    const validStatuses = ['Reported', 'Verified', 'In Progress', 'Resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let sql;
    let params;

    if (assigned_team_id !== undefined) {
      sql = 'UPDATE incidents SET status = $1, assigned_team_id = $2 WHERE id = $3 RETURNING *';
      params = [status || 'In Progress', assigned_team_id ? parseInt(assigned_team_id, 10) : null, parseInt(id, 10)];
    } else {
      sql = 'UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *';
      params = [status, parseInt(id, 10)];
    }

    const result = await executeQuery(sql, params);
    const updated = result.rows && result.rows[0];

    if (!updated) {
      return res.status(404).json({ error: 'Incident not found to update.' });
    }

    // Broadcast change
    await sendEmergencyAlert(
      `Status Update: Incident #${id}`,
      `Incident status changed to ${updated.status}`,
      updated,
      'incident:updated'
    );

    res.json({ message: 'Incident updated successfully.', incident: updated });
  } catch (err) {
    console.error('[Update Incident Error]:', err);
    res.status(500).json({ error: 'Failed to update incident.' });
  }
}

export async function verifyIncident(req, res) {
  try {
    const { id } = req.params;
    const { verified_category, severity_score } = req.body;

    const sql = `
      UPDATE incidents
      SET requires_manual_verification = false,
          predicted_category = COALESCE($1, predicted_category),
          severity_score = COALESCE($2, severity_score),
          status = 'Verified'
      WHERE id = $3
      RETURNING *;
    `;
    const params = [verified_category || null, severity_score ? parseFloat(severity_score) : null, parseInt(id, 10)];

    const result = await executeQuery(sql, params);
    const verified = result.rows && result.rows[0];

    if (!verified) {
      return res.status(404).json({ error: 'Incident not found for verification.' });
    }

    await sendEmergencyAlert(
      `Verified Incident #${id}`,
      `Disaster Authority verified incident as ${verified.predicted_category} (Severity ${Math.round(verified.severity_score * 100)}%)`,
      verified,
      'incident:verified'
    );

    res.json({ message: 'Incident verified by Authority.', incident: verified });
  } catch (err) {
    console.error('[Verify Incident Error]:', err);
    res.status(500).json({ error: 'Failed to manually verify incident.' });
  }
}

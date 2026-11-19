import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { doesRouteIntersectPolygon } from '../services/spatialService.js';

dotenv.config();

const { Pool } = pg;

// PostgreSQL Connection Pool configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'resq_ai',
  connectionTimeoutMillis: 3000,
});

let isPgConnected = false;

// High-fidelity In-Memory Spatial Store with Indore, M.P. Context & 4 Tactical Rescue Squads
class InMemorySpatialStore {
  constructor() {
    this.users = [];
    this.incidents = [];
    this.hazards = [];
    this.centralOffices = [];
    this.activeOfficeId = 'indore_rau';
    this.userIdCounter = 1;
    this.incidentIdCounter = 1;
    this.hazardIdCounter = 1;
    this.seedDefaults();
  }

  async seedDefaults() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('ResqSecure2026!', salt);

    // 5 Major Regional Central Offices across India (Indore Rau as Primary Demonstration Base)
    this.centralOffices = [
      {
        id: 'indore_rau',
        name: 'Indore Rau Central Disaster Command Hub (Active Demo Base)',
        city: 'Indore (Rau)',
        state: 'Madhya Pradesh',
        region: 'Central India',
        location: { type: 'Point', coordinates: [75.8118, 22.6288] }, // [lon, lat] Rau, Indore
        address: 'Rau Bypass Circle, AB Road, Indore, M.P. 453331',
        description: 'Central operations headquarters and resting quarters for tactical squads before emergency dispatch.',
        is_active: true,
      },
      {
        id: 'noida_delhi',
        name: 'Noida Sector 62 Disaster Management Command',
        city: 'Noida (Near Delhi NCR)',
        state: 'Uttar Pradesh',
        region: 'Northern India',
        location: { type: 'Point', coordinates: [77.3638, 28.6258] }, // [lon, lat] Noida
        address: 'Sector 62 Institutional Area, Noida, NCR 201309',
        description: 'National Capital Region command post for northern emergency operations.',
        is_active: false,
      },
      {
        id: 'kalyan_mumbai',
        name: 'Kalyan Emergency Operations Complex',
        city: 'Kalyan (Near Mumbai)',
        state: 'Maharashtra',
        region: 'Western India',
        location: { type: 'Point', coordinates: [73.1350, 19.2437] }, // [lon, lat] Kalyan
        address: 'Shivaji Chowk Emergency Staging Ground, Kalyan (W), Maharashtra 421301',
        description: 'Western coastal response hub for Mumbai metropolitan and Konkan disasters.',
        is_active: false,
      },
      {
        id: 'vellore_south',
        name: 'Vellore Strategic Disaster Response Center',
        city: 'Vellore (Bengaluru-Chennai Corridor)',
        state: 'Tamil Nadu',
        region: 'Southern India',
        location: { type: 'Point', coordinates: [79.1325, 12.9165] }, // [lon, lat] Vellore
        address: 'Katpadi Strategic Reserve Base, Vellore, Tamil Nadu 632007',
        description: 'Bilateral transit corridor command serving Bengaluru, Chennai, and Deccan plateau.',
        is_active: false,
      },
      {
        id: 'guwahati_ne',
        name: 'Guwahati Brahmaputra Tactical Command Post',
        city: 'Guwahati',
        state: 'Assam',
        region: 'North-East India',
        location: { type: 'Point', coordinates: [91.7362, 26.1445] }, // [lon, lat] Guwahati
        address: 'Jalukbari Riverine Defense & Rescue Station, Guwahati, Assam 781014',
        description: 'Dedicated flood and seismic disaster command post for the North-Eastern states.',
        is_active: false,
      },
    ];

    // Seed Demo Users with 4 Dedicated Rescue Squads resting at Rau Central Base
    this.users = [
      {
        id: this.userIdCounter++,
        name: 'Aadarsh Sahu (Admin Head)',
        email: 'admin@resq.ai',
        password_hash: hash,
        role: 'Admin',
        phone: '+91-98765-01001',
        station_base: 'Indore Rau Central Command Hub (HQ Director)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] },
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Vigya Gupta (Disaster Authority Director)',
        email: 'authority@resq.ai',
        password_hash: hash,
        role: 'Disaster Authority',
        phone: '+91-98765-01002',
        station_base: 'Indore Rau Central Command Hub (Operations)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] },
        created_at: new Date(),
      },
      // 4 DEDICATED SQUADS (Resting at Rau Central Hub before emergency dispatch):
      {
        id: this.userIdCounter++,
        name: 'Yatharth Gupta (Garuda Rapid Squad 1)',
        email: 'rescue1@resq.ai',
        password_hash: hash,
        role: 'Rescue Team',
        phone: '+91-98765-01003',
        station_base: 'Indore Rau Central Command Hub (Resting Base)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] }, // Rau Central Base
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Rohan Singhania (Kavach Flood & Water Unit 2)',
        email: 'rescue2@resq.ai',
        password_hash: hash,
        role: 'Rescue Team',
        phone: '+91-98765-01004',
        station_base: 'Indore Rau Central Command Hub (Resting Base)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] }, // Rau Central Base
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Aarav Mukati (Chetak Quick Response Unit 3)',
        email: 'rescue3@resq.ai',
        password_hash: hash,
        role: 'Rescue Team',
        phone: '+91-98765-01008',
        station_base: 'Indore Rau Central Command Hub (Resting Base)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] }, // Rau Central Base
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Pooja Rathore (Trishul Heavy Tactical Squad 4)',
        email: 'rescue4@resq.ai',
        password_hash: hash,
        role: 'Rescue Team',
        phone: '+91-98765-01009',
        station_base: 'Indore Rau Central Command Hub (Resting Base)',
        current_location: { type: 'Point', coordinates: [75.8118, 22.6288] }, // Rau Central Base
        created_at: new Date(),
      },
      // CITIZENS:
      {
        id: this.userIdCounter++,
        name: 'Udit Maheshwari',
        email: 'public@resq.ai',
        password_hash: hash,
        role: 'Public User',
        phone: '+91-98765-01005',
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Shreyas Joshi',
        email: 'shreyas@resq.ai',
        password_hash: hash,
        role: 'Public User',
        phone: '+91-98765-01006',
        created_at: new Date(),
      },
      {
        id: this.userIdCounter++,
        name: 'Ankitesh Das',
        email: 'ankitesh@resq.ai',
        password_hash: hash,
        role: 'Public User',
        phone: '+91-98765-01007',
        created_at: new Date(),
      },
    ];

    // Seed Hazards in Indore, M.P.
    this.hazards = [
      {
        id: this.hazardIdCounter++,
        type: 'Flood',
        area: {
          type: 'Polygon',
          coordinates: [[
            [75.850, 22.714],
            [75.863, 22.714],
            [75.863, 22.726],
            [75.850, 22.726],
            [75.850, 22.714]
          ]]
        },
        reported_by: 2,
        notes: 'Kanh River overflow inundating low-lying embankment settlements near Rajwada & Krishnapura Chhatri.',
        is_active: true,
        created_at: new Date(Date.now() - 3600000),
      },
      {
        id: this.hazardIdCounter++,
        type: 'Blockage',
        area: {
          type: 'Polygon',
          coordinates: [[
            [75.888, 22.746],
            [75.899, 22.746],
            [75.899, 22.756],
            [75.888, 22.756],
            [75.888, 22.746]
          ]]
        },
        reported_by: 2,
        notes: 'AB Road / Ring Road flyover structural debris & downed high-tension electric cable near Vijay Nagar.',
        is_active: true,
        created_at: new Date(Date.now() - 7200000),
      }
    ];

    // Seed Initial Active & Verified Incidents in Indore, M.P.
    this.incidents = [
      {
        id: this.incidentIdCounter++,
        description: 'Kanh River monsoon flash flood inundated ground floor, 5 family members trapped on terrace near Krishnapura Chhatri, Rajwada.',
        location: { type: 'Point', coordinates: [75.8560, 22.7180] },
        predicted_category: 'Flood',
        severity_score: 0.88,
        confidence_score: 0.925,
        requires_manual_verification: false,
        status: 'In Progress',
        assigned_team_id: 3, // Yatharth Gupta (Garuda Squad 1)
        reported_by_name: 'Udit Maheshwari',
        weather_risk_summary: 'Monsoon heavy rain active (24.2 mm/h). Flash flood alert.',
        created_at: new Date(Date.now() - 1800000),
      },
      {
        id: this.incidentIdCounter++,
        description: 'Dense chemical smoke and fire spreading from basement textile storehouse in Cloth Market, Sitlamata Bazar.',
        location: { type: 'Point', coordinates: [75.8490, 22.7210] },
        predicted_category: 'Fire',
        severity_score: 0.65,
        confidence_score: 0.520, // < 0.60 -> Triggers Human-in-the-Loop review!
        requires_manual_verification: true,
        status: 'Reported',
        assigned_team_id: null,
        reported_by_name: 'Shreyas Joshi',
        weather_risk_summary: 'Wind speed 16 km/h. High humidity.',
        created_at: new Date(Date.now() - 900000),
      },
      {
        id: this.incidentIdCounter++,
        description: 'Critical cardiac patient with acute asthma requires immediate oxygen cylinder delivery, transit obstructed near Bhawarkua Square.',
        location: { type: 'Point', coordinates: [75.8670, 22.6940] },
        predicted_category: 'Medical',
        severity_score: 0.94,
        confidence_score: 0.890,
        requires_manual_verification: false,
        status: 'Verified',
        assigned_team_id: 6, // Pooja Rathore (Trishul Squad 4)
        reported_by_name: 'Ankitesh Das',
        weather_risk_summary: 'Overcast skies (3.0 mm/h drizzle).',
        created_at: new Date(Date.now() - 600000),
      },
      {
        id: this.incidentIdCounter++,
        description: 'Severe waterlogging and collapsed hoarding blocking BRTS corridor near Palasia Square.',
        location: { type: 'Point', coordinates: [75.8830, 22.7230] },
        predicted_category: 'Blockage',
        severity_score: 0.72,
        confidence_score: 0.840,
        requires_manual_verification: false,
        status: 'In Progress',
        assigned_team_id: 5, // Aarav Mukati (Chetak Squad 3)
        reported_by_name: 'Udit Maheshwari',
        weather_risk_summary: 'Moderate rainfall (8.5 mm/h).',
        created_at: new Date(Date.now() - 300000),
      }
    ];
  }
}

export const inMemoryStore = new InMemorySpatialStore();

// Initialize DB and test PostGIS
export async function initDatabase() {
  try {
    const client = await pool.connect();
    const versionRes = await client.query('SELECT version();');
    console.log(`[Database] PostgreSQL Connected successfully: ${versionRes.rows[0].version}`);

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      const postgisVer = await client.query('SELECT PostGIS_Full_Version();');
      console.log(`[Database] PostGIS Extension enabled: ${postgisVer.rows[0].postgis_full_version}`);
    } catch (gisErr) {
      console.warn(`[Database Warning] PostGIS check: ${gisErr.message}`);
    }

    client.release();
    isPgConnected = true;
    return true;
  } catch (err) {
    console.warn(`[Database Notice] PostgreSQL not reachable (${err.message}).`);
    console.warn(`[Database Notice] Operating in Graceful Fallback Mode using Embedded High-Fidelity Spatial Engine.`);
    isPgConnected = false;
    return false;
  }
}

export function isPostgresAvailable() {
  return isPgConnected;
}

// Unified query runner with dual-mode support
export async function executeQuery(text, params = []) {
  if (isPgConnected) {
    return pool.query(text, params);
  }
  return handleInMemoryQuery(text, params);
}

// Emulated SQL query handler for fallback mode
function handleInMemoryQuery(text, params) {
  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // Users Queries
  if (lowerSql.includes('from users') && lowerSql.includes('where email =')) {
    const email = params[0].toLowerCase().trim();
    let user = inMemoryStore.users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      if (email === 'aadarsh@resq.ai') user = inMemoryStore.users.find(u => u.email === 'admin@resq.ai');
      if (email === 'vigya@resq.ai') user = inMemoryStore.users.find(u => u.email === 'authority@resq.ai');
      if (email === 'yatharth@resq.ai') user = inMemoryStore.users.find(u => u.email === 'rescue1@resq.ai');
      if (email === 'rohan@resq.ai') user = inMemoryStore.users.find(u => u.email === 'rescue2@resq.ai');
      if (email === 'aarav@resq.ai') user = inMemoryStore.users.find(u => u.email === 'rescue3@resq.ai');
      if (email === 'pooja@resq.ai') user = inMemoryStore.users.find(u => u.email === 'rescue4@resq.ai');
      if (email === 'udit@resq.ai') user = inMemoryStore.users.find(u => u.email === 'public@resq.ai');
    }
    return { rows: user ? [user] : [] };
  }

  if (lowerSql.includes('from users') && lowerSql.includes('where id =')) {
    const id = parseInt(params[0], 10);
    const user = inMemoryStore.users.find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }

  if (lowerSql.includes('from users') && lowerSql.includes("role = 'rescue team'")) {
    const teams = inMemoryStore.users.filter(u => u.role === 'Rescue Team');
    return { rows: teams };
  }

  // Update squad location: UPDATE users SET current_location = ... WHERE id = ...
  if (lowerSql.startsWith('update users') && lowerSql.includes('current_location =')) {
    const id = parseInt(params[params.length - 1], 10);
    const locationObj = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
    const stationBase = params.length > 2 ? params[1] : null;
    const user = inMemoryStore.users.find(u => u.id === id);
    if (user) {
      user.current_location = locationObj;
      if (stationBase) {
        user.station_base = stationBase;
      }
      return { rows: [user] };
    }
    return { rows: [] };
  }

  if (lowerSql.startsWith('insert into users')) {
    const [name, email, password_hash, role, phone, station_base, current_location] = params;
    const newUser = {
      id: inMemoryStore.userIdCounter++,
      name,
      email,
      password_hash,
      role,
      phone: phone || null,
      station_base: station_base || 'Indore Field Station',
      current_location: current_location || { type: 'Point', coordinates: [75.8577, 22.7196] },
      created_at: new Date()
    };
    inMemoryStore.users.push(newUser);
    return { rows: [newUser] };
  }

  // Incidents Queries
  if (lowerSql.startsWith('select') && lowerSql.includes('from incidents')) {
    let results = inMemoryStore.incidents.map(inc => {
      const assigned = inMemoryStore.users.find(u => u.id === inc.assigned_team_id);
      return {
        ...inc,
        assigned_team_name: assigned ? assigned.name : null,
        location_geojson: JSON.stringify(inc.location)
      };
    });

    if (lowerSql.includes('where id =')) {
      const id = parseInt(params[0], 10);
      results = results.filter(r => r.id === id);
    }
    return { rows: results };
  }

  if (lowerSql.startsWith('insert into incidents')) {
    const description = params[0];
    const locationObj = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
    const predicted_category = params[2];
    const severity_score = parseFloat(params[3]);
    const confidence_score = parseFloat(params[4]);
    const requires_manual_verification = Boolean(params[5]);
    const status = params[6] || 'Reported';
    const assigned_team_id = params[7] || null;
    const reported_by_name = params[8] || 'Citizen';
    const weather_risk_summary = params[9] || null;

    const newInc = {
      id: inMemoryStore.incidentIdCounter++,
      description,
      location: locationObj,
      predicted_category,
      severity_score,
      confidence_score,
      requires_manual_verification,
      status,
      assigned_team_id,
      reported_by_name,
      weather_risk_summary,
      created_at: new Date()
    };
    inMemoryStore.incidents.unshift(newInc);
    return { rows: [{ ...newInc, location_geojson: JSON.stringify(newInc.location) }] };
  }

  if (lowerSql.startsWith('update incidents')) {
    const id = parseInt(params[params.length - 1], 10);
    const incIndex = inMemoryStore.incidents.findIndex(i => i.id === id);
    if (incIndex >= 0) {
      if (lowerSql.includes('status =') && lowerSql.includes('assigned_team_id =')) {
        inMemoryStore.incidents[incIndex].status = params[0];
        inMemoryStore.incidents[incIndex].assigned_team_id = params[1];
      } else if (lowerSql.includes('requires_manual_verification = false')) {
        inMemoryStore.incidents[incIndex].requires_manual_verification = false;
        if (params[0]) inMemoryStore.incidents[incIndex].predicted_category = params[0];
        if (params[1]) inMemoryStore.incidents[incIndex].severity_score = parseFloat(params[1]);
        inMemoryStore.incidents[incIndex].status = 'Verified';
      } else if (lowerSql.includes('status =')) {
        inMemoryStore.incidents[incIndex].status = params[0];
      }
      return { rows: [inMemoryStore.incidents[incIndex]] };
    }
    return { rows: [] };
  }

  // Hazards Queries
  if (lowerSql.startsWith('select') && lowerSql.includes('from hazards')) {
    const list = inMemoryStore.hazards.map(h => {
      const reporter = inMemoryStore.users.find(u => u.id === h.reported_by);
      return {
        ...h,
        reported_by_name: reporter ? reporter.name : 'Authority Vigya Gupta',
        area_geojson: JSON.stringify(h.area)
      };
    });
    return { rows: list };
  }

  if (lowerSql.startsWith('insert into hazards')) {
    const type = params[0];
    const areaObj = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
    const reported_by = params[2];
    const notes = params[3];
    const is_active = params[4] !== undefined ? params[4] : true;

    const newHaz = {
      id: inMemoryStore.hazardIdCounter++,
      type,
      area: areaObj,
      reported_by,
      notes,
      is_active,
      created_at: new Date()
    };
    inMemoryStore.hazards.unshift(newHaz);
    return { rows: [{ ...newHaz, area_geojson: JSON.stringify(newHaz.area) }] };
  }

  if (lowerSql.startsWith('update hazards')) {
    const id = parseInt(params[params.length - 1], 10);
    const haz = inMemoryStore.hazards.find(h => h.id === id);
    if (haz) {
      if (lowerSql.includes('is_active =')) {
        haz.is_active = params[0];
      }
      return { rows: [haz] };
    }
    return { rows: [] };
  }

  if (lowerSql.startsWith('delete from hazards')) {
    const id = parseInt(params[0], 10);
    inMemoryStore.hazards = inMemoryStore.hazards.filter(h => h.id !== id);
    return { rowCount: 1 };
  }

  // Central Offices Queries
  if (lowerSql.startsWith('select') && lowerSql.includes('from central_offices')) {
    return { rows: inMemoryStore.centralOffices };
  }

  return { rows: [] };
}

// Helper methods for Central Regional Offices & Squad Resting
export function getCentralOfficesStore() {
  return inMemoryStore.centralOffices;
}

export function getActiveCentralOfficeStore() {
  return (
    inMemoryStore.centralOffices.find(o => o.id === inMemoryStore.activeOfficeId) ||
    inMemoryStore.centralOffices[0]
  );
}

export function setActiveCentralOfficeStore(officeId) {
  const found = inMemoryStore.centralOffices.find(o => o.id === officeId);
  if (!found) return null;
  inMemoryStore.activeOfficeId = officeId;
  inMemoryStore.centralOffices.forEach(o => {
    o.is_active = o.id === officeId;
  });
  return found;
}

export function updateCentralOfficeStore(officeId, data) {
  const office = inMemoryStore.centralOffices.find(o => o.id === officeId);
  if (!office) return null;
  if (data.name) office.name = data.name;
  if (data.city) office.city = data.city;
  if (data.address) office.address = data.address;
  if (data.coordinates && Array.isArray(data.coordinates)) {
    office.location = { type: 'Point', coordinates: [parseFloat(data.coordinates[0]), parseFloat(data.coordinates[1])] };
  }
  return office;
}

export function resetSquadsToActiveOfficeStore() {
  const activeOffice = getActiveCentralOfficeStore();
  const coords = activeOffice.location.coordinates;
  const restingBaseName = `${activeOffice.name} (Resting Base)`;

  const updatedSquads = [];
  inMemoryStore.users.forEach(user => {
    if (user.role === 'Rescue Team') {
      user.station_base = restingBaseName;
      user.current_location = { type: 'Point', coordinates: [coords[0], coords[1]] };
      updatedSquads.push(user);
    }
  });
  return { activeOffice, updatedSquads };
}


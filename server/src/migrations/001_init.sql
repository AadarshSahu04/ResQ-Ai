-- RESQ-AI PostgreSQL + PostGIS Database Initialization Schema

-- 1. Enable PostGIS Extension for spatial queries and hazard mapping
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop existing tables if needed for clean re-runs
DROP TABLE IF EXISTS hazards CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS central_offices CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table (Strict RBAC: Admin, Disaster Authority, Rescue Team, Public User)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Disaster Authority', 'Rescue Team', 'Public User')),
    phone VARCHAR(50),
    station_base VARCHAR(255),
    current_location geometry(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Central Regional Offices Table (5 Major Headquarters across India)
CREATE TABLE central_offices (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    address TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Incidents Table (Emergency SOS reports with PostGIS Point geometry)
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    predicted_category VARCHAR(100),
    severity_score NUMERIC(4, 2) DEFAULT 0.50,
    confidence_score NUMERIC(5, 4) DEFAULT 0.0000,
    requires_manual_verification BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Reported' CHECK (status IN ('Reported', 'Verified', 'In Progress', 'Resolved')),
    assigned_team_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_by_name VARCHAR(255),
    weather_risk_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Hazards Table (Blocked roads, flood inundation zones with PostGIS Polygon geometry)
CREATE TABLE hazards (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Flood', 'Blockage')),
    area geometry(Polygon, 4326) NOT NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Spatial Indexes for high-performance geospatial queries (ST_Intersects, ST_Contains, ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hazards_area ON hazards USING GIST (area);
CREATE INDEX IF NOT EXISTS idx_offices_location ON central_offices USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_verification ON incidents(requires_manual_verification);

-- =========================================================================
-- SEED DATA (Demo Personnel, Central Regional Offices, Hazards, & Incidents)
-- Default Password for all seeded accounts: ResqSecure2026!
-- =========================================================================

-- Seed Users
INSERT INTO users (id, name, email, password_hash, role, phone, station_base, current_location) VALUES
(1, 'Aadarsh Sahu (Admin Head)', 'admin@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Admin', '+91-98765-01001', 'Indore Rau Central Command Hub (HQ Director)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(2, 'Vigya Gupta (Disaster Authority Director)', 'authority@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Disaster Authority', '+91-98765-01002', 'Indore Rau Central Command Hub (Operations)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(3, 'Yatharth Gupta (Garuda Rapid Squad 1)', 'rescue1@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Rescue Team', '+91-98765-01003', 'Indore Rau Central Command Hub (Resting Base)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(4, 'Rohan Singhania (Kavach Flood & Water Unit 2)', 'rescue2@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Rescue Team', '+91-98765-01004', 'Indore Rau Central Command Hub (Resting Base)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(5, 'Aarav Mukati (Chetak Quick Response Unit 3)', 'rescue3@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Rescue Team', '+91-98765-01008', 'Indore Rau Central Command Hub (Resting Base)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(6, 'Pooja Rathore (Trishul Heavy Tactical Squad 4)', 'rescue4@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Rescue Team', '+91-98765-01009', 'Indore Rau Central Command Hub (Resting Base)', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326)),
(7, 'Udit Maheshwari', 'public@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Public User', '+91-98765-01005', NULL, NULL),
(8, 'Shreyas Joshi', 'shreyas@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Public User', '+91-98765-01006', NULL, NULL),
(9, 'Ankitesh Das', 'ankitesh@resq.ai', '$2a$10$noI1vWdxzkjZq0c1wkRCu.aEpWlCLEceZ2Od9u1HiIVQHEp7HXuqK', 'Public User', '+91-98765-01007', NULL, NULL);

SELECT setval('users_id_seq', 10, true);

-- Seed Central Offices
INSERT INTO central_offices (id, name, city, state, region, location, address, description, is_active) VALUES
('indore_rau', 'Indore Rau Central Disaster Command Hub (Active Demo Base)', 'Indore (Rau)', 'Madhya Pradesh', 'Central India', ST_SetSRID(ST_MakePoint(75.8118, 22.6288), 4326), 'Rau Bypass Circle, AB Road, Indore, M.P. 453331', 'Central operations headquarters and resting quarters for tactical squads before emergency dispatch.', TRUE),
('noida_delhi', 'Noida Sector 62 Disaster Management Command', 'Noida (Near Delhi NCR)', 'Uttar Pradesh', 'Northern India', ST_SetSRID(ST_MakePoint(77.3638, 28.6258), 4326), 'Sector 62 Institutional Area, Noida, NCR 201309', 'National Capital Region command post for northern emergency operations.', FALSE),
('kalyan_mumbai', 'Kalyan Emergency Operations Complex', 'Kalyan (Near Mumbai)', 'Maharashtra', 'Western India', ST_SetSRID(ST_MakePoint(73.1350, 19.2437), 4326), 'Shivaji Chowk Emergency Staging Ground, Kalyan (W), Maharashtra 421301', 'Western coastal response hub for Mumbai metropolitan and Konkan disasters.', FALSE),
('vellore_south', 'Vellore Strategic Disaster Response Center', 'Vellore (Bengaluru-Chennai Corridor)', 'Tamil Nadu', 'Southern India', ST_SetSRID(ST_MakePoint(79.1325, 12.9165), 4326), 'Katpadi Strategic Reserve Base, Vellore, Tamil Nadu 632007', 'Bilateral transit corridor command serving Bengaluru, Chennai, and Deccan plateau.', FALSE),
('guwahati_ne', 'Guwahati Brahmaputra Tactical Command Post', 'Guwahati', 'Assam', 'North-East India', ST_SetSRID(ST_MakePoint(91.7362, 26.1445), 4326), 'Jalukbari Riverine Defense & Rescue Station, Guwahati, Assam 781014', 'Dedicated flood and seismic disaster command post for the North-Eastern states.', FALSE);

-- Seed Hazards in Indore
INSERT INTO hazards (id, type, area, reported_by, notes, is_active) VALUES
(1, 'Flood', ST_SetSRID(ST_GeomFromText('POLYGON((75.850 22.714, 75.863 22.714, 75.863 22.726, 75.850 22.726, 75.850 22.714))'), 4326), 2, 'Kanh River overflow inundating low-lying embankment settlements near Rajwada & Krishnapura Chhatri.', TRUE),
(2, 'Blockage', ST_SetSRID(ST_GeomFromText('POLYGON((75.888 22.746, 75.899 22.746, 75.899 22.756, 75.888 22.756, 75.888 22.746))'), 4326), 2, 'AB Road / Ring Road flyover structural debris & downed high-tension electric cable near Vijay Nagar.', TRUE);

SELECT setval('hazards_id_seq', 3, true);

-- Seed Incidents in Indore
INSERT INTO incidents (id, description, location, predicted_category, severity_score, confidence_score, requires_manual_verification, status, assigned_team_id, reported_by_name, weather_risk_summary) VALUES
(1, 'Kanh River monsoon flash flood inundated ground floor, 5 family members trapped on terrace near Krishnapura Chhatri, Rajwada.', ST_SetSRID(ST_MakePoint(75.8560, 22.7180), 4326), 'Flood', 0.88, 0.9250, FALSE, 'In Progress', 3, 'Udit Maheshwari', 'Monsoon heavy rain active (24.2 mm/h). Flash flood alert.'),
(2, 'Dense chemical smoke and fire spreading from basement textile storehouse in Cloth Market, Sitlamata Bazar.', ST_SetSRID(ST_MakePoint(75.8490, 22.7210), 4326), 'Fire', 0.65, 0.5200, TRUE, 'Reported', NULL, 'Shreyas Joshi', 'Wind speed 16 km/h. High humidity.'),
(3, 'Critical cardiac patient with acute asthma requires immediate oxygen cylinder delivery, transit obstructed near Bhawarkua Square.', ST_SetSRID(ST_MakePoint(75.8670, 22.6940), 4326), 'Medical', 0.94, 0.8900, FALSE, 'Verified', 6, 'Ankitesh Das', 'Overcast skies (3.0 mm/h drizzle).'),
(4, 'Severe waterlogging and collapsed hoarding blocking BRTS corridor near Palasia Square.', ST_SetSRID(ST_MakePoint(75.8830, 22.7230), 4326), 'Blockage', 0.72, 0.8400, FALSE, 'In Progress', 5, 'Udit Maheshwari', 'Moderate rainfall (8.5 mm/h).');

SELECT setval('incidents_id_seq', 5, true);

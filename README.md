# RESQ-AI | AI-Driven Disaster Response Coordination Platform

**RESQ-AI** is an intelligent, web-based emergency decision-support platform designed to automate and optimize disaster response coordination between citizens, disaster management authorities, and field rescue teams.

---

## 🏛️ System Architecture & Tech Stack

```
                +-------------------------------------------------------+
                |                    RESQ-AI FRONTEND                   |
                |   React (Vite) + TailwindCSS + React-Leaflet + Lucide |
                |      (Authority Ops Center | Rescue Team | Citizen)   |
                +---------------------------+---------------------------+
                                            |
                                  HTTP REST / WebSockets
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                    NODE / EXPRESS BACKEND                             |
|                           (Socket.io Real-Time Synchronization)                       |
|                                                                                       |
|   +-------------------+   +--------------------+   +-------------------------------+  |
|   |   Hugging Face    |   |     Open-Meteo     |   |          OSRM Engine          |  |
|   |  facebook/bart-   |   | Precipitation &    |   |     Turn-by-Turn Routing      |  |
|   |    large-mnli     |   | Flood Hazard API   |   |   & Hazard Polygon Avoidance  |  |
|   +-------------------+   +--------------------+   +-------------------------------+  |
|                                                                                       |
|   +-------------------+   +--------------------+   +-------------------------------+  |
|   |  JWT & BCrypt     |   |   Firebase Admin   |   |   PostgreSQL + PostGIS        |  |
|   |   Strict RBAC     |   |   Web Push (FCM)   |   | (Spatial Raycasting & Stored  |  |
|   |    Middleware     |   |   Emergency Alerts |   |    Hazards / GeoJSON Engine)  |  |
|   +-------------------+   +--------------------+   +-------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### 1. Frontend
- **Framework**: React 18 (Vite)
- **Mapping**: Leaflet & React-Leaflet with custom emergency marker animations and interactive polygon boundary drawing
- **Styling**: TailwindCSS with dark emergency theme and responsive grid layouts
- **Icons**: Lucide React
- **Real-Time Client**: Socket.io-client

### 2. Backend
- **Runtime**: Node.js & Express.js (ES Modules)
- **Real-Time Mesh**: Socket.io bidirectional WebSocket channels
- **Database Client**: `pg` (PostgreSQL client) with PostGIS spatial geometry indexing & queries
- **Resilience Engine**: Built-in spatial algorithm fallback (point-in-polygon raycasting and line-in-polygon segment intersection) ensures the platform operates 100% reliably in any environment.
- **Security**: JSON Web Tokens (JWT) + `bcryptjs` password hashing + strict RBAC middleware

### 3. AI & External Integrations
- **NLP Zero-Shot Classifier**: Hugging Face Inference API (`facebook/bart-large-mnli`) with automated Human-in-the-Loop review thresholding (<60% confidence).
- **Hydrological Risk Radar**: Open-Meteo API for real-time and 6-hour precipitation forecasts.
- **Routing Engine**: Open Source Routing Machine (OSRM) driving API with dynamic PostGIS polygon hazard collision detection.
- **Push Notification Infrastructure**: Firebase Cloud Messaging (FCM) Web Push + Socket.io instant broadcast fallback.

---

## 🗄️ Database Schema (PostgreSQL + PostGIS)

### 1. `users` Table
Strict Role-Based Access Control (`Admin`, `Disaster Authority`, `Rescue Team`, `Public User`):
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Disaster Authority', 'Rescue Team', 'Public User')),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `incidents` Table
Emergency SOS reports stored with PostGIS Point geometries:
```sql
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
```

### 3. `hazards` Table
Blocked roadways and flood inundation zones stored with PostGIS Polygon geometries:
```sql
CREATE TABLE hazards (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Flood', 'Blockage')),
    area geometry(Polygon, 4326) NOT NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Spatial Indexes
```sql
CREATE INDEX idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX idx_hazards_area ON hazards USING GIST (area);
```

---

## 🚀 Key Features & Implementation Details

### 1. Human-in-the-Loop (HITL) AI Workflow
When a citizen submits an emergency SOS report:
1. The text description is analyzed by `facebook/bart-large-mnli` across candidate disaster classes (`Medical`, `Fire`, `Flood`, `Trapped`, `Blockage`).
2. If the AI model's top confidence score is **< 0.60 (60%)**, the incident entry is automatically flagged:
   ```json
   { "requires_manual_verification": true }
   ```
3. A priority banner and alert trigger on the Disaster Authority dashboard.
4. Authorities can open the **Human-in-the-Loop Verification Modal**, review the incident text and AI confidence meter, adjust the category and severity rating, and click **Authorize & Verify**.
5. The verified report is immediately broadcast across the mesh to all rescue squads.

### 2. Interactive Hazard Boundary Drawing & Rerouting
1. **Drawing Hazard Zones**: Disaster Authorities and Admins can click **Declare Hazard Zone** on the live map. Clicking the map plots polygon vertices in real-time. Once submitted, the boundary is stored as a PostGIS `Polygon` (SRID 4326).
2. **OSRM Route Collision Detection**: When calculating point-to-point routes for rescue units, the route geometry (LineString) is evaluated against all active hazard polygons using PostGIS spatial intersection:
   - If the route intersects an active flood zone or roadway obstruction, a **Tactical Hazard Warning** is returned with the impacted sectors, and OSRM alternative paths or avoidance directives are dispatched to field units.

### 3. Graceful Degradation
All external API calls (Hugging Face, Open-Meteo, OSRM, Firebase) are wrapped in try-catch blocks with timeouts. If external internet services fail or rate limits are reached, the system smoothly falls back to internal heuristics (rule-based NLP, safe weather defaults, straight-line emergency vectors) without crashing the server.

---

## 🔑 Default Demo Accounts

All pre-seeded demo accounts use password: `ResqSecure2026!`

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Disaster Authority** | `authority@resq.ai` | Command Center, Live Map, Draw Hazards, HITL AI Verification, Squad Dispatch |
| **Admin** | `admin@resq.ai` | Full Administrative Privileges, User Management, Hazard Purging |
| **Rescue Team** | `rescue1@resq.ai` | Tactical Missions Dashboard, Turn-by-Turn OSRM Routing, Hazard Warnings |
| **Public User** | `public@resq.ai` | Public SOS Portal, Live GPS Triage, Disaster Advice |

---

## 🛠️ Quick Start & Installation

### 1. Clone & Install Dependencies
```bash
# In the project root directory
npm run install-all
```

### 2. Configure Environment Variables
Copy `.env.example` in `server/`:
```bash
cp server/.env.example server/.env
```
Edit `server/.env` to include optional Hugging Face API tokens or custom PostgreSQL credentials.

### 3. Database Migration (Optional when connecting external PostgreSQL)
```bash
npm run migrate
```
*(Applies schemas for users, incidents, hazards, and regional central offices along with pre-seeded demo accounts and PostGIS indexes).*

### 4. Build Client (Production Build)
```bash
npm run build
```

### 5. Run Server & Application
```bash
# Start backend (serves both API and compiled React dashboard on port 5001 with macOS AirPlay port fallback):
npm start
```
Open **`http://localhost:5001`** in any browser.

To run the Vite hot-reloading development server:
```bash
npm run client
```
Open **`http://localhost:5173`**.

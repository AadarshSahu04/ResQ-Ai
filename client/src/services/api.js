const rawApiUrl = import.meta.env.VITE_API_URL;
let API_BASE = '/api';
if (rawApiUrl) {
  const trimmed = rawApiUrl.replace(/\/$/, '');
  API_BASE = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getAuthHeaders() {
  const token = localStorage.getItem('resq_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(name, email, password, role, phone) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
    return data;
  },

  // Users & Rescue Teams
  async getRescueTeams() {
    const res = await fetch(`${API_BASE}/users/rescue-teams`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch teams');
    return data.rescueTeams || [];
  },

  async updateSquadLocation(teamId, coordinates, stationBase) {
    const res = await fetch(`${API_BASE}/users/${teamId}/location`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ coordinates, station_base: stationBase }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update squad location');
    return data;
  },

  // Incidents
  async getIncidents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/incidents?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch incidents');
    return data.incidents || [];
  },

  async createIncident(incidentData) {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(incidentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit incident');
    return data;
  },

  async updateIncidentStatus(id, status, assignedTeamId) {
    const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, assigned_team_id: assignedTeamId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  },

  async verifyIncident(id, verifiedCategory, severityScore) {
    const res = await fetch(`${API_BASE}/incidents/${id}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        verified_category: verifiedCategory,
        severity_score: severityScore,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify incident');
    return data;
  },

  // Hazards
  async getHazards(activeOnly = false) {
    const res = await fetch(`${API_BASE}/hazards?active_only=${activeOnly}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch hazards');
    return data.hazards || [];
  },

  async createHazard(hazardData) {
    const res = await fetch(`${API_BASE}/hazards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(hazardData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create hazard');
    return data;
  },

  async toggleHazard(id, isActive) {
    const res = await fetch(`${API_BASE}/hazards/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle hazard');
    return data;
  },

  async deleteHazard(id) {
    const res = await fetch(`${API_BASE}/hazards/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete hazard');
    return data;
  },

  // Routing
  async calculateRoute(origin, destination, incidentId) {
    const res = await fetch(`${API_BASE}/routes/calculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ origin, destination, incidentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Routing failed');
    return data;
  },

  // Weather
  async getWeather(lat, lon) {
    const res = await fetch(`${API_BASE}/weather/forecast?lat=${lat}&lon=${lon}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Weather lookup failed');
    return data;
  },

  // Central Regional Offices & Squad Resting HQ
  async getOffices() {
    const res = await fetch(`${API_BASE}/offices`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch offices');
    return data;
  },

  async getActiveOffice() {
    const res = await fetch(`${API_BASE}/offices/active`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch active office');
    return data;
  },

  async setActiveOffice(officeId) {
    const res = await fetch(`${API_BASE}/offices/set-active`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ officeId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to set active office');
    return data;
  },

  async updateOffice(officeId, updateData) {
    const res = await fetch(`${API_BASE}/offices/${officeId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update office');
    return data;
  },

  async resetSquadsToOffice() {
    const res = await fetch(`${API_BASE}/offices/reset-squads`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset squads');
    return data;
  },
};


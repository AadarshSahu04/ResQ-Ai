export function getApiBase() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('resq_api_url') : null;
  const rawApiUrl = custom || import.meta.env.VITE_API_URL;
  if (rawApiUrl) {
    const trimmed = rawApiUrl.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
}

export function setCustomApiUrl(url) {
  if (!url) {
    localStorage.removeItem('resq_api_url');
  } else {
    const cleaned = url.trim().replace(/\/$/, '');
    localStorage.setItem('resq_api_url', cleaned);
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('resq_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchApi(endpoint, options = {}, defaultError = 'Request failed') {
  const url = `${getApiBase()}${endpoint}`;
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error(
      `Unable to reach backend (${netErr.message}). Verify your Render server is awake and connected.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      // not valid json
    }
  }

  if (!res.ok) {
    if (res.status === 405 || (res.status === 404 && !data)) {
      throw new Error(
        `Backend endpoint not found (${res.status}). Verify VITE_API_URL is configured with your Render backend URL in Vercel settings.`
      );
    }
    const fallbackText = !data ? await res.text().catch(() => '') : '';
    throw new Error(data?.error || data?.message || fallbackText || `${defaultError} (${res.status})`);
  }

  if (data === null) {
    if (res.status === 204) return {};
    const text = await res.text().catch(() => '');
    throw new Error(text || `Unexpected response from server (${res.status})`);
  }

  return data;
}

export const api = {
  // Auth
  async login(email, password) {
    return fetchApi(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      'Login failed'
    );
  },

  async register(name, email, password, role, phone) {
    return fetchApi(
      '/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone }),
      },
      'Registration failed'
    );
  },

  async getMe() {
    return fetchApi(
      '/auth/me',
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch user'
    );
  },

  // Users & Rescue Teams
  async getRescueTeams() {
    const data = await fetchApi(
      '/users/rescue-teams',
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch teams'
    );
    return data.rescueTeams || [];
  },

  async updateSquadLocation(teamId, coordinates, stationBase) {
    return fetchApi(
      `/users/${teamId}/location`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ coordinates, station_base: stationBase }),
      },
      'Failed to update squad location'
    );
  },

  // Incidents
  async getIncidents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await fetchApi(
      `/incidents?${params}`,
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch incidents'
    );
    return data.incidents || [];
  },

  async createIncident(incidentData) {
    return fetchApi(
      '/incidents',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(incidentData),
      },
      'Failed to submit incident'
    );
  },

  async updateIncidentStatus(id, status, assignedTeamId) {
    return fetchApi(
      `/incidents/${id}/status`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, assigned_team_id: assignedTeamId }),
      },
      'Failed to update status'
    );
  },

  async verifyIncident(id, verifiedCategory, severityScore) {
    return fetchApi(
      `/incidents/${id}/verify`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verified_category: verifiedCategory,
          severity_score: severityScore,
        }),
      },
      'Failed to verify incident'
    );
  },

  // Hazards
  async getHazards(activeOnly = false) {
    const data = await fetchApi(
      `/hazards?active_only=${activeOnly}`,
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch hazards'
    );
    return data.hazards || [];
  },

  async createHazard(hazardData) {
    return fetchApi(
      '/hazards',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(hazardData),
      },
      'Failed to create hazard'
    );
  },

  async toggleHazard(id, isActive) {
    return fetchApi(
      `/hazards/${id}/toggle`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      },
      'Failed to toggle hazard'
    );
  },

  async deleteHazard(id) {
    return fetchApi(
      `/hazards/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      'Failed to delete hazard'
    );
  },

  // Routing
  async calculateRoute(origin, destination, incidentId) {
    return fetchApi(
      '/routes/calculate',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ origin, destination, incidentId }),
      },
      'Routing failed'
    );
  },

  // Weather
  async getWeather(lat, lon) {
    return fetchApi(
      `/weather/forecast?lat=${lat}&lon=${lon}`,
      {
        headers: getAuthHeaders(),
      },
      'Weather lookup failed'
    );
  },

  // Central Regional Offices & Squad Resting HQ
  async getOffices() {
    return fetchApi(
      '/offices',
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch offices'
    );
  },

  async getActiveOffice() {
    return fetchApi(
      '/offices/active',
      {
        headers: getAuthHeaders(),
      },
      'Failed to fetch active office'
    );
  },

  async setActiveOffice(officeId) {
    return fetchApi(
      '/offices/set-active',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ officeId }),
      },
      'Failed to set active office'
    );
  },

  async updateOffice(officeId, updateData) {
    return fetchApi(
      `/offices/${officeId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      },
      'Failed to update office'
    );
  },

  async resetSquadsToOffice() {
    return fetchApi(
      '/offices/reset-squads',
      {
        method: 'POST',
        headers: getAuthHeaders(),
      },
      'Failed to reset squads'
    );
  },
};

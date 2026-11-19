import React, { useState, useEffect } from 'react';
import {
  Radio,
  Filter,
  AlertTriangle,
  Users,
  Pencil,
  Navigation,
  CheckCircle,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Flame,
  Droplets,
  HeartPulse,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Check,
  Archive,
  RotateCcw,
  Building2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapView } from '../components/MapView';
import { HazardDrawer } from '../components/HazardDrawer';
import { StatsOverview } from '../components/StatsOverview';
import { WeatherWidget } from '../components/WeatherWidget';
import { IncidentVerificationModal } from '../components/IncidentVerificationModal';
import { AssignTeamModal } from '../components/AssignTeamModal';
import { RouteViewerModal } from '../components/RouteViewerModal';
import { CentralOfficesModal } from '../components/CentralOfficesModal';

export function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [incidents, setIncidents] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [centralOffices, setCentralOffices] = useState([]);
  const [activeOffice, setActiveOffice] = useState(null);
  const [showOfficesModal, setShowOfficesModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, HITL, IN_PROGRESS, RESOLVED
  const [sideTab, setSideTab] = useState('incidents'); // incidents, hazards, weather
  const [showResolvedAccordion, setShowResolvedAccordion] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);

  // Modals state
  const [selectedIncidentForVerification, setSelectedIncidentForVerification] = useState(null);
  const [selectedIncidentForAssign, setSelectedIncidentForAssign] = useState(null);
  const [activeRouteData, setActiveRouteData] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization listeners
  useEffect(() => {
    if (!socket) return;

    const onIncidentCreated = (event) => {
      const inc = event.payload;
      setIncidents((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)]);
    };

    const onIncidentUpdated = (event) => {
      const inc = event.payload;
      setIncidents((prev) => prev.map((i) => (i.id === inc.id ? inc : i)));
      if (inc?.status === 'Resolved') {
        setActiveRouteData((prevRoute) => (prevRoute?.incidentId === inc.id ? null : prevRoute));
      }
    };

    const onIncidentVerified = (event) => {
      const inc = event.payload;
      setIncidents((prev) => prev.map((i) => (i.id === inc.id ? inc : i)));
    };

    const onHazardCreated = (event) => {
      const haz = event.payload;
      if (haz && haz.id) {
        setHazards((prev) => [haz, ...prev.filter((h) => h.id !== haz.id)]);
      }
    };

    const onHazardUpdated = (event) => {
      const haz = event.payload;
      if (haz && haz.id) {
        setHazards((prev) => prev.map((h) => (h.id === haz.id ? haz : h)));
      }
    };

    const onHazardDeleted = (event) => {
      const id = event.payload?.id;
      if (id) {
        setHazards((prev) => prev.filter((h) => h.id !== id));
      }
    };

    const onSquadMoved = (event) => {
      const { teamId, coordinates, station_base } = event;
      setRescueTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, current_location: { type: 'Point', coordinates }, station_base: station_base || t.station_base }
            : t
        )
      );
    };

    const onOfficeActiveChanged = (event) => {
      setActiveOffice(event.activeOffice);
      setCentralOffices((prev) =>
        prev.map((o) => ({ ...o, is_active: o.id === event.activeOffice.id }))
      );
    };

    const onOfficeUpdated = (event) => {
      setCentralOffices((prev) =>
        prev.map((o) => (o.id === event.office.id ? event.office : o))
      );
      if (activeOffice?.id === event.office.id) {
        setActiveOffice(event.office);
      }
    };

    socket.on('incident:created', onIncidentCreated);
    socket.on('incident:updated', onIncidentUpdated);
    socket.on('incident:verified', onIncidentVerified);
    socket.on('hazard:created', onHazardCreated);
    socket.on('hazard:updated', onHazardUpdated);
    socket.on('hazard:deleted', onHazardDeleted);
    socket.on('rescueTeam:moved', onSquadMoved);
    socket.on('office:activeChanged', onOfficeActiveChanged);
    socket.on('office:updated', onOfficeUpdated);

    return () => {
      socket.off('incident:created', onIncidentCreated);
      socket.off('incident:updated', onIncidentUpdated);
      socket.off('incident:verified', onIncidentVerified);
      socket.off('hazard:created', onHazardCreated);
      socket.off('hazard:updated', onHazardUpdated);
      socket.off('hazard:deleted', onHazardDeleted);
      socket.off('rescueTeam:moved', onSquadMoved);
      socket.off('office:activeChanged', onOfficeActiveChanged);
      socket.off('office:updated', onOfficeUpdated);
    };
  }, [socket, activeOffice]);

  async function loadData() {
    setLoading(true);
    try {
      const [incList, hazList, teamsList, officesRes] = await Promise.all([
        api.getIncidents(),
        api.getHazards(),
        api.getRescueTeams(),
        api.getOffices(),
      ]);
      setIncidents(incList);
      setHazards(hazList);
      setRescueTeams(teamsList);
      if (officesRes) {
        setCentralOffices(officesRes.offices || []);
        setActiveOffice(officesRes.activeOffice || officesRes.offices?.[0] || null);
      }
    } catch (err) {
      console.warn('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Save new hazard polygon drawn on map
  async function handleSaveHazard(hazardPayload) {
    const res = await api.createHazard(hazardPayload);
    setHazards((prev) => [res.hazard, ...prev]);
  }

  // Toggle active status of a hazard
  async function handleToggleHazard(id, isActive) {
    try {
      const res = await api.toggleHazard(id, isActive);
      if (res?.hazard) {
        setHazards((prev) => prev.map((h) => (h.id === id ? res.hazard : h)));
      }
    } catch (err) {
      console.error('Failed to toggle hazard:', err);
    }
  }

  // Delete a hazard
  async function handleDeleteHazard(id) {
    if (!window.confirm('Delete this hazard perimeter?')) return;
    try {
      await api.deleteHazard(id);
      setHazards((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Failed to delete hazard:', err);
    }
  }

  // Verify incident (Human-in-the-Loop)
  async function handleConfirmVerification(id, category, severity) {
    const res = await api.verifyIncident(id, category, severity);
    setIncidents((prev) => prev.map((i) => (i.id === id ? res.incident : i)));
  }

  // Dispatch rescue squad to incident
  async function handleAssignTeam(incidentId, status, teamId) {
    const res = await api.updateIncidentStatus(incidentId, status, teamId);
    setIncidents((prev) => prev.map((i) => (i.id === incidentId ? res.incident : i)));
  }

  // Mark Incident as Resolved (Direct Admin & Authority capability)
  async function handleMarkResolved(incidentId) {
    try {
      const res = await api.updateIncidentStatus(incidentId, 'Resolved');
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? res.incident : i)));
      // If this incident currently had an active route on the map, clear it immediately
      setActiveRouteData((prevRoute) => (prevRoute?.incidentId === incidentId ? null : prevRoute));
    } catch (err) {
      alert(`Error resolving incident: ${err.message}`);
    }
  }

  // Re-open a resolved incident back to In Progress
  async function handleReopenIncident(incidentId) {
    try {
      const res = await api.updateIncidentStatus(incidentId, 'In Progress');
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? res.incident : i)));
    } catch (err) {
      alert(`Error reopening incident: ${err.message}`);
    }
  }

  // Calculate route dynamically from assigned squad location or active Central HQ
  async function handleRouteToIncident(incident) {
    if (!incident) return;
    let loc = incident.location;
    if (typeof loc === 'string') {
      try {
        loc = JSON.parse(loc);
      } catch (e) {}
    }
    const coords = loc?.coordinates;
    if (!coords || !Array.isArray(coords) || coords.length < 2) {
      alert('Incident has no valid coordinates.');
      return;
    }

    try {
      let origin = null;

      // 1. If an assigned rescue squad exists, use their current live GPS coordinates
      if (incident.assigned_team_id) {
        const assigned = rescueTeams.find((t) => t.id === incident.assigned_team_id);
        if (assigned && assigned.current_location?.coordinates) {
          origin = assigned.current_location.coordinates;
        }
      }

      // 2. If logged-in user is a Rescue Team member, use their squad's coordinates
      if (!origin && user?.role === 'Rescue Team') {
        const mySquad = rescueTeams.find((t) => t.id === user.id);
        if (mySquad && mySquad.current_location?.coordinates) {
          origin = mySquad.current_location.coordinates;
        }
      }

      // 3. Otherwise, pick the closest rescue squad or default to the active Central Regional HQ (Indore Rau)
      if (!origin) {
        const [destLon, destLat] = coords;
        let closestDist = Infinity;
        let closestSquadCoords = null;

        for (const sq of rescueTeams) {
          if (sq.current_location?.coordinates) {
            const [sLon, sLat] = sq.current_location.coordinates;
            const dist = Math.hypot(destLon - sLon, destLat - sLat);
            if (dist < closestDist) {
              closestDist = dist;
              closestSquadCoords = sq.current_location.coordinates;
            }
          }
        }

        origin = closestSquadCoords || activeOffice?.location?.coordinates || [75.8118, 22.6288];
      }

      const destination = coords;
      const routeRes = await api.calculateRoute(origin, destination, incident.id);
      const defaultMode =
        routeRes.selectedMode ||
        (routeRes.alternativeRoute ? 'safe' : (routeRes.multimodal?.isMultimodal ? 'multimodal' : 'safe'));

      setActiveRouteData({
        ...routeRes,
        incidentId: incident.id,
        selectedMode: defaultMode,
      });
    } catch (err) {
      alert(`Routing error: ${err.message}`);
    }
  }

  // Separate Active and Resolved Incidents
  const activeIncidents = incidents.filter((inc) => inc.status !== 'Resolved');
  const resolvedIncidents = incidents.filter((inc) => inc.status === 'Resolved');

  // Incidents to render on the tactical map: only active unresolved incidents
  // (plus if user is previewing a route to an archived disaster from the resolved list, temporarily show that target pin)
  const mapIncidents = activeIncidents.slice();
  if (activeRouteData?.incidentId) {
    const routedArchived = resolvedIncidents.find((i) => i.id === activeRouteData.incidentId);
    if (routedArchived && !mapIncidents.some((i) => i.id === routedArchived.id)) {
      mapIncidents.push(routedArchived);
    }
  }

  // Filtered active incidents for the main feed
  const displayActiveIncidents = activeIncidents.filter((inc) => {
    if (filterStatus === 'HITL') return inc.requires_manual_verification;
    if (filterStatus === 'IN_PROGRESS') return inc.status === 'In Progress';
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1700px] mx-auto bg-slate-50 min-h-screen">
      {/* Top Stats Overview */}
      <StatsOverview incidents={incidents} hazards={hazards} />

      {/* Main Operations Split View: Map + Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[680px]">
        {/* Left Map View (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Map Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                Indore Tactical Geospatial Grid
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({activeIncidents.length} Active SOS / {rescueTeams.length} Squads In-Field)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Regional Central HQs Management Button */}
              <button
                onClick={() => setShowOfficesModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Manage 5 National Regional Headquarters & Squad Resting Bases"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span className="hidden sm:inline text-slate-600 font-semibold">Active HQ:</span>
                <span className="text-blue-950 font-black">{activeOffice?.city || 'Indore (Rau)'}</span>
              </button>

              {/* Clear Active Route Button if a navigation route is displayed */}
              {activeRouteData && (
                <button
                  onClick={() => setActiveRouteData(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Clear active navigation route from map"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Clear Route</span>
                </button>
              )}

              {/* Authority Hazard Drawing Button */}
              {['Admin', 'Disaster Authority'].includes(user?.role) && (
                <HazardDrawer
                  isDrawing={isDrawing}
                  setIsDrawing={setIsDrawing}
                  drawingPoints={drawingPoints}
                  setDrawingPoints={setDrawingPoints}
                  onSaveHazard={handleSaveHazard}
                />
              )}
            </div>
          </div>

          {/* Interactive React-Leaflet Map */}
          <div className="flex-1 min-h-[550px] relative">
            <MapView
              incidents={mapIncidents}
              hazards={hazards}
              rescueTeams={rescueTeams}
              centralOffices={centralOffices}
              activeRoute={activeRouteData}
              isDrawing={isDrawing}
              drawingPoints={drawingPoints}
              onAddDrawingPoint={(pt) => setDrawingPoints((prev) => [...prev, pt])}
              onVerifyIncident={(inc) => setSelectedIncidentForVerification(inc)}
              onAssignTeam={(inc) => setSelectedIncidentForAssign(inc)}
              onRouteToIncident={handleRouteToIncident}
              onResolveIncident={handleMarkResolved}
              onToggleHazard={handleToggleHazard}
              onDeleteHazard={handleDeleteHazard}
              userRole={user?.role}
              center={[22.7196, 75.8577]} // Indore, M.P.
              zoom={13}
            />
          </div>
        </div>

        {/* Right Operations Feed & Control Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 p-2 gap-1.5">
            <button
              onClick={() => setSideTab('incidents')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sideTab === 'incidents'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-orange-500" />
              <span>Active Calls ({activeIncidents.length})</span>
            </button>

            <button
              onClick={() => setSideTab('hazards')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sideTab === 'hazards'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Hazards ({hazards.length})</span>
            </button>

            <button
              onClick={() => setSideTab('weather')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sideTab === 'weather'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-sky-600" />
              <span>Weather</span>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[620px] space-y-3">
            {/* INCIDENTS TAB */}
            {sideTab === 'incidents' && (
              <>
                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200">
                  <button
                    onClick={() => {
                      setFilterStatus('ALL');
                      setShowResolvedAccordion(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterStatus === 'ALL'
                        ? 'bg-blue-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Active SOS ({activeIncidents.length})
                  </button>

                  <button
                    onClick={() => {
                      setFilterStatus('HITL');
                      setShowResolvedAccordion(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      filterStatus === 'HITL'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>HITL Verify ({activeIncidents.filter((i) => i.requires_manual_verification).length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setFilterStatus('IN_PROGRESS');
                      setShowResolvedAccordion(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterStatus === 'IN_PROGRESS'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    In Progress ({activeIncidents.filter((i) => i.status === 'In Progress').length})
                  </button>

                  <button
                    onClick={() => setShowResolvedAccordion(!showResolvedAccordion)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      showResolvedAccordion
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>Archived ({resolvedIncidents.length})</span>
                  </button>
                </div>

                {/* Main Active Incidents List (Clean & Decluttered!) */}
                <div className="space-y-3">
                  {displayActiveIncidents.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No pending active incidents in this category. All clear!
                    </div>
                  ) : (
                    displayActiveIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className={`bg-white border p-4 rounded-xl text-xs space-y-2.5 transition shadow-sm hover:shadow ${
                          incident.requires_manual_verification
                            ? 'border-amber-400 bg-amber-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-blue-950 text-sm">
                              #{incident.id}
                            </span>
                            <span className="font-bold text-slate-800 text-sm">
                              {incident.predicted_category}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              incident.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">
                          "{incident.description}"
                        </p>

                        {/* Caller Info */}
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Caller: <strong>{incident.reported_by_name || 'Citizen'}</strong></span>
                          <span>Time: {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* AI & HITL Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1 border-t border-slate-100">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            Severity: <strong className="text-red-600">{Math.round(incident.severity_score * 100)}%</strong>
                          </span>

                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            AI Confidence: <strong className={incident.confidence_score < 0.6 ? 'text-amber-700' : 'text-emerald-700'}>
                              {Math.round(incident.confidence_score * 100)}%
                            </strong>
                          </span>

                          {incident.requires_manual_verification && (
                            <span className="bg-amber-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3 h-3" />
                              <span>HITL Verify Required</span>
                            </span>
                          )}

                          {incident.assigned_team_name && (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                              Squad: {incident.assigned_team_name}
                            </span>
                          )}
                        </div>

                        {/* Action buttons with prominent Resolve, Dispatch, and Nav Route */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                          {incident.requires_manual_verification && (
                            <button
                              onClick={() => setSelectedIncidentForVerification(incident)}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Verify AI</span>
                            </button>
                          )}

                          {['Admin', 'Disaster Authority'].includes(user?.role) && (
                            <button
                              onClick={() => setSelectedIncidentForAssign(incident)}
                              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Assign Squad</span>
                            </button>
                          )}

                          {/* Instant Mark as Resolved button */}
                          {['Admin', 'Disaster Authority'].includes(user?.role) && (
                            <button
                              onClick={() => handleMarkResolved(incident.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Resolve and move to archive"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleRouteToIncident(incident)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm ml-auto cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Nav Route</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Collapsible Resolved Incidents Dropdown Box */}
                {resolvedIncidents.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mt-4 shadow-2xs">
                    <button
                      onClick={() => setShowResolvedAccordion(!showResolvedAccordion)}
                      className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-blue-950 font-bold">
                          Archived Resolved Disasters ({resolvedIncidents.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="text-[11px] font-medium">
                          {showResolvedAccordion ? 'Hide Archive' : 'View Resolved Disasters'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showResolvedAccordion ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {showResolvedAccordion && (
                      <div className="p-3 border-t border-slate-200 space-y-2.5 bg-slate-100/40">
                        {resolvedIncidents.map((inc) => (
                          <div
                            key={inc.id}
                            className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                #{inc.id} {inc.predicted_category}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Resolved
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] line-clamp-1 italic">
                              "{inc.description}"
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                              <span>Reporter: {inc.reported_by_name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRouteToIncident(inc)}
                                  className="text-blue-600 font-semibold hover:underline"
                                >
                                  View Path
                                </button>
                                {['Admin', 'Disaster Authority'].includes(user?.role) && (
                                  <button
                                    onClick={() => handleReopenIncident(inc.id)}
                                    className="text-orange-600 font-semibold hover:underline flex items-center gap-0.5"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Reopen</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* HAZARDS TAB */}
            {sideTab === 'hazards' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Indore PostGIS Hazard Corridors
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {hazards.filter((h) => h.is_active).length} Active Zones
                  </span>
                </div>

                {hazards.map((hazard) => (
                  <div
                    key={hazard.id}
                    className="bg-white border border-slate-200 p-3.5 rounded-xl text-xs space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] text-white ${
                            hazard.type === 'Flood' ? 'bg-sky-600' : 'bg-red-600'
                          }`}
                        >
                          {hazard.type}
                        </span>
                        <span className="font-bold text-blue-950">Zone #{hazard.id}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          hazard.is_active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {hazard.is_active ? 'ACTIVE' : 'CLEARED'}
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs">
                      {hazard.notes || 'No description provided.'}
                    </p>

                    {['Admin', 'Disaster Authority'].includes(user?.role) && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <button
                          onClick={() => handleToggleHazard(hazard.id, !hazard.is_active)}
                          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 cursor-pointer"
                        >
                          {hazard.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>Reactivate</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteHazard(hazard.id)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* WEATHER TAB */}
            {sideTab === 'weather' && (
              <div className="space-y-4">
                <WeatherWidget latitude={22.7196} longitude={75.8577} />
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700 shadow-sm">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <span>Hydrological Risk Radar (Indore M.P.)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Precipitation metrics polled in real-time from Open-Meteo for Indore. Kanh river flood levels and BRTS corridor waterlogging actively monitored for rerouting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedIncidentForVerification && (
        <IncidentVerificationModal
          incident={selectedIncidentForVerification}
          onClose={() => setSelectedIncidentForVerification(null)}
          onConfirm={handleConfirmVerification}
        />
      )}

      {/* Assign Team Modal */}
      {selectedIncidentForAssign && (
        <AssignTeamModal
          incident={selectedIncidentForAssign}
          rescueTeams={rescueTeams}
          onClose={() => setSelectedIncidentForAssign(null)}
          onAssign={handleAssignTeam}
        />
      )}

      {/* Route Viewer Modal */}
      {activeRouteData && (
        <RouteViewerModal
          routeData={activeRouteData}
          onClose={() => setActiveRouteData(null)}
          onClearRoute={() => setActiveRouteData(null)}
          onSelectRouteVariant={(variant, mode) => {
            setActiveRouteData((prev) => ({
              ...prev,
              route: variant,
              selectedMode: mode,
            }));
          }}
        />
      )}

      {/* Central Regional Headquarters & Squad Resting Management Modal */}
      {showOfficesModal && (
        <CentralOfficesModal
          offices={centralOffices}
          activeOffice={activeOffice}
          isAdmin={['Admin', 'Disaster Authority'].includes(user?.role)}
          onClose={() => setShowOfficesModal(false)}
          onOfficeChanged={(updated) => {
            setActiveOffice(updated);
            setCentralOffices((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...updated, is_active: true } : { ...o, is_active: false }))
            );
          }}
          onSquadsReset={(updatedSquads) => {
            setRescueTeams((prev) =>
              prev.map((t) => {
                const match = updatedSquads.find((s) => s.id === t.id);
                return match ? match : t;
              })
            );
          }}
        />
      )}
    </div>
  );
}

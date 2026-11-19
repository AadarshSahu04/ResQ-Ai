import React, { useState, useEffect } from 'react';
import {
  Shield,
  Navigation,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Radio,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Locate,
  Check,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Crosshair
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapView } from '../components/MapView';

// Regional Squad Base Presets for rapid GPS relocation (Rau HQ as Primary Resting Base)
const INDORE_SQUAD_BASES = [
  { name: 'Indore Rau Central Command Hub (Resting Base)', coords: [75.8118, 22.6288] },
  { name: 'Vijay Nagar Square Base', coords: [75.8940, 22.7533] },
  { name: 'Palasia Emergency Depot', coords: [75.8820, 22.7210] },
  { name: 'Rajwada / Central Post', coords: [75.8577, 22.7196] },
  { name: 'Bhawarkua Tactical Hub', coords: [75.8650, 22.6950] },
  { name: 'Indore Airport Depot', coords: [75.8010, 22.7280] },
  { name: 'MR-10 Ring Road Crossing', coords: [75.8750, 22.7680] },
];

export function RescueTeamView() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [incidents, setIncidents] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [centralOffices, setCentralOffices] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activeRouteData, setActiveRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showResolvedArchive, setShowResolvedArchive] = useState(false);
  const [routeViewMode, setRouteViewMode] = useState('safe'); // 'safe' or 'blocked'

  // Squad Location State (Defaulting to Rau Central Resting Hub)
  const [activeSquadId, setActiveSquadId] = useState(user?.id || 3);
  const [squadCoords, setSquadCoords] = useState([75.8118, 22.6288]); // Rau Central Base default
  const [stationBaseName, setStationBaseName] = useState('Indore Rau Central Command Hub (Resting Base)');
  const [isSettingLocationOnMap, setIsSettingLocationOnMap] = useState(false);

  useEffect(() => {
    loadAssignedData();
  }, [user]);

  // Real-time hazard updates for rescue squads
  useEffect(() => {
    if (!socket) return;
    const onHazardUpdated = (event) => {
      const haz = event.payload;
      if (haz?.id) {
        setHazards((prev) => prev.map((h) => (h.id === haz.id ? haz : h)));
      }
    };
    const onHazardCreated = (event) => {
      const haz = event.payload;
      if (haz?.id) {
        setHazards((prev) => [haz, ...prev.filter((h) => h.id !== haz.id)]);
      }
    };
    const onHazardDeleted = (event) => {
      const id = event.payload?.id;
      if (id) {
        setHazards((prev) => prev.filter((h) => h.id !== id));
      }
    };

    socket.on('hazard:updated', onHazardUpdated);
    socket.on('hazard:created', onHazardCreated);
    socket.on('hazard:deleted', onHazardDeleted);

    return () => {
      socket.off('hazard:updated', onHazardUpdated);
      socket.off('hazard:created', onHazardCreated);
      socket.off('hazard:deleted', onHazardDeleted);
    };
  }, [socket]);

  async function loadAssignedData() {
    setLoading(true);
    try {
      const [allIncidents, allHazards, allTeams, officesRes] = await Promise.all([
        api.getIncidents(),
        api.getHazards(),
        api.getRescueTeams(),
        api.getOffices(),
      ]);
      setHazards(allHazards);
      setRescueTeams(allTeams);
      if (officesRes) {
        setCentralOffices(officesRes.offices || []);
      }

      // Determine current squad
      const currentSquad = allTeams.find((t) => t.id === (user?.id || 3)) || allTeams[0];
      if (currentSquad) {
        setActiveSquadId(currentSquad.id);
        if (currentSquad.current_location?.coordinates) {
          setSquadCoords(currentSquad.current_location.coordinates);
        }
        if (currentSquad.station_base) {
          setStationBaseName(currentSquad.station_base);
        }
      }

      // Filter missions
      setIncidents(allIncidents);

      const activeList = allIncidents.filter((i) => i.status !== 'Resolved');
      if (activeList.length > 0 && !selectedIncident) {
        handleSelectIncident(activeList[0], currentSquad?.current_location?.coordinates || squadCoords);
      }
    } catch (err) {
      console.warn('Failed to load team missions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectIncident(inc, originCoords = squadCoords) {
    setSelectedIncident(inc);
    if (!inc.location?.coordinates) return;

    setRoutingLoading(true);
    setStatusMessage(`Computing hazard-free routing corridor to Incident #${inc.id}...`);

    try {
      const destCoords = inc.location.coordinates; // [lon, lat]
      const routeRes = await api.calculateRoute(originCoords, destCoords, inc.id);
      setActiveRouteData(routeRes);

      if (routeRes.route?.intersectsHazard || routeRes.blockedRoute) {
        setStatusMessage(`⚠️ Direct path blocked by hazard! Safe alternative detour corridor computed.`);
      } else {
        setStatusMessage(`✅ Route clear of all active hazards (${(routeRes.route.distance / 1000).toFixed(2)} km, ${Math.round(routeRes.route.duration / 60)} mins)`);
      }

      // Broadcast position to Socket.io
      if (socket) {
        socket.emit('rescueTeam:locationUpdate', {
          teamId: activeSquadId,
          teamName: user?.name || 'Rescue Unit',
          coordinates: originCoords,
        });
      }
    } catch (err) {
      console.warn('Routing error:', err);
      setStatusMessage(`Routing error: ${err.message}`);
    } finally {
      setRoutingLoading(false);
    }
  }

  // Update Squad Location (Preset or Map click)
  async function handleUpdateSquadGPS(newCoords, baseName) {
    try {
      setSquadCoords(newCoords);
      if (baseName) setStationBaseName(baseName);
      setIsSettingLocationOnMap(false);

      await api.updateSquadLocation(activeSquadId, newCoords, baseName || stationBaseName);
      setStatusMessage(`Squad GPS position updated to [${newCoords[1].toFixed(4)}, ${newCoords[0].toFixed(4)}]`);

      // Recalculate route to current mission
      if (selectedIncident) {
        handleSelectIncident(selectedIncident, newCoords);
      }
    } catch (err) {
      alert(`Failed to update squad GPS: ${err.message}`);
    }
  }

  // Status transitions
  async function handleUpdateStatus(newStatus) {
    if (!selectedIncident) return;
    try {
      await api.updateIncidentStatus(selectedIncident.id, newStatus, activeSquadId);
      const updatedIncidentId = selectedIncident.id;
      setIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncidentId ? { ...i, status: newStatus } : i))
      );
      if (newStatus === 'Resolved') {
        setSelectedIncident(null);
        setActiveRouteData(null);
        setStatusMessage(`Mission #${updatedIncidentId} marked Resolved and cleared from active map!`);
      } else {
        setSelectedIncident((prev) => ({ ...prev, status: newStatus }));
        setStatusMessage(`Mission #${updatedIncidentId} updated to ${newStatus}`);
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  }

  // Filter Active vs Resolved missions
  const activeMissions = incidents.filter((i) => i.status !== 'Resolved');
  const resolvedMissions = incidents.filter((i) => i.status === 'Resolved');

  // Active displayed route object
  const displayRoute =
    routeViewMode === 'blocked' && activeRouteData?.blockedRoute
      ? activeRouteData.blockedRoute
      : routeViewMode === 'safe' && activeRouteData?.alternativeRoute
      ? activeRouteData.alternativeRoute
      : activeRouteData?.route;

  const steps =
    displayRoute?.legs && displayRoute.legs[0] && displayRoute.legs[0].steps
      ? displayRoute.legs[0].steps
      : [];

  const getStepIcon = (iconType) => {
    switch (iconType) {
      case 'right':
      case 'slight-right':
        return <CornerUpRight className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />;
      case 'left':
      case 'slight-left':
        return <CornerUpLeft className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />;
      case 'u-turn':
        return <RotateCcw className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />;
      case 'arrive':
        return <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />;
      default:
        return <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Tactical Header */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-3 rounded-xl text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-blue-950">
              Tactical Mission Routing & Field Operations (Indore M.P.)
            </h1>
            <p className="text-xs text-slate-500">
              Active Unit: <strong className="text-blue-900">{user?.name || 'Yatharth Gupta (Garuda Unit 1)'}</strong> • Base: <span className="text-orange-600 font-semibold">{stationBaseName}</span>
            </p>
          </div>
        </div>

        {/* Squad Selection & Location Update Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Location Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-slate-600 text-[11px] font-semibold">Base Location:</span>
            <select
              value={stationBaseName}
              onChange={(e) => {
                const target = INDORE_SQUAD_BASES.find((b) => b.name === e.target.value);
                if (target) {
                  handleUpdateSquadGPS(target.coords, target.name);
                }
              }}
              className="bg-transparent text-blue-950 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {INDORE_SQUAD_BASES.map((b) => (
                <option key={b.name} value={b.name} className="bg-white text-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Click Map to Relocate GPS */}
          <button
            onClick={() => setIsSettingLocationOnMap(!isSettingLocationOnMap)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
              isSettingLocationOnMap
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm animate-pulse'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
            }`}
            title="Click on the map to set squad live GPS coordinates"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isSettingLocationOnMap ? 'Click Map to Relocate' : 'Set GPS via Map'}</span>
          </button>

          <button
            onClick={loadAssignedData}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold transition border border-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Notice */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs border ${
          statusMessage.includes('Alert') || statusMessage.includes('blocked')
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <Navigation className="w-4 h-4 text-orange-500 animate-pulse shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Missions List (4 cols) & Right Map + Tactical Route Details (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[650px]">
        {/* Missions List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-orange-500" />
              <span>Active Missions ({activeMissions.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Click to navigate</span>
          </div>

          {/* Active Missions Stream (Clean & Decluttered!) */}
          <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1 flex-1">
            {activeMissions.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                All assigned disaster missions resolved! Standing by at {stationBaseName}.
              </div>
            ) : (
              activeMissions.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2 ${
                    selectedIncident?.id === inc.id
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-blue-950">
                        #{inc.id}
                      </span>
                      <span className="font-bold text-slate-800">
                        {inc.predicted_category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        inc.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed">
                    "{inc.description}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <span>Severity: <strong className="text-red-600">{Math.round(inc.severity_score * 100)}%</strong></span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectIncident(inc);
                      }}
                      className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs cursor-pointer"
                    >
                      <span>Navigate</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Collapsible Resolved Missions Archive Box */}
          {resolvedMissions.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 pt-1 shadow-2xs">
              <button
                onClick={() => setShowResolvedArchive(!showResolvedArchive)}
                className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-blue-950 font-bold">
                    Resolved Missions Archive ({resolvedMissions.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="text-[10px] font-medium">{showResolvedArchive ? 'Hide' : 'Expand'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showResolvedArchive ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {showResolvedArchive && (
                <div className="p-2 border-t border-slate-200 space-y-2 bg-white max-h-48 overflow-y-auto">
                  {resolvedMissions.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">#{inc.id} {inc.predicted_category}</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[170px]">{inc.description}</div>
                      </div>
                      <button
                        onClick={() => handleSelectIncident(inc)}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        View Path
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactical Map & Route Details (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Interactive Map directly on the Rescue Team Dashboard */}
          <div className="h-[460px] min-h-[460px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
            <MapView
              incidents={activeMissions}
              hazards={hazards}
              rescueTeams={rescueTeams}
              centralOffices={centralOffices}
              activeRoute={activeRouteData}
              center={selectedIncident?.location?.coordinates ? [selectedIncident.location.coordinates[1], selectedIncident.location.coordinates[0]] : [squadCoords[1], squadCoords[0]]}
              zoom={13}
              userRole="Rescue Team"
              isSettingSquadLocation={isSettingLocationOnMap}
              onSquadLocationPicked={(pickedCoords) => handleUpdateSquadGPS(pickedCoords, 'Custom Tactical Position')}
              onRouteToIncident={(inc) => handleSelectIncident(inc)}
              onSelectIncident={(inc) => handleSelectIncident(inc)}
              activeSquadId={activeSquadId}
            />
          </div>

          {/* Selected Mission Routing Information Panel */}
          {selectedIncident ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              {/* Mission Header & Status Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                      ACTIVE TARGET
                    </span>
                    <h2 className="text-base font-black text-blue-950">
                      #{selectedIncident.id}: {selectedIncident.predicted_category} Emergency
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 italic">
                    "{selectedIncident.description}"
                  </p>
                </div>

                {/* Status Transition Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus('In Progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedIncident.status === 'In Progress'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    In Progress
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Resolved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      selectedIncident.status === 'Resolved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>

              {/* OSRM Route & Safe Alternative Detour Toggle */}
              {activeRouteData ? (
                <div className="space-y-4">
                  {/* Route View Mode Selector */}
                  {(activeRouteData.multimodal?.isMultimodal || activeRouteData.hasAlternative) && (
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 flex-wrap">
                      {activeRouteData.multimodal?.isMultimodal && (
                        <button
                          onClick={() => setRouteViewMode('multimodal')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            routeViewMode === 'multimodal'
                              ? 'bg-blue-700 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🚦 Multimodal Route (Road & Air)</span>
                        </button>
                      )}

                      {activeRouteData.alternativeRoute && (
                        <button
                          onClick={() => setRouteViewMode('safe')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            routeViewMode === 'safe'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Safe Road Detour</span>
                        </button>
                      )}

                      {activeRouteData.blockedRoute && (
                        <button
                          onClick={() => setRouteViewMode('blocked')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            routeViewMode === 'blocked'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Direct Blocked Path</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Multimodal Transport Breakdown Cards */}
                  {routeViewMode === 'multimodal' && activeRouteData.multimodal?.isMultimodal && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {activeRouteData.multimodal.greenRoad && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-bold">
                            <span>🚗 1. Clear Road</span>
                            <span className="font-mono">{(activeRouteData.multimodal.greenRoad.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold">{activeRouteData.multimodal.greenRoad.vehicle}</div>
                        </div>
                      )}

                      {activeRouteData.multimodal.yellowRoad && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-amber-900 font-bold">
                            <span>🚜 2. Caution Road</span>
                            <span className="font-mono">{(activeRouteData.multimodal.yellowRoad.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold">{activeRouteData.multimodal.yellowRoad.vehicle}</div>
                        </div>
                      )}

                      {activeRouteData.multimodal.blueAir && (
                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-blue-900 font-bold">
                            <span>🚁 3. Air Rescue</span>
                            <span className="font-mono">{(activeRouteData.multimodal.blueAir.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="text-[10px] text-blue-700 font-semibold">{activeRouteData.multimodal.blueAir.vehicle}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hazard Collision or Clearance Banner */}
                  {displayRoute?.intersectsHazard ? (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-3.5 text-xs text-red-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />
                        <span>Hazard Zone Collision: Road is blocked along this direct line!</span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        Switch to the Safe Detour Path above to route around the hazard zone.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-950 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        OSRM Driving Corridor Verified Clear of All Active Flood & Roadblock Hazards.
                      </span>
                    </div>
                  )}

                  {/* Route Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Total Transit Distance</span>
                      <div className="text-lg font-black text-blue-950 mt-0.5">
                        {displayRoute ? (displayRoute.distance / 1000).toFixed(2) : '0.00'} km
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Estimated Transit Time</span>
                      <div className="text-lg font-black text-orange-600 mt-0.5">
                        {displayRoute ? Math.round(displayRoute.duration / 60) : 0} mins
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">From Squad Base</span>
                      <div className="text-xs font-mono font-bold text-blue-900 mt-2 truncate">
                        {stationBaseName}
                      </div>
                    </div>
                  </div>

                  {/* Explicit Turn-by-Turn Waypoints ("Turn right onto AB Road", "Turn left onto...") */}
                  {steps.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center justify-between">
                        <span>Turn-by-Turn Navigation Guidance:</span>
                        <span className="text-[10px] text-slate-500 font-normal">{steps.length} waypoints</span>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs pr-1">
                        {steps.map((st, i) => (
                          <div
                            key={i}
                            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-800 flex items-start gap-2 shadow-2xs"
                          >
                            {getStepIcon(st.directionIcon)}
                            <div className="flex-1">
                              <span className="font-semibold text-[11px] block text-slate-800">
                                {i + 1}. {st.formattedInstruction || st.instruction || 'Proceed on roadway'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {st.distanceMeters || Math.round(st.distance || 0)}m
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  {routingLoading ? 'Calculating OSRM corridor...' : 'Click Navigate to load path.'}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm">
              Select an assigned incident from the list to view tactical routing and hazard detection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

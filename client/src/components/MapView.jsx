import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert,
  Flame,
  Droplets,
  HeartPulse,
  AlertTriangle,
  Navigation,
  CheckCircle,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Check,
  Shield,
  MapPin
} from 'lucide-react';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category-based custom HTML marker icons
function createCustomIcon(category, severity, requiresVerification) {
  let bgColor = '#ef4444';
  let iconHtml = '🚨';

  switch (category) {
    case 'Medical':
      bgColor = '#ec4899';
      iconHtml = '🚑';
      break;
    case 'Fire':
      bgColor = '#f97316';
      iconHtml = '🔥';
      break;
    case 'Flood':
      bgColor = '#0284c7';
      iconHtml = '🌊';
      break;
    case 'Trapped':
      bgColor = '#8b5cf6';
      iconHtml = '⚠️';
      break;
    case 'Blockage':
      bgColor = '#f59e0b';
      iconHtml = '🚧';
      break;
    default:
      bgColor = '#ef4444';
      iconHtml = 'SOS';
  }

  const borderClass = requiresVerification
    ? 'border-2 border-amber-500 animate-pulse'
    : 'border-2 border-white shadow-md';

  return L.divIcon({
    className: 'custom-emergency-pin',
    html: `
      <div style="background-color: ${bgColor};" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${borderClass} relative">
        <span>${iconHtml}</span>
        ${
          requiresVerification
            ? `<span style="position: absolute; top:-4px; right:-4px; width: 10px; height: 10px; background-color: #f59e0b; border-radius: 9999px; border: 2px solid white;"></span>`
            : ''
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// Custom Regional Headquarters Office Pin
function createOfficeIcon(cityName, isActive = false) {
  return L.divIcon({
    className: 'custom-office-pin',
    html: `
      <div class="flex items-center gap-1 ${
        isActive
          ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-300 ring-2 ring-amber-400'
          : 'bg-slate-850 border-slate-400'
      } border-2 text-white px-2 py-0.5 rounded-full shadow-xl text-[10px] font-bold whitespace-nowrap">
        <span>🏛️</span>
        <span class="max-w-[120px] truncate">${cityName}</span>
        ${isActive ? '<span class="bg-amber-300 text-slate-950 px-1 rounded-xs font-black text-[9px]">HQ</span>' : ''}
      </div>
    `,
    iconSize: [120, 24],
    iconAnchor: [60, 12],
    popupAnchor: [0, -12],
  });
}

// Custom Helicopter / Airlift Pin
function createHeliIcon() {
  return L.divIcon({
    className: 'custom-heli-pin',
    html: `
      <div class="bg-indigo-600 border-2 border-white text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center animate-bounce">
        <span style="font-size: 14px;">🚁</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Custom Tactical Rescue Boat Pin (for Flooded Sectors)
function createBoatIcon() {
  return L.divIcon({
    className: 'custom-boat-pin',
    html: `
      <div class="bg-sky-600 border-2 border-white text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center animate-pulse">
        <span style="font-size: 14px;">🚤</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Custom Squad Location Pin
function createSquadIcon(squadName, isSelected = false) {
  return L.divIcon({
    className: 'custom-squad-pin',
    html: `
      <div class="flex items-center gap-1 bg-blue-900 border-2 ${
        isSelected ? 'border-orange-400 ring-2 ring-orange-300' : 'border-white'
      } text-white px-2 py-0.5 rounded-full shadow-lg text-[11px] font-bold whitespace-nowrap">
        <span>🛡️</span>
        <span class="max-w-[110px] truncate">${squadName}</span>
      </div>
    `,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
    popupAnchor: [0, -13],
  });
}

// Controller to invalidate size on tab switch/mount and fit bounds to route
function AutoMapController({ center, zoom, activeRoute }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size on initial mount and when layout stabilizes
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    // 1. If active navigation route exists, frame the entire corridor
    const routeCoords =
      activeRoute?.geometry?.coordinates ||
      activeRoute?.alternativeRoute?.geometry?.coordinates ||
      activeRoute?.blockedRoute?.geometry?.coordinates;

    if (routeCoords && Array.isArray(routeCoords) && routeCoords.length > 1) {
      try {
        const latLngs = routeCoords.map(([lon, lat]) => [lat, lon]);
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        return;
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    }

    // 2. Otherwise center on given coordinates
    if (center && Array.isArray(center) && center.length === 2) {
      let lat = center[0];
      let lon = center[1];
      // Normalize if passed [lon, lat] (India coords: lon > 60, lat < 40)
      if (lat > 60 && lon < 40) {
        lat = center[1];
        lon = center[0];
      }
      if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], zoom || map.getZoom() || 13);
      }
    }
  }, [center, zoom, activeRoute, map]);

  return null;
}

// Click handler for drawing hazard polygons or setting squad GPS
function MapClickHandler({ isDrawing, onAddPoint, onMapClick, isSettingSquadLocation, onSquadLocationPicked }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      } else if (isSettingSquadLocation && onSquadLocationPicked) {
        onSquadLocationPicked([e.latlng.lng, e.latlng.lat]);
      } else if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export function MapView({
  incidents = [],
  hazards = [],
  rescueTeams = [],
  centralOffices = [],
  activeRoute = null, // Can contain { route, blockedRoute, alternativeRoute, multimodal }
  isDrawing = false,
  drawingPoints = [],
  onAddDrawingPoint,
  onSelectIncident,
  onVerifyIncident,
  onAssignTeam,
  onRouteToIncident,
  onResolveIncident,
  onToggleHazard,
  onDeleteHazard,
  userRole,
  onMapClick,
  center = [22.7196, 75.8577], // Default: Indore, M.P.
  zoom = 13,
  isSettingSquadLocation = false,
  onSquadLocationPicked = null,
  activeSquadId = null,
  showResolved = false,
}) {
  const [tileMode, setTileMode] = useState('osm');
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const tileUrls = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'OpenStreetMap Standard',
    },
    hot: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles courtesy of <a href="https://hotosm.org/">Humanitarian OpenStreetMap Team</a>',
      name: 'Humanitarian Disaster OSM',
    },
  };

  const selectedTile = tileUrls[tileMode];

  // Extract route lines (Multimodal vs Blocked vs Safe Alternate)
  const blockedLine = activeRoute?.blockedRoute?.geometry?.coordinates;
  const safeAlternateLine = activeRoute?.alternativeRoute?.geometry?.coordinates;
  const primaryLine = activeRoute?.geometry?.coordinates;
  const multimodal = activeRoute?.multimodal;
  const selectedMode =
    activeRoute?.selectedMode ||
    (activeRoute?.alternativeRoute ? 'safe' : (multimodal?.isMultimodal ? 'multimodal' : 'direct'));

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
      {/* Tile Layer Selector Badge */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-slate-600 font-semibold text-[11px] hidden sm:inline">Tiles:</span>
        <button
          onClick={() => setTileMode(tileMode === 'osm' ? 'hot' : 'osm')}
          className="text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
          title="Toggle free map tile source"
        >
          <span>{selectedTile.name}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-medium">Free / No Key</span>
        </button>
      </div>

      {/* Multimodal & Route Legend Indicator - Placed on bottom-right to prevent modal overlap */}
      {activeRoute && (
        <div className="absolute bottom-8 right-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 text-xs max-w-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-2">
            <div className="font-bold text-blue-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-700" />
              <span>Tactical Transport Legend</span>
            </div>
            <button
              type="button"
              onClick={() => setLegendCollapsed(!legendCollapsed)}
              className="text-slate-500 hover:text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              {legendCollapsed ? 'Show' : 'Hide'}
            </button>
          </div>

          {!legendCollapsed && (
            <div className="space-y-1.5 pt-1.5">
              {/* Green Leg: Safe Road */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                <span className="w-4 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                <span>🚗 Clear Road (Ground Convoy)</span>
              </div>

              {/* Blue / Boat Leg */}
              {(multimodal?.hazardTransit?.type === 'boat' || multimodal?.yellowRoad) && (
                <div className="flex items-center gap-2 text-[11px] text-sky-800 font-semibold">
                  <span className="w-4 h-1.5 bg-sky-500 rounded-full shrink-0"></span>
                  <span>🚤 Rescue Boat (Flooded Sector)</span>
                </div>
              )}

              {/* Purple / Heli Leg */}
              {(multimodal?.hazardTransit?.type === 'air' || multimodal?.blueAir) && (
                <div className="flex items-center gap-2 text-[11px] text-indigo-800 font-semibold">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-600 shrink-0"></span>
                  <span>🚁 Air Rescue (Blocked Bypass)</span>
                </div>
              )}

              {/* Red Blocked Path */}
              {blockedLine && (
                <div className="flex items-center gap-2 text-[11px] text-red-700 font-semibold">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-red-600 shrink-0"></span>
                  <span>⚠️ Impassable (Hazard Collision)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <AutoMapController
          center={center}
          zoom={zoom}
          activeRoute={activeRoute}
        />
        <TileLayer
          attribution={selectedTile.attribution}
          url={selectedTile.url}
          maxZoom={19}
        />

        <MapClickHandler
          isDrawing={isDrawing}
          onAddPoint={onAddDrawingPoint}
          onMapClick={onMapClick}
          isSettingSquadLocation={isSettingSquadLocation}
          onSquadLocationPicked={onSquadLocationPicked}
        />

        {/* Hazard Polygons */}
        {hazards.map((hazard) => {
          let area = hazard.area;
          if (typeof area === 'string') {
            try {
              area = JSON.parse(area);
            } catch (e) {
              return null;
            }
          }
          if (!area || !area.coordinates) return null;
          const ring = area.coordinates[0] || area.coordinates;
          if (!Array.isArray(ring)) return null;
          const leafletPositions = ring.map((pt) => [pt[1], pt[0]]);

          const isFlood = hazard.type === 'Flood';
          const color = isFlood ? '#0284c7' : '#dc2626';
          const fillColor = isFlood ? '#38bdf8' : '#f87171';

          return (
            <Polygon
              key={hazard.id}
              positions={leafletPositions}
              pathOptions={{
                color: hazard.is_active ? color : '#94a3b8',
                fillColor: hazard.is_active ? fillColor : '#cbd5e1',
                fillOpacity: hazard.is_active ? 0.40 : 0.15,
                weight: hazard.is_active ? 3 : 1.5,
                dashArray: hazard.is_active ? undefined : '5, 5',
              }}
            >
              <Popup className="emergency-light-popup">
                <div className="p-2 text-slate-800 min-w-[210px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded text-white ${
                        isFlood ? 'bg-sky-600' : 'bg-red-600'
                      }`}
                    >
                      {hazard.type} Hazard
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        hazard.is_active ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {hazard.is_active ? 'ACTIVE ZONE' : 'CLEARED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-2 font-medium">
                    {hazard.notes || 'No description provided.'}
                  </p>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Indore Emergency Grid • {new Date(hazard.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {['Admin', 'Disaster Authority'].includes(userRole) && (
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => onToggleHazard(hazard.id, !hazard.is_active)}
                        className="text-xs flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
                      >
                        {hazard.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span>Mark Cleared</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Reactivate</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteHazard(hazard.id)}
                        className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* ========================================================
            DYNAMIC ROUTE DISPLAY BASED ON ACTIVE SELECTION
           ======================================================== */}

        {/* 1. SAFE ROAD DETOUR (Solid Emerald Line) - Prioritized when selected */}
        {selectedMode === 'safe' && safeAlternateLine && (
          <Polyline
            positions={safeAlternateLine.map((pt) => [pt[1], pt[0]])}
            pathOptions={{
              color: '#16a34a',
              weight: 6,
              opacity: 0.95,
            }}
          />
        )}

        {/* 2. DIRECT BLOCKED PATH (Red Dashed Line) */}
        {selectedMode === 'blocked' && blockedLine && (
          <Polyline
            positions={blockedLine.map((pt) => [pt[1], pt[0]])}
            pathOptions={{
              color: '#dc2626',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* 3. MULTIMODAL SEGMENTED ROUTE (Road 1 -> Boat/Air -> Road 2) */}
        {selectedMode === 'multimodal' && multimodal?.isMultimodal && (
          <>
            {/* Leg 1: Clear Roadway (Ground Convoy) */}
            {(multimodal.road1?.coordinates || multimodal.greenRoad?.coordinates) && (
              <Polyline
                positions={(multimodal.road1?.coordinates || multimodal.greenRoad.coordinates).map((pt) => [pt[1], pt[0]])}
                pathOptions={{
                  color: '#10b981',
                  weight: 6,
                  opacity: 0.95,
                }}
              />
            )}

            {/* Leg 2: Hazard Section (Boat for Flood, Helicopter for Blockage) */}
            {multimodal.hazardTransit?.coordinates && (
              <>
                <Polyline
                  positions={multimodal.hazardTransit.coordinates.map((pt) => [pt[1], pt[0]])}
                  pathOptions={{
                    color: multimodal.hazardTransit.type === 'boat' ? '#0284c7' : '#6366f1',
                    weight: 6,
                    opacity: 0.95,
                    dashArray: multimodal.hazardTransit.type === 'air' ? '6, 8' : undefined,
                  }}
                />
                {multimodal.hazardTransit.coordinates.length > 0 && (
                  <Marker
                    position={[
                      multimodal.hazardTransit.coordinates[0][1],
                      multimodal.hazardTransit.coordinates[0][0],
                    ]}
                    icon={multimodal.hazardTransit.type === 'boat' ? createBoatIcon() : createHeliIcon()}
                  />
                )}
              </>
            )}

            {/* Backwards compatibility for yellowRoad / blueAir if hazardTransit wasn't set */}
            {!multimodal.hazardTransit && multimodal.yellowRoad?.coordinates && (
              <Polyline
                positions={multimodal.yellowRoad.coordinates.map((pt) => [pt[1], pt[0]])}
                pathOptions={{
                  color: '#0284c7',
                  weight: 6,
                  opacity: 0.95,
                }}
              />
            )}
            {!multimodal.hazardTransit && multimodal.blueAir?.coordinates && (
              <>
                <Polyline
                  positions={multimodal.blueAir.coordinates.map((pt) => [pt[1], pt[0]])}
                  pathOptions={{
                    color: '#6366f1',
                    weight: 5,
                    opacity: 0.95,
                    dashArray: '6, 8',
                  }}
                />
                {multimodal.blueAir.coordinates.length > 0 && (
                  <Marker
                    position={[
                      multimodal.blueAir.coordinates[0][1],
                      multimodal.blueAir.coordinates[0][0],
                    ]}
                    icon={createHeliIcon()}
                  />
                )}
              </>
            )}

            {/* Leg 3: Resumed Roadway (Ground Convoy) */}
            {multimodal.road2?.coordinates && (
              <Polyline
                positions={multimodal.road2.coordinates.map((pt) => [pt[1], pt[0]])}
                pathOptions={{
                  color: '#10b981',
                  weight: 6,
                  opacity: 0.95,
                }}
              />
            )}
          </>
        )}

        {/* 4. Single Primary Route Line (when clear road, no hazards) */}
        {!multimodal?.isMultimodal && !safeAlternateLine && primaryLine && (
          <Polyline
            positions={primaryLine.map((pt) => [pt[1], pt[0]])}
            pathOptions={{
              color: activeRoute.intersectsHazard ? '#dc2626' : '#16a34a',
              weight: 5,
              opacity: 0.9,
              dashArray: activeRoute.intersectsHazard ? '6, 6' : undefined,
            }}
          />
        )}

        {/* Regional Central Offices Pins (5 Major Headquarters across India) */}
        {centralOffices.map((office) => {
          const coords = office.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const [lon, lat] = coords;

          return (
            <Marker
              key={`office-${office.id}`}
              position={[lat, lon]}
              icon={createOfficeIcon(office.city, office.is_active)}
            >
              <Popup className="emergency-light-popup">
                <div className="p-2.5 text-slate-800 min-w-[220px]">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <span className="text-base">🏛️</span>
                    <div>
                      <div className="font-bold text-xs text-blue-950">{office.name}</div>
                      <span className="text-[10px] text-slate-500 font-medium">{office.region}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1">
                    <div>Address: <strong className="text-slate-800">{office.address}</strong></div>
                    <div>GPS: <span className="font-mono text-slate-500">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span></div>
                    <div className="pt-1">
                      {office.is_active ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          ⭐ Active Central HQ & Squad Resting Hub
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          Regional Reserve Facility
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Rescue Squad Locations (4 Squads Pins on Map) */}
        {rescueTeams.map((squad) => {
          const coords = squad.current_location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const [lon, lat] = coords;

          return (
            <Marker
              key={squad.id}
              position={[lat, lon]}
              icon={createSquadIcon(squad.name.split('(')[0].trim(), squad.id === activeSquadId)}
            >
              <Popup className="emergency-light-popup">
                <div className="p-2 text-slate-800 min-w-[200px]">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                    <Shield className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-xs text-blue-950">{squad.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1.5 space-y-1">
                    <div>Station: <strong>{squad.station_base || 'Indore Command'}</strong></div>
                    <div>Wireless: <span className="font-mono text-blue-700">{squad.phone || 'Channel 1'}</span></div>
                    <div>GPS: <span className="font-mono text-slate-500">{lat.toFixed(4)}, {lon.toFixed(4)}</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Incident Markers (Resolved disasters strictly removed from active map) */}
        {incidents
          .filter((incident) => {
            if (!incident.location || !incident.location.coordinates) return false;
            // Never render resolved incidents unless explicitly requested via showResolved prop
            // or if an active navigation route is currently focused on this specific incident
            if (!showResolved && incident.status === 'Resolved') {
              if (activeRoute?.incidentId === incident.id) return true;
              return false;
            }
            return true;
          })
          .map((incident) => {
          const [lon, lat] = incident.location.coordinates;

          return (
            <Marker
              key={incident.id}
              position={[lat, lon]}
              icon={createCustomIcon(
                incident.predicted_category,
                incident.severity_score,
                incident.requires_manual_verification
              )}
            >
              <Popup className="emergency-light-popup">
                <div className="p-2.5 text-slate-800 min-w-[250px] max-w-[310px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-sm text-blue-950">
                      #{incident.id} {incident.predicted_category}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        incident.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : incident.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {incident.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-2 font-medium line-clamp-3">
                    "{incident.description}"
                  </p>

                  <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">AI Confidence:</span>
                      <span
                        className={`font-mono font-bold ${
                          incident.confidence_score < 0.60
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {Math.round(incident.confidence_score * 100)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Severity Score:</span>
                      <span className="font-mono font-bold text-red-600">
                        {Math.round(incident.severity_score * 100)} / 100
                      </span>
                    </div>

                    {incident.assigned_team_name && (
                      <div className="text-[11px] text-blue-700 font-semibold pt-0.5">
                        Assigned: {incident.assigned_team_name}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
                    {incident.requires_manual_verification && onVerifyIncident && (
                      <button
                        onClick={() => onVerifyIncident(incident)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Verify AI Prediction</span>
                      </button>
                    )}

                    {['Admin', 'Disaster Authority'].includes(userRole) && onAssignTeam && (
                      <button
                        onClick={() => onAssignTeam(incident)}
                        className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <span>Dispatch Squad</span>
                      </button>
                    )}

                    {['Admin', 'Disaster Authority', 'Rescue Team'].includes(userRole) &&
                      incident.status !== 'Resolved' &&
                      onResolveIncident && (
                        <button
                          onClick={() => onResolveIncident(incident.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      )}

                    {onRouteToIncident && (
                      <button
                        onClick={() => onRouteToIncident(incident)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Nav Route</span>
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Drawing Preview Polygon */}
        {isDrawing && drawingPoints.length > 0 && (
          <>
            {drawingPoints.map((pt, idx) => (
              <Marker
                key={idx}
                position={pt}
                icon={L.divIcon({
                  className: 'draw-node',
                  html: `<div class="w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full shadow"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                })}
              />
            ))}
            {drawingPoints.length > 2 && (
              <Polygon
                positions={drawingPoints}
                pathOptions={{
                  color: '#ea580c',
                  fillColor: '#f97316',
                  fillOpacity: 0.35,
                  dashArray: '4, 4',
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Drawing Instructions Banner */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 border-2 border-orange-500 text-slate-900 px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-md">
          <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping"></span>
          <span className="text-xs font-bold text-blue-950">
            Drawing Mode Active: Click map to place hazard polygon vertices ({drawingPoints.length} points placed).
          </span>
        </div>
      )}

      {/* Setting Squad Location Banner */}
      {isSettingSquadLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 border-2 border-blue-600 text-slate-900 px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-md">
          <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping"></span>
          <span className="text-xs font-bold text-blue-950">
            Click anywhere on the map to deploy / update squad GPS position!
          </span>
        </div>
      )}
    </div>
  );
}

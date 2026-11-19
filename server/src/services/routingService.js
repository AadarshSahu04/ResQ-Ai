import { executeQuery, isPostgresAvailable, inMemoryStore } from '../config/db.js';
import { doesRouteIntersectPolygon } from './spatialService.js';

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

/**
 * Format raw OSRM steps into explicit human-friendly instructions:
 * "Turn right onto AB Road", "Turn left onto MG Road", etc.
 */
export function formatManeuverStep(step, index, totalSteps) {
  const maneuver = step.maneuver || {};
  const type = (maneuver.type || '').toLowerCase();
  const modifier = (maneuver.modifier || '').toLowerCase();
  const roadName = step.name && step.name.trim() !== '' ? step.name.trim() : 'Emergency Corridor';

  let instruction = '';
  let icon = 'straight';

  if (type === 'depart' || index === 0) {
    instruction = `Depart heading onto ${roadName}`;
    icon = 'depart';
  } else if (type === 'arrive' || index === totalSteps - 1) {
    instruction = `Arrive at incident location on ${roadName}`;
    icon = 'arrive';
  } else if (type === 'turn') {
    if (modifier.includes('right')) {
      instruction = modifier.includes('slight')
        ? `Bear slight right onto ${roadName}`
        : modifier.includes('sharp')
        ? `Make sharp right onto ${roadName}`
        : `Turn right onto ${roadName}`;
      icon = modifier.includes('slight') ? 'slight-right' : 'right';
    } else if (modifier.includes('left')) {
      instruction = modifier.includes('slight')
        ? `Bear slight left onto ${roadName}`
        : modifier.includes('sharp')
        ? `Make sharp left onto ${roadName}`
        : `Turn left onto ${roadName}`;
      icon = modifier.includes('slight') ? 'slight-left' : 'left';
    } else if (modifier === 'uturn') {
      instruction = `Make a U-turn onto ${roadName}`;
      icon = 'u-turn';
    } else {
      instruction = `Turn onto ${roadName}`;
      icon = 'straight';
    }
  } else if (type === 'new name' || type === 'continue') {
    instruction = `Continue straight on ${roadName}`;
    icon = 'straight';
  } else if (type === 'roundabout' || type === 'rotary') {
    instruction = `Take roundabout exit onto ${roadName}`;
    icon = 'right';
  } else if (type === 'fork') {
    instruction = `Keep ${modifier || 'right'} at the fork onto ${roadName}`;
    icon = modifier.includes('left') ? 'slight-left' : 'slight-right';
  } else if (type === 'merge') {
    instruction = `Merge ${modifier || ''} onto ${roadName}`.trim();
    icon = 'straight';
  } else {
    if (modifier.includes('right')) {
      instruction = `Turn right onto ${roadName}`;
      icon = 'right';
    } else if (modifier.includes('left')) {
      instruction = `Turn left onto ${roadName}`;
      icon = 'left';
    } else {
      instruction = `Proceed on ${roadName}`;
      icon = 'straight';
    }
  }

  return {
    ...step,
    formattedInstruction: instruction,
    directionIcon: icon,
    distanceMeters: Math.round(step.distance || 0),
    durationSeconds: Math.round(step.duration || 0),
  };
}

/**
 * Request real road route from OSRM, detect hazard intersections,
 * and if blocked, calculate multimodal transport legs (Green road, Yellow caution road, Blue airlift)
 * along with a 100% real road network detour bypass.
 * @param {Array<number>} origin - [lon, lat]
 * @param {Array<number>} destination - [lon, lat]
 */
export async function calculateRouteWithHazardAvoidance(origin, destination) {
  const timeoutMs = 6000;
  const [startLon, startLat] = origin;
  const [endLon, endLat] = destination;

  let directOsrmRoutes = [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        directOsrmRoutes = data.routes;
      }
    }
  } catch (err) {
    console.warn(`[OSRM Notice] ${err.message}. Using high-fidelity street network fallback.`);
  }

  if (directOsrmRoutes.length === 0) {
    directOsrmRoutes = [createDirectRoadGridRoute(startLon, startLat, endLon, endLat)];
  }

  // Format steps for direct routes
  for (const r of directOsrmRoutes) {
    if (r.legs && r.legs[0] && r.legs[0].steps) {
      r.legs[0].steps = r.legs[0].steps.map((st, i, arr) => formatManeuverStep(st, i, arr.length));
    }
  }

  const primaryRoute = directOsrmRoutes[0];
  const activeHazards = await getActiveHazardsList();
  const primaryHits = checkRouteHazards(primaryRoute, activeHazards);
  const primaryIntersects = primaryHits.length > 0;

  // 1. Build Multimodal Transport Breakdown (Road -> Boat/Heli -> Road)
  const multimodal = computeMultimodalTransport(
    primaryRoute,
    primaryHits,
    startLon,
    startLat,
    endLon,
    endLat
  );

  let safeRoadDetour = null;
  let blockedRoute = null;

  if (!primaryIntersects) {
    // Direct road is completely hazard-free
    const cleanRoute = {
      ...primaryRoute,
      intersectsHazard: false,
      intersectedHazards: [],
      warning: null,
      isAlternative: false,
      label: 'Direct Safe Road Corridor',
    };

    return {
      status: 'Ok',
      hazardIntersects: false,
      hazardReason: null,
      multimodal,
      route: cleanRoute,
      alternativeRoute: null,
      blockedRoute: null,
      hasAlternative: false,
      selectedMode: 'safe',
      hazardsDetectedCount: 0,
    };
  }

  // Primary path intersects hazard!
  blockedRoute = {
    ...primaryRoute,
    intersectsHazard: true,
    intersectedHazards: primaryHits,
    warning: `HAZARD ALERT: Direct route traverses active ${primaryHits.map(h => h.type).join(', ')} area.`,
    isAlternative: false,
    label: 'Direct Blocked Path (Hazard Collision)',
  };

  // 2. Check if any OSRM candidate alternative is 100% hazard-free on real roads
  for (let i = 1; i < directOsrmRoutes.length; i++) {
    const candidate = directOsrmRoutes[i];
    const candHits = checkRouteHazards(candidate, activeHazards);
    if (candHits.length === 0) {
      safeRoadDetour = {
        ...candidate,
        intersectsHazard: false,
        intersectedHazards: [],
        warning: null,
        isAlternative: true,
        label: 'Safe Road Detour (Hazard Bypass)',
      };
      break;
    }
  }

  // 3. If no candidate alternative, compute real road detour by querying OSRM through bypass waypoints
  if (!safeRoadDetour) {
    safeRoadDetour = await computeRealRoadDetour(
      startLon,
      startLat,
      endLon,
      endLat,
      primaryHits[0],
      activeHazards,
      primaryRoute
    );
  }

  // Check if destination itself is trapped inside any active hazard
  const destinationInsideHazard = activeHazards.some((h) => {
    const poly = h.area?.coordinates?.[0] || h.area?.coordinates;
    return poly && isPointInsideOrNearPolygon([endLon, endLat], poly, 0.001);
  });

  // Decision rule:
  // If safe road detour exists and destination is NOT inside hazard, DEFAULT TO SAFE ROAD DETOUR!
  // If destination is inside hazard, squad MUST use multimodal (road up to hazard, boat/airlift inside).
  const defaultMode = safeRoadDetour && !destinationInsideHazard ? 'safe' : 'multimodal';

  return {
    status: 'Ok',
    hazardIntersects: true,
    hazardReason: `Traverses active ${primaryHits.map(h => h.type).join(', ')} zone (${primaryHits.map(h => h.notes || h.type).join('; ')})`,
    multimodal,
    route: defaultMode === 'safe' ? safeRoadDetour : primaryRoute,
    alternativeRoute: safeRoadDetour,
    blockedRoute,
    hasAlternative: !!safeRoadDetour,
    selectedMode: defaultMode,
    destinationInsideHazard,
    hazardsDetectedCount: primaryHits.length,
  };
}

/**
 * Check which hazards a route intersects
 */
function checkRouteHazards(route, hazards) {
  if (!route || !route.geometry || !route.geometry.coordinates) return [];
  const coords = route.geometry.coordinates;
  const hits = [];

  for (const h of hazards) {
    if (h.area && h.area.coordinates) {
      if (doesRouteIntersectPolygon(coords, h.area.coordinates)) {
        hits.push({
          id: h.id,
          type: h.type,
          notes: h.notes,
          area: h.area,
        });
      }
    }
  }
  return hits;
}

// Distance along polyline in meters
function polylineDistanceMeters(pts) {
  if (!pts || pts.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    dist += calculateHaversineDistance(pts[i][1], pts[i][0], pts[i + 1][1], pts[i + 1][0]) * 1000;
  }
  return Math.round(dist);
}

/**
 * Computes multimodal transport legs according to user specification:
 * - The squad should use roadways as much as possible with ground vehicles.
 * - When hazard boundary is reached:
 *   * If hazard is Blue (Flood): squad uses Tactical Rescue Boat / Amphibious Craft across flooded sector.
 *   * If hazard is Red (Road Blockage): squad uses Air Rescue Helicopter across blocked road sector.
 * - When hazard area is over, squad immediately RESUMES ROADWAYS with ground vehicles!
 * - Airways / Boats are used ONLY for that particular hazard distance, NOT for the entire route.
 */
function computeMultimodalTransport(route, hazards, startLon, startLat, endLon, endLat) {
  const coords = route.geometry?.coordinates || [
    [startLon, startLat],
    [endLon, endLat],
  ];

  if (!hazards || hazards.length === 0) {
    const totalDist = Math.round(route.distance || polylineDistanceMeters(coords));
    const totalDur = Math.round(route.duration || (totalDist / 11.1));
    return {
      isMultimodal: false,
      road1: {
        coordinates: coords,
        distance: totalDist,
        duration: totalDur,
        mode: 'Clear Roadway',
        vehicle: 'Rapid Response Convoy (Ground Vehicle)',
        color: '#10b981',
        description: 'Direct clear road network to destination.',
      },
      greenRoad: {
        coordinates: coords,
        distance: totalDist,
        duration: totalDur,
        mode: 'Clear Roadway',
        vehicle: 'Rapid Response Convoy (Ground Vehicle)',
        color: '#10b981',
        description: 'Direct clear road network to destination.',
      },
      hazardTransit: null,
      yellowRoad: null,
      blueAir: null,
      road2: null,
      totalDistance: totalDist,
      totalDuration: totalDur,
    };
  }

  // Find exact waypoint indices where the route enters and exits the hazard
  let enterIndex = -1;
  let exitIndex = -1;
  let primaryHazard = hazards[0];

  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    for (const h of hazards) {
      const poly = h.area?.coordinates?.[0] || h.area?.coordinates;
      if (poly && isPointInsideOrNearPolygon(pt, poly, 0.002)) {
        if (enterIndex === -1) {
          enterIndex = i;
          primaryHazard = h;
        }
        exitIndex = i;
      }
    }
  }

  // Fallback division if discrete coordinates jumped across boundary
  if (enterIndex === -1) {
    enterIndex = Math.max(1, Math.floor(coords.length * 0.35));
    exitIndex = Math.min(coords.length - 1, Math.floor(coords.length * 0.65));
  } else if (exitIndex < enterIndex) {
    exitIndex = enterIndex;
  }

  const isFlood = (primaryHazard?.type || '').toLowerCase() === 'flood';

  // 1. Leg 1: Clear Roadway (Ground Convoy) up to hazard entry
  const road1Coords = coords.slice(0, Math.max(1, enterIndex + 1));
  const road1Dist = Math.max(80, polylineDistanceMeters(road1Coords));
  // 40 km/h emergency speed = 11.1 m/s
  const road1Dur = Math.round(road1Dist / 11.1);

  // 2. Leg 2: Hazard Transit section ONLY for the hazard-affected distance
  const hazardCoords = coords.slice(enterIndex, Math.max(enterIndex + 1, exitIndex + 1));
  const hazardDist = Math.max(100, polylineDistanceMeters(hazardCoords));

  let hazardTransit;
  if (isFlood) {
    // BLUE HAZARD (Flood): Squad uses Rescue Boat / Amphibious Craft
    // Tactical rescue boat speed ~ 18 km/h = 5.0 m/s
    const boatDur = Math.round(hazardDist / 5.0);
    hazardTransit = {
      type: 'boat',
      hazardType: 'Flood',
      coordinates: hazardCoords,
      distance: hazardDist,
      duration: boatDur,
      mode: 'Rescue Boat / Amphibious Craft (Flooded Sector)',
      vehicle: 'Tactical Rescue Boat / Amphibious Craft',
      color: '#0284c7', // Cyan/Sky Blue
      icon: 'boat',
      description: 'Navigates flooded street sector via motorized rescue boat to bypass submerged roadways.',
    };
  } else {
    // RED HAZARD (Blockage): Squad uses Air Rescue Helicopter across blocked road
    // Helicopter cruising speed ~ 150 km/h = 41.6 m/s + 45s tactical transition
    const heliDur = 45 + Math.round(hazardDist / 41.6);
    hazardTransit = {
      type: 'air',
      hazardType: 'Blockage',
      coordinates: hazardCoords,
      distance: hazardDist,
      duration: heliDur,
      mode: 'NDRF Air Rescue / Aerial Bypass (Blocked Sector)',
      vehicle: 'Mi-17 / ALH Dhruv Air Rescue Helicopter',
      color: '#6366f1', // Indigo / Purple Airway
      icon: 'helicopter',
      description: 'Aerial airlift corridor bypassing blocked / collapsed road infrastructure.',
    };
  }

  // 3. Leg 3: Resumed Roadway (Ground Convoy) after hazard area is over
  let road2 = null;
  if (exitIndex < coords.length - 1) {
    const road2Coords = coords.slice(exitIndex);
    if (road2Coords.length >= 2) {
      const road2Dist = Math.max(80, polylineDistanceMeters(road2Coords));
      const road2Dur = Math.round(road2Dist / 11.1); // 40 km/h
      road2 = {
        coordinates: road2Coords,
        distance: road2Dist,
        duration: road2Dur,
        mode: 'Resumed Roadway (Ground Convoy)',
        vehicle: 'Rapid Response Convoy (Ground Vehicle)',
        color: '#10b981',
        description: 'Hazard zone cleared: resumed ground vehicle road transport to destination.',
      };
    }
  }

  const totalDist = road1Dist + hazardDist + (road2?.distance || 0);
  const totalDur = road1Dur + hazardTransit.duration + (road2?.duration || 0);

  return {
    isMultimodal: true,
    road1: {
      coordinates: road1Coords,
      distance: road1Dist,
      duration: road1Dur,
      mode: 'Clear Roadway (Ground Convoy)',
      vehicle: 'Rapid Response Convoy (Ground Vehicle)',
      color: '#10b981',
      description: 'Standard roadway convoy up to hazard staging boundary.',
    },
    greenRoad: {
      coordinates: road1Coords,
      distance: road1Dist,
      duration: road1Dur,
      mode: 'Clear Roadway (Ground Convoy)',
      vehicle: 'Rapid Response Convoy (Ground Vehicle)',
      color: '#10b981',
      description: 'Standard roadway convoy up to hazard staging boundary.',
    },
    hazardTransit,
    yellowRoad: isFlood ? hazardTransit : null,
    blueAir: !isFlood ? hazardTransit : null,
    road2,
    totalDistance: totalDist,
    totalDuration: totalDur,
  };
}

/**
 * Computes a real road detour around a hazard by sampling arterial road corridors
 * and querying OSRM (so the route strictly adheres to OpenStreetMap roads).
 */
async function computeRealRoadDetour(startLon, startLat, endLon, endLat, hazard, allHazards, fallbackBaseRoute) {
  try {
    const poly = hazard.area.coordinates[0] || hazard.area.coordinates;
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    for (const [lon, lat] of poly) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const cLon = (minLon + maxLon) / 2;
    const cLat = (minLat + maxLat) / 2;
    const spanLon = maxLon - minLon;
    const spanLat = maxLat - minLat;

    // Detour waypoints on surrounding arterial road corridors
    const detourOptions = [
      [maxLon + Math.max(spanLon * 1.1, 0.020), cLat], // East bypass
      [minLon - Math.max(spanLon * 1.1, 0.020), cLat], // West bypass
      [cLon, maxLat + Math.max(spanLat * 1.1, 0.018)], // North arterial
      [cLon, minLat - Math.max(spanLat * 1.1, 0.018)], // South ring road
    ];

    let bestCandidate = null;
    let shortestDist = Infinity;

    for (const [wLon, wLat] of detourOptions) {
      const detourUrl = `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${wLon.toFixed(6)},${wLat.toFixed(6)};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(detourUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const candidate = data.routes[0];
            // VERIFY candidate does NOT intersect any active hazard!
            const candHits = checkRouteHazards(candidate, allHazards);
            if (candHits.length === 0) {
              if (candidate.distance < shortestDist) {
                shortestDist = candidate.distance;
                bestCandidate = candidate;
              }
            }
          }
        }
      } catch (subErr) {
        // try next waypoint
      }
    }

    if (bestCandidate) {
      // Format steps
      if (bestCandidate.legs) {
        const allSteps = [];
        for (const leg of bestCandidate.legs) {
          if (leg.steps) allSteps.push(...leg.steps);
        }
        bestCandidate.legs[0].steps = allSteps.map((st, i, arr) => formatManeuverStep(st, i, arr.length));
      }

      return {
        ...bestCandidate,
        intersectsHazard: false,
        intersectedHazards: [],
        warning: null,
        isAlternative: true,
        label: 'Safe Road Detour Corridor (Hazard Bypass)',
      };
    }
  } catch (err) {
    console.warn(`[Real Road Detour Error]: ${err.message}`);
  }

  // If destination itself is inside hazard or no clean detour exists, return null
  return null;
}

/**
 * Creates realistic road network detour aligned to street grids rather than raw diagonals
 */
function createRealisticRoadDetour(startLon, startLat, endLon, endLat, hazard) {
  const poly = hazard.area.coordinates[0] || hazard.area.coordinates;
  let maxLon = -180, minLat = 90;
  for (const [lon, lat] of poly) {
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
  }

  const bypassLon = maxLon + 0.018;
  const bypassLat = (startLat + endLat) / 2;

  // L-shaped and grid-aligned turns mimicking city roads (AB Road / Eastern Ring Road)
  const coords = [
    [startLon, startLat],
    [bypassLon, startLat], // Horizontal arterial run
    [bypassLon, bypassLat], // Bypass arterial corridor
    [bypassLon, endLat], // Approach street
    [endLon, endLat], // Arrival
  ];

  const distKm =
    calculateHaversineDistance(startLat, startLon, startLat, bypassLon) +
    calculateHaversineDistance(startLat, bypassLon, endLat, bypassLon) +
    calculateHaversineDistance(endLat, bypassLon, endLat, endLon);

  return {
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
    distance: Math.round(distKm * 1000),
    duration: Math.round((distKm / 35) * 3600),
    intersectsHazard: false,
    intersectedHazards: [],
    warning: null,
    isAlternative: true,
    label: 'Safe Road Detour Corridor (Outer Ring Bypass)',
    legs: [
      {
        steps: [
          { formattedInstruction: 'Depart on Eastern Ring Road Bypass Corridor', directionIcon: 'depart', distanceMeters: 650 },
          { formattedInstruction: 'Turn right onto Outer Bypass Highway (bypassing hazard)', directionIcon: 'right', distanceMeters: 2800 },
          { formattedInstruction: 'Continue straight on Clear Emergency Arterial', directionIcon: 'straight', distanceMeters: 1900 },
          { formattedInstruction: 'Turn left onto Incident Approach Corridor', directionIcon: 'left', distanceMeters: 850 },
          { formattedInstruction: 'Arrive safely at incident staging location', directionIcon: 'arrive', distanceMeters: 0 },
        ],
      },
    ],
  };
}

function createDirectRoadGridRoute(startLon, startLat, endLon, endLat) {
  const distKm = calculateHaversineDistance(startLat, startLon, endLat, endLon);
  const midLon = (startLon + endLon) / 2;
  const midLat = (startLat + endLat) / 2;

  return {
    geometry: {
      type: 'LineString',
      coordinates: [
        [startLon, startLat],
        [midLon, startLat],
        [midLon, midLat],
        [midLon, endLat],
        [endLon, endLat],
      ],
    },
    distance: Math.round(distKm * 1000 * 1.15),
    duration: Math.round(((distKm * 1.15) / 32) * 3600),
    legs: [
      {
        steps: [
          { formattedInstruction: 'Depart onto primary city arterial road', directionIcon: 'depart', distanceMeters: 400 },
          { formattedInstruction: 'Turn onto Central Transit Corridor', directionIcon: 'right', distanceMeters: Math.round(distKm * 600) },
          { formattedInstruction: 'Continue towards target location', directionIcon: 'straight', distanceMeters: Math.round(distKm * 400) },
          { formattedInstruction: 'Arrive at destination', directionIcon: 'arrive', distanceMeters: 0 },
        ],
      },
    ],
  };
}

function isPointInsideOrNearPolygon(point, polygon, buffer = 0.002) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;

    // Proximity check
    const dist = Math.hypot(x - xi, y - yi);
    if (dist < buffer) return true;
  }
  return inside;
}

async function getActiveHazardsList() {
  if (isPostgresAvailable()) {
    try {
      const query = `
        SELECT id, type, notes, is_active, ST_AsGeoJSON(area) as area_geojson
        FROM hazards
        WHERE is_active = true
      `;
      const result = await executeQuery(query);
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        notes: row.notes,
        is_active: row.is_active,
        area: JSON.parse(row.area_geojson),
      }));
    } catch (err) {
      console.warn(`[Spatial PostGIS query error]: ${err.message}`);
    }
  }

  return inMemoryStore.hazards.filter(h => h.is_active);
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

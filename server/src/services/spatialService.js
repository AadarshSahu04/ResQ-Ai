/**
 * Spatial Service: Provides spatial computation, GeoJSON conversion,
 * and robust geometric intersection checks (LineString intersecting Polygon)
 * both for SQL generation and fallback in-memory verification.
 */

// Check if a point (px, py) is inside a polygon ring [[lon, lat], ...]
export function isPointInPolygon(point, polygonCoordinates) {
  const [px, py] = point;
  let inside = false;
  
  // Outer ring of the polygon
  const ring = polygonCoordinates[0] || polygonCoordinates;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 0.0000000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Line segment intersection test
function doSegmentsIntersect(p1, p2, p3, p4) {
  function ccw(a, b, c) {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  }
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

// Check if a LineString (array of [lon, lat]) intersects a GeoJSON Polygon
export function doesRouteIntersectPolygon(lineCoordinates, polygonCoordinates) {
  const ring = polygonCoordinates[0] || polygonCoordinates;
  
  // 1. Check if any waypoint on the route is inside the polygon
  for (const point of lineCoordinates) {
    if (isPointInPolygon(point, ring)) {
      return true;
    }
  }

  // 2. Check if any line segment of the route intersects any boundary segment of the polygon
  for (let i = 0; i < lineCoordinates.length - 1; i++) {
    const r1 = lineCoordinates[i];
    const r2 = lineCoordinates[i + 1];

    for (let j = 0; j < ring.length - 1; j++) {
      const p1 = ring[j];
      const p2 = ring[j + 1];

      if (doSegmentsIntersect(r1, r2, p1, p2)) {
        return true;
      }
    }
  }

  return false;
}

// Helper to convert PostGIS WKB/EWKT or GeoJSON to standard GeoJSON object
export function parseGeoJSON(geometry) {
  if (!geometry) return null;
  if (typeof geometry === 'object') return geometry;
  try {
    return JSON.parse(geometry);
  } catch (err) {
    return null;
  }
}

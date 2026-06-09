import type { Coordinate, RoutePoint } from "../types";

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters between two coordinates. */
export function haversine(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Nearest-neighbor reordering of the intermediate stops.
 * Start (first) and finish (last) are pinned; the middle points are
 * reordered greedily to shorten total straight-line distance.
 *
 * This is a heuristic on as-the-crow-flies distance — a quick, offline
 * pre-sort, not a true optimal solution (TSP). For road-accurate ordering
 * you'd feed a distance matrix from the routing engine.
 */
export function optimizeOrder(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 3) return points;

  const start = points[0];
  const end = points[points.length - 1];
  const middle = points.slice(1, -1);

  const ordered: RoutePoint[] = [];
  let current = start.coordinate;
  const remaining = [...middle];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i].coordinate);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = next.coordinate;
  }

  return [start, ...ordered, end];
}

/** Sum of straight-line distances along the route, in meters. */
export function totalStraightLine(points: RoutePoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversine(points[i - 1].coordinate, points[i].coordinate);
  }
  return sum;
}

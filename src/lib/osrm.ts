import type { Coordinate, RouteSummary, TravelMode } from "../types";

// The free Yandex JS API no longer builds routes client-side: the routing
// service returns 401 unless you have a paid Router API key. So we compute the
// route with the public OSRM demo server (no key, CORS-enabled) and draw the
// returned geometry on the Yandex map ourselves.
const OSRM_BASE = "https://router.project-osrm.org/route/v1";

// Our travel modes mapped to OSRM profiles. The public demo server reliably
// serves "driving"; foot/bike may be unavailable, so callers fall back to it.
const PROFILE: Record<TravelMode, string> = {
  auto: "driving",
  masstransit: "driving",
  pedestrian: "foot",
  bicycle: "bike",
};

export interface OsrmRoute {
  /** Route geometry as [latitude, longitude] pairs for the Yandex map. */
  geometry: [number, number][];
  summary: RouteSummary;
}

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} м`
    : `${(meters / 1000).toFixed(1)} км`;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} мин`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

async function request(points: Coordinate[], profile: string): Promise<any> {
  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
  const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`osrm-${res.status}`);
  return res.json();
}

/** Builds a road route through the points in order. Returns null if no route. */
export async function fetchRoute(
  points: Coordinate[],
  mode: TravelMode,
): Promise<OsrmRoute | null> {
  if (points.length < 2) return null;

  const profile = PROFILE[mode] ?? "driving";
  let data = await request(points, profile);
  // The public demo often only mounts the driving profile — fall back to it.
  if (data.code !== "Ok" && profile !== "driving") {
    data = await request(points, "driving");
  }
  if (data.code !== "Ok" || !data.routes?.length) return null;

  const route = data.routes[0];
  const geometry: [number, number][] = route.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon],
  );
  return {
    geometry,
    summary: {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(route.duration),
    },
  };
}

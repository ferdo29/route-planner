export type Coordinate = { latitude: number; longitude: number };

/** Yandex JS API routingMode values that the free JS API supports. */
export type TravelMode = "auto" | "masstransit" | "pedestrian" | "bicycle";

export interface RoutePoint {
  /** Stable id, used as React key and for drag reordering. */
  id: string;
  /** Human-readable label shown in the row (address or client name). */
  label: string;
  coordinate: Coordinate;
}

export interface RouteDraft {
  /** Stored under a fixed key as the autosaved working route. */
  id: string;
  name: string;
  mode: TravelMode;
  /** Ordered: first = start (A), last = finish (B), middle = numbered stops. */
  points: RoutePoint[];
  createdAt: number;
  updatedAt: number;
}

/** Result of a routing calculation (from the map engine). */
export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

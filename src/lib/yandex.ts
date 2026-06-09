import type { Coordinate } from "../types";

// We use the free Yandex JavaScript API (client-side) only for the map tiles
// and geocoding. Routing is done via OSRM (see lib/osrm.ts) because the Yandex
// routing service needs a paid Router API key. The key here is a public,
// referrer-restricted JS API + Geocoder key.

declare global {
  interface Window {
    ymaps?: any;
  }
}

export const YANDEX_API_KEY: string =
  (import.meta.env.VITE_YANDEX_API_KEY as string | undefined) ?? "";

let loaderPromise: Promise<any> | null = null;

/** Loads the Yandex JS API once and resolves the ready `ymaps` object. */
export function loadYmaps(): Promise<any> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (!YANDEX_API_KEY) {
      reject(new Error("no-api-key"));
      return;
    }
    if (window.ymaps?.ready) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }
    const script = document.createElement("script");
    const key = encodeURIComponent(YANDEX_API_KEY);
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error("ymaps-missing"));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error("script-failed"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/** Geocodes a free-text address to a coordinate using the JS API geocoder. */
export async function geocode(query: string): Promise<Coordinate | null> {
  const ymaps = await loadYmaps();
  const res = await ymaps.geocode(query, { results: 1 });
  const first = res.geoObjects.get(0);
  if (!first) return null;
  const [lat, lon] = first.geometry.getCoordinates();
  return { latitude: lat, longitude: lon };
}

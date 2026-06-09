import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinate, RouteDraft, RoutePoint, RouteSummary, TravelMode } from "./types";
import { CURRENT_ID, deleteRoute, getCurrent, listSavedRoutes, putRoute, saveCurrent } from "./lib/db";
import { optimizeOrder } from "./lib/geo";
import { geocode, YANDEX_API_KEY } from "./lib/yandex";
import { EXAMPLE_POINTS } from "./lib/example";
import { MapView } from "./components/MapView";
import { RoutePanel } from "./components/RoutePanel";

const genId = () =>
  (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function newRoute(points: RoutePoint[] = [], name = "Новый маршрут"): RouteDraft {
  const now = Date.now();
  return { id: CURRENT_ID, name, mode: "auto", points, createdAt: now, updatedAt: now };
}

/** Parses "55.598, 38.088" (lat, lng) into a coordinate, or null. */
function parseCoordinate(raw: string): Coordinate | null {
  const m = raw.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export default function App() {
  const [route, setRoute] = useState<RouteDraft>(() => newRoute());
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<RouteDraft[]>([]);
  const loaded = useRef(false);

  // Load the working route from the local DB on first mount (or seed it).
  useEffect(() => {
    (async () => {
      try {
        const current = await getCurrent();
        if (current && current.points.length > 0) {
          setRoute(current);
        } else {
          const seeded = newRoute(EXAMPLE_POINTS, "Жуковский — развоз");
          setRoute(seeded);
          await saveCurrent(seeded);
        }
        setSavedRoutes(await listSavedRoutes());
      } catch {
        // No IndexedDB (e.g. private mode) — app still works in-memory.
      } finally {
        loaded.current = true;
      }
    })();
  }, []);

  // Autosave the working route to the local DB (debounced).
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      saveCurrent(route).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [route]);

  const update = useCallback(
    (fn: (prev: RouteDraft) => RouteDraft) =>
      setRoute((prev) => ({ ...fn(prev), updatedAt: Date.now() })),
    [],
  );

  const handleAdd = useCallback(
    async (raw: string) => {
      const coord = parseCoordinate(raw);
      let point: RoutePoint | null = null;

      if (coord) {
        point = { id: genId(), label: `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`, coordinate: coord };
      } else if (YANDEX_API_KEY) {
        setBusy(true);
        try {
          const found = await geocode(raw);
          if (found) point = { id: genId(), label: raw, coordinate: found };
        } catch {
          /* ignore */
        } finally {
          setBusy(false);
        }
      }

      if (!point) {
        window.alert(
          YANDEX_API_KEY
            ? "Адрес не найден. Попробуйте уточнить или ввести координаты «широта, долгота»."
            : "Без ключа Yandex геокодер недоступен. Введите координаты в формате «55.598, 38.088».",
        );
        return;
      }

      update((prev) => {
        const pts = prev.points;
        // First two points are start and finish; later ones slot in before finish.
        const next = pts.length < 2 ? [...pts, point!] : [...pts.slice(0, -1), point!, pts[pts.length - 1]];
        return { ...prev, points: next };
      });
    },
    [update],
  );

  const handleReorder = useCallback(
    (from: number, to: number) =>
      update((prev) => {
        const pts = [...prev.points];
        const [moved] = pts.splice(from, 1);
        pts.splice(to, 0, moved);
        return { ...prev, points: pts };
      }),
    [update],
  );

  const handleRemove = useCallback(
    (id: string) => update((prev) => ({ ...prev, points: prev.points.filter((p) => p.id !== id) })),
    [update],
  );

  const handleMode = useCallback(
    (mode: TravelMode) => update((prev) => ({ ...prev, mode })),
    [update],
  );

  const handleOptimize = useCallback(
    () => update((prev) => ({ ...prev, points: optimizeOrder(prev.points) })),
    [update],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm("Очистить все точки текущего маршрута?")) return;
    update((prev) => ({ ...prev, points: [] }));
    setSummary(null);
  }, [update]);

  const handleRename = useCallback(
    (name: string) => update((prev) => ({ ...prev, name })),
    [update],
  );

  const refreshSaved = useCallback(async () => {
    setSavedRoutes(await listSavedRoutes());
  }, []);

  const handleSaveAs = useCallback(async () => {
    const name = window.prompt("Название копии:", route.name)?.trim();
    if (!name) return;
    const now = Date.now();
    await putRoute({ ...route, id: genId(), name, createdAt: now, updatedAt: now });
    await refreshSaved();
  }, [route, refreshSaved]);

  const handleLoad = useCallback(
    async (id: string) => {
      const snapshot = savedRoutes.find((r) => r.id === id);
      if (!snapshot) return;
      const next = { ...snapshot, id: CURRENT_ID, updatedAt: Date.now() };
      setRoute(next);
      await saveCurrent(next);
    },
    [savedRoutes],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRoute(id);
      await refreshSaved();
    },
    [refreshSaved],
  );

  return (
    <div className="app">
      <RoutePanel
        route={route}
        summary={summary}
        busy={busy}
        savedRoutes={savedRoutes}
        onModeChange={handleMode}
        onReorder={handleReorder}
        onRemove={handleRemove}
        onAdd={handleAdd}
        onOptimize={handleOptimize}
        onReset={handleReset}
        onRename={handleRename}
        onSaveAs={handleSaveAs}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />
      <main className="stage">
        <MapView points={route.points} mode={route.mode} onSummary={setSummary} />
      </main>
    </div>
  );
}

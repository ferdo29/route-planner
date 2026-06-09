import { useEffect, useRef, useState } from "react";
import type { RoutePoint, RouteSummary, TravelMode } from "../types";
import { loadYmaps, YANDEX_API_KEY } from "../lib/yandex";
import { fetchRoute } from "../lib/osrm";

interface Props {
  points: RoutePoint[];
  mode: TravelMode;
  onSummary: (summary: RouteSummary | null) => void;
}

export function MapView({ points, mode, onSummary }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [routeError, setRouteError] = useState<string | null>(null);

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;
    if (!YANDEX_API_KEY) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    loadYmaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new ymaps.Map(containerRef.current, {
          center: [55.75, 37.62],
          zoom: 9,
          controls: ["zoomControl"],
        });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Rebuild the route whenever points or mode change.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const ymaps = window.ymaps;
    const map = mapRef.current;
    let cancelled = false;

    if (routeRef.current) {
      map.geoObjects.remove(routeRef.current);
      routeRef.current = null;
    }

    const withCoords = points.filter(
      (p) => Number.isFinite(p.coordinate.latitude) && Number.isFinite(p.coordinate.longitude),
    );

    // Always show the stop markers, even before/without a computed route.
    const collection = new ymaps.GeoObjectCollection();
    withCoords.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast = i === withCoords.length - 1;
      const caption = isFirst ? "A" : isLast ? "B" : String(i);
      collection.add(
        new ymaps.Placemark(
          [p.coordinate.latitude, p.coordinate.longitude],
          { iconCaption: caption, balloonContent: p.label },
          {
            preset: isFirst
              ? "islands#greenDotIconWithCaption"
              : isLast
                ? "islands#redDotIconWithCaption"
                : "islands#blueDotIconWithCaption",
          },
        ),
      );
    });
    map.geoObjects.add(collection);
    routeRef.current = collection;

    if (withCoords.length < 2) {
      setRouteError(null);
      onSummary(null);
      return;
    }

    fetchRoute(withCoords.map((p) => p.coordinate), mode)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setRouteError("Не удалось построить маршрут по этим точкам.");
          onSummary(null);
          return;
        }
        const line = new ymaps.Polyline(
          result.geometry,
          {},
          { strokeColor: "#2b6cff", strokeWidth: 5, strokeOpacity: 0.85 },
        );
        collection.add(line);
        map.setBounds(collection.getBounds(), {
          checkZoomRange: true,
          zoomMargin: 30,
        });
        setRouteError(null);
        onSummary(result.summary);
      })
      .catch(() => {
        if (cancelled) return;
        setRouteError("Сервис маршрутов недоступен. Попробуйте позже.");
        onSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [points, mode, status, onSummary]);

  if (status === "error") {
    return (
      <div className="map map--placeholder">
        <div className="map__hint">
          <strong>Карта не подключена</strong>
          <p>
            Добавьте бесплатный ключ Yandex JS API в <code>.env</code> как{" "}
            <code>VITE_YANDEX_API_KEY</code>, чтобы строить маршрут и видеть
            расстояние. Панель и сохранение точек работают и без ключа.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <div className="map" ref={containerRef} aria-label="Карта маршрута" />
      {routeError && <div className="map__error" role="alert">{routeError}</div>}
    </div>
  );
}

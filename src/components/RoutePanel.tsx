import { useState } from "react";
import type { RouteDraft, RouteSummary, TravelMode } from "../types";

const MODES: { id: TravelMode; label: string }[] = [
  { id: "auto", label: "Авто" },
  { id: "masstransit", label: "Транспорт" },
  { id: "pedestrian", label: "Пешком" },
  { id: "bicycle", label: "Вело" },
];

interface Props {
  route: RouteDraft;
  summary: RouteSummary | null;
  busy: boolean;
  savedRoutes: RouteDraft[];
  onModeChange: (mode: TravelMode) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onAdd: (raw: string) => void;
  onOptimize: () => void;
  onReset: () => void;
  onRename: (name: string) => void;
  onSaveAs: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

function roleFor(index: number, total: number): "start" | "finish" | "stop" {
  if (index === 0) return "start";
  if (index === total - 1 && total > 1) return "finish";
  return "stop";
}

export function RoutePanel(props: Props) {
  const { route, summary, busy, savedRoutes } = props;
  const [draft, setDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const points = route.points;

  function submitAdd() {
    const value = draft.trim();
    if (!value) return;
    props.onAdd(value);
    setDraft("");
  }

  function handleDrop(target: number) {
    if (dragIndex !== null && dragIndex !== target) {
      props.onReorder(dragIndex, target);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <aside className="panel">
      <header className="panel__head">
        <h1 className="panel__title">Маршрут</h1>
        <input
          className="panel__name"
          value={route.name}
          onChange={(e) => props.onRename(e.target.value)}
          aria-label="Название маршрута"
        />
      </header>

      <div className="modes" role="tablist" aria-label="Способ передвижения">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={route.mode === m.id}
            className={"mode" + (route.mode === m.id ? " mode--active" : "")}
            onClick={() => props.onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ol className="points">
        {points.length === 0 && (
          <li className="points__empty">
            Добавьте первую точку — она станет началом маршрута.
          </li>
        )}
        {points.map((p, i) => {
          const role = roleFor(i, points.length);
          const stopNumber = role === "stop" ? i : null;
          return (
            <li
              key={p.id}
              className={
                "row" +
                (overIndex === i ? " row--over" : "") +
                (dragIndex === i ? " row--dragging" : "")
              }
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <span className={"marker marker--" + role} aria-hidden>
                {stopNumber ?? ""}
              </span>
              <span className="row__label" title={p.label}>
                {p.label}
              </span>
              <button
                className="row__remove"
                onClick={() => props.onRemove(p.id)}
                aria-label={`Удалить точку «${p.label}»`}
              >
                ✕
              </button>
              <span className="row__grip" aria-hidden>
                ⠿
              </span>
            </li>
          );
        })}
      </ol>

      <div className="add">
        <input
          className="add__input"
          placeholder="Адрес или координаты «55.598, 38.088»"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          aria-label="Новая точка маршрута"
        />
        <button className="add__btn" onClick={submitAdd} disabled={!draft.trim()}>
          Добавить
        </button>
      </div>

      <div className="actions">
        <button
          className="actions__btn"
          onClick={props.onOptimize}
          disabled={points.length < 4}
          title="Переставить промежуточные точки по принципу ближайшего соседа"
        >
          Оптимизировать
        </button>
        <button
          className="actions__btn actions__btn--ghost"
          onClick={props.onReset}
          disabled={points.length === 0}
        >
          Сбросить
        </button>
      </div>

      <div className="summary" aria-live="polite">
        {busy && <span className="summary__busy">Считаю маршрут…</span>}
        {!busy && summary && (
          <>
            <div className="summary__time">{summary.durationText}</div>
            <div className="summary__dist">{summary.distanceText}</div>
          </>
        )}
        {!busy && !summary && points.length >= 2 && (
          <span className="summary__muted">Маршрут не построен</span>
        )}
        {!busy && !summary && points.length < 2 && (
          <span className="summary__muted">Нужно минимум две точки</span>
        )}
      </div>

      <section className="saved">
        <div className="saved__head">
          <span>Сохранённые маршруты</span>
          <button className="saved__save" onClick={props.onSaveAs} disabled={points.length === 0}>
            Сохранить копию
          </button>
        </div>
        {savedRoutes.length === 0 ? (
          <p className="saved__empty">Пока ничего не сохранено.</p>
        ) : (
          <ul className="saved__list">
            {savedRoutes.map((r) => (
              <li key={r.id} className="saved__item">
                <button className="saved__load" onClick={() => props.onLoad(r.id)}>
                  {r.name} <span className="saved__meta">{r.points.length} тчк</span>
                </button>
                <button
                  className="saved__del"
                  onClick={() => props.onDelete(r.id)}
                  aria-label={`Удалить сохранённый маршрут «${r.name}»`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

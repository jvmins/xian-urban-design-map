"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import mapDataPayload from "./map-data.json";

type Relationship = { id: string; overlap: number };
type BBox = [number, number, number, number];

type LayerInfo = {
  key: string;
  label: string;
  color: string;
  count: number;
};

type UnitItem = {
  id: string;
  businessId: string;
  name: string;
  unitType: string;
  function: string;
  development: string;
  areaHa: number;
  population: string;
  path: string;
  bbox: BBox;
  controls: Relationship[];
};

type ParcelItem = {
  id: string;
  businessId: string;
  unitId: string;
  landUse: string;
  landUseCode: string;
  areaHa: number;
  farMax: string;
  farMin: string;
  status: string;
  path: string;
  bbox: BBox;
  controls: Relationship[];
};

type ControlItem = {
  id: string;
  layerKey: string;
  layer: string;
  title: string;
  type: string;
  level: string;
  subtype: string;
  rule: string;
  ruleSource: "管控数据" | "PDF补充";
  range: string;
  path: string;
  bbox: BBox;
};

type MapData = {
  meta: {
    title: string;
    generatedFrom: string;
    unitCount: number;
    parcelCount: number;
    controlCount: number;
    sourceControlCount: number;
    coordinateNotice: string;
  };
  layers: LayerInfo[];
  units: UnitItem[];
  parcels: ParcelItem[];
  controls: ControlItem[];
};

type Selection = { kind: "unit" | "parcel"; id: string } | null;
type ViewBox = { x: number; y: number; width: number; height: number };

const DEFAULT_VIEW: ViewBox = { x: 0, y: 0, width: 1000, height: 1000 };
const LAND_USE_COLORS = [
  "#DCE7ED",
  "#E8DDD0",
  "#DCE8D5",
  "#E9E2BD",
  "#DED9E8",
  "#D4E4E1",
  "#E6D5D7",
  "#DCE0CE",
];

function hashColor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return LAND_USE_COLORS[hash % LAND_USE_COLORS.length];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function overlapLabel(value: number) {
  if (value >= 99.9) return "完整覆盖";
  if (value < 0.1) return "覆盖不足 0.1%";
  return `覆盖 ${value.toFixed(value < 10 ? 1 : 0)}%`;
}

function clampView(next: ViewBox): ViewBox {
  const width = Math.min(1000, Math.max(120, next.width));
  const height = Math.min(1000, Math.max(120, next.height));
  return {
    x: Math.min(1000 - width, Math.max(0, next.x)),
    y: Math.min(1000 - height, Math.max(0, next.y)),
    width,
    height,
  };
}

function viewForBBox(bbox: BBox): ViewBox {
  const [left, top, right, bottom] = bbox;
  const size = Math.min(1000, Math.max(150, Math.max(right - left, bottom - top) * 1.7));
  return clampView({
    x: (left + right) / 2 - size / 2,
    y: (top + bottom) / 2 - size / 2,
    width: size,
    height: size,
  });
}

export default function UrbanDesignMap() {
  const data = mapDataPayload as MapData;
  const [mode, setMode] = useState<"unit" | "parcel">("unit");
  const [selection, setSelection] = useState<Selection>(() =>
    data.units[0] ? { kind: "unit", id: data.units[0].id } : null,
  );
  const [visibleLayers, setVisibleLayers] = useState<string[]>(() =>
    data.layers.filter((layer) => layer.count > 0).map((layer) => layer.key),
  );
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEW);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    view: ViewBox;
  } | null>(null);
  const didDragRef = useRef(false);

  const unitMap = useMemo(
    () => new Map(data.units.map((unit) => [unit.businessId, unit])),
    [data],
  );
  const controlMap = useMemo(
    () => new Map(data.controls.map((control) => [control.id, control])),
    [data],
  );

  const selectedObject = useMemo(() => {
    if (!selection) return null;
    return selection.kind === "unit"
      ? data.units.find((unit) => unit.id === selection.id) ?? null
      : data.parcels.find((parcel) => parcel.id === selection.id) ?? null;
  }, [data, selection]);

  const applicableControls = useMemo(() => {
    if (!selectedObject) return [];
    return selectedObject.controls
      .map((relationship) => ({
        relationship,
        control: controlMap.get(relationship.id),
      }))
      .filter((item): item is { relationship: Relationship; control: ControlItem } => Boolean(item.control))
      .sort((a, b) => a.control.layer.localeCompare(b.control.layer, "zh-CN"));
  }, [selectedObject, controlMap]);

  const applicableIds = useMemo(
    () => new Set(applicableControls.map((item) => item.control.id)),
    [applicableControls],
  );

  const searchResults = useMemo(() => {
    if (query.trim().length < 1) return [];
    const keyword = query.trim().toLowerCase();
    const unitResults = data.units
      .filter((unit) => `${unit.businessId}${unit.name}`.toLowerCase().includes(keyword))
      .slice(0, 5)
      .map((item) => ({ kind: "unit" as const, item }));
    const parcelResults = data.parcels
      .filter((parcel) => `${parcel.businessId}${parcel.landUse}${parcel.unitId}`.toLowerCase().includes(keyword))
      .slice(0, 8 - unitResults.length)
      .map((item) => ({ kind: "parcel" as const, item }));
    return [...unitResults, ...parcelResults];
  }, [data, query]);

  function zoomTo(bbox: BBox) {
    setViewBox(viewForBBox(bbox));
  }

  function choose(kind: "unit" | "parcel", item: UnitItem | ParcelItem) {
    setMode(kind);
    setSelection({ kind, id: item.id });
    zoomTo(item.bbox);
    setShowSearch(false);
  }

  function setMapMode(next: "unit" | "parcel") {
    setMode(next);
    const first = next === "unit" ? data.units[0] : data.parcels[0];
    if (first) setSelection({ kind: next, id: first.id });
    setViewBox(DEFAULT_VIEW);
  }

  function toggleLayer(layerKey: string) {
    setVisibleLayers((current) =>
      current.includes(layerKey)
        ? current.filter((item) => item !== layerKey)
        : [...current, layerKey],
    );
  }

  function zoomBy(factor: number) {
    setViewBox((current) => {
      const width = current.width * factor;
      const height = current.height * factor;
      return clampView({
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height,
      });
    });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const pointY = viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height;
    const factor = event.deltaY > 0 ? 1.16 : 0.86;
    const width = viewBox.width * factor;
    const height = viewBox.height * factor;
    setViewBox(clampView({
      x: pointX - ((event.clientX - rect.left) / rect.width) * width,
      y: pointY - ((event.clientY - rect.top) / rect.height) * height,
      width,
      height,
    }));
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      view: viewBox,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    if (Math.hypot(deltaX, deltaY) > 3) didDragRef.current = true;
    setViewBox(clampView({
      ...drag.view,
      x: drag.view.x - (deltaX / rect.width) * drag.view.width,
      y: drag.view.y - (deltaY / rect.height) * drag.view.height,
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-seal">西安</div>
          <div>
            <h1>东部城市设计一张图</h1>
            <p>单元 · 地块 · 管控规则空间查询原型</p>
          </div>
          <span className="prototype-badge">交互原型</span>
        </div>
        <div className="topbar-stats" aria-label="数据规模">
          <span><strong>{data.meta.unitCount}</strong> 个单元</span>
          <span><strong>{formatNumber(data.meta.parcelCount)}</strong> 个地块</span>
          <span><strong>{data.meta.controlCount}</strong> 个涉及管控要素</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-section search-section">
            <label htmlFor="map-search">空间对象查询</label>
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                id="map-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    choose(searchResults[0].kind, searchResults[0].item);
                  }
                }}
                placeholder="输入单元或地块编号"
                autoComplete="off"
              />
            </div>
            {showSearch && query && (
              <div className="search-results">
                {searchResults.length ? searchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.item.id}`}
                    type="button"
                    onClick={() => choose(result.kind, result.item)}
                  >
                    <span>{result.kind === "unit" ? "单元" : "地块"}</span>
                    <strong>{result.kind === "unit" ? result.item.name : result.item.businessId}</strong>
                    <small>{result.kind === "unit" ? result.item.businessId : result.item.landUse}</small>
                  </button>
                )) : <p>没有找到匹配对象</p>}
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">查询对象</span>
                <h2>空间层级</h2>
              </div>
            </div>
            <div className="mode-switch" role="group" aria-label="选择空间层级">
              <button
                type="button"
                className={mode === "unit" ? "active" : ""}
                onClick={() => setMapMode("unit")}
              >
                <strong>单元</strong><span>38</span>
              </button>
              <button
                type="button"
                className={mode === "parcel" ? "active" : ""}
                onClick={() => setMapMode("parcel")}
              >
                <strong>地块</strong><span>3,544</span>
              </button>
            </div>
          </div>

          <div className="panel-section layer-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">现有矢量</span>
                <h2>城市设计管控</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setVisibleLayers(data.layers.filter((layer) => layer.count > 0).map((layer) => layer.key))}
              >全部显示</button>
            </div>
            <div className="layer-list">
              {data.layers.map((layer) => {
                const active = visibleLayers.includes(layer.key);
                return (
                  <button
                    type="button"
                    key={layer.key}
                    disabled={layer.count === 0}
                    className={active ? "active" : ""}
                    onClick={() => toggleLayer(layer.key)}
                  >
                    <span className="layer-check" style={{ borderColor: layer.color, background: active ? layer.color : "transparent" }}>
                      {active ? "✓" : ""}
                    </span>
                    <span className="layer-name">{layer.label}</span>
                    <span className="layer-count">{layer.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="source-note">
            <span>数据口径</span>
            <p>仅展示与东部单元实际相交的现有管控矢量；PDF仅补充缺失规则文字。</p>
          </div>
        </aside>

        <section className="map-stage" aria-label="城市设计一张图地图">
          <div className="map-caption">
            <div>
              <span className="live-dot" />
              {mode === "unit" ? "单元查询模式" : "地块查询模式"}
            </div>
            <p>滚轮缩放 · 拖动平移 · 点击图形查询</p>
          </div>

          <svg
            ref={svgRef}
            className={`city-map mode-${mode}`}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="东部单元和地块矢量地图"
          >
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="#DDE4E5" strokeWidth="0.7" />
              </pattern>
              <filter id="selection-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#113C45" floodOpacity="0.48" />
              </filter>
            </defs>
            <rect width="1000" height="1000" fill="#F3F5F2" />
            <rect width="1000" height="1000" fill="url(#map-grid)" opacity="0.7" />

            <g className="unit-backdrop">
              {data.units.map((unit) => (
                <path key={`back-${unit.id}`} d={unit.path} />
              ))}
            </g>

            {mode === "unit" && (
              <g className="unit-features">
                {data.units.map((unit, index) => {
                  const selected = selection?.kind === "unit" && selection.id === unit.id;
                  const [left, top, right, bottom] = unit.bbox;
                  return (
                    <g key={unit.id}>
                      <path
                        d={unit.path}
                        className={selected ? "selected" : ""}
                        style={{ "--unit-fill": LAND_USE_COLORS[index % LAND_USE_COLORS.length] } as CSSProperties}
                        onClick={() => {
                          if (didDragRef.current) {
                            didDragRef.current = false;
                            return;
                          }
                          choose("unit", unit);
                        }}
                      />
                      {(viewBox.width < 620 || selected) && (
                        <text x={(left + right) / 2} y={(top + bottom) / 2} className={selected ? "selected-label" : ""}>
                          {unit.businessId}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {mode === "parcel" && (
              <g className="parcel-features">
                {data.parcels.map((parcel) => {
                  const selected = selection?.kind === "parcel" && selection.id === parcel.id;
                  return (
                    <path
                      key={parcel.id}
                      d={parcel.path}
                      className={selected ? "selected" : ""}
                      fill={hashColor(parcel.landUseCode || parcel.landUse)}
                      onClick={() => {
                        if (didDragRef.current) {
                          didDragRef.current = false;
                          return;
                        }
                        choose("parcel", parcel);
                      }}
                    />
                  );
                })}
              </g>
            )}

            <g className="control-features" aria-hidden="true">
              {data.controls
                .filter((control) => visibleLayers.includes(control.layerKey))
                .map((control) => {
                  const layer = data.layers.find((item) => item.key === control.layerKey);
                  return (
                    <path
                      key={control.id}
                      d={control.path}
                      className={applicableIds.has(control.id) ? "applicable" : ""}
                      style={{ "--control-color": layer?.color ?? "#5A6B70" } as CSSProperties}
                    />
                  );
                })}
            </g>
          </svg>

          <div className="map-tools" aria-label="地图缩放工具">
            <button type="button" onClick={() => zoomBy(0.78)} aria-label="放大">＋</button>
            <button type="button" onClick={() => zoomBy(1.28)} aria-label="缩小">−</button>
            <button type="button" onClick={() => setViewBox(DEFAULT_VIEW)} aria-label="复位">⌂</button>
          </div>

          <div className="map-legend">
            <span><i className="legend-unit" />单元边界</span>
            <span><i className="legend-parcel" />地块边界</span>
            <span><i className="legend-control" />管控范围</span>
          </div>

          <div className="map-footnote">
            <span>数据范围：西安市东部</span>
            <span>{data.meta.coordinateNotice}</span>
          </div>
        </section>

        <aside className="right-panel">
          {selectedObject && selection ? (
            <>
              <div className="object-header">
                <div className="object-kicker">
                  <span>{selection.kind === "unit" ? "详细规划编制单元" : "规划地块"}</span>
                  <button type="button" onClick={() => window.print()}>打印结果</button>
                </div>
                <h2>{selection.kind === "unit" ? (selectedObject as UnitItem).name : selectedObject.businessId}</h2>
                <p>{selection.kind === "unit" ? selectedObject.businessId : `${(selectedObject as ParcelItem).unitId} · ${(selectedObject as ParcelItem).landUse}`}</p>
              </div>

              {selection.kind === "unit" ? (
                <div className="attribute-card">
                  <div><span>单元面积</span><strong>{(selectedObject as UnitItem).areaHa} ha</strong></div>
                  <div><span>开发类型</span><strong>{(selectedObject as UnitItem).development || "—"}</strong></div>
                  <div><span>规划人口</span><strong>{(selectedObject as UnitItem).population || "—"}</strong></div>
                  <div className="wide"><span>主导功能</span><p>{(selectedObject as UnitItem).function || "暂无"}</p></div>
                </div>
              ) : (
                <div className="attribute-card">
                  <div><span>用地面积</span><strong>{(selectedObject as ParcelItem).areaHa} ha</strong></div>
                  <div><span>用地性质</span><strong>{(selectedObject as ParcelItem).landUse}</strong></div>
                  <div><span>容积率下限</span><strong>{(selectedObject as ParcelItem).farMin || "—"}</strong></div>
                  <div><span>容积率上限</span><strong>{(selectedObject as ParcelItem).farMax || "—"}</strong></div>
                  <div className="wide"><span>所属单元</span><p>{unitMap.get((selectedObject as ParcelItem).unitId)?.name ?? (selectedObject as ParcelItem).unitId}</p></div>
                </div>
              )}

              <div className="rule-heading">
                <div>
                  <span className="eyebrow">空间叠加结果</span>
                  <h3>涉及的城市设计管控</h3>
                </div>
                <strong>{applicableControls.length}</strong>
              </div>

              <div className="rule-list">
                {applicableControls.length ? applicableControls.map(({ control, relationship }) => {
                  const layer = data.layers.find((item) => item.key === control.layerKey);
                  return (
                    <article className="rule-card" key={control.id} style={{ "--rule-color": layer?.color ?? "#607176" } as CSSProperties}>
                      <div className="rule-card-top">
                        <span className="rule-layer">{control.layer}</span>
                        <span className={`source-badge ${control.ruleSource === "PDF补充" ? "pdf" : ""}`}>{control.ruleSource}</span>
                      </div>
                      <h4>{control.title}</h4>
                      <div className="rule-tags">
                        {control.level && <span>{control.level}</span>}
                        {control.subtype && <span>{control.subtype}</span>}
                        {!control.subtype && control.type && control.type !== control.title && <span>{control.type}</span>}
                        <span className="overlap-tag">{overlapLabel(relationship.overlap)}</span>
                      </div>
                      <p>{control.rule}</p>
                      {control.range && (
                        <details>
                          <summary>查看原始管控范围说明</summary>
                          <p>{control.range}</p>
                        </details>
                      )}
                      <button
                        type="button"
                        className="locate-button"
                        onClick={() => {
                          if (!visibleLayers.includes(control.layerKey)) toggleLayer(control.layerKey);
                          zoomTo(control.bbox);
                        }}
                      >定位管控范围 ↗</button>
                    </article>
                  );
                }) : (
                  <div className="empty-rules">
                    <div>○</div>
                    <h4>未涉及现有管控矢量</h4>
                    <p>该对象与城市设计管控数据GDB中的现有要素没有实质面积相交。</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection"><p>请在地图上选择一个单元或地块</p></div>
          )}
        </aside>
      </section>
    </main>
  );
}

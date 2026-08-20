"use client";

import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapDataPayload from "./map-data.json";
import { LAND_USE_LEGEND, landUseColor } from "./land-use-palette";
import { parcelAreaBand } from "./parcel-rules";
import {
  getUnit20ParcelRequirementGroups,
  UNIT20_BUSINESS_ID,
  UNIT20_UNIT_REQUIREMENT_GROUPS,
} from "./unit20-controls";

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
  contextControls: Relationship[];
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
const AUTH_CREDENTIAL = "GHSS";
const AUTH_SESSION_KEY = "urban-design-ghss-authenticated";
const UNIT_COLORS = [
  "#DCE7ED",
  "#E8DDD0",
  "#DCE8D5",
  "#E9E2BD",
  "#DED9E8",
  "#D4E4E1",
  "#E6D5D7",
  "#DCE0CE",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
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
    x: (left + right) / 2 - size * 0.36,
    y: (top + bottom) / 2 - size / 2,
    width: size,
    height: size,
  });
}

export default function UrbanDesignMap() {
  const data = mapDataPayload as MapData;
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [mode, setMode] = useState<"unit" | "parcel">("unit");
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEW);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    view: ViewBox;
    feature: { kind: "unit" | "parcel"; id: string } | null;
  } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    const storedAuthentication = window.sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
    const restoreAuthentication = window.setTimeout(
      () => setAuthenticated(storedAuthentication),
      0,
    );
    return () => window.clearTimeout(restoreAuthentication);
  }, []);

  const unitMap = useMemo(
    () => new Map(data.units.map((unit) => [unit.businessId, unit])),
    [data],
  );

  const selectedObject = useMemo(() => {
    if (!selection) return null;
    return selection.kind === "unit"
      ? data.units.find((unit) => unit.id === selection.id) ?? null
      : data.parcels.find((parcel) => parcel.id === selection.id) ?? null;
  }, [data, selection]);

  const requirementGroups = useMemo(() => {
    if (!selectedObject || !selection) return [];
    if (selection.kind === "unit") {
      return (selectedObject as UnitItem).businessId === UNIT20_BUSINESS_ID
        ? UNIT20_UNIT_REQUIREMENT_GROUPS
        : [];
    }
    return getUnit20ParcelRequirementGroups(selectedObject as ParcelItem);
  }, [selectedObject, selection]);

  const requirementCount = useMemo(
    () => requirementGroups.reduce((total, group) => total + group.items.length, 0),
    [requirementGroups],
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
    setSelection(null);
    setViewBox(DEFAULT_VIEW);
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
    const featureElement = (event.target as Element).closest<SVGPathElement>(
      "[data-feature-kind][data-feature-id]",
    );
    const featureKind = featureElement?.dataset.featureKind;
    const featureId = featureElement?.dataset.featureId;
    event.currentTarget.setPointerCapture(event.pointerId);
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      view: viewBox,
      feature:
        (featureKind === "unit" || featureKind === "parcel") && featureId
          ? { kind: featureKind, id: featureId }
          : null,
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
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!didDragRef.current && drag.feature) {
      const item = drag.feature.kind === "unit"
        ? data.units.find((unit) => unit.id === drag.feature?.id)
        : data.parcels.find((parcel) => parcel.id === drag.feature?.id);
      if (item) choose(drag.feature.kind, item);
    }

    dragRef.current = null;
    didDragRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    didDragRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (username.trim() === AUTH_CREDENTIAL && password === AUTH_CREDENTIAL) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, "true");
      setAuthenticated(true);
      setPassword("");
      setLoginError("");
      return;
    }
    setLoginError("账号或密码错误，请重新输入");
  }

  function handleLogout() {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
    setUsername("");
    setPassword("");
    setLoginError("");
  }

  if (!authenticated) {
    return (
      <main className="login-shell">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-seal" aria-hidden="true">城</div>
          <p className="login-eyebrow">URBAN DESIGN CONTROL PLATFORM</p>
          <h1 id="login-title">东部城市设计一张图</h1>
          <p className="login-subtitle">城市设计管控信息平台</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-username">账号</label>
            <input
              id="login-username"
              name="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setLoginError("");
              }}
              autoComplete="username"
              autoFocus
              required
            />
            <label htmlFor="login-password">密码</label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoginError("");
              }}
              autoComplete="current-password"
              required
            />
            <p className={`login-error${loginError ? " visible" : ""}`} role="alert">
              {loginError || "请输入平台访问凭据"}
            </p>
            <button type="submit">进入一张图平台</button>
          </form>
          <p className="login-footnote">西安市东部城市设计 · 访问验证</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-seal">城</div>
          <div>
            <h1>东部城市设计一张图</h1>
            <p>城市设计管控信息平台</p>
          </div>
        </div>
        <nav className="top-navigation" aria-label="平台主导航">
          <button type="button">门户</button>
          <button type="button">数据中心</button>
          <button type="button" className="active">一张图</button>
          <button type="button">项目管理</button>
          <button type="button">城市设计</button>
          <button type="button">管控查询</button>
        </nav>
        <div className="topbar-stats" aria-label="数据规模">
          <span><strong>{data.meta.unitCount}</strong> 个单元</span>
          <span><strong>{formatNumber(data.meta.parcelCount)}</strong> 个地块</span>
          <span><strong>{data.meta.controlCount}</strong> 条规则</span>
          <button type="button" className="logout-button" onClick={handleLogout}>退出</button>
        </div>
      </header>

      <section className="workspace">
        <nav className="app-rail" aria-label="一张图功能导航">
          <button type="button" className="active"><b>图</b><span>一张图</span></button>
          <button type="button"><b>查</b><span>查询</span></button>
          <button type="button"><b>表</b><span>成果</span></button>
          <button type="button"><b>设</b><span>设置</span></button>
        </nav>
        <aside className="left-panel">
          <div className="data-panel-title">
            <span>▱</span>
            <div><strong>数据图层</strong><small>DATA LAYERS</small></div>
          </div>
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
                <span className="eyebrow">显示内容</span>
                <h2>规划对象图层</h2>
              </div>
            </div>
            <div className="object-layer-list">
              <button type="button" className={mode === "unit" ? "active" : ""} onClick={() => setMapMode("unit")}>
                <span className="object-layer-check">{mode === "unit" ? "✓" : ""}</span>
                <span><strong>详细规划编制单元</strong><small>点击单元查看管控内容</small></span>
                <b>{data.meta.unitCount}</b>
              </button>
              <button type="button" className={mode === "parcel" ? "active" : ""} onClick={() => setMapMode("parcel")}>
                <span className="object-layer-check">{mode === "parcel" ? "✓" : ""}</span>
                <span><strong>规划用地布局</strong><small>点击地块查看管控内容</small></span>
                <b>{formatNumber(data.meta.parcelCount)}</b>
              </button>
            </div>
          </div>

          <div className="source-note">
            <span>结果显示方式</span>
            <p>管控范围不再作为地图图层叠加；选择单元或地块后，匹配结果直接在右侧表格中展示。</p>
          </div>
        </aside>

        <section className="map-stage" aria-label="城市设计一张图地图">
          <div className="map-caption">
            <div>
              <span className="live-dot" />
              {mode === "unit" ? "单元查询模式" : "地块查询模式"}
            </div>
            <p>{mode === "unit" ? "直接点击任一单元查看管控结果" : "点击地块查看属性与导则分解结果"}</p>
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
            onPointerCancel={handlePointerCancel}
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
                        data-feature-kind="unit"
                        data-feature-id={unit.id}
                        style={{ "--unit-fill": UNIT_COLORS[index % UNIT_COLORS.length] } as CSSProperties}
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
                      data-feature-kind="parcel"
                      data-feature-id={parcel.id}
                      fill={landUseColor(parcel.landUseCode, parcel.landUse)}
                    />
                  );
                })}
              </g>
            )}

          </svg>

          <div className="map-tools" aria-label="地图缩放工具">
            <button type="button" onClick={() => zoomBy(0.78)} aria-label="放大">＋</button>
            <button type="button" onClick={() => zoomBy(1.28)} aria-label="缩小">−</button>
            <button type="button" onClick={() => setViewBox(DEFAULT_VIEW)} aria-label="复位">⌂</button>
          </div>

          <div className="map-legend">
            <span><i className={mode === "unit" ? "legend-unit" : "legend-parcel"} />{mode === "unit" ? "详细规划编制单元" : "规划用地地块"}</span>
            <span><i className="legend-selected" />当前选中对象</span>
          </div>

          {mode === "parcel" && (
            <details className="land-use-legend">
              <summary>用地布局色板 · 20260710.lyr</summary>
              <div>
                {LAND_USE_LEGEND.map((item) => (
                  <span key={item.label}>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </details>
          )}

          <div className="map-footnote">
            <span>数据范围：西安市东部</span>
            <span>{data.meta.coordinateNotice}</span>
          </div>
        </section>

        <aside className="right-panel result-window">
          {selectedObject && selection ? (
            <>
              <div className="object-header">
                <div>
                  <span>
                    {selection.kind === "unit" ? "单元详细管控" : "地块详细管控"}
                    {requirementGroups.length ? " · 20单元示例" : " · 仅作空间展示"}
                  </span>
                  <h2>{selection.kind === "unit" ? (selectedObject as UnitItem).name : selectedObject.businessId}</h2>
                </div>
                <button type="button" onClick={() => setSelection(null)} aria-label="关闭详情">×</button>
              </div>

              <div className="result-scroll">
                <div className="table-section-title">
                  <span>01</span><strong>对象基本信息</strong>
                </div>
                <table className="detail-table">
                  <tbody>
                    {selection.kind === "unit" ? (
                      <>
                        <tr><th>单元编号</th><td>{(selectedObject as UnitItem).businessId}</td></tr>
                        <tr><th>单元名称</th><td>{(selectedObject as UnitItem).name}</td></tr>
                        <tr><th>单元类型</th><td>{(selectedObject as UnitItem).unitType || "—"}</td></tr>
                        <tr><th>主导功能</th><td>{(selectedObject as UnitItem).function || "—"}</td></tr>
                        <tr><th>开发类型</th><td>{(selectedObject as UnitItem).development || "—"}</td></tr>
                        <tr><th>单元面积</th><td>{(selectedObject as UnitItem).areaHa} ha</td></tr>
                        <tr><th>规划人口</th><td>{(selectedObject as UnitItem).population || "—"}</td></tr>
                      </>
                    ) : (
                      <>
                        <tr><th>地块编号</th><td>{(selectedObject as ParcelItem).businessId}</td></tr>
                        <tr><th>所属单元</th><td>{unitMap.get((selectedObject as ParcelItem).unitId)?.name ?? (selectedObject as ParcelItem).unitId}</td></tr>
                        <tr><th>用地代码</th><td>{(selectedObject as ParcelItem).landUseCode || "—"}</td></tr>
                        <tr><th>用地性质</th><td>{(selectedObject as ParcelItem).landUse}</td></tr>
                        <tr><th>用地面积</th><td>{(selectedObject as ParcelItem).areaHa} ha</td></tr>
                        <tr><th>容积率上限</th><td>{(selectedObject as ParcelItem).farMax || "—"}</td></tr>
                        <tr><th>容积率下限</th><td>{(selectedObject as ParcelItem).farMin || "—"}</td></tr>
                        <tr><th>规划状态</th><td>{(selectedObject as ParcelItem).status || "—"}</td></tr>
                        <tr><th>面积档次</th><td>{parcelAreaBand((selectedObject as ParcelItem).areaHa)}</td></tr>
                      </>
                    )}
                  </tbody>
                </table>

                <div className="table-section-title control-title">
                  <span>02</span>
                  <strong>{selection.kind === "unit" ? "单元城市设计三级管控要求" : "地块城市设计三级管控要求"}</strong>
                  <b>{requirementCount}</b>
                </div>

                {requirementGroups.length ? (
                  <div className="tiered-requirements">
                    {requirementGroups.map((group, groupIndex) => (
                      <section className={`requirement-tier tier-${group.id}`} key={group.id}>
                        <header className="tier-header">
                          <div>
                            <span>{String(groupIndex + 1).padStart(2, "0")} · {group.level}</span>
                            <h3>{group.level}—{group.source}</h3>
                          </div>
                          <b>{group.sourceType}</b>
                        </header>
                        <div className="tier-origin">
                          <strong>管控原由</strong>
                          <p>{group.origin}</p>
                        </div>
                        <div className="rule-list table-rule-list">
                          <table className="control-table tier-control-table">
                            <thead>
                              <tr><th>序号</th><th>管控事项</th><th>管控原由</th><th>控制内容</th></tr>
                            </thead>
                            <tbody>
                              {group.items.map((rule, index) => (
                                <tr key={rule.id} data-rule-origin="three-level-derived">
                                  <td>{String(index + 1).padStart(2, "0")}</td>
                                  <td><strong>{rule.element}</strong><small>{group.level}</small></td>
                                  <td>
                                    <span className={`requirement-status status-${rule.applicability}`}>{rule.applicability}</span>
                                    <p>{rule.reason}</p>
                                    <small>触发：{rule.trigger}</small>
                                  </td>
                                  <td><p>{rule.content}</p></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="unavailable-detail">
                    <span>本轮仅作空间展示</span>
                    <h3>暂未录入详细城市设计内容</h3>
                    <p>
                      当前一张图以DB-CBG-20单元及其内部地块作为三级管控示例，
                      该对象保留轮廓、编号和基本信息，不展示具体管控要求。
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection">
              <div className="selection-mark">⌖</div>
              <h3>{mode === "unit" ? "点击地图中的单元" : "点击地图中的地块"}</h3>
              <p>{mode === "unit" ? "DB-CBG-20显示片区、单元、板块三级要求，其余单元仅展示基本信息。" : "20单元内地块按用地和空间命中关系显示三级传导要求，其余地块仅展示基本信息。"}</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

type UnitId = "north" | "east" | "south" | "west" | "core";
type FeatureId = "urban-core" | "axis" | "corridor" | "nodes" | "control";
type Level = "region" | "unit" | "parcel";

type Parcel = {
  id: string;
  ix: number;
  iy: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  unit: UnitId;
};

const GRID = 25;
const CELL = 4;

const unitMeta: Record<
  UnitId,
  { name: string; short: string; color: string; polygon: string }
> = {
  north: {
    name: "北部门户单元",
    short: "N",
    color: "#466d75",
    polygon: "0,0 100,0 72,28 28,28",
  },
  east: {
    name: "东部活力单元",
    short: "E",
    color: "#a36a3d",
    polygon: "100,0 100,100 72,72 72,28",
  },
  south: {
    name: "南部生态单元",
    short: "S",
    color: "#567b52",
    polygon: "0,100 100,100 72,72 28,72",
  },
  west: {
    name: "西部更新单元",
    short: "W",
    color: "#77657f",
    polygon: "0,0 28,28 28,72 0,100",
  },
  core: {
    name: "中央核心单元",
    short: "C",
    color: "#c74f3a",
    polygon: "28,28 72,28 72,72 28,72",
  },
};

const featureMeta: Record<
  FeatureId,
  {
    name: string;
    eyebrow: string;
    geometry: string;
    color: string;
    rule: string;
    result: string;
  }
> = {
  "urban-core": {
    name: "片区城市核心",
    eyebrow: "面对象 · UD-R-CORE-01",
    geometry: "面",
    color: "#d8573d",
    rule: "核心范围与单元叠加，完整继承至中央核心单元。",
    result: "生成核心功能、高度体量、首层开放与公共空间要求。",
  },
  axis: {
    name: "东西发展轴",
    eyebrow: "线 + 影响面 · UD-R-AXIS-01",
    geometry: "线+面",
    color: "#e6a344",
    rule: "跨单元轴线按单元边界分割，保留统一来源编号和连续接口。",
    result: "生成建筑控制线、连续界面、高度节奏与慢行接口要求。",
  },
  corridor: {
    name: "南北生态廊道",
    eyebrow: "线 + 控制面 · UD-R-COR-01",
    geometry: "线+面",
    color: "#4d9671",
    rule: "廊道中心线及控制范围共同传导，跨界处记录接口。",
    result: "生成生态退让、连续绿化、公共可达与建设限制要求。",
  },
  nodes: {
    name: "公共空间节点",
    eyebrow: "点 + 服务范围 · UD-R-NODE-01",
    geometry: "点+面",
    color: "#5f7db4",
    rule: "节点按服务范围落入单元，并关联范围内地块。",
    result: "生成公共空间、首层开放、出入口和慢行连接要求。",
  },
  control: {
    name: "重点控制区",
    eyebrow: "面对象 · UD-R-ZONE-01",
    geometry: "面",
    color: "#9a5c8e",
    rule: "核心单元被确定为一级重点控制区，类型保持唯一。",
    result: "地块加载核心区强化规则包，并进入重点审查队列。",
  },
};

const featureOrder: FeatureId[] = [
  "urban-core",
  "axis",
  "corridor",
  "nodes",
  "control",
];

function assignUnit(ix: number, iy: number): UnitId {
  if (ix >= 7 && ix <= 17 && iy >= 7 && iy <= 17) return "core";
  const dx = ix - 12;
  const dy = iy - 12;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
}

function matchesFeature(parcel: Parcel, feature: FeatureId) {
  const { cx, cy, unit } = parcel;
  if (feature === "urban-core") {
    return unit === "core" && Math.hypot(cx - 50, cy - 50) < 20;
  }
  if (feature === "axis") return Math.abs(cy - 50) < 6;
  if (feature === "corridor") {
    return Math.abs(cx - (29 + cy * 0.16)) < 5;
  }
  if (feature === "nodes") {
    return [
      [50, 50],
      [50, 20],
      [80, 50],
      [50, 80],
      [20, 50],
    ].some(([x, y]) => Math.hypot(cx - x, cy - y) < 7);
  }
  return unit === "core";
}

function formatCount(count: number) {
  return count.toLocaleString("zh-CN");
}

export default function Home() {
  const parcels = useMemo<Parcel[]>(() => {
    return Array.from({ length: GRID * GRID }, (_, index) => {
      const ix = index % GRID;
      const iy = Math.floor(index / GRID);
      const unit = assignUnit(ix, iy);
      return {
        id: `${unitMeta[unit].short}-${String(index + 1).padStart(3, "0")}`,
        ix,
        iy,
        x: ix * CELL,
        y: iy * CELL,
        cx: ix * CELL + CELL / 2,
        cy: iy * CELL + CELL / 2,
        unit,
      };
    });
  }, []);

  const [feature, setFeature] = useState<FeatureId>("axis");
  const [level, setLevel] = useState<Level>("parcel");
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitId | null>(null);

  const activeParcels = useMemo(
    () => parcels.filter((parcel) => matchesFeature(parcel, feature)),
    [parcels, feature],
  );
  const activeIds = useMemo(
    () => new Set(activeParcels.map((parcel) => parcel.id)),
    [activeParcels],
  );
  const affectedUnits = useMemo(
    () => Array.from(new Set(activeParcels.map((parcel) => parcel.unit))),
    [activeParcels],
  );
  const unitCounts = useMemo(() => {
    return Object.keys(unitMeta).reduce(
      (acc, key) => {
        const unit = key as UnitId;
        acc[unit] = parcels.filter((parcel) => parcel.unit === unit).length;
        return acc;
      },
      {} as Record<UnitId, number>,
    );
  }, [parcels]);

  const visibleFeaturesForParcel = selectedParcel
    ? featureOrder.filter((id) => matchesFeature(selectedParcel, id))
    : [];
  const meta = featureMeta[feature];
  const focusUnit = selectedParcel?.unit ?? selectedUnit;

  function chooseFeature(id: FeatureId) {
    setFeature(id);
    setSelectedParcel(null);
    setSelectedUnit(null);
  }

  function chooseUnit(id: UnitId) {
    setSelectedUnit(id);
    setSelectedParcel(null);
    setLevel("unit");
  }

  function chooseParcel(parcel: Parcel) {
    setSelectedParcel(parcel);
    setSelectedUnit(parcel.unit);
    setLevel("parcel");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">西安·城市设计</span>
          <span className="brand-divider" />
          <div>
            <h1>空间传导实验台</h1>
            <p>片区 → 单元 → 地块 · 假想城市 MVP</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="scenario-dot" />
          <span>场景 01 / 方城原型</span>
          <button
            className="reset-button"
            onClick={() => {
              setFeature("axis");
              setSelectedParcel(null);
              setSelectedUnit(null);
              setLevel("parcel");
            }}
          >
            重置视图
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <span>空间要素</span>
            <small>{featureOrder.length} 类</small>
          </div>
          <div className="feature-list">
            {featureOrder.map((id, index) => {
              const item = featureMeta[id];
              return (
                <button
                  key={id}
                  className={`feature-item ${feature === id ? "active" : ""}`}
                  onClick={() => chooseFeature(id)}
                >
                  <span
                    className="feature-swatch"
                    style={{ background: item.color }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.geometry}对象</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="unit-summary">
            <div className="panel-heading compact">
              <span>五个规划单元</span>
              <small>625 地块</small>
            </div>
            {(Object.keys(unitMeta) as UnitId[]).map((id) => (
              <button
                key={id}
                className={`unit-row ${focusUnit === id ? "active" : ""}`}
                onClick={() => chooseUnit(id)}
              >
                <span
                  className="unit-dot"
                  style={{ background: unitMeta[id].color }}
                />
                <span>{unitMeta[id].name}</span>
                <b>{unitCounts[id]}</b>
              </button>
            ))}
          </div>

          <div className="legend-note">
            <span className="pulse-ring" />
            <p>
              高亮地块表示当前城市设计要素传导后直接影响的空间对象。
            </p>
          </div>
        </aside>

        <section className="map-stage">
          <div className="map-toolbar">
            <div className="level-switch" aria-label="空间层级">
              {(
                [
                  ["region", "片区"],
                  ["unit", "单元"],
                  ["parcel", "地块"],
                ] as [Level, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={level === id ? "active" : ""}
                  onClick={() => setLevel(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="map-metrics">
              <span>
                影响单元 <b>{affectedUnits.length}</b>
              </span>
              <span>
                命中地块 <b>{formatCount(activeParcels.length)}</b>
              </span>
            </div>
          </div>

          <div className="map-wrap">
            <div className="map-caption">
              <span>方城规划片区</span>
              <small>1000 × 1000m · 演示坐标</small>
            </div>
            <svg
              className="city-map"
              viewBox="-4 -4 108 108"
              role="img"
              aria-label="包含五个单元和625个地块的方形假想城市"
            >
              <defs>
                <pattern
                  id="minorGrid"
                  width="4"
                  height="4"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 4 0 L 0 0 0 4"
                    fill="none"
                    stroke="#d8d8cf"
                    strokeWidth=".12"
                  />
                </pattern>
                <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodOpacity=".2" />
                </filter>
              </defs>

              <rect
                x="0"
                y="0"
                width="100"
                height="100"
                rx="1"
                className="city-base"
              />
              <rect
                x="0"
                y="0"
                width="100"
                height="100"
                fill="url(#minorGrid)"
              />

              {level !== "region" &&
                parcels.map((parcel) => {
                  const active = activeIds.has(parcel.id);
                  const selected = selectedParcel?.id === parcel.id;
                  const unitFocused = selectedUnit === parcel.unit;
                  return (
                    <rect
                      key={parcel.id}
                      x={parcel.x + 0.24}
                      y={parcel.y + 0.24}
                      width={CELL - 0.48}
                      height={CELL - 0.48}
                      className={[
                        "parcel",
                        active ? "affected" : "",
                        selected ? "selected" : "",
                        selectedUnit && !unitFocused ? "muted" : "",
                      ].join(" ")}
                      style={
                        active
                          ? {
                              fill: meta.color,
                              stroke: meta.color,
                            }
                          : undefined
                      }
                      onClick={() => chooseParcel(parcel)}
                    />
                  );
                })}

              {level !== "parcel" &&
                (Object.keys(unitMeta) as UnitId[]).map((id) => (
                  <polygon
                    key={id}
                    points={unitMeta[id].polygon}
                    className={`unit-fill ${
                      affectedUnits.includes(id) ? "affected" : ""
                    } ${focusUnit === id ? "selected" : ""}`}
                    style={{ fill: unitMeta[id].color }}
                    onClick={() => chooseUnit(id)}
                  />
                ))}

              <g className="urban-elements">
                <rect
                  x="32"
                  y="32"
                  width="36"
                  height="36"
                  rx="4"
                  className={`feature-zone ${
                    feature === "urban-core" ? "shown" : ""
                  }`}
                  style={{ stroke: featureMeta["urban-core"].color }}
                />
                <rect
                  x="28"
                  y="28"
                  width="44"
                  height="44"
                  rx="2"
                  className={`control-zone ${
                    feature === "control" ? "shown" : ""
                  }`}
                  style={{ stroke: featureMeta.control.color }}
                />
                <path
                  d="M 4 52 C 28 46, 62 56, 96 48"
                  className={`axis-impact ${feature === "axis" ? "shown" : ""}`}
                  style={{ stroke: featureMeta.axis.color }}
                />
                <path
                  d="M 4 52 C 28 46, 62 56, 96 48"
                  className={`axis-line ${feature === "axis" ? "shown" : ""}`}
                />
                <path
                  d="M 28 2 C 26 34, 36 62, 46 98"
                  className={`corridor-impact ${
                    feature === "corridor" ? "shown" : ""
                  }`}
                />
                <path
                  d="M 28 2 C 26 34, 36 62, 46 98"
                  className={`corridor-line ${
                    feature === "corridor" ? "shown" : ""
                  }`}
                />
                {[
                  [50, 50],
                  [50, 20],
                  [80, 50],
                  [50, 80],
                  [20, 50],
                ].map(([x, y], index) => (
                  <g
                    key={`${x}-${y}`}
                    className={`public-node ${
                      feature === "nodes" ? "shown" : ""
                    }`}
                  >
                    <circle cx={x} cy={y} r="5.5" className="node-range" />
                    <circle cx={x} cy={y} r="1.2" className="node-point" />
                    <text x={x + 2} y={y - 2}>
                      P{index + 1}
                    </text>
                  </g>
                ))}
              </g>

              {(Object.keys(unitMeta) as UnitId[]).map((id) => {
                const positions: Record<UnitId, [number, number]> = {
                  north: [50, 13],
                  east: [85, 50],
                  south: [50, 89],
                  west: [9, 50],
                  core: [50, 42],
                };
                const [x, y] = positions[id];
                return (
                  <g
                    key={`label-${id}`}
                    className={`unit-label ${
                      id === "core" ? "core-label" : ""
                    }`}
                    onClick={() => chooseUnit(id)}
                  >
                    <text x={x} y={y} textAnchor="middle">
                      {unitMeta[id].name}
                    </text>
                    <text x={x} y={y + 3.4} textAnchor="middle">
                      {unitCounts[id]} 地块
                    </text>
                  </g>
                );
              })}

              <rect
                x="0"
                y="0"
                width="100"
                height="100"
                rx="1"
                className="city-outline"
              />
            </svg>
            <div className="north-arrow" aria-hidden="true">
              <span>N</span>
              <i />
            </div>
            <div className="scale-bar">
              <span />
              <small>0</small>
              <small>500m</small>
              <small>1000m</small>
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="inspector-kicker">
            {selectedParcel
              ? "地块反向追溯"
              : selectedUnit
                ? "单元属性"
                : "当前传导对象"}
          </div>
          <h2>
            {selectedParcel
              ? `地块 ${selectedParcel.id}`
              : selectedUnit
                ? unitMeta[selectedUnit].name
                : meta.name}
          </h2>
          <p className="object-code">
            {selectedParcel
              ? `PARCEL-${selectedParcel.id}`
              : selectedUnit
                ? `UNIT-${unitMeta[selectedUnit].short}-01`
                : meta.eyebrow}
          </p>

          {selectedParcel ? (
            <>
              <div className="fact-grid">
                <div>
                  <span>所属单元</span>
                  <b>{unitMeta[selectedParcel.unit].name}</b>
                </div>
                <div>
                  <span>对象类型</span>
                  <b>地块面</b>
                </div>
                <div>
                  <span>命中要素</span>
                  <b>{visibleFeaturesForParcel.length} 项</b>
                </div>
                <div>
                  <span>数据状态</span>
                  <b>演示数据</b>
                </div>
              </div>
              <div className="section-title">适用城市设计要素</div>
              <div className="applied-rules">
                {visibleFeaturesForParcel.length ? (
                  visibleFeaturesForParcel.map((id) => (
                    <button key={id} onClick={() => chooseFeature(id)}>
                      <i style={{ background: featureMeta[id].color }} />
                      <span>{featureMeta[id].name}</span>
                      <b>查看</b>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">当前地块未命中示例要素。</p>
                )}
              </div>
            </>
          ) : selectedUnit ? (
            <>
              <div className="fact-grid">
                <div>
                  <span>单元编号</span>
                  <b>{unitMeta[selectedUnit].short}-01</b>
                </div>
                <div>
                  <span>地块数量</span>
                  <b>{unitCounts[selectedUnit]}</b>
                </div>
                <div>
                  <span>单元类型</span>
                  <b>{selectedUnit === "core" ? "核心单元" : "一般单元"}</b>
                </div>
                <div>
                  <span>当前命中</span>
                  <b>
                    {
                      activeParcels.filter(
                        (parcel) => parcel.unit === selectedUnit,
                      ).length
                    }{" "}
                    地块
                  </b>
                </div>
              </div>
              <div className="section-title">当前要素处置</div>
              <div className="rule-card">
                <span>传导判断</span>
                <p>
                  {affectedUnits.includes(selectedUnit)
                    ? `承接“${meta.name}”，形成单元级空间对象并向命中地块继续传导。`
                    : `当前要素未进入${unitMeta[selectedUnit].name}，记录为不适用。`}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="fact-grid">
                <div>
                  <span>几何表达</span>
                  <b>{meta.geometry}</b>
                </div>
                <div>
                  <span>影响单元</span>
                  <b>{affectedUnits.length} / 5</b>
                </div>
                <div>
                  <span>命中地块</span>
                  <b>{activeParcels.length}</b>
                </div>
                <div>
                  <span>控制性质</span>
                  <b>{feature === "control" ? "刚性" : "弹性"}</b>
                </div>
              </div>
              <div className="section-title">传导逻辑</div>
              <div className="rule-card">
                <span>空间处置</span>
                <p>{meta.rule}</p>
              </div>
              <div className="rule-card accent">
                <span>地块结果</span>
                <p>{meta.result}</p>
              </div>
            </>
          )}

          <div className="status-card">
            <div>
              <span className="status-icon">✓</span>
              <span>
                <b>关系链完整</b>
                <small>来源、承接对象和地块去向均可追溯</small>
              </span>
            </div>
            <span className="status-pill">通过</span>
          </div>
        </aside>
      </section>

      <section className="lineage-panel">
        <div className="lineage-title">
          <span>传导关系</span>
          <small>
            {selectedParcel
              ? "由地块向上追溯"
              : "由片区对象向下展开"}
          </small>
        </div>
        <div className="lineage-flow">
          <div className="lineage-column">
            <span className="level-tag">01 · 片区</span>
            <div className="lineage-card source">
              <i style={{ background: meta.color }} />
              <div>
                <small>来源对象</small>
                <b>{meta.name}</b>
                <span>{meta.eyebrow.split("·").at(-1)}</span>
              </div>
            </div>
          </div>
          <div className="flow-arrow">
            <span>{selectedParcel ? "追溯" : "分解 / 继承"}</span>
            <i>→</i>
          </div>
          <div className="lineage-column units">
            <span className="level-tag">02 · 单元</span>
            <div className="unit-chips">
              {(selectedParcel
                ? [selectedParcel.unit]
                : affectedUnits
              ).map((id) => (
                <button
                  key={id}
                  className={id === "core" ? "core" : ""}
                  onClick={() => chooseUnit(id)}
                >
                  <i style={{ background: unitMeta[id].color }} />
                  <span>{unitMeta[id].name}</span>
                  <b>
                    {activeParcels.filter((p) => p.unit === id).length}
                  </b>
                </button>
              ))}
            </div>
          </div>
          <div className="flow-arrow">
            <span>{selectedParcel ? "定位" : "规则转译"}</span>
            <i>→</i>
          </div>
          <div className="lineage-column">
            <span className="level-tag">03 · 地块</span>
            <div className="lineage-card target">
              <div>
                <small>{selectedParcel ? "当前地块" : "生成结果"}</small>
                <b>
                  {selectedParcel
                    ? selectedParcel.id
                    : `${activeParcels.length} 个地块要求`}
                </b>
                <span>
                  {selectedParcel
                    ? unitMeta[selectedParcel.unit].name
                    : "已建立来源与去向关系"}
                </span>
              </div>
              <strong>{selectedParcel ? "1" : activeParcels.length}</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

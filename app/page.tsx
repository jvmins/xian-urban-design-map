"use client";

import { useMemo, useState } from "react";

type UnitId = "north" | "east" | "south" | "west" | "core";
type FeatureId = "urban-core" | "axis" | "corridor" | "nodes" | "control";
type Level = "region" | "unit" | "parcel";

type Parcel = {
  id: string;
  index: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  unit: UnitId;
};

type FeatureDefinition = {
  category: string;
  color: string;
  region: {
    id: string;
    name: string;
    geometry: string;
    status: string;
    controlNature: string;
    unitDeepening: string;
  };
  unit: {
    code: string;
    name: string;
    mode: string;
    parcelDeepening: string;
    interfaceId?: string;
  };
  translation: {
    id: string;
    relation: string;
    trigger: string;
    targets: string[];
    expression: string;
    review: string;
  };
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

const featureMeta: Record<FeatureId, FeatureDefinition> = {
  "urban-core": {
    category: "特色空间结构",
    color: "#d8573d",
    region: {
      id: "R-CORE-01",
      name: "片区城市核心",
      geometry: "面",
      status: "审查确认",
      controlNature: "弹性",
      unitDeepening:
        "明确承接单元、功能关系、公共空间组织及需在单元量化的高度体量事项。",
    },
    unit: {
      code: "CORE",
      name: "单元核心",
      mode: "深化细化",
      parcelDeepening:
        "向地块传导功能组织、公共空间、高度体量、慢行联系和标志节点。",
    },
    translation: {
      id: "TR-CORE-01",
      relation: "地块中心点位于单元核心范围",
      trigger: "空间叠加 = 包含",
      targets: ["功能组织", "公共空间", "高度体量", "慢行联系"],
      expression: "地块要求表 + 附加图则控制面",
      review: "核对地块功能、公共空间和高度体量是否承接单元核心要求。",
    },
  },
  axis: {
    category: "特色空间结构",
    color: "#e19a38",
    region: {
      id: "R-AXIS-01",
      name: "片区东西发展轴",
      geometry: "中心线 + 影响范围",
      status: "审查确认",
      controlNature: "弹性",
      unitDeepening:
        "按单元形成独立轴线对象，明确起讫节点、连续界面、影响范围及跨单元接口。",
    },
    unit: {
      code: "AXIS",
      name: "单元轴线及影响范围",
      mode: "分割继承",
      interfaceId: "IF-EW-AXIS-01",
      parcelDeepening:
        "向地块传导建筑控制线、沿街界面、高度节奏、高点、开放空间和慢行接口。",
    },
    translation: {
      id: "TR-AXIS-01",
      relation: "地块与单元轴线影响范围相交",
      trigger: "相交面积 > 0",
      targets: ["建筑控制线", "连续界面", "高度节奏", "慢行接口"],
      expression: "地块要求表 + CAD线实体",
      review: "核对控制线、连续界面及相邻地块接口是否在图则中完整表达。",
    },
  },
  corridor: {
    category: "开放空间体系",
    color: "#4d9671",
    region: {
      id: "R-COR-01",
      name: "片区南北生态廊道",
      geometry: "中心线 + 控制范围",
      status: "审查确认",
      controlNature: "刚性",
      unitDeepening:
        "分单元落实廊道边界、有效宽度、连续性、断点与跨单元接口。",
    },
    unit: {
      code: "COR",
      name: "单元生态廊道",
      mode: "分割继承",
      interfaceId: "IF-NS-COR-01",
      parcelDeepening:
        "向地块传导生态缓冲、建设限制、蓝绿连续、公共可达和接口控制。",
    },
    translation: {
      id: "TR-COR-01",
      relation: "地块与单元生态廊道控制范围相交",
      trigger: "相交面积 > 0",
      targets: ["生态连续空间", "建设退让", "城市绿道", "公共出入口"],
      expression: "地块要求表 + 控制面/中心线",
      review: "检查退让边界、廊道有效宽度和跨地块接口是否连续。",
    },
  },
  nodes: {
    category: "开放空间体系",
    color: "#5f7db4",
    region: {
      id: "R-NODE-SYS-01",
      name: "片区公共空间节点体系",
      geometry: "节点 + 服务范围",
      status: "审查确认",
      controlNature: "引导",
      unitDeepening:
        "节点按所在单元深化位置、范围、功能、服务对象及与轴线和廊道的关系。",
    },
    unit: {
      code: "NODE",
      name: "单元公共空间节点",
      mode: "深化细化",
      parcelDeepening:
        "向地块传导节点位置、边界、面积、功能、可达性、首层开放和连接通道。",
    },
    translation: {
      id: "TR-NODE-01",
      relation: "地块与单元节点服务范围相交",
      trigger: "相交或邻接",
      targets: ["公共空间节点", "首层开放空间", "出入口", "慢行联系"],
      expression: "地块要求表 + 点/面成组实体",
      review: "核对节点点位是否位于范围内，出入口与慢行联系是否连续。",
    },
  },
  control: {
    category: "城市设计控制区",
    color: "#9a5c8e",
    region: {
      id: "R-ZONE-CAND-01",
      name: "片区重点控制区候选范围",
      geometry: "候选面",
      status: "研究成果库",
      controlNature: "研究建议",
      unitDeepening:
        "片区仅提出候选范围、建议级别、唯一重点类型和核心问题；不得直接作为现行管控数据。",
    },
    unit: {
      code: "ZONE",
      name: "单元一级重点控制区",
      mode: "确认转化",
      parcelDeepening:
        "由单元确认边界、一级控制级别和唯一重点类型，再形成分地块任务。",
    },
    translation: {
      id: "TR-ZONE-01",
      relation: "地块位于单元重点控制区",
      trigger: "控制分区 = 重点控制区",
      targets: ["重要发展区强化规则包", "重点控制附加图则", "重点审查任务"],
      expression: "控制区属性 + 强化要求 + 附加图则",
      review: "核对控制级别和重点类型唯一性，不得叠加多个重点类型。",
    },
  },
};

const featureOrder: FeatureId[] = [
  "urban-core",
  "axis",
  "corridor",
  "nodes",
  "control",
];

const stageMeta: Record<
  Level,
  { number: string; name: string; database: string; explanation: string }
> = {
  region: {
    number: "01",
    name: "片区空间对象",
    database: "片区城市设计.gdb",
    explanation: "形成完整对象与分单元深化任务，不直接生成地块要求。",
  },
  unit: {
    number: "02",
    name: "单元空间对象",
    database: "单元城市设计.gdb",
    explanation: "逐单元建立新对象，填写来源片区对象编号和传导方式。",
  },
  parcel: {
    number: "03",
    name: "地块管控要求",
    database: "地块城市设计.gdb",
    explanation: "先判定适用性，再通过转译规则生成地块要求和图则对象。",
  },
};

function assignUnit(ix: number, iy: number): UnitId {
  if (ix >= 7 && ix <= 17 && iy >= 7 && iy <= 17) return "core";
  const dx = ix - 12;
  const dy = iy - 12;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
}

function appliesToParcel(parcel: Parcel, feature: FeatureId) {
  const { cx, cy, unit } = parcel;
  if (feature === "urban-core") {
    return unit === "core" && Math.hypot(cx - 50, cy - 50) < 20;
  }
  if (feature === "axis") return Math.abs(cy - (50 + (cx - 50) * -0.06)) < 6;
  if (feature === "corridor") {
    return Math.abs(cx - (28 + cy * 0.18)) < 5;
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

function unitObjectId(feature: FeatureId, unit: UnitId) {
  return `U-${unitMeta[unit].short}-${featureMeta[feature].unit.code}-01`;
}

function requirementId(feature: FeatureId, parcel: Parcel) {
  return `REQ-${featureMeta[feature].unit.code}-${parcel.id}`;
}

function FeatureGeometry({
  feature,
  mode,
}: {
  feature: FeatureId;
  mode: "region" | "unit-context" | "parcel-context";
}) {
  const color = featureMeta[feature].color;
  const modeClass = `geometry-${mode}`;

  if (feature === "urban-core") {
    return (
      <rect
        x="32"
        y="32"
        width="36"
        height="36"
        rx="4"
        className={`data-geometry core-geometry ${modeClass}`}
        style={{ stroke: color }}
      />
    );
  }

  if (feature === "axis") {
    return (
      <>
        <path
          d="M 4 52 C 28 46, 62 56, 96 48"
          className={`data-geometry geometry-range axis-range ${modeClass}`}
          style={{ stroke: color }}
        />
        <path
          d="M 4 52 C 28 46, 62 56, 96 48"
          className={`data-geometry geometry-line ${modeClass}`}
          style={{ stroke: color }}
        />
      </>
    );
  }

  if (feature === "corridor") {
    return (
      <>
        <path
          d="M 28 2 C 27 34, 36 64, 46 98"
          className={`data-geometry geometry-range corridor-range ${modeClass}`}
          style={{ stroke: color }}
        />
        <path
          d="M 28 2 C 27 34, 36 64, 46 98"
          className={`data-geometry geometry-line ${modeClass}`}
          style={{ stroke: color }}
        />
      </>
    );
  }

  if (feature === "nodes") {
    return (
      <>
        {[
          [50, 50],
          [50, 20],
          [80, 50],
          [50, 80],
          [20, 50],
        ].map(([x, y], index) => (
          <g key={`${x}-${y}`} className={`node-object ${modeClass}`}>
            <circle
              cx={x}
              cy={y}
              r="5.5"
              className="node-service-range"
              style={{ stroke: color }}
            />
            <circle
              cx={x}
              cy={y}
              r="1.25"
              className="node-location"
              style={{ fill: color }}
            />
            <text x={x + 2} y={y - 2}>
              N{index + 1}
            </text>
          </g>
        ))}
      </>
    );
  }

  return (
    <rect
      x="28"
      y="28"
      width="44"
      height="44"
      rx="2"
      className={`data-geometry control-candidate ${modeClass}`}
      style={{ stroke: color }}
    />
  );
}

export default function Home() {
  const parcels = useMemo<Parcel[]>(() => {
    return Array.from({ length: GRID * GRID }, (_, index) => {
      const ix = index % GRID;
      const iy = Math.floor(index / GRID);
      const unit = assignUnit(ix, iy);
      return {
        id: `${unitMeta[unit].short}-${String(index + 1).padStart(3, "0")}`,
        index,
        x: ix * CELL,
        y: iy * CELL,
        cx: ix * CELL + CELL / 2,
        cy: iy * CELL + CELL / 2,
        unit,
      };
    });
  }, []);

  const [feature, setFeature] = useState<FeatureId>("axis");
  const [level, setLevel] = useState<Level>("region");
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitId | null>(null);

  const applicableParcels = useMemo(
    () => parcels.filter((parcel) => appliesToParcel(parcel, feature)),
    [parcels, feature],
  );
  const applicableIds = useMemo(
    () => new Set(applicableParcels.map((parcel) => parcel.id)),
    [applicableParcels],
  );
  const affectedUnits = useMemo(
    () =>
      (Object.keys(unitMeta) as UnitId[]).filter((unit) =>
        applicableParcels.some((parcel) => parcel.unit === unit),
      ),
    [applicableParcels],
  );
  const unitCounts = useMemo(() => {
    return (Object.keys(unitMeta) as UnitId[]).reduce(
      (acc, unit) => {
        acc[unit] = parcels.filter((parcel) => parcel.unit === unit).length;
        return acc;
      },
      {} as Record<UnitId, number>,
    );
  }, [parcels]);
  const visibleFeaturesForParcel = selectedParcel
    ? featureOrder.filter((id) => appliesToParcel(selectedParcel, id))
    : [];
  const meta = featureMeta[feature];
  const stage = stageMeta[level];
  const currentUnit =
    selectedParcel?.unit ??
    selectedUnit ??
    (affectedUnits.length === 1 ? affectedUnits[0] : null);
  const currentUnitAffected =
    currentUnit !== null && affectedUnits.includes(currentUnit);

  function chooseFeature(id: FeatureId) {
    setFeature(id);
    setSelectedParcel(null);
    setSelectedUnit(null);
    setLevel("region");
  }

  function chooseLevel(next: Level) {
    setLevel(next);
    if (next !== "parcel") setSelectedParcel(null);
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

  const stageCount =
    level === "region"
      ? 1
      : level === "unit"
        ? affectedUnits.length
        : applicableParcels.length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">西安·城市设计</span>
          <span className="brand-divider" />
          <div>
            <h1>空间对象逐级传导实验台</h1>
            <p>片区对象 → 单元对象 → 适用性判定 → 地块管控要求</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="scenario-dot" />
          <span>数据模型 v0.2</span>
          <span className="no-skip-badge">禁止跨级传导</span>
          <button
            className="reset-button"
            onClick={() => {
              setFeature("axis");
              setLevel("region");
              setSelectedParcel(null);
              setSelectedUnit(null);
            }}
          >
            重置
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <span>片区成果对象</span>
            <small>示例 5 项</small>
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
                    <em>{item.category}</em>
                    <strong>{item.region.name}</strong>
                    <small>{item.region.geometry}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="stage-rail">
            <div className="panel-heading compact">
              <span>数据传导阶段</span>
              <small>不可跳级</small>
            </div>
            {(Object.keys(stageMeta) as Level[]).map((id, index) => (
              <button
                key={id}
                className={`stage-rail-item ${level === id ? "active" : ""}`}
                onClick={() => chooseLevel(id)}
              >
                <b>{stageMeta[id].number}</b>
                <span>
                  <strong>{stageMeta[id].name}</strong>
                  <small>{stageMeta[id].database}</small>
                </span>
                {index < 2 && <i>↓</i>}
              </button>
            ))}
          </div>

          <div className="legend-note">
            <span className="pulse-ring" />
            <p>
              同一种颜色不代表同一个对象。每一级都生成独立编号，并在下位对象中记录直接来源。
            </p>
          </div>
        </aside>

        <section className="map-stage">
          <div className="map-toolbar">
            <div className="level-switch" aria-label="空间数据层级">
              {(Object.keys(stageMeta) as Level[]).map((id) => (
                <button
                  key={id}
                  className={level === id ? "active" : ""}
                  onClick={() => chooseLevel(id)}
                >
                  {stageMeta[id].number} {id === "parcel" ? "地块" : id === "unit" ? "单元" : "片区"}
                </button>
              ))}
            </div>
            <div className="map-stage-title">
              <span>{stage.name}</span>
              <small>{stage.explanation}</small>
            </div>
            <div className="map-metrics">
              <span>
                本级记录 <b>{stageCount}</b>
              </span>
              <span>
                下位去向 <b>{level === "parcel" ? "图则" : level === "unit" ? applicableParcels.length : affectedUnits.length}</b>
              </span>
            </div>
          </div>

          <div className="map-wrap">
            <div className="map-caption">
              <span>{stage.database}</span>
              <small>
                {meta.region.id} · {meta.region.name}
              </small>
            </div>
            <svg
              className="city-map"
              viewBox="-4 -4 108 108"
              role="img"
              aria-label="片区、单元和地块三级空间对象逐级传导示意图"
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
                <pattern
                  id="requirementHatch"
                  width="1.5"
                  height="1.5"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1.5"
                    stroke={meta.color}
                    strokeWidth=".35"
                  />
                </pattern>
                {(Object.keys(unitMeta) as UnitId[]).map((id) => (
                  <clipPath key={id} id={`clip-${id}`}>
                    <polygon points={unitMeta[id].polygon} />
                  </clipPath>
                ))}
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

              {level === "parcel" &&
                parcels.map((parcel) => {
                  const applicable = applicableIds.has(parcel.id);
                  const selected = selectedParcel?.id === parcel.id;
                  return (
                    <rect
                      key={parcel.id}
                      x={parcel.x + 0.24}
                      y={parcel.y + 0.24}
                      width={CELL - 0.48}
                      height={CELL - 0.48}
                      className={[
                        "parcel",
                        applicable ? "applicable" : "",
                        selected ? "selected" : "",
                      ].join(" ")}
                      style={
                        applicable
                          ? {
                              fill: "url(#requirementHatch)",
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
                    className={[
                      "unit-fill",
                      level === "region" ? "context" : "",
                      affectedUnits.includes(id) ? "affected" : "",
                      selectedUnit === id ? "selected" : "",
                    ].join(" ")}
                    style={{ fill: unitMeta[id].color }}
                    onClick={() => chooseUnit(id)}
                  />
                ))}

              {level === "region" && (
                <g className="region-object">
                  <FeatureGeometry feature={feature} mode="region" />
                </g>
              )}

              {level === "unit" && (
                <g className="unit-objects">
                  {affectedUnits.map((unit) => (
                    <g key={unit} clipPath={`url(#clip-${unit})`}>
                      <FeatureGeometry feature={feature} mode="unit-context" />
                    </g>
                  ))}
                  {(feature === "axis" || feature === "corridor") && (
                    <g className="interface-markers">
                      {(feature === "axis"
                        ? [
                            [28, 49.2],
                            [72, 52.3],
                          ]
                        : [
                            [32, 28],
                            [41, 72],
                          ]
                      ).map(([x, y], index) => (
                        <g key={`${x}-${y}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="1.4"
                            style={{ fill: meta.color }}
                          />
                          <text x={x + 2} y={y - 1}>
                            IF-{index + 1}
                          </text>
                        </g>
                      ))}
                    </g>
                  )}
                </g>
              )}

              {level === "parcel" && (
                <g className="parcel-source-context">
                  {affectedUnits.map((unit) => (
                    <g key={unit} clipPath={`url(#clip-${unit})`}>
                      <FeatureGeometry feature={feature} mode="parcel-context" />
                    </g>
                  ))}
                </g>
              )}

              {(Object.keys(unitMeta) as UnitId[]).map((id) => {
                const positions: Record<UnitId, [number, number]> = {
                  north: [50, 13],
                  east: [85, 50],
                  south: [50, 89],
                  west: [9, 50],
                  core: [50, 42],
                };
                const [x, y] = positions[id];
                const isAffected = affectedUnits.includes(id);
                return (
                  <g
                    key={`label-${id}`}
                    className={`unit-label ${id === "core" ? "core-label" : ""}`}
                    onClick={() => chooseUnit(id)}
                  >
                    <text x={x} y={y} textAnchor="middle">
                      {level === "unit" && isAffected
                        ? unitObjectId(feature, id)
                        : unitMeta[id].name}
                    </text>
                    <text x={x} y={y + 3.4} textAnchor="middle">
                      {level === "unit" && isAffected
                        ? `来源 ${meta.region.id}`
                        : `${unitCounts[id]} 地块`}
                    </text>
                  </g>
                );
              })}

              {level === "parcel" && (
                <g className="parcel-level-note">
                  <rect x="2" y="2" width="31" height="8" rx="1" />
                  <text x="4" y="5.4">
                    斜线 = 规则适用地块
                  </text>
                  <text x="4" y="8.3">
                    高亮不是复制单元对象
                  </text>
                </g>
              )}

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
              ? "地块关系记录"
              : currentUnit && level === "unit"
                ? "单元对象属性"
                : level === "parcel"
                  ? "转译规则"
                  : level === "unit"
                    ? "单元成果对象"
                    : "片区对象属性"}
          </div>

          {selectedParcel ? (
            <>
              <h2>地块 {selectedParcel.id}</h2>
              <p className="object-code">{requirementId(feature, selectedParcel)}</p>
              <div className="fact-grid">
                <div>
                  <span>来源单元对象编号</span>
                  <b>{unitObjectId(feature, selectedParcel.unit)}</b>
                </div>
                <div>
                  <span>转译规则</span>
                  <b>{meta.translation.id}</b>
                </div>
                <div>
                  <span>适用性判定</span>
                  <b>
                    {appliesToParcel(selectedParcel, feature)
                      ? "适用"
                      : "不适用"}
                  </b>
                </div>
                <div>
                  <span>控制分区</span>
                  <b>
                    {selectedParcel.unit === "core"
                      ? "重点控制区"
                      : "一般控制区"}
                  </b>
                </div>
              </div>
              <div className="section-title">逐级来源</div>
              <div className="source-stack">
                <div>
                  <span>片区</span>
                  <b>{meta.region.id}</b>
                  <small>{meta.region.name}</small>
                </div>
                <i>↓</i>
                <div>
                  <span>单元</span>
                  <b>{unitObjectId(feature, selectedParcel.unit)}</b>
                  <small>{meta.unit.mode}</small>
                </div>
                <i>↓</i>
                <div>
                  <span>地块要求</span>
                  <b>{requirementId(feature, selectedParcel)}</b>
                  <small>{meta.translation.expression}</small>
                </div>
              </div>
              <div className="section-title">生成的管控目标</div>
              <div className="target-tags">
                {meta.translation.targets.map((target) => (
                  <span key={target}>{target}</span>
                ))}
              </div>
              <div className="rule-card accent">
                <span>审查方法</span>
                <p>{meta.translation.review}</p>
              </div>
            </>
          ) : currentUnit && level === "unit" ? (
            <>
              <h2>{meta.unit.name}</h2>
              <p className="object-code">
                {currentUnitAffected
                  ? unitObjectId(feature, currentUnit)
                  : "本单元不适用"}
              </p>
              <div className="fact-grid">
                <div>
                  <span>单元编号</span>
                  <b>UNIT-{unitMeta[currentUnit].short}-01</b>
                </div>
                <div>
                  <span>来源片区对象编号</span>
                  <b>{currentUnitAffected ? meta.region.id : "—"}</b>
                </div>
                <div>
                  <span>传导方式</span>
                  <b>{currentUnitAffected ? meta.unit.mode : "不适用"}</b>
                </div>
                <div>
                  <span>接口编号</span>
                  <b>
                    {currentUnitAffected
                      ? meta.unit.interfaceId ?? "无跨界接口"
                      : "—"}
                  </b>
                </div>
              </div>
              <div className="section-title">地块深化要求</div>
              <div className="rule-card accent">
                <span>下位去向</span>
                <p>
                  {currentUnitAffected
                    ? meta.unit.parcelDeepening
                    : `该片区对象未传导至${unitMeta[currentUnit].name}，记录处置结果为“不适用”。`}
                </p>
              </div>
              {feature === "control" && currentUnit === "core" && (
                <div className="state-change">
                  <span>研究状态</span>
                  <i>→</i>
                  <span>单元确认</span>
                  <i>→</i>
                  <b>现行管控</b>
                </div>
              )}
            </>
          ) : level === "region" ? (
            <>
              <h2>{meta.region.name}</h2>
              <p className="object-code">{meta.region.id}</p>
              <div className="fact-grid">
                <div>
                  <span>几何表达</span>
                  <b>{meta.region.geometry}</b>
                </div>
                <div>
                  <span>数据状态</span>
                  <b>{meta.region.status}</b>
                </div>
                <div>
                  <span>控制性质</span>
                  <b>{meta.region.controlNature}</b>
                </div>
                <div>
                  <span>目标单元</span>
                  <b>{affectedUnits.length} / 5</b>
                </div>
              </div>
              <div className="section-title">单元深化要求</div>
              <div className="rule-card">
                <span>片区向下传导清单</span>
                <p>{meta.region.unitDeepening}</p>
              </div>
              <div className="record-list">
                {affectedUnits.map((unit) => (
                  <button key={unit} onClick={() => chooseUnit(unit)}>
                    <i style={{ background: unitMeta[unit].color }} />
                    <span>
                      <b>{unitMeta[unit].name}</b>
                      <small>{meta.unit.mode}</small>
                    </span>
                    <strong>生成对象</strong>
                  </button>
                ))}
              </div>
              {feature === "control" && (
                <div className="warning-card">
                  片区候选范围仅进入研究成果库；必须经单元确认后才能进入现行管控。
                </div>
              )}
            </>
          ) : level === "unit" ? (
            <>
              <h2>{affectedUnits.length} 个单元对象</h2>
              <p className="object-code">
                每个对象均填写来源 {meta.region.id}
              </p>
              <div className="record-list large">
                {affectedUnits.map((unit) => (
                  <button key={unit} onClick={() => chooseUnit(unit)}>
                    <i style={{ background: unitMeta[unit].color }} />
                    <span>
                      <b>{unitObjectId(feature, unit)}</b>
                      <small>
                        {unitMeta[unit].name} · {meta.unit.mode}
                      </small>
                    </span>
                    <strong>
                      {
                        applicableParcels.filter(
                          (parcel) => parcel.unit === unit,
                        ).length
                      }{" "}
                      地块
                    </strong>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2>地块适用性与规则转译</h2>
              <p className="object-code">{meta.translation.id}</p>
              <div className="translation-steps">
                {[
                  "空间叠加",
                  "规则触发",
                  "要求生成",
                  "同类合并",
                  "冲突复核",
                  "图则关联",
                ].map((text, index) => (
                  <span key={text}>
                    <b>{index + 1}</b>
                    {text}
                  </span>
                ))}
              </div>
              <div className="section-title">规则定义</div>
              <div className="rule-card">
                <span>空间关系</span>
                <p>{meta.translation.relation}</p>
              </div>
              <div className="rule-card">
                <span>触发条件</span>
                <p>{meta.translation.trigger}</p>
              </div>
              <div className="rule-card accent">
                <span>成果表达</span>
                <p>{meta.translation.expression}</p>
              </div>
              <div className="status-card">
                <div>
                  <span className="status-icon">✓</span>
                  <span>
                    <b>{applicableParcels.length} 条适用性记录</b>
                    <small>每条均关联单元对象、规则、地块和地块要求</small>
                  </span>
                </div>
                <span className="status-pill">可追溯</span>
              </div>
            </>
          )}

          {selectedParcel && visibleFeaturesForParcel.length > 1 && (
            <>
              <div className="section-title">该地块的其他来源</div>
              <div className="applied-rules">
                {visibleFeaturesForParcel
                  .filter((id) => id !== feature)
                  .map((id) => (
                    <button key={id} onClick={() => chooseFeature(id)}>
                      <i style={{ background: featureMeta[id].color }} />
                      <span>{featureMeta[id].region.name}</span>
                      <b>追溯</b>
                    </button>
                  ))}
              </div>
            </>
          )}
        </aside>
      </section>

      <section className="lineage-panel">
        <div className="lineage-title">
          <span>逐级数据链</span>
          <small>下位记录只保存直接上一级对象编号，不跨层混存。</small>
        </div>
        <div className="lineage-flow four-stage">
          <button
            className={`lineage-step ${level === "region" ? "active" : ""}`}
            onClick={() => chooseLevel("region")}
          >
            <span>01 · 片区空间对象</span>
            <i style={{ background: meta.color }} />
            <div>
              <b>{meta.region.id}</b>
              <small>{meta.region.name}</small>
            </div>
            <em>{meta.region.status}</em>
          </button>
          <div className="flow-arrow compact-arrow">
            <span>{meta.unit.mode}</span>
            <i>→</i>
          </div>
          <button
            className={`lineage-step ${level === "unit" ? "active" : ""}`}
            onClick={() => chooseLevel("unit")}
          >
            <span>02 · 单元空间对象</span>
            <i style={{ background: meta.color }} />
            <div>
              <b>{affectedUnits.length} 条独立对象记录</b>
              <small>来源片区对象编号 = {meta.region.id}</small>
            </div>
            <em>{meta.unit.name}</em>
          </button>
          <div className="flow-arrow compact-arrow">
            <span>适用性判定</span>
            <i>→</i>
          </div>
          <button
            className={`lineage-step rule-step ${level === "parcel" ? "active" : ""}`}
            onClick={() => chooseLevel("parcel")}
          >
            <span>03 · 转译规则</span>
            <i style={{ background: "#344b47" }} />
            <div>
              <b>{meta.translation.id}</b>
              <small>{meta.translation.trigger}</small>
            </div>
            <em>不可直接复制</em>
          </button>
          <div className="flow-arrow compact-arrow">
            <span>要求生成</span>
            <i>→</i>
          </div>
          <button
            className={`lineage-step result-step ${level === "parcel" ? "active" : ""}`}
            onClick={() => chooseLevel("parcel")}
          >
            <span>04 · 地块管控要求</span>
            <i style={{ background: meta.color }} />
            <div>
              <b>{applicableParcels.length} 条地块关系</b>
              <small>{meta.translation.targets.join(" / ")}</small>
            </div>
            <em>关联图则实体</em>
          </button>
        </div>
      </section>
    </main>
  );
}

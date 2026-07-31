"use client";

import { useMemo, useState } from "react";
import {
  type CatalogItem,
  type CatalogLevel,
  elementCatalog,
  generalControlStrategies,
  keyControlStrategies,
  transmissionStrategies,
} from "./catalog-data";
import {
  type Parcel,
  type RoadClass,
  generateParcels,
  getChainProfile,
  levelPrinciples,
  profileKeyFor,
  reviewChecklist,
  roads,
  unitById,
  units,
} from "./urban-model";
import {
  buildControlRows,
  geometrySymbol,
  type ControlRow,
  type SpatialSelection,
} from "./control-matrix";

const levelOrder: CatalogLevel[] = ["region", "unit", "parcel"];

const levelMeta: Record<
  CatalogLevel,
  { name: string; count: number; database: string; scale: string }
> = {
  region: {
    name: "片区",
    count: 20,
    database: "片区城市设计.gdb",
    scale: "跨单元总体控制",
  },
  unit: {
    name: "单元",
    count: 21,
    database: "单元城市设计.gdb",
    scale: "六类11项空间系统",
  },
  parcel: {
    name: "地块",
    count: 29,
    database: "地块城市设计.gdb",
    scale: "附加图则与审查对象",
  },
};

const landUseColors: Record<Parcel["landUse"], string> = {
  居住: "#e8dfcf",
  商办: "#d8c7b8",
  公共服务: "#c9d8d5",
  产业研发: "#d5d4c3",
  绿地: "#c9dac4",
};

const roadWidths: Record<RoadClass, { casing: number; fill: number }> = {
  快速路: { casing: 2.9, fill: 2.1 },
  主干路: { casing: 2.25, fill: 1.62 },
  次干路: { casing: 1.45, fill: 1.02 },
  支路: { casing: 0.72, fill: 0.46 },
};

function groupColor(group: string) {
  const palette = [
    "#bd553f",
    "#3f7480",
    "#548164",
    "#9b7040",
    "#786887",
    "#4f6d98",
    "#8d705b",
    "#607a73",
  ];
  let value = 0;
  for (let index = 0; index < group.length; index += 1) {
    value = (value + group.charCodeAt(index) * (index + 3)) % 997;
  }
  return palette[value % palette.length];
}

function isAffectedParcel(parcel: Parcel, item: CatalogItem) {
  const key = profileKeyFor(item);
  if (key === "boundary") return true;
  if (key === "core") {
    return parcel.unit === "core" && Math.hypot(parcel.cx - 60, parcel.cy - 60) < 21;
  }
  if (key === "axis") {
    return Math.abs(parcel.cy - 60) < 6.5 || Math.abs(parcel.cx - 60) < 4.2;
  }
  if (key === "center") {
    return [
      [60, 60],
      [60, 20],
      [100, 60],
      [60, 100],
      [20, 60],
    ].some(([x, y]) => Math.hypot(parcel.cx - x, parcel.cy - y) < 8);
  }
  if (key === "wedge") {
    return parcel.cy > 76 && parcel.cx < 54 + (parcel.cy - 76) * 0.55;
  }
  if (key === "ring") {
    const onHorizontal = parcel.cx > 35 && parcel.cx < 85 &&
      (Math.abs(parcel.cy - 38) < 4 || Math.abs(parcel.cy - 82) < 4);
    const onVertical = parcel.cy > 35 && parcel.cy < 85 &&
      (Math.abs(parcel.cx - 38) < 4 || Math.abs(parcel.cx - 82) < 4);
    return onHorizontal || onVertical;
  }
  if (key === "corridor") {
    const corridorX = 30 + parcel.cy * 0.22;
    return Math.abs(parcel.cx - corridorX) < 6 || parcel.cy > 95;
  }
  if (key === "public") {
    return [
      [60, 60],
      [60, 20],
      [100, 60],
      [60, 100],
      [20, 60],
    ].some(([x, y]) => Math.hypot(parcel.cx - x, parcel.cy - y) < 7.5);
  }
  if (key === "character") return parcel.unit === "west";
  if (key === "color") return parcel.unit === "north" || parcel.unit === "east";
  if (key === "view") {
    const expectedY = 104 - parcel.cx * 0.66;
    return parcel.cx > 16 && parcel.cx < 104 && Math.abs(parcel.cy - expectedY) < 8;
  }
  return parcel.unit === "core";
}

function RoadNetwork({ showLabels }: { showLabels: boolean }) {
  return (
    <g className="road-network" aria-label="四级道路网络">
      {roads.map((road) => (
        <path
          key={`${road.id}-casing`}
          d={road.path}
          className={`road-casing road-${road.roadClass}`}
          style={{ strokeWidth: roadWidths[road.roadClass].casing }}
        />
      ))}
      {roads.map((road) => (
        <path
          key={`${road.id}-fill`}
          d={road.path}
          className={`road-fill road-${road.roadClass}`}
          style={{ strokeWidth: roadWidths[road.roadClass].fill }}
        />
      ))}
      {roads
        .filter((road) => road.roadClass === "快速路" || road.roadClass === "主干路")
        .map((road) => (
          <path
            key={`${road.id}-center`}
            d={road.path}
            className={`road-center road-${road.roadClass}`}
          />
        ))}
      {showLabels &&
        roads
          .filter((road) => road.label)
          .map((road) => {
            const [x, y, rotation] = road.label!;
            return (
              <text
                key={`${road.id}-label`}
                x={x}
                y={y}
                transform={`rotate(${rotation} ${x} ${y})`}
                className="road-label"
              >
                {road.name}
              </text>
            );
          })}
    </g>
  );
}

function BaseCity({
  parcels,
  item,
  level,
  spatialSelection,
  selectSpatial,
  showParcels,
  showLandUse,
  showRoadLabels,
}: {
  parcels: Parcel[];
  item: CatalogItem | null;
  level: CatalogLevel;
  spatialSelection: SpatialSelection;
  selectSpatial: (selection: SpatialSelection) => void;
  showParcels: boolean;
  showLandUse: boolean;
  showRoadLabels: boolean;
}) {
  return (
    <>
      <rect x="4" y="4" width="112" height="112" rx="1" className="city-ground" />
      {units.map((unit) => (
        <rect
          key={`${unit.id}-wash`}
          {...unit.bounds}
          className={`unit-wash unit-${unit.id}`}
          style={{ fill: unit.color }}
        />
      ))}

      <path
        d="M 7 104 C 34 96, 53 109, 79 101 C 94 96, 105 98, 114 93"
        className="river-bank"
      />
      <path
        d="M 7 104 C 34 96, 53 109, 79 101 C 94 96, 105 98, 114 93"
        className="river"
      />
      <path d="M 8 96 C 36 90, 61 99, 112 88" className="regional-greenway" />

      {showParcels &&
        parcels.map((parcel) => {
          const affected = level === "parcel" && item !== null && isAffectedParcel(parcel, item);
          const isSelected = spatialSelection.kind === "parcel" && spatialSelection.id === parcel.id;
          return (
            <g
              key={parcel.id}
              className={`parcel-group ${affected ? "affected" : ""} ${
                isSelected ? "selected" : ""
              }`}
              onClick={() => selectSpatial({ kind: "parcel", id: parcel.id })}
            >
              <rect
                x={parcel.x}
                y={parcel.y}
                width={parcel.width}
                height={parcel.height}
                fill={showLandUse ? landUseColors[parcel.landUse] : "#e8e7df"}
                className="parcel-lot"
                aria-label={`${parcel.id} · ${unitById[parcel.unit].name} · ${parcel.landUse}`}
              />
              <rect
                x={parcel.x + parcel.width * 0.18}
                y={parcel.y + parcel.height * 0.2}
                width={parcel.width * 0.64}
                height={parcel.height * 0.56}
                className="building-footprint"
              />
            </g>
          );
        })}

      <g className="civic-spaces">
        <rect x="53.5" y="53.5" width="13" height="13" rx="1.5" className="central-plaza" />
        <rect x="9" y="12" width="8" height="9" rx="1" className="district-park" />
        <rect x="10" y="55" width="8" height="12" rx="1" className="district-park" />
        <rect x="102" y="54" width="8" height="13" rx="1" className="district-park" />
        <rect x="52" y="102" width="15" height="8" rx="1" className="district-park" />
        <circle cx="60" cy="60" r="2.2" className="civic-node" />
      </g>

      <RoadNetwork showLabels={showRoadLabels} />

      <g className="rapid-transit">
        <path d="M 7 57.8 H 113" />
        {[20, 36, 48, 60, 72, 84, 100].map((x) => (
          <circle key={x} cx={x} cy="57.8" r="0.72" />
        ))}
        <text x="7" y="56.5">轨道交通1号线</text>
      </g>

      {units.map((unit) => (
        <g
          key={`${unit.id}-boundary`}
          className={`unit-boundary unit-${unit.id} ${
            spatialSelection.kind === "unit" && spatialSelection.id === unit.id ? "selected" : ""
          }`}
          onClick={() => selectSpatial({ kind: "unit", id: unit.id })}
          role="button"
          aria-label={`选择${unit.name}`}
        >
          <rect {...unit.bounds} />
          <rect
            x={unit.label[0] - 9}
            y={unit.label[1] - 2.5}
            width="18"
            height="5.6"
            rx=".7"
            className="unit-label-hit"
          />
          <text x={unit.label[0]} y={unit.label[1]}>{unit.name}</text>
          <text x={unit.label[0]} y={unit.label[1] + 2.4}>{unit.role} · 120地块</text>
        </g>
      ))}
    </>
  );
}

function InterfaceMarker({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="interface-marker">
      <circle cx={x} cy={y} r="1.35" />
      <circle cx={x} cy={y} r="0.42" />
      <text x={x + 1.8} y={y - 1.3}>{label}</text>
    </g>
  );
}

function ElementOverlay({
  item,
  level,
}: {
  item: CatalogItem;
  level: CatalogLevel;
}) {
  const key = profileKeyFor(item);
  const color = groupColor(item.group);
  const levelClass = `overlay-${level}`;
  const isPoint = item.geometry === "点";
  const isLine = item.geometry === "线";
  const isArea = item.geometry === "面";

  if (key === "boundary") {
    return (
      <g className={`element-overlay ${levelClass}`} style={{ color }}>
        {level === "region" && <rect x="5" y="5" width="110" height="110" rx="1" />}
        {level === "unit" &&
          units.map((unit) => <rect key={unit.id} {...unit.bounds} />)}
        {level === "parcel" && (
          <>
            <rect x="51.7" y="48.4" width="4" height="4.35" className="parcel-object-area" />
            <rect x="60.2" y="62.8" width="3.5" height="4.2" className="parcel-object-area" />
            <text x="52" y="47.2">调用现行地块边界</text>
          </>
        )}
      </g>
    );
  }

  if (key === "axis") {
    return (
      <g className={`element-overlay axis-overlay ${levelClass}`} style={{ color }}>
        {level === "region" && (
          <>
            {isArea && <path d="M 7 60 C 36 58, 79 62, 113 59" className="object-range-line" />}
            {isLine && <path d="M 7 60 C 36 58, 79 62, 113 59" className="object-center-line" />}
            {isLine && <circle cx="7" cy="60" r="1.4" />}
            {isLine && <circle cx="113" cy="59" r="1.4" />}
            <text x="8.5" y={isArea ? 64.5 : 55.8}>{item.id} · {item.name}</text>
          </>
        )}
        {level === "unit" && (
          <>
            {[
              "M 7 60 C 18 59, 28 59, 36 59.5",
              "M 36 59.5 C 49 59, 70 61.5, 84 60.3",
              "M 84 60.3 C 95 60, 104 59.5, 113 59",
            ].map((path, index) => (
              <g key={path}>
                {isArea && <path d={path} className="object-range-line" />}
                {isLine && <path d={path} className="object-center-line" />}
                <text x={[12, 52, 95][index]} y={[64.5, 65, 64.2][index]}>
                  {item.id}-[{["W", "C", "E"][index]}]
                </text>
              </g>
            ))}
            {isLine && <InterfaceMarker x={36} y={59.5} label="IF-EW-01" />}
            {isLine && <InterfaceMarker x={84} y={60.3} label="IF-EW-02" />}
          </>
        )}
        {level === "parcel" && (
          <>
            {isLine && <path d="M 38 55.7 H 82" className="parcel-control-line" />}
            {isLine && <path d="M 38 64.2 H 82" className="parcel-interface-line" />}
            {isLine && [43, 48, 54, 66, 72, 77].map((x) => (
              <line key={x} x1={x} y1="54.8" x2={x} y2="65.2" className="parcel-link" />
            ))}
            {isPoint && <polygon points="60,48 58.6,51 61.4,51" className="high-point" />}
            {isArea && <rect x="54" y="55" width="12" height="10" rx="1" className="parcel-open-space" />}
            <text x="38" y="52.8">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  if (key === "core" || key === "center" || key === "public") {
    const points = [
      [60, 60],
      [60, 20],
      [100, 60],
      [60, 100],
      [20, 60],
    ];
    return (
      <g className={`element-overlay node-overlay ${levelClass}`} style={{ color }}>
        {level === "region" && (
          <>
            {isArea && <rect x="40" y="40" width="40" height="40" rx="7" className="object-area" />}
            {points.map(([x, y], index) => (
              <g key={`${x}-${y}`}>
                {isArea && <circle cx={x} cy={y} r={index === 0 ? 8 : 5.2} className="object-range" />}
                {isPoint && <circle cx={x} cy={y} r="1.15" />}
              </g>
            ))}
            <text x="42" y="38">{item.id} · {item.name}</text>
          </>
        )}
        {level === "unit" &&
          points.map(([x, y], index) => (
            <g key={`${x}-${y}`}>
              {isArea && <circle cx={x} cy={y} r={index === 0 ? 6 : 4.3} className="object-range" />}
              {isPoint && <circle cx={x} cy={y} r="1" />}
              <text x={x + 1.8} y={y - 1.6}>{item.id}-{index + 1}</text>
            </g>
          ))}
        {level === "parcel" && (
          <>
            {isArea && <rect x="53.5" y="53.5" width="13" height="13" rx="1.2" className="parcel-open-space" />}
            {isPoint && <circle cx="60" cy="60" r="1.35" />}
            {isPoint && [54, 60, 66].map((x) => (
              <circle key={x} cx={x} cy="67.2" r="0.7" className="parcel-entrance" />
            ))}
            {isLine && <path d="M 48 60 H 72 M 60 48 V 72" className="parcel-link" />}
            <text x="52" y="50.5">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  if (key === "wedge") {
    return (
      <g className={`element-overlay green-overlay ${levelClass}`} style={{ color }}>
        <polygon
          points={
            level === "region"
              ? "7,112 7,88 30,75 54,61 50,82 30,101"
              : level === "unit"
                ? "7,112 7,92 29,79 50,66 47,82 27,103"
                : "7,112 7,97 29,83 46,72 43,85 27,104"
          }
          className={level === "parcel" ? "parcel-object-area" : "object-area"}
        />
        <path d="M 11 105 L 47 73" className="object-center-line" />
        <text x="10" y="88">
          {level === "parcel" ? "生态连续面 + 建设退让线" : "生态绿楔边界与有效宽度"}
        </text>
      </g>
    );
  }

  if (key === "ring") {
    return (
      <g className={`element-overlay green-overlay ${levelClass}`} style={{ color }}>
        {isArea && <rect
          x={level === "region" ? 34 : 37}
          y={level === "region" ? 34 : 37}
          width={level === "region" ? 52 : 46}
          height={level === "region" ? 52 : 46}
          rx="10"
          className="object-range-line"
        />}
        {isLine && <rect x="39" y="39" width="42" height="42" rx="8" className="object-center-line" />}
        {level !== "region" && isLine && (
          <>
            <InterfaceMarker x={60} y={39} label="IF-GR-01" />
            <InterfaceMarker x={81} y={60} label="IF-GR-02" />
          </>
        )}
        {level === "parcel" && (
          <>
            {isPoint && [46, 60, 74].map((x) => (
              <circle key={x} cx={x} cy="39" r="0.72" className="parcel-entrance" />
            ))}
            <text x="40" y="35.5">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  if (key === "corridor") {
    return (
      <g className={`element-overlay green-overlay ${levelClass}`} style={{ color }}>
        {isArea && <path d="M 31 6 C 31 39, 42 72, 57 114" className="object-range-line corridor-range" />}
        {isLine && <path d="M 31 6 C 31 39, 42 72, 57 114" className="object-center-line" />}
        {level !== "region" && isLine && (
          <>
            <InterfaceMarker x={38} y={36} label="IF-EC-01" />
            <InterfaceMarker x={50} y={84} label="IF-EC-02" />
          </>
        )}
        {level === "parcel" && (
          <>
            {isLine && <path d="M 35 43 C 38 57, 44 74, 51 92" className="parcel-control-line" />}
            <text x="25" y="41">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  if (key === "character" || key === "color") {
    return (
      <g className={`element-overlay district-overlay ${levelClass}`} style={{ color }}>
        {isArea && [
          { x: 6, y: 37, width: 29, height: 46, label: key === "color" ? "暖灰主色区" : "历史风貌协调区" },
          { x: 37, y: 37, width: 46, height: 46, label: key === "color" ? "中明度核心区" : "现代核心风貌区" },
          { x: 85, y: 37, width: 29, height: 46, label: key === "color" ? "科技冷灰区" : "创新产业风貌区" },
        ].map((zone) => (
          <g key={zone.label}>
            <rect {...zone} className="object-area" />
            <text x={zone.x + 2} y={zone.y + 4}>{zone.label}</text>
          </g>
        ))}
        {level === "parcel" && (
          <>
            {isLine && <path d="M 7 54 H 35" className="parcel-interface-line" />}
            {isLine && <path d="M 37 54 H 83" className="parcel-control-line" />}
            <text x="8" y="51">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  if (key === "view") {
    return (
      <g className={`element-overlay view-overlay ${levelClass}`} style={{ color }}>
        {isArea && <polygon points="14,102 77,27 91,32" className="object-area" />}
        {isLine && <path d="M 14 102 L 84 29" className="object-center-line" />}
        {isPoint && <circle cx="14" cy="102" r="1.5" />}
        {isPoint && <polygon points="84,24 81.5,31 86.5,31" className="landmark-point" />}
        <text x="16" y="105">{item.id} · {item.name}</text>
        {level === "parcel" && (
          <>
            {isLine && <path d="M 37 82 L 74 43" className="parcel-control-line" />}
            <text x="40" y="78">{item.id} · {item.name}</text>
          </>
        )}
      </g>
    );
  }

  return (
    <g className={`element-overlay control-overlay ${levelClass}`} style={{ color }}>
      {level === "region" && (
        <>
          <rect x="36" y="36" width="48" height="48" rx="2" className="candidate-zone" />
          <text x="39" y="40">候选范围：研究状态，不直接管地块</text>
        </>
      )}
      {level === "unit" && (
        <>
          <rect x="5" y="5" width="110" height="110" className="general-zone" />
          <rect x="36" y="36" width="48" height="48" className="key-zone" />
          <text x="39" y="40">一级重点控制区 · 唯一类型：重要发展区</text>
          <text x="8" y="112">其余为一般控制区 · 完整覆盖 / 互不重叠</text>
        </>
      )}
      {level === "parcel" && (
        <>
          <rect x="37" y="37" width="46" height="46" className="key-zone" />
          <path d="M 38 55.8 H 82" className="parcel-control-line" />
          <rect x="54" y="55" width="12" height="10" className="parcel-open-space" />
          <text x="39" y="41">加载 K-50 重要发展区唯一强化规则包</text>
        </>
      )}
    </g>
  );
}

function ParcelFigure({ item }: { item: CatalogItem }) {
  const color = groupColor(item.group);
  return (
    <g className="parcel-figure" transform="translate(86 7)" style={{ color }}>
      <rect x="0" y="0" width="27" height="24" rx="1.2" className="figure-paper" />
      <text x="2" y="3.2">附加图则局部 · {item.id}</text>
      <rect x="3" y="5.2" width="21" height="15.5" className="figure-parcel" />
      <rect x="7" y="8" width="6" height="9" className="figure-building" />
      <rect x="15" y="7" width="5" height="11" className="figure-building" />
      {item.geometry === "点" ? (
        <>
          <circle cx="18" cy="15" r="1.35" className="figure-object-point" />
          <circle cx="18" cy="15" r="2.6" className="figure-object-range" />
        </>
      ) : item.geometry === "线" ? (
        <path d="M 4 18.5 H 23" className="figure-object-line" />
      ) : (
        <rect x="4.5" y="13" width="18" height="6.5" className="figure-object-area" />
      )}
      <circle cx="4.5" cy="18.5" r=".55" className="figure-entry" />
      <text x="2" y="23">几何实体 + 属性 + 审查条款</text>
    </g>
  );
}

function ProfessionalMap({
  parcels,
  item,
  items,
  level,
  spatialSelection,
  selectSpatial,
  showParcels,
  showLandUse,
  showRoadLabels,
}: {
  parcels: Parcel[];
  item: CatalogItem | null;
  items: CatalogItem[];
  level: CatalogLevel;
  spatialSelection: SpatialSelection;
  selectSpatial: (selection: SpatialSelection) => void;
  showParcels: boolean;
  showLandUse: boolean;
  showRoadLabels: boolean;
}) {
  return (
    <div className="map-frame">
      <svg
        viewBox="0 0 120 120"
        className="professional-map"
        aria-label="包含五个单元、600个地块和四级道路网络的假想城市"
      >
        <defs>
          <pattern id="parcelHatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="2.4" className="hatch-line" />
          </pattern>
          <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy=".55" stdDeviation=".55" floodOpacity=".16" />
          </filter>
        </defs>
        <BaseCity
          parcels={parcels}
          item={item}
          level={level}
          spatialSelection={spatialSelection}
          selectSpatial={selectSpatial}
          showParcels={showParcels}
          showLandUse={showLandUse}
          showRoadLabels={showRoadLabels}
        />
        <g className={`catalog-overview ${item ? "has-highlight" : ""}`} aria-label={`${items.length}项管控要素总览`}>
          {items.map((catalogItem) => (
            <g
              key={catalogItem.id}
              data-element-id={catalogItem.id}
              className={`catalog-layer ${
                item === null
                  ? "is-overview"
                  : item.id === catalogItem.id
                    ? "is-highlighted"
                    : "is-muted"
              }`}
            >
              <ElementOverlay item={catalogItem} level={level} />
            </g>
          ))}
        </g>
        {level === "parcel" && item && <ParcelFigure item={item} />}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="1"
          className={`map-outline ${spatialSelection.kind === "region" ? "selected" : ""}`}
          onClick={() => selectSpatial({ kind: "region", id: "REGION-01" })}
          role="button"
          aria-label="选择假想城市设计片区"
        />
        <g
          className={`region-label ${spatialSelection.kind === "region" ? "selected" : ""}`}
          onClick={() => selectSpatial({ kind: "region", id: "REGION-01" })}
          role="button"
          aria-label="选择片区UD-01"
        >
          <rect x="91" y="7" width="21" height="5.5" rx=".6" />
          <text x="101.5" y="10.5">片区 UD-01</text>
        </g>
        <g className="drawing-index" aria-hidden="true">
          {[20, 40, 60, 80, 100].map((value, index) => (
            <g key={value}>
              <text x={value} y="3">{String.fromCharCode(65 + index)}</text>
              <text x="2.3" y={value}>{index + 1}</text>
            </g>
          ))}
        </g>
      </svg>
      <div className="map-north" aria-hidden="true"><b>N</b><i /></div>
      <div className="map-scale" aria-label="比例尺"><span /><small>0</small><small>500m</small><small>1km</small></div>
      <div className="map-titleblock">
        <b>{levelMeta[level].name}层城市设计管控图</b>
        <span>图号 UD-{level === "region" ? "R" : level === "unit" ? "U" : "P"}-01</span>
        <span>示意比例 1:{level === "region" ? "5000" : level === "unit" ? "2000" : "1000"}</span>
        <span>坐标系：MVP LOCAL GRID</span>
      </div>
    </div>
  );
}

function LevelTree({
  level,
  setLevel,
  selectedId,
  clearSelection,
  selectItem,
}: {
  level: CatalogLevel;
  setLevel: (level: CatalogLevel) => void;
  selectedId: string | null;
  clearSelection: () => void;
  selectItem: (item: CatalogItem) => void;
}) {
  const items = elementCatalog[level];
  const groups = useMemo(
    () =>
      items.reduce<Record<string, CatalogItem[]>>((result, item) => {
        (result[item.group] ??= []).push(item);
        return result;
      }, {}),
    [items],
  );

  return (
    <aside className="layer-panel">
      <div className="panel-heading">
        <div>
          <span>标准空间要素</span>
          <small>70类 · 点线面分层入库</small>
        </div>
        <b>ALL</b>
      </div>
      <div className="level-tabs">
        {levelOrder.map((levelId) => (
          <button
            key={levelId}
            className={level === levelId ? "active" : ""}
            onClick={() => setLevel(levelId)}
          >
            <b>{levelMeta[levelId].count}</b>
            <span>{levelMeta[levelId].name}</span>
            <small>{levelPrinciples[levelId].verb}</small>
          </button>
        ))}
      </div>
      <div className="database-card">
        <span>{levelMeta[level].database}</span>
        <small>{levelMeta[level].scale}</small>
      </div>
      <button className={`overview-button ${selectedId === null ? "active" : ""}`} onClick={clearSelection}>
        <span>全要素总览</span>
        <b>{items.length} / {items.length} 已加载</b>
        <small>选择单项后增强目标图层，其余图层保留为参照</small>
      </button>
      <div className="element-groups">
        {Object.entries(groups).map(([group, groupItems]) => (
          <section key={group} className="element-group">
            <div className="element-group-title">
              <i style={{ background: groupColor(group) }} />
              <span>{group}</span>
              <b>{groupItems.length}</b>
            </div>
            {groupItems.map((item) => (
              <button
                key={item.id}
                className={selectedId === item.id ? "active" : ""}
                onClick={() => selectItem(item)}
              >
                <span>{item.id}</span>
                <b>{item.name}</b>
                <em>{item.geometry}</em>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

function Inspector({
  item,
  level,
  selectedParcel,
}: {
  item: CatalogItem | null;
  level: CatalogLevel;
  selectedParcel: Parcel | null;
}) {
  if (item === null) {
    return (
      <aside className="inspector-panel overview-inspector">
        <div className="inspector-kicker"><span>全要素总览 · {levelMeta[level].name}层</span><em>{levelMeta[level].count}项</em></div>
        <h2>综合管控工作图</h2>
        <p className="object-id">线控 / 点控 / 指标控制 / 条文控制</p>
        <div className="scale-role">
          <b>{levelPrinciples[level].verb}</b>
          <div><span>{levelPrinciples[level].question}</span><small>{levelPrinciples[level].depth}</small></div>
        </div>
        <div className="inspector-section">
          <span>读图规则</span>
          <h3>所有对象同时显示，选择后仅增强目标层</h3>
          <p>刚性对象采用实线，弹性范围采用虚线，引导内容采用点划线，研究候选采用斜线。总览不等于将上层对象直接复制到地块。</p>
        </div>
        <div className="inspector-section output-section">
          <span>对象说明</span>
          <p>点击左侧要素查看其对象、必备属性、成果深度与传导责任；点击图中片区、单元标签或任一地块，查看对应管理表。</p>
        </div>
        <div className="value-warning"><b>数值边界</b><p>本MVP不虚构法定控制值；表内给出控制方式、触发条件和审查方法，定量值留待批准成果接入。</p></div>
      </aside>
    );
  }
  const profile = getChainProfile(item);
  const stage = profile[level];
  const principle = levelPrinciples[level];
  return (
    <aside className="inspector-panel">
      <div className="inspector-kicker">
        <span>当前对象 · {levelMeta[level].name}层</span>
        <em>{item.geometry}对象</em>
      </div>
      <h2>{item.name}</h2>
      <p className="object-id">{item.id} · {item.group}</p>

      <div className="scale-role">
        <b>{principle.verb}</b>
        <div>
          <span>{principle.question}</span>
          <small>{principle.depth}</small>
        </div>
      </div>

      <div className="inspector-section">
        <span>本层空间对象</span>
        <h3>{stage.object}</h3>
        <p>{stage.responsibility}</p>
      </div>

      <div className="inspector-section">
        <span>必备属性与证据</span>
        <div className="evidence-list">
          {stage.required.map((entry) => <i key={entry}>{entry}</i>)}
        </div>
      </div>

      <div className="inspector-section output-section">
        <span>成果深度</span>
        <p>{stage.output}</p>
      </div>

      <div className="inspector-section">
        <span>{level === "parcel" ? "直接来源" : "向下传导"}</span>
        <p>{item.transmission}</p>
      </div>

      {selectedParcel && (
        <div className="parcel-record">
          <div>
            <span>已选地块</span>
            <b>{selectedParcel.id}</b>
          </div>
          <dl>
            <div><dt>所属单元</dt><dd>{unitById[selectedParcel.unit].name}</dd></div>
            <div><dt>用地</dt><dd>{selectedParcel.landUse}</dd></div>
            <div><dt>适用判定</dt><dd>{isAffectedParcel(selectedParcel, item) ? "适用" : "不适用"}</dd></div>
            <div><dt>规则包</dt><dd>{selectedParcel.unit === "core" ? "K-50 重点" : "一般8项矩阵"}</dd></div>
          </dl>
        </div>
      )}

      <div className="value-warning">
        <b>数值边界</b>
        <p>本MVP只演示对象、条件和审查链。具体控制值必须来自批准成果、现行导则或经审查确认的研究结论。</p>
      </div>
    </aside>
  );
}

function ControlSchedule({
  level,
  rows,
  selectedId,
  spatialSelection,
  selectedParcel,
  selectSpatial,
  selectItem,
}: {
  level: CatalogLevel;
  rows: ControlRow[];
  selectedId: string | null;
  spatialSelection: SpatialSelection;
  selectedParcel: Parcel | null;
  selectSpatial: (selection: SpatialSelection) => void;
  selectItem: (item: CatalogItem) => void;
}) {
  const applicableCount = rows.filter((row) => row.status === "适用").length;
  const objectTitle = spatialSelection.kind === "region"
    ? "假想城市设计片区 · REGION-01"
    : spatialSelection.kind === "unit"
      ? `${unitById[spatialSelection.id].name} · ${unitById[spatialSelection.id].code}-UNIT`
      : `${selectedParcel?.id ?? spatialSelection.id} · ${selectedParcel ? unitById[selectedParcel.unit].name : "地块"}`;

  return (
    <section className="control-schedule" aria-label={`${objectTitle}管控要素表`}>
      <div className="schedule-heading">
        <div>
          <span>一图一表 · 对象管理图则</span>
          <h2>{objectTitle}</h2>
          <p>{levelMeta[level].name}层字段深度 · 当前适用 {applicableCount} 项 / 全目录 {rows.length} 项</p>
        </div>
        <div className="spatial-selector" aria-label="空间对象选择">
          <button className={spatialSelection.kind === "region" ? "active" : ""} onClick={() => selectSpatial({ kind: "region", id: "REGION-01" })}>片区</button>
          {units.map((unit) => (
            <button
              key={unit.id}
              className={spatialSelection.kind === "unit" && spatialSelection.id === unit.id ? "active" : ""}
              onClick={() => selectSpatial({ kind: "unit", id: unit.id })}
            >
              {unit.code}单元
            </button>
          ))}
          <span>地块：在图中点选</span>
        </div>
      </div>
      <div className="schedule-legend">
        <span><i className="rigid-line" />刚性 / 实线</span>
        <span><i className="elastic-line" />弹性 / 虚线</span>
        <span><i className="guide-line" />引导 / 点划线</span>
        <span><i className="research-area" />研究 / 候选斜线</span>
        <b>点击任一行，在地图中高亮该管控要素</b>
      </div>
      <div className="schedule-table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>要素编号 / 名称</th>
              <th>{level === "region" ? "识别依据" : "来源对象"}</th>
              <th>{level === "parcel" ? "触发关系" : "传导处置"}</th>
              <th>控制性质</th>
              <th>具体管控方式</th>
              <th>图面表达</th>
              <th>审查方法</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const catalogItem = elementCatalog[level].find((entry) => entry.id === row.id)!;
              return (
                <tr
                  key={row.id}
                  className={`${row.status === "不适用" ? "not-applicable" : ""} ${selectedId === row.id ? "selected" : ""}`}
                  onClick={() => selectItem(catalogItem)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") selectItem(catalogItem);
                  }}
                >
                  <td><span className={`status-chip ${row.status === "适用" ? "ok" : "na"}`}>{row.status}</span></td>
                  <td><b>{geometrySymbol(catalogItem.geometry)} {row.id}</b><span>{row.element}</span></td>
                  <td>{row.source}</td>
                  <td>{row.relation}</td>
                  <td><em className={`nature-${row.nature}`}>{row.nature}</em></td>
                  <td>{row.method}</td>
                  <td>{row.expression}</td>
                  <td>{row.review}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="schedule-note">注：不适用项保留在全目录中，用于证明已完成适用性判定；地块要求必须经“空间叠加—规则触发—要求生成—同类合并—冲突复核—图则关联”后生成。</p>
    </section>
  );
}

function ScaleLadder({
  item,
  level,
  setLevel,
}: {
  item: CatalogItem;
  level: CatalogLevel;
  setLevel: (level: CatalogLevel) => void;
}) {
  const profile = getChainProfile(item);
  return (
    <section className="scale-ladder">
      <div className="ladder-heading">
        <div>
          <span>专业传导剖面</span>
          <h2>{profile.title}</h2>
        </div>
        <p>{profile.thesis}</p>
      </div>
      <div className="ladder-flow">
        {levelOrder.map((levelId, index) => {
          const stage = profile[levelId];
          return (
            <div className="ladder-segment" key={levelId}>
              <button
                className={`ladder-card ${level === levelId ? "active" : ""}`}
                onClick={() => setLevel(levelId)}
              >
                <div>
                  <span>0{index + 1} · {levelMeta[levelId].name}</span>
                  <b>{levelPrinciples[levelId].verb}</b>
                </div>
                <h3>{stage.object}</h3>
                <p>{stage.responsibility}</p>
                <small>{stage.output}</small>
              </button>
              {index < 2 && (
                <div className="ladder-arrow">
                  <span>{index === 0 ? "分解 / 继承 / 深化" : "适用性 + 规则转译"}</span>
                  <b>→</b>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rule-evidence">
        <div><span>空间关系</span><b>{profile.relation}</b></div>
        <div><span>规则触发</span><b>{profile.trigger}</b></div>
        <div><span>合并 / 冲突</span><b>{profile.mergeRule}</b></div>
      </div>
      <div className="translation-pipeline">
        {["空间叠加", "规则触发", "要求生成", "同类合并", "冲突复核", "图则关联"].map(
          (step, index) => (
            <span key={step}><b>{index + 1}</b>{step}</span>
          ),
        )}
      </div>
    </section>
  );
}

function StrategyLibrary() {
  const [tab, setTab] = useState<"transmission" | "general" | "key">("transmission");
  const strategies =
    tab === "general"
      ? generalControlStrategies
      : tab === "key"
        ? keyControlStrategies
        : transmissionStrategies;
  return (
    <section className="strategy-library">
      <div className="strategy-heading">
        <div>
          <span>控制策略库</span>
          <h2>传导方式、一般8项、重点5类</h2>
        </div>
        <div className="strategy-tabs">
          <button className={tab === "transmission" ? "active" : ""} onClick={() => setTab("transmission")}>传导 10</button>
          <button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>一般 8</button>
          <button className={tab === "key" ? "active" : ""} onClick={() => setTab("key")}>重点 5</button>
        </div>
      </div>
      <div className="strategy-cards">
        {strategies.map((strategy) => (
          <article key={strategy.id}>
            <span>{strategy.id}</span>
            <h3>{strategy.name}</h3>
            <dl>
              <div><dt>适用判定</dt><dd>{strategy.condition}</dd></div>
              <div><dt>图则表达</dt><dd>{strategy.expression}</dd></div>
              <div><dt>记录要求</dt><dd>{strategy.requirement}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function QualityGate() {
  return (
    <section className="quality-gate">
      <div className="quality-heading">
        <div>
          <span>任务质量门禁</span>
          <h2>每轮任务均需通过六项审查</h2>
        </div>
        <b>6 / 6</b>
      </div>
      <div className="quality-list">
        {reviewChecklist.map((item) => (
          <article key={item.id}>
            <i>✓</i>
            <div>
              <span>{item.id} · {item.name}</span>
              <p>{item.criterion}</p>
            </div>
            <b>通过</b>
          </article>
        ))}
      </div>
      <p className="quality-note">审查顺序：数据完整性 → 传导逻辑 → 空间表达 → 交互可读性 → 构建验证 → 线上复核。任一项不通过则不发布。</p>
    </section>
  );
}

export default function Home() {
  const parcels = useMemo(() => generateParcels(), []);
  const [level, setLevel] = useState<CatalogLevel>("unit");
  const [selectedIds, setSelectedIds] = useState<Record<CatalogLevel, string | null>>({
    region: null,
    unit: null,
    parcel: null,
  });
  const [spatialSelection, setSpatialSelection] = useState<SpatialSelection>({ kind: "unit", id: "core" });
  const [showParcels, setShowParcels] = useState(true);
  const [showLandUse, setShowLandUse] = useState(true);
  const [showRoadLabels, setShowRoadLabels] = useState(true);

  const items = elementCatalog[level];
  const selectedItem = items.find((item) => item.id === selectedIds[level]) ?? null;
  const selectedParcel = spatialSelection.kind === "parcel"
    ? parcels.find((parcel) => parcel.id === spatialSelection.id) ?? null
    : null;
  const controlRows = buildControlRows(items, level, spatialSelection, selectedParcel, isAffectedParcel);
  const affectedCount = selectedItem
    ? parcels.filter((parcel) => isAffectedParcel(parcel, selectedItem)).length
    : controlRows.filter((row) => row.status === "适用").length;

  function chooseLevel(next: CatalogLevel) {
    setLevel(next);
    setSelectedIds((current) => ({ ...current, [next]: null }));
    if (next === "region") setSpatialSelection({ kind: "region", id: "REGION-01" });
    if (next === "unit") setSpatialSelection({ kind: "unit", id: "core" });
    if (next === "parcel") setSpatialSelection({ kind: "parcel", id: "C-001" });
  }

  function selectItem(item: CatalogItem) {
    setSelectedIds((current) => ({ ...current, [level]: item.id }));
  }

  function selectSpatial(selection: SpatialSelection) {
    setSpatialSelection(selection);
    const nextLevel: CatalogLevel = selection.kind === "region" ? "region" : selection.kind === "unit" ? "unit" : "parcel";
    setLevel(nextLevel);
    setSelectedIds((current) => ({ ...current, [nextLevel]: null }));
  }

  return (
    <main className="professional-shell">
      <header className="topbar">
        <div className="brand">
          <span>XI&apos;AN URBAN DESIGN LAB</span>
          <div>
            <h1>城市设计空间对象识别与落位</h1>
            <p>片区统筹 → 单元落实 → 地块规则转译</p>
          </div>
        </div>
        <div className="topbar-status">
          <span>专业假想城 · 非现状法定图</span>
          <b><i /> 质量门禁通过</b>
        </div>
      </header>

      <section className="metric-ribbon">
        <div><span>城市底图</span><b>四级路网</b><small>快速路 / 主干路 / 次干路 / 支路</small></div>
        <div><span>规划单元</span><b>5</b><small>中央核心单元 1 个</small></div>
        <div><span>现行地块</span><b>600</b><small>每单元 120 个</small></div>
        <div><span>标准要素</span><b>20 / 21 / 29</b><small>片区 / 单元 / 地块</small></div>
        <div><span>{selectedItem ? "关联地块" : "适用要素"}</span><b>{affectedCount}</b><small>{selectedItem ? "基于空间关系动态判定" : "对象管理表实时统计"}</small></div>
      </section>

      <section className="studio-grid">
        <LevelTree
          level={level}
          setLevel={chooseLevel}
          selectedId={selectedItem?.id ?? null}
          clearSelection={() => setSelectedIds((current) => ({ ...current, [level]: null }))}
          selectItem={selectItem}
        />

        <section className="map-panel">
          <div className="map-toolbar">
            <div>
              <span>{levelMeta[level].name}层规划管理图则</span>
              <h2>{selectedItem ? `${selectedItem.id} · ${selectedItem.name}` : `全要素总览 · ${items.length}项同时显示`}</h2>
              <small>{selectedItem ? selectedItem.content : "图层已完整加载；选择任一要素后增强其线型、填充和注记，其余要素保留为上下文参照。"}</small>
            </div>
            <div className="map-toggles" aria-label="地图图层开关">
              <button className={showParcels ? "active" : ""} onClick={() => setShowParcels((value) => !value)}>地块</button>
              <button className={showLandUse ? "active" : ""} onClick={() => setShowLandUse((value) => !value)}>用地底色</button>
              <button className={showRoadLabels ? "active" : ""} onClick={() => setShowRoadLabels((value) => !value)}>路名</button>
            </div>
          </div>

          <ProfessionalMap
            parcels={parcels}
            item={selectedItem}
            items={items}
            level={level}
            spatialSelection={spatialSelection}
            selectSpatial={selectSpatial}
            showParcels={showParcels}
            showLandUse={showLandUse}
            showRoadLabels={showRoadLabels}
          />

          <div className="map-legend">
            <div className="road-legend">
              <span>道路等级</span>
              {(["快速路", "主干路", "次干路", "支路"] as RoadClass[]).map((roadClass) => (
                <i key={roadClass} className={`legend-${roadClass}`}>{roadClass}</i>
              ))}
              <i className="legend-transit">轨道交通</i>
            </div>
            <div className="landuse-legend">
              <span>用地底色</span>
              {Object.entries(landUseColors).map(([name, color]) => (
                <i key={name}><b style={{ background: color }} />{name}</i>
              ))}
            </div>
            <p>总览显示本层全部标准要素；选中要素以高饱和描边和白色光晕增强，未选图层仍保留。刚性、弹性、引导与研究对象按不同线型表达。</p>
          </div>
        </section>

        <Inspector item={selectedItem} level={level} selectedParcel={selectedParcel} />
      </section>

      <ControlSchedule
        level={level}
        rows={controlRows}
        selectedId={selectedItem?.id ?? null}
        spatialSelection={spatialSelection}
        selectedParcel={selectedParcel}
        selectSpatial={selectSpatial}
        selectItem={selectItem}
      />

      <ScaleLadder item={selectedItem ?? items[0]} level={level} setLevel={chooseLevel} />

      <section className="lower-grid">
        <StrategyLibrary />
        <QualityGate />
      </section>

      <footer>
        <span>依据：《西安市国土空间详细规划城市设计编审入库工作说明》第二章及附件要素目录</span>
        <span>演示数据仅用于MVP验证 · 不替代法定规划成果</span>
      </footer>
    </main>
  );
}

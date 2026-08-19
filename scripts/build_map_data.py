from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import pandas as pd
import pyogrio
from shapely import make_valid
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, box
from shapely.ops import unary_union


LAYER_CONFIG = [
    {
        "name": "中心城区视线通廊",
        "key": "view",
        "label": "视线通廊",
        "color": "#8B5CF6",
    },
    {
        "name": "特色空间结构",
        "key": "structure",
        "label": "特色空间结构",
        "color": "#F97345",
    },
    {
        "name": "开放空间体系",
        "key": "open-space",
        "label": "开放空间体系",
        "color": "#10A675",
    },
    {
        "name": "城市设计重点控制区",
        "key": "key-zone",
        "label": "重点控制区",
        "color": "#D99A18",
    },
    {
        "name": "城市色彩指引",
        "key": "color",
        "label": "城市色彩",
        "color": "#E65C91",
    },
    {
        "name": "城市风貌区",
        "key": "character",
        "label": "城市风貌",
        "color": "#4E67E8",
    },
]


KEY_ZONE_RULES = {
    "城市轴线区": (
        "保护城市轴线整体结构，强化轴线空间延伸和主次分明的总体形态；围绕重要公共空间组织建筑形态、"
        "公共空间与交通空间，构建安全便捷、连续可达的慢行网络。"
    ),
    "历史风貌区": (
        "保护城市格局和历史街巷肌理；新建建筑遵循“古今有别、新旧有别”，严格控制建筑高度、体量、"
        "色彩和风格，保护公共空间风貌，优先发展公共交通和慢行交通。"
    ),
    "重要滨水区和川源区": (
        "突出丰枯兼容的水系特征，营造全季节高品质韧性滨水环境；协调建筑与水体、塬体及周边城市空间的关系，"
        "保障滨水公共空间生态、开放、共享和连续可达，强化慢行及地块出入口与地形的衔接。"
    ),
    "城市枢纽区": (
        "整合枢纽周边建筑、公共空间与交通空间，优化集散和人行流线，强化步行换乘与公共空间衔接，"
        "形成开放、舒适、易达的城市门户空间。"
    ),
    "重要发展区": (
        "结合片区功能和产业定位组织建筑形态、公共空间与交通空间；强化高点与建筑体量、开敞空间、"
        "活力界面、慢行系统和地块出入口，促进集约多样、便捷高效发展。"
    ),
}


LEVEL_RULES = {
    "一级区": "一级地区应落实对应分区的必选控制要素，并对可选要素结合项目条件进行专项论证。",
    "二级区": "二级地区应落实对应分区的必选控制要素，其他要素可结合项目条件采用。",
}


def text(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def safe_geometry(geometry):
    if geometry is None or geometry.is_empty:
        return GeometryCollection()
    return geometry if geometry.is_valid else make_valid(geometry)


def polygon_parts(geometry):
    geometry = safe_geometry(geometry)
    if isinstance(geometry, Polygon):
        yield geometry
    elif isinstance(geometry, MultiPolygon):
        yield from geometry.geoms
    elif isinstance(geometry, GeometryCollection):
        for part in geometry.geoms:
            yield from polygon_parts(part)


def feature_title(layer_name: str, row: pd.Series) -> str:
    if layer_name in {"特色空间结构", "开放空间体系"}:
        return text(row.get("名称")) or "未命名管控要素"
    if layer_name == "中心城区视线通廊":
        return text(row.get("bz")) or text(row.get("jdmc")) or "视线通廊"
    if layer_name == "城市设计重点控制区":
        return text(row.get("一级")) or text(row.get("二级")) or text(row.get("重点控制区类型"))
    if layer_name in {"城市色彩指引", "城市风貌区"}:
        return text(row.get("mc")) or "未命名管控要素"
    return layer_name


def feature_rule(layer_name: str, row: pd.Series) -> tuple[str, str, str]:
    if layer_name == "特色空间结构":
        return text(row.get("管控内容")), "管控数据", text(row.get("管控范围"))
    if layer_name == "开放空间体系":
        return text(row.get("管控内容")), "管控数据", text(row.get("管控范围"))
    if layer_name == "城市色彩指引":
        return text(row.get("zynr")), "管控数据", ""
    if layer_name == "城市风貌区":
        return text(row.get("gknr")), "管控数据", text(row.get("gkfw"))
    if layer_name == "城市设计重点控制区":
        zone_type = text(row.get("重点控制区类型"))
        level = text(row.get("级别"))
        rule = "".join(filter(None, [KEY_ZONE_RULES.get(zone_type, ""), LEVEL_RULES.get(level, "")]))
        return rule, "PDF补充", ""
    if layer_name == "中心城区视线通廊":
        height = text(row.get("jzgdsx"))
        height_rule = f" 建筑高度上限为{height}米。" if height else ""
        rule = (
            "保证地标点在眺望点视域范围内清晰可见，控制视廊范围内的建筑高度和视线遮挡；"
            "涉及视线通廊的详细规划和建设项目应对视廊两侧建筑高度及眺望点进行论证。"
            + height_rule
        )
        return rule, "PDF补充", ""
    return "", "管控数据", ""


def svg_path(geometry, transform) -> str:
    commands: list[str] = []
    for polygon in polygon_parts(geometry):
        rings = [polygon.exterior, *polygon.interiors]
        for ring in rings:
            coords = list(ring.coords)
            if len(coords) < 4:
                continue
            points = [transform(x, y) for x, y, *_ in coords]
            commands.append(f"M{points[0][0]:.1f},{points[0][1]:.1f}")
            commands.extend(f"L{x:.1f},{y:.1f}" for x, y in points[1:])
            commands.append("Z")
    return "".join(commands)


def svg_bbox(geometry, transform) -> list[float]:
    min_x, min_y, max_x, max_y = safe_geometry(geometry).bounds
    left, bottom = transform(min_x, min_y)
    right, top = transform(max_x, max_y)
    return [round(left, 1), round(top, 1), round(right, 1), round(bottom, 1)]


def build(args: argparse.Namespace) -> dict[str, Any]:
    units = pyogrio.read_dataframe(args.east_gdb, layer="详细规划编制单元", fid_as_index=True)
    parcels = pyogrio.read_dataframe(args.east_gdb, layer="DYCMYDBJGH", fid_as_index=True)
    units.geometry = units.geometry.map(safe_geometry)
    parcels.geometry = parcels.geometry.map(safe_geometry)

    min_x, min_y, max_x, max_y = units.total_bounds
    raw_width = max_x - min_x
    raw_height = max_y - min_y
    scale = min(900 / raw_width, 900 / raw_height)
    offset_x = (1000 - raw_width * scale) / 2
    offset_y = (1000 - raw_height * scale) / 2

    def transform(x: float, y: float) -> tuple[float, float]:
        return offset_x + (x - min_x) * scale, offset_y + (max_y - y) * scale

    extent = box(min_x, min_y, max_x, max_y)
    unit_union = unary_union(list(units.geometry))

    controls: list[dict[str, Any]] = []
    control_geometries: list[Any] = []
    layer_counts: dict[str, int] = {config["key"]: 0 for config in LAYER_CONFIG}

    for layer_index, config in enumerate(LAYER_CONFIG):
        frame = pyogrio.read_dataframe(args.control_gdb, layer=config["name"], fid_as_index=True)
        for fid, row in frame.iterrows():
            geometry = safe_geometry(row.geometry)
            if geometry.is_empty or not geometry.intersects(unit_union):
                continue
            unit_intersection = safe_geometry(geometry.intersection(unit_union))
            if unit_intersection.is_empty or unit_intersection.area <= 1:
                continue
            clipped = safe_geometry(geometry.intersection(extent))
            path = svg_path(clipped, transform)
            if not path:
                continue
            rule, rule_source, control_range = feature_rule(config["name"], row)
            control_id = f"c{layer_index}-{int(fid)}"
            controls.append(
                {
                    "id": control_id,
                    "layerKey": config["key"],
                    "layer": config["label"],
                    "title": feature_title(config["name"], row),
                    "type": text(row.get("类型")) or text(row.get("重点控制区类型")) or text(row.get("mc")),
                    "level": text(row.get("级别")),
                    "subtype": text(row.get("类型")),
                    "rule": rule or "该要素暂缺管控规则文本。",
                    "ruleSource": rule_source,
                    "range": control_range,
                    "path": path,
                    "bbox": svg_bbox(clipped, transform),
                }
            )
            control_geometries.append(geometry)
            layer_counts[config["key"]] += 1

    def relationships(geometry) -> list[dict[str, Any]]:
        geometry = safe_geometry(geometry)
        area = max(geometry.area, 1.0)
        result: list[dict[str, Any]] = []
        for control, control_geometry in zip(controls, control_geometries):
            if not geometry.intersects(control_geometry):
                continue
            intersection = safe_geometry(geometry.intersection(control_geometry))
            if intersection.is_empty or intersection.area <= 1:
                continue
            result.append(
                {
                    "id": control["id"],
                    "overlap": round(min(100.0, intersection.area / area * 100), 2),
                }
            )
        return result

    unit_items: list[dict[str, Any]] = []
    for fid, row in units.iterrows():
        unit_items.append(
            {
                "id": f"u-{int(fid)}",
                "businessId": text(row.get("DYBH")),
                "name": text(row.get("XXGHBZDYMC")),
                "unitType": text(row.get("XXGHDYLX")),
                "function": text(row.get("ZDGN")),
                "development": text(row.get("KFLX")),
                "areaHa": round(float(row.get("Shape_Area", row.geometry.area)) / 10000, 2),
                "population": text(row.get("RLRK")),
                "path": svg_path(row.geometry, transform),
                "bbox": svg_bbox(row.geometry, transform),
                "controls": relationships(row.geometry),
            }
        )

    parcel_items: list[dict[str, Any]] = []
    for fid, row in parcels.iterrows():
        parcel_items.append(
            {
                "id": f"p-{int(fid)}",
                "businessId": text(row.get("DKBH")) or "未编号地块",
                "unitId": text(row.get("DYBH")),
                "landUse": text(row.get("YDYHFLMC")),
                "landUseCode": text(row.get("YDYHFLDM")),
                "areaHa": round(float(row.get("YDMJ", row.geometry.area)) / 10000, 2),
                "farMax": text(row.get("RJLSX")),
                "farMin": text(row.get("RJLXX")),
                "status": text(row.get("GHZT")),
                "path": svg_path(row.geometry, transform),
                "bbox": svg_bbox(row.geometry, transform),
                "controls": relationships(row.geometry),
            }
        )

    layers = [
        {
            "key": config["key"],
            "label": config["label"],
            "color": config["color"],
            "count": layer_counts[config["key"]],
        }
        for config in LAYER_CONFIG
    ]

    return {
        "meta": {
            "title": "西安市东部城市设计一张图",
            "generatedFrom": "东部数据.gdb + 城市设计管控数据.gdb",
            "unitCount": len(unit_items),
            "parcelCount": len(parcel_items),
            "controlCount": len(controls),
            "sourceControlCount": 217,
            "coordinateNotice": "采用源数据坐标进行相对展示，未叠加互联网底图。",
        },
        "layers": layers,
        "units": unit_items,
        "parcels": parcel_items,
        "controls": controls,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--east-gdb", required=True)
    parser.add_argument("--control-gdb", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = build(args)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(result["meta"], ensure_ascii=False, indent=2))
    print(json.dumps({layer["label"]: layer["count"] for layer in result["layers"]}, ensure_ascii=False, indent=2))
    print(f"output={output} bytes={output.stat().st_size}")


if __name__ == "__main__":
    main()

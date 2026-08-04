import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function sources() {
  const [catalog, model, matrix, page, css] = await Promise.all([
    readFile(new URL("app/catalog-data.ts", root), "utf8"),
    readFile(new URL("app/urban-model.ts", root), "utf8"),
    readFile(new URL("app/control-matrix.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  return { catalog, model, matrix, page, css };
}

test("keeps the complete 20/21/29 spatial-element catalog", async () => {
  const { catalog } = await sources();
  assert.equal(catalog.match(/id: "R-\d{2}"/g)?.length, 20);
  assert.equal(catalog.match(/id: "U-\d{2}"/g)?.length, 21);
  assert.equal(catalog.match(/id: "P-\d{2}"/g)?.length, 29);
  assert.equal(catalog.match(/id: "T-\d{2}"/g)?.length, 10);
  assert.equal(catalog.match(/id: "G-\d{2}"/g)?.length, 8);
  assert.equal(catalog.match(/id: "K-\d{2}"/g)?.length, 5);
});

test("builds five 120-parcel units and a four-level road network", async () => {
  const { model } = await sources();
  const grids = [...model.matchAll(/columns:\s*(\d+),\s*\n\s*rows:\s*(\d+),/g)];
  assert.equal(grids.length, 5);
  assert.deepEqual(
    grids.map((match) => Number(match[1]) * Number(match[2])),
    [120, 120, 120, 120, 120],
  );
  assert.match(model, /id: "core"/);
  for (const roadClass of ["快速路", "主干路", "次干路", "支路"]) {
    assert.match(model, new RegExp(`roadClass: "${roadClass}"`));
  }
});

test("separates regional, unit and parcel control depth", async () => {
  const { model, page } = await sources();
  assert.match(model, /verb: "统筹"/);
  assert.match(model, /verb: "落实"/);
  assert.match(model, /verb: "转译"/);
  assert.match(model, /不复制单元影响范围/);
  assert.match(model, /唯一重点类型/);

  for (const step of [
    "空间叠加",
    "规则触发",
    "要求生成",
    "同类合并",
    "冲突复核",
    "图则关联",
  ]) {
    assert.match(page, new RegExp(step));
  }
});

test("exposes the six-part quality gate and stable map symbology", async () => {
  const { model, page, css } = await sources();
  assert.equal(model.match(/id: "Q-\d{2}"/g)?.length, 6);
  assert.match(page, /QualityGate/);
  assert.match(page, /专业假想城 · 非现状法定图/);
  assert.match(css, /\.road-casing/);
  assert.match(css, /\.unit-boundary/);
  assert.match(css, /\.parcel-control-line/);
  assert.match(css, /\.candidate-zone/);
});

test("keeps all layers visible in overview and highlights exactly the selected layer", async () => {
  const { page, css } = await sources();
  assert.match(page, /items\.map\(\(catalogItem\)/);
  assert.match(page, /data-element-id=\{catalogItem\.id\}/);
  assert.match(page, /is-overview/);
  assert.match(page, /is-highlighted/);
  assert.match(page, /is-muted/);
  assert.match(page, /全要素总览/);
  assert.match(css, /\.catalog-layer\.is-overview/);
  assert.match(css, /\.catalog-layer\.is-highlighted/);
});

test("shows object-specific applicable controls in the compact right panel", async () => {
  const { page, matrix, css } = await sources();
  assert.match(page, /type SpatialSelection/);
  assert.match(page, /function ControlInspector/);
  assert.match(page, /rows\.filter\(\(row\) => row\.status === "适用"\)/);
  assert.match(page, /control-method/);
  assert.match(page, /点击控制要素可在中间地图高亮/);
  assert.doesNotMatch(page, /function ControlSchedule/);
  assert.match(page, /selectSpatial\(\{ kind: "unit"/);
  assert.match(page, /selectSpatial\(\{ kind: "parcel"/);
  assert.match(css, /\.control-inspector/);
  assert.match(css, /\.control-element-card\.selected/);
  assert.match(matrix, /ControlNature = "刚性" \| "弹性" \| "引导" \| "研究"/);
  assert.match(matrix, /空间叠加 \/ 包含/);
  assert.match(matrix, /status: "适用" \| "不适用"/);
});

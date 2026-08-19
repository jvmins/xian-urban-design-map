import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("packages the real eastern unit and parcel data", async () => {
  const payload = JSON.parse(await source("app/map-data.json"));
  assert.equal(payload.meta.unitCount, 38);
  assert.equal(payload.meta.parcelCount, 3544);
  assert.equal(payload.units.length, 38);
  assert.equal(payload.parcels.length, 3544);
  assert.ok(payload.controls.length >= 28);
  assert.equal(payload.layers.length, 6);
});

test("associates every displayed control with at least one object", async () => {
  const payload = JSON.parse(await source("app/map-data.json"));
  const used = new Set(
    [...payload.units, ...payload.parcels].flatMap((item) => item.controls.map((control) => control.id)),
  );
  for (const control of payload.controls) assert.ok(used.has(control.id), control.id);
});

test("keeps controls at unit level while parcels have no direct requirements", async () => {
  const payload = JSON.parse(await source("app/map-data.json"));
  assert.ok(payload.units.some((unit) => unit.controls.length > 0));
  assert.ok(payload.parcels.every((parcel) => parcel.controls.length === 0));
  assert.ok(payload.parcels.some((parcel) => parcel.contextControls.length > 0));
});

test("decomposes direct parcel context instead of copying parent unit controls", async () => {
  const page = await source("app/page.tsx");
  const rules = await source("app/parcel-rules.ts");
  assert.doesNotMatch(page, /unitMap\.get\(\(selectedObject as ParcelItem\)\.unitId\)\?\.controls/);
  assert.match(page, /deriveParcelRules/);
  assert.match(page, /data-rule-origin="guide-derived"/);
  assert.match(rules, /parcel\.contextControls/);
  assert.match(rules, /keyZoneStrengths/);
  assert.match(page, /地块城市设计管控内容/);
});

test("marks supplemented rules and keeps source-data rules", async () => {
  const payload = JSON.parse(await source("app/map-data.json"));
  assert.ok(payload.controls.some((control) => control.ruleSource === "PDF补充"));
  assert.ok(payload.controls.some((control) => control.ruleSource === "管控数据"));
  assert.ok(payload.controls.every((control) => control.rule.length > 10));
});

test("exposes unit, parcel, layer, search and spatial-inspector interactions", async () => {
  const page = await source("app/page.tsx");
  for (const token of [
    "空间对象查询",
    "空间层级",
    "城市设计管控",
    "handleWheel",
    "handlePointerMove",
    "applicableControls",
    "控制内容",
  ]) {
    assert.match(page, new RegExp(token));
  }
});

test("uses a floating table result panel without control-vector overlays", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /数据图层/);
  assert.match(page, /对象基本信息/);
  assert.match(page, /单元城市设计管控内容/);
  assert.match(page, /地块城市设计管控内容/);
  assert.match(page, /className="control-table"/);
  assert.doesNotMatch(page, /control-features/);
  assert.doesNotMatch(page, /现有矢量/);
});

test("uses the supplied ArcGIS land-use palette instead of hashed colors", async () => {
  const page = await source("app/page.tsx");
  const palette = await source("app/land-use-palette.ts");
  assert.match(page, /landUseColor\(parcel\.landUseCode, parcel\.landUse\)/);
  assert.match(page, /用地布局色板 · 20260710\.lyr/);
  assert.doesNotMatch(page, /hashColor/);
  for (const color of ["#FFFF2D", "#FF0000", "#00FF00", "#BB9674", "#338EC0"]) {
    assert.match(palette, new RegExp(color));
  }
});

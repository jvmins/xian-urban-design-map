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
    "定位管控范围",
  ]) {
    assert.match(page, new RegExp(token));
  }
});

export type RuleStrength = "必选" | "可选" | "条件适用";

export type ParcelRelationship = {
  id: string;
  overlap: number;
};

export type ParcelRuleInput = {
  id: string;
  businessId: string;
  unitId: string;
  landUse: string;
  areaHa: number;
  contextControls: ParcelRelationship[];
};

export type ControlRuleInput = {
  id: string;
  layerKey: string;
  layer: string;
  title: string;
  type: string;
  level: string;
  subtype: string;
  ruleSource: "管控数据" | "PDF补充";
};

export type ParcelDerivedRule = {
  id: string;
  group: string;
  element: string;
  requirement: string;
  strength: RuleStrength;
  trigger: string;
  provenance: string;
  controlId?: string;
};

type LandUseKind =
  | "building"
  | "school-hospital"
  | "industry"
  | "municipal"
  | "green"
  | "road";

const ELEMENT_GROUP: Record<string, string> = {
  高点建筑布局: "建筑形态",
  第五立面: "建筑形态",
  建筑立面: "建筑形态",
  建筑体量: "建筑形态",
  建筑控制线: "建筑形态",
  城市记忆建筑引导: "建筑形态",
  开敞空间控制: "公共空间",
  全季节性滨水空间: "公共空间",
  "慢行优先区/道": "交通空间",
  地块出入口: "交通空间",
};

const ELEMENT_REQUIREMENT: Record<string, (parcel: ParcelRuleInput) => string> = {
  高点建筑布局: (parcel) =>
    `结合${parcel.landUse}功能、周边天际线与公共空间组织高点建筑；高点位置、高度及视线影响应在方案中专项论证，避免均质化排布。`,
  第五立面: () =>
    "统筹屋顶设备、构筑物、绿化与材料色彩，形成完整有序的第五立面；重要俯瞰视点可见范围内不得出现无序裸露设备。",
  建筑立面: (parcel) =>
    `${parcel.landUse}建筑立面应与所在风貌和色彩分区协调，重点控制临街、临水及面向公共空间界面的材质、色彩、开窗和细部。`,
  建筑体量: () =>
    "结合周边城市空间尺度分解建筑体量和连续面宽，形成高低错落、疏密有致的群体关系，避免形成压迫性连续界面。",
  建筑控制线: () =>
    "结合公共空间、慢行联系和沿街界面确定建筑控制线；重要界面应保持连续有序，需要开敞的位置应通过退让形成公共空间。",
  城市记忆建筑引导: () =>
    "在方案阶段识别具有历史、工业或场所记忆价值的建筑与构筑物，明确保留、修缮、活化或意象延续方式。",
  开敞空间控制: (parcel) =>
    `在${parcel.landUse}地块内明确开敞空间的位置、边界和公共可达方式，并与周边公园、广场、街道及慢行系统连续衔接。`,
  全季节性滨水空间: () =>
    "结合丰枯水位和防洪安全组织可持续使用的滨水空间，保障滨水公共空间生态、开放、共享和连续可达。",
  "慢行优先区/道": () =>
    "优先组织连续、安全、无障碍的步行和骑行联系，衔接公共交通、公共空间及相邻地块，减少机动车流线干扰。",
  地块出入口: () =>
    "结合道路功能、公共交通、慢行系统和地形条件合理设置地块出入口，避免切断连续街道界面及主要步行流线。",
};

const COLOR_REQUIREMENTS: Record<string, string> = {
  明清老城色彩控制区:
    "建筑墙面与屋顶以中低明度、中低艳度暖灰色系为主，与城墙及明清历史环境的沉稳基调协调。",
  唐韵综合色彩控制区:
    "建筑墙面与屋顶色彩由冷灰向暖灰自然过渡，控制综合色彩数量和艳度，形成浑厚、华滋的整体形象。",
  文化宜居色彩控制区:
    "建筑墙面与屋顶以暖黄、暖灰色调为主，控制高艳度色彩的大面积使用，形成温润、雅致的色彩形象。",
  综合协调色彩控制区:
    "建筑色彩以中高明度暖色调为主、青灰色系为辅，形成淡彩、秀雅且具有节奏变化的整体形象。",
  历史协调色彩控制区:
    "建筑墙面与屋顶以中明度、中艳度的暖黄和暖灰色调为主，形成古朴、恢弘并与历史环境协调的形象。",
};

const STYLE_REQUIREMENTS: Record<string, string> = {
  现代风貌区:
    "建筑风格应体现现代、简洁、创新的片区气质；通过有序的体量组合、精细化立面和开放界面塑造具有活力的现代城市形象。",
  风貌协调区:
    "建筑体量、立面、材料和屋顶形式应与周边既有环境协调，控制突兀造型和高艳度材料，形成连续统一又有适度变化的街区风貌。",
  传统风貌区:
    "新建和改建建筑应延续传统空间尺度、街巷界面和地域性材料特征，严格控制高度、体量、色彩及屋顶形式。",
};

function areaBand(areaHa: number) {
  if (areaHa < 0.5) return "S＜0.5ha（参照0.5—1.5ha档，可不强制）";
  if (areaHa < 1.5) return "0.5ha≤S＜1.5ha";
  if (areaHa < 3) return "1.5ha≤S＜3ha";
  if (areaHa < 5) return "3ha≤S＜5ha";
  if (areaHa < 8) return "5ha≤S＜8ha";
  return "S≥8ha";
}

function landUseKind(landUse: string): LandUseKind {
  if (/道路/.test(landUse)) return "road";
  if (/公园绿地|防护绿地|广场用地/.test(landUse)) return "green";
  if (/中小学|幼儿园|医院/.test(landUse)) return "school-hospital";
  if (/工业|物流仓储/.test(landUse)) return "industry";
  if (/供电|消防|环卫|交通场站|停车场|市政|排水|供水|通信|燃气/.test(landUse)) return "municipal";
  return "building";
}

function overlapText(overlap: number) {
  if (overlap >= 99) return "完整位于该管控范围内";
  if (overlap >= 10) return `约${Math.round(overlap)}%面积位于该管控范围内`;
  return `约${overlap.toFixed(1)}%面积位于该管控范围内`;
}

function makeRule(
  parcel: ParcelRuleInput,
  seed: Omit<ParcelDerivedRule, "id"> & { idSeed: string },
): ParcelDerivedRule {
  return {
    id: `${parcel.id}-${seed.idSeed}`,
    group: seed.group,
    element: seed.element,
    requirement: seed.requirement,
    strength: seed.strength,
    trigger: seed.trigger,
    provenance: seed.provenance,
    controlId: seed.controlId,
  };
}

function specialLandUseRules(parcel: ParcelRuleInput): ParcelDerivedRule[] {
  const kind = landUseKind(parcel.landUse);
  const trigger = `${parcel.landUse}，${areaBand(parcel.areaHa)}`;

  if (kind === "school-hospital") {
    return [makeRule(parcel, {
      idSeed: "special-interface",
      group: "特殊项目适用",
      element: "街道界面控制",
      requirement:
        "学校、医院类项目仅对通透率和墙面绿视率提出建议；建筑高宽比、同高率、街道高宽比、首层开放空间、口袋公园和城市绿道不设一般控制区具体指标，按专业规范深化。",
      strength: "条件适用",
      trigger,
      provenance: "导则·城市一般控制区第3.5.3条，由地块用地性质触发。",
    })];
  }

  if (kind === "industry") {
    return [makeRule(parcel, {
      idSeed: "special-industry",
      group: "特殊项目适用",
      element: "工业建筑形态",
      requirement:
        "工业建筑应在满足生产工艺的前提下避免呆板造型；沿主要界面宜采用垂直绿化、立面构件和有序屋顶处理，综合楼、办公楼参照公共建筑要求深化。",
      strength: "必选",
      trigger,
      provenance: "导则·城市一般控制区第3.5.4条，由工业或物流仓储用地触发。",
    })];
  }

  if (kind === "municipal") {
    return [makeRule(parcel, {
      idSeed: "special-municipal",
      group: "特殊项目适用",
      element: "设施形态与环境协调",
      requirement:
        "综合楼、办公楼参照公共建筑要求；设施主体按相关专业标准控制，并在建筑体量、立面、绿化遮蔽及出入口组织方面与周边环境协调。",
      strength: "条件适用",
      trigger,
      provenance: "导则·城市一般控制区第3.5.5条，由市政交通设施用地触发。",
    })];
  }

  if (kind === "green") {
    return [makeRule(parcel, {
      idSeed: "green-open-space",
      group: "用地功能深化",
      element: "绿地与开放空间",
      requirement:
        "保持绿地的公共开放属性和生态连续性，优先衔接周边慢行系统、公共空间节点及绿道，不设置阻断公共通行和景观联系的封闭界面。",
      strength: "必选",
      trigger,
      provenance: "导则·城市一般控制区关于公共空间系统和绿道贯通的要求，由绿地性质触发。",
    })];
  }

  if (kind === "road") {
    return [makeRule(parcel, {
      idSeed: "road-applicability",
      group: "适用性说明",
      element: "道路空间衔接",
      requirement:
        "该地块为道路用地，不套用建设地块的建筑类指标；涉及开放空间、慢行和重点地区交通空间要求时，应在道路专项设计中衔接落实。",
      strength: "条件适用",
      trigger,
      provenance: "依据导则地块详则适用范围和专项规划衔接要求进行适用性处理。",
    })];
  }

  return [];
}

function keyZoneStrengths(control: ControlRuleInput): Record<string, RuleStrength> | null {
  const subtype = `${control.subtype}${control.type}${control.title}`;
  const levelOne = control.level.includes("一级");

  if (/灞河|浐河|重要滨水/.test(subtype)) {
    return levelOne
      ? Object.fromEntries([
          "高点建筑布局", "第五立面", "建筑立面", "建筑体量", "建筑控制线",
          "开敞空间控制", "全季节性滨水空间", "慢行优先区/道", "地块出入口",
        ].map((element) => [element, "必选"]))
      : {
          高点建筑布局: "可选", 第五立面: "可选", 建筑立面: "必选", 建筑体量: "可选",
          建筑控制线: "必选", 开敞空间控制: "必选", 全季节性滨水空间: "必选",
          "慢行优先区/道": "可选", 地块出入口: "必选",
        };
  }

  if (/渭河|泾河|重要川塬/.test(subtype)) {
    return {
      高点建筑布局: "必选", 第五立面: "必选", 建筑立面: "必选", 建筑体量: "必选",
      建筑控制线: "可选", 开敞空间控制: "必选", "慢行优先区/道": "必选", 地块出入口: "必选",
    };
  }

  if (/城市出入口门户|城市立交出入口/.test(subtype)) {
    return {
      地块出入口: "必选", "慢行优先区/道": "可选", 开敞空间控制: "必选",
      高点建筑布局: "必选", 第五立面: "可选", 建筑体量: "可选",
    };
  }

  if (/商务中心区/.test(subtype)) {
    return {
      高点建筑布局: "必选", 建筑体量: "必选", 建筑控制线: "必选", 城市记忆建筑引导: "必选",
      开敞空间控制: "必选", 全季节性滨水空间: levelOne ? "必选" : "可选",
      地块出入口: "必选", "慢行优先区/道": "必选",
    };
  }

  if (/产业园区核心区/.test(subtype)) {
    return {
      高点建筑布局: "必选", 建筑体量: "必选", 建筑控制线: levelOne ? "必选" : "可选",
      城市记忆建筑引导: "必选", 开敞空间控制: "必选", 全季节性滨水空间: "可选",
      地块出入口: levelOne ? "必选" : "可选", "慢行优先区/道": "必选",
    };
  }

  return null;
}

function keyZoneRules(
  parcel: ParcelRuleInput,
  relationship: ParcelRelationship,
  control: ControlRuleInput,
): ParcelDerivedRule[] {
  const strengths = keyZoneStrengths(control);
  if (!strengths) return [];
  const kind = landUseKind(parcel.landUse);

  return Object.entries(strengths)
    .filter(([element]) => !(kind === "road" && ELEMENT_GROUP[element] === "建筑形态"))
    .filter(([element]) => !(kind === "green" && ELEMENT_GROUP[element] === "建筑形态"))
    .map(([element, strength]) => makeRule(parcel, {
      idSeed: `${control.id}-${element}`,
      group: `重点地区附加·${ELEMENT_GROUP[element]}`,
      element,
      requirement: ELEMENT_REQUIREMENT[element](parcel),
      strength,
      trigger: `${control.title}（${control.level || "未分级"}·${control.subtype || control.type}），${overlapText(relationship.overlap)}`,
      provenance: `城市设计管控数据GDB确定空间范围；导则重点控制区要素选取表确定“${element}”为${strength}要素。`,
      controlId: control.id,
    }));
}

function contextualRules(
  parcel: ParcelRuleInput,
  relationship: ParcelRelationship,
  control: ControlRuleInput,
): ParcelDerivedRule[] {
  const trigger = `${control.title}，${overlapText(relationship.overlap)}`;
  const kind = landUseKind(parcel.landUse);

  if (control.layerKey === "key-zone") {
    return keyZoneRules(parcel, relationship, control);
  }

  if (control.layerKey === "color" && kind !== "green" && kind !== "road") {
    return [makeRule(parcel, {
      idSeed: `${control.id}-color`,
      group: "风貌色彩分解",
      element: "建筑色彩",
      requirement: COLOR_REQUIREMENTS[control.title] ?? `建筑墙面与屋顶色彩应落实${control.title}的总体基调，并在方案中提交综合色彩控制说明。`,
      strength: "必选",
      trigger,
      provenance: `城市设计管控数据GDB确定${control.title}范围；导则城市色彩引导内容转换为地块墙面与屋顶色彩要求。`,
      controlId: control.id,
    })];
  }

  if (control.layerKey === "character" && kind !== "green" && kind !== "road") {
    return [makeRule(parcel, {
      idSeed: `${control.id}-character`,
      group: "风貌色彩分解",
      element: "建筑风貌与形态",
      requirement: STYLE_REQUIREMENTS[control.title] ?? `建筑体量、立面、材料与屋顶形式应落实${control.title}的总体风貌定位，并与周边城市空间协调。`,
      strength: "必选",
      trigger,
      provenance: `城市设计管控数据GDB确定${control.title}范围；单元风貌意图分解为地块建筑形态要求。`,
      controlId: control.id,
    })];
  }

  if (control.layerKey === "open-space") {
    let element = "开放空间衔接";
    let requirement = "地块开敞空间应与周边公共空间、绿地和慢行系统连续衔接，保障公共可达和空间开放。";
    if (/三楔/.test(`${control.type}${control.subtype}`)) {
      element = "楔形绿廊贯通";
      requirement = "不得阻断楔形绿廊的生态、景观和慢行连续性；地块边界应采用开放或通透处理，并通过绿化和步行联系衔接绿廊。";
    } else if (/三环/.test(`${control.type}${control.subtype}`)) {
      element = "人文展示环衔接";
      requirement = "沿人文展示环组织连续的公共界面、步行联系和文化展示空间，建筑与场地设计应回应沿线历史文化特征。";
    } else if (/公共空间节点/.test(`${control.type}${control.subtype}`)) {
      element = "公共空间节点落实";
      requirement = kind === "green"
        ? "将该地块作为公共空间节点的重要组成，保障全天候公共开放、活动承载、绿地连续和慢行可达。"
        : "结合首层开放空间、转角退让或公共通道形成可识别的公共空间节点，并与周边慢行和公共空间系统连续连接。";
    }
    return [makeRule(parcel, {
      idSeed: `${control.id}-open-space`,
      group: "开放空间分解",
      element,
      requirement,
      strength: "必选",
      trigger,
      provenance: `城市设计管控数据GDB确定${control.title}影响范围；单元开放空间体系分解为地块空间和界面要求。`,
      controlId: control.id,
    })];
  }

  if (control.layerKey === "structure" && kind !== "road") {
    return [makeRule(parcel, {
      idSeed: `${control.id}-structure`,
      group: "空间结构分解",
      element: "城市核心空间响应",
      requirement: "结合地块功能强化城市核心的识别性和公共性，组织连续公共界面、标志性节点及可达的公共空间，避免封闭、割裂的空间布局。",
      strength: "条件适用",
      trigger,
      provenance: `城市设计管控数据GDB确定${control.title}范围；特色空间结构意图分解为地块空间组织要求。`,
      controlId: control.id,
    })];
  }

  return [];
}

export function deriveParcelRules(
  parcel: ParcelRuleInput,
  controlMap: ReadonlyMap<string, ControlRuleInput>,
): ParcelDerivedRule[] {
  const rules = [...specialLandUseRules(parcel)];

  for (const relationship of parcel.contextControls ?? []) {
    const control = controlMap.get(relationship.id);
    if (!control) continue;
    rules.push(...contextualRules(parcel, relationship, control));
  }

  const priority: Record<RuleStrength, number> = { 必选: 3, 条件适用: 2, 可选: 1 };
  const merged = new Map<string, ParcelDerivedRule>();

  for (const rule of rules) {
    const existing = merged.get(rule.element);
    if (!existing) {
      merged.set(rule.element, { ...rule });
      continue;
    }

    if (!existing.trigger.includes(rule.trigger)) {
      existing.trigger = `${existing.trigger}；${rule.trigger}`;
    }
    if (!existing.provenance.includes(rule.provenance)) {
      existing.provenance = `${existing.provenance}；${rule.provenance}`;
    }
    if (priority[rule.strength] > priority[existing.strength]) {
      existing.strength = rule.strength;
      existing.requirement = rule.requirement;
      existing.group = rule.group;
      existing.controlId = rule.controlId;
    }
  }

  return [...merged.values()].sort((a, b) =>
    priority[b.strength] - priority[a.strength] || a.group.localeCompare(b.group, "zh-CN"),
  );
}

export function parcelAreaBand(areaHa: number) {
  return areaBand(areaHa);
}

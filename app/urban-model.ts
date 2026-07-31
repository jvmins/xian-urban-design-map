import type { CatalogItem, CatalogLevel } from "./catalog-data";

export type UnitId = "north" | "east" | "south" | "west" | "core";

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Parcel = Bounds & {
  id: string;
  index: number;
  cx: number;
  cy: number;
  unit: UnitId;
  landUse: "居住" | "商办" | "公共服务" | "产业研发" | "绿地";
};

export type UnitDefinition = {
  id: UnitId;
  code: string;
  name: string;
  role: string;
  color: string;
  bounds: Bounds;
  columns: number;
  rows: number;
  label: [number, number];
};

export type RoadClass = "快速路" | "主干路" | "次干路" | "支路";

export type Road = {
  id: string;
  name: string;
  roadClass: RoadClass;
  path: string;
  label?: [number, number, number];
};

export type ChainStage = {
  object: string;
  responsibility: string;
  required: string[];
  output: string;
};

export type ChainProfile = {
  title: string;
  thesis: string;
  region: ChainStage;
  unit: ChainStage;
  parcel: ChainStage;
  relation: string;
  trigger: string;
  mergeRule: string;
};

export type ReviewItem = {
  id: string;
  name: string;
  criterion: string;
};

export const units: UnitDefinition[] = [
  {
    id: "north",
    code: "N",
    name: "北部门户单元",
    role: "综合枢纽与门户形象",
    color: "#5f7f86",
    bounds: { x: 5, y: 5, width: 110, height: 31 },
    columns: 15,
    rows: 8,
    label: [96, 12],
  },
  {
    id: "west",
    code: "W",
    name: "西部更新单元",
    role: "存量织补与历史风貌协调",
    color: "#7b6b83",
    bounds: { x: 5, y: 36, width: 31, height: 48 },
    columns: 8,
    rows: 15,
    label: [19, 44],
  },
  {
    id: "core",
    code: "C",
    name: "中央核心单元",
    role: "片区公共中心与重点发展区",
    color: "#c95942",
    bounds: { x: 36, y: 36, width: 48, height: 48 },
    columns: 12,
    rows: 10,
    label: [68, 44],
  },
  {
    id: "east",
    code: "E",
    name: "东部活力单元",
    role: "创新产业与活力界面",
    color: "#b27a42",
    bounds: { x: 84, y: 36, width: 31, height: 48 },
    columns: 8,
    rows: 15,
    label: [100, 44],
  },
  {
    id: "south",
    code: "S",
    name: "南部生态单元",
    role: "滨水生态与公共开放空间",
    color: "#61845f",
    bounds: { x: 5, y: 84, width: 110, height: 31 },
    columns: 15,
    rows: 8,
    label: [96, 109],
  },
];
export const unitById = Object.fromEntries(
  units.map((unit) => [unit.id, unit]),
) as Record<UnitId, UnitDefinition>;

function landUseFor(unit: UnitId, column: number, row: number): Parcel["landUse"] {
  if (unit === "core") {
    if ((column + row) % 11 === 0) return "绿地";
    if ((column + row) % 5 === 0) return "公共服务";
    return (column + row) % 2 === 0 ? "商办" : "居住";
  }
  if (unit === "north") {
    if (row < 2 && column > 5 && column < 10) return "公共服务";
    return (column + row) % 4 === 0 ? "商办" : "居住";
  }
  if (unit === "east") {
    return (column + row) % 5 === 0 ? "公共服务" : "产业研发";
  }
  if (unit === "south") {
    if (row > 4 || column % 7 === 0) return "绿地";
    return "居住";
  }
  if ((column + row) % 7 === 0) return "公共服务";
  return (column + row) % 3 === 0 ? "商办" : "居住";
}

export function generateParcels(): Parcel[] {
  let globalIndex = 0;
  return units.flatMap((unit) => {
    const cellWidth = unit.bounds.width / unit.columns;
    const cellHeight = unit.bounds.height / unit.rows;
    return Array.from({ length: unit.columns * unit.rows }, (_, localIndex) => {
      const column = localIndex % unit.columns;
      const row = Math.floor(localIndex / unit.columns);
      const inset = unit.id === "core" ? 0.28 : 0.22;
      const x = unit.bounds.x + column * cellWidth + inset;
      const y = unit.bounds.y + row * cellHeight + inset;
      const width = cellWidth - inset * 2;
      const height = cellHeight - inset * 2;
      globalIndex += 1;
      return {
        id: `${unit.code}-${String(localIndex + 1).padStart(3, "0")}`,
        index: globalIndex,
        x,
        y,
        width,
        height,
        cx: x + width / 2,
        cy: y + height / 2,
        unit: unit.id,
        landUse: landUseFor(unit.id, column, row),
      };
    });
  });
}

export const roads: Road[] = [
  {
    id: "RING-01",
    name: "片区外环快速路",
    roadClass: "快速路",
    path: "M 5 5 H 115 V 115 H 5 Z",
  },
  {
    id: "A-01",
    name: "北城大道",
    roadClass: "主干路",
    path: "M 5 36 H 115",
    label: [13, 35.2, 0],
  },
  {
    id: "A-02",
    name: "中央大道",
    roadClass: "主干路",
    path: "M 5 60 H 115",
    label: [67, 59.2, 0],
  },
  {
    id: "A-03",
    name: "南城大道",
    roadClass: "主干路",
    path: "M 5 84 H 115",
    label: [93, 83.2, 0],
  },
  {
    id: "A-04",
    name: "都会路",
    roadClass: "主干路",
    path: "M 60 5 V 115",
    label: [59.2, 27, -90],
  },
  {
    id: "A-05",
    name: "西环干路",
    roadClass: "主干路",
    path: "M 36 5 V 115",
    label: [35.2, 73, -90],
  },
  {
    id: "A-06",
    name: "东环干路",
    roadClass: "主干路",
    path: "M 84 5 V 115",
    label: [83.2, 73, -90],
  },
  {
    id: "A-07",
    name: "门户大道",
    roadClass: "主干路",
    path: "M 10 12 C 36 18, 72 13, 110 29",
    label: [72, 18, 12],
  },
  {
    id: "S-01",
    name: "启明路",
    roadClass: "次干路",
    path: "M 20 5 V 115",
    label: [19.5, 28, -90],
  },
  {
    id: "S-02",
    name: "文景路",
    roadClass: "次干路",
    path: "M 48 5 V 115",
    label: [47.5, 48, -90],
  },
  {
    id: "S-03",
    name: "科创路",
    roadClass: "次干路",
    path: "M 72 5 V 115",
    label: [71.5, 106, -90],
  },
  {
    id: "S-04",
    name: "东望路",
    roadClass: "次干路",
    path: "M 100 5 V 115",
    label: [99.5, 69, -90],
  },
  {
    id: "S-05",
    name: "栖居街",
    roadClass: "次干路",
    path: "M 5 20 H 115",
    label: [26, 19.4, 0],
  },
  {
    id: "S-06",
    name: "兴业街",
    roadClass: "次干路",
    path: "M 5 48 H 115",
    label: [89, 47.4, 0],
  },
  {
    id: "S-07",
    name: "和鸣街",
    roadClass: "次干路",
    path: "M 5 72 H 115",
    label: [42, 71.4, 0],
  },
  {
    id: "S-08",
    name: "滨河街",
    roadClass: "次干路",
    path: "M 5 100 H 115",
    label: [79, 99.4, 0],
  },
  ...[12, 28, 43, 54, 66, 77, 92, 108].map<Road>((x, index) => ({
    id: `L-V-${index + 1}`,
    name: `支路${index + 1}`,
    roadClass: "支路",
    path: `M ${x} 5 V 115`,
  })),
  ...[12, 28, 43, 54, 66, 77, 92, 108].map<Road>((y, index) => ({
    id: `L-H-${index + 1}`,
    name: `街巷${index + 1}`,
    roadClass: "支路",
    path: `M 5 ${y} H 115`,
  })),
];

const boundaryProfile: ChainProfile = {
  title: "法定范围与完整性边界",
  thesis: "范围不是设计意向，而是对象完整性、控制分区覆盖和传导无漏项的检查边界。",
  region: {
    object: "片区范围面",
    responsibility: "界定跨单元共同问题的完整研究范围，并挂接上位来源与目标单元。",
    required: ["统一底图与坐标基准", "目标单元清单", "跨单元对象整体性", "成果版本"],
    output: "形成分单元任务边界，不替代单元法定成果。",
  },
  unit: {
    object: "单元范围面",
    responsibility: "作为六类11项对象及一般/重点控制区完整覆盖的验收边界。",
    required: ["单元编号", "现行地块底图", "控制区无重叠无留白", "标准图层完整"],
    output: "逐地块形成适用性判定的空间母集。",
  },
  parcel: {
    object: "现行地块边界",
    responsibility: "调用法定地块编号定位要求，不重复建立完整空间图层。",
    required: ["所属单元", "用地性质", "相邻道路", "控制分区", "适用规则包"],
    output: "每项要求可上溯单元对象、下定位图则实体。",
  },
  relation: "范围包含 / 地块中心点落入",
  trigger: "目标地块属于现行单元范围",
  mergeRule: "边界冲突转人工复核，不得自动覆盖法定地块边界。",
};

const chainProfiles: Record<string, ChainProfile> = {
  boundary: boundaryProfile,
  core: {
    title: "核心与公共中心组织",
    thesis: "片区确定主导功能与总体关系，单元组织空间系统，地块落实可审查的功能、体量和公共空间对象。",
    region: {
      object: "片区核心范围",
      responsibility: "明确核心级别、主导功能、总体目标及与轴带、中心、门户的关系。",
      required: ["位置与范围", "主导功能", "影响单元", "关键接口"],
      output: "向相关单元下达功能关系、公共空间组织及待量化事项。",
    },
    unit: {
      object: "单元核心面 + 中心点/范围",
      responsibility: "落实功能结构、公共空间骨架、强度与高度秩序、标志节点。",
      required: ["边界可定位", "功能可填写", "公共空间成网", "高度体量可校核"],
      output: "分地块明确继承、细化、强化、新增或不适用。",
    },
    parcel: {
      object: "体量控制面 + 首层开放面 + 高点/慢行接口",
      responsibility: "生成可进入附加图则、规划条件和项目审查的对象与要求。",
      required: ["适用对象", "控制值或判断条件", "控制性质", "计算/审查方法"],
      output: "功能组织、公共空间、高度体量、慢行联系和标志节点要求。",
    },
    relation: "地块中心点位于单元核心或中心影响范围",
    trigger: "空间包含，且功能/控制区规则包匹配",
    mergeRule: "同目标要素归并；上位批准成果和刚性要求优先。",
  },
  axis: {
    title: "跨单元轴线到沿街图则",
    thesis: "轴线在三个尺度不是同一条线：片区控制整体结构，单元形成线—面成组对象，地块生成界面、控制线和高度节奏。",
    region: {
      object: "轴线中心线 + 影响范围",
      responsibility: "统筹起讫节点、空间联系、跨单元连续性和总体高度/界面秩序。",
      required: ["起讫节点", "影响范围", "跨单元接口", "连续性问题"],
      output: "按单元拆分任务，统一接口编号，分割后可还原完整对象。",
    },
    unit: {
      object: "单元轴线 + 轴线影响范围",
      responsibility: "细化道路依托、节点、连续界面、开放空间和高点序列。",
      required: ["中心线与控制范围成组", "道路名称/等级", "接口编号", "重点地块"],
      output: "向相交或邻接地块下达不同目标要素的转译任务。",
    },
    parcel: {
      object: "建筑控制线 + 连续/活力界面 + 高点 + 开放空间",
      responsibility: "以地块边界和沿街计算界面形成可量测、可验收的图则实体。",
      required: ["退界位置", "界面连续率", "高度/高宽比条件", "慢行接口"],
      output: "附加图则中的线、点、面及对应审查条款，不复制单元影响范围。",
    },
    relation: "地块与轴线影响范围相交，且临轴道路界面成立",
    trigger: "相交面积 > 0 或沿街界面长度达到适用条件",
    mergeRule: "按控制线、界面、高度、开放空间分别归并；矛盾值转人工复核。",
  },
  center: {
    title: "中心节点到复合活力地块",
    thesis: "片区识别中心体系，单元确定点—面服务关系，地块落实首层开放、功能复合和步行连接。",
    region: {
      object: "片区中心点 + 中心范围",
      responsibility: "确定中心级别、主导功能、服务关系及与轴线/门户的联系。",
      required: ["中心级别", "主导功能", "服务范围", "系统关系"],
      output: "向所在单元提出功能复合与公共空间深化任务。",
    },
    unit: {
      object: "单元中心点 + 中心范围",
      responsibility: "组织公共空间、首层功能、强度与高度秩序和步行网络。",
      required: ["点位落在范围内", "功能复合方向", "开放空间骨架", "步行接口"],
      output: "确定承担中心功能的地块及相邻协同地块。",
    },
    parcel: {
      object: "首层开放空间 + 公共空间节点 + 活力界面",
      responsibility: "落实可开放的边界、面积、进深、净高、出入口和开放时段。",
      required: ["空间边界", "面积/比例", "公共属性", "连续关系"],
      output: "形成首层开放、功能复合、公共空间和步行联系审查要求。",
    },
    relation: "地块与中心服务范围相交并承担公共活动",
    trigger: "空间相交 + 功能适配 + 临公共空间界面",
    mergeRule: "中心、核心和公共空间来源按目标要素合并，不重复下达同类要求。",
  },
  wedge: {
    title: "生态绿楔到建设退让",
    thesis: "片区维护生态楔入关系，单元明确可定位边界与限制，地块形成退让线和连续绿化空间。",
    region: {
      object: "片区生态绿楔面",
      responsibility: "识别生态来源、楔入方向、连接目标和跨单元完整性。",
      required: ["完整边界", "生态源地", "连续性", "受影响单元"],
      output: "形成各单元生态边界与断点修复任务。",
    },
    unit: {
      object: "单元生态绿楔面",
      responsibility: "落实生态边界、建设限制、有效宽度和公共开放关系。",
      required: ["边界坐标", "建设限制范围", "有效宽度", "地块接口"],
      output: "向相交地块传导生态边界、退让、连续绿化和开敞空间。",
    },
    parcel: {
      object: "生态连续空间 + 建筑控制线 + 开放空间",
      responsibility: "将生态边界转为建设退让、禁止建设面和可达性要求。",
      required: ["退让距离依据", "连续绿化宽度", "允许活动", "相邻接口"],
      output: "图则中的控制面、退让线和接口编号。",
    },
    relation: "地块与绿楔范围相交或紧邻生态边界",
    trigger: "相交面积 > 0 或边界邻接",
    mergeRule: "生态刚性边界优先；与道路、地块边界冲突转人工复核。",
  },
  ring: {
    title: "城市绿环到连续绿道",
    thesis: "绿环以整体连续性为片区目标，经单元确认线位和宽度，最终在地块形成绿道、出入口和跨界接口。",
    region: {
      object: "绿环中心线 + 控制范围",
      responsibility: "控制整体线位、联系对象、连续性与跨单元断点。",
      required: ["闭合关系", "总体宽度", "断点清单", "统一接口"],
      output: "按单元分割并保持可还原的中心线/范围对象。",
    },
    unit: {
      object: "单元绿环中心线 + 控制范围",
      responsibility: "细化有效宽度、慢行路径、节点、断点修复和接口。",
      required: ["线面成组", "有效宽度", "服务对象", "接口编号"],
      output: "确定需提供绿道空间、出入口和连续界面的目标地块。",
    },
    parcel: {
      object: "城市绿道线 + 控制范围 + 出入口点",
      responsibility: "落实绿道有效宽度、开放属性、连续性和相邻地块接口。",
      required: ["中心线", "有效宽度", "出入口", "接口编号"],
      output: "可直接用于附加图则与项目总平审查。",
    },
    relation: "绿环中心线或控制范围穿越地块",
    trigger: "中心线相交或控制范围覆盖",
    mergeRule: "同一接口只保留一个稳定编号，断点不得以地块边界为由中断。",
  },
  corridor: {
    title: "生态廊道到蓝绿连续空间",
    thesis: "廊道从区域生态联系逐级变成有边界、有缓冲、有公共可达条件的地块空间。",
    region: {
      object: "生态廊道中心线 + 控制范围",
      responsibility: "统筹生态源地、蓝绿联系、总体走向和跨单元接口。",
      required: ["起讫对象", "有效宽度", "连续性", "断点风险"],
      output: "形成分单元边界、宽度和断点修复任务。",
    },
    unit: {
      object: "单元廊道中心线 + 缓冲范围",
      responsibility: "落实生态缓冲、建设限制、公共可达和蓝绿连续。",
      required: ["线面成组", "缓冲分级", "建设限制", "接口编号"],
      output: "触发相交地块的生态空间、退让、绿道与出入口规则。",
    },
    parcel: {
      object: "生态连续空间 + 岸线/退让线 + 绿道",
      responsibility: "明确禁止/限制建设面、公共通行线和可达入口。",
      required: ["边界与宽度", "建设限制", "开放条件", "审查断面"],
      output: "控制面、中心线、界面线和项目审查断面。",
    },
    relation: "地块与生态廊道控制范围相交",
    trigger: "相交面积 > 0，或承接上下游接口",
    mergeRule: "蓝绿连续和刚性退让优先；断点必须进入冲突复核。",
  },
  public: {
    title: "公共空间体系到可开放实体",
    thesis: "公共空间由片区节点网络，经单元点—面成组定位，落到地块边界、面积、出入口和管理属性。",
    region: {
      object: "公共空间节点体系",
      responsibility: "确定节点等级、服务关系及与轴线、绿环、廊道的网络联系。",
      required: ["节点等级", "服务范围", "系统连接", "目标单元"],
      output: "向各单元下达位置校准、功能与连接任务。",
    },
    unit: {
      object: "公共空间节点点 + 范围面",
      responsibility: "落实位置、边界、面积、功能、服务对象和可达关系。",
      required: ["点位在范围内", "边界/面积", "出入口方向", "连接通道"],
      output: "识别承载节点及连接通道的目标地块。",
    },
    parcel: {
      object: "开放空间面 + 节点点 + 出入口/慢行线",
      responsibility: "明确开放边界、面积、公共属性、首层开放和连接方式。",
      required: ["面积/最小宽度", "出入口", "开放时段", "管理属性"],
      output: "公共空间图则实体与可达性审查规则。",
    },
    relation: "地块与节点范围相交、邻接或承担连接通道",
    trigger: "空间相交/邻接 + 公共活动功能",
    mergeRule: "节点、开放空间和慢行来源按实体关联成组，避免只画点不落范围。",
  },
  character: {
    title: "风貌分区到建筑形态审查",
    thesis: "片区建立总体风貌秩序，单元形成完整覆盖分区，地块将其转成屋顶、立面、材质、尺度与重点界面要求。",
    region: {
      object: "片区风貌分区面",
      responsibility: "建立传统、协调、现代等总体形象关系与高度秩序。",
      required: ["范围完整覆盖", "形象定位", "群体关系", "待量化事项"],
      output: "向单元下达建筑群体和重点界面深化任务。",
    },
    unit: {
      object: "单元风貌分区面",
      responsibility: "细化建筑形态、尺度、屋顶、立面、材质和重点界面。",
      required: ["无依据不重叠不留白", "形态规则", "重点界面", "正负面要求"],
      output: "逐地块明确适用分区与审查要点。",
    },
    parcel: {
      object: "风貌保护面 + 历史街巷/连续界面线",
      responsibility: "区分保护、保留、恢复、整治与新建协调对象。",
      required: ["对象分类", "高度体量", "屋顶/立面", "材质与界面"],
      output: "形成建筑设计审查条款和正负面图则。",
    },
    relation: "地块位于风貌分区并涉及重点界面",
    trigger: "分区包含 + 建设行为/界面类型匹配",
    mergeRule: "历史保护类刚性要求优先，其他形态要求不得降低其约束。",
  },
  color: {
    title: "色彩秩序到材料配色",
    thesis: "色彩控制由总体分区逐级细化为适用建筑和重点界面的材料色方案。",
    region: {
      object: "片区色彩分区面",
      responsibility: "确定总体色彩秩序、主辅关系和重点地区。",
      required: ["完整覆盖", "主辅关系", "禁用方向", "目标单元"],
      output: "向单元下达色卡与适用建筑深化事项。",
    },
    unit: {
      object: "单元色彩分区面",
      responsibility: "明确主色、辅色、点缀色、禁用色、色卡和重点界面。",
      required: ["色卡编号", "适用建筑", "材质关联", "重点界面"],
      output: "逐地块加载适用色彩规则包。",
    },
    parcel: {
      object: "重点界面线 + 材料色要求",
      responsibility: "将色卡落实到立面分段、屋顶、基座与点缀部位。",
      required: ["材料色", "适用部位", "允许比例", "样板审查方法"],
      output: "立面报审可核验的色彩与材质条款。",
    },
    relation: "地块位于色彩分区，建筑界面属于适用对象",
    trigger: "分区包含 + 建筑类型/界面匹配",
    mergeRule: "禁用色优先于点缀色建议，重点界面要求优先于一般分区引导。",
  },
  view: {
    title: "眺望系统到高度包络",
    thesis: "片区组织完整眺望关系，单元开展点—线—面成组校核，地块形成高度包络、视线退让和第五立面控制。",
    region: {
      object: "眺望点 + 景观对象 + 中心线 + 视廊范围",
      responsibility: "以同一眺望关系编号表达观察高程、近中远景和遮挡风险。",
      required: ["观察点/高程", "景观对象", "中心线", "视廊/视域"],
      output: "向相关单元下达高度秩序和遮挡校核任务。",
    },
    unit: {
      object: "单元眺望关系点—线—面组",
      responsibility: "校准视线、分景、建筑高度包络和天际线。",
      required: ["关系编号", "观察高程", "控制范围", "三维校核结论"],
      output: "识别进入视廊的地块及其高度/退让条件。",
    },
    parcel: {
      object: "视廊控制面 + 天际线控制线 + 高点",
      responsibility: "落实高度包络、视线退让、第五立面和遮挡控制。",
      required: ["限高依据", "剖切面", "观察点", "复核模型版本"],
      output: "图则高度控制对象及项目三维校核任务。",
    },
    relation: "地块建筑包络与视廊控制体相交",
    trigger: "空间相交 + 基准高程/拟建高度条件",
    mergeRule: "控制值不一致不得自动择一，进入三维冲突复核。",
  },
  control: {
    title: "候选识别到唯一规则包",
    thesis: "片区只能提出候选，单元确认现行控制区与唯一重点类型，地块据此加载一般或重点附加图则。",
    region: {
      object: "重点控制区候选范围",
      responsibility: "提出候选范围、建议级别、唯一建议类型、划定依据和核心问题。",
      required: ["研究状态", "建议级别", "唯一建议类型", "目标单元"],
      output: "仅进入研究成果库，不直接形成现行地块要求。",
    },
    unit: {
      object: "一般控制区 + 重点控制区",
      responsibility: "完整覆盖单元且互不重叠，确认级别、唯一重点类型与重点地块。",
      required: ["覆盖完整", "级别", "唯一重点类型", "划定依据"],
      output: "逐地块确定一般或重点控制规则包。",
    },
    parcel: {
      object: "控制分区面 + 附加图则对象",
      responsibility: "加载一般8项适用矩阵或一种重点类型强化要求。",
      required: ["适用性判定", "规则包", "图则索引", "审查方法"],
      output: "一般/重点附加图则及项目审查任务。",
    },
    relation: "地块位于单元一般或重点控制区",
    trigger: "控制分区确定；重点类型必须唯一",
    mergeRule: "重点强化不得降低上位刚性要求，多重点类型冲突转人工复核。",
  },
};

export function profileKeyFor(item: CatalogItem): keyof typeof chainProfiles {
  const text = `${item.name}${item.group}${item.content}`;
  if (/轴线|建筑控制线|连续界面|活力界面|通透率|高宽比|街道高宽比/.test(text)) {
    return "axis";
  }
  if (/中心(?!线)|站城一体化/.test(text)) return "center";
  if (/绿楔/.test(text)) return "wedge";
  if (/绿环|城市绿道|慢行联系/.test(text)) return "ring";
  if (/生态廊道|生态连续|岸线|滨水/.test(text)) return "corridor";
  if (/公共空间|口袋公园|首层开放|出入口/.test(text)) return "public";
  if (/色彩/.test(text)) return "color";
  if (/眺望|景观标志|视线|视廊|天际线|建筑高点/.test(text)) return "view";
  if (/风貌|历史|墙面绿视率/.test(text)) return "character";
  if (/控制区|分期建设/.test(text)) return "control";
  if (/核心|建筑体量|同高率/.test(text)) return "core";
  return "boundary";
}

export function getChainProfile(item: CatalogItem): ChainProfile {
  return chainProfiles[profileKeyFor(item)];
}

export const levelPrinciples: Record<
  CatalogLevel,
  { verb: string; question: string; depth: string; evidence: string[] }
> = {
  region: {
    verb: "统筹",
    question: "跨单元的整体结构、系统连续性和共同问题是什么？",
    depth: "达到可分解到具体单元的深度，不停留在概念意向。",
    evidence: ["完整空间对象", "目标单元清单", "接口与待深化问题", "研究/现行状态"],
  },
  unit: {
    verb: "落实",
    question: "六类11项如何形成边界可定位、属性可填、规则可转译的标准对象？",
    depth: "形成单元空间系统、控制分区和分地块任务。",
    evidence: ["点线面成组对象", "来源与传导方式", "一般/重点控制区", "三维校核结论"],
  },
  parcel: {
    verb: "转译",
    question: "哪些要求适用，如何成为可量测、可验收、可关联图则的控制对象？",
    depth: "可直接形成附加图则、规划条件与项目审查规则。",
    evidence: ["数值或判断条件", "控制性质与依据", "计算/审查方法", "图则实体索引"],
  },
};

export const reviewChecklist: ReviewItem[] = [
  {
    id: "Q-01",
    name: "城市底图",
    criterion: "快速路、主干路、次干路、支路四级路网与600个地块共同构成可读街坊。",
  },
  {
    id: "Q-02",
    name: "尺度职责",
    criterion: "片区统筹、单元落实、地块转译，三个尺度的问题与成果对象明确不同。",
  },
  {
    id: "Q-03",
    name: "对象完整",
    criterion: "20/21/29类标准要素完整，线+范围、点+范围等成组关系可识别。",
  },
  {
    id: "Q-04",
    name: "传导可追溯",
    criterion: "来源对象、处置方式、目标对象、规则与图则成果形成连续证据链。",
  },
  {
    id: "Q-05",
    name: "规则转译",
    criterion: "地块要求经过六步作业生成，不把单元对象直接复制到地块。",
  },
  {
    id: "Q-06",
    name: "专业可读性",
    criterion: "道路、单位、地块、要素、控制对象和审查提示具有稳定图例与层级。",
  },
];

import type { CatalogItem, CatalogLevel, GeometryType } from "./catalog-data";
import type { Parcel, UnitId } from "./urban-model";

export type SpatialSelection =
  | { kind: "region"; id: "REGION-01" }
  | { kind: "unit"; id: UnitId }
  | { kind: "parcel"; id: string };

export type ControlNature = "刚性" | "弹性" | "引导" | "研究";

export type ControlRow = {
  id: string;
  element: string;
  source: string;
  relation: string;
  nature: ControlNature;
  method: string;
  expression: string;
  review: string;
  status: "适用" | "不适用";
};

const unitApplication: Record<UnitId, string[]> = {
  north: ["U-01", "U-03", "U-04", "U-05", "U-06", "U-12", "U-13", "U-15", "U-16", "U-17", "U-18", "U-19", "U-20", "U-21"],
  west: ["U-01", "U-07", "U-08", "U-09", "U-10", "U-11", "U-12", "U-13", "U-14", "U-16", "U-17", "U-18", "U-19", "U-20", "U-21"],
  core: ["U-01", "U-02", "U-03", "U-04", "U-05", "U-06", "U-08", "U-09", "U-12", "U-13", "U-14", "U-15", "U-16", "U-17", "U-18", "U-19", "U-20", "U-21"],
  east: ["U-01", "U-03", "U-04", "U-05", "U-06", "U-10", "U-11", "U-12", "U-13", "U-14", "U-15", "U-20", "U-21"],
  south: ["U-01", "U-07", "U-08", "U-09", "U-10", "U-11", "U-12", "U-13", "U-16", "U-17", "U-18", "U-19", "U-20", "U-21"],
};

const specificMethods: Record<string, string> = {
  片区范围: "以批准编制边界为唯一外框，跨单元对象必须在边界处闭合并记录接口编号。",
  单元范围: "调用现行单元边界，不得以分析范围替代；边界变更须回溯批准依据。",
  地块边界: "调用现行详细规划地块面，保持地块编码、用地性质与版本号一一对应。",
  核心: "划定完整核心面，注明主导功能与空间目标；向下分解为中心、界面、开放空间和体量秩序。",
  轴线: "控制中心线、起讫节点与跨界接口；单元段不得擅自偏移片区总体走向。",
  轴线影响范围: "以轴线两侧影响带触发界面连续、公共空间、高点和慢行联系要求。",
  中心: "锁定中心点位、层级及主导功能，允许在中心范围内经论证微调具体落点。",
  中心范围: "划定服务与形态影响面，统筹首层公共性、开发强度及高度梯度。",
  生态绿楔: "保持生态连续面与最小有效宽度，建设边界向外退让，禁止新增阻断。",
  城市绿环中心线: "连续控制绿道主线，跨单元接口同点衔接，局部调整不得降低连通性。",
  城市绿环控制范围: "控制绿环有效宽度、公共可达及断点修复范围，不以名义绿地面积替代。",
  生态廊道中心线: "保持蓝绿廊道走向及生态联系，跨界接口位置必须一致。",
  生态廊道控制范围: "划定生态缓冲与建设限制面，落实退让、连续绿化和公共通行条件。",
  公共空间节点: "以点位控制功能节点，并与出入口、慢行系统及周边开放空间建立连接。",
  公共空间范围: "控制可公共进入的连续空间边界、面积和首层开放时段。",
  风貌分区: "按分区建立屋顶、立面、材质与形体规则包，重点界面另行加严。",
  色彩分区: "绑定批准色谱、明度和彩度区间，重要界面采用材料样板复核。",
  眺望点: "锁定观察点坐标及观察高程，现场复核视点可达性和遮挡条件。",
  景观标志点: "锁定被观赏对象及识别部位，保持与眺望点的对应关系。",
  视线通廊中心线: "建立眺望点—标志点视线中心线，作为高度包络计算基准。",
  视线通廊控制范围: "以视域面触发建筑高度、体量切分和第五立面控制。",
  重点控制区候选范围: "仅作为单元判定输入，不直接生成地块指标；经复核后确定唯一重点类型。",
  一般控制区: "完整覆盖非重点范围，加载通透率、绿视率、高宽比等一般控制矩阵。",
  重点控制区: "边界完整且互不重叠，每一区域只绑定一个重点类型和对应强化规则包。",
  通透率控制界面: "沿指定界面统计首层实体墙长度，形成连续可视、可达的开敞段。",
  墙面绿视率控制界面: "沿人行视点核算可见绿量，标注测算界面与核验视距。",
  建筑高宽比控制界面: "按建筑高度与界面连续长度校核比例，避免形成封闭压迫界面。",
  同高率控制范围: "统计相邻建筑檐口高度的一致比例，控制机械齐平或无序跳变。",
  街道高宽比控制段: "以街道净宽和沿街建筑高度计算分段高宽比，路口独立校核。",
  首层开放空间: "划定可全天候公共进入的首层面，标注净高、连通方向与管理边界。",
  口袋公园: "落实独立边界、出入口与服务半径，不得由屋顶或封闭庭院替代。",
  城市绿道: "控制连续线位、有效宽度及与公共空间、公交站点的接口。",
  建筑高点: "以点位及允许偏移范围控制制高点，校核天际线与视廊遮挡。",
  出入口: "控制机动车、步行及后勤出入口位置和开口性质，避让交叉口影响区。",
  建筑控制线: "按指定实线控制建筑首层界面，局部退让仅用于形成有效公共空间。",
  连续界面: "控制沿街贴线率、首层开口与界面连续长度，断点须有公共空间理由。",
  历史街巷: "保留线位、尺度与空间肌理，改造不得扩大为机动车主通道。",
  岸线界面: "控制滨水首排建筑退让、通透与公共可达，不得形成连续封闭背水界面。",
  天际线控制线: "以沿线高度包络控制起伏节奏、制高点和背景建筑。",
  慢行联系: "落实连续通道、跨街接口及无障碍连接，不得在地块边界处中断。",
  建筑体量控制范围: "限定建筑覆盖与体量分段区域，控制大体量连续面长度。",
  开放空间: "划定公共开放面、边界、面积、出入口与连通方向。",
  历史风貌保护范围: "绑定保护对象、建设限制及修缮规则，新增建筑按视线与尺度复核。",
  滨水公共空间: "形成连续滨水公共带，控制退让、慢行、亲水节点和防洪接口。",
  生态连续空间: "保持连续生态基底与最小宽度，穿越设施应采用低干扰方式。",
  站城一体化空间: "统筹站点、换乘、首层公共空间与地下连通，分期不得阻断永久接口。",
  活力界面: "控制首层公共功能、开口密度、遮阴与停留空间，后勤界面不得占主界面。",
  分期建设控制范围: "标注近期、远期边界与临时接口，保证各期均可独立运行并衔接终局。",
};

function natureFor(item: CatalogItem, level: CatalogLevel): ControlNature {
  if (item.id === "R-20") return "研究";
  if (item.name === "一般控制区" || item.name === "重点控制区") return "刚性";
  if (["风貌分区", "色彩分区", "活力界面", "同高率控制范围"].includes(item.name)) return "引导";
  if (item.geometry === "面" && !item.name.includes("范围") && !item.name.includes("边界")) return "弹性";
  if (level === "parcel" && ["口袋公园", "首层开放空间", "开放空间"].includes(item.name)) return "弹性";
  return "刚性";
}

function modeFor(item: CatalogItem, nature: ControlNature) {
  if (nature === "研究") return "候选斜线面 + 条文说明";
  if (item.geometry === "点") return "点位控制 + 属性表";
  if (item.geometry === "线") return nature === "刚性" ? "实线控制 + 接口编号" : "点划线引导";
  if (nature === "刚性") return "实线边界 + 面属性";
  if (nature === "引导") return "点划线分区 + 图则条文";
  return "虚线边界 + 指标/条文控制";
}

function reviewFor(item: CatalogItem) {
  if (item.geometry === "点") return "坐标、高程、来源编号与现场可达性一致。";
  if (item.geometry === "线") return "线位连续、起讫明确、跨界接口同点，且无无故中断。";
  if (item.name.includes("范围") || item.name.includes("区")) return "范围闭合、无自交，属性完整；叠加关系与规则触发结果一致。";
  return "对象可定位，控制性质、条款和图面符号一一对应。";
}

function sourceFor(item: CatalogItem, level: CatalogLevel) {
  if (level === "region") return item.id === "R-01" ? "批准编制边界" : "片区总体结构 / 专题评估";
  if (level === "unit") {
    const number = Number(item.id.slice(2));
    return number <= 19 ? `R-${String(number).padStart(2, "0")} / 现状校核` : "单元控制区综合判定";
  }
  const parcelSources: Record<string, string> = {
    "P-01": "现行详细规划地块",
    "P-02": "U-20 一般控制区",
    "P-03": "U-21 重点控制区",
    "P-04": "一般8项 / 通透率",
    "P-05": "一般8项 / 墙面绿视率",
    "P-06": "一般8项 / 建筑高宽比",
    "P-07": "一般8项 / 同高率",
    "P-08": "一般8项 / 街道高宽比",
    "P-09": "一般8项 / 首层开放空间",
    "P-10": "一般8项 / 口袋公园",
    "P-11": "一般8项 / 城市绿道",
    "P-12": "U-03/U-18 / 重点规则包",
    "P-13": "U-12 公共空间节点",
    "P-14": "U-12/U-13 / 道路条件",
    "P-15": "U-03/U-04 / 重点规则包",
    "P-16": "U-03/U-14 / 重点规则包",
    "P-17": "U-14 风貌分区 / 历史本底",
    "P-18": "U-11 / 岸线条件",
    "P-19": "U-18/U-19 视线通廊",
    "P-20": "U-08/U-10/U-12 慢行系统",
    "P-21": "U-02/U-04 / 重点规则包",
    "P-22": "U-06/U-13 公共空间范围",
    "P-23": "U-19 视线通廊控制范围",
    "P-24": "U-14 风貌分区",
    "P-25": "U-11/U-13 滨水开放系统",
    "P-26": "U-07/U-11 生态空间",
    "P-27": "U-05/U-06 / 城市枢纽区",
    "P-28": "U-03/U-14 / 重要发展区",
    "P-29": "实施时序 / 永久接口",
  };
  return parcelSources[item.id] ?? "单元规则触发";
}

function relationFor(item: CatalogItem, level: CatalogLevel) {
  if (level === "region") return "片区识别 / 跨单元统筹";
  if (level === "unit") return item.id === "U-20" || item.id === "U-21" ? "完整覆盖 / 互不重叠" : "继承 + 校核 + 深化";
  if (item.id === "P-01") return "直接调用";
  if (item.geometry === "点") return "包含 / 距离阈值";
  if (item.geometry === "线") return "相交 / 临街 / 邻接";
  return "空间叠加 / 包含";
}

export function buildControlRows(
  items: CatalogItem[],
  level: CatalogLevel,
  selection: SpatialSelection,
  selectedParcel: Parcel | null,
  parcelApplies: (parcel: Parcel, item: CatalogItem) => boolean,
) {
  const parcelInKeyZone = selectedParcel !== null && (
    selectedParcel.unit === "core"
      ? selectedParcel.cx > 44 && selectedParcel.cx < 76 && selectedParcel.cy > 44 && selectedParcel.cy < 76
      : selectedParcel.unit === "north"
        ? selectedParcel.cx > 48 && selectedParcel.cx < 72 && selectedParcel.cy > 10 && selectedParcel.cy < 28
        : selectedParcel.unit === "west"
          ? selectedParcel.cx > 10 && selectedParcel.cx < 29 && selectedParcel.cy > 48 && selectedParcel.cy < 72
          : selectedParcel.unit === "east"
            ? selectedParcel.cx > 91 && selectedParcel.cx < 110 && selectedParcel.cy > 48 && selectedParcel.cy < 72
            : selectedParcel.cx > 48 && selectedParcel.cx < 72 && selectedParcel.cy > 91 && selectedParcel.cy < 110
  );
  return items.map<ControlRow>((item) => {
    const nature = natureFor(item, level);
    let status: ControlRow["status"] = "适用";
    if (level === "unit" && selection.kind === "unit") {
      status = unitApplication[selection.id].includes(item.id) ? "适用" : "不适用";
    }
    if (level === "parcel" && selectedParcel) {
      if (item.id === "P-01") status = "适用";
      else if (item.id === "P-02") status = parcelInKeyZone ? "不适用" : "适用";
      else if (item.id === "P-03") status = parcelInKeyZone ? "适用" : "不适用";
      else status = parcelApplies(selectedParcel, item) ? "适用" : "不适用";
    }
    return {
      id: item.id,
      element: item.name,
      source: sourceFor(item, level),
      relation: relationFor(item, level),
      nature,
      method: specificMethods[item.name] ?? `${item.content}；按对象边界和属性字段进行控制。`,
      expression: modeFor(item, nature),
      review: reviewFor(item),
      status,
    };
  });
}

export function geometrySymbol(geometry: GeometryType) {
  if (geometry === "点") return "●";
  if (geometry === "线") return "━";
  if (geometry === "面") return "▧";
  return "T";
}

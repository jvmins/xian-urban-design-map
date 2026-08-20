export const UNIT20_BUSINESS_ID = "DB-CBG-20";

export type RequirementApplicability = "必须落实" | "条件适用" | "方案核验";

export type RequirementItem = {
  id: string;
  element: string;
  applicability: RequirementApplicability;
  trigger: string;
  reason: string;
  content: string;
};

export type RequirementGroup = {
  id: "area" | "unit" | "district";
  level: string;
  source: string;
  sourceType: string;
  origin: string;
  items: RequirementItem[];
};

export type Unit20ParcelInput = {
  id: string;
  businessId: string;
  unitId: string;
  landUse: string;
  landUseCode: string;
  areaHa: number;
  farMax: string;
  contextControls: Array<{ id: string; overlap: number }>;
};

const AREA_SOURCE = "《西安市灞河重点区域风貌管控条例》";
const UNIT_SOURCE = "《西安市国土空间规划城市设计导则》";
const DISTRICT_SOURCE = "《东部城市设计·奥体核心板块城市设计指引》";

export const UNIT20_UNIT_REQUIREMENT_GROUPS: RequirementGroup[] = [
  {
    id: "area",
    level: "片区层面",
    source: AREA_SOURCE,
    sourceType: "法定风貌管控条例",
    origin:
      "DB-CBG-20位于灞河重点区域风貌管控范围，并涉及奥体中心片区、灞河沿线和重要滨水空间，因此承接条例的总体风貌、滨水界面、高度、绿地和建筑形态要求。",
    items: [
      {
        id: "area-overall",
        element: "总体风貌",
        applicability: "必须落实",
        trigger: "DB-CBG-20完整位于条例管控范围",
        reason: "条例要求灞河重点区域加强风貌整体性、空间立体性、平面协调性和文脉连续性管控。",
        content:
          "统筹用地性质、开发强度、平面布局、天际轮廓、建筑高度、建筑形态、建筑体量和建筑色彩，形成连续协调的现代城市风貌。",
      },
      {
        id: "area-axis-height",
        element: "奥体轴线与高度",
        applicability: "必须落实",
        trigger: "位于奥体中心片区及东西向景观轴线影响范围",
        reason: "20单元是奥体中心片区的重要组成，应维护灞河弧山景观视线和轴线空间秩序。",
        content:
          "沿东西向轴线形成以绿地、广场为主的连续开放空间；片区建筑高度不得超过170米，灞河东岸沿轴线两侧建筑高度由西向东梯度递减。",
      },
      {
        id: "area-waterfront-interface",
        element: "滨水公共界面",
        applicability: "条件适用",
        trigger: "临河第一排、高层或面向滨水公共空间的建设用地",
        reason: "20单元与奥体中心核心区重点滨水控制范围重叠，需避免连续高墙并保障滨水公共性。",
        content:
          "临河第一排优先布局公共建筑；同一地块高层建筑临河界面总面宽不超过临河一侧长度的40%，相邻等高高层建筑不得超过3栋。",
      },
      {
        id: "area-wetland-green",
        element: "湿地绿地保护",
        applicability: "必须落实",
        trigger: "湿地、公园绿地及连续滨水开放空间",
        reason: "条例将湿地和规划公园绿地作为灞河生态景观基底，要求保持其性质和规模。",
        content: "不得改变湿地和规划公园绿地的用地性质，不得减少用地规模，并保持滨水开放空间连续可达。",
      },
      {
        id: "area-form-color",
        element: "建筑形态与色彩",
        applicability: "必须落实",
        trigger: "单元内新建、改建建筑",
        reason: "条例要求通过建筑形态、第五立面和色彩分区共同塑造重点区域风貌。",
        content:
          "建筑形态应丰富变化、协调有序，附属设施与外立面一体化设计；住宅外立面实行公建化设计，建筑色彩按片区色彩专项要求分区分类管控。",
      },
    ],
  },
  {
    id: "unit",
    level: "单元层面",
    source: UNIT_SOURCE,
    sourceType: "市级城市设计技术导则",
    origin:
      "依据导则分类传导，DB-CBG-20属于现代风貌区、文化宜居色彩控制区，并分别与浐灞三中心片区一级公共空间节点、奥体中心核心区重点滨水区和奥体中心外围二级重点发展区相交。",
    items: [
      {
        id: "unit-modern-character",
        element: "现代风貌与文化宜居色彩",
        applicability: "必须落实",
        trigger: "现代风貌区、文化宜居色彩控制区均完整覆盖20单元",
        reason: "管控数据中现代风貌区和文化宜居色彩控制区对20单元的覆盖率均为100%。",
        content:
          "体现智能、创新、时尚、活力的现代气质；建筑以暖黄、暖灰为主，控制大面积高艳度色彩，形成温润、雅致且协调的整体形象。",
      },
      {
        id: "unit-public-node",
        element: "一级公共空间节点",
        applicability: "条件适用",
        trigger: "浐灞三中心片区一级公共空间节点覆盖约19.08%",
        reason: "DB-CBG-20与DB-CBG-32、33共同构成浐灞三中心片区，并设置城市现代公共空间一级节点1处。",
        content:
          "节点空间应突出设计特色，与周边建筑形态和功能协调，组织高品质公共活动空间，并结合总体天际线适当设置地标建筑。",
      },
      {
        id: "unit-waterfront-width",
        element: "滨水建筑体量",
        applicability: "条件适用",
        trigger: "奥体中心核心区重点滨水范围覆盖约48.80%",
        reason: "导则要求重点滨水区控制连续建筑面宽，形成近水低、远水高、近水疏、远水密的空间层次。",
        content:
          "建筑高度20米以下时连续面宽不大于80米；20—100米时不大于70米；100米以上时不大于60米。",
      },
      {
        id: "unit-waterfront-setback",
        element: "退线与视线通廊",
        applicability: "条件适用",
        trigger: "沿河无绿带地块、垂直岸线道路及重要交叉口",
        reason: "需保障滨水开放空间、视线通廊和道路交叉口的公共空间尺度。",
        content:
          "沿河无绿带地块退道路红线不足10米时按不小于10米控制；重要视线廊道及交叉口宜在原退线基础上增加2—4米。",
      },
      {
        id: "unit-development-zone",
        element: "二级重点发展区",
        applicability: "条件适用",
        trigger: "奥体中心外围区域覆盖约40.61%",
        reason: "20单元属于奥体中心外围二级重点发展区，应与奥体核心形成有序的高度和功能过渡。",
        content:
          "高层和地标建筑应高低有序、向外围递减，避免孤立突兀体量；大型公共建筑设置入口集散空间，沿主要道路首层宜布置商业、公共服务等开放功能。",
      },
      {
        id: "unit-open-slow",
        element: "开放空间与慢行系统",
        applicability: "必须落实",
        trigger: "公共空间节点、重点滨水区和重点发展区综合传导",
        reason: "三个重点控制范围在20单元叠加，需要以连续公共空间和慢行网络进行整合。",
        content:
          "开放空间与滨水建筑、景观一体化，保障垂直河岸视线；增加邻水慢行通道密度，衔接公共交通、公共绿地和相邻地块。",
      },
    ],
  },
  {
    id: "district",
    level: "板块层面",
    source: DISTRICT_SOURCE,
    sourceType: "专项城市设计成果",
    origin:
      "DB-CBG-20位于奥体核心板块，应承接“和美长安”的风貌定位及“一带、两轴、一核心”空间景观结构。板块要求用于统筹单元内不同地块和公共空间的整体关系。",
    items: [
      {
        id: "district-position",
        element: "整体风貌定位",
        applicability: "必须落实",
        trigger: "位于奥体核心板块",
        reason: "板块集中体现现代城市建设成就和特色，整体风貌定位为“和美长安”。",
        content: "塑造现代、开放、生态、人文相融合的城市形象，统筹公共文化、体育、国际服务和总部商务功能。",
      },
      {
        id: "district-structure",
        element: "一带两轴一核心",
        applicability: "必须落实",
        trigger: "奥体核心板块整体空间结构",
        reason: "板块以灞河生态文化脉动带、双向开放活力轴、发展示范引领轴和生态人文创新核组织空间。",
        content:
          "增加滨水空间公共性和连续性；沿骨干道路强化标志建筑和景观节点；在两轴一带交汇处集聚文化体育、国际服务和创意生活功能。",
      },
      {
        id: "district-landmarks",
        element: "地标建筑布局",
        applicability: "方案核验",
        trigger: "发展示范轴、开放活力轴、轨道站点及重要公共建筑周边",
        reason: "板块指引要求分别控制超高层地标和公共建筑地标，形成视线呼应、风格多元的标志建筑群。",
        content:
          "超高层地标优先沿东西向发展示范轴布局，南北向开放轴可结合轨道站点设置少量地标和TOD重点开发区域；公共建筑形成连续文化界面。",
      },
      {
        id: "district-view-corridor",
        element: "景观视线通廊",
        applicability: "条件适用",
        trigger: "临主要景观界面长度超过300米",
        reason: "需要提高灞河、公园等景观资源的可视性与公共可达性，避免大地块阻断视线。",
        content:
          "地块内部设置垂直主要景观界面的视线通廊，通廊间距不大于160米、宽度不小于30米；沿灞河鼓励退台式建筑并形成协调天际线。",
      },
      {
        id: "district-light-renewal",
        element: "夜景与存量提升",
        applicability: "条件适用",
        trigger: "重要功能节点、滨水绿带、骨干道路及现状建成区",
        reason: "板块指引通过夜景结构和存量环境更新共同提升奥体核心板块形象。",
        content:
          "夜景遵循整体和谐、重点突出；存量片区重点改善道路景观、街角公园、建筑立面和店招。",
      },
    ],
  },
];

function hasAnyControl(parcel: Unit20ParcelInput, ids: string[]) {
  return parcel.contextControls.some((relationship) => ids.includes(relationship.id));
}

function item(
  id: string,
  element: string,
  applicability: RequirementApplicability,
  trigger: string,
  reason: string,
  content: string,
): RequirementItem {
  return { id, element, applicability, trigger, reason, content };
}

export function getUnit20ParcelRequirementGroups(parcel: Unit20ParcelInput): RequirementGroup[] {
  if (parcel.unitId !== UNIT20_BUSINESS_ID) return [];

  const isWaterfront = hasAnyControl(parcel, ["c3-38", "c3-45"]);
  const isPublicNode = hasAnyControl(parcel, ["c2-7"]);
  const isDevelopmentZone = hasAnyControl(parcel, ["c3-78"]);
  const isGreen = /公园绿地|防护绿地|广场用地/.test(parcel.landUse);
  const isRoad = /道路用地/.test(parcel.landUse);
  const isResidential = /住宅用地/.test(parcel.landUse);
  const isPublicOrCommercial = /商业|商务|文化|体育|展览|科研|医疗|福利/.test(parcel.landUse);
  const isBuilding = !isGreen && !isRoad;
  const farMax = Number(parcel.farMax);
  const baseReason = `${parcel.businessId}位于DB-CBG-20单元，现状用地为${parcel.landUse}（${parcel.landUseCode || "未编码"}）。`;

  const areaItems: RequirementItem[] = [
    item(
      "parcel-area-overall",
      "片区总体风貌",
      "必须落实",
      "随DB-CBG-20纳入灞河重点区域",
      `${baseReason}条例对管控范围内所有建设与公共空间提出整体风貌要求。`,
      "项目方案应统筹功能、强度、布局、天际线、建筑形态、体量和色彩，与奥体中心及灞河滨水整体风貌协调。",
    ),
  ];

  if (isBuilding) {
    areaItems.push(item(
      "parcel-area-height",
      "奥体片区高度",
      "必须落实",
      "建设地块位于奥体中心片区",
      `${baseReason}作为奥体中心片区建设地块，应服从片区高度上限和轴线梯度。`,
      "建筑高度不得超过170米；如位于东西向轴线两侧，应落实由西向东梯度递减的高度秩序，并不得遮挡主要景观视线。",
    ));
  }

  if (isWaterfront && isBuilding) {
    areaItems.push(item(
      "parcel-area-waterfront",
      "临河建筑界面",
      "必须落实",
      "地块命中奥体中心核心区或灞河滨水控制范围",
      `${baseReason}空间关系显示该地块属于重点滨水建设地块，需要避免连续高墙并保障滨水公共性。`,
      "临河第一排优先形成公共建筑或公共界面；高层建筑临河总面宽不超过临河一侧长度的40%，相邻等高高层不得超过3栋。",
    ));
  }

  if (isGreen) {
    areaItems.push(item(
      "parcel-area-green",
      "绿地性质与规模",
      "必须落实",
      "公园绿地",
      `${baseReason}属于条例重点保护的生态与公共开放空间。`,
      "不得改变公园绿地用地性质，不得减少用地规模；保持开放共享、生态连续并与滨水及慢行空间衔接。",
    ));
  }

  if (isBuilding) {
    areaItems.push(item(
      "parcel-area-form-color",
      "建筑形态与色彩",
      "必须落实",
      `${parcel.landUse}建设项目`,
      `${baseReason}需落实条例对建筑形态、立面和色彩的分区分类控制。`,
      `${isResidential ? "住宅外立面实行公建化设计；" : "重点控制临街、临水及面向公共空间一侧立面；"}附属设施与外立面一体化，色彩采用协调的暖黄、暖灰基调。`,
    ));
  }

  const unitItems: RequirementItem[] = [];

  if (isBuilding) {
    unitItems.push(item(
      "parcel-unit-character",
      "现代风貌与文化宜居色彩",
      "必须落实",
      "现代风貌区和文化宜居色彩控制区100%覆盖",
      `${baseReason}两项单元级基础风貌分区均完整覆盖该地块。`,
      "建筑应体现现代、简洁、创新的片区气质，采用暖黄、暖灰为主的协调色彩，控制大面积高艳度色彩和突兀造型。",
    ));
  }

  if (isPublicNode) {
    unitItems.push(item(
      "parcel-unit-node",
      "一级公共空间节点",
      "必须落实",
      "地块命中浐灞三中心片区一级公共空间节点",
      `${baseReason}空间命中关系表明该地块承担一级公共空间节点建设任务。`,
      "突出节点空间设计特色，形成高品质公共活动场所；建筑形态、出入口和开放空间与周边功能协调，并结合天际线适当强化地标性。",
    ));
  }

  if (isWaterfront && isBuilding) {
    unitItems.push(
      item(
        "parcel-unit-width",
        "滨水连续面宽",
        "必须落实",
        "地块命中重点滨水控制范围",
        `${baseReason}导则要求重点滨水建设地块按建筑高度分档控制连续面宽。`,
        "建筑高度20米以下时连续面宽不大于80米；20—100米时不大于70米；100米以上时不大于60米。",
      ),
      item(
        "parcel-unit-setback",
        "建筑退线与开放空间",
        "条件适用",
        "沿河无绿带、垂直岸线道路或重要交叉口",
        `${baseReason}位于重点滨水范围，需在方案阶段核验沿河绿带、道路和交叉口关系。`,
        "沿河无绿带时退道路红线不小于10米；重要视线廊道及交叉口宜增加2—4米退距，并通过开放空间保障垂直河岸视线。",
      ),
    );
  }

  if (isWaterfront || isGreen) {
    unitItems.push(item(
      "parcel-unit-slow",
      "滨水开放与慢行空间",
      "必须落实",
      isGreen ? "公园绿地或开放空间地块" : "重点滨水地块",
      `${baseReason}承担滨水公共空间或绿地系统的连续衔接功能。`,
      "开放空间与滨水景观一体化，增加近岸慢行通道密度，衔接公共交通、相邻地块和公共空间节点。",
    ));
  }

  if (isDevelopmentZone) {
    unitItems.push(item(
      "parcel-unit-development",
      "二级重点发展区",
      "必须落实",
      "地块命中奥体中心外围二级重点发展区",
      `${baseReason}位于奥体中心外围区域，应形成与核心区协调的高度、体量和街道界面。`,
      `${isBuilding ? "建筑高低有序并向外围递减，避免孤立突兀体量；沿主要道路首层宜设置商业、公共服务或开放功能。" : "道路和开放空间应衔接公共交通、慢行网络及周边建设地块。"}`,
    ));
  }

  if (isPublicOrCommercial) {
    unitItems.push(item(
      "parcel-unit-public-use",
      "公共建筑与活力界面",
      "必须落实",
      `${parcel.landUse}用地`,
      `${baseReason}其功能与20单元体育赛事、文化交流和总部经济定位直接相关。`,
      `主要入口设置集散空间，重点立面朝向道路、广场或公共空间；${Number.isFinite(farMax) && farMax >= 4 ? `容积率上限为${farMax}，应通过体量分解避免高强度开发形成连续压迫界面。` : "通过体量分解和首层开放功能形成活力界面。"}`,
    ));
  } else if (isResidential) {
    unitItems.push(item(
      "parcel-unit-residential",
      "居住建筑界面",
      "必须落实",
      "二类城镇住宅用地",
      `${baseReason}需在保障居住功能的同时落实现代风貌区和奥体外围发展区要求。`,
      "形成高低、大小、进退有序的建筑群体；沿主要道路首层结合商业或公共服务功能，住宅外立面按公建化要求深化。",
    ));
  } else if (isRoad) {
    unitItems.push(item(
      "parcel-unit-road",
      "道路与慢行衔接",
      "必须落实",
      "城镇道路用地",
      `${baseReason}道路是串联公共空间节点、滨水地区和重点发展区的基础载体。`,
      "道路专项设计应保障连续步行、骑行和无障碍系统，组织垂直河岸视线，并减少机动车流线对公共空间连续性的干扰。",
    ));
  }

  const districtItems: RequirementItem[] = [
    item(
      "parcel-district-position",
      "“和美长安”板块风貌",
      "必须落实",
      "随DB-CBG-20位于奥体核心板块",
      `${baseReason}其城市设计需与奥体核心板块整体风貌和功能定位一致。`,
      "体现现代、开放、生态、人文融合的板块形象，建筑、开放空间和景观设计应与奥体中心、灞河及公共文化设施形成整体。",
    ),
  ];

  if (isWaterfront || isGreen) {
    districtItems.push(item(
      "parcel-district-belt",
      "生态文化脉动带",
      "必须落实",
      isGreen ? "公园绿地并承担板块开放空间功能" : "重点滨水范围",
      `${baseReason}其空间属性与灞河生态文化脉动带的公共、生态和慢行功能直接相关。`,
      "保证滨水绿地和开放空间连续，增加公共可达性，组织慢行、文化展示和生态景观功能，避免封闭界面阻断滨水联系。",
    ));
  }

  if (isPublicOrCommercial) {
    districtItems.push(item(
      "parcel-district-axis",
      "两轴与创新核心",
      "方案核验",
      "公共文化、体育、商业商务或科研服务用地",
      `${baseReason}其功能与发展示范轴、开放活力轴及生态人文创新核的主导功能相匹配，但现有数据缺少板块内部轴线矢量。`,
      "方案阶段核验与两轴一核的位置关系；临轴时强化主立面、公共空间和标志性，临轨道站点时统筹TOD、商业和慢行系统。",
    ));
  }

  if (isBuilding && parcel.areaHa >= 8) {
    districtItems.push(item(
      "parcel-district-corridor",
      "景观视线通廊",
      "方案核验",
      `地块面积${parcel.areaHa.toFixed(2)}公顷，需核验临主要景观界面长度`,
      `${baseReason}属于较大地块，存在阻断灞河或公园景观视线的可能。`,
      "如临主要景观界面长度超过300米，应设置垂直景观界面的视线通廊，通廊间距不大于160米、宽度不小于30米。",
    ));
  }

  if (isBuilding) {
    districtItems.push(item(
      "parcel-district-light",
      "夜景照明",
      "条件适用",
      "建设地块位于奥体核心板块",
      `${baseReason}应纳入板块以滨水绿带、骨干道路和功能节点为重点的夜景结构。`,
      "照明遵循整体和谐、重点突出，重要界面和公共节点可强化识别性，一般建筑控制亮度、眩光和无序动态照明。",
    ));
  }

  return [
    {
      id: "area",
      level: "片区层面",
      source: AREA_SOURCE,
      sourceType: "法定风貌管控条例",
      origin: `${parcel.businessId}随所属DB-CBG-20单元纳入条例管控范围；以下内容按地块用地性质和空间命中关系拆解，不直接复制单元全文。`,
      items: areaItems,
    },
    {
      id: "unit",
      level: "单元层面",
      source: UNIT_SOURCE,
      sourceType: "市级城市设计技术导则",
      origin: `${parcel.businessId}承接DB-CBG-20详细规划的单元级传导要求；重点节点、滨水区和发展区要求仅在空间命中时显示。`,
      items: unitItems,
    },
    {
      id: "district",
      level: "板块层面",
      source: DISTRICT_SOURCE,
      sourceType: "专项城市设计成果",
      origin: `${parcel.businessId}位于奥体核心板块。现有资料未提供板块内部“一带、两轴、一核心”矢量，板块通则直接传导，轴线、核心和视线通廊要求标记为方案核验。`,
      items: districtItems,
    },
  ];
}

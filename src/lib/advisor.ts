import { FinancialInput, FinancialSummary, RetirementResult, formatCurrency } from "./finance";

export type BlindSpotItem = {
  id: string;
  title: string;
  category: "expense" | "income" | "protection";
  prompt: string;
  rationale: string;
};

export type GapItem = {
  title: string;
  priority: "critical" | "important" | "optimize";
  reason: string;
  action: string;
};

export type AdvisorInsight = {
  narrative: string[];
  blindSpots: BlindSpotItem[];
  gaps: GapItem[];
};

export function buildBlindSpots(input: FinancialInput): BlindSpotItem[] {
  const items: BlindSpotItem[] = [
    {
      id: "education",
      title: "子女教育費",
      category: "expense",
      prompt: "未來 5~15 年是否有大學、研究所、留學或補習支出？",
      rationale: "教育費往往不是一次性，而是連續多年現金流壓力。",
    },
    {
      id: "marriage",
      title: "小孩結婚 / 成家支援",
      category: "expense",
      prompt: "你是否預計在未來資助小孩結婚、買房頭期或育兒？",
      rationale: "這類支出常被忽略，但會在特定年份形成大額現金流事件。",
    },
    {
      id: "car",
      title: "買車 / 換車",
      category: "expense",
      prompt: "你或家人未來幾年是否有買車、換車、保險與維修更新需求？",
      rationale: "車輛不是只有購置費，還包含保險、稅金與維護。",
    },
    {
      id: "housing",
      title: "換屋 / 裝潢 / 搬家",
      category: "expense",
      prompt: "未來是否有賣房、換房、裝潢、修繕或搬家計畫？",
      rationale: "房產交易與裝潢費用常遠高於使用者當下直覺估算。",
    },
    {
      id: "sell-house",
      title: "賣房 / 換屋釋出資金",
      category: "income",
      prompt: "退休前或退休後，是否可能賣房、縮宅或換屋來釋出資金？",
      rationale: "房產處分可能是退休資金缺口的重要解法。",
    },
    {
      id: "side-income",
      title: "退休後兼職 / 顧問收入",
      category: "income",
      prompt: "退休後是否仍會保留顧問、接案、租金或股利收入？",
      rationale: "很多人高估投資報酬、低估自己仍可創造的主動 / 半被動收入。",
    },
    {
      id: "insurance-gap",
      title: "保險缺口",
      category: "protection",
      prompt: "家庭主要收入者是否已覆蓋壽險、醫療、失能與長照風險？",
      rationale: "若重大風險來臨，最先被破壞的通常不是投資報酬，而是整體現金流。",
    },
    {
      id: "eldercare",
      title: "父母照護 / 長照支出",
      category: "expense",
      prompt: "未來是否可能承擔父母醫療、看護或長照費用？",
      rationale: "40~60 歲家庭常同時面對退休與上一代照護雙重壓力。",
    },
  ];

  if (input.profile.currentAge < 40) {
    return items.filter((item) => item.id !== "eldercare");
  }

  return items;
}

export function buildGapPriorities(
  input: FinancialInput,
  summary: FinancialSummary,
  retirement: RetirementResult,
): GapItem[] {
  const gaps: GapItem[] = [];

  if (summary.liquidityRatio < 0.5) {
    gaps.push({
      title: "流動性不足",
      priority: "critical",
      reason: "流動資產無法有效支撐現有負債或短期變動。",
      action: "先提高現金緩衝與短期可用資產，再談進一步投資配置。",
    });
  }

  if (summary.debtAssetRatio > 0.45) {
    gaps.push({
      title: "槓桿偏高",
      priority: "critical",
      reason: "負債資產比偏高，代表資產一旦波動，淨值安全邊際會快速收縮。",
      action: "優先檢查高壓負債、房貸結構與現金流壓力。",
    });
  }

  if (retirement.bridgeNeed > retirement.currentPortfolio * 0.4) {
    gaps.push({
      title: "65 歲前橋接期風險高",
      priority: "critical",
      reason: `退休前到年金開始前，需要先準備約 ${formatCurrency(retirement.bridgeNeed)}。`,
      action: "優先確認是否延後退休、下修退休後支出，或建立專屬橋接資金池。",
    });
  }

  if (retirement.gap < 0) {
    gaps.push({
      title: "退休缺口尚未補平",
      priority: "important",
      reason: "依目前假設，退休總需求高於退休時可動用資產。",
      action: "優先比較延後退休、增加月儲蓄、降低退休支出三者的效果。",
    });
  }

  if (summary.savingRatio < 0.2) {
    gaps.push({
      title: "儲蓄率偏低",
      priority: "important",
      reason: "若儲蓄率長期偏低，將壓縮未來所有規劃彈性。",
      action: "先做固定支出檢視，建立月儲蓄自動化與收入分桶。",
    });
  }

  gaps.push({
    title: "保險缺口需獨立盤點",
    priority: "important",
    reason: "多數使用者會先談投資，但真正會毀掉規劃的通常是風險事件。",
    action: "請將壽險、醫療、失能、長照分開盤點，避免把保險與投資混為一談。",
  });

  gaps.push({
    title: "大型人生事件尚未量化",
    priority: "optimize",
    reason: "買車、換屋、裝潢、教育、婚嫁與父母照護通常會造成未來幾年現金流跳動。",
    action: "把這些事件做成年份化清單，再放進現金流時間軸。",
  });

  const weight = { critical: 0, important: 1, optimize: 2 };
  return gaps.sort((a, b) => weight[a.priority] - weight[b.priority]);
}

export function buildAdvisorNarrative(
  input: FinancialInput,
  summary: FinancialSummary,
  retirement: RetirementResult,
): string[] {
  const notes: string[] = [];

  if (retirement.gap < 0) {
    notes.push(
      `你目前最大的問題不是總資產太少，而是依照現在的退休年齡與支出假設，退休金缺口仍未補平。`,
    );
  } else {
    notes.push(
      `依目前假設，你的退休規劃已有基本可行性，但仍需檢查未納入的大額人生事件是否會打破這個平衡。`,
    );
  }

  if (retirement.bridgeNeed > 0) {
    notes.push(
      `65 歲前的橋接期是關鍵風險，這段時間沒有勞保 / 勞退月領，必須靠流動資產獨立支撐。`,
    );
  }

  if (summary.debtAssetRatio > 0.45) {
    notes.push(
      `你的槓桿偏高，代表房產或投資資產若下修，淨值安全邊際會比直覺更脆弱。`,
    );
  } else {
    notes.push(`你的槓桿結構相對可控，下一步應該把注意力放在事件支出與保障缺口。`);
  }

  notes.push(
    `若要讓這個工具更像真正顧問，下一步不應只是填更多欄位，而是把教育、換屋、買車、婚嫁、保險與賣房情境納入時間軸。`,
  );

  if (input.retirement.monthlyPension <= 0) {
    notes.push(`你尚未填入 65 歲後年金收入，這會讓退休估算偏保守，也代表需要優先查詢勞保 / 勞退資料。`);
  }

  return notes;
}

export function buildAdvisorInsight(
  input: FinancialInput,
  summary: FinancialSummary,
  retirement: RetirementResult,
): AdvisorInsight {
  return {
    blindSpots: buildBlindSpots(input),
    gaps: buildGapPriorities(input, summary, retirement),
    narrative: buildAdvisorNarrative(input, summary, retirement),
  };
}

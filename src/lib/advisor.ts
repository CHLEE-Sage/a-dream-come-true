import { DiscoveryAnswers, RecommendedEvent } from "./discovery";
import {
  FinancialInput,
  FinancialSummary,
  RetirementResult,
  formatCurrency,
} from "./finance";
import { PlanningEvent, YearProjection } from "./timeline";

export type GapItem = {
  title: string;
  priority: "critical" | "important" | "optimize";
  reason: string;
  action: string;
};

export type AdvisorInsight = {
  headline: string;
  narrative: string[];
  strengths: string[];
  blindSpots: string[];
  gaps: GapItem[];
};

export function buildAdvisorInsight(params: {
  input: FinancialInput;
  answers: DiscoveryAnswers;
  summary: FinancialSummary;
  retirement: RetirementResult;
  timeline: YearProjection[];
  acceptedEvents: PlanningEvent[];
  recommendations: RecommendedEvent[];
}): AdvisorInsight {
  const { answers, summary, retirement, timeline, acceptedEvents, recommendations } = params;
  const lowPoint = timeline.reduce(
    (current, row) => (row.endAsset < current.endAsset ? row : current),
    timeline[0],
  );
  const acceptedIds = new Set(
    acceptedEvents
      .filter((event) => event.source === "recommended")
      .map((event) => event.id.replace(/^accepted-/, "")),
  );
  const openHighPriority = recommendations.filter(
    (item) => item.priority === "high" && !acceptedIds.has(item.id),
  );

  const narrative: string[] = [];
  const strengths: string[] = [];
  const blindSpots: string[] = [];
  const gaps: GapItem[] = [];

  if (retirement.healthGrade === "A") {
    narrative.push("退休主體結構目前可行，但仍要把人生事件提前放進計畫。");
  } else if (retirement.healthGrade === "B") {
    narrative.push("目前不是無解，而是需要更早管理現金流銜接。");
  } else {
    narrative.push("退休資金與事件壓力會互相疊加，不能只靠提高報酬率期待過關。");
  }

  narrative.push(
    `${lowPoint.year} 年是目前最危險的水位低點，代表這一年最值得優先做壓力拆解。`,
  );

  if (summary.emergencyFundMonths >= 18) {
    strengths.push("流動資產足以支撐超過 18 個月日常支出，短期抗壓性不錯。");
  }
  if (summary.savingRatio >= 0.25) {
    strengths.push("目前儲蓄率具備修補缺口的空間，你不是只能被動接受結果。");
  }
  if (answers.expectsHouseSale) {
    strengths.push("你已把房產變現視為備援方案，退休調整彈性會比較高。");
  }
  if (answers.expectsSideIncomeAfterRetire) {
    strengths.push("退休後若能保留部分收入，資產壓力會明顯下降。");
  }

  if (summary.emergencyFundMonths < 9) {
    gaps.push({
      title: "流動安全墊偏薄",
      priority: "critical",
      reason: `目前可動用資產約可支撐 ${summary.emergencyFundMonths.toFixed(1)} 個月支出，遇到醫療或家庭支援會很吃緊。`,
      action: "先把現金與低波動資產補到至少 12 個月支出，再談進一步優化投資配置。",
    });
  }
  if (summary.debtAssetRatio > 0.45) {
    gaps.push({
      title: "負債壓力偏高",
      priority: "critical",
      reason: "房貸與借款佔總資產比重偏高，退休前後若收入下降，現金流會先被負債綁住。",
      action: "優先確認退休前能否降低貸款壓力，或另留房貸過渡現金。",
    });
  }
  if (retirement.bridgeNeed > retirement.portfolioAtRetire * 0.35) {
    gaps.push({
      title: "退休到年金開始前的銜接壓力偏大",
      priority: "critical",
      reason: `這段期間大約需要先自行負擔 ${formatCurrency(retirement.bridgeNeed)}。`,
      action: "延後退休、降低退休初期支出，或先建立專門的過渡資金池。",
    });
  }
  if (retirement.gap < 0) {
    gaps.push({
      title: "退休資金仍有缺口",
      priority: "important",
      reason: `依目前假設，退休資金約短缺 ${formatCurrency(Math.abs(retirement.gap))}。`,
      action: "先調整儲蓄率、退休年齡、退休後支出三者，再看投資情境。",
    });
  }
  if (lowPoint.endAsset < 0) {
    gaps.push({
      title: "未來某一年現金流會跌破零",
      priority: "critical",
      reason: `${lowPoint.year} 年資產水位推估會掉到 ${formatCurrency(lowPoint.endAsset)}。`,
      action: "把那一年的大額事件往前存、往後移，或改成分段支付。",
    });
  }
  if (openHighPriority.length > 0) {
    gaps.push({
      title: "高優先推薦尚未納入正式計畫",
      priority: "important",
      reason: `目前仍有 ${openHighPriority.length} 項高優先事件只是知道，但還沒正式放進時間軸。`,
      action: "至少先把高優先推薦接受進計畫，再調整年份與金額。",
    });
  }

  if (answers.hasInsuranceGap) {
    blindSpots.push("保障不足不是保費問題，而是突發事件時你會不會被迫賣掉長期資產。");
  }
  if (answers.expectsParentCare) {
    blindSpots.push("父母照護通常來得比預期早，而且常常不是一次性支出。");
  }
  if (answers.hasChildren && answers.plansEducationSupport) {
    blindSpots.push("教育高峰常和退休前幾年重疊，最怕在市場不佳時剛好需要提款。");
  }
  if (acceptedEvents.length === 0) {
    blindSpots.push("現在的圖表幾乎只反映基礎現金流，還沒有反映人生事件的真實壓力。");
  }

  const weight = { critical: 0, important: 1, optimize: 2 };
  gaps.sort((a, b) => weight[a.priority] - weight[b.priority]);
  if (gaps.length === 0) {
    gaps.push({
      title: "目前沒有明顯紅燈，但還可以再優化",
      priority: "optimize",
      reason: "你的基本結構已經不差，下一步是把大額事件與退休策略做更細的情境管理。",
      action: "把推薦事件補進時間軸，確認在保守情境下仍能成立。",
    });
  }

  return {
    headline:
      gaps[0].priority === "critical"
        ? "先守住現金流與退休銜接，再談優化。"
        : "基礎架構已成形，接下來重點是把事件壓力提前攤開。",
    narrative,
    strengths,
    blindSpots,
    gaps,
  };
}

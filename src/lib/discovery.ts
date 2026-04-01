import { FinancialInput, formatCurrency } from "./finance";
import {
  PlanningEvent,
  PlanningEventCategory,
  PlanningEventType,
} from "./timeline";

export type DiscoveryAnswers = {
  hasChildren: boolean;
  childrenCount: number;
  oldestChildAge: number;
  plansEducationSupport: boolean;
  plansMarriageSupport: boolean;
  hasMortgage: boolean;
  plansMoveOrRenovation: boolean;
  plansCarPurchase: boolean;
  expectsHouseSale: boolean;
  expectsSideIncomeAfterRetire: boolean;
  hasInsuranceGap: boolean;
  expectsParentCare: boolean;
};

export type DiscoveryQuestion = {
  key: keyof DiscoveryAnswers;
  title: string;
  help: string;
  type: "boolean" | "number";
  min?: number;
  max?: number;
};

export type RecommendedEvent = PlanningEvent & {
  reason: string;
  assumptions: string[];
  priority: "high" | "medium" | "low";
  confidence: number;
};

export const defaultDiscoveryAnswers: DiscoveryAnswers = {
  hasChildren: true,
  childrenCount: 1,
  oldestChildAge: 15,
  plansEducationSupport: true,
  plansMarriageSupport: true,
  hasMortgage: true,
  plansMoveOrRenovation: false,
  plansCarPurchase: true,
  expectsHouseSale: false,
  expectsSideIncomeAfterRetire: false,
  hasInsuranceGap: true,
  expectsParentCare: true,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToTenThousand(value: number) {
  return Math.round(value / 10000) * 10000;
}

function estimateByIncome(monthlyIncome: number, multiplier: number, min: number, max: number) {
  return clamp(roundToTenThousand(monthlyIncome * multiplier), min, max);
}

function createRecommendation(params: {
  id: string;
  year: number;
  label: string;
  type: PlanningEventType;
  category: PlanningEventCategory;
  amount: number;
  reason: string;
  assumptions: string[];
  priority: RecommendedEvent["priority"];
  confidence: number;
}): RecommendedEvent {
  return {
    ...params,
    note: params.assumptions.join(" / "),
    source: "recommended",
  };
}

export function getDiscoveryQuestions(
  answers: DiscoveryAnswers,
  input: FinancialInput,
): DiscoveryQuestion[] {
  const questions: DiscoveryQuestion[] = [
    {
      key: "hasChildren",
      title: "你目前有需要一起納入規劃的孩子嗎？",
      help: "有孩子時，教育與成家支援通常是最容易被低估的中期壓力。",
      type: "boolean",
    },
  ];

  if (answers.hasChildren) {
    questions.push(
      {
        key: "childrenCount",
        title: "大約要規劃幾位孩子？",
        help: "只要先填大方向即可，這會直接影響教育與婚嫁資金估算。",
        type: "number",
        min: 1,
        max: 6,
      },
      {
        key: "oldestChildAge",
        title: "最大的孩子現在幾歲？",
        help: "我會用這個推估教育費高峰和婚嫁支援的時間點。",
        type: "number",
        min: 0,
        max: 35,
      },
      {
        key: "plansEducationSupport",
        title: "你打算承擔孩子的大學或研究所費用嗎？",
        help: "不用先追精準金額，我先用家庭收入和孩子數估一個保守版本。",
        type: "boolean",
      },
      {
        key: "plansMarriageSupport",
        title: "你預期未來會支援孩子成家或婚嫁嗎？",
        help: "很多家庭沒有先列這筆，最後會突然從流動資產裡抽走。",
        type: "boolean",
      },
    );
  }

  questions.push({
    key: "hasMortgage",
    title: "退休前你還會背著房貸嗎？",
    help: "如果是，退休前後的現金流銜接要特別保守。",
    type: "boolean",
  });

  if (answers.hasMortgage || input.assets.realEstate > 0) {
    questions.push(
      {
        key: "plansMoveOrRenovation",
        title: "未來 5 年有搬家、換屋或整修的想法嗎？",
        help: "這類支出很大，但通常不會出現在日常月支出裡。",
        type: "boolean",
      },
      {
        key: "expectsHouseSale",
        title: "退休後你有可能賣房、換小宅或釋放房產資金嗎？",
        help: "如果有，這可能是修補退休缺口的重要槓桿。",
        type: "boolean",
      },
    );
  }

  questions.push(
    {
      key: "plansCarPurchase",
      title: "未來 3 到 5 年需要換車或替家人買車嗎？",
      help: "車輛通常是一次性大額支出，對流動性衝擊很直接。",
      type: "boolean",
    },
    {
      key: "expectsSideIncomeAfterRetire",
      title: "退休後你有機會保留顧問、兼職或其他收入嗎？",
      help: "只要有一小筆穩定收入，退休壓力通常會明顯下降。",
      type: "boolean",
    },
    {
      key: "hasInsuranceGap",
      title: "你覺得目前保險和醫療保障還有缺口嗎？",
      help: "這不只是保費問題，而是發生事件時資產會不會被迫賣在不對的時間。",
      type: "boolean",
    },
    {
      key: "expectsParentCare",
      title: "你未來 10 年內可能需要支應父母照護嗎？",
      help: "照護支出通常不是一次就結束，所以我先用預備金角度去估。",
      type: "boolean",
    },
  );

  return questions;
}

export function recommendEvents(
  input: FinancialInput,
  answers: DiscoveryAnswers,
  startYear: number,
): RecommendedEvent[] {
  const monthlyIncome = Math.max(input.cashflow.monthlyIncome, input.cashflow.monthlyExpensePre);
  const yearsToRetire = Math.max(0, input.profile.retireAge - input.profile.currentAge);
  const items: RecommendedEvent[] = [];

  if (answers.hasChildren && answers.plansEducationSupport && answers.childrenCount > 0) {
    const perChild = estimateByIncome(monthlyIncome, 7.5, 700000, 2500000);
    items.push(
      createRecommendation({
        id: "education",
        year: startYear + Math.max(1, 18 - answers.oldestChildAge),
        label: "孩子教育高峰",
        type: "expense",
        category: "education",
        amount: perChild * answers.childrenCount,
        reason: "教育金通常不會出現在每月支出裡，但真正發生時會直接動到流動資產。",
        assumptions: [`${answers.childrenCount} 位孩子`, `每位先抓 ${formatCurrency(perChild)}`],
        priority: "high",
        confidence: 0.86,
      }),
    );
  }

  if (answers.hasChildren && answers.plansMarriageSupport) {
    const perChild = estimateByIncome(monthlyIncome, 5.5, 400000, 1600000);
    items.push(
      createRecommendation({
        id: "marriage",
        year: startYear + Math.max(4, 28 - answers.oldestChildAge),
        label: "孩子成家支援",
        type: "expense",
        category: "family",
        amount: perChild * Math.max(1, answers.childrenCount),
        reason: "如果有婚嫁或成家支援預期，最好先預留，不要到時從投資部位硬抽。",
        assumptions: [`每位先抓 ${formatCurrency(perChild)}`],
        priority: "medium",
        confidence: 0.74,
      }),
    );
  }

  if (answers.plansMoveOrRenovation) {
    const amount = clamp(
      roundToTenThousand(Math.max(input.assets.realEstate * 0.04, monthlyIncome * 10)),
      900000,
      3200000,
    );
    items.push(
      createRecommendation({
        id: "housing",
        year: startYear + clamp(yearsToRetire - 1, 1, 5),
        label: "換屋 / 裝修準備金",
        type: "expense",
        category: "housing",
        amount,
        reason: "房屋相關支出通常不是沒有，而是晚幾年才會發生。",
        assumptions: ["先抓房產價值與收入能力的中位數"],
        priority: "medium",
        confidence: 0.69,
      }),
    );
  }

  if (answers.plansCarPurchase) {
    const amount = estimateByIncome(monthlyIncome, 5, 600000, 1500000);
    items.push(
      createRecommendation({
        id: "car",
        year: startYear + 3,
        label: "換車準備",
        type: "expense",
        category: "vehicle",
        amount,
        reason: "車輛支出最怕剛好在市場不佳時發生，會放大壓力。",
        assumptions: [`先抓約 ${formatCurrency(amount)}`],
        priority: "low",
        confidence: 0.64,
      }),
    );
  }

  if (answers.expectsHouseSale && input.assets.realEstate > 0) {
    const amount = clamp(roundToTenThousand(input.assets.realEstate * 0.45), 5000000, input.assets.realEstate);
    items.push(
      createRecommendation({
        id: "house-sale",
        year: startYear + Math.max(2, yearsToRetire),
        label: "房產變現彈性",
        type: "income",
        category: "income",
        amount,
        reason: "這不是一定要賣，而是先把能否釋放資金當成備援選項。",
        assumptions: ["先抓房產價值約 45% 可轉為退休資金"],
        priority: "medium",
        confidence: 0.71,
      }),
    );
  }

  if (answers.expectsSideIncomeAfterRetire) {
    const amount = estimateByIncome(
      Math.max(input.cashflow.monthlyExpensePost, input.cashflow.monthlyIncome * 0.35),
      4,
      180000,
      720000,
    );
    items.push(
      createRecommendation({
        id: "side-income",
        year: startYear + Math.max(1, yearsToRetire),
        label: "退休後兼職 / 顧問收入",
        type: "income",
        category: "income",
        amount,
        reason: "退休後只要補上一小段穩定收入，資產壓力通常會明顯下降。",
        assumptions: [`先抓年收入 ${formatCurrency(amount)}`],
        priority: "medium",
        confidence: 0.66,
      }),
    );
  }

  if (answers.hasInsuranceGap) {
    const amount = estimateByIncome(monthlyIncome, 1.6, 120000, 360000);
    items.push(
      createRecommendation({
        id: "insurance",
        year: startYear + 1,
        label: "保障補強預算",
        type: "protection",
        category: "insurance",
        amount,
        reason: "保障缺口最怕的不是保費，而是事故發生後被迫動到退休資產。",
        assumptions: ["先用 1 到 2 個月收入做年度保費預留"],
        priority: "high",
        confidence: 0.82,
      }),
    );
  }

  if (answers.expectsParentCare) {
    const amount = estimateByIncome(monthlyIncome, 6.5, 300000, 1800000);
    items.push(
      createRecommendation({
        id: "care",
        year: startYear + 2,
        label: "父母照護預備金",
        type: "expense",
        category: "care",
        amount,
        reason: "照護支出通常比想像來得早，而且往往不是一筆就結束。",
        assumptions: [`先抓 ${formatCurrency(amount)} 做第一段緩衝`],
        priority: "high",
        confidence: 0.79,
      }),
    );
  }

  if (answers.hasMortgage && yearsToRetire <= 10) {
    const amount = clamp(roundToTenThousand(input.cashflow.monthlyExpensePost * 8), 500000, 1800000);
    items.push(
      createRecommendation({
        id: "bridge",
        year: startYear + Math.max(1, yearsToRetire),
        label: "退休銜接緩衝金",
        type: "expense",
        category: "housing",
        amount,
        reason: "若退休前後還有房貸，建議至少準備一段過渡現金，不要全靠投資部位。",
        assumptions: ["先抓 8 個月退休後支出作緩衝"],
        priority: "high",
        confidence: 0.77,
      }),
    );
  }

  return items.sort((a, b) => a.year - b.year);
}

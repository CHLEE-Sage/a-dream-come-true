import { FinancialInput } from "./finance";
import { PlanningEvent } from "./timeline";

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

export type DiscoveryQuestion = {
  key: keyof DiscoveryAnswers;
  title: string;
  help: string;
  type: "boolean" | "number";
};

export const discoveryQuestions: DiscoveryQuestion[] = [
  { key: "hasChildren", title: "你目前是否有小孩？", help: "這會影響教育、婚嫁與家庭支援規劃。", type: "boolean" },
  { key: "childrenCount", title: "小孩人數", help: "若沒有小孩，可填 0。", type: "number" },
  { key: "oldestChildAge", title: "最大的小孩年齡", help: "用來估算教育與婚嫁事件的時間點。", type: "number" },
  { key: "plansEducationSupport", title: "你是否計畫支應子女教育費？", help: "包含大學、研究所、留學或補習。", type: "boolean" },
  { key: "plansMarriageSupport", title: "你是否可能支援小孩結婚或成家？", help: "包含婚嫁、購屋頭期或生子支援。", type: "boolean" },
  { key: "hasMortgage", title: "你目前是否有房貸？", help: "房貸會影響退休橋接期與流動性安排。", type: "boolean" },
  { key: "plansMoveOrRenovation", title: "未來 10 年是否有搬家、換屋或裝潢計畫？", help: "常被低估的重大支出。", type: "boolean" },
  { key: "plansCarPurchase", title: "未來幾年是否有買車或換車計畫？", help: "應把購置、保險與維護一起看。", type: "boolean" },
  { key: "expectsHouseSale", title: "退休前後是否可能賣房 / 換屋釋出資金？", help: "這可能成為補退休缺口的關鍵事件。", type: "boolean" },
  { key: "expectsSideIncomeAfterRetire", title: "退休後是否可能保有顧問 / 接案 / 租金收入？", help: "退休後不一定只有被動收入。", type: "boolean" },
  { key: "hasInsuranceGap", title: "你認為目前保險保障可能有缺口嗎？", help: "壽險、醫療、失能、長照應分開看。", type: "boolean" },
  { key: "expectsParentCare", title: "未來是否可能負擔父母照護或長照費用？", help: "這是很多家庭中年後才意識到的壓力來源。", type: "boolean" },
];

export function recommendEvents(
  input: FinancialInput,
  answers: DiscoveryAnswers,
  startYear: number,
): PlanningEvent[] {
  const events: PlanningEvent[] = [];
  const retireDelta = Math.max(0, input.profile.retireAge - input.profile.currentAge);

  if (answers.hasChildren && answers.plansEducationSupport && answers.childrenCount > 0) {
    const yearsToCollege = Math.max(1, 18 - answers.oldestChildAge);
    events.push({
      id: `rec-education-${startYear}`,
      year: startYear + yearsToCollege,
      label: "子女教育費高峰",
      type: "expense",
      category: "education",
      amount: 800000 * Math.max(1, answers.childrenCount),
    });
  }

  if (answers.hasChildren && answers.plansMarriageSupport) {
    const yearsToMarriage = Math.max(4, 28 - answers.oldestChildAge);
    events.push({
      id: `rec-marriage-${startYear}`,
      year: startYear + yearsToMarriage,
      label: "子女婚嫁 / 成家支援",
      type: "expense",
      category: "family",
      amount: 1200000 * Math.max(1, answers.childrenCount),
    });
  }

  if (answers.plansMoveOrRenovation) {
    events.push({
      id: `rec-housing-${startYear}`,
      year: startYear + Math.min(5, Math.max(1, retireDelta - 1)),
      label: "搬家 / 換屋 / 裝潢",
      type: "expense",
      category: "housing",
      amount: 1800000,
    });
  }

  if (answers.plansCarPurchase) {
    events.push({
      id: `rec-car-${startYear}`,
      year: startYear + 3,
      label: "買車 / 換車",
      type: "expense",
      category: "vehicle",
      amount: 900000,
    });
  }

  if (answers.expectsHouseSale) {
    events.push({
      id: `rec-house-sale-${startYear}`,
      year: startYear + Math.max(2, retireDelta),
      label: "賣房 / 換屋釋出資金",
      type: "income",
      category: "income",
      amount: 8000000,
    });
  }

  if (answers.expectsSideIncomeAfterRetire) {
    events.push({
      id: `rec-side-income-${startYear}`,
      year: startYear + Math.max(1, retireDelta),
      label: "退休後顧問 / 接案收入",
      type: "income",
      category: "income",
      amount: 360000,
    });
  }

  if (answers.hasInsuranceGap) {
    events.push({
      id: `rec-insurance-${startYear}`,
      year: startYear + 1,
      label: "補強保險保障",
      type: "protection",
      category: "insurance",
      amount: 120000,
    });
  }

  if (answers.expectsParentCare) {
    events.push({
      id: `rec-care-${startYear}`,
      year: startYear + 2,
      label: "父母照護 / 長照支出",
      type: "expense",
      category: "care",
      amount: 300000,
    });
  }

  if (answers.hasMortgage && retireDelta <= 10) {
    events.push({
      id: `rec-bridge-${startYear}`,
      year: startYear + Math.max(1, retireDelta),
      label: "退休橋接資金檢查點",
      type: "expense",
      category: "housing",
      amount: 500000,
    });
  }

  return events.sort((a, b) => a.year - b.year);
}

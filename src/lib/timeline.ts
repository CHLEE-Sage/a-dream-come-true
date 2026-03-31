import { FinancialInput, calculateRetirement } from "./finance";

export type PlanningEvent = {
  id: string;
  year: number;
  label: string;
  type: "expense" | "income" | "protection";
  category:
    | "education"
    | "housing"
    | "vehicle"
    | "family"
    | "insurance"
    | "income"
    | "care";
  amount: number;
};

export type YearProjection = {
  year: number;
  age: number;
  startAsset: number;
  income: number;
  expense: number;
  eventNet: number;
  pensionIncome: number;
  investmentGain: number;
  endAsset: number;
  notes: string[];
};

export const defaultEvents = (currentYear: number): PlanningEvent[] => [
  {
    id: "education-1",
    year: currentYear + 2,
    label: "教育費高峰",
    type: "expense",
    category: "education",
    amount: 600000,
  },
  {
    id: "vehicle-1",
    year: currentYear + 4,
    label: "買車 / 換車",
    type: "expense",
    category: "vehicle",
    amount: 900000,
  },
  {
    id: "housing-1",
    year: currentYear + 6,
    label: "裝潢與搬家",
    type: "expense",
    category: "housing",
    amount: 1500000,
  },
  {
    id: "income-1",
    year: currentYear + 7,
    label: "賣房 / 換屋釋出資金",
    type: "income",
    category: "income",
    amount: 8000000,
  },
  {
    id: "family-1",
    year: currentYear + 8,
    label: "小孩結婚支援",
    type: "expense",
    category: "family",
    amount: 1200000,
  },
  {
    id: "insurance-1",
    year: currentYear + 1,
    label: "補強保險保障",
    type: "protection",
    category: "insurance",
    amount: 120000,
  },
];

export function projectTimeline(
  input: FinancialInput,
  events: PlanningEvent[],
  startYear: number,
  years = 20,
): YearProjection[] {
  const retirement = calculateRetirement(input);
  let asset = retirement.currentPortfolio;
  const rows: YearProjection[] = [];

  for (let i = 0; i < years; i += 1) {
    const year = startYear + i;
    const age = input.profile.currentAge + i;
    const startAsset = asset;
    const isRetired = age >= input.profile.retireAge;
    const annualSavings = isRetired ? 0 : input.cashflow.monthlySaving * 12;
    const annualExpense =
      (isRetired ? input.cashflow.monthlyExpensePost : input.cashflow.monthlyExpensePre) *
      12 *
      (1 + input.retirement.inflation) ** i;
    const pensionIncome =
      age >= input.retirement.pensionStartAge ? input.retirement.monthlyPension * 12 : 0;
    const rate = isRetired ? input.retirement.returnPost : input.retirement.returnPre;
    const investmentGain = startAsset * rate;

    const yearEvents = events.filter((event) => event.year === year);
    const notes = yearEvents.map((event) => event.label);
    const eventNet = yearEvents.reduce((sum, event) => {
      if (event.type === "income") return sum + event.amount;
      return sum - event.amount;
    }, 0);

    const income = annualSavings + pensionIncome;
    const endAsset = startAsset + investmentGain + income - annualExpense + eventNet;

    asset = endAsset;

    rows.push({
      year,
      age,
      startAsset,
      income,
      expense: annualExpense,
      eventNet,
      pensionIncome,
      investmentGain,
      endAsset,
      notes,
    });
  }

  return rows;
}

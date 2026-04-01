import { FinancialInput, calculateRetirement } from "./finance";

export type PlanningEventType = "expense" | "income" | "protection";
export type PlanningEventCategory =
  | "education"
  | "housing"
  | "vehicle"
  | "family"
  | "insurance"
  | "income"
  | "care";

export type PlanningEvent = {
  id: string;
  year: number;
  label: string;
  type: PlanningEventType;
  category: PlanningEventCategory;
  amount: number;
  note?: string;
  source?: "manual" | "recommended";
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

export function defaultEvents(): PlanningEvent[] {
  return [];
}

export function projectTimeline(
  input: FinancialInput,
  events: PlanningEvent[],
  startYear: number,
  years = 20,
): YearProjection[] {
  const retirement = calculateRetirement(input);
  let asset = retirement.currentPortfolio;
  const rows: YearProjection[] = [];

  for (let offset = 0; offset < years; offset += 1) {
    const year = startYear + offset;
    const age = input.profile.currentAge + offset;
    const startAsset = asset;
    const isRetired = age >= input.profile.retireAge;
    const annualSaving = isRetired ? 0 : input.cashflow.monthlySaving * 12;
    const annualExpense =
      (isRetired ? input.cashflow.monthlyExpensePost : input.cashflow.monthlyExpensePre) *
      12 *
      (1 + input.retirement.inflation) ** offset;
    const pensionIncome =
      age >= input.retirement.pensionStartAge ? input.retirement.monthlyPension * 12 : 0;
    const investmentGain =
      startAsset * (isRetired ? input.retirement.returnPost : input.retirement.returnPre);
    const yearEvents = events.filter((event) => event.year === year);
    const eventNet = yearEvents.reduce(
      (sum, event) => sum + (event.type === "income" ? event.amount : -event.amount),
      0,
    );
    const income = annualSaving + pensionIncome;
    const endAsset = startAsset + investmentGain + income - annualExpense + eventNet;

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
      notes: yearEvents.map((event) => event.label),
    });

    asset = endAsset;
  }

  return rows;
}

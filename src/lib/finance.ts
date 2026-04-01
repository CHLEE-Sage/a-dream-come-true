export type Profile = {
  currentAge: number;
  retireAge: number;
  lifeExpectancy: number;
};

export type Cashflow = {
  monthlyIncome: number;
  monthlySaving: number;
  monthlyExpensePre: number;
  monthlyExpensePost: number;
};

export type Assets = {
  cash: number;
  investments: number;
  insuranceCashValue: number;
  realEstate: number;
};

export type Liabilities = {
  mortgage: number;
  otherLoans: number;
  creditDebt: number;
};

export type Retirement = {
  pensionStartAge: number;
  monthlyPension: number;
  returnPre: number;
  returnPost: number;
  inflation: number;
};

export type FinancialInput = {
  profile: Profile;
  cashflow: Cashflow;
  assets: Assets;
  liabilities: Liabilities;
  retirement: Retirement;
};

export type FinancialSummary = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  debtAssetRatio: number;
  solvencyRatio: number;
  liquidityRatio: number;
  savingRatio: number;
  emergencyFundMonths: number;
  monthlyFreeCashflow: number;
};

export type RetirementResult = {
  currentPortfolio: number;
  portfolioAtRetire: number;
  bridgeNeed: number;
  totalNeed: number;
  gap: number;
  sustainAge: number;
  healthGrade: "A" | "B" | "C";
};

export type ScenarioResult = {
  key: "conservative" | "base" | "optimistic";
  label: string;
  adjustment: string;
  result: RetirementResult;
};

export type RadarMetric = {
  label: string;
  value: number;
  hint: string;
};

export const defaultInput: FinancialInput = {
  profile: { currentAge: 50, retireAge: 60, lifeExpectancy: 90 },
  cashflow: {
    monthlyIncome: 150000,
    monthlySaving: 80000,
    monthlyExpensePre: 70000,
    monthlyExpensePost: 80000,
  },
  assets: {
    cash: 6000000,
    investments: 10000000,
    insuranceCashValue: 2500000,
    realEstate: 33000000,
  },
  liabilities: { mortgage: 18000000, otherLoans: 300000, creditDebt: 0 },
  retirement: {
    pensionStartAge: 65,
    monthlyPension: 30000,
    returnPre: 0.05,
    returnPost: 0.03,
    inflation: 0.02,
  },
};

function divide(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

export function calculateSummary(input: FinancialInput): FinancialSummary {
  const totalAssets =
    input.assets.cash +
    input.assets.investments +
    input.assets.insuranceCashValue +
    input.assets.realEstate;
  const totalLiabilities =
    input.liabilities.mortgage +
    input.liabilities.otherLoans +
    input.liabilities.creditDebt;
  const liquidAssets =
    input.assets.cash + input.assets.investments + input.assets.insuranceCashValue;
  const netWorth = totalAssets - totalLiabilities;
  const monthlyCoreExpense = Math.max(input.cashflow.monthlyExpensePre, 1);

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidAssets,
    debtAssetRatio: divide(totalLiabilities, Math.max(totalAssets, 1)),
    solvencyRatio: divide(netWorth, Math.max(totalAssets, 1)),
    liquidityRatio: divide(liquidAssets, Math.max(totalLiabilities, 1)),
    savingRatio: divide(input.cashflow.monthlySaving, Math.max(input.cashflow.monthlyIncome, 1)),
    emergencyFundMonths: divide(liquidAssets, monthlyCoreExpense),
    monthlyFreeCashflow: input.cashflow.monthlyIncome - input.cashflow.monthlyExpensePre,
  };
}

export function calculateRetirement(input: FinancialInput): RetirementResult {
  const currentPortfolio = calculateSummary(input).liquidAssets;
  const yearsToRetire = Math.max(0, input.profile.retireAge - input.profile.currentAge);
  let portfolioAtRetire = currentPortfolio;

  for (let year = 0; year < yearsToRetire; year += 1) {
    portfolioAtRetire =
      portfolioAtRetire * (1 + input.retirement.returnPre) +
      input.cashflow.monthlySaving * 12;
  }

  const bridgeYears = Math.max(0, input.retirement.pensionStartAge - input.profile.retireAge);
  let bridgeNeed = 0;
  for (let year = 0; year < bridgeYears; year += 1) {
    const annualExpense =
      input.cashflow.monthlyExpensePost * 12 * (1 + input.retirement.inflation) ** year;
    bridgeNeed += annualExpense / (1 + input.retirement.returnPost) ** year;
  }

  const postPensionYears = Math.max(
    0,
    input.profile.lifeExpectancy -
      Math.max(input.profile.retireAge, input.retirement.pensionStartAge),
  );
  let postPensionNeed = 0;
  for (let year = 0; year < postPensionYears; year += 1) {
    const annualExpense =
      input.cashflow.monthlyExpensePost *
      12 *
      (1 + input.retirement.inflation) ** (bridgeYears + year);
    const annualPension =
      input.retirement.monthlyPension * 12 * (1 + input.retirement.inflation) ** year;
    postPensionNeed +=
      Math.max(0, annualExpense - annualPension) /
      (1 + input.retirement.returnPost) ** (bridgeYears + year);
  }

  const totalNeed = bridgeNeed + postPensionNeed;
  const gap = portfolioAtRetire - totalNeed;

  let testPortfolio = portfolioAtRetire;
  let sustainAge = input.profile.retireAge;
  for (let age = input.profile.retireAge; age < input.profile.lifeExpectancy; age += 1) {
    const yearsFromRetire = age - input.profile.retireAge;
    const annualExpense =
      input.cashflow.monthlyExpensePost *
      12 *
      (1 + input.retirement.inflation) ** yearsFromRetire;
    const annualPension =
      age >= input.retirement.pensionStartAge
        ? input.retirement.monthlyPension *
          12 *
          (1 + input.retirement.inflation) **
            Math.max(0, age - input.retirement.pensionStartAge)
        : 0;
    testPortfolio =
      testPortfolio * (1 + input.retirement.returnPost) -
      Math.max(0, annualExpense - annualPension);
    if (testPortfolio < 0) break;
    sustainAge = age + 1;
  }

  return {
    currentPortfolio,
    portfolioAtRetire,
    bridgeNeed,
    totalNeed,
    gap,
    sustainAge,
    healthGrade:
      gap >= 0 && sustainAge >= input.profile.lifeExpectancy ? "A" : gap >= -5000000 ? "B" : "C",
  };
}

export function calculateScenarios(input: FinancialInput): ScenarioResult[] {
  const conservative: FinancialInput = {
    ...input,
    cashflow: {
      ...input.cashflow,
      monthlySaving: input.cashflow.monthlySaving * 0.9,
      monthlyExpensePost: input.cashflow.monthlyExpensePost * 1.1,
    },
    retirement: {
      ...input.retirement,
      returnPre: Math.max(0, input.retirement.returnPre - 0.02),
      returnPost: Math.max(0, input.retirement.returnPost - 0.01),
      inflation: input.retirement.inflation + 0.01,
    },
  };

  const optimistic: FinancialInput = {
    ...input,
    cashflow: {
      ...input.cashflow,
      monthlySaving: input.cashflow.monthlySaving * 1.1,
      monthlyExpensePost: input.cashflow.monthlyExpensePost * 0.93,
    },
    retirement: {
      ...input.retirement,
      returnPre: input.retirement.returnPre + 0.015,
      returnPost: input.retirement.returnPost + 0.01,
      inflation: Math.max(0, input.retirement.inflation - 0.005),
    },
  };

  return [
    {
      key: "conservative",
      label: "保守",
      adjustment: "報酬更低、支出更高、通膨更黏。",
      result: calculateRetirement(conservative),
    },
    {
      key: "base",
      label: "基準",
      adjustment: "依目前輸入條件推估。",
      result: calculateRetirement(input),
    },
    {
      key: "optimistic",
      label: "樂觀",
      adjustment: "儲蓄更穩、報酬更好、支出更節制。",
      result: calculateRetirement(optimistic),
    },
  ];
}

export function buildRadarMetrics(summary: FinancialSummary): RadarMetric[] {
  const debtScore = Math.max(0, Math.min(100, ((0.65 - summary.debtAssetRatio) / 0.65) * 100));
  const solvencyScore = Math.max(0, Math.min(100, (summary.solvencyRatio / 0.75) * 100));
  const liquidityScore = Math.max(
    0,
    Math.min(100, (summary.emergencyFundMonths / 18) * 100),
  );
  const savingScore = Math.max(0, Math.min(100, (summary.savingRatio / 0.35) * 100));

  return [
    { label: "負債壓力", value: debtScore, hint: "資產負債比越低越好。" },
    { label: "淨值韌性", value: solvencyScore, hint: "淨值厚度決定你能承受多大波動。" },
    { label: "流動安全", value: liquidityScore, hint: "可動用資產能撐多久最關鍵。" },
    { label: "儲蓄紀律", value: savingScore, hint: "退休缺口通常先靠儲蓄率修補。" },
  ];
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

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

export const defaultInput: FinancialInput = {
  profile: {
    currentAge: 50,
    retireAge: 60,
    lifeExpectancy: 90,
  },
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
  liabilities: {
    mortgage: 18000000,
    otherLoans: 300000,
    creditDebt: 0,
  },
  retirement: {
    pensionStartAge: 65,
    monthlyPension: 30000,
    returnPre: 0.05,
    returnPost: 0.03,
    inflation: 0.02,
  },
};

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
  const debtAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
  const solvencyRatio = totalAssets > 0 ? netWorth / totalAssets : 0;
  const liquidityRatio = totalLiabilities > 0 ? liquidAssets / totalLiabilities : 0;
  const savingRatio =
    input.cashflow.monthlyIncome > 0
      ? input.cashflow.monthlySaving / input.cashflow.monthlyIncome
      : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidAssets,
    debtAssetRatio,
    solvencyRatio,
    liquidityRatio,
    savingRatio,
  };
}

export function calculateRetirement(input: FinancialInput): RetirementResult {
  const summary = calculateSummary(input);
  const currentPortfolio = summary.liquidAssets;
  const yearsToRetire = Math.max(0, input.profile.retireAge - input.profile.currentAge);

  let portfolioAtRetire = currentPortfolio;
  for (let y = 0; y < yearsToRetire; y += 1) {
    portfolioAtRetire =
      portfolioAtRetire * (1 + input.retirement.returnPre) + input.cashflow.monthlySaving * 12;
  }

  const pensionStartAge = input.retirement.pensionStartAge;
  const bridgeYears = Math.max(0, pensionStartAge - input.profile.retireAge);
  let bridgeNeed = 0;
  for (let y = 0; y < bridgeYears; y += 1) {
    const annualExpense = input.cashflow.monthlyExpensePost * 12 * (1 + input.retirement.inflation) ** y;
    bridgeNeed += annualExpense / (1 + input.retirement.returnPost) ** y;
  }

  const postPensionYears = Math.max(
    0,
    input.profile.lifeExpectancy - Math.max(input.profile.retireAge, pensionStartAge),
  );
  let postPensionNeed = 0;
  for (let y = 0; y < postPensionYears; y += 1) {
    const annualExpense =
      input.cashflow.monthlyExpensePost *
      12 *
      (1 + input.retirement.inflation) ** (bridgeYears + y);
    const annualPension =
      input.retirement.monthlyPension * 12 * (1 + input.retirement.inflation) ** y;
    postPensionNeed +=
      Math.max(0, annualExpense - annualPension) /
      (1 + input.retirement.returnPost) ** (bridgeYears + y);
  }

  const totalNeed = bridgeNeed + postPensionNeed;
  const gap = portfolioAtRetire - totalNeed;

  let testPortfolio = portfolioAtRetire;
  let sustainAge = input.profile.retireAge;
  for (let age = input.profile.retireAge; age < input.profile.lifeExpectancy; age += 1) {
    const yearsFromRetire = age - input.profile.retireAge;
    const annualExpense =
      input.cashflow.monthlyExpensePost * 12 * (1 + input.retirement.inflation) ** yearsFromRetire;
    const annualPension =
      age >= pensionStartAge
        ? input.retirement.monthlyPension *
          12 *
          (1 + input.retirement.inflation) ** Math.max(0, age - pensionStartAge)
        : 0;

    testPortfolio =
      testPortfolio * (1 + input.retirement.returnPost) -
      Math.max(0, annualExpense - annualPension);
    if (testPortfolio < 0) {
      break;
    }
    sustainAge = age + 1;
  }

  const healthGrade =
    gap >= 0 && sustainAge >= input.profile.lifeExpectancy ? "A" : gap > -5000000 ? "B" : "C";

  return {
    currentPortfolio,
    portfolioAtRetire,
    bridgeNeed,
    totalNeed,
    gap,
    sustainAge,
    healthGrade,
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
      adjustment: "低報酬 + 高通膨 + 高支出",
      result: calculateRetirement(conservative),
    },
    {
      key: "base",
      label: "基準",
      adjustment: "使用目前輸入假設",
      result: calculateRetirement(input),
    },
    {
      key: "optimistic",
      label: "積極",
      adjustment: "高儲蓄 + 較佳報酬 + 較低退休支出",
      result: calculateRetirement(optimistic),
    },
  ];
}

export function buildRadarMetrics(summary: FinancialSummary) {
  const debtScore = Math.max(0, Math.min(100, (0.6 - summary.debtAssetRatio) / 0.6 * 100));
  const solvencyScore = Math.max(0, Math.min(100, summary.solvencyRatio / 0.7 * 100));
  const liquidityScore = Math.max(0, Math.min(100, summary.liquidityRatio / 1.2 * 100));
  const savingScore = Math.max(0, Math.min(100, summary.savingRatio / 0.4 * 100));

  return [
    { label: "槓桿安全", value: debtScore },
    { label: "淨值強度", value: solvencyScore },
    { label: "流動性", value: liquidityScore },
    { label: "儲蓄力", value: savingScore },
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

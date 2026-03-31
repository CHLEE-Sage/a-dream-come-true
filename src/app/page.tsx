"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateRetirement,
  calculateSummary,
  defaultInput,
  FinancialInput,
  formatCurrency,
  formatPercent,
} from "@/lib/finance";

const storageKey = "private-finance-agent:v1";

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/10 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
};

function NumberField({ label, value, onChange, step = 1 }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 transition focus:border-cyan-400"
      />
    </label>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function loadInitialInput(): FinancialInput {
  if (typeof window === "undefined") {
    return defaultInput;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultInput;
  }

  try {
    return JSON.parse(raw) as FinancialInput;
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaultInput;
  }
}

export default function Home() {
  const [input, setInput] = useState<FinancialInput>(loadInitialInput);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(input));
  }, [input]);

  const summary = useMemo(() => calculateSummary(input), [input]);
  const retirement = useMemo(() => calculateRetirement(input), [input]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "private-finance-agent-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    setInput(defaultInput);
    window.localStorage.removeItem(storageKey);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#164e63,#020617_55%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2rem] border border-cyan-400/20 bg-slate-950/50 p-8 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs tracking-[0.2em] text-cyan-200">
              PRIVATE FINANCE AGENT
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              高隱私個人財務規劃 MVP
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              這是第一版 local-first 財務助理：資料預設只保存在你的瀏覽器，不需要先登入，就能完成資產負債總覽、財務健康檢查與退休橋接試算。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 px-3 py-1">匿名試算</span>
              <span className="rounded-full border border-white/10 px-3 py-1">65 歲前空窗期分析</span>
              <span className="rounded-full border border-white/10 px-3 py-1">退休缺口估算</span>
              <span className="rounded-full border border-white/10 px-3 py-1">財務健康指標</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">隱私原則</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 預設只使用瀏覽器 localStorage，不上傳到伺服器</li>
              <li>• 不要求姓名、手機、身分證或帳戶明細</li>
              <li>• 可隨時匯出 JSON，或重設清除本機資料</li>
              <li>• 第二版可再加入加密儲存與匿名雲端同步</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button
                onClick={exportJson}
                className="rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                匯出資料
              </button>
              <button
                onClick={resetData}
                className="rounded-2xl border border-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/10"
              >
                重設
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="總資產" value={formatCurrency(summary.totalAssets)} hint="現金 + 投資 + 保單現值 + 不動產" />
          <MetricCard label="總負債" value={formatCurrency(summary.totalLiabilities)} hint={`負債資產比 ${formatPercent(summary.debtAssetRatio)}`} />
          <MetricCard label="淨資產" value={formatCurrency(summary.netWorth)} hint={`償債能力 ${formatPercent(summary.solvencyRatio)}`} />
          <MetricCard label="流動資產" value={formatCurrency(summary.liquidAssets)} hint={`流動性比率 ${formatPercent(summary.liquidityRatio)}`} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Section title="1. 個人與退休設定" description="用最少欄位建立退休時間軸。之後可再擴充家庭、扶養與風險承受度。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField label="目前年齡" value={input.profile.currentAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, currentAge: value } })} />
                <NumberField label="退休年齡" value={input.profile.retireAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, retireAge: value } })} />
                <NumberField label="預期壽命" value={input.profile.lifeExpectancy} onChange={(value) => setInput({ ...input, profile: { ...input.profile, lifeExpectancy: value } })} />
              </div>
            </Section>

            <Section title="2. 現金流" description="退休前每月可持續儲蓄，是最敏感的變數之一。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="每月收入" value={input.cashflow.monthlyIncome} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyIncome: value } })} />
                <NumberField label="每月可儲蓄" value={input.cashflow.monthlySaving} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlySaving: value } })} />
                <NumberField label="退休前每月支出" value={input.cashflow.monthlyExpensePre} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePre: value } })} />
                <NumberField label="退休後每月支出" value={input.cashflow.monthlyExpensePost} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePost: value } })} />
              </div>
            </Section>

            <Section title="3. 資產與負債" description="這一版先採四大資產類別，之後可拆成帳戶、保單、ETF 與房產明細。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="現金 / 存款" value={input.assets.cash} onChange={(value) => setInput({ ...input, assets: { ...input.assets, cash: value } })} />
                <NumberField label="投資資產" value={input.assets.investments} onChange={(value) => setInput({ ...input, assets: { ...input.assets, investments: value } })} />
                <NumberField label="保單現值" value={input.assets.insuranceCashValue} onChange={(value) => setInput({ ...input, assets: { ...input.assets, insuranceCashValue: value } })} />
                <NumberField label="不動產估值" value={input.assets.realEstate} onChange={(value) => setInput({ ...input, assets: { ...input.assets, realEstate: value } })} />
                <NumberField label="房貸餘額" value={input.liabilities.mortgage} onChange={(value) => setInput({ ...input, liabilities: { ...input.liabilities, mortgage: value } })} />
                <NumberField label="其他貸款" value={input.liabilities.otherLoans} onChange={(value) => setInput({ ...input, liabilities: { ...input.liabilities, otherLoans: value } })} />
              </div>
            </Section>

            <Section title="4. 退休假設" description="65 歲以前沒有勞保 / 勞退月領，因此橋接期完全靠流動資產。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="年金開始年齡" value={input.retirement.pensionStartAge} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, pensionStartAge: value } })} />
                <NumberField label="65 歲起每月勞保 + 勞退" value={input.retirement.monthlyPension} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, monthlyPension: value } })} />
                <NumberField label="退休前年化報酬率 (%)" value={input.retirement.returnPre * 100} step={0.1} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, returnPre: value / 100 } })} />
                <NumberField label="退休後年化報酬率 (%)" value={input.retirement.returnPost * 100} step={0.1} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, returnPost: value / 100 } })} />
                <NumberField label="通膨率 (%)" value={input.retirement.inflation * 100} step={0.1} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, inflation: value / 100 } })} />
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="財務健康指標" description="第一版先提供最核心的四個燈號。">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="負債資產比" value={formatPercent(summary.debtAssetRatio)} hint="理想通常低於 40%~45%" />
                <MetricCard label="淨值比" value={formatPercent(summary.solvencyRatio)} hint="越高代表財務緩衝越強" />
                <MetricCard label="流動性比率" value={formatPercent(summary.liquidityRatio)} hint="流動資產 / 總負債" />
                <MetricCard label="儲蓄率" value={formatPercent(summary.savingRatio)} hint="每月儲蓄 / 每月收入" />
              </div>
            </Section>

            <Section title="退休試算結果" description="以目前流動資產為退休資金基礎，估算橋接期與全退休期間需求。">
              <div className="space-y-4 text-sm text-slate-200">
                <div className="rounded-2xl bg-slate-950/40 p-4">
                  <div className="text-slate-400">目前可投入退休的流動資產</div>
                  <div className="mt-2 text-2xl font-semibold">{formatCurrency(retirement.currentPortfolio)}</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard label="退休時資產估值" value={formatCurrency(retirement.portfolioAtRetire)} hint="目前流動資產加上退休前累積" />
                  <MetricCard label="65 歲前橋接需求" value={formatCurrency(retirement.bridgeNeed)} hint="沒有年金收入的空窗期" />
                  <MetricCard label="退休總需求現值" value={formatCurrency(retirement.totalNeed)} hint="橋接期 + 65 歲後現金流需求" />
                  <MetricCard label="資金缺口 / 裕度" value={formatCurrency(retirement.gap)} hint={retirement.gap >= 0 ? "正值代表目前假設下可支撐" : "負值代表需延後退休或降支出"} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard label="可支撐到年齡" value={`${retirement.sustainAge} 歲`} hint="根據目前假設的模擬結果" />
                  <MetricCard label="財務評等" value={retirement.healthGrade} hint={retirement.healthGrade === "A" ? "A：健康" : retirement.healthGrade === "B" ? "B：可優化" : "C：需調整"} />
                </div>
              </div>
            </Section>

            <Section title="規劃引導" description="這一版先示範 agent 應如何追問，未來可接上真正對話 agent。">
              <ol className="space-y-3 text-sm leading-6 text-slate-200">
                <li>1. 如果你在 60 歲退休、65 歲才開始月領年金，中間 5 年是否願意維持較低支出？</li>
                <li>2. 你的投資資產中，有多少比例屬於高波動資產？退休前是否需要逐步降低風險？</li>
                <li>3. 除了勞保 / 勞退外，是否有租金、股息或其他被動收入可納入 65 歲後現金流？</li>
                <li>4. 若目標是提升退休成功率，你比較願意：延後退休、降低退休支出，還是增加每月儲蓄？</li>
              </ol>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildRadarMetrics,
  calculateRetirement,
  calculateScenarios,
  calculateSummary,
  defaultInput,
  FinancialInput,
  formatCurrency,
  formatPercent,
} from "@/lib/finance";

const storageKey = "private-finance-agent:v1";

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

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-white/10">
      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState<FinancialInput>(loadInitialInput);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(input));
  }, [input]);

  const summary = useMemo(() => calculateSummary(input), [input]);
  const retirement = useMemo(() => calculateRetirement(input), [input]);
  const scenarios = useMemo(() => calculateScenarios(input), [input]);
  const radarMetrics = useMemo(() => buildRadarMetrics(summary), [summary]);

  const totalAssetForChart = Math.max(summary.totalAssets, 1);
  const assetMix = [
    { label: "現金", value: input.assets.cash, color: "bg-cyan-400" },
    { label: "投資", value: input.assets.investments, color: "bg-indigo-400" },
    { label: "保單", value: input.assets.insuranceCashValue, color: "bg-fuchsia-400" },
    { label: "不動產", value: input.assets.realEstate, color: "bg-emerald-400" },
  ];

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
        <header className="grid gap-6 rounded-[2rem] border border-cyan-400/20 bg-slate-950/50 p-8 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs tracking-[0.2em] text-cyan-200">
              PRIVATE FINANCE AGENT V2
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              高隱私財務規劃助手
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              第二版加入三情境比較、視覺化財務指標與產品化摘要。目標不是讓使用者把家底交出來，而是讓他在匿名、低心理壓力的前提下，先看懂自己的財務健康與退休可能性。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 px-3 py-1">local-first</span>
              <span className="rounded-full border border-white/10 px-3 py-1">三情境試算</span>
              <span className="rounded-full border border-white/10 px-3 py-1">匿名體驗</span>
              <span className="rounded-full border border-white/10 px-3 py-1">退休橋接分析</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">隱私與合規提醒</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 預設只保存在本機瀏覽器，這版沒有後端帳號系統</li>
              <li>• 不要求真名、電話、身分證、詳細帳戶名稱</li>
              <li>• 本工具屬於規劃與教育用途，不構成投資建議</li>
              <li>• 若未來上架販售，需再補隱私政策、免責聲明、刪除機制</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button onClick={exportJson} className="rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300">
                匯出 JSON
              </button>
              <button onClick={resetData} className="rounded-2xl border border-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/10">
                清除本機資料
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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Section title="1. 個人與退休設定" description="先建立退休時間軸，再逐步微調敏感參數。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField label="目前年齡" value={input.profile.currentAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, currentAge: value } })} />
                <NumberField label="退休年齡" value={input.profile.retireAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, retireAge: value } })} />
                <NumberField label="預期壽命" value={input.profile.lifeExpectancy} onChange={(value) => setInput({ ...input, profile: { ...input.profile, lifeExpectancy: value } })} />
              </div>
            </Section>

            <Section title="2. 現金流" description="退休前/後支出與每月儲蓄，是退休結果最敏感的三個槓桿。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="每月收入" value={input.cashflow.monthlyIncome} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyIncome: value } })} />
                <NumberField label="每月可儲蓄" value={input.cashflow.monthlySaving} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlySaving: value } })} />
                <NumberField label="退休前每月支出" value={input.cashflow.monthlyExpensePre} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePre: value } })} />
                <NumberField label="退休後每月支出" value={input.cashflow.monthlyExpensePost} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePost: value } })} />
              </div>
            </Section>

            <Section title="3. 資產與負債" description="目前先維持簡化版四大資產分類，適合匿名起步。">
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
            <Section title="財務健康儀表板" description="先用產品化視角，將使用者最關心的安全感可視化。">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="負債資產比" value={formatPercent(summary.debtAssetRatio)} hint="理想通常低於 40%~45%" />
                <MetricCard label="淨值比" value={formatPercent(summary.solvencyRatio)} hint="越高代表財務緩衝越強" />
                <MetricCard label="流動性比率" value={formatPercent(summary.liquidityRatio)} hint="流動資產 / 總負債" />
                <MetricCard label="儲蓄率" value={formatPercent(summary.savingRatio)} hint="每月儲蓄 / 每月收入" />
              </div>

              <div className="mt-6 space-y-4">
                {radarMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{metric.label}</span>
                      <span>{metric.value.toFixed(0)} / 100</span>
                    </div>
                    <ProgressBar value={metric.value} colorClass="bg-gradient-to-r from-cyan-400 to-emerald-400" />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="資產配置視覺化" description="高隱私版本不需要列出細帳，只看配置就能做初步規劃。">
              <div className="space-y-4">
                {assetMix.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{item.label}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                    <ProgressBar value={(item.value / totalAssetForChart) * 100} colorClass={item.color} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="退休試算結果" description="以目前輸入作為基準，估算資金缺口與可支撐年限。">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="目前可投入退休資產" value={formatCurrency(retirement.currentPortfolio)} hint="流動資產基礎" />
                <MetricCard label="退休時資產估值" value={formatCurrency(retirement.portfolioAtRetire)} hint="考慮退休前繼續儲蓄" />
                <MetricCard label="65 歲前橋接需求" value={formatCurrency(retirement.bridgeNeed)} hint="無年金空窗期" />
                <MetricCard label="退休總需求現值" value={formatCurrency(retirement.totalNeed)} hint="橋接期 + 65 歲後需求" />
                <MetricCard label="資金缺口 / 裕度" value={formatCurrency(retirement.gap)} hint={retirement.gap >= 0 ? "目前假設下可支撐" : "需延後退休或降支出"} />
                <MetricCard label="可支撐到年齡" value={`${retirement.sustainAge} 歲`} hint={`評等 ${retirement.healthGrade}`} />
              </div>
            </Section>
          </div>
        </div>

        <Section title="三情境比較" description="這是第二版最重要的產品功能：不要只給單一答案，而是讓使用者看到範圍。">
          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{scenario.label}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs ${scenario.result.healthGrade === "A" ? "bg-emerald-400/20 text-emerald-200" : scenario.result.healthGrade === "B" ? "bg-amber-400/20 text-amber-200" : "bg-rose-400/20 text-rose-200"}`}>
                    {scenario.result.healthGrade}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{scenario.adjustment}</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between"><span>退休時資產</span><span>{formatCurrency(scenario.result.portfolioAtRetire)}</span></div>
                  <div className="flex items-center justify-between"><span>退休總需求</span><span>{formatCurrency(scenario.result.totalNeed)}</span></div>
                  <div className="flex items-center justify-between"><span>缺口 / 裕度</span><span>{formatCurrency(scenario.result.gap)}</span></div>
                  <div className="flex items-center justify-between"><span>可支撐到</span><span>{scenario.result.sustainAge} 歲</span></div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Section title="Agent 規劃摘要" description="這不是最後的建議，而是引導使用者做下一步決策。">
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              <li>• 若保守情境下缺口明顯為負，優先檢查退休後支出是否能下修 10%~15%。</li>
              <li>• 若你不想大幅降低生活品質，延後退休 2~5 年通常比追求高報酬更可控。</li>
              <li>• 若流動性高但投資比例過低，可再評估退休前資產配置優化，但應避免過度追高風險。</li>
              <li>• 65 歲前空窗期是核心風險點；請先確認勞保 / 勞退預估月領，再回填模型。</li>
            </ul>
          </Section>

          <Section title="上架前還需要補的功能" description="這一版已接近 demo 可展示狀態，但離販售版仍有幾個缺口。">
            <ol className="space-y-3 text-sm leading-6 text-slate-200">
              <li>1. client-side encryption：讓瀏覽器端資料即使被讀到也難以理解。</li>
              <li>2. PDF 報告輸出：讓使用者拿到真正可保存的財務規劃摘要。</li>
              <li>3. 對話式訪談流程：把現在的靜態欄位改成一步一步引導，降低輸入壓力。</li>
              <li>4. 法務頁：隱私政策、服務條款、免責聲明。</li>
              <li>5. GitHub / Vercel 上線：做公開 demo 或 private preview。</li>
            </ol>
          </Section>
        </div>
      </div>
    </main>
  );
}

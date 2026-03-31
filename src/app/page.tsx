"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAdvisorInsight } from "@/lib/advisor";
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
import { defaultEvents, PlanningEvent, projectTimeline } from "@/lib/timeline";

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

function MiniBarChart({
  values,
  colorClass,
  formatter,
}: {
  values: number[];
  colorClass: string;
  formatter: (value: number) => string;
}) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);
  return (
    <div className="flex h-44 items-end gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      {values.map((value, index) => {
        const height = `${Math.max(8, (Math.abs(value) / max) * 100)}%`;
        return (
          <div key={`${index}-${value}`} className="group flex flex-1 flex-col items-center justify-end gap-2">
            <div className="text-[10px] text-slate-500 opacity-0 transition group-hover:opacity-100">{formatter(value)}</div>
            <div className={`w-full rounded-t-lg ${colorClass}`} style={{ height }} />
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState<FinancialInput>(loadInitialInput);
  const [events] = useState<PlanningEvent[]>(() => defaultEvents(new Date().getFullYear()));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(input));
  }, [input]);

  const summary = useMemo(() => calculateSummary(input), [input]);
  const retirement = useMemo(() => calculateRetirement(input), [input]);
  const scenarios = useMemo(() => calculateScenarios(input), [input]);
  const radarMetrics = useMemo(() => buildRadarMetrics(summary), [summary]);
  const advisorInsight = useMemo(() => buildAdvisorInsight(input, summary, retirement), [input, summary, retirement]);
  const timeline = useMemo(() => projectTimeline(input, events, new Date().getFullYear(), 15), [input, events]);

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
              PRIVATE FINANCE AGENT V4
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              事件時間軸 + 顧問圖表版
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              V4 開始把人生事件真正放進模型：不只看退休數字，而是看教育、買車、裝潢、賣房、婚嫁與保險補強如何改變你的流動資產軌跡與年度現金流。
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">這一版的突破</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 加入預設人生事件模型</li>
              <li>• 顯示流動資產軌跡圖</li>
              <li>• 顯示年度現金流圖</li>
              <li>• 顯示關鍵事件時間軸</li>
              <li>• 仍維持 local-first 與匿名試用</li>
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

            <Section title="2. 現金流與資產" description="目前仍是簡化輸入，但結果已開始有顧問式圖表。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="每月收入" value={input.cashflow.monthlyIncome} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyIncome: value } })} />
                <NumberField label="每月可儲蓄" value={input.cashflow.monthlySaving} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlySaving: value } })} />
                <NumberField label="退休前每月支出" value={input.cashflow.monthlyExpensePre} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePre: value } })} />
                <NumberField label="退休後每月支出" value={input.cashflow.monthlyExpensePost} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePost: value } })} />
                <NumberField label="現金 / 存款" value={input.assets.cash} onChange={(value) => setInput({ ...input, assets: { ...input.assets, cash: value } })} />
                <NumberField label="投資資產" value={input.assets.investments} onChange={(value) => setInput({ ...input, assets: { ...input.assets, investments: value } })} />
                <NumberField label="保單現值" value={input.assets.insuranceCashValue} onChange={(value) => setInput({ ...input, assets: { ...input.assets, insuranceCashValue: value } })} />
                <NumberField label="不動產估值" value={input.assets.realEstate} onChange={(value) => setInput({ ...input, assets: { ...input.assets, realEstate: value } })} />
                <NumberField label="房貸餘額" value={input.liabilities.mortgage} onChange={(value) => setInput({ ...input, liabilities: { ...input.liabilities, mortgage: value } })} />
                <NumberField label="65 歲起每月勞保 + 勞退" value={input.retirement.monthlyPension} onChange={(value) => setInput({ ...input, retirement: { ...input.retirement, monthlyPension: value } })} />
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

            <Section title="資產配置視覺化" description="不揭露細帳，也能先看資產結構是否失衡。">
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
          </div>
        </div>

        <Section title="流動資產軌跡圖" description="這是 V4 的核心圖：看見未來 15 年流動資產如何受人生事件影響。">
          <MiniBarChart values={timeline.map((row) => row.endAsset)} colorClass="bg-cyan-400" formatter={formatCurrency} />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MetricCard label="15 年後流動資產" value={formatCurrency(timeline.at(-1)?.endAsset ?? 0)} hint="若出現負值，代表模型已顯示結構性風險" />
            <MetricCard label="最低資產年份" value={`${timeline.reduce((min, row) => (row.endAsset < min.endAsset ? row : min), timeline[0]).year}`} hint="這通常就是最需要補強的危險年份" />
            <MetricCard label="退休評等" value={retirement.healthGrade} hint={`可支撐到 ${retirement.sustainAge} 歲`} />
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Section title="年度現金流圖" description="看每年因投資、儲蓄、年金與事件造成的淨現金流變化。">
            <MiniBarChart values={timeline.map((row) => row.income + row.investmentGain + row.eventNet - row.expense)} colorClass="bg-emerald-400" formatter={formatCurrency} />
            <div className="mt-4 text-sm leading-6 text-slate-300">
              這張圖不是只看投資報酬，而是把退休前儲蓄、退休後年金、一次性事件支出 / 收入一起看，才更接近真正顧問的分析方式。
            </div>
          </Section>

          <Section title="關鍵事件時間軸" description="現在的事件仍是預設版本，下一步可改成可編輯與對話引導。">
            <div className="space-y-4">
              {timeline.filter((row) => row.notes.length > 0).map((row) => (
                <div key={row.year} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{row.year} 年（{row.age} 歲）</div>
                      <div className="mt-1 text-sm text-slate-300">{row.notes.join("、")}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs ${row.eventNet >= 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"}`}>
                      {row.eventNet >= 0 ? `+ ${formatCurrency(row.eventNet)}` : formatCurrency(row.eventNet)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title="三情境比較" description="不要只給單一答案，而是讓使用者看到區間與決策敏感度。">
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

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Section title="顧問式摘要" description="把顧問會說的人話放進產品，讓使用者知道先補哪裡。">
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {advisorInsight.narrative.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Section>

          <Section title="缺口優先順序" description="先補基礎安全，再補中期壓力，最後做優化。">
            <div className="space-y-4">
              {advisorInsight.gaps.map((gap) => (
                <div key={gap.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-white">{gap.title}</div>
                    <span className={`rounded-full px-3 py-1 text-xs ${gap.priority === "critical" ? "bg-rose-400/20 text-rose-200" : gap.priority === "important" ? "bg-amber-400/20 text-amber-200" : "bg-cyan-400/20 text-cyan-200"}`}>
                      {gap.priority === "critical" ? "先補" : gap.priority === "important" ? "接著補" : "之後優化"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{gap.reason}</p>
                  <p className="mt-2 text-sm text-cyan-200">建議行動：{gap.action}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

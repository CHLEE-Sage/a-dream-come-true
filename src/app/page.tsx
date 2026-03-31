"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
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
  if (typeof window === "undefined") return defaultInput;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultInput;
  try {
    return JSON.parse(raw) as FinancialInput;
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaultInput;
  }
}

type SectionProps = { title: string; description: string; children: React.ReactNode };

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

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400" />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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
  const [events, setEvents] = useState<PlanningEvent[]>(() => defaultEvents(new Date().getFullYear()));
  const [newEvent, setNewEvent] = useState<PlanningEvent>({ id: "custom-new", year: new Date().getFullYear() + 1, label: "", type: "expense", category: "education", amount: 0 });

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
    const blob = new Blob([JSON.stringify({ input, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "private-finance-agent-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    setInput(defaultInput);
    setEvents(defaultEvents(new Date().getFullYear()));
    window.localStorage.removeItem(storageKey);
  };

  const addEvent = () => {
    if (!newEvent.label || newEvent.amount === 0) return;
    const eventId = `custom-${crypto.randomUUID()}`;
    setEvents((prev) => [...prev, { ...newEvent, id: eventId }].sort((a, b) => a.year - b.year));
    setNewEvent({ ...newEvent, id: "custom-new", label: "", amount: 0 });
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#164e63,#020617_55%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2rem] border border-cyan-400/20 bg-slate-950/50 p-8 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs tracking-[0.2em] text-cyan-200">PRIVATE FINANCE AGENT V4.5</div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">可編輯事件 + 正式圖表版</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">V4.5 將事件變成可編輯資料，並改用正式圖表呈現流動資產軌跡與年度現金流。這讓工具更接近真正的財務顧問工作台，而不是靜態試算頁。</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">這一版新增</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 可自行新增人生事件</li>
              <li>• Recharts 正式折線 / 柱狀圖</li>
              <li>• 事件對圖表即時生效</li>
              <li>• 更像顧問工作台的畫面結構</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button onClick={exportJson} className="rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300">匯出 JSON</button>
              <button onClick={resetData} className="rounded-2xl border border-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/10">清除本機資料</button>
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
            <Section title="核心輸入" description="目前先保留簡化輸入，重點放在事件與圖表推演。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="目前年齡" value={input.profile.currentAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, currentAge: value } })} />
                <NumberField label="退休年齡" value={input.profile.retireAge} onChange={(value) => setInput({ ...input, profile: { ...input.profile, retireAge: value } })} />
                <NumberField label="預期壽命" value={input.profile.lifeExpectancy} onChange={(value) => setInput({ ...input, profile: { ...input.profile, lifeExpectancy: value } })} />
                <NumberField label="每月可儲蓄" value={input.cashflow.monthlySaving} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlySaving: value } })} />
                <NumberField label="退休前每月支出" value={input.cashflow.monthlyExpensePre} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePre: value } })} />
                <NumberField label="退休後每月支出" value={input.cashflow.monthlyExpensePost} onChange={(value) => setInput({ ...input, cashflow: { ...input.cashflow, monthlyExpensePost: value } })} />
                <NumberField label="現金 / 存款" value={input.assets.cash} onChange={(value) => setInput({ ...input, assets: { ...input.assets, cash: value } })} />
                <NumberField label="投資資產" value={input.assets.investments} onChange={(value) => setInput({ ...input, assets: { ...input.assets, investments: value } })} />
                <NumberField label="保單現值" value={input.assets.insuranceCashValue} onChange={(value) => setInput({ ...input, assets: { ...input.assets, insuranceCashValue: value } })} />
                <NumberField label="房貸餘額" value={input.liabilities.mortgage} onChange={(value) => setInput({ ...input, liabilities: { ...input.liabilities, mortgage: value } })} />
              </div>
            </Section>

            <Section title="可編輯人生事件" description="把未來大額收支與保障補強正式放進時間軸。">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <NumberField label="年份" value={newEvent.year} onChange={(value) => setNewEvent({ ...newEvent, year: value })} />
                <TextField label="事件名稱" value={newEvent.label} onChange={(value) => setNewEvent({ ...newEvent, label: value })} />
                <NumberField label="金額" value={newEvent.amount} onChange={(value) => setNewEvent({ ...newEvent, amount: value })} />
                <SelectField label="類型" value={newEvent.type} onChange={(value) => setNewEvent({ ...newEvent, type: value as PlanningEvent["type"] })} options={[{ value: "expense", label: "支出" }, { value: "income", label: "收入" }, { value: "protection", label: "保障/保費" }]} />
                <SelectField label="分類" value={newEvent.category} onChange={(value) => setNewEvent({ ...newEvent, category: value as PlanningEvent["category"] })} options={[{ value: "education", label: "教育" }, { value: "housing", label: "房屋" }, { value: "vehicle", label: "車輛" }, { value: "family", label: "家庭" }, { value: "insurance", label: "保險" }, { value: "income", label: "收入" }, { value: "care", label: "照護" }]} />
                <div className="flex items-end"><button onClick={addEvent} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300">新增事件</button></div>
              </div>
              <div className="mt-6 space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div>
                      <div className="font-medium text-white">{event.year}｜{event.label}</div>
                      <div className="text-sm text-slate-400">{event.category} · {event.type === "income" ? "收入" : event.type === "expense" ? "支出" : "保障"} · {formatCurrency(event.amount)}</div>
                    </div>
                    <button onClick={() => removeEvent(event.id)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-400/10">刪除</button>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="財務健康儀表板" description="讓使用者先知道自己目前的安全感在哪裡。">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="負債資產比" value={formatPercent(summary.debtAssetRatio)} hint="理想通常低於 40%~45%" />
                <MetricCard label="淨值比" value={formatPercent(summary.solvencyRatio)} hint="越高代表財務緩衝越強" />
                <MetricCard label="流動性比率" value={formatPercent(summary.liquidityRatio)} hint="流動資產 / 總負債" />
                <MetricCard label="儲蓄率" value={formatPercent(summary.savingRatio)} hint="每月儲蓄 / 每月收入" />
              </div>
              <div className="mt-6 space-y-4">
                {radarMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300"><span>{metric.label}</span><span>{metric.value.toFixed(0)} / 100</span></div>
                    <ProgressBar value={metric.value} colorClass="bg-gradient-to-r from-cyan-400 to-emerald-400" />
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-4">
                {assetMix.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300"><span>{item.label}</span><span>{formatCurrency(item.value)}</span></div>
                    <ProgressBar value={(item.value / totalAssetForChart) * 100} colorClass={item.color} />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="流動資產軌跡圖" description="正式折線圖：看事件與退休決策如何改變未來 15 年的流動資產。">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(Number(v) / 10000)}萬`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
                  <Line type="monotone" dataKey="endAsset" stroke="#22d3ee" strokeWidth={3} dot={false} name="期末流動資產" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="年度現金流分項圖" description="正式柱狀圖：把投資增長、收入、事件與支出一起看。">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(Number(v) / 10000)}萬`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
                  <Legend />
                  <Bar dataKey="investmentGain" stackId="a" fill="#38bdf8" name="投資增長" />
                  <Bar dataKey="income" stackId="a" fill="#22c55e" name="收入 / 儲蓄 / 年金" />
                  <Bar dataKey="eventNet" stackId="a" fill="#f59e0b" name="事件淨額" />
                  <Bar dataKey="expense" stackId="b" fill="#f43f5e" name="年度支出" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Section title="關鍵事件時間軸" description="讓使用者一眼看出哪幾年要準備什麼。">
            <div className="space-y-4">
              {timeline.filter((row) => row.notes.length > 0).map((row) => (
                <div key={row.year} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{row.year} 年（{row.age} 歲）</div>
                      <div className="mt-1 text-sm text-slate-300">{row.notes.join("、")}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs ${row.eventNet >= 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"}`}>{row.eventNet >= 0 ? `+ ${formatCurrency(row.eventNet)}` : formatCurrency(row.eventNet)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="顧問式摘要與缺口排序" description="現在不只顯示結果，也會幫你整理應先補哪個洞。">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-base font-semibold text-white">顧問摘要</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                  {advisorInsight.narrative.map((item) => (<li key={item}>• {item}</li>))}
                </ul>
              </div>
              {advisorInsight.gaps.map((gap) => (
                <div key={gap.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-white">{gap.title}</div>
                    <span className={`rounded-full px-3 py-1 text-xs ${gap.priority === "critical" ? "bg-rose-400/20 text-rose-200" : gap.priority === "important" ? "bg-amber-400/20 text-amber-200" : "bg-cyan-400/20 text-cyan-200"}`}>{gap.priority === "critical" ? "先補" : gap.priority === "important" ? "接著補" : "之後優化"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{gap.reason}</p>
                  <p className="mt-2 text-sm text-cyan-200">建議行動：{gap.action}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title="三情境比較" description="保守 / 基準 / 積極，讓使用者看到範圍而不是單點答案。">
          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{scenario.label}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs ${scenario.result.healthGrade === "A" ? "bg-emerald-400/20 text-emerald-200" : scenario.result.healthGrade === "B" ? "bg-amber-400/20 text-amber-200" : "bg-rose-400/20 text-rose-200"}`}>{scenario.result.healthGrade}</span>
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
      </div>
    </main>
  );
}

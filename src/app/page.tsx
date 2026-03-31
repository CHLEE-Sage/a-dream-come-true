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
  defaultDiscoveryAnswers,
  DiscoveryAnswers,
  discoveryQuestions,
  recommendEvents,
} from "@/lib/discovery";
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
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultDiscoveryAnswers);
  const [discoveryStep, setDiscoveryStep] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(input));
  }, [input]);

  const summary = useMemo(() => calculateSummary(input), [input]);
  const retirement = useMemo(() => calculateRetirement(input), [input]);
  const scenarios = useMemo(() => calculateScenarios(input), [input]);
  const radarMetrics = useMemo(() => buildRadarMetrics(summary), [summary]);
  const advisorInsight = useMemo(() => buildAdvisorInsight(input, summary, retirement), [input, summary, retirement]);
  const timeline = useMemo(() => projectTimeline(input, events, new Date().getFullYear(), 15), [input, events]);
  const recommendedEvents = useMemo(() => recommendEvents(input, answers, new Date().getFullYear()), [input, answers]);
  const currentQuestion = discoveryQuestions[discoveryStep];

  const totalAssetForChart = Math.max(summary.totalAssets, 1);
  const assetMix = [
    { label: "現金", value: input.assets.cash, color: "bg-cyan-400" },
    { label: "投資", value: input.assets.investments, color: "bg-indigo-400" },
    { label: "保單", value: input.assets.insuranceCashValue, color: "bg-fuchsia-400" },
    { label: "不動產", value: input.assets.realEstate, color: "bg-emerald-400" },
  ];

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ input, events, answers }, null, 2)], { type: "application/json" });
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
    setAnswers(defaultDiscoveryAnswers);
    setDiscoveryStep(0);
    window.localStorage.removeItem(storageKey);
  };

  const addEvent = () => {
    if (!newEvent.label || newEvent.amount === 0) return;
    const eventId = `custom-${crypto.randomUUID()}`;
    setEvents((prev) => [...prev, { ...newEvent, id: eventId }].sort((a, b) => a.year - b.year));
    setNewEvent({ ...newEvent, id: "custom-new", label: "", amount: 0 });
  };

  const addRecommendedEvent = (event: PlanningEvent) => {
    setEvents((prev) => {
      if (prev.some((item) => item.id === event.id || (item.year === event.year && item.label === event.label))) {
        return prev;
      }
      return [...prev, event].sort((a, b) => a.year - b.year);
    });
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const setAnswer = (key: keyof DiscoveryAnswers, value: boolean | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#164e63,#020617_55%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2rem] border border-cyan-400/20 bg-slate-950/50 p-8 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs tracking-[0.2em] text-cyan-200">PRIVATE FINANCE AGENT V5</div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">對話式 Discovery + 事件推薦版</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">V5 把顧問式 discovery 放進產品：先一步一步問，再根據答案自動推薦事件，最後把事件丟進時間軸、圖表與缺口排序。</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">V5 重點</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• 對話式顧問引導</li>
              <li>• 自動推薦教育 / 婚嫁 / 換屋 / 保險 / 賣房等事件</li>
              <li>• 一鍵把推薦事件加入時間軸</li>
              <li>• 事件會即時更新圖表與摘要</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button onClick={exportJson} className="rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300">匯出 JSON</button>
              <button onClick={resetData} className="rounded-2xl border border-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/10">重設</button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Section title="對話式 Discovery" description="先像顧問一樣問對問題，而不是先叫使用者自己想到全部欄位。">
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/50 p-5">
              <div className="text-sm text-slate-400">問題 {discoveryStep + 1} / {discoveryQuestions.length}</div>
              <div className="mt-2 text-xl font-semibold text-white">{currentQuestion.title}</div>
              <div className="mt-2 text-sm text-slate-300">{currentQuestion.help}</div>
              <div className="mt-5">
                {currentQuestion.type === "boolean" ? (
                  <div className="flex gap-3">
                    <button onClick={() => setAnswer(currentQuestion.key, true)} className={`rounded-2xl px-4 py-3 ${answers[currentQuestion.key] === true ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-slate-900/60 text-white"}`}>是</button>
                    <button onClick={() => setAnswer(currentQuestion.key, false)} className={`rounded-2xl px-4 py-3 ${answers[currentQuestion.key] === false ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-slate-900/60 text-white"}`}>否</button>
                  </div>
                ) : (
                  <NumberField label="" value={Number(answers[currentQuestion.key])} onChange={(value) => setAnswer(currentQuestion.key, value)} />
                )}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setDiscoveryStep((s) => Math.max(0, s - 1))} className="rounded-2xl border border-white/10 px-4 py-2 text-white">上一步</button>
                <button onClick={() => setDiscoveryStep((s) => Math.min(discoveryQuestions.length - 1, s + 1))} className="rounded-2xl bg-cyan-400 px-4 py-2 font-medium text-slate-950">下一步</button>
              </div>
            </div>
          </Section>

          <Section title="推薦事件清單" description="根據回答自動推薦可能被忽略的人生事件。可一鍵加入時間軸。">
            <div className="space-y-4">
              {recommendedEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{event.year}｜{event.label}</div>
                      <div className="mt-1 text-sm text-slate-400">{event.category} · {event.type === "income" ? "收入" : event.type === "expense" ? "支出" : "保障"} · {formatCurrency(event.amount)}</div>
                    </div>
                    <button onClick={() => addRecommendedEvent(event)} className="rounded-2xl bg-emerald-400 px-4 py-2 font-medium text-slate-950">加入</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="總資產" value={formatCurrency(summary.totalAssets)} hint="現金 + 投資 + 保單現值 + 不動產" />
          <MetricCard label="總負債" value={formatCurrency(summary.totalLiabilities)} hint={`負債資產比 ${formatPercent(summary.debtAssetRatio)}`} />
          <MetricCard label="淨資產" value={formatCurrency(summary.netWorth)} hint={`償債能力 ${formatPercent(summary.solvencyRatio)}`} />
          <MetricCard label="流動資產" value={formatCurrency(summary.liquidAssets)} hint={`流動性比率 ${formatPercent(summary.liquidityRatio)}`} />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="流動資產軌跡圖" description="看推薦事件加入後，未來 15 年流動資產如何改變。">
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

          <Section title="年度現金流分項圖" description="把投資增長、收入、事件與支出一起看。">
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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Section title="核心輸入" description="仍保留手動調整核心財務欄位。">
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

          <Section title="目前事件清單" description="推薦事件與手動事件會一起放在這裡，供你刪修。">
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

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Section title="顧問式摘要與缺口排序" description="現在事件已由 discovery 推出，因此摘要更像真正顧問的結論。">
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

          <Section title="三情境比較" description="保守 / 基準 / 積極，讓使用者看到範圍而不是單點答案。">
            <div className="grid gap-4 lg:grid-cols-1">
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
      </div>
    </main>
  );
}

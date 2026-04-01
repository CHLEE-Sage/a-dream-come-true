"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildAdvisorInsight } from "@/lib/advisor";
import {
  defaultDiscoveryAnswers,
  DiscoveryAnswers,
  getDiscoveryQuestions,
  RecommendedEvent,
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
import {
  defaultEvents,
  PlanningEvent,
  PlanningEventCategory,
  PlanningEventType,
  projectTimeline,
} from "@/lib/timeline";

const storageKey = "private-finance-agent:v2";
const currentYear = new Date().getFullYear();
const inputClass =
  "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400";

type SavedState = {
  input: FinancialInput;
  events: PlanningEvent[];
  answers: DiscoveryAnswers;
  recommendationEdits: Record<string, Partial<PlanningEvent>>;
  dismissedRecommendationIds: string[];
};

const typeOptions: { value: PlanningEventType; label: string }[] = [
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
  { value: "protection", label: "保障" },
];

const categoryOptions: { value: PlanningEventCategory; label: string }[] = [
  { value: "education", label: "教育" },
  { value: "housing", label: "房屋" },
  { value: "vehicle", label: "車輛" },
  { value: "family", label: "家庭支持" },
  { value: "insurance", label: "保險" },
  { value: "income", label: "收入變化" },
  { value: "care", label: "照護" },
];

function sortEvents(events: PlanningEvent[]) {
  return [...events].sort((a, b) =>
    a.year === b.year ? a.label.localeCompare(b.label) : a.year - b.year,
  );
}

function loadState(): SavedState {
  const fallback: SavedState = {
    input: defaultInput,
    events: defaultEvents(),
    answers: defaultDiscoveryAnswers,
    recommendationEdits: {},
    dismissedRecommendationIds: [],
  };
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      input: parsed.input ?? fallback.input,
      events: sortEvents(parsed.events ?? fallback.events),
      answers: { ...fallback.answers, ...(parsed.answers ?? {}) },
      recommendationEdits: parsed.recommendationEdits ?? {},
      dismissedRecommendationIds: parsed.dismissedRecommendationIds ?? [],
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

function Panel({
  title,
  desc,
  aside,
  children,
}: {
  title: string;
  desc: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(2,8,23,0.42)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">{desc}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Home() {
  const initial = useMemo(() => loadState(), []);
  const [input, setInput] = useState(initial.input);
  const [events, setEvents] = useState(initial.events);
  const [answers, setAnswers] = useState(initial.answers);
  const [recommendationEdits, setRecommendationEdits] = useState(
    initial.recommendationEdits,
  );
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState(
    initial.dismissedRecommendationIds,
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlanningEvent>({
    id: "draft",
    year: currentYear + 1,
    label: "",
    type: "expense",
    category: "education",
    amount: 0,
    source: "manual",
  });

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        input,
        events,
        answers,
        recommendationEdits,
        dismissedRecommendationIds,
      }),
    );
  }, [answers, dismissedRecommendationIds, events, input, recommendationEdits]);

  const summary = useMemo(() => calculateSummary(input), [input]);
  const retirement = useMemo(() => calculateRetirement(input), [input]);
  const scenarios = useMemo(() => calculateScenarios(input), [input]);
  const radar = useMemo(() => buildRadarMetrics(summary), [summary]);
  const timeline = useMemo(
    () => projectTimeline(input, events, currentYear, 15),
    [events, input],
  );
  const questions = useMemo(
    () => getDiscoveryQuestions(answers, input),
    [answers, input],
  );
  const recommendations = useMemo(
    () =>
      recommendEvents(input, answers, currentYear)
        .filter((item) => !dismissedRecommendationIds.includes(item.id))
        .map((item) => ({ ...item, ...recommendationEdits[item.id] })) as RecommendedEvent[],
    [answers, dismissedRecommendationIds, input, recommendationEdits],
  );
  const acceptedIds = useMemo(
    () =>
      new Set(
        events
          .filter((event) => event.source === "recommended")
          .map((event) => event.id.replace(/^accepted-/, "")),
      ),
    [events],
  );
  const insight = useMemo(
    () =>
      buildAdvisorInsight({
        input,
        answers,
        summary,
        retirement,
        timeline,
        acceptedEvents: events,
        recommendations,
      }),
    [answers, events, input, recommendations, retirement, summary, timeline],
  );

  const currentStep = Math.min(step, Math.max(0, questions.length - 1));
  const question = questions[currentStep];
  const lowPoint = timeline.reduce(
    (current, row) => (row.endAsset < current.endAsset ? row : current),
    timeline[0],
  );

  const setAnswer = (key: keyof DiscoveryAnswers, value: boolean | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const updateRecommendation = (id: string, patch: Partial<PlanningEvent>) => {
    setRecommendationEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const acceptRecommendation = (item: RecommendedEvent) => {
    const nextEvent: PlanningEvent = {
      id: `accepted-${item.id}`,
      year: item.year,
      label: item.label,
      type: item.type,
      category: item.category,
      amount: item.amount,
      note: item.note,
      source: "recommended",
    };
    setEvents((prev) =>
      sortEvents([...prev.filter((event) => event.id !== nextEvent.id), nextEvent]),
    );
  };

  const updateEvent = (id: string, patch: Partial<PlanningEvent>) => {
    setEvents((prev) =>
      sortEvents(prev.map((event) => (event.id === id ? { ...event, ...patch } : event))),
    );
  };

  const addDraftEvent = () => {
    if (!draft.label.trim() || draft.amount <= 0) return;
    setEvents((prev) =>
      sortEvents([
        ...prev,
        { ...draft, id: `manual-${crypto.randomUUID()}`, source: "manual" },
      ]),
    );
    setDraft((prev) => ({ ...prev, label: "", amount: 0 }));
  };

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2.25rem] border border-cyan-300/20 bg-slate-950/60 p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs tracking-[0.24em] text-cyan-100">PRIVATE FINANCE AGENT V5.5</div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">像一位冷靜、有經驗，也願意替你多想一步的財務顧問。</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">先找出還沒被放進計畫的人生事件，再把它們放進時間軸，直接看出哪一年最危險、哪個假設最值得先修。</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">目前最重要的一句話</div>
            <div className="mt-3 text-2xl font-semibold leading-9 text-white">{insight.headline}</div>
            <div className="mt-5 grid gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">危險低點：{lowPoint.year} 年 / {formatCurrency(lowPoint.endAsset)}</div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">退休缺口：{formatCurrency(retirement.gap)}</div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">高優先推薦：{recommendations.filter((item) => item.priority === "high").length} 項</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"><div className="text-sm text-slate-400">總資產</div><div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.totalAssets)}</div><div className="mt-2 text-xs text-slate-400">現金、投資、保單現金價值與房地產加總。</div></div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"><div className="text-sm text-slate-400">總負債</div><div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.totalLiabilities)}</div><div className="mt-2 text-xs text-slate-400">資產負債比 {formatPercent(summary.debtAssetRatio)}</div></div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"><div className="text-sm text-slate-400">淨值</div><div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.netWorth)}</div><div className="mt-2 text-xs text-slate-400">償債後保留 {formatPercent(summary.solvencyRatio)} 的資產厚度</div></div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"><div className="text-sm text-slate-400">流動資產</div><div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.liquidAssets)}</div><div className="mt-2 text-xs text-slate-400">約可支撐 {summary.emergencyFundMonths.toFixed(1)} 個月支出</div></div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel title="顧問式 Discovery" desc="問題會依你的家庭與退休條件分支。先回答幾個關鍵問題，我就能抓出真正需要放進計畫的事件。" aside={<span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">第 {currentStep + 1} / {questions.length} 題</span>}>
            <div className="rounded-[1.5rem] border border-cyan-300/15 bg-slate-950/45 p-5">
              <div className="text-sm text-slate-400">現在在確認的重點</div>
              <div className="mt-2 text-2xl font-semibold text-white">{question.title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{question.help}</p>
              <div className="mt-6">
                {question.type === "boolean" ? (
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setAnswer(question.key, true)} className={`rounded-2xl px-5 py-3 ${answers[question.key] === true ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-slate-900/60 text-white"}`}>是，先算進去</button>
                    <button onClick={() => setAnswer(question.key, false)} className={`rounded-2xl px-5 py-3 ${answers[question.key] === false ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-slate-900/60 text-white"}`}>目前不考慮</button>
                  </div>
                ) : (
                  <InputField label="先填一個大方向即可">
                    <input type="number" min={question.min} max={question.max} value={Number(answers[question.key])} onChange={(event) => setAnswer(question.key, Number(event.target.value))} className={inputClass} />
                  </InputField>
                )}
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <button onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-2xl border border-white/10 px-4 py-2 text-white">上一題</button>
                <button onClick={() => setStep((value) => Math.min(questions.length - 1, value + 1))} className="rounded-2xl bg-cyan-300 px-4 py-2 font-medium text-slate-950">下一題</button>
              </div>
            </div>
          </Panel>

          <Panel title="推薦事件草案" desc="這些不是直接替你做決定，而是把顧問通常會追問的項目先估出年份與金額。你可以調整，再決定是否加入正式計畫。">
            <div className="space-y-4">
              {recommendations.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-white">{item.label}</div>
                        <span className={`rounded-full px-3 py-1 text-xs ${item.priority === "high" ? "bg-rose-400/20 text-rose-100" : item.priority === "medium" ? "bg-amber-400/20 text-amber-100" : "bg-cyan-400/20 text-cyan-100"}`}>{item.priority === "high" ? "高優先" : item.priority === "medium" ? "中優先" : "低優先"}</span>
                        {acceptedIds.has(item.id) ? <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100">已加入正式計畫</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{item.reason}</p>
                      <div className="mt-2 text-xs leading-6 text-slate-400">假設：{item.assumptions.join(" / ")}</div>
                    </div>
                    <div className="text-sm text-slate-400">信心值 {(item.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <InputField label="年份"><input type="number" value={item.year} onChange={(event) => updateRecommendation(item.id, { year: Number(event.target.value) })} className={inputClass} /></InputField>
                    <InputField label="金額"><input type="number" step={10000} value={item.amount} onChange={(event) => updateRecommendation(item.id, { amount: Number(event.target.value) })} className={inputClass} /></InputField>
                    <InputField label="事件名稱"><input type="text" value={item.label} onChange={(event) => updateRecommendation(item.id, { label: event.target.value })} className={inputClass} /></InputField>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => acceptRecommendation(item)} className="rounded-2xl bg-emerald-400 px-4 py-2 font-medium text-slate-950">{acceptedIds.has(item.id) ? "更新到正式計畫" : "接受並加入計畫"}</button>
                    <button onClick={() => setRecommendationEdits((prev) => { const next = { ...prev }; delete next[item.id]; return next; })} className="rounded-2xl border border-white/10 px-4 py-2 text-white">還原估算</button>
                    <button onClick={() => setDismissedRecommendationIds((prev) => prev.includes(item.id) ? prev : [...prev, item.id])} className="rounded-2xl border border-white/10 px-4 py-2 text-white">先略過</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="顧問判讀" desc="不是只告訴你結果，而是指出最該先處理的風險順序。">
            <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/8 p-5">
              <div className="text-sm text-cyan-100">總結</div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">{insight.narrative.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {radar.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-300">{metric.label}</span><span className="text-sm text-white">{metric.value.toFixed(0)}</span></div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10"><div className={`h-2.5 rounded-full ${metric.value >= 75 ? "bg-emerald-400" : metric.value >= 55 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.max(6, Math.min(100, metric.value))}%` }} /></div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">{metric.hint}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-4">{insight.gaps.map((gap) => <div key={gap.title} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-base font-semibold text-white">{gap.title}</div><span className={`rounded-full px-3 py-1 text-xs ${gap.priority === "critical" ? "bg-rose-400/20 text-rose-100" : gap.priority === "important" ? "bg-amber-400/20 text-amber-100" : "bg-cyan-400/20 text-cyan-100"}`}>{gap.priority === "critical" ? "關鍵" : gap.priority === "important" ? "重要" : "優化"}</span></div><p className="mt-2 text-sm leading-7 text-slate-300">{gap.reason}</p><p className="mt-2 text-sm leading-7 text-cyan-100">下一步：{gap.action}</p></div>)}</div>
          </Panel>

          <Panel title="時間軸" desc="直接看出壓力在哪一年變得危險，而不是只看最後剩多少。">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(Number(value) / 10000)}萬`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "#08111f", border: "1px solid rgba(148,163,184,0.18)", borderRadius: "1rem" }} />
                  <Line type="monotone" dataKey="endAsset" stroke="#67e8f9" strokeWidth={3} dot={false} name="年末流動資產" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(Number(value) / 10000)}萬`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "#08111f", border: "1px solid rgba(148,163,184,0.18)", borderRadius: "1rem" }} />
                  <Legend />
                  <Bar dataKey="investmentGain" stackId="plus" fill="#38bdf8" name="投資增值" />
                  <Bar dataKey="income" stackId="plus" fill="#4ade80" name="儲蓄 / 年金" />
                  <Bar dataKey="eventNet" stackId="plus" fill="#f59e0b" name="事件淨影響" />
                  <Bar dataKey="expense" stackId="minus" fill="#fb7185" name="年度支出" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <Panel title="核心條件" desc="只保留真正影響規劃結果的欄位，避免把畫面變成填不完的表單。">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="目前年齡"><input type="number" value={input.profile.currentAge} onChange={(event) => setInput((prev) => ({ ...prev, profile: { ...prev.profile, currentAge: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="預計退休年齡"><input type="number" value={input.profile.retireAge} onChange={(event) => setInput((prev) => ({ ...prev, profile: { ...prev.profile, retireAge: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="每月收入"><input type="number" step={1000} value={input.cashflow.monthlyIncome} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyIncome: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="每月儲蓄"><input type="number" step={1000} value={input.cashflow.monthlySaving} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlySaving: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="退休前每月支出"><input type="number" step={1000} value={input.cashflow.monthlyExpensePre} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyExpensePre: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="退休後每月支出"><input type="number" step={1000} value={input.cashflow.monthlyExpensePost} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyExpensePost: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="現金 / 定存"><input type="number" step={10000} value={input.assets.cash} onChange={(event) => setInput((prev) => ({ ...prev, assets: { ...prev.assets, cash: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="投資資產"><input type="number" step={10000} value={input.assets.investments} onChange={(event) => setInput((prev) => ({ ...prev, assets: { ...prev.assets, investments: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="房貸餘額"><input type="number" step={10000} value={input.liabilities.mortgage} onChange={(event) => setInput((prev) => ({ ...prev, liabilities: { ...prev.liabilities, mortgage: Number(event.target.value) } }))} className={inputClass} /></InputField>
              <InputField label="每月年金"><input type="number" step={1000} value={input.retirement.monthlyPension} onChange={(event) => setInput((prev) => ({ ...prev, retirement: { ...prev.retirement, monthlyPension: Number(event.target.value) } }))} className={inputClass} /></InputField>
            </div>
          </Panel>

          <Panel title="正式事件計畫" desc="推薦事件接受後會放進這裡，你也可以手動新增與修改。">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InputField label="年份"><input type="number" value={draft.year} onChange={(event) => setDraft((prev) => ({ ...prev, year: Number(event.target.value) }))} className={inputClass} /></InputField>
              <InputField label="事件名稱"><input type="text" value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} className={inputClass} /></InputField>
              <InputField label="金額"><input type="number" step={10000} value={draft.amount} onChange={(event) => setDraft((prev) => ({ ...prev, amount: Number(event.target.value) }))} className={inputClass} /></InputField>
              <InputField label="類型"><select value={draft.type} onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as PlanningEventType }))} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
              <InputField label="分類"><select value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value as PlanningEventCategory }))} className={inputClass}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
              <div className="flex items-end"><button onClick={addDraftEvent} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950">加入事件</button></div>
            </div>
            <div className="mt-6 space-y-4">{events.map((event) => <div key={event.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><InputField label="年份"><input type="number" value={event.year} onChange={(e) => updateEvent(event.id, { year: Number(e.target.value) })} className={inputClass} /></InputField><InputField label="事件名稱"><input type="text" value={event.label} onChange={(e) => updateEvent(event.id, { label: e.target.value })} className={inputClass} /></InputField><InputField label="金額"><input type="number" step={10000} value={event.amount} onChange={(e) => updateEvent(event.id, { amount: Number(e.target.value) })} className={inputClass} /></InputField><InputField label="類型"><select value={event.type} onChange={(e) => updateEvent(event.id, { type: e.target.value as PlanningEventType })} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField><InputField label="分類"><select value={event.category} onChange={(e) => updateEvent(event.id, { category: e.target.value as PlanningEventCategory })} className={inputClass}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField><div className="flex items-end"><button onClick={() => setEvents((prev) => prev.filter((entry) => entry.id !== event.id))} className="w-full rounded-2xl border border-rose-400/30 px-4 py-3 text-rose-100">刪除事件</button></div></div></div>)}</div>
          </Panel>
        </div>

        <Panel title="情境比較" desc="好的規劃，不只要在基準情境成立，也要在保守情境下站得住。">
          <div className="grid gap-4 lg:grid-cols-3">{scenarios.map((scenario) => <div key={scenario.key} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-white">{scenario.label}</h3><span className={`rounded-full px-3 py-1 text-xs ${scenario.result.healthGrade === "A" ? "bg-emerald-400/20 text-emerald-100" : scenario.result.healthGrade === "B" ? "bg-amber-400/20 text-amber-100" : "bg-rose-400/20 text-rose-100"}`}>{scenario.result.healthGrade}</span></div><p className="mt-2 text-sm leading-7 text-slate-400">{scenario.adjustment}</p><div className="mt-4 space-y-3 text-sm text-slate-200"><div className="flex items-center justify-between"><span>退休時資產</span><span>{formatCurrency(scenario.result.portfolioAtRetire)}</span></div><div className="flex items-center justify-between"><span>總需求</span><span>{formatCurrency(scenario.result.totalNeed)}</span></div><div className="flex items-center justify-between"><span>缺口</span><span>{formatCurrency(scenario.result.gap)}</span></div><div className="flex items-center justify-between"><span>可支撐到</span><span>{scenario.result.sustainAge} 歲</span></div></div></div>)}</div>
        </Panel>
      </div>
    </main>
  );
}

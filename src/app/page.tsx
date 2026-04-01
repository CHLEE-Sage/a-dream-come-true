"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
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

const storageKey = "private-finance-agent:v4";
const currentYear = new Date().getFullYear();
const inputClass =
  "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400";

type GoalKey = "family" | "home" | "retirement" | "dream";

type ClientIntent = {
  selectedGoals: GoalKey[];
  mainConcern: string;
  dreamNote: string;
};

type SavedState = {
  input: FinancialInput;
  events: PlanningEvent[];
  answers: DiscoveryAnswers;
  recommendationEdits: Record<string, Partial<PlanningEvent>>;
  dismissedRecommendationIds: string[];
  intent: ClientIntent;
};

type DiagnosisCard = {
  heading: string;
  body: string;
  tone: "neutral" | "warning" | "action";
};

type DiagnosisPayload = {
  headline: string;
  summary: string;
  cards: DiagnosisCard[];
  next_steps: string[];
};

const goalOptions: { key: GoalKey; label: string; hint: string }[] = [
  { key: "family", label: "成家", hint: "伴侶、孩子、家庭支持與照護責任" },
  { key: "home", label: "買房", hint: "頭期、房貸、換屋、裝修與安定感" },
  { key: "retirement", label: "退休", hint: "退休時點、資產壽命與現金流" },
  { key: "dream", label: "更大的夢想", hint: "創業、移居、半退休、自由人生" },
];

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

function defaultIntent(): ClientIntent {
  return {
    selectedGoals: ["retirement"],
    mainConcern: "",
    dreamNote: "",
  };
}

function loadState(): SavedState {
  const fallback: SavedState = {
    input: defaultInput,
    events: defaultEvents(),
    answers: defaultDiscoveryAnswers,
    recommendationEdits: {},
    dismissedRecommendationIds: [],
    intent: defaultIntent(),
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
      intent: { ...fallback.intent, ...(parsed.intent ?? {}) },
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
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{desc}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function InputField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{hint}</div>
    </div>
  );
}

function goalLabel(key: GoalKey) {
  return goalOptions.find((item) => item.key === key)?.label ?? key;
}

function diagnosisToneClass(tone: DiagnosisCard["tone"]) {
  if (tone === "warning") return "border-amber-400/20 bg-amber-400/10";
  if (tone === "action") return "border-cyan-300/20 bg-cyan-300/10";
  return "border-white/10 bg-slate-950/45";
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
  const [intent, setIntent] = useState(initial.intent);
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
  const [aiDiagnosis, setAiDiagnosis] = useState<DiagnosisPayload | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        input,
        events,
        answers,
        recommendationEdits,
        dismissedRecommendationIds,
        intent,
      }),
    );
  }, [answers, dismissedRecommendationIds, events, input, intent, recommendationEdits]);

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
  const acceptedIds = new Set(
    events
      .filter((event) => event.source === "recommended")
      .map((event) => event.id.replace(/^accepted-/, "")),
  );

  const setAnswer = (key: keyof DiscoveryAnswers, value: boolean | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleGoal = (goal: GoalKey) => {
    setIntent((prev) => {
      const selectedGoals = prev.selectedGoals.includes(goal)
        ? prev.selectedGoals.filter((item) => item !== goal)
        : [...prev.selectedGoals, goal];
      return {
        ...prev,
        selectedGoals: selectedGoals.length === 0 ? ["retirement"] : selectedGoals,
      };
    });
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

  const runAiDiagnosis = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          input,
          answers,
          events,
          recommendations,
          insight,
        }),
      });
      const data = (await response.json()) as {
        diagnosis?: DiagnosisPayload;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate diagnosis.");
      }
      setAiDiagnosis(data.diagnosis ?? null);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate diagnosis.");
    } finally {
      setAiLoading(false);
    }
  };

  const goalSummary = intent.selectedGoals.map(goalLabel).join(", ");

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2.25rem] border border-cyan-300/20 bg-slate-950/60 p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs tracking-[0.24em] text-cyan-100">私人財務顧問</div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              先理解你想過怎樣的人生，再開始談錢要怎麼幫你做到。
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              真正的財務顧問，不會一開始就丟給你一堆圖表，而是先理解你的目標、擔心與目前處境，再幫你判斷該先修哪一塊。
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">目前最重要的一句話</div>
            <div className="mt-3 text-2xl font-semibold leading-9 text-white">
              {insight.headline}
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                你現在最在意：{goalSummary}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                危險低點：{lowPoint.year} 年 / {formatCurrency(lowPoint.endAsset)}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                退休缺口：{formatCurrency(retirement.gap)}
              </div>
            </div>
          </div>
        </header>

        <Panel
          title="第一步：需求與夢想"
          desc="這一段刻意做得像對話，而不是表單。因為專業顧問真正的起手式，是先聽你現在最想完成什麼。"
        >
          <div className="space-y-5">
            <div className="max-w-3xl rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="text-sm text-cyan-100">財務顧問</div>
              <div className="mt-2 text-base leading-8 text-white">
                我們先不要急著看數字。先告訴我，你現在最想完成的是什麼？
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {goalOptions.map((goal) => {
                const active = intent.selectedGoals.includes(goal.key);
                return (
                  <button
                    key={goal.key}
                    type="button"
                    onClick={() => toggleGoal(goal.key)}
                    className={`rounded-[1.5rem] border p-5 text-left transition ${
                      active
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/10 bg-slate-950/45 hover:bg-white/8"
                    }`}
                  >
                    <div className="text-lg font-semibold text-white">{goal.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{goal.hint}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="max-w-3xl rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                  <div className="text-sm text-slate-400">財務顧問</div>
                  <div className="mt-2 text-base leading-8 text-white">
                    如果只能先解決一件事，你現在最想先處理哪個問題？
                  </div>
                </div>
                <InputField label="你的回答">
                  <textarea
                    value={intent.mainConcern}
                    onChange={(event) =>
                      setIntent((prev) => ({ ...prev, mainConcern: event.target.value }))
                    }
                    className={`${inputClass} min-h-28 resize-y`}
                    placeholder="例如：我擔心退休前還完房貸後，資產不夠支撐家庭與退休。"
                  />
                </InputField>
              </div>

              <div className="space-y-4">
                <div className="max-w-3xl rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                  <div className="text-sm text-slate-400">財務顧問</div>
                  <div className="mt-2 text-base leading-8 text-white">
                    如果一切順利，你希望財務最後能支持你完成什麼樣的夢想？
                  </div>
                </div>
                <InputField label="你的期待">
                  <textarea
                    value={intent.dreamNote}
                    onChange={(event) =>
                      setIntent((prev) => ({ ...prev, dreamNote: event.target.value }))
                    }
                    className={`${inputClass} min-h-28 resize-y`}
                    placeholder="例如：55 歲半退休、換到更舒服的房子，或保留更充裕的家庭支持空間。"
                  />
                </InputField>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
              <div className="text-sm text-slate-400">對話摘要</div>
              <div className="mt-2 text-base leading-8 text-white">
                你目前最在意的是「{goalSummary}」。
                {intent.mainConcern
                  ? ` 你現在最想先解決的是：${intent.mainConcern}`
                  : " 你還沒有把最核心的擔心寫出來。"}
                {intent.dreamNote ? ` 而你真正想完成的，是：${intent.dreamNote}` : ""}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="第二步：目前財務狀態"
          desc="接下來才是現況盤點。這裡先用幾個關鍵數字掌握你的資產、負債、現金流與退休基礎。"
        >
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="總資產" value={formatCurrency(summary.totalAssets)} hint="現金、投資、保單現金價值與房地產加總。" />
            <MetricCard label="總負債" value={formatCurrency(summary.totalLiabilities)} hint={`資產負債比 ${formatPercent(summary.debtAssetRatio)}`} />
            <MetricCard label="淨值" value={formatCurrency(summary.netWorth)} hint={`償債後保留 ${formatPercent(summary.solvencyRatio)} 的資產厚度`} />
            <MetricCard label="流動資產" value={formatCurrency(summary.liquidAssets)} hint={`約可支撐 ${summary.emergencyFundMonths.toFixed(1)} 個月支出`} />
          </section>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InputField label="目前年齡"><input type="number" value={input.profile.currentAge} onChange={(event) => setInput((prev) => ({ ...prev, profile: { ...prev.profile, currentAge: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="預計退休年齡"><input type="number" value={input.profile.retireAge} onChange={(event) => setInput((prev) => ({ ...prev, profile: { ...prev.profile, retireAge: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="每月收入"><input type="number" step={1000} value={input.cashflow.monthlyIncome} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyIncome: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="每月儲蓄"><input type="number" step={1000} value={input.cashflow.monthlySaving} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlySaving: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="退休前每月支出"><input type="number" step={1000} value={input.cashflow.monthlyExpensePre} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyExpensePre: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="退休後每月支出"><input type="number" step={1000} value={input.cashflow.monthlyExpensePost} onChange={(event) => setInput((prev) => ({ ...prev, cashflow: { ...prev.cashflow, monthlyExpensePost: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="現金 / 定存"><input type="number" step={10000} value={input.assets.cash} onChange={(event) => setInput((prev) => ({ ...prev, assets: { ...prev.assets, cash: Number(event.target.value) } }))} className={inputClass} /></InputField>
            <InputField label="投資資產"><input type="number" step={10000} value={input.assets.investments} onChange={(event) => setInput((prev) => ({ ...prev, assets: { ...prev.assets, investments: Number(event.target.value) } }))} className={inputClass} /></InputField>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel
            title="第三步：顧問追問"
            desc="好的顧問不會只看你今天填的數字，還會追問那些最容易被忽略、但最會改變未來壓力的問題。"
            aside={
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                第 {currentStep + 1} / {questions.length} 題
              </span>
            }
          >
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

          <Panel
            title="第四步：顧問初步判讀"
            desc="只有在需求、現況與風險脈絡都清楚後，顧問才會開始幫你排序優先順序。"
          >
            <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/8 p-5">
              <div className="text-sm text-cyan-100">目前的判斷</div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">
                {insight.narrative.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {radar.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{metric.label}</span>
                    <span className="text-sm text-white">{metric.value.toFixed(0)}</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10">
                    <div
                      className={`h-2.5 rounded-full ${
                        metric.value >= 75
                          ? "bg-emerald-400"
                          : metric.value >= 55
                            ? "bg-amber-400"
                            : "bg-rose-400"
                      }`}
                      style={{ width: `${Math.max(6, Math.min(100, metric.value))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">{metric.hint}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title="AI 顧問診斷"
          desc="這裡是第一層 AI 顧問服務。你可以先用目前資料生成一份結構化的初步診斷，之後再微調 instruction 與 knowledge。"
          aside={
            <button
              onClick={runAiDiagnosis}
              disabled={aiLoading}
              className="rounded-2xl bg-cyan-300 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
            >
              {aiLoading ? "診斷生成中..." : "生成 AI 診斷"}
            </button>
          }
        >
          {aiError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {aiError}
            </div>
          ) : null}
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
            {aiDiagnosis ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-5">
                  <div className="text-sm text-cyan-100">AI 顧問摘要</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {aiDiagnosis.headline}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-slate-100">
                    {aiDiagnosis.summary}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {aiDiagnosis.cards.map((card) => (
                    <div
                      key={card.heading}
                      className={`rounded-3xl border p-5 ${diagnosisToneClass(card.tone)}`}
                    >
                      <div className="text-base font-semibold text-white">
                        {card.heading}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-100">
                        {card.body}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                  <div className="text-base font-semibold text-white">
                    建議先做的 2 到 4 件事
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">
                    {aiDiagnosis.next_steps.map((step) => (
                      <li key={step}>• {step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-sm leading-7 text-slate-300">
                設定好 API key，並調整顧問 prompt 後，就可以在這裡生成第一份 AI 財務診斷。
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="第五步：建議的下一步"
          desc="這些是顧問希望你納入正式規劃的事件草案。你可以先微調，再決定是否加入。"
        >
          <div className="space-y-4">
            {recommendations.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-white">{item.label}</div>
                      <span className={`rounded-full px-3 py-1 text-xs ${item.priority === "high" ? "bg-rose-400/20 text-rose-100" : item.priority === "medium" ? "bg-amber-400/20 text-amber-100" : "bg-cyan-400/20 text-cyan-100"}`}>{item.priority}</span>
                      {acceptedIds.has(item.id) ? <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100">已加入正式計畫</span> : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.reason}</p>
                    <div className="mt-2 text-xs leading-6 text-slate-400">Assumptions: {item.assumptions.join(" / ")}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <InputField label="Year"><input type="number" value={item.year} onChange={(event) => updateRecommendation(item.id, { year: Number(event.target.value) })} className={inputClass} /></InputField>
                  <InputField label="Amount"><input type="number" step={10000} value={item.amount} onChange={(event) => updateRecommendation(item.id, { amount: Number(event.target.value) })} className={inputClass} /></InputField>
                  <InputField label="Label"><input type="text" value={item.label} onChange={(event) => updateRecommendation(item.id, { label: event.target.value })} className={inputClass} /></InputField>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="如果你想看更深入的推演"
            desc="只有在需求、現況與初步判讀都釐清之後，圖表才有意義。這裡用來模擬未來 15 年的資產軌跡。"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(Number(value) / 10000)}w`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "#08111f", border: "1px solid rgba(148,163,184,0.18)", borderRadius: "1rem" }} />
                  <Line type="monotone" dataKey="endAsset" stroke="#67e8f9" strokeWidth={3} dot={false} name="End asset" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="正式事件計畫"
            desc="推薦事件接受後會放進這裡，你也可以手動新增與修改。"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InputField label="Year"><input type="number" value={draft.year} onChange={(event) => setDraft((prev) => ({ ...prev, year: Number(event.target.value) }))} className={inputClass} /></InputField>
              <InputField label="Label"><input type="text" value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} className={inputClass} /></InputField>
              <InputField label="Amount"><input type="number" step={10000} value={draft.amount} onChange={(event) => setDraft((prev) => ({ ...prev, amount: Number(event.target.value) }))} className={inputClass} /></InputField>
              <InputField label="Type"><select value={draft.type} onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as PlanningEventType }))} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
              <InputField label="Category"><select value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value as PlanningEventCategory }))} className={inputClass}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
              <div className="flex items-end"><button onClick={addDraftEvent} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950">加入事件</button></div>
            </div>
            <div className="mt-6 space-y-4">
              {events.map((event) => (
                <div key={event.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <InputField label="Year"><input type="number" value={event.year} onChange={(e) => updateEvent(event.id, { year: Number(e.target.value) })} className={inputClass} /></InputField>
                    <InputField label="Label"><input type="text" value={event.label} onChange={(e) => updateEvent(event.id, { label: e.target.value })} className={inputClass} /></InputField>
                    <InputField label="Amount"><input type="number" step={10000} value={event.amount} onChange={(e) => updateEvent(event.id, { amount: Number(e.target.value) })} className={inputClass} /></InputField>
                    <InputField label="Type"><select value={event.type} onChange={(e) => updateEvent(event.id, { type: e.target.value as PlanningEventType })} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
                    <InputField label="Category"><select value={event.category} onChange={(e) => updateEvent(event.id, { category: e.target.value as PlanningEventCategory })} className={inputClass}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
                    <div className="flex items-end"><button onClick={() => setEvents((prev) => prev.filter((entry) => entry.id !== event.id))} className="w-full rounded-2xl border border-rose-400/30 px-4 py-3 text-rose-100">刪除事件</button></div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title="情境比較"
          desc="好的規劃，不只要在基準情境成立，也要在保守情境下站得住。"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{scenario.label}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs ${scenario.result.healthGrade === "A" ? "bg-emerald-400/20 text-emerald-100" : scenario.result.healthGrade === "B" ? "bg-amber-400/20 text-amber-100" : "bg-rose-400/20 text-rose-100"}`}>{scenario.result.healthGrade}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{scenario.adjustment}</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between"><span>退休時資產</span><span>{formatCurrency(scenario.result.portfolioAtRetire)}</span></div>
                  <div className="flex items-center justify-between"><span>總需求</span><span>{formatCurrency(scenario.result.totalNeed)}</span></div>
                  <div className="flex items-center justify-between"><span>缺口</span><span>{formatCurrency(scenario.result.gap)}</span></div>
                  <div className="flex items-center justify-between"><span>可支撐到</span><span>{scenario.result.sustainAge} 歲</span></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

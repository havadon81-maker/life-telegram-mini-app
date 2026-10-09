import { useEffect, useMemo, useState } from "react";

type Tab = "today" | "goals" | "habits" | "insights" | "history";
type ModalType = "activity" | "plan" | "habit" | "goal" | "event" | "metric";
type GoalCategory = "Здоровье" | "Учёба" | "Работа" | "Финансы" | "Развитие" | "Отношения" | "Хобби" | "Путешествия" | "Дом" | "Другое";
type Priority = "low" | "normal" | "high";
type Goal = { id: number; title: string; category: GoalCategory; progress: number; target: number; unit: string; deadline?: string };
type Habit = { id: number; title: string; icon: string; active: boolean; completions: Record<string, boolean | number>; mode?: "check" | "counter"; target?: number; unit?: string; daysPerWeek?: number };
type Plan = { id: number; title: string; time: string; done: boolean; date: string; priority?: Priority; category?: string; note?: string };
type Activity = { id: number; title: string; category: string; time: string; value: number; unit: string; note: string; date: string; duration?: number };
type CustomMetric = { id: number; title: string; value: string; unit: string };
type DayData = { sleepStart: string; wakeTime: string; sleepQuality: number; energy: number; mood: number; weight: string; water: number; steps: number; note: string; customMetrics: CustomMetric[] };
type LifeEvent = { id: number; title: string; category: string; createdAt: string; date: string };

const todayKey = () => localDateKey(new Date());
function localDateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function load<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function minutesOf(time: string) { const match = /^(\d{2}):(\d{2})$/.exec(time); return match ? Number(match[1]) * 60 + Number(match[2]) : 0; }
function durationMinutes(start: string, end: string) { let minutes = minutesOf(end) - minutesOf(start); if (minutes <= 0) minutes += 1440; return minutes; }
function durationLabel(minutes: number) { return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`; }
function dateLabel(key: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) { return new Date(`${key}T12:00:00`).toLocaleDateString("ru-RU", options); }
function shiftDate(key: string, amount: number) { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + amount); return localDateKey(date); }
function shiftMonth(key: string, amount: number) { const date = new Date(`${key}T12:00:00`); const targetDay = date.getDate(); date.setDate(1); date.setMonth(date.getMonth() + amount); const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(targetDay, last)); return localDateKey(date); }
function normalizeTime(raw: string): string | null { const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim()); if (!match) return null; const h = Number(match[1]); const m = Number(match[2]); if (h < 0 || h > 23 || m < 0 || m > 59) return null; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
const categories: GoalCategory[] = ["Здоровье", "Учёба", "Работа", "Финансы", "Развитие", "Отношения", "Хобби", "Путешествия", "Дом", "Другое"];
const unitSuggestions = ["раз", "шт.", "сек", "мин", "ч", "м", "см", "км", "шагов", "кг", "г", "мл", "л", "ккал", "кДж", "%", "уд/мин", "повторений", "подходов", "страниц", "₽", "€", "дней", "нед."];
const defaultGoals: Goal[] = [
  { id: 1, title: "Пробежать 10 км", category: "Здоровье", progress: 5.2, target: 10, unit: "км" },
  { id: 2, title: "Изучать новое каждый день", category: "Развитие", progress: 18, target: 30, unit: "дней" },
  { id: 3, title: "Закончить важный проект", category: "Работа", progress: 62, target: 100, unit: "%" },
];
const defaultHabits: Habit[] = [
  { id: 1, title: "Выпить достаточно воды", icon: "💧", active: true, completions: {}, mode: "check", daysPerWeek: 7 },
  { id: 2, title: "Тренировка", icon: "🏋️", active: true, completions: {}, mode: "check", daysPerWeek: 3 },
  { id: 3, title: "30 минут учёбы", icon: "📚", active: true, completions: {}, mode: "check", daysPerWeek: 5 },
  { id: 4, title: "Лечь вовремя", icon: "🌙", active: true, completions: {}, mode: "check", daysPerWeek: 7 },
];
const blankDay = (): DayData => ({ sleepStart: "23:00", wakeTime: "07:00", sleepQuality: 3, energy: 7, mood: 7, weight: "", water: 0, steps: 0, note: "", customMetrics: [] });
const defaultActivityForm = () => ({ title: "", category: "Тренировка", time: "17:00", value: "1", unit: "раз", note: "", duration: "" });
const defaultPlanForm = () => ({ title: "", time: "09:00", priority: "normal" as Priority, category: "Личное", note: "" });
const defaultHabitForm = () => ({ title: "", icon: "✦", mode: "check" as "check" | "counter", target: "1", unit: "раз", daysPerWeek: "7" });
const defaultGoalForm = () => ({ title: "", category: "Здоровье" as GoalCategory, target: "10", progress: "0", unit: "км", deadline: "" });
const defaultEventForm = () => ({ title: "", category: "Личное" });
const defaultMetricForm = () => ({ title: "", value: "", unit: "" });

function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [goals, setGoals] = useState<Goal[]>(() => load("life-goals", defaultGoals));
  const [habits, setHabits] = useState<Habit[]>(() => load<Array<Partial<Habit> & { done?: boolean }>>("life-habits-v3", load("life-habits", defaultHabits)).map((h) => ({ ...h, id: h.id ?? Date.now() + Math.random(), icon: h.icon ?? "✦", active: h.active ?? true, mode: h.mode ?? "check", target: h.target ?? 1, unit: h.unit ?? "раз", daysPerWeek: h.daysPerWeek ?? 7, completions: h.completions ?? (h.done ? { [todayKey()]: true } : {}) }) as Habit));
  const [plans, setPlans] = useState<Plan[]>(() => load("life-plans-v3", []));
  const [activities, setActivities] = useState<Activity[]>(() => load("life-activities-v3", []));
  const [days, setDays] = useState<Record<string, Partial<DayData>>>(() => load("life-days-v3", {}));
  const [events, setEvents] = useState<LifeEvent[]>(() => load<Array<Partial<LifeEvent>>>("life-events-v3", load("life-events", [])).map((event) => ({ ...event, id: event.id ?? Date.now() + Math.random(), date: event.date || (event.createdAt ? event.createdAt.slice(0, 10) : todayKey()), createdAt: event.createdAt ?? new Date().toISOString(), title: event.title ?? "Запись", category: event.category ?? "Личное" }) as LifeEvent));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [monthAnchor, setMonthAnchor] = useState(todayKey());
  const [modal, setModal] = useState<ModalType | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [profile, setProfile] = useState(false);
  const [activityForm, setActivityForm] = useState(defaultActivityForm);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  const [habitForm, setHabitForm] = useState(defaultHabitForm);
  const [goalForm, setGoalForm] = useState(defaultGoalForm);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [metricForm, setMetricForm] = useState(defaultMetricForm);
  const [activityQuery, setActivityQuery] = useState("");

  useEffect(() => { localStorage.setItem("life-goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("life-habits-v3", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("life-plans-v3", JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem("life-activities-v3", JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem("life-days-v3", JSON.stringify(days)); }, [days]);
  useEffect(() => { localStorage.setItem("life-events-v3", JSON.stringify(events)); }, [events]);
  useEffect(() => { setMonthAnchor(selectedDate); }, [selectedDate]);

  const day: DayData = { ...blankDay(), ...(days[selectedDate] ?? {}), customMetrics: (days[selectedDate]?.customMetrics ?? []) as CustomMetric[] };
  const activeHabits = habits.filter((h) => h.active !== false);
  const dayPlans = plans.filter((p) => p.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const dayActivities = activities.filter((a) => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const dayEvents = events.filter((e) => e.date === selectedDate);
  const doneHabits = activeHabits.filter((h) => isHabitDone(h, selectedDate)).length;
  const sleepMinutes = durationMinutes(day.sleepStart, day.wakeTime);
  const sleepText = durationLabel(sleepMinutes);
  const weekDays = useMemo(() => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => { const copy = new Date(selected); copy.setDate(selected.getDate() + index); return localDateKey(copy); });
  }, [selectedDate]);
  const completedPlans = dayPlans.filter((plan) => plan.done).length;
  const goalScore = Math.round(goals.reduce((sum, goal) => sum + Math.min(Math.max(goal.progress / Math.max(goal.target, 1), 0), 1), 0) / Math.max(goals.length, 1) * 100);
  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe.user;
  const displayName = telegramUser?.first_name || "Твоя жизнь";
  const selectedMonthDate = new Date(`${monthAnchor}T12:00:00`);
  const monthLabel = selectedMonthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const calendarCells = useMemo(() => {
    const d = new Date(`${monthAnchor}T12:00:00`);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`)];
  }, [monthAnchor]);

  function updateDay<K extends keyof DayData>(key: K, value: DayData[K]) {
    setDays((previous) => {
      const existing = previous[selectedDate] ?? {};
      if (key === "sleepStart" || key === "wakeTime") {
        return { ...previous, [selectedDate]: { ...existing, sleepStart: key === "sleepStart" ? value as string : existing.sleepStart ?? blankDay().sleepStart, wakeTime: key === "wakeTime" ? value as string : existing.wakeTime ?? blankDay().wakeTime } };
      }
      return { ...previous, [selectedDate]: { ...existing, [key]: value } };
    });
  }
  function isDayMarked(date: string) { return Boolean(days[date] || activities.some((a) => a.date === date) || plans.some((p) => p.date === date) || events.some((e) => e.date === date) || habits.some((h) => h.completions?.[date] !== undefined)); }
  function openCreate(type: ModalType) {
    setEditId(null);
    if (type === "activity") setActivityForm(defaultActivityForm());
    if (type === "plan") setPlanForm(defaultPlanForm());
    if (type === "habit") setHabitForm(defaultHabitForm());
    if (type === "goal") setGoalForm(defaultGoalForm());
    if (type === "event") setEventForm(defaultEventForm());
    if (type === "metric") setMetricForm(defaultMetricForm());
    setModal(type);
  }
  function editActivity(item: Activity) { setActivityForm({ title: item.title, category: item.category, time: item.time || "17:00", value: String(item.value), unit: item.unit, note: item.note || "", duration: item.duration ? String(item.duration) : "" }); setEditId(item.id); setModal("activity"); }
  function editPlan(item: Plan) { setPlanForm({ title: item.title, time: item.time || "09:00", priority: item.priority ?? "normal", category: item.category ?? "Личное", note: item.note ?? "" }); setEditId(item.id); setModal("plan"); }
  function editHabit(item: Habit) { setHabitForm({ title: item.title, icon: item.icon, mode: item.mode ?? "check", target: String(item.target ?? 1), unit: item.unit ?? "раз", daysPerWeek: String(item.daysPerWeek ?? 7) }); setEditId(item.id); setModal("habit"); }
  function editGoal(item: Goal) { setGoalForm({ title: item.title, category: item.category, target: String(item.target), progress: String(item.progress), unit: item.unit, deadline: item.deadline ?? "" }); setEditId(item.id); setModal("goal"); }
  function editMetric(item: CustomMetric) { setMetricForm({ title: item.title, value: item.value, unit: item.unit }); setEditId(item.id); setModal("metric"); }

  function saveActivity() {
    if (!activityForm.title.trim() || !normalizeTime(activityForm.time)) return;
    const item: Activity = { id: editId ?? Date.now(), title: activityForm.title.trim(), category: activityForm.category, time: normalizeTime(activityForm.time)!, value: Number(activityForm.value) || 0, unit: activityForm.unit.trim() || "раз", note: activityForm.note.trim(), duration: activityForm.duration ? Math.max(0, Number(activityForm.duration) || 0) : undefined, date: selectedDate };
    setActivities((old) => editId === null ? [item, ...old] : old.map((a) => a.id === editId ? { ...item, date: a.date } : a)); setModal(null);
  }
  function savePlan() {
    if (!planForm.title.trim() || !normalizeTime(planForm.time)) return;
    const item: Plan = { id: editId ?? Date.now(), title: planForm.title.trim(), time: normalizeTime(planForm.time)!, priority: planForm.priority, category: planForm.category, note: planForm.note.trim(), done: editId === null ? false : (plans.find((p) => p.id === editId)?.done ?? false), date: selectedDate };
    setPlans((old) => editId === null ? [item, ...old] : old.map((p) => p.id === editId ? { ...item, date: p.date } : p)); setModal(null);
  }
  function saveHabit() {
    if (!habitForm.title.trim()) return;
    const old = habits.find((h) => h.id === editId);
    const item: Habit = { id: editId ?? Date.now(), title: habitForm.title.trim(), icon: habitForm.icon || "✦", active: true, mode: habitForm.mode, target: Math.max(1, Number(habitForm.target) || 1), unit: habitForm.unit.trim() || "раз", daysPerWeek: Math.min(7, Math.max(1, Number(habitForm.daysPerWeek) || 7)), completions: old?.completions ?? {} };
    setHabits((items) => editId === null ? [...items, item] : items.map((h) => h.id === editId ? item : h)); setModal(null);
  }
  function saveGoal() {
    if (!goalForm.title.trim() || Number(goalForm.target) <= 0) return;
    const item: Goal = { id: editId ?? Date.now(), title: goalForm.title.trim(), category: goalForm.category, target: Number(goalForm.target), progress: Math.max(0, Number(goalForm.progress) || 0), unit: goalForm.unit.trim() || "раз", deadline: goalForm.deadline || undefined };
    setGoals((items) => editId === null ? [...items, item] : items.map((g) => g.id === editId ? item : g)); setModal(null);
  }
  function saveEvent() {
    if (!eventForm.title.trim()) return;
    setEvents((old) => [{ id: Date.now(), title: eventForm.title.trim(), category: eventForm.category, createdAt: new Date().toISOString(), date: selectedDate }, ...old]); setModal(null);
  }
  function saveMetric() {
    if (!metricForm.title.trim() || metricForm.value.trim() === "") return;
    const current = (days[selectedDate]?.customMetrics ?? []) as CustomMetric[];
    const item: CustomMetric = { id: editId ?? Date.now(), title: metricForm.title.trim(), value: metricForm.value.trim(), unit: metricForm.unit.trim() };
    updateDay("customMetrics", editId === null ? [...current, item] : current.map((m) => m.id === editId ? item : m)); setModal(null);
  }
  function toggleHabit(id: number) {
    setHabits((old) => old.map((h) => {
      if (h.id !== id) return h;
      if (h.mode === "counter") {
        const current = h.completions[selectedDate];
        const amount = typeof current === "number" ? current : current === true ? 1 : 0;
        return { ...h, completions: { ...h.completions, [selectedDate]: amount >= (h.target ?? 1) ? 0 : (h.target ?? 1) } };
      }
      return { ...h, completions: { ...h.completions, [selectedDate]: !Boolean(h.completions[selectedDate]) } };
    }));
  }
  function adjustHabitCounter(id: number, change: number) {
    setHabits((old) => old.map((h) => {
      if (h.id !== id) return h;
      const current = h.completions[selectedDate];
      const value = typeof current === "number" ? current : current === true ? 1 : 0;
      return { ...h, completions: { ...h.completions, [selectedDate]: Math.max(0, value + change) } };
    }));
  }
  function togglePlan(id: number) { setPlans((old) => old.map((p) => p.id === id ? { ...p, done: !p.done } : p)); }
  function adjustGoalProgress(id: number, direction: number) {
    setGoals((old) => old.map((g) => g.id === id ? { ...g, progress: Math.max(0, Number((g.progress + direction * (g.target <= 20 ? 0.5 : g.target * 0.05)).toFixed(2))) } : g));
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ app: "LIFE", version: 5, exportedAt: new Date().toISOString(), goals, habits, plans, activities, days, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `life-backup-${todayKey()}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importBackup(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.goals) || !Array.isArray(data.habits)) throw new Error("invalid backup");
        setGoals(data.goals); setHabits(data.habits.map((h: Partial<Habit>) => ({ ...h, active: h.active ?? true, mode: h.mode ?? "check", target: h.target ?? 1, unit: h.unit ?? "раз", daysPerWeek: h.daysPerWeek ?? 7, completions: h.completions ?? {} })));
        setPlans(Array.isArray(data.plans) ? data.plans : []); setActivities(Array.isArray(data.activities) ? data.activities : []); setDays(data.days && typeof data.days === "object" ? data.days : {}); setEvents(Array.isArray(data.events) ? data.events : []);
        window.alert("Резервная копия восстановлена.");
      } catch { window.alert("Не удалось прочитать резервную копию LIFE. Проверь, что выбран JSON-файл из приложения."); }
    };
    reader.readAsText(file);
  }
  function moveWeek(amount: number) { setSelectedDate((date) => shiftDate(date, amount * 7)); }
  function moveMonth(amount: number) { const next = shiftMonth(monthAnchor, amount); setMonthAnchor(next); setSelectedDate((current) => { const d = new Date(`${next}T12:00:00`); const currentDay = Number(current.slice(-2)); const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(currentDay, maxDay)); return localDateKey(d); }); }

  const statDays = useMemo(() => weekDays.map((date) => ({ date, day: { ...blankDay(), ...(days[date] ?? {}) } as DayData })), [weekDays, days]);
  const recordedDays = statDays.filter(({ date }) => Boolean(days[date]));
  const recordedSleepDays = statDays.filter(({ date }) => Boolean(days[date]?.sleepStart && days[date]?.wakeTime));
  const recordedEnergyDays = statDays.filter(({ date }) => typeof days[date]?.energy === "number");
  const recordedMoodDays = statDays.filter(({ date }) => typeof days[date]?.mood === "number");
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const avgSleep = average(recordedSleepDays.map(({ day: item }) => durationMinutes(item.sleepStart, item.wakeTime)));
  const avgEnergy = average(recordedEnergyDays.map(({ day: item }) => item.energy));
  const avgMood = average(recordedMoodDays.map(({ day: item }) => item.mood));
  const plansThisWeek = plans.filter((p) => weekDays.includes(p.date));
  const habitChecksThisWeek = activeHabits.reduce((sum, habit) => sum + weekDays.filter((date) => isHabitDone(habit, date)).length, 0);
  const habitPossibleChecks = activeHabits.reduce((sum, habit) => sum + Math.min(7, habit.daysPerWeek ?? 7), 0);
  const maxSteps = Math.max(1, ...statDays.map(({ day: item }) => Number(item.steps) || 0));
  const maxSleep = Math.max(1, ...statDays.map(({ day: item }) => durationMinutes(item.sleepStart, item.wakeTime)));
  const displayPercent = (amount: number, total: number) => total ? Math.min(100, Math.round(amount / total * 100)) : 0;

  return <div className="app">
    <header className="topbar"><div><div className="eyebrow">LIFE / DIGITAL MIRROR · v0.5</div><h1>{tab === "today" ? `Привет, ${displayName}` : ({ goals: "Мои цели", habits: "Привычки", insights: "Аналитика", history: "История", today: "Сегодня" } as Record<Tab, string>)[tab]}</h1></div><button className="avatar-button" onClick={() => setProfile(true)} aria-label="Профиль"><span className="pixel-avatar">🙂</span></button></header>
    <main className="content">
      {tab === "today" && <>
        <section className="hero-card"><div><span className="muted">{dateLabel(selectedDate)}</span><h2>Твой день</h2><p>Планируй реалистично. Отмечай то, что сделал.</p></div><div className="life-score"><strong>{goalScore}</strong><span>цели %</span></div></section>
        <div className="week-control"><button className="secondary" onClick={() => moveWeek(-1)} aria-label="Предыдущая неделя">‹</button><span>{dateLabel(weekDays[0], { day: "numeric", month: "short" })} — {dateLabel(weekDays[6], { day: "numeric", month: "short" })}</span><button className="secondary" onClick={() => moveWeek(1)} aria-label="Следующая неделя">›</button></div>
        <div className="week-strip">{weekDays.map((date) => <button key={date} className={`week-day ${date === selectedDate ? "selected" : ""}`} onClick={() => setSelectedDate(date)}><small>{dateLabel(date, { weekday: "short" })}</small><strong>{Number(date.slice(-2))}</strong><i>{isDayMarked(date) ? "•" : ""}</i></button>)}</div>
        <section className="panel"><SectionTitle title="Сон и состояние" action="Сегодня / выбранная дата"/><div className="form-grid"><TimeInput label="Лёг спать" value={day.sleepStart} onChange={(value) => updateDay("sleepStart", value)} /><TimeInput label="Проснулся" value={day.wakeTime} onChange={(value) => updateDay("wakeTime", value)} /></div><div className="sleep-summary"><span>Продолжительность сна</span><strong>🌙 {sleepText}</strong></div><div className="sleep-shortcuts"><span>Быстрая настройка:</span>{["22:00", "23:00", "00:00"].map((time) => <button key={time} onClick={() => updateDay("sleepStart", time)}>{time}</button>)}<span className="shortcut-separator">Подъём</span>{["06:00", "07:00", "08:00"].map((time) => <button key={time} onClick={() => updateDay("wakeTime", time)}>{time}</button>)}</div>
          <div className="form-grid"><label>Качество сна · {day.sleepQuality}/5<input type="range" min="1" max="5" value={day.sleepQuality} onChange={(e) => updateDay("sleepQuality", Number(e.target.value))} /></label><label>Энергия · {day.energy}/10<input type="range" min="1" max="10" value={day.energy} onChange={(e) => updateDay("energy", Number(e.target.value))} /></label><label>Настроение · {day.mood}/10<input type="range" min="1" max="10" value={day.mood} onChange={(e) => updateDay("mood", Number(e.target.value))} /></label><label>Вес, кг<input type="number" min="0" step="0.1" placeholder="Напр. 95.2" value={day.weight} onChange={(e) => updateDay("weight", e.target.value)} /></label><label>Вода, мл<input type="number" min="0" step="100" value={day.water} onChange={(e) => updateDay("water", Math.max(0, Number(e.target.value) || 0))} /></label><label>Шаги, шт.<input type="number" min="0" step="100" value={day.steps} onChange={(e) => updateDay("steps", Math.max(0, Number(e.target.value) || 0))} /></label></div><label className="wide-label">Заметка о дне<textarea value={day.note} onChange={(e) => updateDay("note", e.target.value)} placeholder="Как себя чувствовал, что важно запомнить…" rows={2} /></label>
        </section>
        <div className="quick-actions"><button className="primary" onClick={() => openCreate("activity")}>＋ Активность</button><button className="secondary" onClick={() => openCreate("plan")}>＋ План</button><button className="secondary" onClick={() => openCreate("metric")}>＋ Метрика</button></div>
        <div className="metric-grid"><Metric icon="🌙" label="Сон" value={sleepText} note={`${day.sleepStart} → ${day.wakeTime}`} /><Metric icon="⚡" label="Энергия" value={`${day.energy}/10`} note="самооценка" /><Metric icon="🚶" label="Шаги" value={Number(day.steps).toLocaleString("ru-RU")} note="за день" /><Metric icon="💧" label="Вода" value={`${day.water} мл`} note="выпито" /></div>
        {!!day.customMetrics.length && <><SectionTitle title="Дополнительные метрики" /><div className="custom-metric-list">{day.customMetrics.map((metric) => <article className="custom-metric-row" key={metric.id}><div><strong>{metric.title}</strong><small>{metric.value} {metric.unit}</small></div><button className="edit-button" onClick={() => editMetric(metric)} aria-label="Редактировать метрику">✎</button><button className="delete" onClick={() => updateDay("customMetrics", day.customMetrics.filter((x) => x.id !== metric.id))} aria-label="Удалить метрику">×</button></article>)}</div></>}
        <SectionTitle title={`План на день · ${completedPlans}/${dayPlans.length}`} action="＋ Добавить" onClick={() => openCreate("plan")} />
        {dayPlans.length ? <div className="item-list">{dayPlans.map((plan) => <div className={`editable-row ${plan.done ? "is-done" : ""}`} key={plan.id}><button className="check" onClick={() => togglePlan(plan.id)} aria-label="Отметить выполнение">{plan.done ? "✓" : ""}</button><span className="item-time">{plan.time}</span><div className="item-main"><strong>{plan.title}</strong><small>{plan.category || "Личное"}{plan.note ? ` · ${plan.note}` : ""}</small></div>{plan.priority === "high" && <span className="priority-tag high">Важно</span>}<button className="edit-button" onClick={() => editPlan(plan)} aria-label="Редактировать план">✎</button><button className="delete" onClick={() => setPlans((old) => old.filter((x) => x.id !== plan.id))} aria-label="Удалить план">×</button></div>)}</div> : <Empty text="Планов нет. Добавь 1–3 важных дела и отметь их выполнение." />}
        <SectionTitle title="Активности" action="＋ Добавить" onClick={() => openCreate("activity")} />
        <div className="filter-row"><input value={activityQuery} onChange={(e) => setActivityQuery(e.target.value)} placeholder="Найти активность за день…" aria-label="Поиск активности" /></div>
        {dayActivities.filter((a) => `${a.title} ${a.category} ${a.note}`.toLowerCase().includes(activityQuery.toLowerCase())).length ? <div className="activity-list">{dayActivities.filter((a) => `${a.title} ${a.category} ${a.note}`.toLowerCase().includes(activityQuery.toLowerCase())).map((activity) => <article className="activity-card" key={activity.id}><div className="activity-symbol">{activity.category === "Тренировка" ? "🏋️" : activity.category === "Прогулка" ? "🚶" : activity.category === "Учёба" ? "📚" : "✦"}</div><div className="activity-info"><strong>{activity.title}</strong><p>{activity.category} · {activity.time}{activity.duration ? ` · ${activity.duration} мин` : ""}{activity.note ? ` · ${activity.note}` : ""}</p></div><div className="activity-amount">{activity.value} <small>{activity.unit}</small></div><button className="edit-button" onClick={() => editActivity(activity)} aria-label="Редактировать активность">✎</button><button className="delete" onClick={() => setActivities((old) => old.filter((x) => x.id !== activity.id))} aria-label="Удалить активность">×</button></article>)}</div> : <Empty text={activityQuery ? "По запросу ничего не найдено." : "Записывай тренировки, прогулки, учёбу и другие занятия."} />}
        <SectionTitle title={`Полезные привычки · ${doneHabits}/${activeHabits.length}`} action="＋ Привычка" onClick={() => openCreate("habit")} />
        <HabitList habits={activeHabits} selectedDate={selectedDate} onToggle={toggleHabit} onAdjust={adjustHabitCounter} onEdit={editHabit} onDelete={(id) => setHabits((old) => old.filter((h) => h.id !== id))} />
        <SectionTitle title="Записи и события" action="＋ Запись" onClick={() => openCreate("event")} />
        {dayEvents.length ? dayEvents.map((event) => <article className="activity-card" key={event.id}><div className="activity-symbol">✎</div><div className="activity-info"><strong>{event.title}</strong><p>{event.category} · {new Date(event.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p></div><button className="delete" onClick={() => setEvents((old) => old.filter((x) => x.id !== event.id))}>×</button></article>) : <Empty text="Сохраняй важные события и мысли — они появятся здесь." />}
      </>}

      {tab === "goals" && <><div className="section-head"><div><span className="muted">Прогресс, который можно измерить</span><h2>Мои цели</h2></div><button className="primary small" onClick={() => openCreate("goal")}>＋ Цель</button></div><div className="goal-overview"><strong>{goals.length}</strong><span>целей активно</span><strong>{goalScore}%</strong><span>средний прогресс</span></div>{goals.length ? <div className="goal-list">{goals.map((goal) => { const percent = Math.max(0, Math.min(Math.round(goal.progress / Math.max(goal.target, 1) * 100), 100)); return <article className="goal-card" key={goal.id}><div className="goal-top"><div><span className="tag">{goal.category}</span><h3>{goal.title}</h3></div><strong>{percent}%</strong></div><div className="progress"><span style={{ width: `${percent}%` }} /></div><div className="goal-bottom"><span>{goal.progress} / {goal.target} {goal.unit}{goal.deadline ? ` · до ${dateLabel(goal.deadline, { day: "numeric", month: "short" })}` : ""}</span><div className="goal-controls"><button onClick={() => adjustGoalProgress(goal.id, -1)} aria-label="Уменьшить прогресс">−</button><button onClick={() => adjustGoalProgress(goal.id, 1)} aria-label="Увеличить прогресс">＋</button><button className="edit-button" onClick={() => editGoal(goal)} aria-label="Изменить цель">✎</button><button className="delete" onClick={() => setGoals((old) => old.filter((g) => g.id !== goal.id))} aria-label="Удалить цель">×</button></div></div></article>; })}</div> : <Empty text="Создай первую цель, задай измеримую величину и отмечай прогресс." />}</>}

      {tab === "habits" && <><div className="section-head"><div><span className="muted">Регулярность без стресса</span><h2>Полезные привычки</h2></div><button className="primary small" onClick={() => openCreate("habit")}>＋ Привычка</button></div><p className="page-hint">Отметки сохраняются отдельно по дням. Для количественных привычек можно выставить цель, например 8 стаканов воды или 30 страниц.</p><div className="history-nav"><button className="secondary" onClick={() => setSelectedDate((date) => shiftDate(date, -1))}>← День</button><strong>{dateLabel(selectedDate)}</strong><button className="secondary" onClick={() => setSelectedDate((date) => shiftDate(date, 1))}>День →</button></div><div className="habit-list large"><HabitList habits={activeHabits} selectedDate={selectedDate} onToggle={toggleHabit} onAdjust={adjustHabitCounter} onEdit={editHabit} onDelete={(id) => setHabits((old) => old.filter((h) => h.id !== id))} /></div><div className="habit-week-summary"><SectionTitle title="Эта неделя" /><div className="metric-grid"><Metric icon="✓" label="Отметки" value={`${habitChecksThisWeek}`} note="выполненных дней" /><Metric icon="🎯" label="Выполнение" value={`${displayPercent(habitChecksThisWeek, habitPossibleChecks)}%`} note="от недельного плана" /><Metric icon="📆" label="Привычек" value={`${activeHabits.length}`} note="активных" /><Metric icon="🔥" label="Лучший ритм" value={`${Math.max(0, ...activeHabits.map((h) => habitStreak(h, selectedDate)))} дн.`} note="серия подряд" /></div></div></>}

      {tab === "insights" && <><section className="hero-card compact"><div><span className="muted">Сводка выбранной недели</span><h2>Что меняется со временем</h2><p>Заполняй данные регулярно — здесь появятся личные тенденции.</p></div><div className="calendar-icon">↗</div></section><div className="history-nav"><button className="secondary" onClick={() => moveWeek(-1)}>← Неделя</button><strong>{dateLabel(weekDays[0], { day: "numeric", month: "short" })} — {dateLabel(weekDays[6], { day: "numeric", month: "short" })}</strong><button className="secondary" onClick={() => moveWeek(1)}>Неделя →</button></div><div className="metric-grid"><Metric icon="🌙" label="Сон в среднем" value={recordedSleepDays.length ? durationLabel(Math.round(avgSleep)) : "—"} note={`${recordedSleepDays.length} дней со сном`} /><Metric icon="⚡" label="Энергия" value={recordedEnergyDays.length ? `${avgEnergy.toFixed(1)}/10` : "—"} note="среднее за неделю" /><Metric icon="🙂" label="Настроение" value={recordedMoodDays.length ? `${avgMood.toFixed(1)}/10` : "—"} note="среднее за неделю" /><Metric icon="✓" label="Планы" value={`${displayPercent(plansThisWeek.filter((p) => p.done).length, plansThisWeek.length)}%`} note={`${plansThisWeek.filter((p) => p.done).length} из ${plansThisWeek.length} выполнено`} /></div><section className="panel"><SectionTitle title="Шаги по дням" /><BarChart rows={statDays.map(({ date, day: item }) => ({ label: dateLabel(date, { weekday: "short" }), value: Number(item.steps) || 0, display: (Number(item.steps) || 0).toLocaleString("ru-RU") }))} max={maxSteps} unit="шагов" /></section><section className="panel"><SectionTitle title="Сон по дням" /><BarChart rows={statDays.map(({ date, day: item }) => { const tracked = Boolean(days[date]?.sleepStart && days[date]?.wakeTime); const minutes = durationMinutes(item.sleepStart, item.wakeTime); return { label: dateLabel(date, { weekday: "short" }), value: tracked ? minutes : 0, display: tracked ? `${Math.floor(minutes / 60)}ч ${minutes % 60}м` : "—" }; })} max={maxSleep} unit="длительность" /></section><section className="panel"><SectionTitle title="Привычки и последовательность" /><div className="insight-list">{activeHabits.map((habit) => { const count = weekDays.filter((date) => isHabitDone(habit, date)).length; const targetDays = Math.min(7, habit.daysPerWeek ?? 7); return <div className="insight-row" key={habit.id}><span>{habit.icon}</span><div className="insight-main"><strong>{habit.title}</strong><div className="progress"><span style={{ width: `${Math.min(100, count / targetDays * 100)}%` }} /></div><small>{count}/{targetDays} дней на этой неделе · серия {habitStreak(habit, selectedDate)} дн.</small></div><button className="edit-button" onClick={() => editHabit(habit)} aria-label="Редактировать привычку">✎</button></div>; })}</div></section><p className="page-hint">Это описательная статистика по твоим записям, не медицинская оценка и не доказательство причинно-следственных связей.</p></>}

      {tab === "history" && <><section className="hero-card compact"><div><span className="muted">Твоя история</span><h2>Жизнь во времени</h2><p>Выбери день — увидишь метрики, планы, привычки и активности.</p></div><div className="calendar-icon">▦</div></section><div className="history-nav"><button className="secondary" onClick={() => moveMonth(-1)}>← Месяц</button><strong>{monthLabel}</strong><button className="secondary" onClick={() => moveMonth(1)}>Месяц →</button></div><div className="calendar"><span className="weekday">Пн</span><span className="weekday">Вт</span><span className="weekday">Ср</span><span className="weekday">Чт</span><span className="weekday">Пт</span><span className="weekday">Сб</span><span className="weekday">Вс</span>{calendarCells.map((date, index) => date ? <button key={date} className={`day ${selectedDate === date ? "selected" : ""} ${isDayMarked(date) ? "has-event" : ""}`} onClick={() => setSelectedDate(date)}>{Number(date.slice(-2))}</button> : <span key={`blank-${index}`} />)}</div><button className="outline full" onClick={() => setSelectedDate(todayKey())}>Перейти к сегодняшнему дню</button><div className="section-title"><h3>Данные за {dateLabel(selectedDate)}</h3><button onClick={() => openCreate("event")}>＋ Запись</button></div><div className="metric-grid"><Metric icon="🌙" label="Сон" value={sleepText} note={`${day.sleepStart} → ${day.wakeTime}`} /><Metric icon="⚡" label="Энергия" value={`${day.energy}/10`} note="самооценка" /><Metric icon="🙂" label="Настроение" value={`${day.mood}/10`} note="самооценка" /><Metric icon="🚶" label="Шаги" value={Number(day.steps).toLocaleString("ru-RU")} note="шагов" /><Metric icon="💧" label="Вода" value={`${day.water} мл`} note="за день" /><Metric icon="⚖️" label="Вес" value={day.weight ? `${day.weight} кг` : "—"} note="запись за день" /><Metric icon="🌟" label="Качество сна" value={`${day.sleepQuality}/5`} note="самооценка" /></div>{day.note && <div className="note-card"><strong>Заметка</strong><p>{day.note}</p></div>}{day.customMetrics.map((metric) => <article className="custom-metric-row" key={metric.id}><div><strong>{metric.title}</strong><small>{metric.value} {metric.unit}</small></div><button className="edit-button" onClick={() => editMetric(metric)}>✎</button><button className="delete" onClick={() => updateDay("customMetrics", day.customMetrics.filter((x) => x.id !== metric.id))}>×</button></article>)}<SectionTitle title={`Планы · ${completedPlans}/${dayPlans.length}`} action="＋ Добавить" onClick={() => openCreate("plan")} />{dayPlans.length ? dayPlans.map((plan) => <div className={`editable-row ${plan.done ? "is-done" : ""}`} key={plan.id}><button className="check" onClick={() => togglePlan(plan.id)}>{plan.done ? "✓" : ""}</button><span className="item-time">{plan.time}</span><div className="item-main"><strong>{plan.title}</strong><small>{plan.category ?? "Личное"}</small></div><button className="edit-button" onClick={() => editPlan(plan)}>✎</button><button className="delete" onClick={() => setPlans((old) => old.filter((p) => p.id !== plan.id))}>×</button></div>) : <Empty text="Нет планов на эту дату." />}<SectionTitle title="Активности" action="＋ Добавить" onClick={() => openCreate("activity")} />{dayActivities.length ? dayActivities.map((activity) => <article className="activity-card" key={activity.id}><div className="activity-info"><strong>{activity.title}</strong><p>{activity.category} · {activity.time}{activity.note ? ` · ${activity.note}` : ""}</p></div><div className="activity-amount">{activity.value} <small>{activity.unit}</small></div><button className="edit-button" onClick={() => editActivity(activity)}>✎</button><button className="delete" onClick={() => setActivities((old) => old.filter((a) => a.id !== activity.id))}>×</button></article>) : <Empty text="Нет активностей на эту дату." />}<SectionTitle title={`Привычки · ${activeHabits.filter((h) => isHabitDone(h, selectedDate)).length}/${activeHabits.length}`} action="＋ Добавить" onClick={() => openCreate("habit")} /><HabitList habits={activeHabits} selectedDate={selectedDate} onToggle={toggleHabit} onAdjust={adjustHabitCounter} onEdit={editHabit} onDelete={(id) => setHabits((old) => old.filter((h) => h.id !== id))} /><SectionTitle title="Записи и события" action="＋ Добавить" onClick={() => openCreate("event")} />{dayEvents.length ? dayEvents.map((event) => <article className="activity-card" key={event.id}><div className="activity-info"><strong>{event.title}</strong><p>{event.category}</p></div><button className="delete" onClick={() => setEvents((old) => old.filter((e) => e.id !== event.id))}>×</button></article>) : <Empty text="Нет записей на эту дату." />}</>}
    </main>

    

    <datalist id="metric-unit-options">{unitSuggestions.map((unit) => <option key={unit} value={unit} />)}</datalist>
    <nav className="bottom-nav"><NavItem icon="⌂" label="Сегодня" active={tab === "today"} onClick={() => setTab("today")} /><NavItem icon="◎" label="Цели" active={tab === "goals"} onClick={() => setTab("goals")} /><NavItem icon="✓" label="Привычки" active={tab === "habits"} onClick={() => setTab("habits")} /><NavItem icon="↗" label="Аналитика" active={tab === "insights"} onClick={() => setTab("insights")} /><NavItem icon="▦" label="История" active={tab === "history"} onClick={() => setTab("history")} /></nav>

    {modal && <Modal title={modalTitle(modal, editId !== null)} onClose={() => setModal(null)}>
      {modal === "activity" && <><label>Название<input className="modal-input" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="Напр. Бег, чтение, тренировка" autoFocus /></label><label>Категория<select className="modal-input" value={activityForm.category} onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}>{["Тренировка", "Прогулка", "Бег", "Учёба", "Работа", "Здоровье", "Отдых", "Питание", "Сон", "Другое"].map((x) => <option key={x}>{x}</option>)}</select></label><TimeInput label="Время активности" value={activityForm.time} onChange={(value) => setActivityForm({ ...activityForm, time: value })} /><div className="form-grid"><label>Количество<input className="modal-input" type="number" step="any" value={activityForm.value} onChange={(e) => setActivityForm({ ...activityForm, value: e.target.value })} /></label><label>Единица измерения<input className="modal-input" list="metric-unit-options" value={activityForm.unit} onChange={(e) => setActivityForm({ ...activityForm, unit: e.target.value })} placeholder="Напр. км, раз, %" /></label></div><label>Продолжительность, мин<input className="modal-input" type="number" min="0" step="5" value={activityForm.duration} onChange={(e) => setActivityForm({ ...activityForm, duration: e.target.value })} placeholder="Необязательно" /></label><label>Комментарий<input className="modal-input" value={activityForm.note} onChange={(e) => setActivityForm({ ...activityForm, note: e.target.value })} placeholder="Необязательно" /></label><button className="primary full" onClick={saveActivity}>{editId !== null ? "Сохранить изменения" : "Сохранить активность"}</button></>}
      {modal === "plan" && <><label>Что нужно сделать?<input className="modal-input" value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} placeholder="Напр. Сделать домашнее задание" autoFocus /></label><TimeInput label="Время начала" value={planForm.time} onChange={(value) => setPlanForm({ ...planForm, time: value })} /><div className="form-grid"><label>Категория<select className="modal-input" value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}>{["Личное", "Здоровье", "Учёба", "Работа", "Финансы", "Дом", "Отдых", "Другое"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Приоритет<select className="modal-input" value={planForm.priority} onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value as Priority })}><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option></select></label></div><label>Заметка<input className="modal-input" value={planForm.note} onChange={(e) => setPlanForm({ ...planForm, note: e.target.value })} placeholder="Подробности, место или контекст" /></label><button className="primary full" onClick={savePlan}>{editId !== null ? "Сохранить изменения" : "Добавить в план"}</button></>}
      {modal === "habit" && <><label>Название привычки<input className="modal-input" value={habitForm.title} onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })} placeholder="Напр. Выпивать 2 л воды" autoFocus /></label><div className="form-grid"><label>Иконка<select className="modal-input" value={habitForm.icon} onChange={(e) => setHabitForm({ ...habitForm, icon: e.target.value })}>{["✦", "💧", "🏋️", "📚", "🌙", "🚶", "🧘", "🥗", "💰", "🧹", "🎯"].map((x) => <option key={x} value={x}>{x}</option>)}</select></label><label>Тип привычки<select className="modal-input" value={habitForm.mode} onChange={(e) => setHabitForm({ ...habitForm, mode: e.target.value as "check" | "counter" })}><option value="check">Выполнить / нет</option><option value="counter">Количественная</option></select></label></div>{habitForm.mode === "counter" && <div className="form-grid"><label>Цель за день<input className="modal-input" type="number" min="1" step="any" value={habitForm.target} onChange={(e) => setHabitForm({ ...habitForm, target: e.target.value })} /></label><label>Единица<input className="modal-input" list="metric-unit-options" value={habitForm.unit} onChange={(e) => setHabitForm({ ...habitForm, unit: e.target.value })} placeholder="стаканов, страниц…" /></label></div>}<label>Цель по дням в неделю<select className="modal-input" value={habitForm.daysPerWeek} onChange={(e) => setHabitForm({ ...habitForm, daysPerWeek: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((dayCount) => <option key={dayCount} value={dayCount}>{dayCount} {dayCount === 1 ? "день" : "дней"} в неделю</option>)}</select></label><button className="primary full" onClick={saveHabit}>{editId !== null ? "Сохранить изменения" : "Создать привычку"}</button></>}
      {modal === "goal" && <><label>Название цели<input className="modal-input" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="Напр. Пробежать 10 км" autoFocus /></label><label>Категория<select className="modal-input" value={goalForm.category} onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value as GoalCategory })}>{categories.map((x) => <option key={x}>{x}</option>)}</select></label><div className="form-grid"><label>Текущее значение<input className="modal-input" type="number" step="any" value={goalForm.progress} onChange={(e) => setGoalForm({ ...goalForm, progress: e.target.value })} /></label><label>Цель<input className="modal-input" type="number" min="0.01" step="any" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} /></label><label>Единица измерения<input className="modal-input" list="metric-unit-options" value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} placeholder="км, дней, %…" /></label><label>Срок<input className="modal-input" type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} /></label></div><button className="primary full" onClick={saveGoal}>{editId !== null ? "Сохранить изменения" : "Создать цель"}</button></>}
      {modal === "event" && <><label>Что произошло?<input className="modal-input" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Важное событие, мысль, результат" autoFocus /></label><label>Категория<select className="modal-input" value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}>{["Личное", "Тренировка", "Учёба", "Работа", "Здоровье", "Отдых", "Другое"].map((x) => <option key={x}>{x}</option>)}</select></label><button className="primary full" onClick={saveEvent}>Сохранить запись</button></>}
      {modal === "metric" && <><p className="page-hint">Добавь показатель, который хочешь отслеживать каждый день: пульс, процент жира, пройденные метры, расходы или что угодно своё.</p><label>Название показателя<input className="modal-input" value={metricForm.title} onChange={(e) => setMetricForm({ ...metricForm, title: e.target.value })} placeholder="Напр. Пульс в покое" autoFocus /></label><div className="form-grid"><label>Значение<input className="modal-input" type="text" inputMode="decimal" value={metricForm.value} onChange={(e) => setMetricForm({ ...metricForm, value: e.target.value })} placeholder="Напр. 62" /></label><label>Единица<input className="modal-input" list="metric-unit-options" value={metricForm.unit} onChange={(e) => setMetricForm({ ...metricForm, unit: e.target.value })} placeholder="уд/мин, %, км…" /></label></div><button className="primary full" onClick={saveMetric}>{editId !== null ? "Сохранить изменения" : "Добавить показатель"}</button></>}
    </Modal>}

    {profile && <Modal title="Профиль и резервная копия" onClose={() => setProfile(false)}><div className="profile"><div className="big-avatar">🙂</div><h3>{displayName}</h3><p className="muted">Данные хранятся локально в Telegram WebView.</p><div className="profile-stat"><span>Целей</span><strong>{goals.length}</strong></div><div className="profile-stat"><span>Привычек</span><strong>{habits.length}</strong></div><div className="profile-stat"><span>Активностей</span><strong>{activities.length}</strong></div><div className="profile-stat"><span>Планов</span><strong>{plans.length}</strong></div><div className="profile-stat"><span>Дней с данными</span><strong>{Object.keys(days).length}</strong></div><p className="backup-note">Чтобы не потерять записи при переустановке, очистке браузера или смене устройства, периодически сохраняй копию. Облачной синхронизации пока нет.</p><button className="primary full" onClick={exportBackup}>Скачать резервную копию</button><label className="import-button">Восстановить из файла<input type="file" accept="application/json,.json" onChange={(e) => importBackup(e.target.files?.[0])} /></label></div></Modal>}
  </div>;
}

function isHabitDone(habit: Habit, date: string) { const value = habit.completions?.[date]; return habit.mode === "counter" ? (typeof value === "number" ? value : value === true ? 1 : 0) >= (habit.target ?? 1) : Boolean(value); }
function habitStreak(habit: Habit, fromDate: string) { let count = 0; let cursor = fromDate; for (let i = 0; i < 366; i++) { if (!isHabitDone(habit, cursor)) break; count++; cursor = shiftDate(cursor, -1); } return count; }
function modalTitle(type: ModalType, editing: boolean) { const titles: Record<ModalType, string> = { activity: "Активность", plan: "План на день", habit: "Полезная привычка", goal: "Цель", event: "Запись в историю", metric: "Дополнительная метрика" }; return `${editing ? "Изменить" : "Добавить"}: ${titles[type]}`; }
function Metric({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) { return <div className="metric"><span className="metric-icon">{icon}</span><span className="muted">{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function SectionTitle({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) { return <div className="section-title"><h3>{title}</h3>{action && <button onClick={onClick}>{action}</button>}</div>; }
function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><small>{label}</small></button>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>✦</span><p>{text}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Закрыть">×</button></div>{children}</div></div>; }
function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  function commit(raw: string) { const normalized = normalizeTime(raw); if (normalized) { setDraft(normalized); onChange(normalized); } else { setDraft(value); } }
  function shift(amount: number) { const next = (minutesOf(normalizeTime(draft) ?? value) + amount + 1440) % 1440; const formatted = `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`; setDraft(formatted); onChange(formatted); }
  return <label className="time-field"><span>{label}</span><div className="time-control"><input type="text" inputMode="text" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={5} value={draft} placeholder="23:30" aria-label={label} onFocus={(e) => e.currentTarget.select()} onChange={(e) => { const raw = e.target.value.replace(/[^0-9:]/g, "").slice(0, 5); setDraft(raw); const normalized = normalizeTime(raw); if (normalized) onChange(normalized); }} onBlur={() => commit(draft)} onKeyDown={(e) => { if (e.key === "Enter") { commit(draft); e.currentTarget.blur(); } }} /><div className="time-stepper"><button type="button" onClick={() => shift(-15)} aria-label="Минус 15 минут">−</button><button type="button" onClick={() => shift(15)} aria-label="Плюс 15 минут">＋</button></div></div><small>Формат 24 часа · можно ввести вручную</small></label>;
}
function HabitList({ habits, selectedDate, onToggle, onAdjust, onEdit, onDelete }: { habits: Habit[]; selectedDate: string; onToggle: (id: number) => void; onAdjust: (id: number, change: number) => void; onEdit: (habit: Habit) => void; onDelete: (id: number) => void }) {
  if (!habits.length) return <Empty text="Привычек пока нет. Создай несколько реалистичных действий, которые хочешь повторять." />;
  return <div className="habit-list">{habits.map((habit) => { const completed = isHabitDone(habit, selectedDate); const raw = habit.completions[selectedDate]; const amount = typeof raw === "number" ? raw : raw === true ? 1 : 0; const countThisWeek = Object.keys(habit.completions).filter((date) => { const d = new Date(`${date}T12:00:00`); const selected = new Date(`${selectedDate}T12:00:00`); const start = new Date(selected); start.setDate(selected.getDate() - ((selected.getDay() + 6) % 7)); const end = new Date(start); end.setDate(start.getDate() + 7); return d >= start && d < end && isHabitDone(habit, date); }).length; return <div className={`habit-row ${completed ? "done" : ""}`} key={habit.id}><span className="habit-icon">{habit.icon}</span><div className="habit-body"><strong>{habit.title}</strong><small>{habit.mode === "counter" ? `${amount} / ${habit.target ?? 1} ${habit.unit ?? "раз"}` : `${countThisWeek}/${habit.daysPerWeek ?? 7} дней на неделе`}</small><div className="habit-progress"><span style={{ width: `${Math.min(100, habit.mode === "counter" ? amount / Math.max(1, habit.target ?? 1) * 100 : countThisWeek / Math.max(1, habit.daysPerWeek ?? 7) * 100)}%` }} /></div></div>{habit.mode === "counter" ? <div className="counter-buttons"><button onClick={() => onAdjust(habit.id, -1)} aria-label="Уменьшить">−</button><button onClick={() => onAdjust(habit.id, 1)} aria-label="Увеличить">＋</button></div> : <button className={`habit-check ${completed ? "checked" : ""}`} onClick={() => onToggle(habit.id)} aria-label="Отметить привычку">{completed ? "✓" : ""}</button>}<button className="edit-button" onClick={() => onEdit(habit)} aria-label="Редактировать привычку">✎</button><button className="delete" onClick={() => onDelete(habit.id)} aria-label="Удалить привычку">×</button></div>; })}</div>;
}
function BarChart({ rows, max, unit }: { rows: Array<{ label: string; value: number; display: string }>; max: number; unit: string }) { return <div className="bar-chart" aria-label={unit}>{rows.map((row, index) => <div className="bar-column" key={`${row.label}-${index}`}><strong>{row.display}</strong><div className="bar-track"><span style={{ height: `${Math.max(3, row.value / Math.max(1, max) * 100)}%` }} /></div><small>{row.label}</small></div>)}</div>; }

export default App;

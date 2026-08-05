import { useEffect, useMemo, useState } from "react";
import {
  PiggyBank,
  Target,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

import Panel from "../components/Panel";
import { listGoals, createGoal, addContribution, deleteGoal } from "../api";
import { money } from "../data/finance";
import "../styles/savings.css";

const toPiastres = (v) => Math.round(Number(v) * 100);
const todayISO = () => new Date().toISOString().slice(0, 10);
const newGoalForm = () => ({
  name: "",
  target_amount: "",
  current_amount: "",
  started_on: todayISO(), // date of the starting balance (first contribution)
  target_date: "",
  priority: "medium",
});

const PRIORITY_COLOR = { high: "#e5484d", medium: "var(--accent)", low: "#2ebd85" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const MS_PER_MONTH = 30.44 * 24 * 3600 * 1000;
const perMonth = (egp) => `${money(Math.round(egp))}/mo`;

const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Current pace from the REAL contribution history: how much has been added
// *after* the opening deposit, over the time since that opening deposit. The
// first contribution is treated as the starting balance (not saving activity),
// so a big lump-sum start no longer inflates the pace, and the number reflects
// the actual deposit cadence. Needs 2+ contributions to measure a rate.
function currentPaceOf(goal, saved) {
  const contribs = [...goal.contributions].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  if (contribs.length < 2) return { pace: 0, hasPace: false };

  const opening = contribs[0];
  const addedSinceStart = saved - opening.amount / 100; // EGP added after the opening deposit
  const windowMonths = Math.max(
    (Date.now() - new Date(opening.created_at)) / MS_PER_MONTH,
    0.5
  );
  return { pace: Math.max(addedSinceStart / windowMonths, 0), hasPace: true };
}

// Work out how a goal is tracking: percentage done, pace so far vs. pace
// needed, and whether it'll land before its target date. All display-only.
function analyze(goal) {
  const target = goal.target_amount / 100;
  const saved = goal.saved_amount / 100;
  const remaining = Math.max(target - saved, 0);
  const pct = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
  const completed = target > 0 && saved >= target;

  const { pace: currentPace, hasPace } = currentPaceOf(goal, saved);
  const now = new Date();
  const base = { target, saved, remaining, pct, completed, currentPace, hasPace };

  if (completed) return { ...base, status: "completed" };
  if (!goal.target_date) return { ...base, status: "nodate" };

  const targetDate = new Date(`${goal.target_date}T00:00:00`);
  const monthsToTarget = (targetDate - now) / MS_PER_MONTH;
  const requiredPace = monthsToTarget > 0 ? remaining / monthsToTarget : remaining;

  // Without 2+ contributions we can't measure a real pace, so don't guess a
  // finish date — show a "building pace" state instead of a false verdict.
  if (!hasPace) return { ...base, status: "building", requiredPace };

  const monthsToFinish = currentPace > 0 ? remaining / currentPace : Infinity;
  const expectedFinish = Number.isFinite(monthsToFinish)
    ? new Date(now.getTime() + monthsToFinish * MS_PER_MONTH)
    : null;
  const status = expectedFinish && expectedFinish <= targetDate ? "ahead" : "behind";

  let deltaText = "";
  if (expectedFinish) {
    const days = Math.round((targetDate - expectedFinish) / (24 * 3600 * 1000));
    const abs = Math.abs(days);
    const label = abs >= 60 ? `${Math.round(abs / 30.44)} months` : `${abs} days`;
    deltaText = days >= 0 ? `${label} early` : `${label} late`;
  }

  return { ...base, status, requiredPace, expectedFinish, deltaText };
}

const STATUS_META = {
  completed: { color: "#2ebd85", label: "🎉 Completed" },
  ahead: { color: "#2ebd85", label: "🚀 Ahead of schedule" },
  behind: { color: "#e5484d", label: "🔴 Behind schedule" },
  building: { color: "var(--accent)", label: "🌱 Building pace" },
  nodate: { color: "var(--accent)", label: "On track" },
};

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(newGoalForm);
  const [saving, setSaving] = useState(false);

  // Per-card UI (one open at a time keeps it simple).
  const [contribFor, setContribFor] = useState(null); // goal_id
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState("");
  const [historyFor, setHistoryFor] = useState(null); // goal_id

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setGoals(await listGoals());
    } catch (err) {
      setError(err.message || "Couldn't load your savings goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const totalSaved = goals.reduce((s, g) => s + g.saved_amount / 100, 0);
    const totalTarget = goals.reduce((s, g) => s + g.target_amount / 100, 0);
    const a = goals.map(analyze);
    const completed = a.filter((x) => x.status === "completed").length;
    const active = a.filter((x) => x.status !== "completed").length;
    const onTrack = a.filter(
      (x) => x.status === "ahead" || x.status === "nodate" || x.status === "building"
    ).length;
    return { totalSaved, totalTarget, completed, active, onTrack };
  }, [goals]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    const amount = toPiastres(form.target_amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Give your goal a name and a target amount above zero.");
      return;
    }
    setSaving(true);
    try {
      const startingBalance = form.current_amount ? toPiastres(form.current_amount) : 0;
      await createGoal({
        name: form.name.trim(),
        target_amount: amount,
        current_amount: startingBalance,
        started_on: form.started_on || null,
        target_date: form.target_date || null,
        priority: form.priority,
      });
      setForm(newGoalForm());
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleContribute(goalId) {
    const amount = toPiastres(contribAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const updated = await addContribution(goalId, amount, contribDate || null);
      setGoals((gs) => gs.map((g) => (g.goal_id === goalId ? updated : g)));
      setContribAmount("");
      setContribFor(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal(goalId) {
    try {
      await deleteGoal(goalId);
      setGoals((gs) => gs.filter((g) => g.goal_id !== goalId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Savings goals</p>
          <h1 className="ft-header__title">Save toward what matters</h1>
          <p className="ft-header__sub">
            Create buckets, put money in, and watch your progress and pace.
          </p>
        </div>
        <button
          type="button"
          className="ft-add-btn"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus size={16} /> {showForm ? "Close" : "Create goal"}
        </button>
      </header>

      {error && (
        <p className="sg-message sg-message--error" role="alert">
          {error}
        </p>
      )}

      {/* Summary cards — same look as the dashboard stats */}
      <div className="ft-stats">
        <article className="ft-stat">
          <header className="ft-stat__head">
            <span className="ft-stat__label">Total saved</span>
            <span className="ft-stat__icon" style={{ color: "#2ebd85" }}>
              <PiggyBank size={18} />
            </span>
          </header>
          <p className="ft-stat__value">{money(stats.totalSaved)}</p>
          <p className="ft-stat__meta">
            Across {goals.length} bucket{goals.length === 1 ? "" : "s"}
          </p>
        </article>

        <article className="ft-stat">
          <header className="ft-stat__head">
            <span className="ft-stat__label">Total target</span>
            <span className="ft-stat__icon" style={{ color: "var(--accent)" }}>
              <Target size={18} />
            </span>
          </header>
          <p className="ft-stat__value">{money(stats.totalTarget)}</p>
          <p className="ft-stat__meta">Combined goal amount</p>
        </article>

        <article className="ft-stat">
          <header className="ft-stat__head">
            <span className="ft-stat__label">Active goals</span>
            <span className="ft-stat__icon" style={{ color: "var(--accent)" }}>
              <Wallet size={18} />
            </span>
          </header>
          <p className="ft-stat__value">{stats.active}</p>
          <p className="ft-stat__meta">Still in progress</p>
        </article>

        <article className="ft-stat">
          <header className="ft-stat__head">
            <span className="ft-stat__label">On track</span>
            <span className="ft-stat__icon" style={{ color: "#2ebd85" }}>
              <TrendingUp size={18} />
            </span>
          </header>
          <p className="ft-stat__value">
            {stats.onTrack}/{stats.active || 0}
          </p>
          <p className="ft-stat__meta">Meeting their pace</p>
        </article>

        <article className="ft-stat">
          <header className="ft-stat__head">
            <span className="ft-stat__label">Completed</span>
            <span className="ft-stat__icon" style={{ color: "#2ebd85" }}>
              <CheckCircle2 size={18} />
            </span>
          </header>
          <p className="ft-stat__value">{stats.completed}</p>
          <p className="ft-stat__meta">Goals reached</p>
        </article>
      </div>

      {showForm && (
        <Panel title="Create savings goal" subtitle="Name it, set a target, add a starting amount">
          <form className="sg-form" onSubmit={handleCreate}>
            <label className="sg-form__full">
              Goal name
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Japan trip, Emergency fund"
                autoFocus
              />
            </label>
            <label>
              Target amount (EGP)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.target_amount}
                onChange={(e) => update("target_amount", e.target.value)}
                placeholder="30000"
              />
            </label>
            <label>
              Current savings (EGP)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.current_amount}
                onChange={(e) => update("current_amount", e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                max={todayISO()}
                value={form.started_on}
                onChange={(e) => update("started_on", e.target.value)}
              />
            </label>
            <label>
              Target date (optional)
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => update("target_date", e.target.value)}
              />
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <div className="sg-form__actions sg-form__full">
              <button type="submit" className="ft-add-btn" disabled={saving}>
                {saving ? "Saving…" : "Create goal"}
              </button>
              <button
                type="button"
                className="sg-btn-ghost"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      )}

      {loading ? (
        <p className="sg-empty">Loading your goals…</p>
      ) : goals.length === 0 ? (
        <div className="sg-empty-panel">
          <p className="sg-empty-panel__title">No savings goals yet</p>
          <p className="sg-empty-panel__sub">
            Create your first bucket — a trip, an emergency fund, a new phone — and
            start putting money aside.
          </p>
          <button type="button" className="ft-add-btn" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create your first goal
          </button>
        </div>
      ) : (
        <div className="sg-grid">
          {goals.map((goal) => {
            const a = analyze(goal);
            const meta = STATUS_META[a.status];
            const fill = a.completed ? "#2ebd85" : "var(--accent)";
            // Contributions can't predate the goal's start date.
            const earliest = goal.created_at ? goal.created_at.slice(0, 10) : null;
            return (
              <article className="sg-card" key={goal.goal_id}>
                <div className="sg-card__head">
                  <span
                    className="sg-dot"
                    style={{ background: PRIORITY_COLOR[goal.priority] }}
                    title={`${cap(goal.priority)} priority`}
                  />
                  <h3 className="sg-card__name">{goal.name}</h3>
                  <button
                    type="button"
                    className="sg-del"
                    onClick={() => removeGoal(goal.goal_id)}
                    aria-label={`Delete ${goal.name}`}
                    title="Delete goal"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="sg-card__amount">
                  {money(a.saved)} <span>/ {money(a.target)}</span>
                </p>

                <div className="sg-progress">
                  <span
                    className="sg-progress__fill"
                    style={{ width: `${a.pct}%`, background: fill }}
                  />
                </div>
                <p className="sg-pct">{a.pct}% complete</p>

                <div className="sg-meta">
                  {goal.target_date && <span>Target: {fmtDate(goal.target_date)}</span>}
                  <span>Priority: {cap(goal.priority)}</span>
                </div>

                <div className="sg-pace" style={{ borderColor: meta.color }}>
                  <p className="sg-status" style={{ color: meta.color }}>
                    {meta.label}
                  </p>

                  {a.status === "completed" && (
                    <p className="sg-pace__note" style={{ color: "#2ebd85" }}>
                      You hit your target — nicely done.
                    </p>
                  )}

                  {a.status === "nodate" && (
                    <>
                      {a.hasPace && (
                        <p className="sg-pace__row">
                          <span>Saving pace</span>
                          <span>{perMonth(a.currentPace)}</span>
                        </p>
                      )}
                      <p className="sg-pace__row sg-pace__row--muted">
                        <span>Remaining</span>
                        <span>{money(a.remaining)}</span>
                      </p>
                    </>
                  )}

                  {a.status === "building" && (
                    <>
                      <p className="sg-pace__row">
                        <span>Needed</span>
                        <span>{perMonth(a.requiredPace)}</span>
                      </p>
                      <p className="sg-pace__note" style={{ color: "var(--text-light)" }}>
                        Add a couple more contributions and we'll project your finish date.
                      </p>
                      <p className="sg-pace__row sg-pace__row--muted">
                        <span>Remaining</span>
                        <span>{money(a.remaining)}</span>
                      </p>
                    </>
                  )}

                  {(a.status === "ahead" || a.status === "behind") && (
                    <>
                      <p className="sg-pace__row">
                        <span>Needed</span>
                        <span>{perMonth(a.requiredPace)}</span>
                      </p>
                      <p className="sg-pace__row">
                        <span>Current pace</span>
                        <span>{perMonth(a.currentPace)}</span>
                      </p>
                      {a.expectedFinish && (
                        <p className="sg-pace__row">
                          <span>Expected finish</span>
                          <span>
                            {a.expectedFinish.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            <em style={{ color: meta.color }}>({a.deltaText})</em>
                          </span>
                        </p>
                      )}
                      {a.status === "behind" ? (
                        <p className="sg-pace__note" style={{ color: "#e8a33d" }}>
                          Add {perMonth(Math.max(a.requiredPace - a.currentPace, 0))} more to hit
                          your target date.
                        </p>
                      ) : (
                        <p className="sg-pace__note" style={{ color: "#2ebd85" }}>
                          You could ease to {perMonth(a.requiredPace)} and still make it.
                        </p>
                      )}
                      <p className="sg-pace__row sg-pace__row--muted">
                        <span>Remaining</span>
                        <span>{money(a.remaining)}</span>
                      </p>
                    </>
                  )}
                </div>

                <div className="sg-actions">
                  {contribFor === goal.goal_id ? (
                    <div className="sg-contrib">
                      <div className="sg-contrib__fields">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={contribAmount}
                          onChange={(e) => setContribAmount(e.target.value)}
                          placeholder="Amount (EGP)"
                          autoFocus
                        />
                        <input
                          type="date"
                          value={contribDate}
                          min={earliest || undefined}
                          max={todayISO()}
                          onChange={(e) => setContribDate(e.target.value)}
                          title="Date of this contribution"
                        />
                      </div>
                      <div className="sg-contrib__actions">
                        <button
                          type="button"
                          className="ft-add-btn"
                          onClick={() => handleContribute(goal.goal_id)}
                          disabled={saving}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="sg-btn-ghost"
                          onClick={() => {
                            setContribFor(null);
                            setContribAmount("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ft-add-btn"
                      onClick={() => {
                        setContribFor(goal.goal_id);
                        setContribAmount("");
                        setContribDate(todayISO());
                      }}
                    >
                      <Plus size={15} /> Add contribution
                    </button>
                  )}

                  <button
                    type="button"
                    className="sg-history-btn"
                    onClick={() =>
                      setHistoryFor((id) => (id === goal.goal_id ? null : goal.goal_id))
                    }
                  >
                    {historyFor === goal.goal_id ? "Hide" : "View"} contribution history
                  </button>
                </div>

                {historyFor === goal.goal_id && (
                  <div className="sg-history">
                    <p className="sg-history__title">Contribution history</p>
                    {goal.contributions.length === 0 ? (
                      <p className="sg-history__empty">No contributions yet.</p>
                    ) : (
                      <>
                        {goal.contributions.map((c) => (
                          <div className="sg-hist-row" key={c.contribution_id}>
                            <span className="sg-hist-amt">+{money(c.amount / 100)}</span>
                            <span className="sg-hist-when">
                              {new Date(c.created_at).toLocaleDateString()} ·{" "}
                              {new Date(c.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                        <div className="sg-hist-total">
                          {goal.contributions.length} contribution
                          {goal.contributions.length === 1 ? "" : "s"} · {money(a.saved)} added
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  FaAmazon,
  FaApple,
  FaBolt,
  FaGoogle,
  FaMicrosoft,
  FaPlus,
  FaRegCalendarAlt,
  FaSpotify,
  FaTrashAlt,
  FaYoutube,
} from "react-icons/fa";
import { SiNetflix, SiVodafone } from "react-icons/si";

import Panel from "../components/Panel";
import {
  createQuickExpense,
  createRecurringExpense,
  deleteQuickExpense,
  deleteRecurringExpense,
  listQuickExpenses,
  listRecurringExpenses,
  logQuickExpense,
} from "../api";
import { CATEGORY_COLORS, formatDate, money } from "../data/finance";
import { useTransactions } from "../context/TransactionContext";
import "../styles/recurring.css";

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Health",
];

// A local picker keeps the form fast and works without a third-party logo API.
// "Other" is always available for any subscription not listed here.
const SUBSCRIPTION_BRANDS = [
  { name: "Netflix", category: "Entertainment", icon: SiNetflix, color: "#e50914" },
  { name: "Spotify", category: "Entertainment", icon: FaSpotify, color: "#1db954" },
  { name: "YouTube Premium", category: "Entertainment", icon: FaYoutube, color: "#ff0000" },
  { name: "Apple One / iCloud", category: "Utilities", icon: FaApple, color: "#a2aaad" },
  { name: "Google One", category: "Utilities", icon: FaGoogle, color: "#4285f4" },
  { name: "Microsoft 365", category: "Utilities", icon: FaMicrosoft, color: "#f25022" },
  { name: "Amazon Prime", category: "Entertainment", icon: FaAmazon, color: "#ff9900" },
  { name: "Vodafone", category: "Utilities", icon: SiVodafone, color: "#e60000" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const newRecurringForm = () => ({
  brand: "",
  description: "",
  category: "Utilities",
  amount: "",
  frequency: "monthly",
  next_due_date: todayISO(),
});

const newQuickForm = () => ({ description: "", category: "Transport", amount: "" });

const toPiastres = (amount) => Math.round(Number(amount) * 100);

export default function RecurringExpenses() {
  const { loadTransactions } = useTransactions();
  const [recurring, setRecurring] = useState([]);
  const [quickExpenses, setQuickExpenses] = useState([]);
  const [recurringForm, setRecurringForm] = useState(newRecurringForm);
  const [quickForm, setQuickForm] = useState(newQuickForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      // Fetch rules first: it creates any overdue recurring transactions.
      const rules = await listRecurringExpenses();
      const shortcuts = await listQuickExpenses();
      await loadTransactions();
      setRecurring(rules);
      setQuickExpenses(shortcuts);
    } catch (err) {
      setError(err.message || "Couldn't load your recurring expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const monthlyEstimate = useMemo(
    () =>
      recurring.reduce(
        (total, rule) => total + rule.amount / 100 * (rule.frequency === "weekly" ? 4.33 : 1),
        0
      ),
    [recurring]
  );

  function updateRecurring(field, value) {
    setRecurringForm((current) => ({ ...current, [field]: value }));
  }

  function updateQuick(field, value) {
    setQuickForm((current) => ({ ...current, [field]: value }));
  }

  function selectSubscription(brand) {
    if (brand === "other") {
      setRecurringForm((current) => ({ ...current, brand, description: "" }));
      return;
    }
    setRecurringForm((current) => ({
      ...current,
      brand: brand.name,
      description: brand.name,
      category: brand.category,
    }));
  }

  async function addRecurring(event) {
    event.preventDefault();
    const amount = toPiastres(recurringForm.amount);
    if (!recurringForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Choose a subscription (or Other) and enter an amount above zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { brand: _brand, ...payload } = recurringForm;
      await createRecurringExpense({ ...payload, description: recurringForm.description.trim(), amount });
      setRecurringForm(newRecurringForm());
      setNotice("Recurring expense saved. Any due occurrence is now in your transactions.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addQuick(event) {
    event.preventDefault();
    const amount = toPiastres(quickForm.amount);
    if (!quickForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Give the quick expense a name and an amount above zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createQuickExpense({ ...quickForm, description: quickForm.description.trim(), amount });
      setQuickForm(newQuickForm());
      setNotice("Quick expense saved. Use “Add today” whenever you pay it.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addQuickToday(shortcut) {
    setSaving(true);
    setError("");
    try {
      await logQuickExpense(shortcut.quick_expense_id);
      setNotice(`${shortcut.description} was added to today's expenses.`);
      await loadTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRecurring(id) {
    try {
      await deleteRecurringExpense(id);
      setRecurring((rules) => rules.filter((rule) => rule.recurring_expense_id !== id));
      setNotice("Recurring expense removed. Transactions already created stay in your history.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeQuick(id) {
    try {
      await deleteQuickExpense(id);
      setQuickExpenses((shortcuts) => shortcuts.filter((shortcut) => shortcut.quick_expense_id !== id));
      setNotice("Quick expense removed.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Recurring & quick expenses</p>
          <h1 className="ft-header__title">Make regular spending effortless</h1>
          <p className="ft-header__sub">
            Subscriptions are added weekly or monthly. Save fuel, parking, and similar costs for one-tap logging.
          </p>
        </div>
      </header>

      {error && <p className="rx-message rx-message--error" role="alert">{error}</p>}
      {notice && <p className="rx-message rx-message--notice" role="status">{notice}</p>}

      <div className="rx-summary">
        <div>
          <span className="rx-summary__label">Planned recurring spend</span>
          <strong>{money(monthlyEstimate)}</strong>
          <span className="rx-summary__sub">Estimated per month</span>
        </div>
        <div>
          <span className="rx-summary__label">Active schedules</span>
          <strong>{recurring.length}</strong>
          <span className="rx-summary__sub">Weekly or monthly</span>
        </div>
      </div>

      <div className="rx-grid">
        <Panel title="Subscriptions & bills" subtitle="Add a cost that repeats automatically">
          <form className="rx-form" onSubmit={addRecurring}>
            <fieldset className="rx-brand-picker rx-form__full">
              <legend>Choose a subscription</legend>
              <div className="rx-brand-options">
                {SUBSCRIPTION_BRANDS.map((brand) => {
                  const BrandIcon = brand.icon;
                  return (
                    <button
                      type="button"
                      key={brand.name}
                      className={`rx-brand-option ${recurringForm.brand === brand.name ? "is-selected" : ""}`}
                      onClick={() => selectSubscription(brand)}
                      aria-pressed={recurringForm.brand === brand.name}
                    >
                      <BrandIcon style={{ color: brand.color }} aria-hidden="true" />
                      <span>{brand.name}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`rx-brand-option ${recurringForm.brand === "other" ? "is-selected" : ""}`}
                  onClick={() => selectSubscription("other")}
                  aria-pressed={recurringForm.brand === "other"}
                >
                  <FaPlus aria-hidden="true" />
                  <span>Other</span>
                </button>
              </div>
            </fieldset>
            {recurringForm.brand === "other" && (
              <label className="rx-form__full">
                Subscription name
                <input value={recurringForm.description} onChange={(e) => updateRecurring("description", e.target.value)} placeholder="Internet, gym, insurance…" autoFocus />
              </label>
            )}
            <label>
              Category
              <select value={recurringForm.category} onChange={(e) => updateRecurring("category", e.target.value)}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Amount (EGP)
              <input type="number" min="0.01" step="0.01" value={recurringForm.amount} onChange={(e) => updateRecurring("amount", e.target.value)} placeholder="0.00" />
            </label>
            <label>
              Repeat
              <select value={recurringForm.frequency} onChange={(e) => updateRecurring("frequency", e.target.value)}>
                <option value="monthly">Every month</option>
                <option value="weekly">Every week</option>
              </select>
            </label>
            <label className="rx-form__full">
              First due date
              <input type="date" value={recurringForm.next_due_date} onChange={(e) => updateRecurring("next_due_date", e.target.value)} />
            </label>
            <button type="submit" className="ft-add-btn rx-form__full" disabled={saving}>
              <FaPlus /> Add recurring expense
            </button>
          </form>

          <div className="rx-list" aria-live="polite">
            {loading ? <p className="rx-empty">Loading schedules…</p> : recurring.length === 0 ? <p className="rx-empty">No subscriptions yet. Add a bill above to keep your spending current.</p> : recurring.map((rule) => (
              <article className="rx-row" key={rule.recurring_expense_id}>
                <span className="rx-dot" style={{ background: CATEGORY_COLORS[rule.category] }} />
                <div className="rx-row__main">
                  <strong>{rule.description}</strong>
                  <span><FaRegCalendarAlt /> {rule.frequency === "weekly" ? "Weekly" : "Monthly"} · next {formatDate(rule.next_due_date)}</span>
                </div>
                <strong className="rx-row__amount">{money(rule.amount / 100)}</strong>
                <button type="button" className="rx-icon-btn" onClick={() => removeRecurring(rule.recurring_expense_id)} aria-label={`Remove ${rule.description}`} title="Remove recurring expense"><FaTrashAlt /></button>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Quick expenses" subtitle="Save common purchases, then log them with one click">
          <form className="rx-form" onSubmit={addQuick}>
            <label>
              Name
              <input value={quickForm.description} onChange={(e) => updateQuick("description", e.target.value)} placeholder="Fuel, parking…" />
            </label>
            <label>
              Category
              <select value={quickForm.category} onChange={(e) => updateQuick("category", e.target.value)}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="rx-form__full">
              Usual amount (EGP)
              <input type="number" min="0.01" step="0.01" value={quickForm.amount} onChange={(e) => updateQuick("amount", e.target.value)} placeholder="0.00" />
            </label>
            <button type="submit" className="ft-add-btn rx-form__full" disabled={saving}>
              <FaPlus /> Save quick expense
            </button>
          </form>

          <div className="rx-list" aria-live="polite">
            {loading ? <p className="rx-empty">Loading quick expenses…</p> : quickExpenses.length === 0 ? <p className="rx-empty">Save fuel, parking, coffee, or anything you pay often.</p> : quickExpenses.map((shortcut) => (
              <article className="rx-row" key={shortcut.quick_expense_id}>
                <span className="rx-dot" style={{ background: CATEGORY_COLORS[shortcut.category] }} />
                <div className="rx-row__main">
                  <strong>{shortcut.description}</strong>
                  <span>{shortcut.category}</span>
                </div>
                <strong className="rx-row__amount">{money(shortcut.amount / 100)}</strong>
                <button type="button" className="rx-log-btn" onClick={() => addQuickToday(shortcut)} disabled={saving}><FaBolt /> Add today</button>
                <button type="button" className="rx-icon-btn" onClick={() => removeQuick(shortcut.quick_expense_id)} aria-label={`Remove ${shortcut.description}`} title="Remove quick expense"><FaTrashAlt /></button>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

import "./TransactionModal.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaStore,
  FaTag,
  FaCalendarAlt,
  FaStickyNote,
  FaExclamationTriangle,
} from "react-icons/fa";

import { useTransactions } from "../../context/TransactionContext";
import { useBudget } from "../../context/BudgetContext";
import { categorizeMerchant } from "../../api";
import { CATEGORY_COLORS, money } from "../../data/finance";

const CATEGORY_OPTIONS = [
  { name: "Shopping", emoji: "🛍️" },
  { name: "Food & Dining", emoji: "🍔" },
  { name: "Transport", emoji: "🚗" },
  { name: "Utilities", emoji: "💡" },
  { name: "Entertainment", emoji: "🎬" },
  { name: "Health", emoji: "🏥" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  merchant: "",
  category: "",
  amount: "",
  date: todayISO(),
  note: "",
};

export default function TransactionModal({ closeModal, onSaved, transaction }) {
  const { addTransaction, updateTransaction, transactions } = useTransactions();
  const { spendingLimit } = useBudget();
  const isEditing = Boolean(transaction);
  const [formData, setFormData] = useState(
    transaction
      ? {
          merchant: transaction.merchant || "",
          category: transaction.category || "",
          amount: String(transaction.amount ?? ""),
          date: transaction.date || todayISO(),
          note: transaction.note || "",
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false); // waiting on /categorize
  const [suggested, setSuggested] = useState(false);   // category was auto-filled
  const firstFieldRef = useRef(null);
  // Editing starts with a real category already chosen, so treat it as
  // user-set — the live suggester shouldn't overwrite it.
  const manualCategoryRef = useRef(isEditing);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    // If the user picks a category themselves, remember that and drop the
    // "suggested" badge — it's their choice now, and live re-suggestion stops
    // overwriting it.
    if (name === "category") {
      manualCategoryRef.current = true;
      setSuggested(false);
    }
  }

  // Auto-suggest a category from the merchant name, updating live as the user
  // types. Debounced so we only call the backend ~half a second after they
  // stop typing (not on every keystroke), and guarded so we never overwrite a
  // category the user picked by hand. Any failure is ignored — the suggestion
  // is a convenience, not required.
  useEffect(() => {
    const merchant = formData.merchant.trim();
    if (!merchant || manualCategoryRef.current) return;

    let active = true;
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await categorizeMerchant(merchant);
        if (!active) return; // merchant changed again — ignore this stale result
        if (res?.category) {
          setFormData((prev) => ({ ...prev, category: res.category }));
          setSuggested(true);
          setErrors((prev) => ({ ...prev, category: undefined }));
        }
      } catch {
        // token expired / backend down — just leave the category to the user
      } finally {
        if (active) setSuggesting(false);
      }
    }, 500);

    // If the merchant changes (or the modal closes) before the request
    // finishes, cancel it so only the latest merchant name wins.
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.merchant]);

  // Live check: would this transaction push its month over the user's spending
  // limit? Compares the entered amount against the limit, using the total for
  // the month of the transaction's date (and excluding this row when editing).
  const limitWarning = useMemo(() => {
    if (!spendingLimit || spendingLimit <= 0) return null;
    const amt = Number(formData.amount);
    if (!Number.isFinite(amt) || amt <= 0 || !formData.date) return null;
    const ym = formData.date.slice(0, 7);
    const monthSpent = transactions
      .filter(
        (t) =>
          (t.date || "").slice(0, 7) === ym &&
          !(isEditing && t.id === transaction.id)
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const projected = monthSpent + amt;
    return projected > spendingLimit
      ? { over: projected - spendingLimit, limit: spendingLimit }
      : null;
  }, [spendingLimit, formData.amount, formData.date, transactions, isEditing, transaction]);

  function validate() {
    const next = {};
    if (!formData.merchant.trim()) next.merchant = "Required";
    if (!formData.category) next.category = "Required";
    if (!formData.amount || Number(formData.amount) <= 0) next.amount = "Enter an amount above 0";
    if (!formData.date) next.date = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));
    try {
      const payload = {
        merchant: formData.merchant.trim(),
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date,
        note: formData.note.trim(),
      };
      const saved = isEditing
        ? await updateTransaction(transaction.id, payload)
        : await addTransaction(payload);
      onSaved?.(saved, isEditing);
      closeModal();
    } catch (err) {
      // e.g. token expired, or the backend is down
      setErrors((prev) => ({ ...prev, submit: err.message }));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div
        className="transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-transaction-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="add-transaction-title">
              {isEditing ? "Edit transaction" : "Add transaction"}
            </h2>
            <p className="modal-header__sub">
              {isEditing
                ? "Changes update your totals and charts everywhere"
                : "Log a purchase so your totals stay current"}
            </p>
          </div>
          <button type="button" className="close-btn" onClick={closeModal} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-grid">
            <label className={`modal-field ${errors.merchant ? "has-error" : ""}`}>
              <span className="modal-field__label">Merchant</span>
              <div className="modal-input">
                <FaStore aria-hidden="true" />
                <input
                  ref={firstFieldRef}
                  type="text"
                  placeholder="e.g. Sunrise Café"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleChange}
                />
              </div>
              {errors.merchant && <span className="modal-field__error">{errors.merchant}</span>}
            </label>

            <label className={`modal-field ${errors.category ? "has-error" : ""}`}>
              <span className="modal-field__label">
                Category
                {suggesting && (
                  <em style={{ marginLeft: 6, fontWeight: 400, opacity: 0.6 }}>
                    · finding…
                  </em>
                )}
                {suggested && !suggesting && (
                  <em style={{ marginLeft: 6, fontWeight: 400, opacity: 0.7 }}>
                    · ✨ auto-suggested
                  </em>
                )}
              </span>
              <div className="modal-input">
                <FaTag aria-hidden="true" />
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && <span className="modal-field__error">{errors.category}</span>}
            </label>

            <label className={`modal-field ${errors.amount ? "has-error" : ""}`}>
              <span className="modal-field__label">Amount</span>
              <div className="modal-input">
                <span className="currency-icon">E£</span>
                <input
                  type="number"
                  placeholder="0.00"
                  name="amount"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                />
              </div>
              {errors.amount && <span className="modal-field__error">{errors.amount}</span>}
            </label>

            <label className={`modal-field ${errors.date ? "has-error" : ""}`}>
              <span className="modal-field__label">Date</span>
              <div className="modal-input">
                <FaCalendarAlt aria-hidden="true" />
                <input
                  type="date"
                  name="date"
                  max={todayISO()}
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
              {errors.date && <span className="modal-field__error">{errors.date}</span>}
            </label>

            <label className="modal-field modal-field--full">
              <span className="modal-field__label">Note (optional)</span>
              <div className="modal-input">
                <FaStickyNote aria-hidden="true" />
                <input
                  type="text"
                  placeholder="e.g. split with roommate"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                />
              </div>
            </label>
          </div>

          {formData.category && (
            <div className="modal-preview">
              <span
                className="modal-preview__dot"
                style={{ background: CATEGORY_COLORS[formData.category] }}
              />
              Filed under <strong>{formData.category}</strong>
            </div>
          )}

          {limitWarning && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: "8px 0 0",
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: "#e8a33d",
                background: "color-mix(in srgb, #e8a33d 12%, transparent)",
                border: "1px solid color-mix(in srgb, #e8a33d 45%, transparent)",
              }}
            >
              <FaExclamationTriangle aria-hidden="true" />
              <span>
                This puts you {money(limitWarning.over)} over your{" "}
                {money(limitWarning.limit)} monthly limit — you can still save it.
              </span>
            </div>
          )}

          {errors.submit && (
            <p style={{ color: "#e5484d", fontSize: "13px", margin: "4px 0 0" }}>
              {errors.submit}
            </p>
          )}

          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Save transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

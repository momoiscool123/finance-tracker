import "./TransactionModal.css";

import { useEffect, useRef, useState } from "react";
import {
  FaStore,
  FaTag,
  FaCalendarAlt,
  FaStickyNote,
} from "react-icons/fa";

import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_COLORS } from "../../data/finance";

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

export default function TransactionModal({ closeModal, onSaved }) {
  const { addTransaction } = useTransactions();
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const firstFieldRef = useRef(null);

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
  }

  function validate() {
    const next = {};
    if (!formData.merchant.trim()) next.merchant = "Required";
    if (!formData.category) next.category = "Required";
    if (!formData.amount || Number(formData.amount) <= 0) next.amount = "Enter an amount above 0";
    if (!formData.date) next.date = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const saved = addTransaction({
      merchant: formData.merchant.trim(),
      category: formData.category,
      amount: Number(formData.amount),
      date: formData.date,
      note: formData.note.trim(),
    });

    onSaved?.(saved);
    closeModal();
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
            <h2 id="add-transaction-title">Add transaction</h2>
            <p className="modal-header__sub">Log a purchase so your totals stay current</p>
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
              <span className="modal-field__label">Category</span>
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

          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

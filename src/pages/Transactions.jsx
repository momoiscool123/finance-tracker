import { useEffect, useMemo, useRef, useState } from "react";
import { FaPlus, FaTrashAlt } from "react-icons/fa";

import Panel from "../components/Panel";
import TransactionModal from "../components/TransactionModal/TransactionModal";
import { CATEGORY_COLORS, formatDate, money } from "../data/finance";
import { useTransactions } from "../context/TransactionContext";

export default function Transactions() {
  const { transactions, deleteTransaction } = useTransactions();
  const [openModal, setOpenModal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const total = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  function handleSaved(transaction) {
    setToast(`Added ${transaction.merchant} · ${money(transaction.amount)}`);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Transaction History</p>
          <h1 className="ft-header__title">Manage your finances</h1>
          <p className="ft-header__sub">View every expense in one place</p>
        </div>

        <button
          type="button"
          className="ft-add-btn"
          onClick={() => setOpenModal(true)}
        >
          <FaPlus />
          Add transaction
        </button>
      </header>

      <Panel
        title="Recent transactions"
        subtitle={
          transactions.length
            ? `${transactions.length} shown · ${money(total)} total`
            : "No transactions yet"
        }
      >
        {transactions.length === 0 ? (
          <div className="ft-empty">
            <p className="ft-empty__title">Nothing logged yet</p>
            <p className="ft-empty__sub">
              Add your first transaction to start tracking your spending.
            </p>
            <button
              type="button"
              className="ft-add-btn"
              onClick={() => setOpenModal(true)}
            >
              <FaPlus />
              Add transaction
            </button>
          </div>
        ) : (
          <table className="ft-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td className="ft-table__merchant">
                    {t.merchant}
                    {t.note && <span className="ft-table__note">{t.note}</span>}
                  </td>
                  <td>
                    <span className="ft-pill">
                      <span
                        className="ft-pill__dot"
                        style={{ background: CATEGORY_COLORS[t.category] }}
                      />
                      {t.category}
                    </span>
                  </td>
                  <td className="ft-table__amount">{money(t.amount)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="ft-row-delete"
                      onClick={() => deleteTransaction(t.id)}
                      aria-label={`Delete ${t.merchant} transaction`}
                      title="Delete transaction"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {openModal && (
        <TransactionModal
          closeModal={() => setOpenModal(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div className="ft-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

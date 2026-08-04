import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  listTransactions,
  deleteTransaction as apiDeleteTransaction,
} from "../api";

const TransactionContext = createContext(null);

/* ---- shape mapping ----------------------------------------------------
   Backend speaks:  description, price (piastres), items[]
   Frontend speaks: merchant, amount (EGP), single value
   These two helpers translate between them.
------------------------------------------------------------------------ */

// backend transaction -> frontend row
function fromBackend(t) {
  return {
    id: t.transaction_id,
    merchant: t.description,
    amount: t.price / 100, // piastres -> EGP
    category: t.category,
    date: t.date,
    note: "", // backend has no note field
  };
}

// frontend form -> backend POST body.
// The backend computes price = sum(items), so we send the amount as one item.
function toBackend(form) {
  const piastres = Math.round(Number(form.amount) * 100);
  return {
    description: form.merchant,
    category: form.category,
    date: form.date,
    items: [{ item_name: form.merchant, item_price: piastres }],
  };
}

const byDateDesc = (a, b) => b.date.localeCompare(a.date);

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pull this user's transactions from the backend (no-op if not logged in).
  async function loadTransactions() {
    if (!localStorage.getItem("token")) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listTransactions();
      setTransactions(data.map(fromBackend).sort(byDateDesc));
    } catch {
      // token missing/expired or backend down — show nothing rather than crash
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  // Runs once on load — covers refreshing the page while already logged in.
  useEffect(() => {
    loadTransactions();
  }, []);

  // Create on the backend, then add the returned row to state.
  async function addTransaction(form) {
    const created = await createTransaction(toBackend(form));
    const row = fromBackend(created);
    setTransactions((prev) => [row, ...prev].sort(byDateDesc));
    return row;
  }

  // Delete on the backend, then drop the row from state.
  async function deleteTransaction(id) {
    await apiDeleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const value = useMemo(
    () => ({ transactions, loading, addTransaction, deleteTransaction, loadTransactions }),
    [transactions, loading]
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) {
    throw new Error("useTransactions must be used inside <TransactionProvider>");
  }
  return ctx;
}

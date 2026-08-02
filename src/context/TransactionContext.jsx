import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_TRANSACTIONS } from "../data/transactions";

const TransactionContext = createContext(null);

const STORAGE_KEY = "ft_transactions_v1";

function loadInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupt storage and fall back to the seed set
  }
  return SEED_TRANSACTIONS;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // storage can fail (private mode, quota) — the app still works in-memory
    }
  }, [transactions]);

  function addTransaction(transaction) {
    const newTransaction = {
      id: Date.now(),
      note: "",
      ...transaction,
    };

    setTransactions((prev) =>
      [newTransaction, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );

    return newTransaction;
  }

  function deleteTransaction(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const value = useMemo(
    () => ({ transactions, addTransaction, deleteTransaction }),
    [transactions]
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

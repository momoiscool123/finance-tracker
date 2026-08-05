import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* Holds the user's monthly spending limit (persisted to localStorage).
   Kept separate from transactions so any page can read/set it. */

const BudgetContext = createContext(null);
const STORAGE_KEY = "ft_budget_v1";

function loadInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { spendingLimit: 0, ...JSON.parse(saved) };
  } catch {
    // ignore corrupt storage
  }
  return { spendingLimit: 0 };
}

export function BudgetProvider({ children }) {
  const [budget, setBudget] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
    } catch {
      // storage can fail (private mode / quota) — the limit still works in-memory
    }
  }, [budget]);

  const value = useMemo(
    () => ({
      spendingLimit: budget.spendingLimit,
      setSpendingLimit: (v) => setBudget((b) => ({ ...b, spendingLimit: v })),
    }),
    [budget]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget must be used inside <BudgetProvider>");
  }
  return ctx;
}

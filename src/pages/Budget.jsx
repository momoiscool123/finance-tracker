import { useMemo } from "react";
import { TriangleAlert, Info } from "lucide-react";
import Panel from "../components/Panel";
import BankPanel from "../components/BankPanel";
import { useBudget } from "../context/BudgetContext";
import { useTransactions } from "../context/TransactionContext";
import { spentThisMonth, money } from "../data/finance";

// Combined "Bank & limits" page: set a monthly spending limit (with advice as
// you approach it) and view the bank / loan-affordability feature underneath.

// Gentle, tiered advice based on how much of the limit is used.
function limitAdvice(spent, limit) {
  if (!limit || limit <= 0) {
    return { tone: "info", text: "Set a monthly limit and you'll get a heads-up as you get close to it." };
  }
  const used = spent / limit;
  const left = limit - spent;

  if (used >= 1) {
    return {
      tone: "bad",
      text: `You've passed your limit by ${money(spent - limit)}. Try to pause non-essential spending for the rest of the month.`,
    };
  }
  if (used >= 0.9) {
    return {
      tone: "warn",
      text: `Almost there — only ${money(left)} left. Best to hold off on anything non-essential now.`,
    };
  }
  if (used >= 0.75) {
    return {
      tone: "warn",
      text: `Heads up: you've used ${Math.round(used * 100)}% of your limit. ${money(left)} left — spend carefully.`,
    };
  }
  if (used >= 0.5) {
    return {
      tone: "info",
      text: `Halfway through your limit, with ${money(left)} to go. On track so far.`,
    };
  }
  return { tone: "good", text: `Plenty of room — ${money(left)} left of your ${money(limit)} limit.` };
}

export default function Budget() {
  const { spendingLimit, setSpendingLimit } = useBudget();
  const { transactions } = useTransactions();

  const spent = useMemo(() => spentThisMonth(transactions), [transactions]);

  const limitPct =
    spendingLimit > 0 ? Math.min(100, Math.round((spent / spendingLimit) * 100)) : 0;
  const advice = limitAdvice(spent, spendingLimit);
  const barTone = advice.tone === "bad" ? "red" : advice.tone === "warn" ? "amber" : "coral";

  const boxValue = (v) => (v ? v : "");
  const parse = (e) => Math.max(0, Number(e.target.value) || 0);

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Bank &amp; limits</p>
          <h1 className="ft-header__title">Spending limit &amp; bank</h1>
          <p className="ft-header__sub">
            Set a monthly limit and get a nudge as you approach it.
          </p>
        </div>
      </header>

      <Panel title="Monthly spending limit" subtitle="This month" className="bg-section">
        <label className="bg-field">
          <span>Spending limit (EGP)</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 10000"
            value={boxValue(spendingLimit)}
            onChange={(e) => setSpendingLimit(parse(e))}
          />
        </label>

        {spendingLimit > 0 && (
          <>
            <div className="bg-meta">
              <span>{money(spent)} spent</span>
              <span>{money(spendingLimit)} limit</span>
            </div>
            <div className="bg-bar bg-bar--lg">
              <div
                className={`bg-bar__fill bg-bar__fill--${barTone}`}
                style={{ width: `${limitPct}%` }}
              />
            </div>
          </>
        )}

        <div className={`bg-advice bg-advice--${advice.tone}`}>
          {advice.tone === "bad" ? <TriangleAlert size={17} /> : <Info size={17} />}
          <p>{advice.text}</p>
        </div>
      </Panel>

      <BankPanel />
    </>
  );
}

import { useMemo, useState } from "react";
import Panel from "./Panel";
import {
  CATEGORY_BREAKDOWN,
  TIMELINE,
  RANGE_DATA,
} from "../data/finance";

const ESSENTIAL = ["Food", "Transport", "Health", "Utilities"];

const BANKS = [
  { id: "nbe", name: "National Bank of Egypt", short: "NBE", rate: 0.215 },
  { id: "cib", name: "CIB", short: "CIB", rate: 0.199 },
  { id: "qnb", name: "QNB Alahli", short: "QNB", rate: 0.205 },
];

const moneyShort = (n) =>
  "EGP " +
  n.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

function analyseFinances() {
  const months = TIMELINE.Monthly;

  const avgMonth =
    months.reduce((sum, month) => sum + month.spend, 0) / months.length;

  const spread =
    months.reduce(
      (sum, month) => sum + Math.abs(month.spend - avgMonth),
      0
    ) / months.length;

  const variance = (spread / avgMonth) * 100;

  const weighted = RANGE_DATA.map((category) => {
    const frequency = CATEGORY_BREAKDOWN.find((item) =>
      item.name.startsWith(category.name)
    );

    return {
      name: category.name,
      weight: category.avg * (frequency ? frequency.value : 0),
    };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

  const spendShare = weighted.map((item) => ({
    name: item.name,
    pct: totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0,
  }));

  const discretionary = spendShare
    .filter((category) => !ESSENTIAL.includes(category.name))
    .reduce((sum, category) => sum + category.pct, 0);

  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const trendPct =
    previousMonth?.spend > 0
      ? ((currentMonth.spend - previousMonth.spend) / previousMonth.spend) * 100
      : 0;

  const topCommitment = spendShare
    .filter((category) => ESSENTIAL.includes(category.name))
    .sort((a, b) => b.pct - a.pct)[0] ?? { name: "N/A", pct: 0 };

  return {
    avgMonth,
    variance,
    discretionary,
    trendPct,
    topCommitment,
    months,
  };
}

function monthlyRepayment(principal, months, annualRate) {
  if (principal <= 0 || months <= 0) return 0;

  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / months;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

export default function BankPanel() {
  const [stage, setStage] = useState("idle");
  const [amount, setAmount] = useState(50000);
  const [term, setTerm] = useState(24);
  const [bankId, setBankId] = useState("nbe");

  const analysis = useMemo(() => analyseFinances(), []);
  const bank = BANKS.find((item) => item.id === bankId) ?? BANKS[0];

  const headroom = analysis.avgMonth * (analysis.discretionary / 100);
  const repayment = monthlyRepayment(amount, term, bank.rate);
  const usedPct = headroom > 0 ? (repayment / headroom) * 100 : 0;

  const affordability =
    usedPct <= 40 ? "comfortable" : usedPct <= 75 ? "tight" : "over budget";

  const affordRating =
    usedPct <= 40 ? "strong" : usedPct <= 75 ? "fair" : "weak";

  const indicators = [
    {
      label: "Income stability",
      value: `±${analysis.variance.toFixed(1)}%`,
      rating:
        analysis.variance <= 10
          ? "strong"
          : analysis.variance <= 20
            ? "fair"
            : "weak",
      note:
        analysis.variance <= 10
          ? "Monthly spending is consistent, which suggests predictable income."
          : "Monthly spending swings noticeably month to month.",
    },
    {
      label: "Flexible spending",
      value: `${analysis.discretionary.toFixed(0)}%`,
      rating:
        analysis.discretionary >= 30
          ? "strong"
          : analysis.discretionary >= 20
            ? "fair"
            : "weak",
      note: `${analysis.discretionary.toFixed(0)}% goes to non-essentials — spending that could be reduced to cover a repayment.`,
    },
    {
      label: "Recent trend",
      value: `${analysis.trendPct >= 0 ? "+" : ""}${analysis.trendPct.toFixed(1)}%`,
      rating:
        analysis.trendPct <= 0
          ? "strong"
          : analysis.trendPct <= 10
            ? "fair"
            : "weak",
      note:
        analysis.trendPct <= 0
          ? "Spending is falling, not accelerating."
          : "Spending is rising against the previous month.",
    },
    {
      label: "Largest commitment",
      value: `${analysis.topCommitment.pct.toFixed(0)}%`,
      rating: analysis.topCommitment.pct <= 30 ? "strong" : "fair",
      note: `${analysis.topCommitment.name} is the biggest fixed cost, at ${analysis.topCommitment.pct.toFixed(0)}% of spend.`,
    },
  ];

  const strongIndicators = indicators.filter(
    (indicator) => indicator.rating === "strong"
  ).length;

  const history =
    strongIndicators >= 3
      ? "Spending patterns look steady"
      : strongIndicators >= 2
        ? "Spending patterns are mixed"
        : "Spending is uneven";

  const verdict =
    `${history}, and a repayment of ${moneyShort(repayment)} per month is ` +
    `${affordability} against roughly ${moneyShort(headroom)} of flexible ` +
    "spending each month.";

  return (
    <>
      <style>{bankCss}</style>

      <Panel
        title="Bank sharing"
        subtitle="Spending signals a lender would look at · calculated from your history"
      >
        <ul className="bk-grid">
          {indicators.map((indicator) => (
            <li key={indicator.label} className="bk-item">
              <div className="bk-item__top">
                <span className="bk-item__label">{indicator.label}</span>
                <span className={`bk-chip bk-chip--${indicator.rating}`}>
                  {indicator.rating}
                </span>
              </div>
              <p className="bk-item__value">{indicator.value}</p>
              <p className="bk-item__note">{indicator.note}</p>
            </li>
          ))}
        </ul>

        <div className="bk-request">
          <p className="bk-request__title">What are you applying for?</p>

          <div className="bk-banks" role="radiogroup" aria-label="Choose a bank">
            {BANKS.map((bankOption) => {
              const bankRepayment = monthlyRepayment(
                amount,
                term,
                bankOption.rate
              );

              return (
                <button
                  key={bankOption.id}
                  type="button"
                  role="radio"
                  aria-checked={bankId === bankOption.id}
                  className={`bk-bank ${bankId === bankOption.id ? "is-active" : ""}`}
                  onClick={() => setBankId(bankOption.id)}
                >
                  <span className="bk-bank__mark">{bankOption.short}</span>
                  <span className="bk-bank__body">
                    <span className="bk-bank__name">{bankOption.name}</span>
                    <span className="bk-bank__rate">
                      {(bankOption.rate * 100).toFixed(1)}% · {moneyShort(bankRepayment)}/mo
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bk-fields">
            <label className="bk-field">
              <span className="bk-field__label">Amount (EGP)</span>
              <input
                type="number"
                className="bk-input"
                value={amount}
                min="1000"
                step="1000"
                onChange={(event) =>
                  setAmount(Number(event.target.value) || 0)
                }
              />
            </label>

            <label className="bk-field">
              <span className="bk-field__label">Over</span>
              <select
                className="bk-input"
                value={term}
                onChange={(event) => setTerm(Number(event.target.value))}
              >
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
                <option value={36}>36 months</option>
                <option value={48}>48 months</option>
              </select>
            </label>

            <div className="bk-field">
              <span className="bk-field__label">Monthly repayment</span>
              <p className="bk-repay">
                {moneyShort(repayment)}
                <span className={`bk-chip bk-chip--${affordRating}`}>
                  {affordability}
                </span>
              </p>
            </div>
          </div>

          <div
            className="bk-meter"
            role="img"
            aria-label={`Repayment uses ${usedPct.toFixed(0)} percent of flexible spending`}
          >
            <div
              className={`bk-meter__fill bk-meter__fill--${affordRating}`}
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>

          <p className="bk-meter__note">
            Uses {usedPct.toFixed(0)}% of your flexible spending · {bank.short} at{" "}
            {(bank.rate * 100).toFixed(1)}% (illustrative)
          </p>
        </div>

        <div className="bk-verdict">
          <p className="bk-verdict__text">{verdict}</p>
          <p className="bk-verdict__caveat">
            Illustrative only — not a lending decision. A bank would combine
            this with income verification and its own checks.
          </p>
        </div>

        {stage === "idle" && (
          <button
            type="button"
            className="bk-btn"
            onClick={() => setStage("reviewing")}
          >
            Share with my bank
          </button>
        )}

        {stage === "reviewing" && (
          <div className="bk-review">
            <p className="bk-review__title">
              You would share with {bank.name}:
            </p>
            <ul className="bk-review__list">
              <li>
                Your request: {moneyShort(amount)} over {term} months
              </li>
              <li>Monthly totals for {analysis.months.length} months</li>
              <li>Category breakdown by percentage</li>
              <li>The four indicators above</li>
            </ul>

            <p className="bk-review__title bk-review__title--no">
              You would <em>not</em> share:
            </p>
            <ul className="bk-review__list bk-review__list--no">
              <li>Individual transactions or merchant names</li>
              <li>Account numbers or card details</li>
              <li>
                Anything outside the {analysis.months.length} months shown
              </li>
            </ul>

            <div className="bk-actions">
              <button
                type="button"
                className="bk-btn bk-btn--ghost"
                onClick={() => setStage("idle")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bk-btn"
                onClick={() => setStage("shared")}
              >
                Confirm and share
              </button>
            </div>
          </div>
        )}

        {stage === "shared" && (
          <div className="bk-shared">
            <p className="bk-shared__text">
              <span className="bk-shared__dot" aria-hidden="true" />
              Sent to {bank.short} · reference FT-2026-07-0042
            </p>
            <button
              type="button"
              className="bk-btn bk-btn--ghost"
              onClick={() => setStage("idle")}
            >
              Revoke access
            </button>
          </div>
        )}
      </Panel>
    </>
  );
}

const bankCss = `
.bk-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 4px;
}
.bk-item {
  background: #ffffff05;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 11px 12px 12px;
}
.bk-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.bk-item__label {
  font-size: 9px;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-mute);
  font-weight: 600;
}
.bk-chip {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 2px 6px;
  border-radius: 999px;
  flex: none;
}
.bk-chip--strong { background: #2ebd8522; color: #2ebd85; }
.bk-chip--fair { background: #e8a33d22; color: #e8a33d; }
.bk-chip--weak { background: #e5484d22; color: #e5484d; }
.bk-item__value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.bk-item__note {
  font-size: 9.5px;
  line-height: 1.5;
  color: var(--text-mute);
  margin-top: 5px;
}
.bk-banks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.bk-bank {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  min-width: 0;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.bk-bank:hover { border-color: #ffffff22; }
.bk-bank.is-active {
  border-color: var(--accent);
  background: #2ebd850f;
}
.bk-bank__mark {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  flex: none;
  display: grid;
  place-items: center;
  background: #ffffff0d;
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 700;
}
.bk-bank.is-active .bk-bank__mark {
  background: var(--accent);
  color: #06120c;
}
.bk-bank__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.bk-bank__name {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bk-bank__rate {
  font-size: 9.5px;
  color: var(--text-mute);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bk-bank.is-active .bk-bank__rate { color: var(--accent); }
.bk-request {
  margin-top: 12px;
  padding: 12px 14px;
  background: #ffffff05;
  border: 1px solid var(--line);
  border-radius: 9px;
}
.bk-request__title {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}
.bk-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  align-items: end;
}
.bk-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.bk-field__label {
  font-size: 9px;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-mute);
  font-weight: 600;
}
.bk-input {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 7px 9px;
  color: var(--text);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  width: 100%;
}
.bk-input:focus {
  outline: none;
  border-color: var(--accent);
}
select.bk-input {
  font-family: inherit;
  cursor: pointer;
}
.bk-repay {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  padding: 6px 0;
}
.bk-meter {
  margin-top: 12px;
  height: 5px;
  border-radius: 3px;
  background: #ffffff0d;
  overflow: hidden;
}
.bk-meter__fill {
  height: 100%;
  border-radius: 3px;
  transition: width .25s ease, background .25s ease;
}
.bk-meter__fill--strong { background: #2ebd85; }
.bk-meter__fill--fair { background: #e8a33d; }
.bk-meter__fill--weak { background: #e5484d; }
.bk-meter__note {
  font-size: 9.5px;
  color: var(--text-mute);
  margin-top: 6px;
}
.bk-verdict {
  margin-top: 12px;
  padding: 11px 13px;
  background: #ffffff05;
  border-left: 2px solid var(--accent);
  border-radius: 0 8px 8px 0;
}
.bk-verdict__text {
  font-size: 11.5px;
  color: var(--text);
  line-height: 1.5;
}
.bk-verdict__caveat {
  font-size: 9.5px;
  color: var(--text-mute);
  margin-top: 5px;
  line-height: 1.5;
}
.bk-btn {
  margin-top: 12px;
  border: 0;
  border-radius: 8px;
  background: var(--accent);
  color: #06120c;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.bk-btn:hover { opacity: .88; }
.bk-btn--ghost {
  background: none;
  color: var(--text-dim);
  border: 1px solid var(--line);
}
.bk-btn--ghost:hover {
  background: #ffffff08;
  color: var(--text);
}
.bk-review {
  margin-top: 12px;
  padding: 12px 14px;
  background: #ffffff05;
  border: 1px solid var(--line);
  border-radius: 9px;
}
.bk-review__title {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 5px;
}
.bk-review__title--no {
  color: var(--text-mute);
  margin-top: 11px;
}
.bk-review__list {
  font-size: 10px;
  color: var(--text-dim);
  line-height: 1.8;
  padding-left: 14px !important;
  list-style: disc !important;
}
.bk-review__list--no { color: var(--text-mute); }
.bk-actions {
  display: flex;
  gap: 8px;
}
.bk-shared {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 13px;
  background: #2ebd850d;
  border: 1px solid #2ebd8533;
  border-radius: 9px;
}
.bk-shared__text {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bk-shared__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex: none;
}
.bk-shared .bk-btn { margin-top: 0; }
@media (max-width: 1000px) {
  .bk-grid { grid-template-columns: repeat(2, 1fr); }
  .bk-fields { grid-template-columns: minmax(0, 1fr); }
  .bk-banks { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .bk-grid { grid-template-columns: minmax(0, 1fr); }
}
`;

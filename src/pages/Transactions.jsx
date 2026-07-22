import Panel from "../components/Panel";
import { CATEGORY_COLORS, money } from "../data/finance";
import { TRANSACTIONS } from "../data/transactions";

export default function Transactions() {
  return (
    <>
      <header className="ft-header">
        <h1 className="ft-header__title">Transactions</h1>
        <p className="ft-header__sub">All activity · July 2026</p>
      </header>

      <Panel
        title="Recent transactions"
        subtitle={`${TRANSACTIONS.length} shown`}
      >
        <table className="ft-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td className="ft-table__merchant">{t.merchant}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

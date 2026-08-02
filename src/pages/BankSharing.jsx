import BankPanel from "../components/BankPanel";

export default function BankSharing() {
  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Bank sharing</p>
          <h1 className="ft-header__title">Loan affordability</h1>
          <p className="ft-header__sub">
            See what a lender would see, and check what a repayment would cost against your spending.
          </p>
        </div>
      </header>

      <BankPanel />
    </>
  );
}

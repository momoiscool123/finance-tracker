import { useLayoutEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import BankSharing from "./pages/BankSharing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./styles/dashboard.css";
import Settings from "./pages/Settings";
import RecurringExpenses from "./pages/RecurringExpenses";
import DownloadPage from "./pages/Download";
import { TransactionProvider } from "./context/TransactionContext";
import { applyStoredAccent, applyStoredTheme } from "./utils/theme";

// Route table.
// - "/" is the login page — the entry point of the app.
// - /register is the standalone registration page.
// - Everything inside <Layout /> shares the sidebar + chat shell.
// - TransactionProvider wraps every route so any page (and future ones)
//   can read/add/delete transactions via useTransactions().
export default function App() {
  // Runs on every full page load, no matter which route you land on —
  // this is what makes dark mode / accent survive a refresh instead of
  // only applying once you visit Settings. useLayoutEffect (not
  // useEffect) so it happens before the browser paints, avoiding a
  // light-mode flash before switching to dark.
  useLayoutEffect(() => {
    applyStoredTheme();
    applyStoredAccent();
  }, []);

  return (
    <TransactionProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/bank-sharing" element={<BankSharing />} />
          <Route path="/recurring-expenses" element={<RecurringExpenses />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </TransactionProvider>
  );
}

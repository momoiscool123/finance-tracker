import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import "./styles/dashboard.css";

// Route table. Every route renders inside <Layout /> (sidebar + chat shell).
// `index` is the default page shown at "/"; add new pages as more <Route>s here.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
      </Route>
    </Routes>
  );
}

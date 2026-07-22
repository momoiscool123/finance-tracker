import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./styles/dashboard.css";

// Route table.
// - /login and /register are standalone full-screen pages (no sidebar/chat).
// - Everything inside <Layout /> shares the sidebar + chat shell.
// `index` is the default page shown at "/". Add new pages as more <Route>s.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
      </Route>
    </Routes>
  );
}

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";

// The shell shared by every page: sidebar on the left, the chat widget,
// and an <Outlet /> where the active page (Dashboard, Transactions, …) renders.
export default function Layout() {
  return (
    <div className="ft">
      <Sidebar />

      <main className="ft-main">
        <div className="ft-shell">
          <Outlet />
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}

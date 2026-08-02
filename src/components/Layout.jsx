import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";

// The shell shared by every page: sidebar on the left, the chat widget,
// and an <Outlet /> where the active page (Dashboard, Transactions, …) renders.
// The sidebar can be collapsed with the toggle button — it stays clickable
// in the same spot whether the sidebar is open or closed.
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`ft ${sidebarOpen ? "" : "ft--sidebar-closed"}`}>
      <button
        type="button"
        className="ft-sidebar-toggle"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={sidebarOpen}
      >
        <Menu size={18} />
      </button>

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

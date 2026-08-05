import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  LogOut,
  Wallet,
  Repeat2,
  Download,
  Landmark,
  PiggyBank,
} from "lucide-react";
import { FaCog } from "react-icons/fa";
import { useCurrentUser, signOut } from "../auth";

const navClass = ({ isActive }) =>
  `ft-nav__item ${isActive ? "is-active" : ""}`;

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useCurrentUser();

  const name = user?.name || "User";
  const email = user?.email || "";
  const initial = name.charAt(0).toUpperCase();

  function handleSignOut() {
    signOut(); // clear the token + cached user
    navigate("/");
  }

  return (
    <aside className="ft-sidebar">

      <div className="ft-brand">
        <div className="ft-brand__logo">
          <Wallet size={20} strokeWidth={2.4} />
        </div>

        <div>
          <h2 className="ft-brand__title">Tracklet</h2>
          <p className="ft-brand__subtitle">Personal Finance</p>
        </div>
      </div>

      <nav className="ft-nav">

        <NavLink to="/dashboard" className={navClass}>
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/transactions" className={navClass}>
          <ArrowLeftRight size={19} />
          <span>Transactions</span>
        </NavLink>

        <NavLink to="/recurring-expenses" className={navClass}>
          <Repeat2 size={19} />
          <span>Recurring & quick</span>
        </NavLink>

        <NavLink to="/savings" className={navClass}>
          <PiggyBank size={19} />
          <span>Savings goals</span>
        </NavLink>

        <NavLink to="/budget" className={navClass}>
          <Landmark size={18} />
          <span>Bank & limits</span>
        </NavLink>

        <NavLink to="/download" className={navClass}>
          <Download size={19} />
          <span>Download</span>
        </NavLink>

        <NavLink to="/settings" className={navClass}>
          <FaCog size={17} />
          <span>Settings</span>
        </NavLink>

      </nav>

      <div className="ft-user">

        <div className="ft-user__card">

          <div className="ft-user__avatar">{initial}</div>

          <div className="ft-user__info">
            <h4 className="ft-user__name">{name}</h4>
            <p className="ft-user__mail">{email}</p>
          </div>

        </div>

        <button className="ft-signout" onClick={handleSignOut}>
          <LogOut size={17} />
          Sign Out
        </button>

      </div>

    </aside>
  );
}

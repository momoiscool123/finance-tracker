import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  LogOut,
  Wallet,
} from "lucide-react";
import { FaCog, FaUniversity } from "react-icons/fa";

const navClass = ({ isActive }) =>
  `ft-nav__item ${isActive ? "is-active" : ""}`;

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="ft-sidebar">

      <div className="ft-brand">
        <div className="ft-brand__logo">
          <Wallet size={20} strokeWidth={2.4} />
        </div>

        <div>
          <h2 className="ft-brand__title">Fintrack</h2>
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

        <NavLink to="/bank-sharing" className={navClass}>
          <FaUniversity size={17} />
          <span>Bank sharing</span>
        </NavLink>

        <NavLink to="/settings" className={navClass}>
          <FaCog size={17} />
          <span>Settings</span>
        </NavLink>

      </nav>

      <div className="ft-user">

        <div className="ft-user__card">

          <div className="ft-user__avatar">T</div>

          <div className="ft-user__info">
            <h4 className="ft-user__name">Testing</h4>
            <p className="ft-user__mail">testing@gmail.com</p>
          </div>

        </div>

        <button className="ft-signout" onClick={() => navigate("/")}>
          <LogOut size={17} />
          Sign Out
        </button>

      </div>

    </aside>
  );
}

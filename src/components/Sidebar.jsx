import { NavLink, useNavigate } from "react-router-dom";
import { Icon, icons } from "./Icon";

// NavLink adds the "is-active" class automatically based on the current URL,
// so the highlighted item always matches the page you're on.
const navClass = ({ isActive }) => `ft-nav__item ${isActive ? "is-active" : ""}`;

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="ft-sidebar">
      <div className="ft-brand">
        <span className="ft-brand__mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </span>
        <span className="ft-brand__name">Fintrack</span>
      </div>

      <nav className="ft-nav" aria-label="Main">
        <NavLink to="/dashboard" end className={navClass}>
          <Icon path={icons.grid} size={15} />
          Dashboard
        </NavLink>
        <NavLink to="/transactions" className={navClass}>
          <Icon path={icons.list} size={15} />
          Transactions
        </NavLink>
      </nav>

      <div className="ft-user">
        <div className="ft-user__row">
          <span className="ft-user__avatar">t</span>
          <span className="ft-user__text">
            <span className="ft-user__name">testing</span>
            <span className="ft-user__mail">testing@gmail.com</span>
          </span>
        </div>
        <button
          className="ft-signout"
          type="button"
          onClick={() => navigate("/")}
        >
          <Icon path={icons.signout} size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

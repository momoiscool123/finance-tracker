import Panel from "../components/Panel";
import "../styles/settings.css";
import { useState } from "react";

import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaBell,
  FaPalette,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaTrashAlt,
} from "react-icons/fa";
import {
  ACCENT_COLORS,
  getStoredAccent,
  getStoredTheme,
  setAccent as saveAccent,
  setTheme as saveTheme,
} from "../utils/theme";

export default function Settings() {
const [theme, setThemeState] = useState(getStoredTheme);
const [accent, setAccentState] = useState(getStoredAccent);

const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    saveTheme(newTheme);
    setThemeState(newTheme);
};

const changeAccent = (hex) => {
    saveAccent(hex);
    setAccentState(hex);
};

const [profile, setProfile] = useState({
  name: "",
  email: "",
  phone: "",
});

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Settings</p>

          <h1 className="ft-header__title">
            Manage your account
          </h1>

          <p className="ft-header__sub">
            Update your profile, preferences and security
          </p>
        </div>
      </header>

      <div className="settings-grid">

        {/* PROFILE */}

        <Panel
          title="Profile"
          subtitle="Personal Information"
        >

          <div className="profile-section">

            <div className="profile-avatar">
                {profile.name
                ? profile.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .toUpperCase()
            : "?"}
            </div>


            <button className="upload-btn">
              Change Photo
            </button>

          </div>

          <div className="settings-form">

            <div className="settings-field">
              <label>
                <FaUser />
                Full Name
              </label>

              <input
  className="settings-input"
  type="text"
  placeholder="Enter your full name"
  value={profile.name}
  onChange={(e) =>
    setProfile({
      ...profile,
      name: e.target.value,
    })
  }
/>
            </div>

            <div className="settings-field">
              <label>
                <FaEnvelope />
                Email
              </label>

              <input
  className="settings-input"
  type="email"
  placeholder="Enter your email"
  value={profile.email}
  onChange={(e) =>
    setProfile({
      ...profile,
      email: e.target.value,
    })
  }
/>
            </div>

            <div className="settings-field">
              <label>
                <FaPhone />
                Phone Number
              </label>

              <input
  className="settings-input"
  type="tel"
  placeholder="Enter your phone number"
  value={profile.phone}
  onChange={(e) =>
    setProfile({
      ...profile,
      phone: e.target.value,
    })
  }
/>
            </div>

            <button className="settings-btn">
              Save Changes
            </button>

          </div>

        </Panel>

        {/* SECURITY */}

        <Panel
          title="Security"
          subtitle="Password"
        >

          <div className="settings-form">

            <div className="settings-field">
              <label>
                <FaLock />
                Current Password
              </label>

              <input
                className="settings-input"
                type="password"
              />
            </div>

            <div className="settings-field">
              <label>
                <FaLock />
                New Password
              </label>

              <input
                className="settings-input"
                type="password"
              />
            </div>

            <div className="settings-field">
              <label>
                <FaLock />
                Confirm Password
              </label>

              <input
                className="settings-input"
                type="password"
              />
            </div>

            <button className="settings-btn">
              Change Password
            </button>

          </div>

        </Panel>

        {/* APPEARANCE */}

        <Panel
          title="Appearance"
          subtitle="Customize the application"
        >

          <div className="setting-row">

            <div>

              <h4>
                Theme
              </h4>

              <p>
                Switch between light and dark mode
              </p>

            </div>

            <button className="theme-btn" onClick={toggleTheme}>
  {theme === "light" ? <FaSun /> : <FaMoon />}
  {theme === "light" ? "Light" : "Dark"}
</button>

          </div>

          <div className="setting-row">

            <div>

              <h4>Accent Color</h4>

              <p>Current application color</p>

            </div>

            <div className="accent-picker">
  {Object.entries(ACCENT_COLORS).map(([name, hex]) => (
    <button
      key={name}
      type="button"
      className={`accent ${name} ${accent === hex ? "is-active" : ""}`}
      style={{ background: hex }}
      onClick={() => changeAccent(hex)}
      aria-label={`${name} accent`}
      aria-pressed={accent === hex}
    ></button>
  ))}
</div>
          </div>

        </Panel>

        {/* NOTIFICATIONS */}

        <Panel
          title="Notifications"
          subtitle="Stay updated"
        >

          <label className="checkbox-row">
            <input type="checkbox" defaultChecked />
            Email Notifications
          </label>

          <label className="checkbox-row">
            <input type="checkbox" defaultChecked />
            Budget Alerts
          </label>

          <label className="checkbox-row">
            <input type="checkbox" defaultChecked />
            Weekly Reports
          </label>

          <label className="checkbox-row">
            <input type="checkbox" />
            Monthly Reports
          </label>

        </Panel>

        {/* DANGER */}

        <Panel
          title="Danger Zone"
          subtitle="Permanent actions"
        >

          <div className="danger-box">

            <div>

              <h3>
                Delete Account
              </h3>

              <p>
                Permanently remove your account and all stored data.
              </p>

            </div>

            <button className="delete-btn">

              <FaTrashAlt />

              Delete Account

            </button>

          </div>

          <button className="logout-btn">

            <FaSignOutAlt />

            Logout

          </button>

        </Panel>

      </div>
    </>
  );
}
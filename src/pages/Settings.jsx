import Panel from "../components/Panel";
import "../styles/settings.css";
import { useEffect, useState } from "react";

import {
  FaUser,
  FaEnvelope,
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
import { updateProfile, changePassword } from "../api";
import { getStoredUser, setStoredUser, useCurrentUser } from "../auth";

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

const user = useCurrentUser();

// Profile form — seeded from the cached user, then kept in sync once the
// user is (re)loaded from the backend.
const [profile, setProfile] = useState(() => {
  const u = getStoredUser();
  return { name: u?.name || "", email: u?.email || "" };
});
const [profileMsg, setProfileMsg] = useState(null); // { ok, text }
const [savingProfile, setSavingProfile] = useState(false);

useEffect(() => {
  if (user) setProfile({ name: user.name || "", email: user.email || "" });
}, [user]);

// Password form.
const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
const [pwMsg, setPwMsg] = useState(null);
const [changingPw, setChangingPw] = useState(false);

async function handleSaveProfile() {
  setProfileMsg(null);
  if (!profile.name.trim() || !profile.email.trim()) {
    setProfileMsg({ ok: false, text: "Name and email are required." });
    return;
  }
  setSavingProfile(true);
  try {
    const updated = await updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim(),
    });
    setStoredUser(updated); // so the sidebar/avatar pick up the new name/email
    setProfile({ name: updated.name, email: updated.email });
    setProfileMsg({ ok: true, text: "Profile updated." });
  } catch (err) {
    setProfileMsg({ ok: false, text: err.message });
  } finally {
    setSavingProfile(false);
  }
}

async function handleChangePassword() {
  setPwMsg(null);
  if (!pw.current || !pw.next) {
    setPwMsg({ ok: false, text: "Enter your current and new password." });
    return;
  }
  if (pw.next.length < 8) {
    setPwMsg({ ok: false, text: "New password must be at least 8 characters." });
    return;
  }
  if (pw.next !== pw.confirm) {
    setPwMsg({ ok: false, text: "New passwords don't match." });
    return;
  }
  setChangingPw(true);
  try {
    await changePassword({ current_password: pw.current, new_password: pw.next });
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ ok: true, text: "Password updated." });
  } catch (err) {
    setPwMsg({ ok: false, text: err.message });
  } finally {
    setChangingPw(false);
  }
}

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

            <button
              className="settings-btn"
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>

            {profileMsg && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: profileMsg.ok ? "#2ebd85" : "#e5484d",
                }}
              >
                {profileMsg.text}
              </p>
            )}

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
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
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
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
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
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              />
            </div>

            <button
              className="settings-btn"
              type="button"
              onClick={handleChangePassword}
              disabled={changingPw}
            >
              {changingPw ? "Updating…" : "Change Password"}
            </button>

            {pwMsg && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: pwMsg.ok ? "#2ebd85" : "#e5484d",
                }}
              >
                {pwMsg.text}
              </p>
            )}

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
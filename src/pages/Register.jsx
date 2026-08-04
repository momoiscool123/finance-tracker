import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import { IoEyeOutline, IoEyeOffOutline, IoArrowForward } from "react-icons/io5";
import { registerUser } from "../api";

import "../styles/auth.css";

// Fintrack brand mark — same icon used in the dashboard sidebar.
function BrandMark() {
  return (
    <span className="auth-mark" aria-hidden="true">
      <svg
    width="30"
    height="30"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
>
    <path d="M4 16L9 11L13 15L20 8"/>
    <path d="M15 8H20V13"/>
</svg>
    </span>
  );
}

const errorStyle = {
  color: "#e5484d",
  fontSize: "13px",
  textAlign: "center",
  margin: 0,
};

// Registration page — reuses the same scoped `.login-page` styles as Login.
export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    // Guard against blank/weak accounts — a blank one is what caused the
    // "log in with empty fields" bug.
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail) {
      setError("Please fill in your name and email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({ email: cleanEmail, name: cleanName, password });
      // Account created — send them to the login page to sign in.
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-glow auth-glow--1"></div>
      <div className="auth-glow auth-glow--2"></div>
      <div className="floating-box box1"></div>
      <div className="floating-box box2"></div>
      <div className="floating-box box3"></div>
      <div className="floating-box box4"></div>

      <div className="login-card">
        {/* Brand */}
        <div className="logo-section">
          <BrandMark />
          <h1 className="brand">Fintrack</h1>
        </div>

        {/* Heading */}
        <div className="heading">
          <h2>Create your account</h2>
          <p>Start tracking your spending in minutes</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Full name</label>
            <div className="input-box">
              <FaUser className="icon" />
              <input
                type="text"
                placeholder="Jane Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email address</label>
            <div className="input-box">
              <FaEnvelope className="icon" />
              <input
                type="email"
                placeholder="name@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-box">
              <FaLock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {showPassword ? (
                <IoEyeOffOutline
                  className="eye"
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <IoEyeOutline
                  className="eye"
                  onClick={() => setShowPassword(true)}
                />
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Confirm password</label>
            <div className="input-box">
              <FaLock className="icon" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••••••"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {showConfirm ? (
                <IoEyeOffOutline
                  className="eye"
                  onClick={() => setShowConfirm(false)}
                />
              ) : (
                <IoEyeOutline
                  className="eye"
                  onClick={() => setShowConfirm(true)}
                />
              )}
            </div>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" className="signin-btn" disabled={loading}>
            <span>{loading ? "Creating…" : "Create Account"}</span>
            <IoArrowForward className="arrow" />
          </button>

          {/* Login link */}
          <div className="signup">
            <p>
              Already have an account? <Link to="/">Sign In</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

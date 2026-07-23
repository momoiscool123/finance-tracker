import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { IoEyeOutline, IoEyeOffOutline, IoArrowForward } from "react-icons/io5";

import "../styles/auth.css";

// Fintrack brand mark — same icon used in the dashboard sidebar.
function BrandMark() {
  return (
    <span className="auth-mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    </span>
  );
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="auth-glow auth-glow--1"></div>
      <div className="auth-glow auth-glow--2"></div>

      <div className="login-card">
        {/* Brand */}
        <div className="logo-section">
          <BrandMark />
          <h1 className="brand">Fintrack</h1>
        </div>

        {/* Heading */}
        <div className="heading">
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-group">
            <label>Email address</label>
            <div className="input-box">
              <FaEnvelope className="icon" />
              <input type="email" placeholder="name@email.com" />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-box">
              <FaLock className="icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
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

          {/* Options */}
          <div className="options">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              <span className="custom-check">{remember && "✓"}</span>
              <span>Remember me</span>
            </label>
            <a href="#">Forgot password?</a>
          </div>

          {/* Button — points to the dashboard for now (no auth wired up yet) */}
          <button
            type="button"
            className="signin-btn"
            onClick={() => navigate("/dashboard")}
          >
            <span>Sign In</span>
            <IoArrowForward className="arrow" />
          </button>

          {/* Register link */}
          <div className="signup">
            <p>
              Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

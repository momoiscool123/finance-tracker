import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api";

import "../styles/login.css";

// Fintrack brand mark — same icon used across the app.
function BrandMark() {
  return (
    <span className="ls-badge" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      // Save the JWT so future requests can prove who we are.
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      {/* Floating preview "buckets" — sample data, a peek at what's inside.
          Each rises up from the bottom on load (.bucket__rise), then floats
          gently (.bucket__inner). Decorative only, so hidden from assistive tech. */}
      <div className="bucket bucket--tokyo" aria-hidden="true">
        <div className="bucket__rise">
          <div className="bucket__inner">
            <p className="bucket__label">Tokyo trip</p>
            <p className="bucket__value">
              EGP 2,040 <span className="bucket__sub">/ 3,000</span>
            </p>
            <span className="bucket__bar">
              <span className="bucket__fill bucket__fill--coral" style={{ width: "68%" }} />
            </span>
          </div>
        </div>
      </div>

      <div className="bucket bucket--emergency" aria-hidden="true">
        <div className="bucket__rise">
          <div className="bucket__inner">
            <p className="bucket__label">Emergency fund</p>
            <p className="bucket__value">EGP 2,140</p>
            <span className="bucket__bar">
              <span className="bucket__fill bucket__fill--teal" style={{ width: "90%" }} />
            </span>
          </div>
        </div>
      </div>

      <div className="bucket bucket--dinner" aria-hidden="true">
        <div className="bucket__rise">
          <div className="bucket__inner">
            <p className="bucket__label">Dinner with Ana — split</p>
            <p className="bucket__value">
              You&rsquo;re owed <span className="bucket__num-teal">EGP 23.50</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bucket bucket--budget" aria-hidden="true">
        <div className="bucket__rise">
          <div className="bucket__inner">
            <p className="bucket__label">This month&rsquo;s budget</p>
            <p className="bucket__value">
              <span className="bucket__num-coral">EGP 318</span> left to spend
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="ls-hero">
        <div className="ls-brand">
          <BrandMark />
          <span className="ls-wordmark">Fintrack</span>
        </div>
        <h1 className="ls-title">Welcome back</h1>
        <p className="ls-subtitle">Log in and get back to your goals.</p>
      </div>

      {/* Login card */}
      <div className="ls-card">
        <form onSubmit={handleLogin}>
          <input
            className="ls-field"
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="ls-field"
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" className="ls-btn" disabled={loading}>
            {loading ? "Signing in…" : "Jump back in"}
          </button>
        </form>

        <div className="ls-foot">
          <a href="#" className="ls-link ls-link--muted">
            Forgot password?
          </a>
          <Link to="/register" className="ls-link ls-link--coral">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

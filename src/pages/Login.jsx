import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { IoEyeOutline, IoEyeOffOutline, IoArrowForward } from "react-icons/io5";

import background from "../assets/auth-background.svg";
import "../styles/auth.css";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="circle-left"></div>
      <div className="circle-right"></div>

      <div className="dot dot1"></div>
      <div className="dot dot2"></div>
      <div className="dot dot3"></div>
      <div className="dot dot4"></div>

      {/* Background SVG */}
      <img src={background} alt="" className="background-svg" />

      {/* Glow Effects */}
      <div className="glow glow-purple"></div>
      <div className="glow glow-blue"></div>

      {/* Card */}
      <div className="login-card">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-icon">
            <span></span>
          </div>
          <h1 className="brand">
            Wallet<span>Flow</span>
          </h1>
        </div>

        {/* Heading */}
        <div className="heading">
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
              Don't have an account?
              <Link to="/register"> Sign Up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

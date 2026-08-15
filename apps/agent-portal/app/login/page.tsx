"use client";
import { useState } from "react";
import { API } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("agent@thr.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "Login failed");
      return;
    }
    localStorage.setItem("thr_token", data.token);
    localStorage.setItem("thr_user", JSON.stringify(data.user));
    window.location.href = "/";
  }

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1>Agent sign in</h1>
        <p className="muted">Stub SSO compatible. Demo: agent@thr.com / Password123!</p>
        <form className="grid" onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="err">{error}</div>}
          <button className="primary" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

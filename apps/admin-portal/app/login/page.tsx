"use client";
import { useState } from "react";
import { API } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("contracting@thr.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.message ?? "Login failed");
    localStorage.setItem("thr_admin_token", data.token);
    window.location.href = "/";
  }
  return (
    <div className="wrap card" style={{ maxWidth: 420 }}>
      <h1>Back office login</h1>
      <p className="muted">contracting@ / revenue@ / support@ / finance@thr.com · Password123!</p>
      <form onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="err">{error}</p>}
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}

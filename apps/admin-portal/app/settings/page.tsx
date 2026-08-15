"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<Record<string, string>>("/admin/settings").then(setSettings).catch((e) => setMsg(e.message));
  }, []);
  return (
    <div className="wrap">
      <h1>System settings</h1>
      <p className="muted">Open business questions live here — not hardcoded.</p>
      {msg && <p className="err">{msg}</p>}
      {Object.entries(settings).map(([k, v]) => (
        <div key={k} className="card" style={{ marginBottom: 8 }}>
          <label>
            {k}
            <input
              value={v}
              onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
            />
          </label>
          <button
            onClick={async () => {
              await api(`/admin/settings/${k}`, { method: "PUT", body: JSON.stringify({ value: settings[k] }) });
              setMsg(`Saved ${k}`);
            }}
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
}
